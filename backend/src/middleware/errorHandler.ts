import type { Context } from "hono";

export const errorHandler = (err: Error, c: Context) => {
  console.error(err);

  const status = "status" in err && typeof (err as any).status === "number" ? (err as any).status : 500;
  const message = status === 500 ? "Internal server error" : err.message;

  return c.json(
    {
      error: {
        message,
      },
    },
    status,
  );
};

