import type { Context } from "hono";

export const healthController = {
  getHealth(c: Context) {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  },
};

