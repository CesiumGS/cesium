import { Tabs } from "@stratakit/structures";
import { Text, IconButton } from "@stratakit/bricks";
import { close } from "../../icons";
import { GeneralSettings } from "./GeneralSettings";
import { ModelSettings } from "./ModelSettings";
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
      <Tabs.Root defaultSelectedId="general">
        <Tabs.TabList>
          <Tabs.Tab id="general">General</Tabs.Tab>
          <Tabs.Tab id="models">Models</Tabs.Tab>
          <Tabs.Tab id="features">Features</Tabs.Tab>
          <Tabs.Tab id="advanced">Advanced</Tabs.Tab>
        </Tabs.TabList>
        <Tabs.TabPanel tabId="general">
          <div className="settings-tab-content">
            <GeneralSettings />
          </div>
        </Tabs.TabPanel>
        <Tabs.TabPanel tabId="models">
          <div className="settings-tab-content">
            <ModelSettings />
          </div>
        </Tabs.TabPanel>
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
