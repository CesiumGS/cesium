import { useRef } from "react";
import { IconButton, TextBox } from "@stratakit/bricks";
import { close, search as searchIcon } from "../icons.ts";

import { useGalleryItemContext } from "./GalleryItemStore.ts";

export function GalleryItemSearchInput() {
  const store = useGalleryItemContext();
  const isPending = !store || store.isPending;
  const inputRef = useRef<HTMLInputElement>(null);
  const value = inputRef.current?.value;
  const hasInput = !!value && value !== "";

  const clearSearch = () => {
    if (store) {
      const { search } = store;
      search({
        term: null,
      });
    }

    const input = inputRef.current;
    if (input) {
      input.value = "";
      input.focus();
    }
  };

  const updateSearch = (e: { target: { value: string | null } }) => {
    let term = e.target.value;
    if (store) {
      const { search } = store;

      if (term) {
        term = term.trim();
      }

      if (!term || term === "") {
        term = null;
      }

      search({
        term,
        filters: null,
      });
    }
  };

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
