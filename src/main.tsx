import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installDevtoolsBlocker } from "./lib/disableDevtools";
import "./styles/globals.css";

installDevtoolsBlocker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
