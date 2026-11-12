import type { Tileset3D } from "@cesium/next";
import type { SceneHost } from "./scene.ts";

/** What a scene's content has to draw before its card goes. */
export interface Waiting {
  /** A place (radians) whose ground height must be known: the terrain has loaded there. */
  readonly terrainAt?: { longitude: number; latitude: number };
  /** Streamed tilesets, by the name the card says. */
  readonly tilesets?: ReadonlyArray<{
    readonly name: string;
    readonly tileset: Promise<Tileset3D | undefined> | Tileset3D | undefined;
    /** A tileset that failed is not waited for. */
    failed?: boolean;
  }>;
  /** Anything else still in flight, in words. */
  readonly extra?: () => string | undefined;
  /** A scene that never settles (nothing near the camera) lets the card go after this long, ms. */
  readonly timeout?: number;
}

/**
 * Keeps the host's loading card up, naming what the view waits for, until the
 * terrain is known, the tilesets draw something and no fit is pending; then
 * for good (a camera that moves loads more, which the view is not held for).
 */
export function whenDrawn(host: SceneHost, waiting: Waiting): () => void {
  const { viewer } = host;
  const started = performance.now();
  const resolved = new Map<string, Tileset3D | undefined>();
  for (const entry of waiting.tilesets ?? []) {
    void Promise.resolve(entry.tileset).then(
      (t) => resolved.set(entry.name, t),
      () => resolved.set(entry.name, undefined),
    );
  }
  let quiet = 0;
  const check = () => {
    if (
      host.signal.aborted ||
      performance.now() - started > (waiting.timeout ?? 90_000)
    ) {
      host.loading(undefined);
      clearInterval(timer);
      return;
    }
    let stage: string | undefined;
    const at = waiting.terrainAt;
    if (at) {
      // Terrain counts as drawn from its first warped draw; where nothing is
      // warped, from a ground height the tiles can answer, a few seconds in.
      const d = viewer.world.warpStats().draws;
      const warped = d.exact + d.routed > 0;
      const known =
        viewer.globe?.surfaceHeight(at.longitude, at.latitude) !== undefined &&
        performance.now() - started > 6000;
      if (!warped && !known) {
        stage = "Loading terrain…";
      }
    }
    for (const entry of waiting.tilesets ?? []) {
      if (stage !== undefined) {
        break;
      }
      if (!resolved.has(entry.name)) {
        stage = `Loading ${entry.name}…`;
        break;
      }
      const tileset = resolved.get(entry.name);
      if (
        tileset &&
        !(
          tileset.stats.loaded > 0 &&
          [...tileset.stats.selected.values()].some((n) => n > 0)
        )
      ) {
        stage = `Loading ${entry.name}…`;
      }
    }
    stage ??= waiting.extra?.();
    if (stage === undefined) {
      const stats = viewer.world.warpStats();
      const pending = stats.pending + stats.draws.pending;
      if (pending > 0) {
        stage = `Fitting ${pending.toLocaleString("en-US")} ${pending === 1 ? "tile" : "tiles"}…`;
      }
    }
    if (stage === undefined) {
      if (++quiet >= 2) {
        host.loading(undefined);
        clearInterval(timer);
      }
      return;
    }
    quiet = 0;
    host.loading(stage);
  };
  const timer = setInterval(check, 250);
  host.scope.defer(() => clearInterval(timer));
  check();
  return () => clearInterval(timer);
}
