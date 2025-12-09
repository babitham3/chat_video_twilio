// src/components/AgentDashboard.jsx
import React, { useEffect, useState } from "react";
import ChatRoom from "./ChatRoom";

export default function AgentDashboard({ apiBase = "http://127.0.0.1:8000/api" }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [agentId] = useState("agent1"); // simple single-agent default
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
    const t = setInterval(fetchSessions, 5000); // refresh every 5s
    return () => clearInterval(t);
  }, []);

  async function fetchSessions() {
    try {
      const res = await fetch(`${apiBase}/sessions/list/`);
      const arr = await res.json();
      setSessions(arr || []);
    } catch (e) {
      console.error("load sessions", e);
    }
  }

  async function closeSession(sessionId) {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/sessions/${sessionId}/close/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        console.error("close failed", res.status);
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
      }
    } catch (e) {
      console.error("close session error", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Agent Dashboard</h2>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Logged in as: <strong>{agentId}</strong>
            {loading && <span style={{ marginLeft: 8 }}>Closing session…</span>}
          </div>
        </div>

        {/* Single entry point to analytics */}
        <button
          onClick={() => (window.location.href = "/sessions-log")}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontSize: 13,
            cursor: "pointer",
            color:"black",
          }}
        >
          View sessions history →
        </button>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        {/* Left: session list */}
        <div style={{ width: 360 }}>
          <h3>Active Sessions</h3>
          <div
            style={{
              border: "1px solid #eee",
              padding: 8,
              maxHeight: 500,
              overflowY: "auto",
            }}
          >
            {sessions.length === 0 && <div>No active sessions</div>}

            {sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: 8,
                  borderBottom: "1px solid #f1f1f1",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#333" }}>
                    {s.title || "untitled"}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {s.customer_id || "visitor"} •{" "}
                    {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "stretch",
                  }}
                >
                  <button onClick={() => setActiveSession(s.id)}>
                    Open Chat
                  </button>

                  <button
                    onClick={() => closeSession(s.id)}
                    style={{ background: "#f97373", color: "#fff" }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: active chat */}
        <div
          style={{
            flex: 1,
            minHeight: 600,
            border: "1px solid #eee",
          }}
        >
          {activeSession ? (
            <ChatRoom
              sessionId={activeSession}
              user={agentId}
              role="agent"
              apiBase={apiBase}
            />
          ) : (
            <div style={{ padding: 20 }}>Select a session to open chat.</div>
          )}
        </div>
      </div>
    </div>
  );
}