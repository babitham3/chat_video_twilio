// src/components/MeetingPage.jsx
import React, { useEffect, useState } from "react";
import VideoCall from "./VideoCall";

export default function MeetingPage({ apiBase = "http://127.0.0.1:8000/api" }) {
  const [state, setState] = useState({
    status: "loading", // loading | ready | invalid | error | joining | in-call
    error: null,
    roomName: null,
    sessionId: null,
    linkId: null,
    token: null,
    identity: "",
    mode: null,
  });

  const searchParams = new URLSearchParams(window.location.search);
  const autoJoin = searchParams.get("auto_join") === "1";
  const identityFromQuery = searchParams.get("identity") || "";
  const roleFromQuery=searchParams.get("role") || "customer";

  const path = window.location.pathname; // /meet/<linkId>
  const parts = path.split("/");
  const linkId = parts[2] || "";

  // validate link once
  useEffect(() => {
    if (!linkId) {
      setState((s) => ({ ...s, status: "error", error: "Missing meeting link id in URL." }));
      return;
    }

    async function validate() {
      try {
        const vRes = await fetch(`${apiBase}/meetings/${linkId}/validate/`);
        const vData = await vRes.json().catch(() => ({}));

        if (!vRes.ok || !vData.valid) {
          setState((s) => ({
            ...s,
            status: "invalid",
            error: vData.reason || vData.detail || `Invalid link (status ${vRes.status})`,
          }));
          return;
        }

        setState((s) => ({
          ...s,
          status: "ready",
          error: null,
          roomName: vData.room_name,
          sessionId: vData.session_id,
          linkId,
          identity: identityFromQuery || "",
        }));
      } catch (e) {
        console.error("validate error", e);
        setState((s) => ({
          ...s,
          status: "error",
          error: "Network error while validating meeting link.",
        }));
      }
    }

    validate();
  }, [linkId, apiBase, identityFromQuery]);

  async function joinWithIdentity(id) {
    if (!id.trim()) {
      alert("Please enter your name");
      return;
    }
    if (!state.roomName || !state.linkId) return;

    setState((s) => ({ ...s, status: "joining", identity: id }));

    try {
      const iRes = await fetch(`${apiBase}/meetings/${state.linkId}/issue/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: id }),
      });
      const iData = await iRes.json().catch(() => ({}));
      if (!iRes.ok || !iData.token) {
        setState((s) => ({
          ...s,
          status: "error",
          error: iData.error || `Failed to issue token (status ${iRes.status})`,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "in-call",
        token: iData.token,
        mode: iData.mode || "twilio",
        identity: iData.identity || id,
      }));
    } catch (e) {
      console.error("issue error", e);
      setState((s) => ({
        ...s,
        status: "error",
        error: "Network error while issuing token.",
      }));
    }
  }

  // Auto-join for agent
  useEffect(() => {
    if (autoJoin && identityFromQuery && state.status === "ready") {
      joinWithIdentity(identityFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, identityFromQuery, state.status]);

  function handleLeave() {
    if (window.opener) {
      window.close();
      return;
    }

    if(roleFromQuery==="agent"){
        window.location.href="/agent";
    }else{
        window.location.href="/";
    }
  }

  const { status, error, roomName, sessionId, identity, token, mode } = state;

  if (status === "in-call" && token && mode === "twilio") {
    return (
      <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <h1>Video Meeting</h1>
        <VideoCall
          token={token}
          roomName={roomName}
          sessionId={sessionId}
          identity={identity}
          onLeave={handleLeave}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1>Video Meeting</h1>
      <p style={{ color: "#555" }}>Link id: {linkId}</p>

      {status === "loading" && <p>Checking your meeting link…</p>}

      {status === "invalid" && (
        <div style={{ marginTop: 16, color: "#b91c1c" }}>
          <h3>Link is not valid</h3>
          <p>{error}</p>
        </div>
      )}

      {status === "error" && (
        <div style={{ marginTop: 16, color: "#b45309" }}>
          <h3>Something went wrong</h3>
          <p>{error}</p>
        </div>
      )}

      {status === "ready" && (
        <div style={{ marginTop: 16 }}>
          <p>
            <strong>Room:</strong> {roomName}
          </p>
          <p>
            <strong>Session:</strong> {sessionId}
          </p>

          {!autoJoin && (
            <>
              <div style={{ marginTop: 12 }}>
                <label>
                  Your name:{" "}
                  <input
                    value={identity}
                    onChange={(e) =>
                      setState((s) => ({ ...s, identity: e.target.value }))
                    }
                    style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
                    placeholder="Enter your name"
                  />
                </label>
              </div>
              <button
                style={{ marginTop: 12, padding: "8px 14px" }}
                onClick={() => joinWithIdentity(identity || "guest")}
                disabled={status === "joining"}
              >
                {status === "joining" ? "Joining…" : "Join call"}
              </button>
            </>
          )}

          {autoJoin && <p>Joining automatically…</p>}
        </div>
      )}
    </div>
  );
}