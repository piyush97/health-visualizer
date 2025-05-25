"use client";

import { Bot, Loader2, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import type { ChatMessage } from "~/types/health";

interface HealthChatbotProps {
  userId: string;
  healthSummary?: {
    totalRecords: number;
    dateRange: { start: Date; end: Date };
    dataTypes: Record<string, number>;
  };
}

export function HealthChatbot({ userId, healthSummary }: HealthChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = api.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setIsLoading(false);
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content:
          "Sorry, I encountered an error processing your message. Please try again.",
        role: "ASSISTANT",
        createdAt: new Date(),
        userId,
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const { data: chatHistory } = api.chat.getMessages.useQuery({ userId });

  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: "USER",
      createdAt: new Date(),
      userId,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Send message through tRPC
    chatMutation.mutate({
      content: inputValue.trim(),
      healthSummary,
    });
  };

  const suggestedQuestions = [
    "What insights can you provide about my health data?",
    "How are my activity levels trending?",
    "What recommendations do you have for improving my health?",
    "Are there any concerning patterns in my data?",
    "How does my sleep affect my other health metrics?",
  ];

  return (
    <div className="flex h-96 flex-col rounded-lg border bg-white shadow">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Health Assistant</h3>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Ask me about your health data and get personalized insights
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <Bot className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="mb-2 text-lg font-medium">
              Welcome to your Health Assistant!
            </p>
            <p className="mb-4 text-sm">
              I can help you understand your health data and provide insights.
            </p>

            {healthSummary && (
              <div className="mx-auto max-w-md rounded-lg border border-blue-200 bg-blue-50 p-3 text-left">
                <p className="text-sm text-blue-700">
                  I can see you have{" "}
                  <strong>{healthSummary.totalRecords}</strong> health records
                  spanning from{" "}
                  {healthSummary.dateRange.start.toLocaleDateString()} to{" "}
                  {healthSummary.dateRange.end.toLocaleDateString()}.
                </p>
              </div>
            )}

            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Try asking:
              </p>
              <div className="space-y-1">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="mx-auto block text-xs text-blue-600 hover:text-blue-800"
                  >
                    "{question}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "USER" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-xs items-start space-x-2 lg:max-w-md ${
                  message.role === "USER"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <div
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                    message.role === "USER" ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  {message.role === "USER" ? (
                    <User className="h-4 w-4 text-white" />
                  ) : (
                    <Bot className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 ${
                    message.role === "USER"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    {message.createdAt.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-300">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="rounded-lg bg-gray-100 px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your health data..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
