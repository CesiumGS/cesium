import { MouseEventHandler, useMemo } from "react";
import "./Gallery.css";
import { Input } from "@stratakit/bricks/TextBox";
import { Badge, Select } from "@stratakit/bricks";
import { getBaseUrl } from "./util/getBaseUrl";

const GALLERY_BASE = __GALLERY_BASE_URL__;

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  labels: string[];
  isNew: boolean;
};

export function GalleryCard({
  item,
  cardClickHandler,
}: {
  item: GalleryItem;
  cardClickHandler: MouseEventHandler<HTMLAnchorElement>;
}) {
  const thumbnailPath = item.thumbnail
    ? `${GALLERY_BASE}/${item.id}/${item.thumbnail}`
    : `./images/placeholder-thumbnail.jpg`;
  return (
    <a
      className="card"
      href={`${getBaseUrl()}?id=${item.id}`}
      onClick={(e, ...args) => {
        e.preventDefault();
        cardClickHandler(e, ...args);
        return false;
      }}
    >
      <img src={thumbnailPath} alt="" />
      <div className="details">
        <h2 className="title">{item.title}</h2>
        <div className="description">{item.description}</div>
        <div className="labels">
          {item.labels
            .sort((a, b) => a.localeCompare(b))
            ?.map((label) => (
              <Badge label={label} key={label} />
            ))}
        </div>
      </div>
    </a>
  );
}

function Gallery({
  demos,
  loadDemo,
}: {
  demos: GalleryItem[];
  loadDemo: (demo: GalleryItem) => void;
}) {
  const knownLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const demo of demos) {
      demo.labels?.forEach((label) => labels.add(label));
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [demos]);

  return (
    <div className="gallery">
      <div className="filters">
        <h2>Gallery</h2>
        <div className="flex-spacer"></div>
        <Input />
        <Select.Root>
          <Select.HtmlSelect>
            <option value={"All"}>All</option>
            {knownLabels.map((label) => (
              <option value={label} key={label}>
                {label}
              </option>
            ))}
          </Select.HtmlSelect>
        </Select.Root>
      </div>
      <div className="list">
        {demos.map((item) => {
          return (
            <GalleryCard
              key={item.id}
              item={item}
              cardClickHandler={() => loadDemo(item)}
            ></GalleryCard>
          );
        })}
      </div>
    </div>
  );
}

export default Gallery;
