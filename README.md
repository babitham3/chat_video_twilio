# Chat + Video Escalation System (Django + React + Twilio)

This project is a **customer support chat system** with an integrated **video call escalation** feature.  
It demonstrates how a helpdesk platform can elevate a normal text chat into a live video meeting using **Twilio WebRTC**.

---

##  Features

### **Chat System**
- Customer chat widget.
- Agent dashboard with multiple simultaneous sessions.
- Real-time messaging using Django Channels (WebSockets).

### **Video Call Escalation**
- Agent sends a video call link inside chat.
- Customer clicks the link -> meeting opens.
- Agent auto-joins when customer enters the meeting.
- Allows camera/mic toggle, screen share using twilio tracks.

### **Meeting Analytics**
- Logs every event:
  - join/leave
  - mute/unmute
  - screen share start/stop
- Computes meeting analytics automatically.

### **Twilio Integration**
- Secure server-side video token generation.
- WebRTC handled entirely through Twilio Video SDK.


---

## Rough High Level Architecture

- Customer Chat Widget -> Django API -> Twilio Token Issuer -> Twilio Video Cloud
    | WebSocket | JWT
- Agent Dashboard <- Django  <- Meeting events <- Meeting page

## Setup Instructions

### **1. Backend Setup(Django)**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

python manage.py migrate
python manage.py runserver
```
- NOTE: If using daphne, instead of runserver , use: 
(Replace {chat_video} with the name of app in case you change it and {8000} with a port you want to run the server on)
```bash
daphne -b 127.0.0.1 -p 8000 chat_video.asgi:application
```
### **2.Frontend(React+Vite)**
```bash
cd frontend
npm install
npm run dev
```
### **Default URLS:**
```bash
Frontend: http://localhost:5173
Backend API : http://127.0.0.1:8000/api 
```
## Twilio Setup
- Create ``bash .env ``` in backend:
```bash
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_API_KEY_SID=SKxxxx
TWILIO_API_KEY_SECRET=xxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
```
- You can get your credentials by signing up on twilio.com and creating an API key.

## Future implementations
- Recording a meeting using twilio rest apis.
- Writing unit tests for backend server
- Multi-agent log in feature
- Creating an aesthetic UI