import type { Context } from "hono";
import { z } from "zod";
import { chatService } from "../services/chatService";
import { conversationService } from "../services/conversationService";

const postMessageSchema = z.object({
  userId: z.string().optional(),
  conversationId: z.string().optional(),
  message: z.string().min(1),
});

export const chatController = {
  async postMessage(c: Context) {
    try {
      const json = await c.req.json();
      const parsed = postMessageSchema.safeParse(json);
      if (!parsed.success) {
        return c.json(
          {
            error: {
              message: "Invalid request body",
              details: parsed.error.flatten(),
            },
          },
          400,
        );
      }

      const { userId, conversationId: inputConversationId, message } = parsed.data;

      const conversation = await chatService.getOrCreateConversation(userId, inputConversationId);
      await chatService.saveUserMessage(conversation.id, message);

      const stream = await chatService.streamAgentReply({
        userId,
        conversationId: conversation.id,
        message,
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Conversation-Id": conversation.id,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[chat/postMessage]", err);
      return c.json({ error: { message } }, 500);
    }
  },

  async getConversationById(c: Context) {
    const id = c.req.param("id");
    const conversation = await conversationService.getConversation(id);
    if (!conversation) {
      return c.json({ error: { message: "Conversation not found" } }, 404);
    }

    const messages = await conversationService.getConversationHistory(id);
    return c.json({ conversation, messages });
  },

  async listConversations(c: Context) {
    const userId = c.req.query("userId");
    const conversations = await conversationService.listConversations(userId);
    return c.json({ conversations });
  },

  async deleteConversation(c: Context) {
    const id = c.req.param("id");
    await conversationService.deleteConversation(id);
    return c.json({ success: true });
  },
};

