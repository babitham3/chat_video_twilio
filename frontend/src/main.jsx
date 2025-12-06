// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import CustomerWidget from "./components/CustomerWidget";
import AgentDashboard from "./components/AgentDashboard";
import "./index.css";


function Home() {
  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <h1>Acme Support</h1>
        <p>Welcome — click the chat button in the bottom-right to talk to support.</p>
      </header>

      <main style={{ padding: 20 }}>
        <p>Your marketing/home content goes here. The chat widget will float above this page.</p>
      </main>

      {/* Floating widget only on the home page */}
      <CustomerWidget apiBase="http://127.0.0.1:8000/api" startHidden={true} />
    </div>
  );
}

function AgentPage() {
  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <h1>Agent Portal</h1>
        <p>Single-agent mode — use this page for agent work.</p>
      </header>
      <main style={{ padding: 20 }}>
        <AgentDashboard apiBase="http://127.0.0.1:8000/api" />
      </main>
    </div>
  );
}


const pathname = (window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : "/";
const isAgentPath = pathname === "/agent" || pathname === "/agent/";
const Root = () => (isAgentPath ? <AgentPage /> : <Home />);

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);