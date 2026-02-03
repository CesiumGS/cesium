import React from "react";
import "./Toggle.css";

export interface ToggleProps {
  /** Icon or emoji to display before label */
  icon?: string;
  /** Label text to display */
  label: string;
  /** Whether the toggle is enabled */
  enabled: boolean;
  /** Callback when toggle state changes */
  onChange: (enabled: boolean) => void;
  /** Optional tooltip text */
  tooltip?: string;
  /** Optional disabled state */
  disabled?: boolean;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * Reusable iOS-style toggle switch component
 *
 * Features:
 * - Smooth animations with cubic-bezier easing
 * - Purple gradient when enabled (#8b5cf6 to #6366f1)
 * - Accessible with ARIA attributes
 * - Supports reduced motion preferences
 *
 * @example
 * ```tsx
 * <Toggle
 *   icon="🧠"
 *   label="Extended Thinking"
 *   enabled={settings.extendedThinking.enabled}
 *   onChange={(enabled) => updateSettings({ extendedThinking: { ...settings.extendedThinking, enabled } })}
 *   tooltip="Enable AI reasoning before responses"
 * />
 * ```
 */
export const Toggle: React.FC<ToggleProps> = ({
  icon,
  label,
  enabled,
  onChange,
  tooltip,
  disabled = false,
  ariaLabel,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onChange(!enabled);
    }
  };

  return (
    <div
      className={`toggle-control ${disabled ? "toggle-disabled" : ""}`}
      title={tooltip}
      onClick={handleClick}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel || label}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        pointerEvents: "auto",
      }}
    >
      <span className="toggle-label">
        {icon && <span className="toggle-icon">{icon}</span>}
        {label}
      </span>
      <div className={`modern-toggle ${enabled ? "toggle-on" : "toggle-off"}`}>
        <span className="toggle-track">
          <span className="toggle-thumb" />
        </span>
      </div>
    </div>
  );
};
