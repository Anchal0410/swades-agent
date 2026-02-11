import type { Message } from "@prisma/client";
import prisma from "../db/prisma";
import { conversationService } from "./conversationService";
import { routerAgent } from "../agents/routerAgent";

export interface ChatMessageInput {
  userId?: string;
  conversationId?: string;
  message: string;
}

export const chatService = {
  async getOrCreateConversation(userId?: string, conversationId?: string) {
    if (conversationId) {
      const existing = await conversationService.getConversation(conversationId);
      if (existing) return existing;
    }
    const title = "Customer support conversation";
    return conversationService.createConversation(userId, title);
  },

  async saveUserMessage(conversationId: string, content: string) {
    return conversationService.appendMessage({
      conversationId,
      role: "USER",
      agentType: null,
      content,
    });
  },

  async streamAgentReply(params: { userId?: string; conversationId: string; message: string }) {
    const { userId, conversationId, message } = params;
    const history: Message[] = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return routerAgent.streamResponse(
      {
        userId,
        conversationId,
        history,
      },
      message,
    );
  },
};

