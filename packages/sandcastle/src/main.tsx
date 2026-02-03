import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./SettingsProvider.tsx";
import { ModelProvider } from "./contexts/ModelContext.tsx";

// Note: Monaco DiffEditor disposal errors are a known harmless issue in @monaco-editor/react v4.7.0
// These errors occur due to a cleanup race condition but don't affect functionality
// The errors are logged by Monaco's internal error handler and cannot be easily suppressed

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <ModelProvider>
        <App />
      </ModelProvider>
    </SettingsProvider>
  </StrictMode>,
);
