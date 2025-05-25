import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const healthRouter = createTRPCRouter({
  // Upload and store health data
  uploadHealthData: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
        healthRecords: z.array(
          z.object({
            type: z.string(),
            value: z.string(),
            unit: z.string().optional(),
            startDate: z.string(),
            endDate: z.string(),
            sourceName: z.string().optional(),
            sourceVersion: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create upload record
      const upload = await ctx.db.healthDataUpload.create({
        data: {
          fileName: input.fileName,
          fileSize: input.fileSize,
          status: "PROCESSING",
          userId: ctx.session.user.id,
        },
      });

      // Create health records in batches to avoid overwhelming the database
      const batchSize = 1000;
      const batches = [];

      for (let i = 0; i < input.healthRecords.length; i += batchSize) {
        const batch = input.healthRecords.slice(i, i + batchSize);
        batches.push(batch);
      }

      try {
        for (const batch of batches) {
          await ctx.db.healthRecord.createMany({
            data: batch.map((record) => ({
              type: record.type,
              value: record.value,
              unit: record.unit,
              startDate: new Date(record.startDate),
              endDate: new Date(record.endDate),
              uploadId: upload.id,
              userId: ctx.session.user.id,
            })),
          });
        }

        // Mark upload as completed
        await ctx.db.healthDataUpload.update({
          where: { id: upload.id },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        });

        return {
          success: true,
          uploadId: upload.id,
          recordsCreated: input.healthRecords.length,
        };
      } catch (error) {
        // Mark upload as failed
        await ctx.db.healthDataUpload.update({
          where: { id: upload.id },
          data: { status: "FAILED" },
        });

        throw new Error("Failed to store health data");
      }
    }),

  // Get user's health records
  getHealthRecords: protectedProcedure
    .input(
      z.object({
        types: z.array(z.string()).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(10000).default(1000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = {
        userId: ctx.session.user.id,
        ...(input.types && { type: { in: input.types } }),
        ...(input.startDate && { startDate: { gte: input.startDate } }),
        ...(input.endDate && { endDate: { lte: input.endDate } }),
      };

      return ctx.db.healthRecord.findMany({
        where,
        orderBy: { startDate: "desc" },
        take: input.limit,
      });
    }),

  // Get health data uploads
  getUploads: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.healthDataUpload.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { uploadedAt: "desc" },
      include: {
        _count: {
          select: { healthRecords: true },
        },
      },
    });
  }),

  // Get health data summary
  getHealthSummary: protectedProcedure.query(async ({ ctx }) => {
    const records = await ctx.db.healthRecord.findMany({
      where: { userId: ctx.session.user.id },
      select: {
        type: true,
        startDate: true,
        endDate: true,
      },
    });

    if (records.length === 0) {
      return null;
    }

    // Calculate summary statistics
    const dataTypes: Record<string, number> = {};
    let earliestDate = new Date();
    let latestDate = new Date(0);

    for (const record of records) {
      dataTypes[record.type] = (dataTypes[record.type] || 0) + 1;

      if (record.startDate < earliestDate) earliestDate = record.startDate;
      if (record.endDate > latestDate) latestDate = record.endDate;
    }

    return {
      totalRecords: records.length,
      dateRange: {
        start: earliestDate,
        end: latestDate,
      },
      dataTypes,
    };
  }),

  // Get available data types for the user
  getAvailableDataTypes: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.healthRecord.groupBy({
      by: ["type"],
      where: { userId: ctx.session.user.id },
      _count: {
        type: true,
      },
    });

    return result.map((item) => ({
      type: item.type,
      count: item._count.type,
    }));
  }),

  // Delete upload and associated records
  deleteUpload: protectedProcedure
    .input(z.object({ uploadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const upload = await ctx.db.healthDataUpload.findFirst({
        where: {
          id: input.uploadId,
          userId: ctx.session.user.id,
        },
      });

      if (!upload) {
        throw new Error("Upload not found or unauthorized");
      }

      // Delete records and upload (cascading delete will handle records)
      await ctx.db.healthDataUpload.delete({
        where: { id: input.uploadId },
      });

      return { success: true };
    }),
});
