import React, { useEffect, useState } from "react";
import ChatRoom from "./ChatRoom";

export default function AgentDashboard({ apiBase = "http://127.0.0.1:8000/api" }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [agentId] = useState("agent1"); // simple single-agent default

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

  return (
    <div style={{ padding: 16 }}>
      <h2>Agent Dashboard</h2>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 360 }}>
          <h3>Active Sessions</h3>
          <div style={{ border: "1px solid #eee", padding: 8 }}>
            {sessions.length === 0 && <div>No sessions</div>}
            {sessions.map(s => (
              <div key={s.id} style={{ padding: 8, borderBottom: "1px solid #f1f1f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, color: "#333" }}>{s.title || "untitled"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{s.customer_id || "visitor"} • {new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <button onClick={() => setActiveSession(s.id)}>Open Chat</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, border: "1px solid #eee"}}>
          {activeSession ? (
            <ChatRoom sessionId={activeSession} user={agentId} role="agent" apiBase={apiBase} />
          ) : (
            <div style={{ padding: 20 }}>Select a session to open chat.</div>
          )}
        </div>
      </div>
    </div>
  );
}