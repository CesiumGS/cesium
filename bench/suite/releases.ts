import { useEffect, useState } from "react";

/** Releases the dev server can serve (vite.config.ts `serveReleases`). */
export interface AvailableReleases {
  /** In the store: they start at once. */
  installed: string[];
  /** npm's latest stable releases: fetched from npm the first time used. */
  recent: string[];
}

let cached: Promise<AvailableReleases> | undefined;

/** The releases the dev server lists (once per page; empty when offline). */
export function useAvailableReleases(): AvailableReleases {
  const [releases, setReleases] = useState<AvailableReleases>({
    installed: [],
    recent: [],
  });
  useEffect(() => {
    cached ??= fetch("/cesium-release/index.json")
      .then((r) =>
        r.ok ? (r.json() as Promise<AvailableReleases>) : undefined,
      )
      .then((r) => r ?? { installed: [], recent: [] })
      .catch(() => ({ installed: [], recent: [] }));
    let live = true;
    void cached.then((r) => live && setReleases(r));
    return () => {
      live = false;
    };
  }, []);
  return releases;
}
