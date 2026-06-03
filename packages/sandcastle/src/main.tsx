import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./SettingsProvider.tsx";
import { CopilotSettingsProvider, ModelProvider } from "./copilot";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <CopilotSettingsProvider>
        <ModelProvider>
          <App />
        </ModelProvider>
      </CopilotSettingsProvider>
    </SettingsProvider>
  </StrictMode>,
);
