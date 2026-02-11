import prisma from "../db/prisma";

export const billingService = {
  async listInvoicesForUser(userId?: string | null) {
    if (!userId) return [];
    return prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async findInvoiceByNumber(invoiceNumber: string) {
    return prisma.invoice.findUnique({
      where: { invoiceNumber },
    });
  },
};

