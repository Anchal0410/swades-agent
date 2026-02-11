import type { Message } from "@prisma/client";
import { generateReply } from "../ai/aiProvider";
import { conversationService } from "../services/conversationService";
import { orderService } from "../services/orderService";

export interface AgentContext {
  userId?: string;
  conversationId: string;
  history: Message[];
  message: string;
}

const extractOrderIdentifier = (text: string): string | null => {
  const match = text.match(/(#?\d{4,10})/);
  return match ? match[1].replace("#", "") : null;
};

const buildOrderPrompt = (ctx: AgentContext, history: Message[], orderSummary: string | null) => {
  const MAX_HISTORY_MESSAGES = 12;
  const trimmedHistory = history.length > MAX_HISTORY_MESSAGES ? history.slice(-MAX_HISTORY_MESSAGES) : history;

  const historyText = trimmedHistory
    .map((m) => `${m.role === "USER" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");

  return `
You are an order support agent.
You can see the following order information for this user:

${orderSummary ?? "No specific orders were found for this user."}

Conversation so far:
${historyText}

User: ${ctx.message}

Respond with clear, friendly order-related support. If you don't find an order, ask the user for more details like order ID or email.
`.trim();
};

export const orderAgent = {
  async streamResponse(ctx: AgentContext) {
    const fullHistory = await conversationService.getConversationHistory(ctx.conversationId);

    let orderSummary: string | null = null;

    const identifier = extractOrderIdentifier(ctx.message);
    const order =
      (identifier && (await orderService.findOrderByIdOrTracking(identifier))) ||
      (await orderService.getLatestOrderForUser(ctx.userId));

    if (order) {
      orderSummary = `Order ID: ${order.id}
Status: ${order.status}
Tracking: ${order.trackingNumber ?? "not available"}
Estimated delivery: ${order.estimatedDelivery ?? "not available"}`;
    }

    const prompt = buildOrderPrompt(ctx, fullHistory, orderSummary);
    const encoder = new TextEncoder();

    const fullText = await generateReply({
      inputs: prompt,
      maxNewTokens: 256,
      temperature: 0.4,
    });

    await conversationService.appendMessage({
      conversationId: ctx.conversationId,
      role: "AGENT",
      agentType: "ORDER",
      content: fullText,
    });

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fullText));
        controller.close();
      },
    });

    return stream;
  },
};

