import { Root } from "@stratakit/mui";
import { ReactNode, useContext } from "react";
import { SettingsContext } from "./SettingsContext";

export function MuiRoot({ children }: { children: ReactNode }) {
  const { settings } = useContext(SettingsContext);
  return <Root colorScheme={settings.theme}>{children}</Root>;
}
