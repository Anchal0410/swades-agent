import type { AgentType } from "@prisma/client";

const AGENT_DESCRIPTIONS: Record<Exclude<AgentType, "ROUTER">, string> = {
  SUPPORT: "Handles general support inquiries, FAQs, and troubleshooting.",
  ORDER: "Handles order status, tracking, modifications, and cancellations.",
  BILLING: "Handles payment issues, refunds, invoices, and subscriptions.",
};

const AGENT_CAPABILITIES: Record<Exclude<AgentType, "ROUTER">, string[]> = {
  SUPPORT: ["access_conversation_history"],
  ORDER: ["fetch_order_details", "check_delivery_status"],
  BILLING: ["get_invoice_details", "check_refund_status"],
};

export type PublicAgentType = Exclude<AgentType, "ROUTER">;

export const agentService = {
  listAgents() {
    return (Object.keys(AGENT_DESCRIPTIONS) as PublicAgentType[]).map((type) => ({
      type,
      description: AGENT_DESCRIPTIONS[type],
      capabilities: AGENT_CAPABILITIES[type],
    }));
  },

  getCapabilities(type: PublicAgentType) {
    return {
      type,
      description: AGENT_DESCRIPTIONS[type],
      capabilities: AGENT_CAPABILITIES[type],
    };
  },
};

