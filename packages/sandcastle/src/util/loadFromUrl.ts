import {
  type GalleryItemStore,
  type GalleryItem,
} from "../Gallery/GalleryItemStore.ts";
import { decodeBase64Data } from "../Helpers.ts";
import { getBaseUrl } from "./getBaseUrl.ts";

const loadGist = async (gist: string) => {
  try {
    const response = await fetch(`https://api.github.com/gists/${gist}`);
    const data = await response.json();
    const files = data.files;
    const code = files["Cesium-Sandcastle.js"].content;
    const html = files["Cesium-Sandcastle.html"]?.content;
    return {
      title: "Gist Import",
      code,
      html,
    };
  } catch (error) {
    throw new Error(
      `Unable to requets gist from GitHub. This could be due to too many requests from your IP or an incorrect gist ID. Instead, copy and paste the code from: "https://gist.github.com/${gist}".
      ${error}`,
    );
  }
};

const fromItem = async ({ getHtmlCode, getJsCode, title }: GalleryItem) => {
  try {
    const [code, html] = await Promise.all([getJsCode(), getHtmlCode()]);
    return {
      title,
      code,
      html,
    };
  } catch (error) {
    throw new Error(`Could not load "${title}": ${error}`);
  }
};

export function loadFromUrl(store: NonNullable<GalleryItemStore>) {
  const searchParams = new URLSearchParams(window.location.search);

  if (window.location.hash.indexOf("#c=") === 0) {
    const base64String = window.location.hash.substr(3);
    const { code, html } = decodeBase64Data(base64String);
    return {
      title: "Sandcaste",
      code,
      html,
    };
  }

  // This is currently only for legacy support like old links on GH or the forums
  const gist = searchParams.get("gist");
  if (gist) {
    return loadGist(gist);
  }

  const legacyId = searchParams.get("src");
  if (legacyId) {
    const { selectItemByLegacyId, items } = store;
    const item = selectItemByLegacyId(legacyId);
    if (!item) {
      if (items.length > 0) {
        throw new Error(
          `Could not find Sandcastle gallery item with ID "${legacyId}".`,
        );
      }
      return;
    }

    // Swap out last history state to use the newer version of query parameters
    window.history.replaceState({}, "", `${getBaseUrl()}?id=${item.id}`);

    return fromItem(item);
  }

  const galleryId = searchParams.get("id");
  if (galleryId) {
    const { selectItemById, selectItemByLegacyId, items } = store;
    let item = selectItemById(galleryId);
    if (!item) {
      item = selectItemByLegacyId(galleryId);
    }

    if (!item) {
      if (items.length > 0) {
        throw new Error(
          `Could not find Sandcastle gallery item with ID "${galleryId}".`,
        );
      }
      return;
    }

    return fromItem(item);
  }
}
