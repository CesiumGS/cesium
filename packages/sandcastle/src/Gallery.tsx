import { MouseEventHandler } from "react";
import "./Gallery.css";
import { Input } from "@stratakit/bricks/TextBox";
import { Select } from "@stratakit/bricks";

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  isNew: boolean;
};

type GalleryCardProps = {
  title: string;
  description: string;
  imageSrc: string;
  cardClickHandler: MouseEventHandler<HTMLDivElement>;
};

export function GalleryCard({
  title,
  description,
  imageSrc,
  cardClickHandler,
}: GalleryCardProps) {
  return (
    <div className="card" onClick={cardClickHandler}>
      <img src={imageSrc} alt="" />
      <div className="details">
        <h2 className="title">{title}</h2>
        <div className="description">{description}</div>
      </div>
    </div>
  );
}

type GalleryProps = {
  demos: GalleryItem[];
  loadDemo: (demo: GalleryItem) => void;
};

const GALLERY_BASE = __GALLERY_BASE_URL__;

function Gallery({ demos, loadDemo }: GalleryProps) {
  return (
    <div className="gallery">
      <div className="filters">
        <h2>Gallery</h2>
        <div className="flex-spacer"></div>
        <Input />
        <Select.Root>
          <Select.HtmlSelect>
            <option value="apple">3D Tiles</option>
            <option value="orange">Beginner</option>
            <option value="kiwi">Tutorials</option>
          </Select.HtmlSelect>
        </Select.Root>
      </div>
      <div className="list">
        {demos.map((demo) => {
          const thumbnailPath = demo.thumbnail
            ? `${GALLERY_BASE}/${demo.id}/${demo.thumbnail}`
            : `./images/placeholder-thumbnail.jpg`;
          return (
            <GalleryCard
              key={demo.id}
              title={demo.title}
              description={demo.description}
              imageSrc={thumbnailPath}
              cardClickHandler={() => loadDemo(demo)}
            ></GalleryCard>
          );
        })}
      </div>
    </div>
  );
}

export default Gallery;
