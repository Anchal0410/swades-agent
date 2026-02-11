import { Hono } from "hono";
import { healthController } from "../controllers/healthController";

export const healthRouter = new Hono();

healthRouter.get("/health", healthController.getHealth);

