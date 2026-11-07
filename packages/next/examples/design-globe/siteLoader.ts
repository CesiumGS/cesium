// What the design globe loads, and in what order (plan 4b Task 18): each
// site's tilesets (both placements where it has them, retaining geometry
// for the morph and the snaps), the generator's answers, then PROJ, the
// grid catalog and the site's grids, through which `georeferenceTileset`
// places each tileset from its own declaration. Each step reports a named
// item to the status (page.ts `nextLoading`); a failed step clears its
// promise, so `retry` runs it again.
import { georeferenceTileset } from "../../src/engineering/georeferenceTileset.ts";
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import {
  gridSource,
  loadGrids,
  loadProj,
  type GridSource,
  type ProjApi,
} from "../../src/engineering/proj.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "../../widgets/index.ts";
import { loadAnswers, type Answers } from "./answers.ts";
import {
  EXAGGERATION,
  GRID_MODELS,
  type LoadEvent,
  type SiteEntry,
} from "./page.ts";
import type { SiteView } from "./panel/model.ts";
import { PlacementPair, type PairLook } from "./placementPair.ts";

/** Where the store's design-globe directory is served. */
export const STORE = "/frames-data/design-globe/";
export const PROJ_BASE = "/frames-data/proj/";
export const GRID_BASE = "/proj-grids/";
/** The one command that writes the store's design-globe data. */
export const SETUP = "npm run setup -- --skip-build";

/** What one site has loaded. */
export interface SiteRuntime {
  readonly entry: SiteEntry;
  rigid?: Tileset3D;
  reprojected?: Tileset3D;
  rigidPlacement?: TilesetPlacement;
  reprojectedPlacement?: TilesetPlacement;
  pair?: PlacementPair;
  /** The loads under way (cleared on failure, so Retry runs them again). */
  tiles?: Promise<void>;
  frame?: Promise<void>;
  view?: Pick<SiteView, "frame" | "story">;
}

export const isAbort = (e: unknown): boolean =>
  e instanceof DOMException && e.name === "AbortError";
export const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
/** What the frames store doesn't have (setup not run). */
export class MissingError extends Error {}
/** A fetch the store didn't have. */
export const isMissing = (e: unknown): boolean =>
  e instanceof MissingError ||
  /\b404\b|Not Found|: not JSON$/.test(messageOf(e));

export interface LoaderDeps {
  readonly viewer: Viewer;
  readonly scope: DisposableStack;
  readonly signal: AbortSignal;
  readonly look: PairLook;
  report(event: LoadEvent): void;
  disposed(): boolean;
  /** A site's pair was made (the morph applies its state to it). */
  paired(site: SiteRuntime): void;
  /** A site's placements are in. */
  placed(site: SiteRuntime, api: ProjApi): void;
  /** Logged without the token (`scrub`). */
  warn(message: string): void;
}

export interface SiteLoader {
  /** Adds a site's tilesets (both placements where it has them). */
  loadTiles(site: SiteRuntime): Promise<void>;
  /** The site's grids, each its own item with bytes, then its placements. */
  loadFrame(site: SiteRuntime): Promise<void>;
  /** The generator's answers (`answers.json`), checked. */
  loadAnswers(): Promise<Answers>;
}

export function createSiteLoader(deps: LoaderDeps): SiteLoader {
  const { viewer, scope, signal, report } = deps;
  let proj: Promise<ProjApi> | undefined;
  let catalog: Promise<GridSource> | undefined;

  /**
   * Whether the store has a tileset at `path`: a dev server answers a
   * missing file with its own page, so the answer must be JSON.
   */
  async function isTileset(path: string): Promise<boolean> {
    const r = await fetch(`${STORE}${path}tileset.json`, {
      method: "HEAD",
      signal,
    }).catch(() => undefined);
    return (
      r !== undefined &&
      r.ok &&
      /json/.test(r.headers.get("Content-Type") ?? "")
    );
  }

  function loadTiles(site: SiteRuntime): Promise<void> {
    site.tiles ??= (async () => {
      const id = `tiles:${site.entry.id}`;
      report({ type: "start", id, label: `${site.entry.name}: tiles` });
      const add = (path: string) =>
        viewer.addTileset(`${STORE}${path}tileset.json`, {
          retainGeometry: true,
        });
      try {
        const { tilesets } = site.entry;
        let pair = tilesets.reprojected
          ? { rigid: tilesets.rigid, reprojected: tilesets.reprojected }
          : undefined;
        if (pair === undefined && tilesets.pair !== undefined) {
          // The scale ladder's pair, when setup has written it (Task 17b).
          if (await isTileset(tilesets.pair.reprojected)) {
            pair = tilesets.pair;
          }
        }
        if (!(await isTileset(pair?.rigid ?? tilesets.rigid))) {
          throw new MissingError(`${STORE}${pair?.rigid ?? tilesets.rigid}`);
        }
        const [rigid, reprojected] = await Promise.all([
          add(pair?.rigid ?? tilesets.rigid),
          pair ? add(pair.reprojected) : undefined,
        ]);
        if (deps.disposed()) {
          viewer.remove(rigid);
          if (reprojected) {
            viewer.remove(reprojected);
          }
          return;
        }
        site.rigid = rigid;
        scope.defer(() => viewer.remove(rigid));
        if (reprojected !== undefined) {
          site.reprojected = reprojected;
          scope.defer(() => viewer.remove(reprojected));
          // The farthest a vertex moves, in the rigid tiles' model units
          // (US survey feet for the corridor), at the largest exaggeration:
          // 40 m of error at most anywhere on the ladder (Task 17b's table).
          site.pair = new PlacementPair(
            viewer.world,
            rigid,
            reprojected,
            deps.look,
            (40 * EXAGGERATION) / 0.3,
          );
          scope.defer(() => site.pair?.dispose());
          deps.paired(site);
        }
        watchTiles(site, id);
      } catch (error) {
        site.tiles = undefined;
        if (isAbort(error) || deps.disposed()) {
          return;
        }
        report(
          isMissing(error)
            ? {
                type: "missing",
                id,
                detail: `${site.entry.name}'s tilesets aren't in the frames store. Generate them once, in packages/next: ${SETUP}`,
              }
            : {
                type: "error",
                id,
                detail: `${site.entry.name}'s tiles didn't load: ${messageOf(error)}`,
              },
        );
        throw error;
      }
    })();
    return site.tiles;
  }

  /** The tiles' item: fetching with bytes until the first view is in. */
  function watchTiles(site: SiteRuntime, id: string): void {
    const step = () => {
      if (deps.disposed()) {
        return;
      }
      const sets = [site.rigid, site.reprojected].filter(
        (t): t is Tileset3D => t !== undefined,
      );
      const received = sets.reduce((n, t) => n + t.stats.bytesReceived, 0);
      const settled = sets.every(
        (t) => t.firstContentAt !== undefined && t.idle,
      );
      if (settled) {
        const tiles = sets.reduce((n, t) => n + t.stats.loaded, 0);
        report({ type: "progress", id, file: "tiles", received });
        report({
          type: "ready",
          id,
          detail: `${tiles} tiles in view${sets.length > 1 ? ", both placements" : ""}`,
        });
        return;
      }
      report({ type: "progress", id, file: "tiles", received });
      setTimeout(step, 250);
    };
    step();
  }

  function loadPROJ(): Promise<ProjApi> {
    proj ??= (async () => {
      report({ type: "start", id: "proj", label: "PROJ" });
      try {
        const api = await loadProj({
          base: PROJ_BASE,
          onProgress: (file, received, total) =>
            report({
              type: "progress",
              id: "proj",
              file,
              received,
              ...(total !== undefined && { total }),
            }),
        });
        report({
          type: "ready",
          id: "proj",
          detail: "WebAssembly and proj.db, verified",
        });
        return api;
      } catch (error) {
        proj = undefined;
        report(
          isMissing(error)
            ? {
                type: "missing",
                id: "proj",
                detail: `PROJ isn't in the frames store. Run once, in packages/next: ${SETUP}`,
              }
            : {
                type: "error",
                id: "proj",
                detail: `PROJ didn't load: ${messageOf(error)}. If the frames store isn't set up yet, run ${SETUP} in packages/next.`,
              },
        );
        throw error;
      }
    })();
    return proj;
  }

  function loadCatalog(): Promise<GridSource> {
    catalog ??= (async () => {
      report({ type: "start", id: "catalog", label: "Grid catalog" });
      try {
        const source = await gridSource({
          base: GRID_BASE,
          onProgress: (file, received, total) =>
            report({
              type: "progress",
              id: "catalog",
              file,
              received,
              ...(total !== undefined && { total }),
            }),
        });
        report({
          type: "ready",
          id: "catalog",
          detail: `PROJ-data ${source.catalog.version}, verified`,
        });
        return source;
      } catch (error) {
        catalog = undefined;
        report({
          type: "error",
          id: "catalog",
          detail: `The grid catalog didn't load from ${GRID_BASE}: ${messageOf(error)}`,
        });
        throw error;
      }
    })();
    return catalog;
  }

  function loadFrame(site: SiteRuntime): Promise<void> {
    site.frame ??= (async () => {
      try {
        const [api, source] = await Promise.all([loadPROJ(), loadCatalog()]);
        await loadTiles(site);
        await Promise.all(
          site.entry.grids.map(async (name) => {
            const id = `grid:${name}`;
            report({
              type: "start",
              id,
              label: `${GRID_MODELS[name] ?? name} grid`,
            });
            try {
              await loadGrids(api, source, [name], {
                onProgress: (file, received, total) =>
                  report({
                    type: "progress",
                    id,
                    file,
                    received,
                    ...(total !== undefined && { total }),
                  }),
              });
              const entry = source.catalog.get(name);
              report({
                type: "ready",
                id,
                ...(entry && { detail: `${entry.agency}, verified` }),
              });
            } catch (error) {
              report({
                type: "error",
                id,
                detail: `${name} didn't load from ${GRID_BASE}: ${messageOf(error)}`,
              });
              throw error;
            }
          }),
        );
        if (deps.disposed()) {
          return;
        }
        const placeId = `frame:${site.entry.id}`;
        report({
          type: "start",
          id: placeId,
          label: `${site.entry.name}: placements`,
        });
        try {
          const options = { proj: api, grids: source };
          const placed = await Promise.all(
            [site.rigid, site.reprojected].map((t) =>
              t ? georeferenceTileset(t, options) : undefined,
            ),
          );
          for (const p of placed) {
            if (p?.mode === "rigid") {
              site.rigidPlacement = p;
            } else if (p?.mode === "reprojected") {
              site.reprojectedPlacement = p;
            }
          }
          report({
            type: "ready",
            id: placeId,
            detail: "placed from each tileset's own declaration",
          });
        } catch (error) {
          report({ type: "error", id: placeId, detail: messageOf(error) });
          throw error;
        }
        deps.placed(site, api);
      } catch (error) {
        site.frame = undefined;
        if (!isAbort(error) && !deps.disposed()) {
          deps.warn(messageOf(error));
        }
      }
    })();
    return site.frame;
  }

  return {
    loadTiles,
    loadFrame,
    loadAnswers: () => loadAnswers(`${STORE}answers.json`, signal),
  };
}
