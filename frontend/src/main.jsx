import React from "react";
import ReactDOM from "react-dom/client";
import CustomerWidget from "./components/CustomerWidget";
import './index.css';


const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <CustomerWidget apiBase="http://127.0.0.1:8000/api" />
  </React.StrictMode>
);
