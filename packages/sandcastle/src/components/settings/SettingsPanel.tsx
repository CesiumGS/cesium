import { Tabs } from "@stratakit/structures";
import { Text, IconButton } from "@stratakit/bricks";
import { close } from "../../icons";
import { FeatureSettings } from "./FeatureSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-header">
        <Text variant="headline-sm">Settings</Text>
        <IconButton
          label="Close settings"
          icon={close}
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <Tabs.Root defaultSelectedId="features">
        <Tabs.TabList>
          <Tabs.Tab id="features">Features</Tabs.Tab>
          <Tabs.Tab id="advanced">Advanced</Tabs.Tab>
        </Tabs.TabList>
        <Tabs.TabPanel tabId="features">
          <div className="settings-tab-content">
            <FeatureSettings />
          </div>
        </Tabs.TabPanel>
        <Tabs.TabPanel tabId="advanced">
          <div className="settings-tab-content">
            <AdvancedSettings />
          </div>
        </Tabs.TabPanel>
      </Tabs.Root>
    </div>
  );
}
