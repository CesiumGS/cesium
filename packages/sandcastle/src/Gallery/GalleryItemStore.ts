import {
  startTransition,
  useEffect,
  useState,
  useTransition,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { getBaseUrl } from "../util/getBaseUrl.ts";
import { applyHighlightToItem, formatVectorSearch } from "./applyHighlight.tsx";
import { loadFromUrl } from "./loadFromUrl.ts";
import "../../@types/pagefind-client.d.ts";
import {
  vectorSearch,
  type VectorSearchResult,
  onEmbeddingModelLoaded,
  initializeEmbeddingSearch,
} from "./EmbeddingSearch.ts";
import { SettingsContext } from "../SettingsContext.ts";

const galleryListPath = `gallery/list.json`;
const pagefindUrl = `gallery/pagefind/pagefind.js`;

export type GalleryItem = {
  url: string;
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  labels: string[];
  getJsCode: () => Promise<string>;
  getHtmlCode: () => Promise<string>;
  lineCount: number;
  codeExerpts?: string;
};

export type HighlightedGalleryItem = ReturnType<typeof applyHighlightToItem>;

export type GalleryFilter = Record<string, string | string[]> | null;
export type GalleryFilters = PagefindFilterCounts | null;

export function useGalleryItemStore() {
  const { settings } = useContext(SettingsContext);
  const embeddingSearchEnabled = settings.embeddingSearch;

  // Pagefind library and config
  const pagefindRef = useRef<Pagefind>(null);
  const getPagefind = () => {
    return pagefindRef.current;
  };
  const [searchOptions, setSearchOptions] = useState<null | Record<
    string,
    string | object
  >>(null);

  // Gallery items
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [legacyIds, setLegacyIds] = useState<Record<string, string>>({});
  const entriesRef = useRef<GalleryItem[]>([]);

  // Filters
  const [galleryFilters, setGalleryFilters] = useState<GalleryFilters>(null);
  const [defaultSearchFilter, setDefaultSearchFilter] =
    useState<GalleryFilter>(null);

  // Searches
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<GalleryFilter>(null);
  const [searchResults, setSearchResults] = useState<
    PagefindSearchFragment[] | null
  >(null);
  const [vectorSearchResults, setVectorSearchResults] = useState<
    VectorSearchResult[] | null
  >(null);
  const [isSearchPending, startSearch] = useTransition();
  const [embeddingModelLoaded, setEmbeddingModelLoaded] = useState(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onEmbeddingModelLoaded(() => {
      setEmbeddingModelLoaded(true);
    });
  }, []);

  useEffect(() => {
    const pagefind = getPagefind();
    if (!pagefind) {
      return;
    }

    // Search abort logic handles the issue of race conditions as the user types out a search, which launches multiple async searches
    searchAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    const performSearch = async () => {
      /* @ts-expect-error: null is a valid search term value */
      const { results } = await pagefind.search(searchTerm, {
        filters: searchFilter,
      });
      const data = await Promise.allSettled(
        results.map((result) => result.data()),
      );

      const isFulfilled = <T>(
        input: PromiseSettledResult<T>,
      ): input is PromiseFulfilledResult<T> => input.status === "fulfilled";

      const values = data.filter(isFulfilled).map(({ value }) => value);

      if (abortController.signal.aborted) {
        return;
      }

      startSearch(() => setSearchResults(values));
    };

    performSearch();

    const embeddingTimeout = setTimeout(async () => {
      if (abortController.signal.aborted) {
        return;
      }

      if (
        embeddingSearchEnabled &&
        embeddingModelLoaded &&
        searchTerm !== null &&
        searchTerm.trim() !== ""
      ) {
        const vectorResults = await vectorSearch(searchTerm, 5, searchFilter);
        if (!abortController.signal.aborted) {
          startSearch(() => setVectorSearchResults(vectorResults));
        }
      } else {
        startSearch(() => setVectorSearchResults(null));
      }
    }, 100);

    return () => {
      abortController.abort();
      clearTimeout(embeddingTimeout);
    };
  }, [searchTerm, searchFilter, embeddingModelLoaded, embeddingSearchEnabled]);

  const memoizedSearchResults = useMemo(() => {
    if (!searchResults) {
      return items ?? [];
    }

    const pagefindResults = searchResults.map((result) => {
      const { id } = result.meta;
      const item = items.find((item) => item.id === id);

      if (!item) {
        return;
      }

      return applyHighlightToItem(item, result);
    });

    if (vectorSearchResults && vectorSearchResults.length > 0) {
      for (const vectorResult of vectorSearchResults.reverse()) {
        // This similarity threshold is the cutoff for showing a vector search result
        // There is a tradeoff depending on user query complexity
        // Often, shorter queries may want a slightly higher threshold (~0.75)
        // However, this number was based on testing with more complex queries
        const similarity_threshold = 0.727;
        if (vectorResult.score < similarity_threshold) {
          continue;
        }

        const exists = pagefindResults.find(
          (res) => res && res.id === vectorResult.id,
        );

        if (exists) {
          pagefindResults.splice(pagefindResults.indexOf(exists), 1);
          pagefindResults.unshift(exists);
          continue;
        } else {
          const item = items.find((item) => item.id === vectorResult.id);
          if (item) {
            pagefindResults.unshift(formatVectorSearch(item));
          }
        }
      }
      return pagefindResults;
    }

    return pagefindResults;
  }, [items, searchResults, vectorSearchResults]);

  // Pagefind search configuration is loaded with the rest of the gallery options.
  // Once we've loaded those options, load and intiate pagefind.
  useEffect(() => {
    const fetchPagefindAction = async () => {
      let pagefind = getPagefind();
      if (!pagefind) {
        const baseUrl = getBaseUrl();
        const url = new URL(pagefindUrl, baseUrl);
        pagefind = await import(/* @vite-ignore */ url.href);
        pagefindRef.current = pagefind;

        if (!pagefind) {
          console.error(`Pagefind failed to load from ${pagefindUrl}`);
          return;
        }

        pagefind.init();

        await pagefind.options({
          baseUrl,
          ...searchOptions,
        });
      }

      const filters = await pagefind.filters();

      // See https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition
      startTransition(() => {
        setGalleryFilters(filters);
        setSearchFilter(defaultSearchFilter);
      });
    };

    if (searchOptions) {
      startTransition(fetchPagefindAction);
    }
  }, [searchOptions, defaultSearchFilter]);

  // Kick off initial gallery fetch
  useEffect(() => {
    const fetchItemsAction = async () => {
      const baseUrl = getBaseUrl();
      const galleryListUrl = new URL(galleryListPath, baseUrl);
      const request = await fetch(galleryListUrl.href);
      const { entries, searchOptions, legacyIds, defaultFilters } =
        await request.json();

      const items = entries.map((entry: GalleryItem) => {
        let entryUrl = entry.url;
        if (!entryUrl.endsWith("/")) {
          entryUrl += "/";
        }
        const galleryBaseUrl = new URL(entryUrl, baseUrl);

        const getJsCode = async () => {
          const url = new URL("main.js", galleryBaseUrl);
          const req = await fetch(url.href);
          return await req.text();
        };

        const getHtmlCode = async () => {
          const url = new URL("index.html", galleryBaseUrl);
          const req = await fetch(url.href);
          return await req.text();
        };

        return {
          ...entry,
          getJsCode,
          getHtmlCode,
        };
      });

      entriesRef.current = entries;

      // See https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition
      startTransition(() => {
        setItems(items);
        setLegacyIds(legacyIds);
        setSearchOptions(searchOptions);
        setDefaultSearchFilter(defaultFilters);
        setGalleryLoaded(true);
      });
    };

    startTransition(fetchItemsAction);
  }, []);

  useEffect(() => {
    if (
      embeddingSearchEnabled &&
      !embeddingModelLoaded &&
      entriesRef.current.length > 0
    ) {
      initializeEmbeddingSearch({
        entries: entriesRef.current,
        legacyIds,
      });
    }
  }, [embeddingSearchEnabled, embeddingModelLoaded, legacyIds]);

  const useLoadFromUrl = useCallback(() => {
    const isGalleryLoaded = items.length > 0;
    return isGalleryLoaded ? () => loadFromUrl(items, legacyIds) : null;
  }, [items, legacyIds]);

  const [isFirstSearch, setFirstSearch] = useState(true);
  const setSearchTermWrapper = useCallback(
    (newSearchTerm: string | null) => {
      // the default label filter for Showcases can be confusing when it doesn't
      // search everything after page load. Remove the filter on the first search only
      // to ensure we search everything
      if (
        isFirstSearch &&
        newSearchTerm !== null &&
        newSearchTerm.trim() !== ""
      ) {
        setSearchFilter(null);
        setFirstSearch(false);
      }
      setSearchTerm(newSearchTerm);
    },
    [setSearchTerm, isFirstSearch, setSearchFilter],
  );

  return {
    items,
    galleryLoaded,

    filters: galleryFilters,
    defaultSearchFilter,
    searchFilter,
    searchTerm,
    isSearchPending,
    setSearchTerm: setSearchTermWrapper,
    setSearchFilter,
    searchResults: memoizedSearchResults,

    useLoadFromUrl,
  };
}

export type GalleryItemStore = ReturnType<typeof useGalleryItemStore> | null;
export const StoreContext = createContext<GalleryItemStore>(null);

export function useGalleryItemContext() {
  return useContext(StoreContext);
}
