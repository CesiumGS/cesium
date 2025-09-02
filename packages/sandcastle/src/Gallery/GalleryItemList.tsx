import { useDeferredValue, useMemo } from "react";
import classNames from "classnames";
import { Composite, useCompositeContext } from "@ariakit/react";
import { Divider, IconButton } from "@stratakit/bricks";
import { developer } from "../icons.ts";

import { useGalleryItemContext, type GalleryItem } from "./GalleryItemStore.ts";
import GalleryItemCard from "./GalleryItemCard.tsx";

/**
 * @typedef {Object} GalleryItemListProps
 * @prop {function} [onRunCode] A callback that gets called when a gallery item is opened.
 * @prop {function} [onOpenCode] A callback that gets called when the code editor is opened.
 */

type GalleryItemListProps = {
  onRunCode?: (item: GalleryItem) => void;
  onOpenCode?: (item: GalleryItem) => void;
};

/**
 * Component that displays a composite list of gallery items.
 * @param {GalleryItemListProps} props
 */
export function GalleryItemList({
  onRunCode = () => {},
  onOpenCode = () => {},
}: GalleryItemListProps) {
  const composite = useCompositeContext();
  const store = useGalleryItemContext();
  const { isSearchPending, items, searchResults, searchTerm, searchFilter } =
    store ?? {};

  const totalDisplay = useMemo(
    () =>
      searchResults?.length === items?.length
        ? null
        : ` (of ${items?.length} total)`,
    [searchResults, items],
  );

  const searchTermDisplay = useMemo(
    () => (!searchTerm ? null : ` for "${searchTerm}"`),
    [searchTerm],
  );

  const searchFilterDisplay = useMemo(() => {
    const filter = searchFilter ?? {};
    const searchFilters = Object.keys(filter);
    return searchFilters.length === 0
      ? null
      : ` in ${searchFilters
          .map((type) => `${type}:"${filter[type]}"`)
          .join(", ")}`;
  }, [searchFilter]);

  const summary = (
    <summary>
      <h3>Results</h3>
      {searchResults?.length}
      {searchTermDisplay}
      {searchFilterDisplay}
      {totalDisplay}
    </summary>
  );

  const isEmpty = useMemo(
    () => !searchResults || searchResults.length === 0,
    [searchResults],
  );
  const deferredIsEmpty = useDeferredValue(isEmpty);
  const emptyPlaceholder = useMemo(
    () =>
      isSearchPending || !isEmpty ? null : (
        <div>
          <h3>No results</h3>
          <p>Try adjusting your search filters</p>
        </div>
      ),
    [isEmpty, isSearchPending],
  );

  const list = useMemo(
    () =>
      searchResults?.map((item, index) => {
        return (
          <GalleryItemCard
            onClick={() => onRunCode(item as GalleryItem)}
            key={item?.id}
            index={index}
          >
            <IconButton
              icon={developer}
              label="Open and view code"
              onClick={() => {
                const target = item as GalleryItem;
                onRunCode(target);
                onOpenCode(target);
              }}
              variant="ghost"
            />
          </GalleryItemCard>
        );
      }),
    [searchResults, onOpenCode, onRunCode],
  );

  return (
    <>
      <Composite
        id="gallery-item-list"
        store={composite}
        className={classNames("list", { "empty-list": deferredIsEmpty })}
      >
        {summary}
        <Divider />
        {emptyPlaceholder}
        {list}
      </Composite>
    </>
  );
}

export default GalleryItemList;
