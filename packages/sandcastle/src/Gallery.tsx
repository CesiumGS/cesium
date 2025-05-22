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

function Gallery({ demos, loadDemo }: GalleryProps) {
  return (
    <>
      {demos.map((demo) => {
        return (
          <GalleryCard
            key={demo.id}
            name={demo.title}
            imageSrc={`gallery/${demo.id}/${demo.thumbnail}`}
            cardClickHandler={() => loadDemo(demo)}
          ></GalleryCard>
        );
      })}
    </>
  );
}

export default Gallery;
