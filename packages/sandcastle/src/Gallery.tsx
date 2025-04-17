import { MouseEventHandler } from "react";
import "./Gallery.css";

export type GalleryDemo = {
  name: string;
  isNew: boolean;
  img: string;
  js: string;
  html?: string;
};

type GalleryCardProps = {
  demo: GalleryDemo;
  cardClickHandler: MouseEventHandler<HTMLDivElement>;
};

function GalleryCard({ demo, cardClickHandler }: GalleryCardProps) {
  return (
    <div className="card" onClick={cardClickHandler}>
      <div>{demo.name}</div>
      <img src={`gallery/${demo.img}`} alt="" />
    </div>
  );
}

type GalleryProps = {
  demos: GalleryDemo[];
  loadDemo: (demo: GalleryDemo) => void;
};

function Gallery({ demos, loadDemo }: GalleryProps) {
  return (
    <>
      {demos.map((demo) => {
        return (
          <GalleryCard
            key={demo.name}
            demo={demo}
            cardClickHandler={() => loadDemo(demo)}
          ></GalleryCard>
        );
      })}
    </>
  );
}

export default Gallery;
