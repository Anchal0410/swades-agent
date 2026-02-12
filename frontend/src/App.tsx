import React, { useEffect, useMemo, useState } from "react";
import "./style.css";

type AgentType = "SUPPORT" | "ORDER" | "BILLING";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "USER" | "AGENT" | "SYSTEM";
  agentType: AgentType | "ROUTER" | null;
  content: string;
  createdAt: string;
}

interface AgentInfo {
  type: AgentType;
  description: string;
  capabilities: string[];
}

// In production (Vercel), set VITE_API_URL to backend root (e.g. https://swades-agent.onrender.com/api)
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const loadConversations = async () => {
    const res = await fetch(`${API_BASE}/chat/conversations`);
    if (!res.ok) return;
    const data = await res.json();
    setConversations(data.conversations ?? []);
  };

  const loadConversationMessages = async (id: string) => {
    const res = await fetch(`${API_BASE}/chat/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
  };

  const loadAgents = async () => {
    const res = await fetch(`${API_BASE}/agents`);
    if (!res.ok) return;
    const data = await res.json();
    setAgents(data.agents ?? []);
  };

  useEffect(() => {
    void loadConversations();
    void loadAgents();
  }, []);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMessages([]);
    void loadConversationMessages(id);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || isSending || isStreaming) return;
    setError(null);
    setIsSending(true);

    const localConversationId = selectedConversationId;
    const userMessage: Message = {
      id: `local-${Date.now()}`,
      role: "USER",
      agentType: null,
      content: input,
      createdAt: new Date().toISOString(),
    };

    const assistantMessage: Message = {
      id: `local-assistant-${Date.now()}`,
      role: "AGENT",
      agentType: "SUPPORT",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsSending(false);
    setIsStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/chat/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: localConversationId ?? undefined,
          message: userMessage.content,
        }),
      });

      if (!res.ok) {
        let msg = "Failed to send message";
        try {
          const body = await res.json();
          if (body?.error?.message) msg = body.error.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      if (!res.body) {
        throw new Error("No response body");
      }

      const conversationIdFromHeader = res.headers.get("x-conversation-id");
      if (conversationIdFromHeader && !localConversationId) {
        setSelectedConversationId(conversationIdFromHeader);
        void loadConversations();
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let assistantContent = "";

      // Stream tokens as they arrive
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        const chunk = decoder.decode(value);
        assistantContent += chunk;

        setMessages((prev) => {
          const copy = [...prev];
          const index = copy.findIndex((m) => m.id === assistantMessage.id);
          if (index >= 0) {
            copy[index] = {
              ...copy[index],
              content: assistantContent,
            };
          }
          return copy;
        });
      }

      // After streaming completes, refresh conversation messages to reflect
      // canonical versions persisted by the backend (with real ids and agent types).
      const finalConversationId = conversationIdFromHeader ?? localConversationId;
      if (finalConversationId) {
        await loadConversations();
        await loadConversationMessages(finalConversationId);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">AI Support Desk</h1>
          <p className="app-subtitle">Multi-agent customer support assistant</p>
          <button className="primary-button" onClick={handleNewConversation}>
            + New conversation
          </button>
        </div>

        <section className="sidebar-section">
          <h2 className="sidebar-section-title">Conversations</h2>
          <div className="conversation-list">
            {conversations.length === 0 && <p className="muted-text">No conversations yet.</p>}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                className={
                  "conversation-item" +
                  (conv.id === selectedConversationId ? " conversation-item--active" : "")
                }
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className="conversation-title">{conv.title ?? "Untitled conversation"}</div>
                <div className="conversation-meta">
                  {new Date(conv.updatedAt ?? conv.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="sidebar-section">
          <h2 className="sidebar-section-title">Agents</h2>
          <div className="agent-list">
            {agents.map((agent) => (
              <div key={agent.type} className="agent-card">
                <div className="agent-name">{agent.type}</div>
                <div className="agent-description">{agent.description}</div>
                <div className="agent-capabilities">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="agent-capability-badge">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <div>
            <h2 className="chat-title">
              {activeConversation?.title ?? "New conversation"}
            </h2>
            <p className="chat-subtitle">
              Ask about orders, billing, or general support and the router agent will delegate to
              the right specialist.
            </p>
          </div>
        </header>

        <section className="chat-history" id="chat-history">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Start by asking a question about your order, billing, or any support issue.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                "chat-message" + (msg.role === "USER" ? " chat-message--user" : " chat-message--agent")
              }
            >
              <div className="chat-message-meta">
                <span className="chat-message-author">
                  {msg.role === "USER"
                    ? "You"
                    : msg.agentType && msg.agentType !== "ROUTER"
                    ? `${msg.agentType} agent`
                    : "Support agent"}
                </span>
                <span className="chat-message-time">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="chat-message-bubble">{msg.content}</div>
            </div>
          ))}

          {isStreaming && (
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-text">
                {["Thinking", "Searching", "Analyzing", "Routing to specialist"][
                  Math.floor((Date.now() / 1000) % 4)
                ]}
                …
              </span>
            </div>
          )}
        </section>

        <footer className="chat-input-area">
          {error && <div className="error-banner">{error}</div>}
          <div className="chat-input-row">
            <textarea
              className="chat-textarea"
              placeholder="Type your message here…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={3}
            />
            <button
              className="primary-button send-button"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? "Streaming…" : "Send"}
            </button>
          </div>
          <p className="input-hint">
            Press Enter to send, Shift+Enter for a new line.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;

