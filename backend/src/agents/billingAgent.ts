import type { Message } from "@prisma/client";
import { generateReply } from "../ai/aiProvider";
import { conversationService } from "../services/conversationService";
import { billingService } from "../services/billingService";

export interface AgentContext {
  userId?: string;
  conversationId: string;
  history: Message[];
  message: string;
}

const extractInvoiceNumber = (text: string): string | null => {
  const match = text.match(/INV-?(\d{3,10})/i);
  return match ? `INV-${match[1]}` : null;
};

const buildBillingPrompt = (ctx: AgentContext, history: Message[], invoiceSummary: string | null) => {
  const historyText = history
    .map((m) => `${m.role === "USER" ? "User" : "Agent"}: ${m.content}`)
    .join("\n");

  return `
You are a billing support agent.
You can see the following billing and invoice information for this user:

${invoiceSummary ?? "No specific invoices were found for this user."}

Conversation so far:
${historyText}

User: ${ctx.message}

Respond with clear, friendly billing-related support. If you don't find an invoice, ask the user for their invoice number or email.
`.trim();
};

export const billingAgent = {
  async streamResponse(ctx: AgentContext) {
    const fullHistory = await conversationService.getConversationHistory(ctx.conversationId);

    let invoiceSummary: string | null = null;

    const invoiceNumber = extractInvoiceNumber(ctx.message);
    const invoices =
      (invoiceNumber && [(await billingService.findInvoiceByNumber(invoiceNumber))].filter(Boolean)) ||
      (await billingService.listInvoicesForUser(ctx.userId));

    if (invoices && invoices.length > 0) {
      invoiceSummary = invoices
        .map(
          (inv) =>
            `Invoice: ${inv.invoiceNumber} | Status: ${inv.status} | Amount: ${inv.amount} ${inv.currency} | Created: ${inv.createdAt.toISOString()}`,
        )
        .join("\n");
    }

    const prompt = buildBillingPrompt(ctx, fullHistory, invoiceSummary);
    const encoder = new TextEncoder();

    const fullText = await generateReply({
      inputs: prompt,
      maxNewTokens: 256,
      temperature: 0.4,
    });

    await conversationService.appendMessage({
      conversationId: ctx.conversationId,
      role: "AGENT",
      agentType: "BILLING",
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

