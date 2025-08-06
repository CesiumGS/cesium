import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";

const host = window.location.host;
if (host.includes("localhost")) {
  document.title = `${host.replace("localhost:", "")} ${document.title}`;
} else if (host.includes("ci")) {
  document.title = `CI ${document.title}`;
}

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
