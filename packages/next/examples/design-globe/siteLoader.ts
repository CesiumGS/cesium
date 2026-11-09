// What the design globe loads, and in what order (plan 4b Task 18): each
// site's one tileset (retaining geometry for the snaps), the generator's
// answers, then PROJ, the grid catalog and the site's grids, through which
// `georeferenceTileset` places the tileset from its own declaration, and the
// frame gives its second position's placement. Each step reports a named
// item to the status (page.ts `nextLoading`); a failed step clears its
// promise, so `retry` runs it again.
import { georeferenceTileset } from "../../src/engineering/georeferenceTileset.ts";
import {
  placeReprojected,
  type TilesetPlacement,
} from "../../src/engineering/placement.ts";
import {
  gridSource,
  loadGrids,
  loadProj,
  type GridSource,
  type ProjApi,
} from "../../src/engineering/proj.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { Viewer } from "@cesium/next/widgets";
import { loadAnswers, type Answers } from "./answers.ts";
import {
  GRID_MODELS,
  probeVerdict,
  type LoadEvent,
  type SiteEntry,
} from "./page.ts";
import type { SiteView } from "./panel/model.ts";
import {
  SiteDrawings,
  hasSecondPosition,
  type PlacementLook,
} from "./siteDrawings.ts";

/** Where the store's design-globe directory is served. */
export const STORE = "/frames-data/design-globe-dual/";
export const PROJ_BASE = "/frames-data/proj/";
export const GRID_BASE = "/proj-grids/";
/** The one command that writes the store's design-globe data. */
export const SETUP = "npm run setup -- --skip-build";

/** What one site has loaded. */
export interface SiteRuntime {
  readonly entry: SiteEntry;
  tileset?: Tileset3D;
  rigidPlacement?: TilesetPlacement;
  reprojectedPlacement?: TilesetPlacement;
  /** How its tileset is drawn, where it carries both placements. */
  drawings?: SiteDrawings;
  /** The loads under way (cleared on failure, so Retry runs them again). */
  tiles?: Promise<void>;
  /** Its tiles' content failed: Retry reloads its tilesets. */
  tilesFailed?: boolean;
  /** Bumped when its tiles (re)load: an older `watchTiles` loop stops. */
  watching?: number;
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
  readonly look: PlacementLook;
  report(event: LoadEvent): void;
  disposed(): boolean;
  /** A site's drawings were made (the morph applies its state to them). */
  paired(site: SiteRuntime): void;
  /** A site's placements are in. */
  placed(site: SiteRuntime, api: ProjApi): void;
  /** Logged without the token (`scrub`). */
  warn(message: string): void;
}

export interface SiteLoader {
  /** Adds a site's tileset. */
  loadTiles(site: SiteRuntime): Promise<void>;
  /** The site's grids, each its own item with bytes, then its placements. */
  loadFrame(site: SiteRuntime): Promise<void>;
  /** The generator's answers (`answers.json`), checked; reported as an item. */
  loadAnswers(): Promise<Answers>;
  /** Reloads what failed for these sites (their tiles, frames) and the answers. */
  retry(sites: Iterable<SiteRuntime>): Promise<void>;
}

export function createSiteLoader(deps: LoaderDeps): SiteLoader {
  const { viewer, scope, signal, report } = deps;
  let proj: Promise<ProjApi> | undefined;
  let catalog: Promise<GridSource> | undefined;
  let answers: Promise<Answers> | undefined;

  /**
   * What the store says about a tileset at `path` (page.ts `probeVerdict`):
   * a dev server answers a missing file with its own page, so the answer
   * must be JSON; a 5xx is the server failing, not the file missing.
   */
  async function probe(
    path: string,
  ): Promise<{ verdict: "ok" | "missing" | "error"; status?: number }> {
    const r = await fetch(`${STORE}${path}tileset.json`, {
      method: "HEAD",
      signal,
    }).catch(() => undefined);
    return {
      verdict: probeVerdict(
        r?.status,
        r?.headers.get("Content-Type") ?? undefined,
      ),
      ...(r && { status: r.status }),
    };
  }

  function loadTiles(site: SiteRuntime): Promise<void> {
    site.tiles ??= (async () => {
      const id = `tiles:${site.entry.id}`;
      report({
        type: "start",
        id,
        label: `${site.entry.name}: tiles`,
        ...siteTag(site),
      });
      try {
        const path = site.entry.tileset;
        const found = await probe(path);
        if (found.verdict === "missing") {
          throw new MissingError(`${STORE}${path}`);
        }
        if (found.verdict === "error") {
          throw new Error(
            `${STORE}${path}tileset.json: ${found.status !== undefined ? `HTTP ${found.status}` : "no answer"}`,
          );
        }
        const tileset = await viewer.addTileset(`${STORE}${path}tileset.json`, {
          retainGeometry: true,
        });
        if (deps.disposed()) {
          viewer.remove(tileset);
          return;
        }
        site.tileset = tileset;
        scope.defer(() => viewer.remove(tileset));
        if (hasSecondPosition(tileset)) {
          site.drawings = new SiteDrawings(viewer.world, tileset, deps.look);
          scope.defer(() => site.drawings?.dispose());
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
                detail: `${site.entry.name}'s tilesets aren't in the frames store. Generate them once, in packages/next:`,
                command: SETUP,
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

  /**
   * The tiles' item: fetching with bytes until the first view is in, an
   * error (with Retry) as soon as any content fails; after that, a failure
   * later on (while flying) is its own error item.
   */
  function watchTiles(site: SiteRuntime, id: string): void {
    let ready = false;
    const generation = (site.watching = (site.watching ?? 0) + 1);
    const step = () => {
      if (
        deps.disposed() ||
        site.tiles === undefined ||
        site.watching !== generation
      ) {
        return;
      }
      const tileset = site.tileset;
      if (tileset === undefined) {
        return;
      }
      const failed = [...tileset.warnings].filter((w) =>
        w.startsWith("content failed"),
      );
      if (failed.length > 0) {
        site.tilesFailed = true;
        report({
          type: "error",
          ...siteTag(site),
          id: ready ? `${id}:later` : id,
          detail: `${site.entry.name}: ${failed.length === 1 ? "a tile" : `${failed.length} tiles`} didn't load (${failed[0]!.replace(/^content failed: /, "")}).`,
        });
        return;
      }
      if (ready) {
        setTimeout(step, 1000);
        return;
      }
      const received = tileset.stats.bytesReceived;
      if (tileset.firstContentAt !== undefined && tileset.idle) {
        report({ type: "progress", id, file: "tiles", received });
        report({
          type: "ready",
          id,
          detail: `${tileset.stats.loaded} tiles in view${site.drawings !== undefined ? ", both placements" : ""}`,
        });
        ready = true;
        setTimeout(step, 1000);
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
                detail:
                  "PROJ isn't in the frames store. Run once, in packages/next:",
                command: SETUP,
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
          ...siteTag(site),
        });
        try {
          const placed =
            site.tileset &&
            (await georeferenceTileset(site.tileset, {
              proj: api,
              grids: source,
            }));
          if (placed?.mode === "rigid") {
            site.rigidPlacement = placed;
            if (site.drawings !== undefined) {
              // The second position is the frame's image of each design point.
              site.reprojectedPlacement = placeReprojected(placed.frame);
            }
          }
          report({
            type: "ready",
            id: placeId,
            detail: "placed from its tileset's own declaration",
          });
        } catch (error) {
          report({
            type: "error",
            id: placeId,
            detail: `${site.entry.name}: its placement failed the engine's check of the tileset's own declaration, so it is drawn but has no facts or story.`,
            technical: messageOf(error),
          });
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

  /**
   * One site's own items stay on that site (page.ts `loadingFor`); the
   * corridor's are everyone's, as it loads first and its openers are the page's.
   */
  function siteTag(site: SiteRuntime): { site?: string } {
    return site.entry.id === "corridor" ? {} : { site: site.entry.id };
  }

  function loadTheAnswers(): Promise<Answers> {
    answers ??= (async () => {
      report({
        type: "start",
        id: "answers",
        label: "The generator's answers",
      });
      try {
        const a = await loadAnswers(`${STORE}answers.json`, signal);
        report({
          type: "ready",
          id: "answers",
          detail: "answers.json, checked",
        });
        return a;
      } catch (error) {
        answers = undefined;
        if (!isAbort(error) && !deps.disposed()) {
          report(
            isMissing(error)
              ? {
                  type: "missing",
                  id: "answers",
                  detail:
                    "The design globe's answers aren't in the frames store. Run once, in packages/next:",
                  command: SETUP,
                }
              : { type: "error", id: "answers", detail: messageOf(error) },
          );
        }
        throw error;
      }
    })();
    return answers;
  }

  /** Takes a site's tileset out, so its tiles load again from the start. */
  function unload(site: SiteRuntime): void {
    // Its old watcher stops (a new one starts with the new tilesets).
    site.watching = (site.watching ?? 0) + 1;
    for (const id of [
      `tiles:${site.entry.id}`,
      `tiles:${site.entry.id}:later`,
    ]) {
      report({ type: "clear", id });
    }
    site.drawings?.dispose();
    if (site.tileset !== undefined) {
      viewer.remove(site.tileset);
    }
    delete site.drawings;
    delete site.tileset;
    delete site.rigidPlacement;
    delete site.reprojectedPlacement;
    delete site.tiles;
    delete site.frame;
    delete site.view;
    site.tilesFailed = false;
  }

  async function retry(sites: Iterable<SiteRuntime>): Promise<void> {
    const runs: Promise<unknown>[] = [loadTheAnswers().catch(() => {})];
    for (const site of sites) {
      if (site.tilesFailed) {
        unload(site);
      }
      runs.push(
        loadTiles(site)
          .then(() => loadFrame(site))
          .catch(() => {}),
      );
    }
    await Promise.all(runs);
  }

  return { loadTiles, loadFrame, loadAnswers: loadTheAnswers, retry };
}
