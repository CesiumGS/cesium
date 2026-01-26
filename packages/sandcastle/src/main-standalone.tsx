import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppStandalone from "./AppStandalone.tsx";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <AppStandalone />
  </StrictMode>,
);
