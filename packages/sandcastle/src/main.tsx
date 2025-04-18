import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./reset.css"; // TODO: this may not be needed with itwin-ui
import App from "./App.tsx";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
