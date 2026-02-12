import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./SettingsProvider.tsx";
import { ModelProvider } from "./contexts/ModelContext.tsx";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <ModelProvider>
        <App />
      </ModelProvider>
    </SettingsProvider>
  </StrictMode>,
);
