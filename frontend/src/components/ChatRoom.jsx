import React, { useEffect, useRef, useState } from "react";

export default function ChatRoom({ sessionId, user, role, apiBase = "http://127.0.0.1:8000/api" }) {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesRef = useRef(null);

  // Load initial messages
  useEffect(() => {
    if (!sessionId) return;
    fetch(`${apiBase}/sessions/${sessionId}/messages/`)
      .then((r) => r.json())
      .then((arr) => setMessages(arr || []))
      .catch((e) => console.error("load messages:", e));
  }, [sessionId, apiBase]);

  // WebSocket setup
  useEffect(() => {
    if (!sessionId || !user) return;

    const WS_HOST = "127.0.0.1:8000";
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${WS_HOST}/ws/sessions/${sessionId}/`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ action: "identify", user, role }));
    };

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              id: data.id,
              sender: data.sender,
              role: data.role,
              text: data.text,
              created_at: data.created_at,
            },
          ]);
        } else if (data.type === "presence") {
          if (data.action === "joined")
            setOnline((o) => Array.from(new Set([...o, data.user])));
          if (data.action === "left")
            setOnline((o) => o.filter((u) => u !== data.user));
        } else if (data.type === "identified") {
          setOnline(data.online || []);
        }
      } catch (e) {
        console.error("ws parse", e);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      setWs(null);
    };
    socket.onerror = (err) => console.error("WS error", err);

    setWs(socket);
    return () => {
      if (socket && socket.readyState === 1) socket.close();
    };
  }, [sessionId, user, role]);

  // Auto-scroll when messages change
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  function sendMessage(e) {
    e && e.preventDefault();
    if (!ws || ws.readyState !== 1) {
      alert("Not connected — try again.");
      return;
    }
    if (!text.trim()) return;
    const payload = { action: "message", text: text.trim(), user, role };
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error("send failed", err);
      alert("Failed to send");
    }
    setText("");
  }

  const fmtTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString();
    } catch {
      return "";
    }
  };

  return (
    <div style={{ padding: 8, background: "#fff", color: "#222" }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          <strong>Session:</strong> {sessionId}
        </span>
        <span>
          {connected ? (
            <span style={{ color: "green" }}>connected</span>
          ) : (
            <span style={{ color: "red" }}>offline</span>
          )}
          <span style={{ marginLeft: 8 }}>
            Online: {online.join(", ") || "—"}
          </span>
        </span>
      </div>

      {/* FIXED HEIGHT messages */}
      <div
        ref={messagesRef}
        style={{
          border: "1px solid #ccc",
          height: 320,
          overflowY: "auto",
          padding: 8,
          background: "#f7f7fb",
          boxSizing: "border-box",
        }}
      >
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#555" }}>
              <strong>{m.sender}</strong>{" "}
              <small>
                ({m.role})
                {m.created_at ? ` • ${fmtTime(m.created_at)}` : ""}
              </small>
            </div>
            <div>{m.text}</div>
          </div>
        ))}
      </div>

      {}
      <form
        onSubmit={sendMessage}
        style={{
          marginTop: 10,
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
        />
        <button type="submit" style={{ padding: "8px 12px" }}>
          Send
        </button>
      </form>
    </div>
  );
}