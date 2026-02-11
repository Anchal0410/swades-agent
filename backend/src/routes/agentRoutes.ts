import { Hono } from "hono";
import { agentController } from "../controllers/agentController";

export const agentRouter = new Hono();

agentRouter.get("/", agentController.listAgents);
agentRouter.get("/:type/capabilities", agentController.getAgentCapabilities);

