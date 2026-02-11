## AI-Powered Multi-Agent Customer Support System

This project is a fullstack assessment implementation of an AI-powered customer support system with a **multi-agent architecture**.

- **Backend**: Hono (Node + TypeScript), Prisma ORM, PostgreSQL; AI via **Hugging Face** (optional) or **local mock** (free, no API key)
- **Frontend**: React + Vite with a modern chat UI
- **Architecture**: Controller–Service pattern, clear separation of concerns, centralized error middleware
- **Agents**: Router agent + Support, Order, and Billing sub-agents with database-backed tools

### Quick run (after one-time setup)

1. **Terminal 1 – backend:** From project root run `cd backend && npm run dev`. The API runs at **http://localhost:4000**.
2. **Terminal 2 – frontend:** Run `cd frontend && npm run dev`. The app runs at **http://localhost:5173** and proxies `/api` to the backend.

Open http://localhost:5173, start a conversation, and try e.g. “Where is my order TRK123456?” or “Invoice INV-1001?”.

**If the backend fails with “address already in use :::4000”:** Another process is using port 4000. Stop it or use another port (set `PORT=4001` in `backend/.env` and restart). On Windows: `netstat -ano | findstr :4000` then `taskkill /PID <pid> /F`. On macOS/Linux: `lsof -i :4000` then `kill <pid>`.

### Backend Setup (`backend`)

1. **Install dependencies**

```bash
cd backend
npm install
```

2. **Configure environment**

Update `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ai_support?schema=public"
# Optional: leave unset or empty to use free local mock AI (no key, no cost)
# HUGGINGFACE_API_KEY="your-hf-api-key"
# HF_MODEL_ID="google/flan-t5-base"
PORT=4000
```

**AI mode:** If `HUGGINGFACE_API_KEY` is **not set or empty**, the app uses a **local mock AI** — no API key, no cost, works offline. If you set a valid Hugging Face token, it uses the Inference API (router.huggingface.co) instead.

Create the `ai_support` database in PostgreSQL (for example, using `psql` or a GUI).

3. **Prisma: generate client and create schema**

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

4. **Seed database with sample data**

```bash
cd backend
npx prisma db seed
```

You can run this multiple times; the seed is idempotent (upserts by tracking number and invoice number).

The seed script creates:

- A sample user
- Sample orders with tracking + delivery estimates
- Sample invoices with different billing statuses
- A sample conversation + first message

5. **Run the backend**

```bash
npm run dev
```

The Hono server will start on `http://localhost:4000` with the API base path `/api`.

#### API Routes

- **Health**
  - `GET /api/health` – health check

- **Chat**
  - `POST /api/chat/messages`
    - Body: `{ "conversationId"?: string, "message": string }`
    - Returns a **streaming text response** from the delegated AI agent
    - Response header `X-Conversation-Id` contains the conversation id
  - `GET /api/chat/conversations/:id` – full conversation with messages
  - `GET /api/chat/conversations` – list all conversations
  - `DELETE /api/chat/conversations/:id` – delete a conversation (and its messages)

- **Agents**
  - `GET /api/agents` – list available agents (Support, Order, Billing) + capabilities
  - `GET /api/agents/:type/capabilities` – capabilities for a specific agent

#### Multi-Agent System

- **Router agent**
  - Inspects the latest user message and classifies it into:
    - `SUPPORT` (general inquiries / FAQs / troubleshooting)
    - `ORDER` (order status, tracking, cancellation, etc.)
    - `BILLING` (payments, invoices, refunds, subscriptions)
  - Delegates the message to the appropriate sub-agent.

- **Sub-agents & tools**
  - **Support agent**
    - Tool: queries **conversation history** from the database
    - Uses Hugging Face to generate context-aware support responses.
  - **Order agent**
    - Tools:
      - `fetch_order_details` – looks up orders by id/tracking or newest user order
      - `check_delivery_status` – uses order status and estimated delivery date
    - Passes order summary into the prompt for Hugging Face.
  - **Billing agent**
    - Tools:
      - `get_invoice_details` – look up invoices by invoice number or all user invoices
      - `check_refund_status` – based on invoice status (`PAID`, `REFUNDED`, etc.)
    - Includes invoice summary in the Hugging Face prompt.

All agents maintain **conversation context** using saved messages in the `Message` table, and prompts are built from full conversation history for more accurate personalized responses.

### Frontend Setup (`frontend`)

1. **Install dependencies**

```bash
cd frontend
npm install
```

2. **Run the dev server**

```bash
npm run dev
```

Vite will start on `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:4000` (configured in `vite.config.ts`), so make sure the backend is running.

### Frontend Features

- **React chat UI**
  - Left sidebar:
    - Conversation list (fetched from `GET /api/chat/conversations`)
    - New conversation button (resets local state so the next message creates a new conversation)
    - Agent list with descriptions and capabilities (`GET /api/agents`)
  - Main chat panel:
    - Conversation history for the selected conversation
    - User vs agent message styling
    - Shows which agent responded based on `agentType` when available.

- **Streaming responses**
  - Sending a message calls `POST /api/chat/messages`.
  - The frontend reads the **ReadableStream** from `response.body.getReader()`, decoding chunks and updating the latest agent message as text arrives.
  - After the stream finishes, the client refetches the conversation to sync with persisted messages.

- **Real-time “agent is typing” indicator**
  - While the stream is in progress, the UI shows a pulsing “Agent is typing…” indicator under the chat history.

- **Conversation persistence**
  - New messages and agent replies are stored via Prisma in PostgreSQL.
  - Conversation history and list views are fully driven from the backend.

### How the Pieces Fit Together

1. **User sends a message** from the React chat UI.
2. **Chat controller** (`POST /api/chat/messages`) validates input, creates or reuses a conversation, and saves the user message.
3. **Router agent** inspects the message text and delegates to the appropriate sub-agent.
4. **Sub-agent tools** query the database (conversation history, orders, invoices).
5. The sub-agent builds a prompt with domain data + conversation context and calls Hugging Face for **streaming text generation**.
6. The backend exposes this as a **streaming HTTP response** that the frontend reads incrementally, updating the UI live while also showing a typing indicator.
7. When streaming finishes, the agent reply is saved in the database, and the frontend refreshes the conversation to reflect persisted state.

This completes an end-to-end working implementation that follows the required architecture, tech stack, API surface, conversation persistence, streaming, and multi-agent behavior.

---

### Testing the application

For **step-by-step instructions** to run and verify the app (prerequisites, setup, API tests, UI tests, troubleshooting), see:

- **[TESTING.md](./TESTING.md)** — Full testing guide

**Quick test flow:**

1. **Prerequisites:** Node.js 18+, PostgreSQL, Hugging Face API key.
2. **Backend:** Create DB `ai_support`, set `backend/.env`, then:
   ```bash
   cd backend && npm install && npx prisma generate && npx prisma migrate dev --name init && npx prisma db seed && npm run dev
   ```
3. **Frontend:** `cd frontend && npm install && npm run dev` → open http://localhost:5173.
4. **API:** Open http://localhost:4000/api/health and http://localhost:4000/api/agents.
5. **UI:** Send messages like “What is your return policy?”, “Where is my order TRK123456?”, “Status of invoice INV-1001?” and confirm streaming replies and “Agent is typing…”.

