import { useCallback } from "react";
import { useGalleryItemStore } from "../Gallery/GalleryItemStore.ts";
import { decodeBase64Data } from "../Helpers.ts";
import { getBaseUrl } from "./getBaseUrl.ts";

export function useLoadFromUrl() {
  let store = useGalleryItemStore();

  return useCallback(
    function loadFromUrl() {
      const searchParams = new URLSearchParams(window.location.search);

      if (window.location.hash.indexOf("#c=") === 0) {
        const base64String = window.location.hash.substr(3);
        const data = decodeBase64Data(base64String);
        return {
            title: "Sandcaste",
            getJsCode: () => data.code,
            getHtmlCode: () => data.html
        }
      }
      
      const legacyId = searchParams.get("src");
      if (legacyId) {
        const { selectItemByLegacyId } = store;
        const item = selectItemByLegacyId(legacyId);
        if (!item) {
          console.warn(`Could not find ID ${legacyId}`);
          return;
        }

        // Swap out last history state to use the newer version of query parameters
        window.history.replaceState({}, "", `${getBaseUrl()}?id=${item.id}`);

        return item;
      } 
      
      const galleryId = searchParams.get("id");
      if (galleryId) {
        const { selectItemById } = store;
        return selectItemById(galleryId);
      }
    },
    [!!store],
  );
}

export default useLoadFromUrl;
