import {
  useState,
  useTransition,
  createContext,
  useContext,
  useMemo,
  useRef,
} from "react";
import { getBaseUrl } from "../util/getBaseUrl.ts";
import { applyHighlightToItem } from "./applyHighlight.tsx";
import "../../@types/pagefind-client.d.ts";

const galleryListPath = `/gallery/list.json`;
const pagefindUrl = `/gallery/pagefind/pagefind.js`;

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

export type GalleryFilter = Record<string, string | string[]> | null;
export type GalleryFilters = PagefindFilterCounts | null;

export function useGalleryItemStore() {
  const pagefindRef = useRef<Pagefind>(null);
  const getPagefind = () => {
    return pagefindRef.current;
  };

  const [isPending, startFetch] = useTransition();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [legacyIds, setLegacyIds] = useState<Record<string, string>>({});

  const [filters, setFilters] = useState<GalleryFilters>(null);
  const [defaultSearchFilter, setDefaultSearchFilter] =
    useState<GalleryFilter>(null);
  const [searchFilter, setSearchFilter] = useState<GalleryFilter>(null);

  const [searchTerm, setSearchTerm] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    PagefindSearchFragment[] | null
  >(null);
  const [isSearchPending, startSearch] = useTransition();
  const search = ({ term = searchTerm, filters = searchFilter }) =>
    startSearch(async () => {
      setSearchTerm(term);
      setSearchFilter(filters);

      const pagefind = getPagefind();
      if (!pagefind) {
        return;
      }

      /* @ts-expect-error: null is a valid search term value */
      const { results } = await pagefind.search(term, {
        filters,
      });
      const data = await Promise.allSettled(
        results.map((result) => result.data()),
      );

      const isFulfilled = <T>(
        input: PromiseSettledResult<T>,
      ): input is PromiseFulfilledResult<T> => input.status === "fulfilled";

      const values = data.filter(isFulfilled).map(({ value }) => value);
      setSearchResults(values);
    });

  const fetchItems = () =>
    startFetch(async () => {
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
      setItems(items);
      setLegacyIds(legacyIds);

      let pagefind = getPagefind();
      if (!pagefind) {
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

      setFilters(await pagefind.filters());
      setDefaultSearchFilter(defaultFilters);
      search({ filters: defaultFilters });
    });

  const useSearchResults = useMemo(() => {
    if (!searchResults) {
      return items;
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

  const selectItemById = (searchId: string) =>
    items.find(({ id }) => id === searchId);
  const selectItemByLegacyId = (searchId: string) =>
    selectItemById(legacyIds[searchId]);

  return {
    items,
    selectItemById,
    selectItemByLegacyId,
    isPending,
    fetchItems,

    filters,
    defaultSearchFilter,
    searchFilter,
    searchTerm,
    isSearchPending,
    search,

    useSearchResults,
  };
}

export type GalleryItemStore = ReturnType<typeof useGalleryItemStore> | null;
export const StoreContext = createContext<GalleryItemStore>(null);

export function useGalleryItemContext() {
  return useContext(StoreContext);
}
