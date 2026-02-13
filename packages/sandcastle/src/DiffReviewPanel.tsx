/**
 * DiffReviewPanel - Dedicated panel for reviewing and applying AI-generated diffs
 * Displays above the Monaco editor for better visibility
 */

import { Button, Text } from "@stratakit/bricks";
import { Icon } from "@stratakit/foundations";
import type { DiffBlock } from "./AI/types";
import { useState } from "react";
import "./DiffReviewPanel.css";

export interface DiffReviewItem {
  id: string;
  diff: DiffBlock;
  language: "javascript" | "html";
  originalCode: string;
  modifiedCode: string;
  messageId: string;
}

interface DiffReviewPanelProps {
  diffs: DiffReviewItem[];
  onAccept: (diffId: string) => void;
  onReject: (diffId: string) => void;
  onClose: () => void;
}

export function DiffReviewPanel({
  diffs,
  onAccept,
  onReject,
  onClose,
}: DiffReviewPanelProps) {
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(
    new Set(diffs.map((d) => d.id)),
  );
  const [applyingDiffs, setApplyingDiffs] = useState<Set<string>>(new Set());

  if (diffs.length === 0) {
    return null;
  }

  const toggleExpanded = (diffId: string) => {
    const newExpanded = new Set(expandedDiffs);
    if (newExpanded.has(diffId)) {
      newExpanded.delete(diffId);
    } else {
      newExpanded.add(diffId);
    }
    setExpandedDiffs(newExpanded);
  };

  const handleAccept = async (diffId: string) => {
    setApplyingDiffs(new Set(applyingDiffs).add(diffId));
    try {
      await onAccept(diffId);
    } finally {
      setApplyingDiffs((prev) => {
        const next = new Set(prev);
        next.delete(diffId);
        return next;
      });
    }
  };

  return (
    <div className="diff-review-panel">
      <div className="diff-review-header">
        <div className="diff-review-title">
          <Icon name="sparkles" />
          <Text variant="body-md">AI Suggested Changes ({diffs.length})</Text>
        </div>
        <div className="diff-review-header-actions">
          <Button
            variant="ghost"
            onClick={onClose}
            aria-label="Close diff review panel"
          >
            <Icon name="x" />
          </Button>
        </div>
      </div>

      <div className="diff-review-content">
        {diffs.map((item, index) => {
          const isExpanded = expandedDiffs.has(item.id);
          const isApplying = applyingDiffs.has(item.id);
          const searchLines = item.diff.search.split("\n");
          const replaceLines = item.diff.replace.split("\n");

          return (
            <div key={item.id} className="diff-review-item">
              <div
                className="diff-review-item-header"
                onClick={() => toggleExpanded(item.id)}
              >
                <Icon name={isExpanded ? "chevron-down" : "chevron-right"} />
                <span className="diff-review-item-title">
                  Change #{index + 1} ({item.language})
                </span>
                <div className="diff-review-item-stats">
                  <span className="stat-removed">-{searchLines.length}</span>
                  <span className="stat-added">+{replaceLines.length}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="diff-review-item-content">
                  {/* Show removed lines */}
                  {searchLines.length > 0 && (
                    <div className="diff-section diff-section-removed">
                      <div className="diff-section-label">Removed:</div>
                      <div className="diff-section-lines">
                        {searchLines.map((line, idx) => (
                          <div key={`rem-${idx}`} className="diff-line">
                            <span className="diff-line-marker">-</span>
                            <span className="diff-line-content">
                              {line || " "}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show added lines */}
                  {replaceLines.length > 0 && (
                    <div className="diff-section diff-section-added">
                      <div className="diff-section-label">Added:</div>
                      <div className="diff-section-lines">
                        {replaceLines.map((line, idx) => (
                          <div key={`add-${idx}`} className="diff-line">
                            <span className="diff-line-marker">+</span>
                            <span className="diff-line-content">
                              {line || " "}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="diff-review-item-actions">
                    <Button
                      tone="accent"
                      onClick={() => handleAccept(item.id)}
                      disabled={isApplying}
                    >
                      {isApplying ? "Applying..." : "Accept Changes"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onReject(item.id)}
                      disabled={isApplying}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
