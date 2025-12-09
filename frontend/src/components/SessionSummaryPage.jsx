import React, { useEffect, useState } from "react";

export default function SessionSummaryPage({
  apiBase = "http://127.0.0.1:8000/api",
  sessionId: propSessionId,
}) {
  const path = window.location.pathname; // /sessions/<id>/summary
  const parts = path.split("/").filter(Boolean);
  const urlSessionId = parts[0] === "sessions" && parts.length>=2 ? parts[1]:null;
  const sessionId = propSessionId || urlSessionId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadSummary() {
    if (!sessionId) {
      setError("Missing session id.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${apiBase}/sessions/${sessionId}/summary/`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.detail || json.error || `Failed to load summary (status ${res.status})`
        );
      }
      setData(json);
    } catch (e) {
      console.error("session summary error", e);
      setError(e.message || "Failed to load session summary.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, [sessionId]);

  function goBackToSessions() {
    window.location.href = "/sessions-log";
  }

  const session = data?.session;
  const meetings = data?.meetings || [];

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
          <h1 style={{ margin: 0, color: "#111827" }}>Session summary</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
            Session: <code style={{ fontSize: 12 }}>{sessionId}</code>
          </p>
        </div>
        <button
          onClick={goBackToSessions}
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
          ← Back to Sessions history
        </button>
      </header>

      {loading && <p>Loading session summary…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {session && (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            color: "#111827",
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#111827" }}>
            {session.title || "Untitled session"}
          </h2>
          <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 4 }}>
            <span>Customer: </span>
            <strong>{session.customer_id || "visitor"}</strong>
            <span style={{ marginLeft: 12 }}>Agent: </span>
            <strong>{session.agent_id || "—"}</strong>
          </div>
          <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 4 }}>
            <span>Status: </span>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                background: session.is_active ? "#dcfce7" : "#fee2e2",
                color: session.is_active ? "#166534" : "#b91c1c",
                fontSize: 11,
                marginLeft: 4,
              }}
            >
              {session.is_active ? "Active" : "Closed"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#4b5563" }}>
            <div>
              Created:{" "}
              <strong>
                {session.created_at
                  ? new Date(session.created_at).toLocaleString()
                  : "—"}
              </strong>
            </div>
            <div>
              First meeting:{" "}
              <strong>
                {session.first_meeting_at
                  ? new Date(session.first_meeting_at).toLocaleString()
                  : "—"}
              </strong>
            </div>
            <div>
              Last meeting:{" "}
              <strong>
                {session.last_meeting_at
                  ? new Date(session.last_meeting_at).toLocaleString()
                  : "—"}
              </strong>
            </div>
            <div>
              Total meetings: <strong>{session.meeting_count ?? 0}</strong>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 0, marginBottom: 8, color: "#111827" }}>
        Meetings in this session
      </h3>
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
              <th style={thStyle}>Meeting ID</th>
              <th style={thStyle}>Room name</th>
              <th style={thStyle}>Started</th>
              <th style={thStyle}>Ended</th>
              <th style={thStyle}>Call duration</th>
              <th style={thStyle}>Participants</th>
              <th style={thStyle}>Screen share</th>
            </tr>
          </thead>
          <tbody>
            {meetings.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 16,
                    textAlign: "center",
                    color: "#6b7280",
                    background: "#ffffff",
                  }}
                >
                  No meetings recorded for this session.
                </td>
              </tr>
            )}

            {meetings.map((m) => {
              const started = m.started_at
                ? new Date(m.started_at).toLocaleString()
                : "—";
              const ended = m.ended_at
                ? new Date(m.ended_at).toLocaleString()
                : "—";

              const durationSeconds = m.duration_seconds ?? null;
              let durationDisplay = "—";
              if (durationSeconds != null) {
                const mins = Math.floor(durationSeconds / 60);
                const secs = Math.round(durationSeconds % 60);
                durationDisplay = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              }

              const screenSessions = m.screen_share_sessions || [];
              const totalScreenSeconds = m.total_screen_share_seconds ?? 0;

              let totalScreenDisplay = "—";
              if (totalScreenSeconds > 0) {
                const mins = Math.floor(totalScreenSeconds / 60);
                const secs = Math.round(totalScreenSeconds % 60);
                totalScreenDisplay = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
              }

              return (
                <tr key={m.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 500, color: "#111827" }}>{m.id}</div>
                  </td>
                  <td style={tdStyle}>{m.room_name}</td>
                  <td style={tdStyle}>{started}</td>
                  <td style={tdStyle}>{ended}</td>
                  <td style={tdStyle}>{durationDisplay}</td>
                  <td style={tdStyle}>
                    {m.participants && m.participants.length > 0
                      ? m.participants.join(", ")
                      : "—"}
                  </td>
                  <td style={tdStyle}>
                    {screenSessions.length === 0 ? (
                      <span style={{ color: "#6b7280" }}>None</span>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <strong>Total:</strong> {totalScreenDisplay}
                        </div>
                        <ul
                          style={{
                            paddingLeft: 16,
                            margin: 0,
                            listStyle: "disc",
                          }}
                        >
                          {screenSessions.map((s, idx) => {
                            const startStr = s.start
                              ? new Date(s.start).toLocaleTimeString()
                              : "—";
                            const endStr = s.end
                              ? new Date(s.end).toLocaleTimeString()
                              : "—";
                            const durSecs = Math.round(s.duration_seconds ?? 0);
                            return (
                              <li key={idx}>
                                <span>
                                  <strong>{s.identity || "Unknown"}</strong>:{" "}
                                  {startStr} – {endStr} ({durSecs}s)
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
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