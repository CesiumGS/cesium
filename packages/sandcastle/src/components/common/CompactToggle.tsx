import React from "react";
import "./CompactToggle.css";

// Icon component props interface (for libraries like lucide-react)
interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
}

export interface CompactToggleProps {
  /** SVG icon path, emoji character, or React component to display */
  icon: string | React.ComponentType<IconProps>;
  /** Label text for tooltip and aria-label */
  label: string;
  /** Whether the toggle is enabled */
  enabled: boolean;
  /** Callback when toggle state changes */
  onChange: (enabled: boolean) => void;
  /** Optional tooltip text (uses label if not provided) */
  tooltip?: string;
  /** Optional disabled state */
  disabled?: boolean;
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * Compact icon-only toggle button component for professional UI
 *
 * Features:
 * - Icon-only design (32px x 32px)
 * - Purple gradient when active
 * - Tooltip on hover for context
 * - Accessible with ARIA attributes
 * - Keyboard navigation support
 *
 * @example
 * ```tsx
 * <CompactToggle
 *   icon={aiSparkle}
 *   label="Extended Thinking"
 *   enabled={settings.extendedThinking.enabled}
 *   onChange={(enabled) => updateSettings({ extendedThinking: { ...settings.extendedThinking, enabled } })}
 *   tooltip={`Enable AI reasoning before responses (budget: ${settings.extendedThinking.budget} tokens)`}
 * />
 * ```
 */
// Helper function to detect if string is an emoji
const isEmoji = (str: string): boolean => {
  const emojiRegex = /^(\p{Emoji}|\p{Emoji_Component})+$/u;
  return emojiRegex.test(str);
};

export const CompactToggle: React.FC<CompactToggleProps> = ({
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      onChange(!enabled);
    }
  };

  const renderIcon = () => {
    // If icon is a string, check if it's an emoji or SVG path
    if (typeof icon === "string") {
      // If icon is an emoji string
      if (isEmoji(icon)) {
        return (
          <span className="compact-toggle-emoji" aria-hidden="true">
            {icon}
          </span>
        );
      }
      // If icon is an SVG path string
      return (
        <img
          src={icon}
          alt=""
          className="compact-toggle-icon"
          aria-hidden="true"
        />
      );
    }

    // If icon is a React component (like lucide-react icons)
    const IconComponent = icon as React.ComponentType<IconProps>;
    return (
      <IconComponent
        className="compact-toggle-icon"
        aria-hidden="true"
        size={18}
        strokeWidth={1.5}
      />
    );
  };

  return (
    <button
      className={`compact-toggle ${enabled ? "compact-toggle-active" : ""} ${disabled ? "compact-toggle-disabled" : ""}`}
      title={tooltip || label}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel || label}
      disabled={disabled}
      type="button"
    >
      {renderIcon()}
    </button>
  );
};
