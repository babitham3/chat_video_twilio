import React from "react";
import ReactDOM from "react-dom/client";
import CustomerWidget from "./components/CustomerWidget";
import AgentDashboard from "./components/AgentDashboard";
import MeetingPage from "./components/MeetingPage";
import "./index.css";


function Home() {
  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <h1>Happyfox Support</h1>
        <p>Welcome — click the chat button in the bottom-right to talk to support.</p>
      </header>

      <main style={{ padding: 20 }}>
        <p>WELCOMEEE HEHE.</p>
      </main>

      <CustomerWidget apiBase="http://127.0.0.1:8000/api" startHidden={true} />
    </div>
  );
}

function AgentPage() {
  return (
    <div>
      <header style={{ padding: 20, borderBottom: "1px solid #eee" }}>
        <h1>Agent Portal</h1>
        <p>Single-agent mode</p>
      </header>
      <main style={{ padding: 20 }}>
        <AgentDashboard apiBase="http://127.0.0.1:8000/api" />
      </main>
    </div>
  );
}

function AppRouter(){
  const pathname=window.location.pathname.toLowerCase();

  if(pathname.startsWith("/meet/")){
    return <MeetingPage apiBase="http://127.0.0.1:8000/api"/>;
  }

  if(pathname==="/agent" || pathname==="/agent/"){
    return <AgentPage/>;
  }
  return <Home/>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<AppRouter/>);