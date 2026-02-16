import React, { useRef, useCallback, useEffect } from "react";
import { IconButton } from "@stratakit/bricks";
import { send } from "../../icons";
import "./PromptInput.css";

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  ariaLabel?: string;
}

export const PromptInput: React.FC<PromptInputProps> = React.memo(
  ({
    value,
    onChange,
    onSubmit,
    placeholder = "Type a message...",
    disabled = false,
    isLoading = false,
    ariaLabel = "Message input",
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        requestAnimationFrame(() => autoResizeTextarea());
      },
      [onChange, autoResizeTextarea],
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (value.trim() && !isLoading) {
            onSubmit();
            if (textareaRef.current) {
              textareaRef.current.style.height = "44px";
              textareaRef.current.style.overflowY = "hidden";
            }
          }
        }
      },
      [value, isLoading, onSubmit],
    );

    const handleSendClick = useCallback(() => {
      if (value.trim() && !isLoading) {
        onSubmit();
        if (textareaRef.current) {
          textareaRef.current.style.height = "44px";
          textareaRef.current.style.overflowY = "hidden";
        }
      }
    }, [value, isLoading, onSubmit]);

    return (
      <div className="prompt-input-container">
        <textarea
          ref={textareaRef}
          className="prompt-input-textarea"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-multiline="true"
        />
        <IconButton
          label="Send message"
          icon={send}
          onClick={handleSendClick}
          disabled={!value.trim() || disabled || isLoading}
        />
      </div>
    );
  },
);

PromptInput.displayName = "PromptInput";
