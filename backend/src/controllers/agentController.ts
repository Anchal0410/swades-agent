import type { Context } from "hono";
import { agentService, type PublicAgentType } from "../services/agentService";

export const agentController = {
  listAgents(c: Context) {
    const agents = agentService.listAgents();
    return c.json({ agents });
  },

  getAgentCapabilities(c: Context) {
    const type = c.req.param("type").toUpperCase() as PublicAgentType;
    const agents = agentService.listAgents().map((a) => a.type);

    if (!agents.includes(type)) {
      return c.json({ error: { message: "Unknown agent type" } }, 404);
    }

    const agent = agentService.getCapabilities(type);
    return c.json(agent);
  },
};

