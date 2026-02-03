import { useState, useEffect } from "react";
import { SettingsSidebar } from "./SettingsSidebar";
import { GeneralSettings } from "./GeneralSettings";
import { ModelSettings } from "./ModelSettings";
import { FeatureSettings } from "./FeatureSettings";
import { AdvancedSettings } from "./AdvancedSettings";
import "./SettingsPanel.css";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export type SettingsCategory = "general" | "models" | "features" | "advanced";

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeCategory, setActiveCategory] =
    useState<SettingsCategory>("general");

  // Handle Escape key to close
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">Settings</h2>
          <button
            className="settings-close-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-content">
          <SettingsSidebar
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <div className="settings-main">
            {activeCategory === "general" && <GeneralSettings />}
            {activeCategory === "models" && <ModelSettings />}
            {activeCategory === "features" && <FeatureSettings />}
            {activeCategory === "advanced" && <AdvancedSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
