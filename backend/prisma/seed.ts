import path from "path";
import { config } from "dotenv";

// Load .env from backend root (works when run as "npx ts-node prisma/seed.ts" from backend or repo root)
config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env["DATABASE_URL"]) {
  config({ path: path.resolve(process.cwd(), "backend", ".env") });
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set. Add it to backend/.env");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "anchal.jain@gmail.com" },
    update: {},
    create: {
      email: "anchal.jain@gmail.com",
      name: "Anchal Jain",
    },
  });

  const order1 = await prisma.order.upsert({
    where: { trackingNumber: "TRK123456" },
    update: { status: "SHIPPED", userId: user.id },
    create: {
      userId: user.id,
      status: "SHIPPED",
      trackingNumber: "TRK123456",
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const order2 = await prisma.order.upsert({
    where: { trackingNumber: "TRK654321" },
    update: { status: "DELIVERED", userId: user.id },
    create: {
      userId: user.id,
      status: "DELIVERED",
      trackingNumber: "TRK654321",
      estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-1001" },
    update: { userId: user.id, orderId: order1.id, status: "UNPAID" },
    create: {
      userId: user.id,
      orderId: order1.id,
      invoiceNumber: "INV-1001",
      amount: 49.99,
      currency: "USD",
      status: "UNPAID",
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-1002" },
    update: { userId: user.id, orderId: order2.id, status: "PAID" },
    create: {
      userId: user.id,
      orderId: order2.id,
      invoiceNumber: "INV-1002",
      amount: 29.99,
      currency: "USD",
      status: "PAID",
    },
  });

  let conversation = await prisma.conversation.findFirst({
    where: { userId: user.id, title: "Sample support conversation" },
    include: { messages: true },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "Sample support conversation",
        messages: {
          create: [
            {
              role: "USER",
              content: "Hi, I have a question about my recent order.",
            },
          ],
        },
      },
      include: { messages: true },
    });
  }

  console.log("Seeded user, orders, invoices, and conversation with id:", conversation.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
