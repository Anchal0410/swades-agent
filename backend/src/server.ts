import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "dotenv";
import { cors } from "hono/cors";
import { chatRouter } from "./routes/chatRoutes";
import { agentRouter } from "./routes/agentRoutes";
import { healthRouter } from "./routes/healthRoutes";
import { errorHandler } from "./middleware/errorHandler";

config();

const app = new Hono().basePath("/api");

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.route("/chat", chatRouter);
app.route("/agents", agentRouter);
app.route("/", healthRouter);

app.onError(errorHandler);

const port = Number(process.env.PORT) || 4000;

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info: { port: number }) => {
    console.log(`🚀 Hono server running on http://localhost:${info.port}`);
  },
);
