import React, { useRef, useCallback, useEffect } from "react";
import { Button } from "@stratakit/bricks";
import { Send, Image as ImageIcon, X } from "lucide-react";
import "./PromptInput.css";

export interface ImagePreview {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
}

export interface PromptInputProps {
  /** Current input value */
  value: string;
  /** Callback when input value changes */
  onChange: (value: string) => void;
  /** Callback when user submits (Enter key or Send button) */
  onSubmit: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Optional aria-label */
  ariaLabel?: string;
  /** Image previews */
  imagePreviews?: ImagePreview[];
  /** Callback when images are selected */
  onImagesSelected?: (files: File[]) => void;
  /** Callback when an image is removed */
  onImageRemoved?: (id: string) => void;
  /** Maximum file size in MB */
  maxFileSizeMB?: number;
  /** Maximum number of images */
  maxImages?: number;
}

/**
 * Auto-growing textarea input component with integrated Send button
 *
 * Features:
 * - Auto-grows from 1-10 lines (44px - 250px)
 * - Enter to send, Shift+Enter for new line
 * - Keyboard accessible with ARIA labels
 * - Integrated Send button
 * - Memoized to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * <PromptInput
 *   value={input}
 *   onChange={setInput}
 *   onSubmit={handleSendMessage}
 *   placeholder="Ask me anything about Cesium"
 *   disabled={!hasApiKey || isLoading}
 * />
 * ```
 */
export const PromptInput: React.FC<PromptInputProps> = React.memo(
  ({
    value,
    onChange,
    onSubmit,
    placeholder = "Type a message...",
    disabled = false,
    isLoading = false,
    ariaLabel = "Message input",
    imagePreviews = [],
    onImagesSelected,
    onImageRemoved,
    maxFileSizeMB = 3.75, // Max image size
    maxImages = 20, // Max images per request
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /**
     * Auto-resize textarea based on content
     * Grows between minHeight (44px) and maxHeight (250px, ~10 lines)
     */
    const autoResizeTextarea = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }

      const minHeight = 44;
      const maxHeight = 250; // ~10 lines max

      // If textarea is empty, set to min height immediately
      if (!textarea.value.trim()) {
        textarea.style.height = `${minHeight}px`;
        textarea.style.overflowY = "hidden";
        return;
      }

      // Reset height to 0 to get accurate scrollHeight measurement
      // This is more reliable than 'auto' or setting to minHeight
      textarea.style.height = "0px";

      // Get the actual content height
      const scrollHeight = textarea.scrollHeight;

      // Set height between min and max
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;

      // Show scrollbar only if content exceeds max height
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }, []);

    /**
     * Trigger auto-resize when value changes (handles programmatic updates)
     */
    useEffect(() => {
      requestAnimationFrame(() => autoResizeTextarea());
    }, [value, autoResizeTextarea]);

    /**
     * Handle input change events
     */
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
        // Auto-resize as user types
        requestAnimationFrame(() => autoResizeTextarea());
      },
      [onChange, autoResizeTextarea],
    );

    /**
     * Handle keyboard events
     * - Enter: Submit (unless Shift is held)
     * - Shift+Enter: New line
     */
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          // Check for content - let parent handle disabled/API key validation
          if (value.trim() && !isLoading) {
            onSubmit();
            // Reset textarea to initial state after sending
            if (textareaRef.current) {
              textareaRef.current.style.height = "44px";
              textareaRef.current.style.overflowY = "hidden";
            }
          }
        }
      },
      [value, isLoading, onSubmit],
    );

    /**
     * Handle Send button click
     * Note: We check `disabled` prop for DOM disabled attribute, but we let the parent
     * component (ChatPanel.sendMessageWithContent) handle all business logic validation
     * including API key checks. This allows proper error handling and messaging.
     */
    const handleSendClick = useCallback(() => {
      // Get current textarea value from DOM in case it was programmatically set
      const textareaValue = textareaRef.current?.value?.trim() || value.trim();

      if ((textareaValue || imagePreviews.length > 0) && !isLoading) {
        // Call onSubmit regardless of disabled prop - parent handles validation
        onSubmit();
        // Reset textarea to initial state after sending
        if (textareaRef.current) {
          textareaRef.current.style.height = "44px";
          textareaRef.current.style.overflowY = "hidden";
        }
      }
    }, [value, isLoading, onSubmit, imagePreviews.length]);

    /**
     * Handle file input change
     */
    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (files.length === 0) {
          return;
        }

        // Check if adding these files would exceed the max
        if (imagePreviews.length + files.length > maxImages) {
          // TODO: Replace console.warn with proper toast/notification UI component
          console.warn(
            `You can only upload up to ${maxImages} images at a time.`,
          );
          return;
        }

        // Filter valid image files
        const validFiles = files.filter((file) => {
          // Check file type
          if (!file.type.startsWith("image/")) {
            // TODO: Replace console.warn with proper toast/notification UI component
            console.warn(`${file.name} is not an image file.`);
            return false;
          }

          // Check file size
          const maxBytes = maxFileSizeMB * 1024 * 1024;
          if (file.size > maxBytes) {
            // TODO: Replace console.warn with proper toast/notification UI component
            console.warn(
              `${file.name} is too large. Maximum size is ${maxFileSizeMB}MB.`,
            );
            return false;
          }

          return true;
        });

        if (validFiles.length > 0 && onImagesSelected) {
          onImagesSelected(validFiles);
        }

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      [imagePreviews.length, maxImages, maxFileSizeMB, onImagesSelected],
    );

    /**
     * Handle image upload button click
     */
    const handleImageButtonClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    /**
     * Handle removing an image
     */
    const handleRemoveImage = useCallback(
      (id: string) => {
        if (onImageRemoved) {
          onImageRemoved(id);
        }
      },
      [onImageRemoved],
    );

    /**
     * Handle paste events - allows pasting images from clipboard
     */
    const handlePaste = useCallback(
      async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        // Only process if we have image selection handler
        if (!onImagesSelected) {
          return;
        }

        const items = e.clipboardData?.items;
        if (!items) {
          return;
        }

        const imageFiles: File[] = [];

        // Extract image files from clipboard
        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Check if the item is an image
          if (item.type.startsWith("image/")) {
            e.preventDefault(); // Prevent default paste behavior for images

            const file = item.getAsFile();
            if (file) {
              imageFiles.push(file);
            }
          }
        }

        // Process pasted images
        if (imageFiles.length > 0) {
          // Check if adding these files would exceed the max
          if (imagePreviews.length + imageFiles.length > maxImages) {
            // TODO: Replace console.warn with proper toast/notification UI component
            console.warn(
              `You can only upload up to ${maxImages} images at a time.`,
            );
            return;
          }

          // Filter valid image files
          const validFiles = imageFiles.filter((file) => {
            // Check file size
            const maxBytes = maxFileSizeMB * 1024 * 1024;
            if (file.size > maxBytes) {
              // TODO: Replace console.warn with proper toast/notification UI component
              console.warn(
                `Pasted image is too large. Maximum size is ${maxFileSizeMB}MB.`,
              );
              return false;
            }
            return true;
          });

          if (validFiles.length > 0) {
            onImagesSelected(validFiles);
          }
        }
      },
      [onImagesSelected, imagePreviews.length, maxImages, maxFileSizeMB],
    );

    return (
      <div className="prompt-input-wrapper">
        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="prompt-input-image-previews">
            {imagePreviews.map((preview) => (
              <div key={preview.id} className="prompt-input-image-preview">
                <img src={preview.dataUrl} alt={preview.name} />
                <button
                  className="prompt-input-image-remove"
                  onClick={() => handleRemoveImage(preview.id)}
                  aria-label={`Remove ${preview.name}`}
                  type="button"
                >
                  <X size={14} />
                </button>
                <div className="prompt-input-image-name">{preview.name}</div>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="prompt-input-container">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: "none" }}
            aria-label="Select images"
          />

          {/* Image Upload Button */}
          {onImagesSelected && (
            <Button
              variant="ghost"
              onClick={handleImageButtonClick}
              disabled={
                disabled || isLoading || imagePreviews.length >= maxImages
              }
              aria-label="Add images"
              className="prompt-input-image-button"
              title={
                imagePreviews.length >= maxImages
                  ? `Maximum ${maxImages} images reached`
                  : "Add images"
              }
            >
              <ImageIcon size={20} />
            </Button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="prompt-input-textarea chat-input"
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

          {/* Send Button */}
          <Button
            variant="solid"
            onClick={handleSendClick}
            disabled={
              (!value.trim() && imagePreviews.length === 0) ||
              disabled ||
              isLoading
            }
            aria-label="Send message"
            className="prompt-input-send-button"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    );
  },
);

PromptInput.displayName = "PromptInput";
