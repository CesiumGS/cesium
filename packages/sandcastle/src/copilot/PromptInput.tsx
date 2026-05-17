import React, { useRef, useCallback, useEffect } from "react";
import { Button, IconButton } from "@stratakit/bricks";
import { send, stop } from "../icons";
import type { ImageAttachment } from "./ai/types";
import "./PromptInput.css";

// Allowlist raster formats all three providers accept. Excludes image/svg+xml —
// SVG is an XML document and can carry <script> or external-fetch vectors.
const SUPPORTED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  ariaLabel?: string;
  focusSignal?: string | null;
  attachments?: ImageAttachment[];
  onPasteImages?: (files: File[]) => void | Promise<void>;
  onRemoveAttachment?: (attachmentId: string) => void;
}

export const PromptInput = React.memo(function PromptInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a message...",
  disabled = false,
  isLoading = false,
  isStreaming = false,
  onStop,
  ariaLabel = "Message input",
  focusSignal,
  attachments = [],
  onPasteImages,
  onRemoveAttachment,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 || attachments.length > 0;

  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const minHeight = 44;
    const maxHeight = 250;

    if (!textarea.value.trim()) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = "hidden";
      return;
    }

    textarea.style.height = "0px";
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => autoResizeTextarea());
    return () => cancelAnimationFrame(id);
  }, [value, autoResizeTextarea]);

  useEffect(() => {
    if (!focusSignal) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea || textarea.disabled) {
      return;
    }

    textarea.focus();
    const cursorPosition = textarea.value.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  }, [focusSignal]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      requestAnimationFrame(() => autoResizeTextarea());
    },
    [onChange, autoResizeTextarea],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onPasteImages) {
        return;
      }

      const imageFiles = Array.from(e.clipboardData.items)
        .filter((item) => SUPPORTED_IMAGE_MIME_TYPES.has(item.type))
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);

      if (imageFiles.length === 0) {
        return;
      }

      e.preventDefault();
      void onPasteImages(imageFiles);
    },
    [onPasteImages],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // e.nativeEvent.isComposing is true while an IME composition session is
      // active (CJK input, dead keys). Hitting Enter to select a candidate
      // must not submit the partial message.
      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (canSubmit && !isLoading) {
          onSubmit();
        }
      }
    },
    [canSubmit, isLoading, onSubmit],
  );

  const handleSendClick = useCallback(() => {
    if (canSubmit && !isLoading) {
      onSubmit();
    }
  }, [canSubmit, isLoading, onSubmit]);

  return (
    <div className="prompt-input-container">
      <div className="prompt-input-editor">
        {attachments.length > 0 && (
          <div className="prompt-input-attachments">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="prompt-input-attachment">
                <img
                  src={`data:${attachment.mimeType};base64,${attachment.base64Data}`}
                  alt={attachment.name}
                  className="prompt-input-attachment-image"
                />
                <div className="prompt-input-attachment-meta">
                  <span className="prompt-input-attachment-name">
                    {attachment.name}
                  </span>
                  <span className="prompt-input-attachment-details">
                    {(attachment.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                {onRemoveAttachment && (
                  <Button
                    variant="ghost"
                    className="prompt-input-attachment-remove"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    disabled={disabled}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="prompt-input-textarea"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-multiline="true"
        />
      </div>
      {isStreaming && onStop ? (
        <IconButton label="Stop generating" icon={stop} onClick={onStop} />
      ) : (
        <IconButton
          label="Send message"
          icon={send}
          onClick={handleSendClick}
          disabled={!canSubmit || disabled || isLoading}
        />
      )}
    </div>
  );
});

PromptInput.displayName = "PromptInput";
