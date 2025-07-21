import { MouseEventHandler, useEffect, useMemo, useRef, useState } from "react";
import "./Gallery.css";
import { Badge, Button, Select } from "@stratakit/bricks";
import { getBaseUrl } from "./util/getBaseUrl";
import { Input } from "@stratakit/bricks/TextBox";
import classNames from "classnames";

const GALLERY_BASE = __GALLERY_BASE_URL__;

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  labels: string[];
  isNew: boolean;
};

export function GallerySearch({
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

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTag, setCurrentTag] = useState<string | "All">("All");

  const requestId = useRef<number>(0);

  useEffect(() => {
    async function doSearch() {
      if (!pagefind.current) {
        return;
      }
      const searchString = searchTerm;
      if (!searchString || searchString === "") {
        setSearchResults(null);
        return;
      }
      const thisRequestId = ++requestId.current;

      const search = await pagefind.current.search(searchString, {
        filters: {
          tags: currentTag === "All" ? undefined : currentTag,
        },
      });

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
        setSearchResults(resultData);
      }
    }

    doSearch();
  }, [searchTerm, currentTag, setSearchResults]);

  useEffect(() => {
    async function loadPageFind() {
      const pagefindImport: Pagefind = await import(
        // vite doesn't like the dynamic import
        /* @vite-ignore */
        `${GALLERY_BASE}/pagefind/pagefind.js`
      );

      pagefindImport.init();
      await pagefindImport.options({
        baseUrl: getBaseUrl(),
      });
      pagefind.current = pagefindImport;

      const filters = await pagefind.current.filters();
      setAvailableFilters(filters);

      setPagefindLoaded(true);
    }
    if (isFirstLoad.current) {
      // This prevents double activation when using StrictMode
      isFirstLoad.current = false;
      loadPageFind();
    }
  }, []);

  const debounceTimeout = useRef<NodeJS.Timeout>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {!!searchTerm && (
        <Button
          onClick={() => {
            setSearchTerm("");
            if (inputRef.current) {
              inputRef.current.value = "";
            }
          }}
        >
          Clear
        </Button>
      )}
      <Input
        ref={inputRef}
        disabled={!pagefindLoaded}
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
          disabled={!pagefindLoaded}
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
    </>
  );
}

export function GalleryCard({
  item,
  cardClickHandler,
}: {
  item: GalleryItem;
  cardClickHandler: MouseEventHandler<HTMLAnchorElement>;
}) {
  const thumbnailPath = item.thumbnail
    ? `${GALLERY_BASE}/${item.id}/${item.thumbnail}`
    : `./images/placeholder-thumbnail.jpg`;
  return (
    <a
      className="card"
      href={`${getBaseUrl()}?id=${item.id}`}
      onClick={(e, ...args) => {
        e.preventDefault();
        cardClickHandler(e, ...args);
        return false;
      }}
    >
      <img src={thumbnailPath} alt="" />
      <div className="details">
        <h2 className="title">{item.title}</h2>
        <div className="description">{item.description}</div>
        <div className="labels">
          {item.labels
            .sort((a, b) => a.localeCompare(b))
            ?.map((label) => (
              <Badge label={label} key={label} />
            ))}
        </div>
      </div>
    </a>
  );
}

function Gallery({
  galleryItems,
  loadDemo,
  hidden,
}: {
  galleryItems: GalleryItem[];
  loadDemo: (demo: GalleryItem) => void;
  hidden: boolean;
}) {
  const [searchResults, setSearchResults] = useState<
    PagefindSearchFragment[] | null
  >(null);
  const [currentTag, setCurrentTag] = useState<string | "All">("All");

  const filteredList = useMemo(() => {
    const taggedItems =
      currentTag === "All"
        ? galleryItems
        : galleryItems.filter((item) => item.labels.includes(currentTag));

    if (searchResults === null) {
      return taggedItems;
    }
    if (searchResults.length === 0) {
      return [];
    }
    const searchedIds = searchResults.map((result) => result.meta.id);
    // Filter starting from the search ids because they're already ordered by
    // the weights returned from pagefind.
    return searchedIds
      .map((id) => taggedItems.find((item) => item.id === id))
      .filter((item) => item !== undefined);
  }, [galleryItems, searchResults, currentTag]);

  return (
    <div
      className={classNames("gallery", {
        hidden: hidden,
      })}
    >
      <div className="filters">
        <h2>Gallery</h2>
        <div className="flex-spacer"></div>
        <GallerySearch
          setSearchResults={setSearchResults}
          setTag={setCurrentTag}
        />
      </div>
      <div className="list">
        {filteredList.length === 0 && (
          <div className="empty-list">No items found</div>
        )}
        {filteredList.map((item) => {
          return (
            <GalleryCard
              key={item.id}
              item={item}
              cardClickHandler={() => loadDemo(item)}
            ></GalleryCard>
          );
        })}
      </div>
    </div>
  );
}

export default Gallery;
