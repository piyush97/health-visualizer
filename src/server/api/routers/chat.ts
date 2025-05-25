import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
  // Send message to AI chatbot
  sendMessage: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        healthSummary: z
          .object({
            totalRecords: z.number(),
            dateRange: z.object({
              start: z.date(),
              end: z.date(),
            }),
            dataTypes: z.record(z.number()),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Save user message
        const userMessage = await ctx.db.chatMessage.create({
          data: {
            content: input.content,
            role: "USER",
            userId: ctx.session.user.id,
          },
        });

        // Get recent health data for context
        const recentRecords = await ctx.db.healthRecord.findMany({
          where: { userId: ctx.session.user.id },
          orderBy: { startDate: "desc" },
          take: 100,
        });

        // Build context for AI
        let healthContext = "";
        if (input.healthSummary) {
          const { totalRecords, dateRange, dataTypes } = input.healthSummary;
          healthContext += `Health Data Summary:
- Total Records: ${totalRecords}
- Date Range: ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}
- Available Data Types: ${Object.keys(dataTypes).join(", ")}

`;
        }

        if (recentRecords.length > 0) {
          // Group recent records by type for summary
          const recentSummary: Record<
            string,
            { count: number; latest: string; unit?: string }
          > = {};

          recentRecords.forEach((record) => {
            if (!recentSummary[record.type]) {
              recentSummary[record.type] = {
                count: 0,
                latest: record.value,
                unit: record.unit || undefined,
              };
            }
            recentSummary[record.type].count++;
          });

          healthContext += "Recent Health Data:\n";
          Object.entries(recentSummary).forEach(([type, data]) => {
            healthContext += `- ${type}: ${data.count} records, latest value: ${data.latest}${data.unit ? ` ${data.unit}` : ""}\n`;
          });
        }

        const systemPrompt = `You are a health assistant AI that helps users understand their Apple Health data. You provide insights, trends, and recommendations based on their health metrics.

Guidelines:
1. Be helpful, encouraging, and supportive
2. Provide actionable insights and recommendations
3. Always remind users that you're not a substitute for professional medical advice
4. Focus on trends, patterns, and general wellness tips
5. Be specific about the data you're referencing
6. If asked about concerning health issues, recommend consulting healthcare professionals

${healthContext}

Remember: Always suggest users consult healthcare professionals for medical concerns.`;

        // Generate AI response
        const { text } = await generateText({
          model: openai("gpt-3.5-turbo"),
          system: systemPrompt,
          prompt: input.content,
          maxTokens: 500,
        });

        // Save AI response
        const assistantMessage = await ctx.db.chatMessage.create({
          data: {
            content: text,
            role: "ASSISTANT",
            userId: ctx.session.user.id,
          },
        });

        return assistantMessage;
      } catch (error) {
        console.error("Chat error:", error);
        throw new Error("Failed to process message. Please try again.");
      }
    }),

  // Get chat messages for user
  getMessages: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Ensure user can only access their own messages
      if (input.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized");
      }

      return ctx.db.chatMessage.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "asc" },
        take: input.limit,
      });
    }),

  // Clear chat history
  clearMessages: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.chatMessage.deleteMany({
      where: { userId: ctx.session.user.id },
    });

    return { success: true };
  }),
});
