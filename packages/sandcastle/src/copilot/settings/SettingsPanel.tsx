import { useEffect } from "react";
import { Text, IconButton } from "@stratakit/bricks";
import { dismiss } from "../../icons";
import { FeatureSettings } from "./FeatureSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import { trackEvent } from "../../analytics";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  // The panel only mounts while shown, so this fires once per open
  useEffect(() => {
    trackEvent("Copilot Settings Opened");
  }, []);

  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <Text variant="headline-sm">Settings</Text>
        <IconButton
          label="Close settings"
          icon={dismiss}
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <div className="settings-panel-content">
        <FeatureSettings />
        <AdvancedSettings />
      </div>
    </div>
  );
}
