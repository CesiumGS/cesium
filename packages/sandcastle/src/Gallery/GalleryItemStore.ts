import {
  startTransition,
  useEffect,
  useState,
  useTransition,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { getBaseUrl } from "../util/getBaseUrl.ts";
import { loadFromUrl } from "./loadFromUrl.ts";
import { vectorSearch, type VectorSearchResult } from "./EmbeddingSearch.ts";

const galleryListPath = `gallery/list.json`;

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

export type HighlightedGalleryItem = GalleryItem & {
  searchRank?: number;
  searchDistance?: number;
};

export type GalleryFilter = Record<string, string | string[]> | null;
export type GalleryFilters = Record<string, Record<string, number>> | null;

export function useGalleryItemStore() {
  // Gallery items
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [legacyIds, setLegacyIds] = useState<Record<string, string>>({});

  // Filters
  const [defaultSearchFilter, setDefaultSearchFilter] =
    useState<GalleryFilter>(null);

  // Searches
  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<GalleryFilter>(null);
  const [searchResults, setSearchResults] = useState<
    VectorSearchResult[] | null
  >(null);
  const [isSearchPending, startSearch] = useTransition();
  if (defaultSearchFilter !== null && searchFilter === null) {
    setSearchFilter(defaultSearchFilter);
  }

  // Perform vector search when search term changes (with debounce)
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      startTransition(() => setSearchResults(null));
      return;
    }

    // Debounce: wait 100ms after user stops typing
    const timeoutId = setTimeout(() => {
      const performSearch = async () => {
        try {
          const results = await vectorSearch(searchTerm, 20);
          setSearchResults(results);
        } catch (error) {
          console.error("Vector search failed:", error);
          setSearchResults([]);
        }
      };

      // Wrap only the state update in a transition, not the async search
      startSearch(performSearch);
    }, 100);

    // Cleanup: cancel the timeout if searchTerm changes before 300ms
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const memoizedSearchResults = useMemo(() => {
    if (!searchResults || searchResults.length === 0) {
      return items ?? [];
    }

    // Map vector search results to gallery items
    const mapped = searchResults
      .map(
        (result: {
          legacy_id: string;
          id: string;
          rank: number;
          distance: number;
        }) => {
          // Find the item by matching the legacy_id to the slug
          // The legacyIds map should provide legacy_id -> slug mapping
          const slug = legacyIds[result.legacy_id];

          const item = items.find((item: { id: string; url: string }) => {
            // Try matching by slug first (if we have it)
            if (slug && item.id === slug) {
              return true;
            }
            // Fallback: try matching by legacy_id directly
            if (item.id === result.legacy_id || item.id === result.id) {
              return true;
            }
            // Also check the URL path
            const itemId = item.url.split("/").filter(Boolean).pop() || "";
            return itemId === result.id || itemId === result.legacy_id;
          });

          if (!item) {
            console.warn(
              "[GalleryItemStore] Could not find gallery item for search result:",
              result,
            );
            return undefined;
          }

          // Return item with search metadata (no highlighting for vector search)
          return {
            ...item,
            searchRank: result.rank,
            searchDistance: result.distance,
          };
        },
      )
      .filter(Boolean);

    return mapped;
  }, [items, searchResults, legacyIds]);

  // Derive gallery filters from items using useMemo
  const galleryFilters = useMemo(() => {
    if (items.length === 0) {
      return null;
    }

    // Extract all unique labels from items
    const labelSet = new Set<string>();
    items.forEach((item: { labels: string[] }) => {
      item.labels.forEach((label) => labelSet.add(label));
    });

    // Create filter structure similar to Pagefind
    const filters: GalleryFilters = {
      labels: Object.fromEntries(
        Array.from(labelSet).map((label) => [
          label,
          items.filter((item: { labels: string | string[] }) =>
            item.labels.includes(label),
          ).length,
        ]),
      ),
    };

    return filters;
  }, [items]);

  // Kick off initial gallery fetch
  useEffect(() => {
    const fetchItemsAction = async () => {
      const baseUrl = getBaseUrl();
      const galleryListUrl = new URL(galleryListPath, baseUrl);
      const request = await fetch(galleryListUrl.href);
      const { entries, legacyIds, defaultFilters } = await request.json();
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

      // See https://react.dev/reference/react/useTransition#react-doesnt-treat-my-state-update-after-await-as-a-transition
      startTransition(() => {
        setItems(items);
        setLegacyIds(legacyIds);
        setDefaultSearchFilter(defaultFilters);
        setGalleryLoaded(true);
      });
    };

    startTransition(fetchItemsAction);
  }, []);

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
      if (isFirstSearch) {
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
