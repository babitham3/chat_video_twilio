import React, { useEffect, useRef, useState } from "react";

export default function ChatRoom({ sessionId, user, role, apiBase = "http://127.0.0.1:8000/api" }) {
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
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({ action: "identify", user, role }));
    };

    socket.onmessage = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.data);
      } catch (e) {
        console.error("ws parse", e,ev.data);
        return;
      }

      const t=data.type;
      const isChatMsg=
      t === "message" ||
        t === "chat.message" ||
        t === "chat_message";

      const isPresence =
        t === "presence" ||
        t === "presence.update" ||
        t === "presence_update";
      
        const isIdent = t === "identified";

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
      } else if (isPresence) {
        if (data.action === "joined") {
          setOnline((o) => Array.from(new Set([...o, data.user])));
        } else if (data.action === "left") {
          setOnline((o) => o.filter((u) => u !== data.user));
        }
      } else if (isIdent) {
        setOnline(data.online || []);
      } else {
        console.log("WS other event:", data);
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
      const joinUrl = `${window.location.origin}/meet/${linkId}`;

      //send an invite as a chat message
      if(ws && ws.readyState===1){
        ws.send(
          JSON.stringify({
            action:"message",
            text:`Video call invite: ${joinUrl}`,
            user,
            role,
            is_video_invite: true,
            link_id:linkId,
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