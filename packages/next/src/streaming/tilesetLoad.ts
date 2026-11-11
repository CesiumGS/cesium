// Requests a tileset's tiles and decodes them, within the tick's budget.
import type { TilesetHost } from "./DrawSink.ts";
import type { RequestSample } from "./RequestScheduler.ts";
import type { RequestPurpose } from "./Stepwise.ts";
import { type Tile, fetchTilesetJson } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import { isCaster, closeImages } from "./tilesetCasters.ts";
import type { TilesetState } from "./tilesetState.ts";

/** Content side: requests and decoding. */
export interface TilesetLoad extends Pick<
  Tileset3D,
  | "changed"
  | "events"
  | "stats"
  | "undrawnReasons"
  | "undrawnTile"
  | "useOrigin"
  | "warnings"
> {
  readonly engine: TilesetHost;
  readonly state: Pick<
    TilesetState,
    | "destroyed"
    | "externals"
    | "headers"
    | "inFlight"
    | "loading"
    | "policy"
    | "ready"
    | "source"
    | "wanted"
  >;
}

/** Most distinct reasons kept for tiles that draw nothing. */
export const MAX_UNDRAWN_REASONS = 20;

/**
 * A reason a tile draws nothing, without the tile in it: URLs (which can
 * carry a query string) and an inner tile's number come out, so that a
 * thousand failed tiles are one reason, not a thousand.
 */
export function undrawnKind(reason: string): string {
  return reason
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s]*?(?=:\s|[\s;,)]|$)/gi, "<url>")
    .replace(/composite inner tile \d+/g, "composite inner tile");
}

export function request(
  tileset: TilesetLoad,
  requests: Map<Tile, number>,
  purposes: Map<Tile, RequestPurpose>,
): void {
  // A pass that found no caster to cancel for an origin finds none again:
  // scanning every tile in flight per wanted tile made this quadratic.
  const nothingToYield = new Set<string>();
  const yieldOnce = (origin: string) => {
    if (!nothingToYield.has(origin) && !yieldToView(tileset, origin)) {
      nothingToYield.add(origin);
    }
  };
  const order = [...requests.entries()].sort(
    (a, b) => a[1] - b[1] || a[0].depth - b[0].depth,
  );
  // A caster in flight that a view now wants is the view's from here on.
  for (const tile of requests.keys()) {
    const purpose = purposes.get(tile);
    if (tile.state === "loading" && isCaster(tile) && purpose !== "caster") {
      tile.purpose = purpose;
    }
  }
  const full = new Set<string>();
  // Prefetch after everything visible (`prefetchAfterVisible`).
  let visibleWaiting = false;
  if (tileset.state.policy.prefetchAfterVisible === true) {
    for (const tile of tileset.state.loading.keys()) {
      if (tile.purpose !== "prefetch" && tile.purpose !== "caster") {
        visibleWaiting = true;
        break;
      }
    }
  }
  // Casters wait as well for what a view has here and hasn't placed: its
  // next requests are a tick away, and a gap isn't the end of them.
  const casterWaiting =
    tileset.state.ready.some((r) => !isCaster(r.tile)) ||
    tileset.state.externals.some((e) => !isCaster(e.tile));
  for (const [tile] of order) {
    if (tile.state !== "unloaded") {
      continue;
    }
    // Shadow casters wait with prefetch: never ahead of what views draw.
    const purpose = purposes.get(tile) ?? "view";
    const prefetch = purpose === "prefetch" || purpose === "caster";
    if (
      prefetch &&
      (visibleWaiting || (casterWaiting && purpose === "caster"))
    ) {
      continue;
    }
    const origin = tile.contentOrigin;
    if (full.has(origin)) {
      if (!prefetch) {
        yieldOnce(origin);
      }
      visibleWaiting ||=
        !prefetch && tileset.state.policy.prefetchAfterVisible === true;
      continue;
    }
    tileset.useOrigin(origin);
    if (!tileset.engine.requests.tryAcquire(origin)) {
      full.add(origin);
      if (!prefetch) {
        yieldOnce(origin);
      }
      visibleWaiting ||=
        !prefetch && tileset.state.policy.prefetchAfterVisible === true;
      continue;
    }
    tile.state = "loading";
    tile.fetchStartAt = performance.now();
    tile.wantedAt = tileset.state.wanted.get(tile) ?? tile.fetchStartAt;
    tileset.state.wanted.delete(tile);
    tileset.state.inFlight++;
    tileset.stats.requestsTotal++;
    tile.purpose = purpose;
    if (!prefetch) {
      visibleWaiting ||= tileset.state.policy.prefetchAfterVisible === true;
    }
    tileset.stats.purposes[purpose].requests++;
    tileset.events.emit("request", { url: tile.contentUrl!, purpose });
    const controller = new AbortController();
    tileset.state.loading.set(tile, controller);
    void loadContent(tileset, tile, controller.signal)
      .then((sample) => tileset.engine.requests.release(origin, sample))
      .finally(() => {
        tileset.state.inFlight--;
        tileset.state.loading.delete(tile);
        // Any completion is a change, also one without content to upload
        // (an external tileset's children need selecting, a failure needs
        // reporting): stay active for the next updates.
        tileset.changed();
      });
  }
}

/**
 * A view's request found the origin's window, which tilesets share, full:
 * cancels one shadow caster in flight there, whose slot comes back for it.
 */
function yieldToView(owner: TilesetLoad, origin: string): boolean {
  for (const tileset of owner.engine.tilesets) {
    for (const [tile, controller] of tileset.state.loading) {
      if (
        !controller.signal.aborted &&
        tile.contentOrigin === origin &&
        isCaster(tile)
      ) {
        cancelLoad(tileset, tile, controller);
        return true;
      }
    }
  }
  return false;
}

async function loadContent(
  tileset: TilesetLoad,
  tile: Tile,
  signal: AbortSignal,
): Promise<RequestSample | undefined> {
  try {
    if (tile.external) {
      // Fetched and parsed here; its tile tree is built in update(),
      // within the frame's budget (several large files finishing at once
      // stalled frames).
      const json = await fetchTilesetJson(
        tile.contentUrl!,
        tileset.state.headers,
        signal,
      );
      if (!tileset.state.destroyed) {
        tileset.state.externals.push({ tile, json });
      }
      return undefined;
    }
    const asset = tileset.state.source
      ? await tileset.state.source.loadTile(tile, signal)
      : await tileset.engine.loadGltf(tile.contentUrl!, {
          ...(tileset.state.headers ? { headers: tileset.state.headers } : {}),
          signal,
        });
    if (tileset.state.destroyed) {
      closeImages(asset);
      return undefined;
    }
    tileset.stats.bytesReceived += asset.timing?.bytes ?? 0;
    if (tile.purpose) {
      tileset.stats.purposes[tile.purpose].bytes += asset.timing?.bytes ?? 0;
    }
    tileset.state.ready.push({ tile, asset, arrivedAt: performance.now() });
    return asset.timing
      ? {
          bytes: asset.timing.bytes,
          ...(asset.timing.protocol ? { protocol: asset.timing.protocol } : {}),
        }
      : undefined;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      tile.state = "unloaded"; // cancelled: request again when needed
      return undefined;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/unsupported tile format/.test(message)) {
      // Loaded but drawing nothing: selection and refinement behave as in
      // 1.x, which does decode these formats.
      tile.state = "ready";
      tileset.undrawnTile(`${message} (drawn empty)`);
      return undefined;
    }
    tile.state = "failed";
    tileset.undrawnTile(`content failed: ${message}`);
    return undefined;
  }
}

export function undrawnTile(tileset: TilesetLoad, reason: string): void {
  tileset.stats.undrawn++;
  const kind = undrawnKind(reason);
  if (
    tileset.undrawnReasons.has(kind) ||
    tileset.undrawnReasons.size < MAX_UNDRAWN_REASONS
  ) {
    tileset.undrawnReasons.set(
      kind,
      (tileset.undrawnReasons.get(kind) ?? 0) + 1,
    );
    tileset.warnings.add(kind);
  }
}

export function cancelLoad(
  tileset: TilesetLoad,
  tile: Tile,
  controller: AbortController,
): void {
  controller.abort();
  tileset.engine.requests.cancelled(tile.contentOrigin);
  tileset.stats.cancelled++;
  if (tile.purpose) {
    tileset.stats.purposes[tile.purpose].cancelled++;
  }
}
