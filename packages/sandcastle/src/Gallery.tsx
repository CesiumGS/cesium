import { useEffect, useMemo, useRef, useState } from "react";
import "./Gallery.css";
import { Badge, IconButton, Select, Spinner, TextBox } from "@stratakit/bricks";
import { getBaseUrl } from "./util/getBaseUrl";
import classNames from "classnames";
import { close, script, search } from "./icons";
import { ProcessStatus } from "./util/ProcessStatus";
import "../pagefind-client.d.ts";

const GALLERY_BASE = __GALLERY_BASE_URL__;

export type GalleryItem = {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  labels: string[];
  isNew: boolean;
};

type Tag = string | "All";
const defaultTag: Tag = "Showcases";

export function GallerySearch({
  setSearchResults,
  setTag,
}: {
  setSearchResults: (newSearchResults: PagefindSearchFragment[] | null) => void;
  setTag: (newTag: Tag) => void;
}) {
  const pagefind = useRef<Pagefind>(null);
  const isFirstLoad = useRef(true);
  const [pagefindLoaded, setPagefindLoaded] = useState(false);
  const [availableFilters, setAvailableFilters] =
    useState<PagefindFilterCounts>({ tags: {} });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentTag, setCurrentTag] = useState<Tag>(defaultTag);
  const [searchState, setSearchState] = useState<ProcessStatus>("NOT_STARTED");

  const requestId = useRef<number>(0);

  useEffect(() => {
    async function doSearch() {
      if (!pagefind.current) {
        return;
      }

      setSearchState("IN_PROGRESS");
      const searchString = searchTerm;
      if (!searchString || searchString === "") {
        setSearchResults(null);
        setSearchState("COMPLETE");
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
        setSearchState("COMPLETE");
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
      {searchState === "IN_PROGRESS" && <Spinner />}
      <TextBox.Root className="search-input">
        <TextBox.Icon href={search} />
        <TextBox.Input
          ref={inputRef}
          disabled={!pagefindLoaded}
          onChange={(e) => {
            if (debounceTimeout.current) {
              clearInterval(debounceTimeout.current);
            }
            const newSearchTerm = e.target.value;
            pagefind.current?.preload(newSearchTerm);
            if (newSearchTerm === "") {
              // Instantly update for a more reactive feel when clearing the input
              console.log("early clear");
              setSearchTerm("");
              return;
            }
            debounceTimeout.current = setTimeout(() => {
              setSearchTerm(newSearchTerm);
            }, 300);
          }}
          placeholder="Search gallery"
        />
        {!!searchTerm && (
          <IconButton
            className="clear-btn"
            icon={close}
            label="Clear"
            onClick={(e) => {
              console.log(e);
              setSearchTerm("");
              if (inputRef.current) {
                inputRef.current.value = "";
                inputRef.current.focus();
              }
            }}
          ></IconButton>
        )}
      </TextBox.Root>
      <Select.Root>
        <Select.HtmlSelect
          className="tag-select"
          disabled={!pagefindLoaded}
          onChange={(e) => {
            setCurrentTag(e.target.value);
            setTag(e.target.value);
          }}
          value={defaultTag}
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
  loadDemo,
}: {
  item: GalleryItem;
  loadDemo: (demo: GalleryItem, switchToCode: boolean) => void;
}) {
  const thumbnailPath = item.thumbnail
    ? `${GALLERY_BASE}/${item.id}/${item.thumbnail}`
    : `./images/placeholder-thumbnail.jpg`;
  return (
    <a
      className="card"
      href={`${getBaseUrl()}?id=${item.id}`}
      onClick={(e) => {
        e.preventDefault();
        loadDemo(item, false);
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
      <IconButton
        icon={script}
        label="Open code"
        onClick={() => {
          loadDemo(item, true);
        }}
        className="open-code-btn"
      />
    </a>
  );
}

function Gallery({
  galleryItems,
  loadDemo,
  hidden,
}: {
  galleryItems: GalleryItem[];
  loadDemo: (demo: GalleryItem, switchToCode: boolean) => void;
  hidden: boolean;
}) {
  const [searchResults, setSearchResults] = useState<
    PagefindSearchFragment[] | null
  >(null);
  const [currentTag, setCurrentTag] = useState<Tag>(defaultTag);

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
              loadDemo={loadDemo}
            ></GalleryCard>
          );
        })}
      </div>
    </div>
  );
}

export default Gallery;
