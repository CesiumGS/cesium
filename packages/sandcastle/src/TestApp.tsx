import { Input } from "@stratakit/bricks/TextBox";
import { useEffect, useRef, useState } from "react";
import "../pagefind-client.d.ts";

type Pagefind = {
  init: (overrideLanguage?: string) => void;
  search: (
    term: string,
    options?: PagefindSearchOptions,
  ) => Promise<PagefindIndexesSearchResults>;
  preload: (term: string, options?: PagefindSearchOptions) => Promise<void>;
};

function GallerySearch() {
  const pagefind = useRef<Pagefind>(null);
  const isFirstLoad = useRef(true);
  const [pagefindLoaded, setPagefindLoaded] = useState(false);
  const [searchResults, setSearchResults] = useState<PagefindSearchFragment[]>(
    [],
  );

  async function doSearch(str: string) {
    if (!pagefind.current) {
      return;
    }
    console.time(str);
    console.log("doSearch", str);
    const search = await pagefind.current.search(str);
    console.log(search);
    console.log(search.results.length, "results");
    for (const result of search.results) {
      console.log(await result.data());
    }
    console.timeEnd(str);
    const resultData = await Promise.allSettled(
      search.results.map((result) => {
        return result.data();
      }),
    );
    setSearchResults(
      resultData
        .map((result) => {
          return result.status === "fulfilled" ? result.value : undefined;
        })
        .filter((result) => !!result),
    );
  }

  useEffect(() => {
    async function loadPageFind() {
      // @ts-expect-error The module type is not defined from the import alone
      const pagefindImport: Pagefind = await import("../pagefind/pagefind.js");

      console.log(pagefindImport);

      pagefindImport.init();
      pagefind.current = pagefindImport;
      setPagefindLoaded(true);

      // await doSearch("style");
      // await doSearch("viewer");
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
          pagefind.current?.preload(e.target.value);
          debounceTimeout.current = setTimeout(() => {
            doSearch(e.target.value);
          }, 300);
        }}
      />
      {searchResults.map((result) => {
        return <p key={result.meta.id}>{result.meta.title}</p>;
      })}
    </>
  );
}

export default function TestApp() {
  return (
    <>
      <GallerySearch />
    </>
  );
}
