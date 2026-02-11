import { Hono } from "hono";
import { chatController } from "../controllers/chatController";

export const chatRouter = new Hono();

chatRouter.post("/messages", chatController.postMessage);
chatRouter.get("/conversations/:id", chatController.getConversationById);
chatRouter.get("/conversations", chatController.listConversations);
chatRouter.delete("/conversations/:id", chatController.deleteConversation);

