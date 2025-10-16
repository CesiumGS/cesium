import { CompositeProvider, useCompositeStore } from "@ariakit/react";
import { type GalleryItem } from "./GalleryItemStore.ts";
import GalleryItemSearch from "./GalleryItemSearch.tsx";
import GalleryItemList from "./GalleryItemList.tsx";
import classNames from "classnames";
import "./Gallery.css";

/**
 * @typedef {object} GalleryProps
 * @prop {boolean} [hidden] Whether the gallery is hidden.
 * @prop {function} [onRunCode] A callback that gets called when a gallery item is opened.
 * @prop {function} [onOpenCode] A callback that gets called when the code editor is opened.
 */
type GalleryProps = {
  hidden?: boolean;
  onRunCode?: (item: GalleryItem) => void;
  onOpenCode?: (item: GalleryItem) => void;
};

function Gallery({ hidden, onRunCode, onOpenCode }: GalleryProps) {
  const composite = useCompositeStore();
  return (
    <CompositeProvider store={composite}>
      <div
        className={classNames("gallery", {
          hidden: hidden,
        })}
      >
        <div className="filters">
          <h2>Gallery</h2>
          <GalleryItemSearch></GalleryItemSearch>
        </div>
        <GalleryItemList onRunCode={onRunCode} onOpenCode={onOpenCode} />
      </div>
    </CompositeProvider>
  );
}

export default Gallery;
