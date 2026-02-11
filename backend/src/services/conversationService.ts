import prisma from "../db/prisma";
import type { AgentType, MessageRole } from "@prisma/client";

export const conversationService = {
  async getConversation(conversationId: string) {
    return prisma.conversation.findUnique({
      where: { id: conversationId },
    });
  },

  async createConversation(userId?: string, title?: string) {
    return prisma.conversation.create({
      data: {
        userId,
        title: title || "New conversation",
      },
    });
  },

  async appendMessage(params: {
    conversationId: string;
    role: MessageRole;
    content: string;
    agentType?: AgentType | null;
  }) {
    const { conversationId, role, content, agentType } = params;
    return prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        agentType: agentType ?? null,
      },
    });
  },

  async getConversationHistory(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  },

  async listConversations(userId?: string) {
    return prisma.conversation.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: "desc" },
    });
  },

  async deleteConversation(id: string) {
    await prisma.message.deleteMany({ where: { conversationId: id } });
    await prisma.conversation.delete({ where: { id } });
  },
};

