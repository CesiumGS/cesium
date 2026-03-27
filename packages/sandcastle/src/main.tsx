import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SettingsProvider } from "./SettingsProvider.tsx";
import { UserProvider } from "./User/UserProvider.tsx";

createRoot(document.getElementById("app-container")!).render(
  <StrictMode>
    <SettingsProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </SettingsProvider>
  </StrictMode>,
);
