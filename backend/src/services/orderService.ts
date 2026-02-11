import prisma from "../db/prisma";

export const orderService = {
  async getLatestOrderForUser(userId?: string | null) {
    if (!userId) return null;
    return prisma.order.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findOrderByIdOrTracking(identifier: string) {
    return prisma.order.findFirst({
      where: {
        OR: [
          { id: identifier },
          { trackingNumber: identifier },
        ],
      },
    });
  },

  async listOrdersForUser(userId?: string | null) {
    if (!userId) return [];
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },
};

