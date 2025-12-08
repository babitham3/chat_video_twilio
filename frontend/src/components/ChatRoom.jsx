import React, { useEffect, useRef, useState } from "react";

export default function ChatRoom({ sessionId, user, role, apiBase = "http://127.0.0.1:8000/api" }) {
  console.log("chat haha",{sessionId,user,role});
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const messagesRef = useRef(null);
  const [sendingInvite,setSendingInvite]=useState(false);

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

  console.log("ChatRoom: opening WS", { url, user, role });

  const socket = new WebSocket(url);

  socket.onopen = () => {
    console.log("WS opened", { sessionId, user, role });
    setConnected(true);
    socket.send(JSON.stringify({ action: "identify", user, role }));
  };

  socket.onmessage = (ev) => {
    console.log("WS EVENT RAW:", ev.data); 

    let data;
    try {
      data = JSON.parse(ev.data);
    } catch (e) {
      console.error("WS JSON parse error", e, ev.data);
      return;
    }

    const t = data.type;
    console.log("WS EVENT PARSED:", t, data);

    const isChatMsg =
      t === "message" ||
      t === "chat.message" ||
      t === "chat_message";

    const isPresence =
      t === "presence" ||
      t === "presence.update" ||
      t === "presence_update";

    const isIdent = t === "identified";

    const isMeeting = t === "meeting.started" || t === "meeting_started";

    if (isChatMsg) {
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          sender: data.sender,
          role: data.role,
          text: data.text || data.message,
          created_at: data.created_at,
        },
      ]);
      return;
    }

    if (isPresence) {
      if (data.action === "joined") {
        setOnline((o) => Array.from(new Set([...o, data.user])));
      } else if (data.action === "left") {
        setOnline((o) => o.filter((u) => u !== data.user));
      }
      return;
    }

    if (isIdent) {
      setOnline(data.online || []);
      return;
    }

    if (isMeeting) {
      console.log("WS meeting.started for role", role, data);

      if (role === "agent") {
        const identity = user || "agent";
        const joinUrl = `${window.location.origin}/meet/${data.link_id}?identity=${encodeURIComponent(
          identity
        )}&auto_join=1&role=agent`;

        console.log("Agent redirecting to", joinUrl);
        // Same-tab navigation so browser cannot block it
        window.location.href = joinUrl;
      }
      return;
    }

    console.log("WS OTHER EVENT:", data);
  };

  socket.onerror = (err) => {
    console.error("WS error", err);
  };

  socket.onclose = () => {
    console.log("WS closed", { sessionId, user, role });
    setConnected(false);
    setWs(null);
  };

  setWs(socket);

  return () => {
    console.log("ChatRoom: closing WS", { sessionId, user, role });
    if (socket && socket.readyState === 1) {
      socket.close();
    }
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

  async function sendVideoInvite(){
    if(!sessionId) return;
    try{
      setSendingInvite(true);
      const res=await fetch(`${apiBase}/sessions/${sessionId}/meetings/create/`,{
        method: "POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          creator:user,
          one_time: true,
          allowed_count:2,
        }),
      });
      if(!res.ok){
        console.error("create meeting failed",res.status);
        return;
      }
      const data=await res.json();
      const linkId=data.id;

      //frontend join url
      const joinPath = `/meet/${linkId}`;

      //send an invite as a chat message
      if(ws && ws.readyState===1){
        ws.send(
          JSON.stringify({
            action:"message",
            text:`Video call invite: ${joinPath}`,
            user,
            role,
          })
        );
      }
    }catch(e){
      console.error("sendVideoInvite error",e);
    }finally{
      setSendingInvite(false);
    }
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

  function renderMessageText(text) {
  if (!text) return null;

  // 1) Handle /meet/<uuid> 
  const meetRegex = /(\/meet\/[0-9a-fA-F-]+)/;
  const meetMatch = text.match(meetRegex);
  if (meetMatch) {
    const path = meetMatch[1];               // "/meet/34e41e5c-..."
    const before = text.slice(0, meetMatch.index);
    const after = text.slice(meetMatch.index + path.length);
    const id = path.split("/").pop();        // "34e41e5c-1dd7-46da-8a95-cc4ef9202217"
    const href = `${window.location.origin}${path}`;

    return (
      <>
        {before}
        <a href={href} target="_blank" rel="noopener noreferrer">
          {id}
        </a>
        {after}
      </>
    );
  }

  // 2) Fallback: http/https URLs → clickable
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, idx) => {
    if (part.match(urlRegex)) {
      return (
        <a key={idx} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

  return (
    <div style={{ padding: 8, background: "#fff", color: "#222" }}>
      <div
        style={{
          marginBottom: 8,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems:"center",
          gap:8,
        }}
      >
        <span>
          <strong>Session:</strong> {sessionId}
        </span>
        <span style={{display:"flex",alignItems:"center",gap:8}}>
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
        {/*agent only button*/}
        {role==="agent" &&(
          <button
          type="button"
          onClick={sendVideoInvite}
          disabled={sendingInvite || !connected}
          style={{
            padding:"4px 8px",
            fontSize:12,
            borderRadius:4,
            border:"1px solid #0b69ff",
            background: sendingInvite ? "#e5efff" : "#0b69ff",
            color:"#fff",
            cursor:sendingInvite ?"default" : "pointer",
          }}
          >
            {sendingInvite?"Sending...":"Send video invite"}
          </button>
        )}
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
            <div>{renderMessageText(m.text)}</div>
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