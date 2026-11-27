import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./SettingsProvider.tsx";
import { CopilotSettingsProvider, ModelProvider } from "./copilot";
import { initAnalytics } from "./analytics";
import { UserProvider } from "./User/UserProvider.tsx";

initAnalytics();

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <CopilotSettingsProvider>
        <ModelProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </ModelProvider>
      </CopilotSettingsProvider>
    </SettingsProvider>
  </StrictMode>,
);
