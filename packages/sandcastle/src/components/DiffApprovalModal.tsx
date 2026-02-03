/**
 * DiffApprovalModal Component
 *
 * Modal dialog for approving or rejecting AI-proposed code changes
 * before they are applied to the editor.
 */

import React, { useEffect } from "react";
import type { DiffBlock } from "../AI/types";
import "./DiffApprovalModal.css";

export interface DiffApprovalModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** The diff to approve/reject */
  diff: DiffBlock | null;
  /** Which file is being modified */
  language: "javascript" | "html";
  /** Called when user approves the change */
  onApply: () => void;
  /** Called when user rejects the change */
  onReject: () => void;
  /** Whether to auto-apply all remaining diffs */
  autoApplyAll: boolean;
  /** Called when auto-apply checkbox changes */
  onAutoApplyChange: (value: boolean) => void;
}

export const DiffApprovalModal: React.FC<DiffApprovalModalProps> = ({
  isOpen,
  diff,
  language,
  onApply,
  onReject,
  autoApplyAll,
  onAutoApplyChange,
}) => {
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onApply();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onReject();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onApply, onReject]);

  // Defensive checks - ensure diff has valid search and replace content
  if (!isOpen || !diff || !diff.search || !diff.replace) {
    return null;
  }

  return (
    <div className="diff-approval-modal-overlay" onClick={onReject}>
      <div className="diff-approval-modal" onClick={(e) => e.stopPropagation()}>
        <div className="diff-approval-header">
          <h3>Approve Code Change</h3>
          <span className="diff-approval-file-badge">
            {language === "javascript" ? "JS" : "HTML"}
          </span>
        </div>

        <div className="diff-approval-content">
          {/* Search Pattern */}
          <div className="diff-section">
            <div className="diff-section-header">
              <span className="diff-section-label">Search (Code to Find)</span>
              <span className="diff-section-lines">
                {diff.search.split("\n").length} lines
              </span>
            </div>
            <pre className="diff-code-block diff-search">
              <code>{diff.search}</code>
            </pre>
          </div>

          {/* Replacement */}
          <div className="diff-section">
            <div className="diff-section-header">
              <span className="diff-section-label">Replace (New Code)</span>
              <span className="diff-section-lines">
                {diff.replace.split("\n").length} lines
              </span>
            </div>
            <pre className="diff-code-block diff-replace">
              <code>{diff.replace}</code>
            </pre>
          </div>
        </div>

        <div className="diff-approval-footer">
          <label className="diff-auto-apply-checkbox">
            <input
              type="checkbox"
              checked={autoApplyAll}
              onChange={(e) => onAutoApplyChange(e.target.checked)}
            />
            <span>Auto-apply remaining changes</span>
          </label>

          <div className="diff-approval-actions">
            <button
              className="diff-approval-button diff-approval-reject"
              onClick={onReject}
            >
              Reject
            </button>
            <button
              className="diff-approval-button diff-approval-apply"
              onClick={onApply}
            >
              Apply
            </button>
          </div>
        </div>

        <div className="diff-approval-hints">
          <kbd>Enter</kbd> to apply • <kbd>Esc</kbd> to reject
        </div>
      </div>
    </div>
  );
};
