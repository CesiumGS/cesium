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
import { applyHighlightToItem } from "./applyHighlight.tsx";
import { loadFromUrl } from "./loadFromUrl.ts";
import "../../@types/pagefind-client.d.ts";

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
  const [isSearchPending, startSearch] = useTransition();
  useEffect(() => {
    const pagefind = getPagefind();
    if (!pagefind) {
      return;
    }

    startSearch(async () => {
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
      startSearch(() => setSearchResults(values));
    });
  }, [searchTerm, searchFilter]);

  const memoizedSearchResults = useMemo(() => {
    if (!searchResults) {
      return items ?? [];
    }

    return searchResults.map((result) => {
      const { id } = result.meta;
      const item = items.find((item) => item.id === id);

      if (!item) {
        return;
      }

      return applyHighlightToItem(item, result);
    });
  }, [items, searchResults]);

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
