import type { Message } from "@prisma/client";
import { generateReply } from "../ai/aiProvider";
import { conversationService } from "../services/conversationService";

export interface AgentContext {
  userId?: string;
  conversationId: string;
  history: Message[];
  message: string;
}

const buildSupportPrompt = (ctx: AgentContext, history: Message[]) => {
  // Simple context compaction: keep only the most recent N messages
  const MAX_HISTORY_MESSAGES = 12;
  const trimmedHistory = history.length > MAX_HISTORY_MESSAGES ? history.slice(-MAX_HISTORY_MESSAGES) : history;

  const historyText = trimmedHistory
    .map((m) => `${m.role === "USER" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");

  return `
You are a helpful customer support agent.
You handle general inquiries, FAQs, and troubleshooting.

Conversation so far:
${historyText}

User: ${ctx.message}

Respond as a concise, friendly support agent. Do not mention tools or internal systems.
`.trim();
};

export const supportAgent = {
  async streamResponse(ctx: AgentContext) {
    const fullHistory = await conversationService.getConversationHistory(ctx.conversationId);
    const prompt = buildSupportPrompt(ctx, fullHistory);
    const encoder = new TextEncoder();

    const fullText = await generateReply({
      inputs: prompt,
      maxNewTokens: 256,
      temperature: 0.4,
    });

    await conversationService.appendMessage({
      conversationId: ctx.conversationId,
      role: "AGENT",
      agentType: "SUPPORT",
      content: fullText,
    });

    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(fullText));
        controller.close();
      },
    });
  },
};

