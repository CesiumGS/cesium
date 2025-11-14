import { useCallback, useMemo, useRef, useState } from "react";
import { IconButton, TextBox } from "@stratakit/bricks";
import { close, search as searchIcon } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";

export function GalleryItemSearchInput() {
  const store = useGalleryItemContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const { setSearchTerm, items } = store ?? {};
  const [inputValue, setInputValue] = useState("");

  const clearSearch = useCallback(() => {
    setInputValue("");
    
    if (setSearchTerm) {
      setSearchTerm(null);
    }
    
    // Focus input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [setSearchTerm]);

  const updateSearch = useCallback(
    (e: { target: { value: string | null } }) => {
      let term = e.target.value || "";
      
      // Update local state immediately for responsive input
      setInputValue(term);
      
      // Update search term in store
      if (setSearchTerm) {
        const trimmed = term.trim();
        setSearchTerm(trimmed || null);
      }
    },
    [setSearchTerm],
  );

  const isPending = useMemo(() => items?.length === 0, [items]);

  return (
    <TextBox.Root className="gallery-search-input">
      <TextBox.Icon href={searchIcon} />
      <TextBox.Input
        disabled={isPending}
        ref={inputRef}
        value={inputValue}
        onChange={updateSearch}
        placeholder="Search gallery"
      />
      <IconButton
        className="gallery-search-input-clear-btn"
        hidden={!inputValue}
        icon={close}
        label="Clear"
        onClick={clearSearch}
      ></IconButton>
    </TextBox.Root>
  );
}

export default GalleryItemSearchInput;
