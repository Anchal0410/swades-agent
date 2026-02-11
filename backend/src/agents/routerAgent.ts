import type { AgentType, Message } from "@prisma/client";
import { supportAgent } from "./supportAgent";
import { orderAgent } from "./orderAgent";
import { billingAgent } from "./billingAgent";

export type RoutedAgentType = Extract<AgentType, "SUPPORT" | "ORDER" | "BILLING">;

export interface RouterContext {
  userId?: string;
  conversationId: string;
  history: Message[];
}

export interface RouterResult {
  agentType: RoutedAgentType;
}

const detectIntent = (text: string): RoutedAgentType => {
  const lower = text.toLowerCase();

  if (/(order|tracking|shipment|delivery|cancel)/.test(lower)) {
    return "ORDER";
  }

  if (/(invoice|billing|payment|refund|charge|subscription)/.test(lower)) {
    return "BILLING";
  }

  return "SUPPORT";
};

export const routerAgent = {
  route(message: string): RouterResult {
    const agentType = detectIntent(message);
    return { agentType };
  },

  async streamResponse(ctx: RouterContext, message: string) {
    const { agentType } = this.route(message);

    if (agentType === "ORDER") {
      return orderAgent.streamResponse({ ...ctx, message });
    }
    if (agentType === "BILLING") {
      return billingAgent.streamResponse({ ...ctx, message });
    }
    return supportAgent.streamResponse({ ...ctx, message });
  },
};

