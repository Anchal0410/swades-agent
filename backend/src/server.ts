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

// CORS: allow deployed frontend + local dev. Set CORS_ORIGIN on Render (e.g. https://swades-agent.vercel.app).
const corsOrigin = process.env.CORS_ORIGIN;
const originList = corsOrigin
  ? corsOrigin.split(",").map((o) => o.trim())
  : ["https://swades-agent.vercel.app", "http://localhost:5173", "http://localhost:5174"];

app.use(
  "*",
  cors({
    origin: originList,
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
