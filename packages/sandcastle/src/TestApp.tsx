import { Input } from "@stratakit/bricks/TextBox";
import { useEffect, useMemo, useRef, useState } from "react";
import "../pagefind-client.d.ts";
import { getBaseUrl } from "./util/getBaseUrl.ts";
import { GalleryItem } from "./Gallery.tsx";
import { Root } from "@stratakit/foundations";
import { Select } from "@stratakit/bricks";

// Copied/extracted from https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/lib/coupled_search.ts
// and https://github.com/Pagefind/pagefind/blob/main/pagefind_web_js/types/index.d.ts
type Pagefind = {
  init: (overrideLanguage?: string) => void;
  search: (
    term: string,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindIndexesSearchResults>;
  preload: (term: string, options?: PagefindSearchOptions) => Promise<void>;
  filters: () => Promise<PagefindFilterCounts>;
  options: (options: PagefindIndexOptions) => Promise<void>;
};

function GallerySearch({
  setSearchResults,
  setTag,
}: {
  setSearchResults: (newSearchResults: PagefindSearchFragment[] | null) => void;
  setTag: (newTag: string | "All") => void;
}) {
  const pagefind = useRef<Pagefind>(null);
  const isFirstLoad = useRef(true);
  const [pagefindLoaded, setPagefindLoaded] = useState(false);
  const [availableFilters, setAvailableFilters] =
    useState<PagefindFilterCounts>({ tags: {} });
  const [internalSearchResults, setInternalSearchResults] = useState<
    PagefindSearchFragment[]
  >([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTag, setCurrentTag] = useState<string | "All">("All");

  const requestId = useRef<number>(0);

  useEffect(() => {
    async function doSearch() {
      if (!pagefind.current) {
        return;
      }
      const searchString = searchTerm;
      console.log("doSearch", { searchString, currentTag });
      if (!searchString || searchString === "") {
        setSearchResults(null);
        return;
      }
      const thisRequestId = ++requestId.current;

      console.time(searchString);
      const search = await pagefind.current.search(searchString, {
        filters: {
          tags: currentTag === "All" ? undefined : currentTag,
        },
      });
      console.log(search);
      console.log(search.results.length, "results");
      for (const result of search.results) {
        console.log(await result.data());
      }
      console.timeEnd(searchString);

      const resultDataPromises = await Promise.allSettled(
        search.results.map((result) => {
          return result.data();
        }),
      );
      const resultData = resultDataPromises
        .map((result) => {
          return result.status === "fulfilled" ? result.value : undefined;
        })
        .filter((result) => !!result);

      if (thisRequestId === requestId.current) {
        setInternalSearchResults(resultData);
        setSearchResults(resultData);
      }
    }

    doSearch();
  }, [searchTerm, currentTag]);

  useEffect(() => {
    async function loadPageFind() {
      // @ts-expect-error The module type is not defined from the import alone
      const pagefindImport: Pagefind = await import("../pagefind/pagefind.js");

      console.log(pagefindImport);

      pagefindImport.init();
      await pagefindImport.options({
        baseUrl: getBaseUrl(),
      });
      pagefind.current = pagefindImport;

      const filters = await pagefind.current.filters();
      setAvailableFilters(filters);
      console.log("filters", filters);

      setPagefindLoaded(true);
    }
    if (isFirstLoad.current) {
      // This prevents double activation when using StrictMode
      isFirstLoad.current = false;
      loadPageFind();
    }
  }, []);

  const debounceTimeout = useRef<NodeJS.Timeout>(null);

  if (!pagefindLoaded) {
    return <Input />;
  }

  return (
    <>
      <Input
        onChange={(e) => {
          if (debounceTimeout.current) {
            clearInterval(debounceTimeout.current);
          }
          const newSearchTerm = e.target.value;
          pagefind.current?.preload(newSearchTerm);
          debounceTimeout.current = setTimeout(() => {
            setSearchTerm(newSearchTerm);
          }, 300);
        }}
      />
      <Select.Root>
        <Select.HtmlSelect
          onChange={(e) => {
            setCurrentTag(e.target.value);
            setTag(e.target.value);
          }}
        >
          <option value={"All"}>All</option>
          {Object.keys(availableFilters.tags).map((label) => (
            <option value={label} key={label}>
              {label}
            </option>
          ))}
        </Select.HtmlSelect>
      </Select.Root>
      {internalSearchResults.map((result) => {
        const snippets = [];

        const content = result.content;
        for (const location of result.locations) {
          snippets.push(content.split(" ")[location]);
        }

        return (
          <div className="result">
            <h3>
              {result.meta.title} <a href={result.url}>{result.url}</a>
            </h3>
            {/* <p>{result.meta.description}</p> */}
            {/* <pre>{content}</pre> */}
            {/* <pre>{result.excerpt}</pre> */}
            {/* TODO: newlines are stripped from the content it seems. This is annoying for trying to render a snippet... */}
            <p dangerouslySetInnerHTML={{ __html: result.excerpt }}></p>
            {/* <ul>
              {snippets.map((snippet, i) => {
                return <li key={result.locations[i]}>{snippet}</li>;
              })}
            </ul> */}
          </div>
        );
        return <p key={result.meta.id}>{result.meta.title}</p>;
      })}
    </>
  );
}

const GALLERY_BASE = __GALLERY_BASE_URL__;

export default function TestApp() {
  const [, setLegacyIdMap] = useState<Record<string, string>>({});
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [, setGalleryLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchGallery() {
      const req = await fetch(`${GALLERY_BASE}/list.json`);
      const resp = await req.json();

      if (!ignore) {
        setGalleryItems(resp.entries);
        setLegacyIdMap(resp.legacyIdMap);
        setGalleryLoaded(true);
      }
    }
    fetchGallery();
    return () => {
      ignore = true;
    };
  }, []);

  const [searchResults, setSearchResults] = useState<
    PagefindSearchFragment[] | null
  >(null);
  const [currentTag, setCurrentTag] = useState<string | "All">("All");

  const filteredList = useMemo(() => {
    console.log("useMemo");
    const taggedItems =
      currentTag === "All"
        ? galleryItems
        : galleryItems.filter((item) => item.labels.includes(currentTag));

    if (searchResults === null) {
      console.log("  return tagged only");
      return taggedItems;
    }
    if (searchResults.length === 0) {
      console.log("  return empty, no results");
      return [];
    }
    console.log("  filter results");
    const searchedIds = searchResults.map((result) => result.meta.id);
    return searchedIds
      .map((id) => taggedItems.find((item) => item.id === id))
      .filter((item) => item !== undefined);
  }, [galleryItems, searchResults, currentTag]);

  return (
    <Root colorScheme="light" density="dense">
      <GallerySearch
        setSearchResults={(newResults) => setSearchResults(newResults)}
        setTag={(newTag: string) => setCurrentTag(newTag)}
      />
      <h2>
        <b>Gallery:</b>
      </h2>
      <div className="gallery">
        {filteredList.length === 0 && <p>No items found</p>}
        {filteredList.map((item) => {
          return (
            <div className="gallery-item" key={item.id}>
              {item.title} - {item.labels.join(", ")}
            </div>
          );
        })}
      </div>
      {/* <Gallery
        demos={galleryItems}
        loadDemo={(item) => {
          // Load the gallery item every time it's clicked
          loadGalleryItem(item.id);
        }}
      /> */}
    </Root>
  );
}
