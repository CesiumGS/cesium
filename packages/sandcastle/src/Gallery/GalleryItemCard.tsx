import {
  CompositeHover,
  CompositeItem,
  type CompositeItemProps,
} from "@ariakit/react";
import { useCallback, useMemo } from "react";
import { Text } from "@stratakit/bricks";
import { Chip } from "@stratakit/structures";
import {
  useGalleryItemContext,
  type HighlightedGalleryItem,
} from "./GalleryItemStore.ts";

type GalleryItemProps = CompositeItemProps & {
  index: number;
};

export function GalleryItemCardLabel({ label }: { label: string }) {
  const store = useGalleryItemContext();
  const { searchFilter, setSearchFilter } = store ?? {};
  const isActive = useMemo(
    () => !!searchFilter && searchFilter["labels"] === label,
    [label, searchFilter],
  );
  const filterLabel = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();

      if (!setSearchFilter) {
        return;
      }

      const filters = isActive
        ? null
        : {
            labels: label,
          };
      setSearchFilter(filters);
    },
    [label, isActive, setSearchFilter],
  );

  return (
    <li key={label}>
      <Chip
        className="gallery-card-chip"
        label={label}
        data-active={isActive}
        onClick={filterLabel}
      ></Chip>
    </li>
  );
}

export function GalleryItemCard({
  index,
  onClick,
  children,
}: GalleryItemProps) {
  const store = useGalleryItemContext();
  const { searchResults: items } = store ?? {};

  const item = useMemo(() => (!items ? null : items[index]), [items, index]);
  let group = <div />;

  if (!item) {
    return;
  }
  const {
    thumbnail,
    title,
    titleHtml,
    description,
    descriptionHtml,
    lineCount,
    codeExerpts,
    labels = [],
  } = item as HighlightedGalleryItem;
  const tags = labels
    .sort((a, b) => a.localeCompare(b))
    .map((label) => <GalleryItemCardLabel key={label} label={label} />);

  group = (
    <>
      <div className="gallery-card-thumbnail">
        <img loading="lazy" src={thumbnail} alt={`${title} thumbnail`} />
        <span>{lineCount} lines</span>
      </div>
      <section>
        <header>
          <Text variant="body-lg" render={<h3 />}>
            {titleHtml ?? title}
          </Text>
          <Text variant="body-sm" render={<p />}>
            {descriptionHtml ?? description}
          </Text>
          {codeExerpts}
        </header>
        <ul>{tags}</ul>
      </section>
    </>
  );

  return (
    <div className="gallery-card-wrapper">
      <CompositeHover
        render={
          <CompositeItem
            id={item.id}
            className="gallery-card"
            onClick={onClick}
          >
            {group}
          </CompositeItem>
        }
      ></CompositeHover>
      <menu>{children}</menu>
    </div>
  );
}

export default GalleryItemCard;
