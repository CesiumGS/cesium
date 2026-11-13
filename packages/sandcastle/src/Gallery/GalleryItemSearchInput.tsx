import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconButton, TextBox } from "@stratakit/bricks";
import { dismiss, search as searchIcon } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";
import { trackEvent } from "../analytics";

export function GalleryItemSearchInput() {
  const store = useGalleryItemContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const { setSearchTerm, items, searchResults } = store ?? {};
  const [inputValue, setInputValue] = useState("");
  const deferredInputValue = useDeferredValue(inputValue);

  useEffect(() => {
    if (setSearchTerm) {
      const term = deferredInputValue.trim();
      setSearchTerm(term === "" ? null : term);
    }
  }, [deferredInputValue, setSearchTerm]);

  // Latest-ref so the tracking debounce below re-arms only when the term changes
  const searchResultsRef = useRef(searchResults);
  useEffect(() => {
    searchResultsRef.current = searchResults;
  });

  useEffect(() => {
    const term = deferredInputValue.trim();
    if (term === "") {
      return;
    }
    // Only report a search once typing has settled, not per keystroke
    const timeoutId = setTimeout(() => {
      trackEvent("Gallery Searched", {
        term,
        result_count: searchResultsRef.current?.length,
      });
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [deferredInputValue]);

  const clearSearch = useCallback(() => {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      input.focus();
    }
    setInputValue("");
  }, []);

  const updateSearch = useCallback((e: { target: { value: string } }) => {
    setInputValue(e.target.value);
  }, []);

  const isPending = useMemo(() => items?.length === 0, [items]);

  return (
    <TextBox.Root className="gallery-search-input">
      <TextBox.Icon href={searchIcon} />
      <TextBox.Input
        disabled={isPending}
        ref={inputRef}
        onChange={updateSearch}
        placeholder="Search gallery"
      />
      <IconButton
        className="gallery-search-input-clear-btn"
        hidden={inputValue === ""}
        icon={dismiss}
        label="Clear"
        onClick={clearSearch}
      ></IconButton>
    </TextBox.Root>
  );
}

export default GalleryItemSearchInput;
