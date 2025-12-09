import React, { useEffect, useState } from "react";

export default function AnalyticsPage({ apiBase = "http://127.0.0.1:8000/api", linkId }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    meta: null,
    summary: null,
    events: [],
  });

  useEffect(() => {
    if (!linkId) {
      setState({
        loading: false,
        error: "Missing link id in URL.",
        meta: null,
        summary: null,
        events: [],
      });
      return;
    }

    async function load() {
      try {
        const res = await fetch(`${apiBase}/meetings/${linkId}/analytics/`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setState({
            loading: false,
            error: data.error || `Failed to load analytics (status ${res.status})`,
            meta: null,
            summary: null,
            events: [],
          });
          return;
        }

        setState({
          loading: false,
          error: null,
          meta: data.meta,
          summary: data.summary,
          events: data.events || [],
        });
      } catch (e) {
        console.error("analytics fetch error", e);
        setState({
          loading: false,
          error: "Network error while loading analytics.",
          meta: null,
          summary: null,
          events: [],
        });
      }
    }

    load();
  }, [linkId, apiBase]);

  const { loading, error, meta, summary, events } = state;

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Call Analytics</h1>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Link id: <code>{linkId}</code>
      </p>

      <div style={{ marginBottom: 12 }}>
        <a href="/agent" style={{ fontSize: 13 }}>&larr; Back to Agent portal</a>
      </div>

      {loading && <p>Loading analytics…</p>}

      {error && (
        <div style={{ color: "#b91c1c", marginTop: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary card */}
          <section
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#f9fafb",
              color:"black",
            }}
          >
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Summary</h2>
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Meeting:</strong> {summary.meeting_id}
            </p>
            <p style={{ margin: 0, fontSize: 14 }}>
              <strong>Session:</strong> {summary.session_id}
            </p>
            <p style={{ margin: "4px 0", fontSize: 14 }}>
              <strong>Participants:</strong>{" "}
              {summary.participants && summary.participants.length
                ? summary.participants.join(", ")
                : "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 14 }}>
              <strong>Started:</strong>{" "}
              {summary.start_time ? new Date(summary.start_time).toLocaleString() : "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 14 }}>
              <strong>Ended:</strong>{" "}
              {summary.end_time ? new Date(summary.end_time).toLocaleString() : "—"}
            </p>
            <p style={{ margin: "4px 0", fontSize: 14 }}>
              <strong>Duration:</strong>{" "}
              {summary.duration_seconds != null
                ? `${Math.round(summary.duration_seconds)} sec`
                : "—"}
            </p>

            {/* Screen share summary */}
            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontSize: 15, marginBottom: 4 }}>Screen sharing</h3>
              {summary.screen_share_sessions && summary.screen_share_sessions.length > 0 ? (
                <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
                  {summary.screen_share_sessions.map((s, i) => (
                    <li key={i}>
                      <strong>{s.identity || "Unknown"}</strong>:{" "}
                      {new Date(s.start).toLocaleTimeString()} –{" "}
                      {new Date(s.end).toLocaleTimeString()} (
                      {Math.round(s.duration_seconds)} sec)
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: 13, margin: 0 }}>No screen share recorded.</p>
              )}
            </div>
          </section>

          {/* Raw events table */}
          <section style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18 }}>Event log</h2>
            {events.length === 0 ? (
              <p style={{ fontSize: 14 }}>No events recorded.</p>
            ) : (
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  marginTop: 8,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead style={{ background: "#f3f4f6" }}>
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Time
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Event
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Identity
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Role
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        Metadata
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e, i) => (
                      <tr key={i}>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {e.created_at
                            ? new Date(e.created_at).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                            textTransform: "capitalize",
                          }}
                        >
                          {e.event_type}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          {e.identity || "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          {e.role || "—"}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #f3f4f6",
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 12,
                          }}
                        >
                          {e.metadata ? JSON.stringify(e.metadata) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}