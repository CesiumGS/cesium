/**
 * InlineChangeWidget - Monaco editor widget for showing inline change reviews
 * Displays a floating overlay above changed code with Undo/Keep actions
 */

import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import type { InlineChange } from "./AI/types";
import "./InlineChangeWidget.css";

interface InlineChangeWidgetProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  changes: InlineChange[];
  currentChangeIndex: number;
  onNavigate: (newIndex: number) => void;
  onAccept: (changeId: string) => void;
  onReject: (changeId: string) => void;
}

export function InlineChangeWidget({
  editor,
  changes,
  currentChangeIndex,
  onNavigate,
  onAccept,
  onReject,
}: InlineChangeWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const contentWidgetRef = useRef<monaco.editor.IContentWidget | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time periodically for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!editor || changes.length === 0 || !widgetRef.current) {
      // Clean up any existing widget
      if (contentWidgetRef.current) {
        editor?.removeContentWidget(contentWidgetRef.current);
        contentWidgetRef.current = null;
      }
      return;
    }

    const currentChange = changes[currentChangeIndex];
    if (!currentChange) {
      return;
    }

    // Create or update the content widget
    const widget: monaco.editor.IContentWidget = {
      getId: () => "inline-change-widget",
      getDomNode: () => widgetRef.current!,
      getPosition: () => ({
        position: {
          lineNumber: currentChange.startLine,
          column: 1,
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
          monaco.editor.ContentWidgetPositionPreference.BELOW,
        ],
      }),
    };

    // Remove old widget if it exists
    if (contentWidgetRef.current) {
      editor.removeContentWidget(contentWidgetRef.current);
    }

    // Add the new widget
    editor.addContentWidget(widget);
    contentWidgetRef.current = widget;

    // Scroll to the change
    editor.revealLineInCenter(currentChange.startLine);

    return () => {
      if (contentWidgetRef.current) {
        editor.removeContentWidget(contentWidgetRef.current);
        contentWidgetRef.current = null;
      }
    };
  }, [editor, changes, currentChangeIndex]);

  if (changes.length === 0) {
    return null;
  }

  const currentChange = changes[currentChangeIndex];
  if (!currentChange) {
    return null;
  }

  const handlePrevious = () => {
    if (currentChangeIndex > 0) {
      onNavigate(currentChangeIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentChangeIndex < changes.length - 1) {
      onNavigate(currentChangeIndex + 1);
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = currentTime - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return "just now";
    }
    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  return (
    <div ref={widgetRef} className="inline-change-widget">
      <div className="inline-change-widget-info">
        <span className="inline-change-widget-author">
          {currentChange.source || "Copilot"}
        </span>
        <span className="inline-change-widget-time">
          {formatTime(currentChange.timestamp)}
        </span>
      </div>

      {changes.length > 1 && (
        <div className="inline-change-widget-navigation">
          <button
            className="inline-change-widget-nav-button"
            onClick={handlePrevious}
            disabled={currentChangeIndex === 0}
            title="Previous change"
          >
            ◀
          </button>
          <span>
            {currentChangeIndex + 1} of {changes.length}
          </span>
          <button
            className="inline-change-widget-nav-button"
            onClick={handleNext}
            disabled={currentChangeIndex === changes.length - 1}
            title="Next change"
          >
            ▶
          </button>
        </div>
      )}

      <div className="inline-change-widget-actions">
        <button
          className="inline-change-widget-button"
          onClick={() => onReject(currentChange.id)}
          title="Undo this change (⌘N)"
        >
          Undo
          <span className="inline-change-widget-kbd">⌘N</span>
        </button>
        <button
          className="inline-change-widget-button primary"
          onClick={() => onAccept(currentChange.id)}
          title="Keep this change (⌘Y)"
        >
          Keep
          <span className="inline-change-widget-kbd">⌘Y</span>
        </button>
      </div>
    </div>
  );
}
