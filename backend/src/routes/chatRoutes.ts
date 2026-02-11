import { Hono } from "hono";
import { chatController } from "../controllers/chatController";
import { rateLimiter } from "../middleware/rateLimiter";

export const chatRouter = new Hono();

chatRouter.post("/messages", rateLimiter, chatController.postMessage);
chatRouter.get("/conversations/:id", chatController.getConversationById);
chatRouter.get("/conversations", chatController.listConversations);
chatRouter.delete("/conversations/:id", chatController.deleteConversation);

