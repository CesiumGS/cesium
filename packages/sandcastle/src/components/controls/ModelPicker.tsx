import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Fzf } from "fzf";
import { geminiLogo } from "../../icons";
import type { AIModel } from "../../AI/types";
import type { ModelInfo } from "../../contexts/ModelContext";
import "./ModelPicker.css";

interface ModelPickerProps {
  models: ModelInfo[];
  currentModel: AIModel | null;
  pinnedModels: string[];
  onModelChange: (modelId: AIModel) => void;
  onTogglePin: (modelId: string) => void;
}

export function ModelPicker({
  models,
  currentModel,
  pinnedModels,
  onModelChange,
  onTogglePin,
}: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get current model info
  const currentModelInfo = useMemo(
    () => models.find((m) => m.id === currentModel),
    [models, currentModel],
  );

  // Get model icon based on provider
  const getModelIcon = () => {
    return geminiLogo;
  };

  // Setup fuzzy search
  const fzf = useMemo(() => {
    return new Fzf(models, {
      selector: (item) => item.displayName,
      casing: "case-insensitive",
    });
  }, [models]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) {
      return models;
    }

    const results = fzf.find(searchQuery);
    return results.map((result) => result.item);
  }, [fzf, models, searchQuery]);

  // Group models by pinned/available/unavailable
  const groupedModels = useMemo(() => {
    const pinned = filteredModels.filter(
      (m) => pinnedModels.includes(m.id) && m.isAvailable,
    );
    const available = filteredModels.filter(
      (m) => !pinnedModels.includes(m.id) && m.isAvailable,
    );
    const unavailable = filteredModels.filter((m) => !m.isAvailable);

    return { pinned, available, unavailable };
  }, [filteredModels, pinnedModels]);

  // Get flat list of all models for keyboard navigation
  const flatModelList = useMemo(() => {
    return [
      ...groupedModels.pinned,
      ...groupedModels.available,
      ...groupedModels.unavailable,
    ];
  }, [groupedModels]);

  // Helper to close dropdown and reset state
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setSelectedIndex(0);
  }, []);

  const handleModelSelect = useCallback(
    (modelId: AIModel) => {
      onModelChange(modelId);
      closeDropdown();
      buttonRef.current?.focus();
    },
    [onModelChange, closeDropdown],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatModelList.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter": {
        e.preventDefault();
        const selectedModel = flatModelList[selectedIndex];
        if (selectedModel && selectedModel.isAvailable) {
          handleModelSelect(selectedModel.id);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        closeDropdown();
        buttonRef.current?.focus();
        break;
    }
  };

  const handleTogglePin = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(modelId);
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="model-picker">
      <button
        ref={buttonRef}
        className="model-picker-button"
        onClick={handleToggleDropdown}
        aria-label="Select AI model"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {currentModelInfo && (
          <>
            <img
              src={getModelIcon()}
              alt={currentModelInfo.provider}
              className="model-badge-logo"
            />
            <span className="model-name">{currentModelInfo.displayName}</span>
          </>
        )}
        <svg
          className={`model-picker-chevron ${isOpen ? "open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="model-picker-dropdown" role="listbox">
          <div className="model-picker-search">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="model-picker-search-input"
              aria-label="Search models"
            />
          </div>

          <div className="model-picker-list">
            {/* Pinned Models */}
            {groupedModels.pinned.length > 0 && (
              <div className="model-picker-section">
                <div className="model-picker-section-header">Pinned</div>
                {groupedModels.pinned.map((model, index) => {
                  const isSelected = selectedIndex === index;
                  const isCurrent = model.id === currentModel;
                  return (
                    <div
                      key={model.id}
                      className={`model-picker-item ${isSelected ? "selected" : ""} ${isCurrent ? "current" : ""}`}
                      onClick={() => handleModelSelect(model.id)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      role="option"
                      aria-selected={isCurrent}
                    >
                      <img
                        src={getModelIcon()}
                        alt={model.provider}
                        className="model-icon"
                      />
                      <div className="model-info">
                        <div className="model-name">{model.displayName}</div>
                        <div className="model-description">
                          {model.description}
                        </div>
                      </div>
                      <button
                        className="model-pin-button pinned"
                        onClick={(e) => handleTogglePin(model.id, e)}
                        aria-label="Unpin model"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.42l-3.52 1.93.67-3.93-2.85-2.78 3.94-.57L8 1.5z" />
                        </svg>
                      </button>
                      {isCurrent && <div className="model-checkmark">✓</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Available Models */}
            {groupedModels.available.length > 0 && (
              <div className="model-picker-section">
                <div className="model-picker-section-header">Available</div>
                {groupedModels.available.map((model, index) => {
                  const adjustedIndex = index + groupedModels.pinned.length;
                  const isSelected = selectedIndex === adjustedIndex;
                  const isCurrent = model.id === currentModel;
                  return (
                    <div
                      key={model.id}
                      className={`model-picker-item ${isSelected ? "selected" : ""} ${isCurrent ? "current" : ""}`}
                      onClick={() => handleModelSelect(model.id)}
                      onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                      role="option"
                      aria-selected={isCurrent}
                    >
                      <img
                        src={getModelIcon()}
                        alt={model.provider}
                        className="model-icon"
                      />
                      <div className="model-info">
                        <div className="model-name">{model.displayName}</div>
                        <div className="model-description">
                          {model.description}
                        </div>
                      </div>
                      <button
                        className="model-pin-button"
                        onClick={(e) => handleTogglePin(model.id, e)}
                        aria-label="Pin model"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M8 1.5l1.76 3.57 3.94.57-2.85 2.78.67 3.93L8 10.42l-3.52 1.93.67-3.93-2.85-2.78 3.94-.57L8 1.5z" />
                        </svg>
                      </button>
                      {isCurrent && <div className="model-checkmark">✓</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Unavailable Models */}
            {groupedModels.unavailable.length > 0 && (
              <div className="model-picker-section">
                <div className="model-picker-section-header">Unavailable</div>
                {groupedModels.unavailable.map((model, index) => {
                  const adjustedIndex =
                    index +
                    groupedModels.pinned.length +
                    groupedModels.available.length;
                  const isSelected = selectedIndex === adjustedIndex;
                  return (
                    <div
                      key={model.id}
                      className={`model-picker-item disabled ${isSelected ? "selected" : ""}`}
                      onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                      role="option"
                      aria-selected={false}
                      aria-disabled={true}
                    >
                      <img
                        src={getModelIcon()}
                        alt={model.provider}
                        className="model-icon"
                      />
                      <div className="model-info">
                        <div className="model-name">{model.displayName}</div>
                        <div className="model-description">
                          API key required
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results */}
            {flatModelList.length === 0 && (
              <div className="model-picker-no-results">
                No models found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
