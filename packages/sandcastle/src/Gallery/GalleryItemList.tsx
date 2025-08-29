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
  const items = store?.items ?? [];
  const results = store?.useSearchResults ?? [];

  const isEmpty = !store?.isPending && results.length === 0;
  const totalDisplay =
    results.length === items.length ? null : ` (of ${items.length} total)`;

  const searchTerm = store?.searchTerm;
  const searchTermDisplay = !searchTerm ? null : ` for "${searchTerm}"`;

  const searchFilter = store?.searchFilter ?? {};
  const searchFilters = Object.keys(searchFilter);
  const searchFilterDisplay =
    searchFilters.length === 0
      ? null
      : ` in ${Object.keys(searchFilter)
          .map((type) => `${type}:"${searchFilter[type]}"`)
          .join(", ")}`;

  const summary = (
    <summary>
      <h3>Results</h3>
      {results.length}
      {searchTermDisplay}
      {searchFilterDisplay}
      {totalDisplay}
    </summary>
  );

  const placeholder = !isEmpty ? null : (
    <div>
      <h3>No results</h3>
      <p>Try adjusting your search filters</p>
    </div>
  );

  const list = results.map((item, index) => {
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
  });

  return (
    <>
      <Composite
        id="gallery-item-list"
        store={composite}
        className={classNames("list", { "empty-list": isEmpty })}
      >
        {summary}
        <Divider />
        {placeholder}
        {list}
      </Composite>
    </>
  );
}

export default GalleryItemList;
