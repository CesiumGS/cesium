/**
 * GuidancePrompt - Inline escalation UI component
 *
 * Displayed when the AI has encountered errors multiple times (3-strike threshold)
 * and needs user guidance to proceed. Shows inline in the chat panel with:
 * - Clear explanation of the situation
 * - Textarea for user to provide guidance
 * - Submit and Skip buttons
 */

import { useState } from "react";
import { Button, Text } from "@stratakit/bricks";
import "./GuidancePrompt.css";

export interface GuidancePromptProps {
  /** Number of consecutive failures that triggered escalation */
  consecutiveFailures: number;
  /** Callback when user submits guidance */
  onSubmitGuidance: (guidance: string) => void;
  /** Callback when user chooses to skip (stop iteration) */
  onSkip: () => void;
  /** Whether the submit button is disabled (e.g., during processing) */
  isSubmitting?: boolean;
}

/**
 * GuidancePrompt Component
 *
 * Inline prompt that appears in the chat when AI needs user help
 */
export function GuidancePrompt({
  consecutiveFailures,
  onSubmitGuidance,
  onSkip,
  isSubmitting = false,
}: GuidancePromptProps) {
  const [guidance, setGuidance] = useState("");

  const handleSubmit = () => {
    if (guidance.trim()) {
      onSubmitGuidance(guidance.trim());
      setGuidance(""); // Clear after submission
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="guidance-prompt" role="alert" aria-live="polite">
      <div className="guidance-prompt-header">
        <span className="guidance-prompt-icon">⚠️</span>
        <Text
          variant="body-md"
          style={{ fontWeight: 600, fontSize: "0.95rem" }}
        >
          Need Your Help
        </Text>
      </div>

      <div className="guidance-prompt-body">
        <Text
          variant="body-md"
          style={{ fontSize: "0.9rem", marginBottom: "0.75rem" }}
        >
          I've encountered errors {consecutiveFailures} time
          {consecutiveFailures === 1 ? "" : "s"} in a row. Could you provide
          additional guidance or clarification?
        </Text>

        <textarea
          className="guidance-prompt-textarea"
          placeholder="Provide context, clarify requirements, or suggest a different approach..."
          value={guidance}
          onChange={(e) => setGuidance(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          disabled={isSubmitting}
          autoFocus
          aria-label="User guidance input"
        />

        <div className="guidance-prompt-actions">
          <Button
            onClick={handleSubmit}
            tone="accent"
            disabled={!guidance.trim() || isSubmitting}
            aria-label="Submit guidance"
          >
            {isSubmitting ? "Submitting..." : "Submit Guidance"}
          </Button>
          <Button
            onClick={onSkip}
            variant="ghost"
            disabled={isSubmitting}
            aria-label="Skip and stop iteration"
          >
            Skip (Stop Iteration)
          </Button>
        </div>

        <Text
          variant="caption-md"
          style={{
            fontSize: "0.8rem",
            color: "var(--stratakit-color-text-muted, #999)",
            marginTop: "0.5rem",
          }}
        >
          Tip: Press ⌘/Ctrl + Enter to submit
        </Text>
      </div>
    </div>
  );
}
