// src/components/VideoCall.jsx
import React, { useEffect, useRef } from "react";
import { connect, createLocalTracks, LocalVideoTrack } from "twilio-video";

export default function VideoCall({ token, roomName, sessionId, identity, onLeave }) {
  const localTracksRef = useRef(null);
  const remoteTracksRef = useRef(null);
  const localNameRef = useRef(null);
  const statusTextRef = useRef(null);
  const joinBtnRef = useRef(null);
  const leaveBtnRef = useRef(null);
  const muteBtnRef = useRef(null);
  const cameraBtnRef = useRef(null);
  const shareBtnRef = useRef(null);
  const stopShareBtnRef = useRef(null);

  const overlayRef = useRef(null);
  const overlayContentRef = useRef(null);
  const overlayCloseRef = useRef(null);

  // currently unused, safe to keep
  const localScreenTrackRef = useRef(null);
  const localScreenThumbRef = useRef(null);

  useEffect(() => {
    if (!token || !roomName) return;

    let room = null;
    let localAudioTrack = null;
    let localVideoTrack = null;
    let screenTrack = null;
    let publishedScreenPublication = null;
    const participantThumbs = new Map();

    const localTracksEl = localTracksRef.current;
    const remoteTracksEl = remoteTracksRef.current;
    const localNameEl = localNameRef.current;
    const statusTextEl = statusTextRef.current;
    const joinBtn = joinBtnRef.current;
    const leaveBtn = leaveBtnRef.current;
    const muteBtn = muteBtnRef.current;
    const cameraBtn = cameraBtnRef.current;
    const shareBtn = shareBtnRef.current;
    const stopShareBtn = stopShareBtnRef.current;

    const overlayEl = overlayRef.current;
    const overlayContentEl = overlayContentRef.current;
    const overlayCloseEl = overlayCloseRef.current;

    function setStatus(s) {
      if (statusTextEl) statusTextEl.textContent = s;
    }

    function clear(el) {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
    }

    function expandTrack(track) {
      if (!overlayEl || !overlayContentEl) return;
      clear(overlayContentEl);
      try {
        const node = track.attach();
        node.style.width = "100%";
        node.style.height = "auto";
        overlayContentEl.appendChild(node);
      } catch (e) {
        console.error("expandTrack attach error", e);
      }
      overlayEl.style.display = "flex";
      document.body.style.overflow = "hidden";
    }

    function closeOverlay() {
      if (!overlayEl || !overlayContentEl) return;
      clear(overlayContentEl);
      overlayEl.style.display = "none";
      document.body.style.overflow = "";
    }

    if (overlayCloseEl) {
      overlayCloseEl.onclick = closeOverlay;
    }

    function showCameraOffOnWrapper(wrapper, show = true) {
      try {
        if (!wrapper) return;
        const overlay = wrapper._cameraOverlay;
        if (!overlay) return;
        overlay.style.display = show ? "flex" : "none";
        if (wrapper._mediaEl && wrapper._mediaEl.tagName === "VIDEO") {
          wrapper._mediaEl.style.visibility = show ? "hidden" : "visible";
        }
      } catch (e) {
        // ignore
      }
    }

    function setBadgeTextOnWrapper(wrapper, text) {
      try {
        if (!wrapper) return;
        const badge = wrapper._stateBadge;
        if (!badge) return;
        if (!text) {
          badge.style.display = "none";
          badge.textContent = "";
        } else {
          badge.textContent = text;
          badge.style.display = "inline-block";
        }
      } catch (e) {
        // ignore
      }
    }

    function createThumbForAttachedTrack(identityLabel, track, isLocal = false, labelSuffix = "") {
      const wrapper = document.createElement("div");
      wrapper.className = "thumb";
      wrapper.dataset.identity = identityLabel || "";
      wrapper.dataset.isLocal = isLocal ? "1" : "0";
      wrapper.style.width = "100%";
      wrapper.style.marginBottom = "8px";
      wrapper.style.position = "relative";
      wrapper.style.cursor = "pointer";

      const mediaContainer = document.createElement("div");
      mediaContainer.style.position = "relative";
      mediaContainer.style.width = "100%";
      mediaContainer.style.height = "auto";

      const mediaEl = track.attach();
      mediaEl.setAttribute("playsinline", "");
      mediaEl.style.display = "block";
      mediaEl.style.width = "100%";
      mediaEl.style.height = "auto";
      mediaEl.style.borderRadius = "6px";
      mediaEl.style.background = "#000";
      mediaContainer.appendChild(mediaEl);

      const cameraOverlay = document.createElement("div");
      cameraOverlay.className = "camera-off-overlay";
      cameraOverlay.style.position = "absolute";
      cameraOverlay.style.inset = "0";
      cameraOverlay.style.display = "none";
      cameraOverlay.style.alignItems = "center";
      cameraOverlay.style.justifyContent = "center";
      cameraOverlay.style.background = "rgba(0,0,0,0.45)";
      cameraOverlay.style.color = "#fff";
      cameraOverlay.style.fontSize = "1rem";
      cameraOverlay.style.borderRadius = "6px";
      cameraOverlay.textContent = "Camera off";
      mediaContainer.appendChild(cameraOverlay);

      wrapper.appendChild(mediaContainer);

      const label = document.createElement("div");
      label.className = "label";
      label.textContent =
        (isLocal ? "You" : identityLabel) + (labelSuffix ? " · " + labelSuffix : "");
      label.style.position = "absolute";
      label.style.left = "8px";
      label.style.bottom = "8px";
      label.style.background = "rgba(0,0,0,0.5)";
      label.style.color = "#fff";
      label.style.padding = "4px 8px";
      label.style.borderRadius = "4px";
      label.style.fontSize = "0.8rem";
      wrapper.appendChild(label);

      const badge = document.createElement("div");
      badge.className = "state-badge";
      badge.style.position = "absolute";
      badge.style.right = "8px";
      badge.style.top = "8px";
      badge.style.background = "rgba(0,0,0,0.65)";
      badge.style.color = "#fff";
      badge.style.padding = "4px 8px";
      badge.style.borderRadius = "4px";
      badge.style.fontSize = "0.75rem";
      badge.style.display = "none";
      wrapper.appendChild(badge);

      wrapper._mediaEl = mediaEl;
      wrapper._cameraOverlay = cameraOverlay;
      wrapper._stateBadge = badge;
      wrapper._track = track;

      // click to expand
      wrapper.addEventListener("click", () => expandTrack(track));

      try {
        const mst = track && track.mediaStreamTrack ? track.mediaStreamTrack : null;
        if (mst) {
          mst.onmute = () => {
            if (track.kind === "audio") setBadgeTextOnWrapper(wrapper, "Muted");
            if (track.kind === "video") showCameraOffOnWrapper(wrapper, true);
          };
          mst.onunmute = () => {
            if (track.kind === "audio") setBadgeTextOnWrapper(wrapper, "");
            if (track.kind === "video") showCameraOffOnWrapper(wrapper, false);
          };
        }
      } catch (e) {
        // ignore
      }

      return wrapper;
    }

    function cleanupLocal() {
      try {
        if (localAudioTrack) {
          localAudioTrack.stop();
          localAudioTrack.detach().forEach((n) => n.remove());
          localAudioTrack = null;
        }
        if (localVideoTrack) {
          localVideoTrack.stop();
          localVideoTrack.detach().forEach((n) => n.remove());
          localVideoTrack = null;
        }
        if (screenTrack) {
          screenTrack.stop();
          screenTrack.detach().forEach((n) => n.remove());
          screenTrack = null;
        }
      } catch (e) {
        // ignore
      }
      clear(localTracksEl);
      clear(remoteTracksEl);
      participantThumbs.clear();
      closeOverlay();
    }

    async function unpublishScreenTrack() {
      try {
        if (publishedScreenPublication) {
          try {
            await room.localParticipant.unpublishTrack(publishedScreenPublication.track);
          } catch (_) {}
          try {
            publishedScreenPublication.track.stop && publishedScreenPublication.track.stop();
          } catch (_) {}
        } else if (screenTrack) {
          try {
            screenTrack.stop && screenTrack.stop();
          } catch (_) {}
        }
      } catch (e) {
        // ignore
      } finally {
        publishedScreenPublication = null;
        screenTrack = null;
      }
    }

    // 🔑 helper: remove wrapper for a specific participant+track (fix ghost tiles)
    function detachTrackWrapperForParticipant(participantIdentity, track) {
      const existing = participantThumbs.get(participantIdentity) || [];
      if (!existing.length) return;

      const remaining = [];
      existing.forEach((wrapper) => {
        if (wrapper._track === track) {
          try {
            wrapper.remove();
          } catch (_) {}
        } else {
          remaining.push(wrapper);
        }
      });

      if (remaining.length) {
        participantThumbs.set(participantIdentity, remaining);
      } else {
        participantThumbs.delete(participantIdentity);
      }
    }

    async function join(identityStr) {
      try {
        if (localNameEl) localNameEl.textContent = identityStr;
        if (joinBtn) {
          joinBtn.disabled = true;
          joinBtn.textContent = "Connecting…";
        }
        setStatus("Getting camera/mic…");

        const tracks = await createLocalTracks({ audio: true, video: { width: 640 } });

        tracks.forEach((t) => {
          if (t.kind === "audio") localAudioTrack = t;
          if (t.kind === "video") localVideoTrack = t;

          const thumb = createThumbForAttachedTrack(identityStr, t, true);
          if (localTracksEl) localTracksEl.appendChild(thumb);

          // start OFF by default
          if (t.kind === "video") {
            t.disable();
            showCameraOffOnWrapper(thumb, true);
            if (cameraBtn) cameraBtn.textContent = "Camera On";
          }
          if (t.kind === "audio") {
            t.disable();
            setBadgeTextOnWrapper(thumb, "Muted");
            if (muteBtn) muteBtn.textContent = "Unmute";
          }
        });

        setStatus("Connecting to room…");
        room = await connect(token, { name: roomName, tracks });

        setStatus("Connected");
        if (joinBtn) joinBtn.textContent = "Connected";
        if (leaveBtn) leaveBtn.disabled = false;
        if (muteBtn) muteBtn.disabled = false;
        if (cameraBtn) cameraBtn.disabled = false;
        if (shareBtn) {
          shareBtn.disabled = false;
          shareBtn.style.display = "inline-block";
        }
        if (stopShareBtn) {
          stopShareBtn.disabled = true;
          stopShareBtn.style.display = "none";
        }

        // existing participants
        room.participants.forEach((participant) => {
          participant.tracks.forEach((publication) => {
            if (publication.isSubscribed && publication.track) {
              const track = publication.track;
              const wrapper = createThumbForAttachedTrack(
                participant.identity,
                track,
                false
              );
              if (remoteTracksEl) remoteTracksEl.appendChild(wrapper);
              participantThumbs.set(participant.identity, [
                ...(participantThumbs.get(participant.identity) || []),
                wrapper,
              ]);

              try {
                track.on("disabled", () => showCameraOffOnWrapper(wrapper, true));
                track.on("enabled", () => showCameraOffOnWrapper(wrapper, false));
                track.on("stopped", () =>
                  detachTrackWrapperForParticipant(participant.identity, track)
                );
              } catch (_) {}
            }
          });

          participant.on("trackSubscribed", (track) => {
            const wrapper = createThumbForAttachedTrack(
              participant.identity,
              track,
              false
            );
            if (remoteTracksEl) remoteTracksEl.appendChild(wrapper);
            participantThumbs.set(participant.identity, [
              ...(participantThumbs.get(participant.identity) || []),
              wrapper,
            ]);

            try {
              track.on("disabled", () => showCameraOffOnWrapper(wrapper, true));
              track.on("enabled", () => showCameraOffOnWrapper(wrapper, false));
              track.on("stopped", () =>
                detachTrackWrapperForParticipant(participant.identity, track)
              );
            } catch (_) {}
          });

          // 🔑 if Twilio fires trackUnsubscribed, clean up wrapper
          participant.on("trackUnsubscribed", (track) => {
            detachTrackWrapperForParticipant(participant.identity, track);
          });
        });

        room.on("participantConnected", (participant) => {
          participant.on("trackSubscribed", (track) => {
            const wrapper = createThumbForAttachedTrack(
              participant.identity,
              track,
              false
            );
            if (remoteTracksEl) remoteTracksEl.appendChild(wrapper);
            participantThumbs.set(participant.identity, [
              ...(participantThumbs.get(participant.identity) || []),
              wrapper,
            ]);

            try {
              track.on("disabled", () => showCameraOffOnWrapper(wrapper, true));
              track.on("enabled", () => showCameraOffOnWrapper(wrapper, false));
              track.on("stopped", () =>
                detachTrackWrapperForParticipant(participant.identity, track)
              );
            } catch (_) {}
          });

          participant.on("trackUnsubscribed", (track) => {
            detachTrackWrapperForParticipant(participant.identity, track);
          });
        });

        room.on("participantDisconnected", (participant) => {
          const arr = participantThumbs.get(participant.identity) || [];
          arr.forEach((node) => {
            try {
              node.remove();
            } catch (_) {}
          });
          participantThumbs.delete(participant.identity);
        });

        room.on("disconnected", () => {
          try {
            unpublishScreenTrack();
          } catch (_) {}
          cleanupLocal();
          setStatus("Disconnected");
          if (joinBtn) {
            joinBtn.disabled = false;
            joinBtn.textContent = "Join Video";
          }
          if (leaveBtn) leaveBtn.disabled = true;
          if (muteBtn) muteBtn.disabled = true;
          if (cameraBtn) cameraBtn.disabled = true;
          if (shareBtn) {
            shareBtn.disabled = true;
          }
          if (stopShareBtn) {
            stopShareBtn.disabled = true;
            stopShareBtn.style.display = "none";
          }
          room = null;
        });
      } catch (err) {
        console.error("join error", err);
        setStatus("Error: " + (err.message || err));
        if (joinBtn) {
          joinBtn.disabled = false;
          joinBtn.textContent = "Join Video";
        }
      }
    }

    function handleMuteClick() {
      if (!localAudioTrack) return;
      if (localAudioTrack.isEnabled) {
        localAudioTrack.disable();
        if (muteBtn) muteBtn.textContent = "Unmute";
        setStatus("Muted");
        Array.from(localTracksEl?.children || []).forEach((w) => {
          try {
            if ((w._track && w._track.kind === "audio") || w.querySelector("audio")) {
              setBadgeTextOnWrapper(w, "Muted");
            }
          } catch (_) {}
        });
      } else {
        localAudioTrack.enable();
        if (muteBtn) muteBtn.textContent = "Mute";
        setStatus("Unmuted");
        Array.from(localTracksEl?.children || []).forEach((w) => {
          try {
            if ((w._track && w._track.kind === "audio") || w.querySelector("audio")) {
              setBadgeTextOnWrapper(w, "");
            }
          } catch (_) {}
        });
      }
    }

    function handleCameraClick() {
      if (!localVideoTrack) return;
      if (localVideoTrack.isEnabled) {
        localVideoTrack.disable();
        if (cameraBtn) cameraBtn.textContent = "Camera On";
        setStatus("Camera off");
        Array.from(localTracksEl?.children || []).forEach((w) => {
          try {
            if (w._track && w._track.kind === "video") {
              showCameraOffOnWrapper(w, true);
            }
          } catch (_) {}
        });
      } else {
        localVideoTrack.enable();
        if (cameraBtn) cameraBtn.textContent = "Camera Off";
        setStatus("Camera on");
        Array.from(localTracksEl?.children || []).forEach((w) => {
          try {
            if (w._track && w._track.kind === "video") {
              showCameraOffOnWrapper(w, false);
            }
          } catch (_) {}
        });
      }
    }

    async function handleShareClick() {
      if (!room) {
        alert("Join the room first");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const mediaTrack = stream.getTracks()[0];
        const localScreenTrack = new LocalVideoTrack(mediaTrack);
        const pub = await room.localParticipant.publishTrack(localScreenTrack);
        publishedScreenPublication = pub;
        screenTrack = localScreenTrack;

        const thumb = createThumbForAttachedTrack(
          localNameEl?.textContent || identity || "you",
          localScreenTrack,
          true,
          "Screen"
        );
        if (localTracksEl) localTracksEl.appendChild(thumb);

        setStatus("Screen sharing active");
        if (shareBtn) shareBtn.style.display = "none";
        if (stopShareBtn) {
          stopShareBtn.style.display = "inline-block";
          stopShareBtn.disabled = false;
        }

        mediaTrack.onended = async () => {
          try {
            await unpublishScreenTrack();
          } catch (_) {}
          try {
            thumb.remove();
          } catch (_) {}
          if (shareBtn) shareBtn.style.display = "inline-block";
          if (stopShareBtn) {
            stopShareBtn.style.display = "none";
            stopShareBtn.disabled = true;
          }
          setStatus("Screen sharing stopped");
        };
      } catch (err) {
        console.error("screen share error", err);
        setStatus("Screen share canceled or failed");
      }
    }

    async function handleStopShareClick() {
      try {
        await unpublishScreenTrack();
      } catch (e) {
        console.error("stop share err", e);
      }
      // Remove any local "Screen" tiles
      Array.from(localTracksEl?.children || []).forEach((w) => {
        try {
          if (w.textContent && w.textContent.includes("Screen")) {
            w.remove();
          }
        } catch (_) {}
      });
      if (shareBtn) shareBtn.style.display = "inline-block";
      if (stopShareBtn) {
        stopShareBtn.style.display = "none";
        stopShareBtn.disabled = true;
      }
      setStatus("Screen sharing stopped");
    }

    function handleLeaveClick() {
      if (room) {
        room.disconnect();
      }
      if (onLeave) onLeave();
    }

    // attach handlers
    if (muteBtn) muteBtn.addEventListener("click", handleMuteClick);
    if (cameraBtn) cameraBtn.addEventListener("click", handleCameraClick);
    if (leaveBtn) leaveBtn.addEventListener("click", handleLeaveClick);
    if (shareBtn) shareBtn.addEventListener("click", handleShareClick);
    if (stopShareBtn) stopShareBtn.addEventListener("click", handleStopShareClick);

    // initial button states
    if (joinBtn) {
      joinBtn.disabled = true;
      joinBtn.textContent = "Connecting…";
    }
    if (leaveBtn) leaveBtn.disabled = true;
    if (muteBtn) muteBtn.disabled = true;
    if (cameraBtn) cameraBtn.disabled = true;
    if (shareBtn) {
      shareBtn.disabled = true;
      shareBtn.style.display = "none";
    }
    if (stopShareBtn) {
      stopShareBtn.disabled = true;
      stopShareBtn.style.display = "none";
    }

    const idToUse = identity || "guest";
    join(idToUse);

    return () => {
      if (muteBtn) muteBtn.removeEventListener("click", handleMuteClick);
      if (cameraBtn) cameraBtn.removeEventListener("click", handleCameraClick);
      if (leaveBtn) leaveBtn.removeEventListener("click", handleLeaveClick);
      if (shareBtn) shareBtn.removeEventListener("click", handleShareClick);
      if (stopShareBtn) stopShareBtn.removeEventListener("click", handleStopShareClick);
      try {
        if (room) room.disconnect();
      } catch (_) {}
      cleanupLocal();
    };
  }, [token, roomName, identity, onLeave]);

  return (
    <div>
      <header style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Video Meeting</h3>
        <div style={{ fontSize: 12, color: "#4b5563" }}>
          Room: <strong>{roomName}</strong> | Session: <strong>{sessionId}</strong>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div
          style={{
            border: "1px solid #eee",
            background: "#fafafa",
            width: "48%",
            minHeight: 280,
            padding: 8,
            borderRadius: 6,
            boxSizing: "border-box",
          }}
        >
          <h4 style={{ marginTop: 0 }}>
            You: <span ref={localNameRef}>{identity}</span>
          </h4>
          <div ref={localTracksRef} />
        </div>

        <div
          style={{
            border: "1px solid #eee",
            background: "#fafafa",
            width: "48%",
            minHeight: 280,
            padding: 8,
            borderRadius: 6,
            boxSizing: "border-box",
          }}
        >
          <h4 style={{ marginTop: 0 }}>Other participants</h4>
          <div ref={remoteTracksRef} />
        </div>
      </div>

      <div
        className="controls"
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          ref={joinBtnRef}
          disabled
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Connecting…
        </button>
        <button
          ref={leaveBtnRef}
          disabled
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Leave
        </button>
        <button
          ref={muteBtnRef}
          disabled
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Mute
        </button>
        <button
          ref={cameraBtnRef}
          disabled
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Camera Off
        </button>
        <button
          ref={shareBtnRef}
          disabled
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc" }}
        >
          Share screen
        </button>
        <button
          ref={stopShareBtnRef}
          disabled
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            display: "none",
          }}
        >
          Stop sharing
        </button>

        <div id="status" style={{ marginLeft: 12, fontSize: 13 }}>
          Status: <span ref={statusTextRef}>Connecting…</span>
        </div>
      </div>

      {/* Fullscreen overlay like old video.html */}
      <div
        ref={overlayRef}
        style={{
          display: "none",
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          ref={overlayCloseRef}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "#fff",
            padding: "6px 8px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            color: "#000",
            fontWeight: "500",
          }}
        >
          Close
        </div>
        <div
          ref={overlayContentRef}
          style={{
            width: "90%",
            maxWidth: 1400,
            maxHeight: "90vh",
            borderRadius: 6,
            overflow: "hidden",
            background: "#000",
          }}
        />
      </div>
    </div>
  );
}