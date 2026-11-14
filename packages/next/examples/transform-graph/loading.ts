import type { Tileset3D } from "@cesium/next";
import { createRefinement, type RefinementSource } from "../refinement.ts";
import type { SceneHost } from "./scene.ts";

/** What a scene's content draws, and is refining. */
export interface Waiting {
  /** A place (radians) whose ground height the scene reads: the card names the terrain until something draws. */
  readonly terrainAt?: { longitude: number; latitude: number };
  /** Streamed tilesets, by the name the card says. */
  readonly tilesets?: ReadonlyArray<{
    readonly name: string;
    readonly tileset: Promise<Tileset3D | undefined> | Tileset3D | undefined;
    /** A tileset that failed is not waited for. */
    failed?: boolean;
  }>;
  /** Anything else the first draw waits for, in words (card only). */
  readonly extra?: () => string | undefined;
  /** A scene that never draws anything (nothing near the camera) lets the card go after this long, ms. */
  readonly timeout?: number;
}

const drawnTiles = (tileset: Tileset3D | undefined): boolean =>
  tileset !== undefined &&
  tileset.stats.loaded > 0 &&
  [...tileset.stats.selected.values()].some((n) => n > 0);

/**
 * The scene's view is live from the first thing it draws: a card names what
 * that waits for until then (the terrain, a tileset), and goes for good. From
 * there the view is only refining: a small chip counts tiles still in flight
 * and fits or compiled routes still pending ("Refining · 12 tiles, 3 fits"),
 * and comes and goes with the work, which a moving camera starts again. The
 * chip blocks nothing and the view takes input throughout.
 */
export function whenDrawn(host: SceneHost, waiting: Waiting): () => void {
  const { viewer } = host;
  const resolved = new Map<string, Tileset3D | undefined>();
  for (const entry of waiting.tilesets ?? []) {
    void Promise.resolve(entry.tileset).then(
      (t) => resolved.set(entry.name, t),
      () => resolved.set(entry.name, undefined),
    );
  }
  const loaded = (): Tileset3D[] =>
    [...resolved.values()].filter((t): t is Tileset3D => t !== undefined);
  const sources: RefinementSource[] = [
    {
      one: "tile",
      many: "tiles",
      // Content in flight or waiting for its upload slot, in the globe and every tileset.
      count: () =>
        [viewer.globe, ...loaded()].reduce(
          (n, t) => n + (t ? t.stats.inFlight + t.stats.uploadQueue : 0),
          0,
        ),
    },
    {
      one: "fit",
      many: "fits",
      // Fits queued, and warped draws still waiting for their fit or compiled route.
      count: () => {
        const stats = viewer.world.warpStats();
        return stats.pending + stats.draws.pending;
      },
    },
  ];
  const refinement = createRefinement({
    hold: 3,
    cardTimeout: Math.ceil((waiting.timeout ?? 90_000) / 250),
  });

  /** Whether anything is on screen: a warped draw that has its warp, or tiles selected where nothing is warped. */
  const drawn = (): boolean => {
    const draws = viewer.world.warpStats().draws;
    if (draws.fitted + draws.stale > 0) {
      return true;
    }
    if ([...resolved.values()].some(drawnTiles)) {
      return true;
    }
    // Warped draws are held until their warp is ready: they are not on screen yet.
    if (draws.total > 0) {
      return false;
    }
    const at = waiting.terrainAt;
    return (
      viewer.globe !== undefined &&
      [...viewer.globe.stats.selected.values()].some((n) => n > 0) &&
      (at === undefined ||
        viewer.globe.surfaceHeight(at.longitude, at.latitude) !== undefined)
    );
  };

  /** What the first draw waits for, for the card. */
  const waitingFor = (): string => {
    const extra = waiting.extra?.();
    if (extra !== undefined) {
      return extra;
    }
    const at = waiting.terrainAt;
    const warped = viewer.world.warpStats().draws;
    if (at && warped.total === 0) {
      return "Loading terrain…";
    }
    for (const entry of waiting.tilesets ?? []) {
      if (!resolved.has(entry.name) || !drawnTiles(resolved.get(entry.name))) {
        return `Loading ${entry.name}…`;
      }
    }
    return "Preparing the view…";
  };

  const check = () => {
    if (host.signal.aborted) {
      clearInterval(timer);
      return;
    }
    const view = refinement.update({
      drawn: drawn(),
      waitingFor: waitingFor(),
      sources,
    });
    host.loading(view.card);
    host.refining(view.chip);
  };
  const timer = setInterval(check, 250);
  host.scope.defer(() => {
    clearInterval(timer);
    host.refining(undefined);
  });
  check();
  return () => clearInterval(timer);
}
