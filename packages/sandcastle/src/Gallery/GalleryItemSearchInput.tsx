import { useCallback, useMemo, useRef } from "react";
import { IconButton, TextBox } from "@stratakit/bricks";
import { close, search as searchIcon } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";

export function GalleryItemSearchInput() {
  const store = useGalleryItemContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const value = inputRef.current?.value;
  const { setSearchTerm, items } = store ?? {};
  const hasInput = !!value && value !== "";

  const clearSearch = useCallback(() => {
    const input = inputRef.current;
    if (input) {
      input.value = "";
      input.focus();
    }

    if (setSearchTerm) {
      setSearchTerm(null);
    }
  }, [setSearchTerm]);

  const updateSearch = useCallback(
    (e: { target: { value: string | null } }) => {
      let term = e.target.value;
      if (setSearchTerm) {
        if (term) {
          term = term.trim();
        }

        if (!term || term === "") {
          term = null;
        }

        setSearchTerm(term);
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
        onChange={updateSearch}
        placeholder="Search gallery"
      />
      <IconButton
        className="gallery-search-input-clear-btn"
        hidden={!hasInput}
        icon={close}
        label="Clear"
        onClick={clearSearch}
      ></IconButton>
    </TextBox.Root>
  );
}

export default GalleryItemSearchInput;
