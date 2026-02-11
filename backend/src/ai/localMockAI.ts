/**
 * Local mock AI: generates plausible support responses without any API key or cost.
 * Used when HUGGINGFACE_API_KEY is not set. No external services, works offline.
 */

/**
 * Extract the last "User: ..." line from the prompt to get the current message.
 */
function extractUserMessage(prompt: string): string {
  const match = prompt.match(/User:\s*([\s\S]*?)(?=\n|$)/);
  return (match ? match[1].trim() : prompt).slice(0, 500);
}

/**
 * Generate a context-aware support response from the prompt (no API call).
 */
export function localMockGenerate(prompt: string): string {
  const userMsg = extractUserMessage(prompt).toLowerCase();
  const hasOrder = /order|tracking|shipment|delivery|cancel|trk|track/.test(userMsg);
  const hasBilling = /invoice|billing|payment|refund|charge|inv-|amount|pay/.test(userMsg);

  if (hasOrder) {
    if (/tracking|trk|where|status/.test(userMsg)) {
      if (prompt.includes("Tracking:") && prompt.includes("SHIPPED")) {
        return "Your order is on its way! Based on our records, it has been shipped and you should receive it by the estimated delivery date. You can track it using the tracking number we have on file. Is there anything else you'd like to know?";
      }
      if (prompt.includes("DELIVERED")) {
        return "Good news — your order has been delivered. If you have any issues with the delivery or the items, please let us know and we'll be happy to help.";
      }
      return "I'd be happy to help with your order. Could you share your order ID or tracking number (e.g. TRK123456) so I can look up the status for you?";
    }
    if (/cancel/.test(userMsg)) {
      return "I understand you'd like to cancel. I can help with that. Please share your order number so I can check if we can still process the cancellation.";
    }
    return "Thanks for reaching out about your order. Share your order or tracking number and I'll look up the latest status and delivery details for you.";
  }

  if (hasBilling) {
    if (prompt.includes("Invoice:") && prompt.includes("UNPAID")) {
      return "I see you have an unpaid invoice. You can pay it from the link in your invoice email, or tell me your invoice number (e.g. INV-1001) and I can confirm the amount and status.";
    }
    if (prompt.includes("PAID")) {
      return "That invoice is marked as paid. If you're seeing a different status on your side, give us a moment to sync — or share the invoice number and I'll double-check.";
    }
    if (/refund/.test(userMsg)) {
      return "I can help with refunds. Please share your invoice number and the reason for the refund, and I'll outline the next steps.";
    }
    return "I'm here to help with billing and invoices. Share your invoice number (e.g. INV-1001) and I can look up the status and amount for you.";
  }

  // General support
  if (/hello|hi|hey/.test(userMsg) && userMsg.length < 20) {
    return "Hello! I'm your support assistant. You can ask me about orders (tracking, delivery, cancellation), billing (invoices, payments, refunds), or any other question. How can I help you today?";
  }
  if (/thank|thanks/.test(userMsg)) {
    return "You're welcome! If you need anything else, just ask. Have a great day!";
  }
  if (/help|support/.test(userMsg)) {
    return "I can help with order status and tracking, billing and invoices, and general questions. Try asking something like \"Where is my order TRK123456?\" or \"What's the status of invoice INV-1001?\" — or tell me what you need.";
  }

  return "Thanks for your message. I can help with orders (tracking, delivery, cancellation) and billing (invoices, payments). Share an order or tracking number, or an invoice number, and I'll look it up. Or ask anything else and I'll do my best to help.";
}
