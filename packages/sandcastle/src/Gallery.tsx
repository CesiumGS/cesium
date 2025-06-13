import { MouseEventHandler } from "react";
import "./Gallery.css";

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  isNew: boolean;
};

type GalleryCardProps = {
  name: string;
  imageSrc: string;
  cardClickHandler: MouseEventHandler<HTMLDivElement>;
};

export function GalleryCard({
  name,
  imageSrc,
  cardClickHandler,
}: GalleryCardProps) {
  return (
    <div className="card" onClick={cardClickHandler}>
      <div>{name}</div>
      <img src={imageSrc} alt="" />
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
    <>
      {demos.map((demo) => {
        const thumbnailPath = demo.thumbnail
          ? `${GALLERY_BASE}/${demo.id}/${demo.thumbnail}`
          : `./images/placeholder-thumbnail.jpg`;
        return (
          <GalleryCard
            key={demo.id}
            name={demo.title}
            imageSrc={thumbnailPath}
            cardClickHandler={() => loadDemo(demo)}
          ></GalleryCard>
        );
      })}
    </>
  );
}

export default Gallery;
