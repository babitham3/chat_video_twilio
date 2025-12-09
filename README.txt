# Chat + Video Escalation System (Django + React + Twilio)

This project is a **customer support chat system** with an integrated **video call escalation** feature.  
It demonstrates how a helpdesk platform can elevate a normal text chat into a live video meeting using **Twilio WebRTC**.

---

##  Features

### **Chat System**
- Customer chat widget.
- Agent dashboard with multiple simultaneous sessions.
- Real-time messaging using Django Channels (WebSockets).
- Online presence indicators.

### **Video Call Escalation**
- Agent sends a video call link inside chat.
- Customer clicks the link → meeting opens.
- Agent auto-joins when customer enters the meeting.
- Local + remote media tiles with name badges.
- Camera/mic toggle.
- Screen sharing + expand mode.
- Handles camera-off states cleanly.

### ** Meeting Analytics**
- Logs every event:
  - join/leave
  - mute/unmute
  - screen share start/stop
- Computes meeting duration automatically.
- Detailed analytics pages:

### ** Twilio Integration**
- Secure server-side video token generation.
- WebRTC handled entirely through Twilio Video SDK.
- Supports echo-free media routing.

---

## 🏗 System Architecture (High Level)