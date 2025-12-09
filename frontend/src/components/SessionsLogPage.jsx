import React, { useEffect, useState } from "react";

export default function SessionsLogPage({ apiBase = "http://127.0.0.1:8000/api" }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadSessions() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sessions/history/`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || `Failed (status ${res.status})`);
      }
      setSessions(data || []);
    } catch (e) {
      console.error("sessions history error", e);
      setError(e.message || "Failed to load sessions history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSessions();
  }, []);

  function goToSessionSummary(id) {
    window.location.href = `sessions/${id}/summary`;
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#ffffff",
        color: "#111827",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#111827",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "#111827" }}>Sessions history</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
            View all sessions (active and closed) and drill down into meetings.
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/agent")}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontSize: 13,
            cursor: "pointer",
            color: "#111827",
          }}
        >
          ← Back to Agent portal
        </button>
      </header>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          color: "#111827",
        }}
      >
        <div>
          {loading && <span>Loading sessions…</span>}
          {!loading && (
            <span>
              Showing <strong>{sessions.length}</strong> sessions
            </span>
          )}
          {error && (
            <span style={{ marginLeft: 8, color: "#b91c1c" }}>• {error}</span>
          )}
        </div>
        <button
          onClick={loadSessions}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontSize: 13,
            cursor: "pointer",
            color: "#111827",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
            color: "#111827",
          }}
        >
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={thStyle}>Session</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Agent</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Meetings</th>
              <th style={thStyle}>Last meeting</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "#010611ff",
                    background: "#ffffff",
                  }}
                >
                  No sessions found.
                </td>
              </tr>
            )}

            {sessions.map((s) => {
              const created = s.created_at ? new Date(s.created_at).toLocaleString() : "—";
              const lastMeeting =
                s.last_meeting_at ? new Date(s.last_meeting_at).toLocaleString() : "—";
              return (
                <tr key={s.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: "#111827" }}>
                      {s.title || "Untitled session"}
                    </div>
                    <div style={{ fontSize: 12, color: "#000000ff" }}>{s.id}</div>
                  </td>
                  <td style={tdStyle}>{s.customer_id || "visitor"}</td>
                  <td style={tdStyle}>{s.agent_id || "—"}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        background: s.is_active ? "#dcfce7" : "#fee2e2",
                        color: s.is_active ? "#166534" : "#b91c1c",
                      }}
                    >
                      {s.is_active ? "Active" : "Closed"}
                    </span>
                  </td>
                  <td style={tdStyle}>{created}</td>
                  <td style={tdStyle}>{s.meeting_count ?? 0}</td>
                  <td style={tdStyle}>{lastMeeting}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      onClick={() => goToSessionSummary(s.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                        cursor: "pointer",
                        color: "#111827",
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  textAlign: "left",
  padding: "8px 12px",
  fontWeight: 500,
  color: "#4b5563",
  borderBottom: "1px solid #e5e7eb",
};

const tdStyle = {
  padding: "8px 12px",
  color: "#374151",
  verticalAlign: "top",
  background: "#ffffff",
};