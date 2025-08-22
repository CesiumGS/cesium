import {
  CompositeHover,
  CompositeItem,
  type CompositeItemProps,
} from "@ariakit/react";
import { Chip } from "@stratakit/structures";
import { useGalleryItemContext } from "./GalleryItemStore.ts";

type GalleryItemProps = CompositeItemProps & {
  index: number;
};

export function GalleryItemCard({
  index,
  onClick,
  children,
}: GalleryItemProps) {
  const store = useGalleryItemContext();
  const items = store?.useSearchResults;
  const searchFilter = store?.searchFilter;

  if (!items) {
    return;
  }

  const item = items[index];
  let group = <div />;

  const renderLabel = (label: string) => {
    const isActive = !!searchFilter && searchFilter["labels"] === label;

    const filterLabel = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();

      if (!store) {
        return;
      }

      const filters = isActive
        ? null
        : {
            labels: label,
          };
      store.search({
        filters,
      });
    };

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
  };

  if (item) {
    const {
      thumbnail,
      title,
      description,
      lineCount,
      codeExerpts,
      labels = [],
    } = item;
    const tags = labels.sort((a, b) => a.localeCompare(b)).map(renderLabel);

    group = (
      <>
        <div className="gallery-card-thumbnail">
          <img src={thumbnail} alt={`${title} thumbnail`} />
          <span>{lineCount} lines</span>
        </div>
        <section>
          <header>
            <h3>{title}</h3>
            <p>{description}</p>
            {codeExerpts}
          </header>
          <ul>{tags}</ul>
        </section>
      </>
    );
  }

  return (
    <div className="gallery-card-wrapper">
      <CompositeHover
        render={
          <CompositeItem
            id={item?.id}
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
