import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SettingsProvider } from "./SettingsProvider.tsx";
import AppStandalone from "./AppStandalone.tsx";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <AppStandalone />
    </SettingsProvider>
  </StrictMode>,
);
