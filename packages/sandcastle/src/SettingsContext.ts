import { createContext } from "react";

export type Settings = {
  theme: "dark" | "light";
  fontSize: "large" | "small";
};

export const initialSettings: Settings = {
  theme: "dark",
  fontSize: "large",
};

export const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}>({
  settings: initialSettings,
  updateSettings: () => {},
});
