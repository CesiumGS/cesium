import GalleryItemSearchFilter from "./GalleryItemSearchFilter.tsx";
import GalleryItemSearchInput from "./GalleryItemSearchInput.tsx";

export function GalleryItemSearch() {
  return (
    <form role="search">
      <GalleryItemSearchInput />
      <GalleryItemSearchFilter />
    </form>
  );
}

export default GalleryItemSearch;
