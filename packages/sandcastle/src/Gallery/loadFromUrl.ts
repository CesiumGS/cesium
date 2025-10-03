import { type GalleryItem } from "./GalleryItemStore.ts";
import { decodeBase64Data } from "../Helpers.ts";
import { getBaseUrl } from "../util/getBaseUrl.ts";

const loadGist = async (gist: string) => {
  try {
    const response = await fetch(`https://api.github.com/gists/${gist}`);
    const data = await response.json();
    const files = data.files;
    if (!files) {
      throw new Error(data.message);
    }
    const code = files["Cesium-Sandcastle.js"]?.content;
    const html = files["Cesium-Sandcastle.html"]?.content;
    return {
      title: "Gist Import",
      code,
      html,
    };
  } catch (error) {
    throw new Error(
      `${error}. Unable to requets gist from GitHub. This could be due to too many requests from your IP or an incorrect gist ID. Instead, copy and paste the code from "https://gist.github.com/${gist}"`,
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

export function loadFromUrl(
  items: GalleryItem[],
  legacyIds: Record<string, string>,
) {
  const searchParams = new URLSearchParams(window.location.search);

  const codeParam = searchParams.get("code");
  if (codeParam) {
    // This is a legacy support type url that was used by ion.
    // Ideally we use the #c= param as that results in shorter urls
    // The code query parameter is a Base64 encoded JSON string with `code` and `html` properties.
    const json = JSON.parse(window.atob(codeParam.replaceAll(" ", "+")));

    return {
      title: "New Sandcastle",
      code: json.code,
      html: json.html,
    };
  }

  if (window.location.hash.indexOf("#c=") === 0) {
    const base64String = window.location.hash.substr(3);
    const { code, html } = decodeBase64Data(base64String);
    return {
      title: "New Sandcastle",
      code,
      html,
    };
  }

  // This is currently only for legacy support like old links on GH or the forums
  const gist = searchParams.get("gist");
  if (gist) {
    return loadGist(gist);
  }

  const selectItemById = (searchId: string) =>
    items.find(({ id }) => id === searchId);
  const selectItemByLegacyId = (searchId: string) =>
    selectItemById(legacyIds[searchId]);

  const legacyId = searchParams.get("src");
  if (legacyId) {
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
