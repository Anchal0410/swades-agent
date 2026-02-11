# Testing the AI Customer Support Application

This guide walks you through **prerequisites**, **setup**, and **step-by-step tests** to verify the application works end to end.

---

## 1. Prerequisites

Before testing, ensure you have:

| Requirement | How to check |
|-------------|----------------|
| **Node.js** (v18+) | `node --version` |
| **npm** | `npm --version` |
| **PostgreSQL** (v14+) | `psql --version` or pgAdmin / another client |
| **Hugging Face API key** | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — create a token with **Read** access |

---

## 2. One-time setup

### 2.1 Create the database

Using PostgreSQL, create a database named `ai_support`:

**Using `psql`:**
```bash
psql -U postgres
CREATE DATABASE ai_support;
\q
```

**Using Windows (if `psql` is in PATH):**
```powershell
psql -U postgres -c "CREATE DATABASE ai_support;"
```

Replace `postgres` with your PostgreSQL username if different.

### 2.2 Backend: install, env, migrate, seed

From the **project root** (`d:\SwadesAI`):

```powershell
cd backend
npm install
```

Create or edit `backend\.env` with your real values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ai_support?schema=public"
HUGGINGFACE_API_KEY="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
HF_MODEL_ID="mistralai/Mistral-7B-Instruct-v0.2"
PORT=4000
```

- Replace `USER` and `PASSWORD` with your PostgreSQL username and password.
- Replace `hf_xxx...` with your Hugging Face token.

Then run:

```powershell
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

You should see a log like: `Seeded user, orders, invoices, and conversation with id: ...`

If `npx prisma db seed` fails, run the seed script directly:

```powershell
npx ts-node prisma/seed.ts
```

### 2.3 Frontend: install

From the project root:

```powershell
cd frontend
npm install
```

---

## 3. Start the application

You need **two terminals**: one for backend, one for frontend.

### Terminal 1 — Backend

```powershell
cd d:\SwadesAI\backend
npm run dev
```

Expected output: `🚀 Hono server running on http://localhost:4000`

### Terminal 2 — Frontend

```powershell
cd d:\SwadesAI\frontend
npm run dev
```

Expected output: local URL such as `http://localhost:5173`

Keep both running while testing.

---

## 4. Test 1 — Health check (API)

Verify the backend is up.

**Browser:**  
Open: [http://localhost:4000/api/health](http://localhost:4000/api/health)

**Or PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/health" -Method Get
```

**Expected:** JSON like:
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T..."
}
```

---

## 5. Test 2 — List agents (API)

**Browser:**  
Open: [http://localhost:4000/api/agents](http://localhost:4000/api/agents)

**Or PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/agents" -Method Get
```

**Expected:** JSON with an `agents` array containing three agents (e.g. SUPPORT, ORDER, BILLING), each with `type`, `description`, and `capabilities`.

**Optional — Single agent capabilities:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/agents/ORDER/capabilities" -Method Get
```

---

## 6. Test 3 — List conversations (API)

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/chat/conversations" -Method Get
```

**Expected:** JSON with a `conversations` array. After seeding, you should see at least one conversation (e.g. "Sample support conversation").

**Get one conversation’s messages** (replace `CONVERSATION_ID` with an `id` from the list):
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/chat/conversations/CONVERSATION_ID" -Method Get
```

**Expected:** `conversation` object and `messages` array with at least one message.

---

## 7. Test 4 — Send a message and stream response (API)

This checks that the router delegates and the agent streams a reply.

**PowerShell (streaming response):**
```powershell
$body = @{ message = "What is your return policy?" } | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:4000/api/chat/messages" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
$response.Headers["X-Conversation-Id"]
$response.Content
```

- **Expected:**  
  - Header `X-Conversation-Id` is present (new or existing conversation id).  
  - `$response.Content` is the full streamed text reply (e.g. about returns/support).

**Another example — Order-style query:**
```powershell
$body = @{ message = "Where is my order? I need tracking." } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/chat/messages" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
```

**Expected:** Streamed reply that references order/tracking (Order agent).

**Billing-style query:**
```powershell
$body = @{ message = "I want a refund for my last invoice." } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:4000/api/chat/messages" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
```

**Expected:** Streamed reply that references invoices/refunds (Billing agent).

---

## 8. Test 5 — Full flow in the UI

1. Open the frontend: [http://localhost:5173](http://localhost:5173).

2. **Page load**
   - Left sidebar: "Conversations" (at least one if you seeded), "Agents" (Support, Order, Billing with descriptions/capabilities).
   - Main area: "New conversation" or selected conversation title and empty or existing messages.

3. **New conversation**
   - Click **"+ New conversation"**.
   - Main area should show "New conversation" and an empty message list.

4. **Send a support-style message**
   - Type: `How do I reset my password?`
   - Click **Send** (or press Enter).
   - You should see:
     - Your message as a user bubble on the right.
     - An "Agent is typing…" indicator.
     - The agent’s reply streaming in on the left (Support agent).
   - After the stream finishes, the typing indicator disappears and the reply stays.

5. **Conversation list**
   - A new conversation should appear in the left sidebar (e.g. "Customer support conversation").
   - Click it: the same messages should show in the main area.

6. **Order-style message (same or new conversation)**
   - Type: `Where is my order? Tracking number TRK123456`
   - Send.
   - You should see streaming reply about order status/tracking (Order agent; seed data has `TRK123456`).

7. **Billing-style message**
   - Type: `What is the status of invoice INV-1001?`
   - Send.
   - You should see streaming reply about the invoice (Billing agent; seed data has INV-1001).

8. **Persistence**
   - Refresh the page (F5).
   - Open the same conversation from the sidebar.
   - All messages (user + agent) should still be there.

9. **Delete conversation (optional)**
   - From API:  
     `Invoke-RestMethod -Uri "http://localhost:4000/api/chat/conversations/CONVERSATION_ID" -Method Delete`  
   - Reload the frontend; that conversation should disappear from the list.

---

## 9. Quick checklist

| Step | What to do | Pass? |
|------|------------|--------|
| 1 | Backend starts without errors | ☐ |
| 2 | Frontend starts and loads at http://localhost:5173 | ☐ |
| 3 | GET /api/health returns `status: "ok"` | ☐ |
| 4 | GET /api/agents returns 3 agents with capabilities | ☐ |
| 5 | GET /api/chat/conversations returns at least one conversation (after seed) | ☐ |
| 6 | POST /api/chat/messages with "return policy" streams a reply and returns X-Conversation-Id | ☐ |
| 7 | UI: send message → see "Agent is typing…" and streamed reply | ☐ |
| 8 | UI: new conversation appears in sidebar after first message | ☐ |
| 9 | UI: order/tracking message gets order-related reply | ☐ |
| 10 | UI: invoice/refund message gets billing-related reply | ☐ |
| 11 | UI: refresh page → conversation and messages still visible | ☐ |

---

## 10. Troubleshooting

| Issue | What to try |
|-------|-------------|
| **"HUGGINGFACE_API_KEY is not set"** | Add a valid `HUGGINGFACE_API_KEY` in `backend\.env` and restart the backend. |
| **Database connection errors** | Check `DATABASE_URL` (user, password, host, port, database name). Ensure PostgreSQL is running and `ai_support` exists. |
| **Prisma migrate fails** | Run `npx prisma generate` then `npx prisma migrate dev --name init` again. |
| **Seed fails (e.g. "Unique constraint")** | Database may already be seeded. You can reset: `npx prisma migrate reset` (this drops data and reapplies migrations + seed). |
| **Frontend shows "Failed to send message"** | Ensure backend is running on port 4000 and no firewall is blocking it. If you’re not using Vite proxy, call `http://localhost:4000/api/...` from the frontend. |
| **No streamed text / empty reply** | Check backend logs for Hugging Face errors. Confirm your HF token has access to the model in `HF_MODEL_ID`. Try a smaller model if the default is rate-limited or unavailable. |
| **Agents list or conversations empty in UI** | Open DevTools (F12) → Network: check that GET `/api/agents` and GET `/api/chat/conversations` return 200 and valid JSON. |

---

## 11. Optional: run backend and frontend from project root

**Backend:**
```powershell
cd d:\SwadesAI\backend
npm run dev
```

**Frontend (new terminal):**
```powershell
cd d:\SwadesAI\frontend
npm run dev
```

Then follow **Section 8** for UI testing and **Sections 4–7** for API tests.
