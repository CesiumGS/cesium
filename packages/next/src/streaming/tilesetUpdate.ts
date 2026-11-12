// A tileset's tick: select tiles for its views, then casters, then requests,
// uploads and eviction. The order matters: casters follow view selection, and
// `receivers` reads other tilesets' `lastSelected`.
import type { DrawSink, TilesetHost } from "./DrawSink.ts";
import type { Mat4 } from "../math/mat4.ts";
import type { ClipBox } from "../scene/world/types.ts";
import type { SelectionView, RequestPurpose } from "./Stepwise.ts";
import { type Tile, treeFromJson } from "./Tile.ts";
import type { Tileset3D } from "./Tileset3D.ts";
import {
  COLD_AGE_MAX_MS,
  casterRoom,
  wakeForStale,
  COLD_WAKE_MIN_MS,
  isCaster,
} from "./tilesetCasters.ts";
import { updateDebug, applyDebugColor } from "./tilesetDebug.ts";
import { cancelLoad, request } from "./tilesetLoad.ts";
import { serveQueries } from "./tilesetQueries.ts";
import { upload } from "./tilesetUpload.ts";
import { volumeObb } from "./volumes.ts";
import type { TilesetState } from "./tilesetState.ts";

/** Content side: one tick's update of a tileset. */
export interface TilesetUpdate extends Pick<
  Tileset3D,
  | "anchor"
  | "changed"
  | "events"
  | "evict"
  | "firstContentAt"
  | "geometricError"
  | "idle"
  | "imagery"
  | "imageryPending"
  | "imageryReady"
  | "imageryRefines"
  | "lastSelected"
  | "lights"
  | "markCastsOnly"
  | "moveVolumes"
  | "resident"
  | "retainGeometry"
  | "root"
  | "settledAt"
  | "show"
  | "stats"
  | "undrawnReasons"
  | "undrawnTile"
  | "updateVolumePad"
  | "useOrigin"
  | "warnings"
> {
  readonly world: DrawSink;
  readonly engine: TilesetHost;
  readonly state: Pick<
    TilesetState,
    | "baseItem"
    | "blendedTwins"
    | "boundingVolumes"
    | "cacheBytes"
    | "capacityFailed"
    | "capacityFull"
    | "capacityWait"
    | "casterBytesEstimate"
    | "casterLoad"
    | "casterResident"
    | "casterTimer"
    | "casterWake"
    | "casters"
    | "casting"
    | "coldAgeMs"
    | "collision"
    | "colorize"
    | "contentAxes"
    | "contentVolumes"
    | "delta"
    | "destroyed"
    | "drawTiles"
    | "externals"
    | "frame"
    | "frozen"
    | "headers"
    | "inFlight"
    | "itemList"
    | "lastChange"
    | "loadEstimateMs"
    | "loaded"
    | "loading"
    | "masked"
    | "options"
    | "order"
    | "origin"
    | "overflowBytes"
    | "ownMaterials"
    | "placeholders"
    | "policy"
    | "queries"
    | "ready"
    | "recent"
    | "recentCasterBytes"
    | "revisionSeen"
    | "source"
    | "standIns"
    | "terrainRegions"
    | "tileColor"
    | "transform"
    | "uploadsPerFrame"
    | "viewBytes"
    | "viewCapacityWait"
    | "wanted"
  >;
}

/** Imagery priority offset of loading tiles: after drawn and waiting ones. */
const LOADING_IMAGERY = 1e15;
/** Frames without any view touching an in-flight tile before it is cancelled. */
const CANCEL_AFTER_FRAMES = 30;

export function countTiles(tile: Tile): number {
  return 1 + tile.children.reduce((n, c) => n + countTiles(c), 0);
}

function sameTiles(a?: Set<Tile>, b?: Set<Tile>): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b || a.size !== b.size) {
    return false;
  }
  for (const t of a) {
    if (!b.has(t)) {
      return false;
    }
  }
  return true;
}

/**
 * A hole's bounding box as a clip box, grown vertically by `margin`: the
 * placeholder's geometric error bounds how far its surface may lie above or
 * below the finer content's box. Sideways it stays tight, so it doesn't
 * spill over finer neighbors.
 */
function clipBox(tile: Tile, margin: number): ClipBox {
  const box = volumeObb(tile.ownVolume);
  const sphere = tile.ownVolume.sphere;
  const center = box ? box.center : sphere.center;
  const h = box
    ? box.halfAxes
    : Float64Array.of(
        sphere.radius,
        0,
        0,
        0,
        sphere.radius,
        0,
        0,
        0,
        sphere.radius,
      );
  const up = [center[0]!, center[1]!, center[2]!];
  const upLength = Math.hypot(up[0]!, up[1]!, up[2]!) || 1;
  const axes = [0, 3, 6].map((o) => [h[o]!, h[o + 1]!, h[o + 2]!]);
  const rows = new Float64Array(9);
  axes.forEach((a, i) => {
    let length = Math.hypot(a[0]!, a[1]!, a[2]!);
    let u = a;
    if (length < 1e-9) {
      // Flat box: the normal of the other two axes.
      const [p, q] = axes.filter((_, j) => j !== i) as [number[], number[]];
      u = [
        p[1]! * q[2]! - p[2]! * q[1]!,
        p[2]! * q[0]! - p[0]! * q[2]!,
        p[0]! * q[1]! - p[1]! * q[0]!,
      ];
      length = 0;
    }
    const ul = Math.hypot(u[0]!, u[1]!, u[2]!) || 1;
    const dir = u.map((x) => x / ul);
    const vertical = Math.abs(
      (dir[0]! * up[0]! + dir[1]! * up[1]! + dir[2]! * up[2]!) / upLength,
    );
    const grown = length + margin * vertical + 1e-3 * length + 0.01;
    for (let k = 0; k < 3; k++) {
      rows[i * 3 + k] = dir[k]! / grown;
    }
  });
  return { center, rows };
}

function isIdentity(m: Mat4): boolean {
  for (let i = 0; i < 16; i++) {
    if (m[i] !== (i % 5 === 0 ? 1 : 0)) {
      return false;
    }
  }
  return true;
}

export function update(
  tileset: TilesetUpdate,
  allViews: SelectionView[],
): void {
  tileset.state.casterWake = false;
  if (tileset.state.destroyed) {
    return;
  }
  if (tileset.state.frozen) {
    updateDebug(tileset);
    return;
  }
  const frame = ++tileset.state.frame;
  tileset.updateVolumePad();
  // Hidden, or no item draws it in a view: that view selects nothing (drawn
  // tiles leave it), and it asks for no ticks of its own.
  // Only the views some item can draw in (`SceneItem.viewMask`): a view no
  // item shows would otherwise fetch tiles that are never drawn, and its
  // bytes could evict tiles the shown views need.
  let wanted = 0;
  for (const item of tileset.state.itemList) {
    wanted |= item.views;
  }
  // Under an anchor placed across a warp, selection runs on drawn volumes:
  // a globe's too (its tiles are fitted like any tile's, scene/world/warps.ts).
  // Each view on its own route's: views of one anchor may reach it by routes
  // of different shape (a switch frame).
  const views = tileset.show
    ? allViews
        .filter((view) => ((wanted >>> view.id) & 1) !== 0)
        .map((view) => {
          const warp = tileset.world.tileWarp?.(tileset.anchor, view.id);
          return warp ? { ...view, warp } : view;
        })
    : [];
  if (allViews.length === 0) {
    // No view yet (e.g. its world isn't shown yet): stay active, so the
    // first selection runs as soon as a view appears.
    tileset.state.lastChange = frame;
  }
  const before =
    tileset.stats.requestsTotal +
    tileset.stats.bytesTotal +
    tileset.stats.loaded +
    tileset.world.version;
  const requests = new Map<Tile, number>();
  const purposes = new Map<Tile, RequestPurpose>();
  const nowMasked = new Set<Tile>();
  for (const tile of tileset.state.masked) {
    tile.viewMask = 0;
  }
  const nowPlaceholders = new Set<Tile>();
  for (const tile of tileset.state.placeholders) {
    tile.placeholderMask = 0;
    tile.holes = undefined;
  }
  const nowStandIns = new Set<Tile>();
  for (const tile of tileset.state.standIns) {
    tile.standInMask = 0;
  }
  const nowCasters = new Set<Tile>();
  for (const tile of tileset.state.casters) {
    tile.casterMask = 0;
  }
  tileset.state.policy.imageryReady =
    tileset.imagery || tileset.imageryPending
      ? tileset.imageryReady
      : undefined;
  tileset.state.policy.imageryRefines = tileset.imagery
    ? tileset.imageryRefines
    : undefined;
  tileset.state.policy.expectedLoadSeconds =
    tileset.state.loadEstimateMs / 1000;
  const now = performance.now();
  let viewBytes = 0;
  // What a view uses this tick stays, and is the view's: counted once.
  const useInView = (tile: Tile): void => {
    if (tile.touchedFrame < frame) {
      viewBytes += tile.bytes;
      tile.viewedAt = now;
    }
    tileset.state.order.touch(tile, frame);
  };
  // A view drawing or asking for a tile after longer than the age: cold
  // tiles do come back.
  const cameBack = (tile: Tile): void => {
    const away = now - tile.viewedAt;
    if (
      tile.touchedFrame < frame - 1 &&
      tile.viewedAt > 0 &&
      away > tileset.state.coldAgeMs
    ) {
      tileset.state.coldAgeMs = Math.min(COLD_AGE_MAX_MS, 2 * away);
    }
  };
  const addRequest = (
    tile: Tile,
    priority: number,
    purpose: RequestPurpose,
  ): void => {
    const previous = requests.get(tile);
    if (previous === undefined || priority < previous) {
      // The most urgent view's purpose.
      requests.set(tile, priority);
      purposes.set(tile, purpose);
    }
  };
  const waiting = new Set<Tile>();
  for (const view of views) {
    const result = tileset.state.policy.select(
      tileset.root,
      tileset.geometricError,
      view,
    );
    const bit = (1 << view.id) >>> 0;
    for (const tile of result.selected) {
      tile.viewMask = (tile.viewMask | bit) >>> 0;
      nowMasked.add(tile);
      cameBack(tile);
      useInView(tile);
      tileset.markCastsOnly(tile, false);
    }
    for (const [tile, holes] of result.placeholders ?? []) {
      tile.placeholderMask = (tile.placeholderMask | bit) >>> 0;
      tile.holes ??= new Set();
      for (const hole of holes) {
        tile.holes.add(hole);
      }
      nowPlaceholders.add(tile);
    }
    for (const tile of result.standIns ?? []) {
      tile.standInMask = (tile.standInMask | bit) >>> 0;
      nowStandIns.add(tile);
    }
    for (const tile of result.touched) {
      useInView(tile);
    }
    for (const tile of result.waiting ?? []) {
      waiting.add(tile);
    }
    for (const tile of result.requested) {
      cameBack(tile);
      useInView(tile);
      // Nearest first across views (1.x orders by distance for REPLACE);
      // a policy may supply its own priority.
      const priority =
        result.priority?.get(tile) ?? tile.viewState(view.id).distance;
      addRequest(
        tile,
        priority,
        tileset.state.policy.purpose?.(priority) ?? "view",
      );
    }
    tileset.lastSelected.set(view.id, result.selected);
    tileset.stats.selected.set(view.id, result.selected.length);
  }
  // A view that left has no selection: other tilesets' casters look for
  // their receivers in this list, and credits read it.
  for (const id of tileset.lastSelected.keys()) {
    if (!views.some((view) => view.id === id)) {
      tileset.lastSelected.delete(id);
      tileset.stats.selected.delete(id);
    }
  }
  tileset.state.viewBytes = viewBytes;
  // Shadow casters, now that the bytes views use are known: only for the
  // views some item can cast in. Elsewhere a caster would be fetched and
  // counted, and its records would cast nothing.
  let castingIn = 0;
  for (const item of tileset.state.itemList) {
    castingIn |= item.castViews;
  }
  const casterViews = views.filter(
    (view) => ((castingIn >>> view.id) & 1) !== 0,
  );
  const room = casterRoom(tileset, casterViews, frame, now);
  if (room) {
    for (const view of casterViews) {
      const found = tileset.state.policy.selectCasters!(
        tileset.root,
        tileset.geometricError,
        view,
        tileset.lastSelected.get(view.id)!,
        room,
      );
      const bit = (1 << view.id) >>> 0;
      for (const tile of found.casters) {
        tile.casterMask = (tile.casterMask | bit) >>> 0;
        nowCasters.add(tile);
      }
      for (const [tile, priority] of found.wanted) {
        // Kept from cancelling while it loads, as a view's tile is.
        tileset.state.order.touch(tile, frame);
        if (tile.state === "unloaded") {
          addRequest(tile, priority, "caster");
        }
      }
    }
  }
  // View masks: only tiles whose mask changed touch their draw records.
  for (const tile of new Set([...tileset.state.masked, ...nowMasked])) {
    applyDebugColor(tileset, tile);
    if (tile.placement && tile.appliedMask !== tile.viewMask) {
      if (tile.viewMask !== 0 && tile.purpose) {
        tileset.stats.purposes[tile.purpose].drawn++;
        tile.purpose = undefined;
      }
      tile.appliedMask = tile.viewMask;
      for (const item of tileset.state.itemList) {
        item.applyViewMask(tile);
      }
    }
  }
  tileset.state.masked = nowMasked;
  // Off-screen casters: as for view masks, and the tint's callback sees
  // them too (it may hide a tile, and a hidden draw doesn't cast).
  for (const tile of new Set([...tileset.state.casters, ...nowCasters])) {
    applyDebugColor(tileset, tile);
    if (tile.placement && tile.appliedCasterMask !== tile.casterMask) {
      if (tile.casterMask !== 0 && tile.purpose === "caster") {
        tileset.stats.purposes.caster.drawn++;
        tile.purpose = undefined;
      }
      tile.appliedCasterMask = tile.casterMask;
      for (const item of tileset.state.itemList) {
        item.applyCasterMask(tile);
      }
    }
  }
  tileset.state.casters = nowCasters;
  tileset.stats.casters = nowCasters.size;
  tileset.stats.casterScale = room?.scale ?? 1;
  if (
    room &&
    room.nextStale < Infinity &&
    (room.denied > 0 || room.scale > 1)
  ) {
    wakeForStale(tileset, Math.max(room.nextStale - now, COLD_WAKE_MIN_MS));
  }
  // Mixed-LOD placeholders: clipped to their holes (unioned over views)
  // in the views where finer content draws beside them.
  for (const tile of new Set([
    ...tileset.state.placeholders,
    ...nowPlaceholders,
  ])) {
    if (
      tile.placement &&
      (tile.appliedPlaceholderMask !== tile.placeholderMask ||
        !sameTiles(tile.appliedHoles, tile.holes))
    ) {
      if (tile.clip) {
        tileset.world.freeClip(tile.clip);
        tile.clip = undefined;
      }
      if (tile.placeholderMask !== 0 && tile.holes) {
        tile.clip = tileset.world.allocateClip(
          [...tile.holes].map((hole) => clipBox(hole, tile.geometricError)),
        );
      }
      for (const item of tileset.state.itemList) {
        item.applyPlaceholder(tile);
      }
      tile.appliedPlaceholderMask = tile.placeholderMask;
      tile.appliedHoles = tile.holes;
    }
  }
  tileset.state.placeholders = nowPlaceholders;
  tileset.state.standIns = nowStandIns;
  updateDebug(tileset);
  tileset.stats.placeholders = nowPlaceholders.size;

  // Queue time: since a still-unloaded tile was first wanted.
  for (const tile of requests.keys()) {
    if (tile.state === "unloaded" && !tileset.state.wanted.has(tile)) {
      tileset.state.wanted.set(tile, now);
    }
  }
  for (const tile of tileset.state.wanted.keys()) {
    if (!requests.has(tile)) {
      tileset.state.wanted.delete(tile);
    }
  }
  // Cancel requests no view has touched for a while (1.x cancels those
  // not touched this frame; a short grace absorbs jitter).
  for (const [tile, controller] of tileset.state.loading) {
    if (
      !controller.signal.aborted &&
      tile.touchedFrame < frame - CANCEL_AFTER_FRAMES
    ) {
      cancelLoad(tileset, tile, controller);
    }
  }
  serveQueries(tileset, frame, requests, purposes);
  request(tileset, requests, purposes);
  tileset.engine.requests.backlog(
    tileset.state.origin,
    tileset.state.ready.length,
  );
  const window = tileset.engine.requests.stats(tileset.state.origin);
  if (window) {
    tileset.stats.maxInFlight = window.window;
    tileset.stats.adaptive = window.adaptive;
    if (window.protocol) {
      tileset.stats.protocol = window.protocol;
    }
  }
  buildExternals(tileset);
  upload(tileset);
  if (tileset.imagery) {
    // Imagery for the terrain tiles drawn in any view (placeholders too)
    // and those waiting for it to draw, nearest first.
    const wanted = new Map<Tile, number>();
    for (const tile of new Set([
      ...nowMasked,
      ...nowPlaceholders,
      ...waiting,
    ])) {
      let priority = Infinity;
      for (const view of views) {
        priority = Math.min(priority, tile.viewState(view.id).distance);
      }
      wanted.set(tile, priority);
    }
    // Then tiles still loading (not prefetch or height samples): their
    // imagery needs only their rectangle, so it loads alongside the
    // terrain as in 1.x. After it arrived, the first view's imagery came
    // 0.4 s after its terrain (Rainier, r38).
    for (const tile of tileset.state.loading.keys()) {
      if (
        tile.globe &&
        !wanted.has(tile) &&
        tile.purpose !== undefined &&
        tile.purpose !== "prefetch" &&
        tile.purpose !== "sample"
      ) {
        let priority = Infinity;
        for (const view of views) {
          priority = Math.min(priority, tile.viewState(view.id).distance);
        }
        wanted.set(tile, LOADING_IMAGERY + priority);
      }
    }
    tileset.imagery.update(wanted);
    tileset.lights?.update(wanted);
  }
  tileset.evict(frame);
  if (
    tileset.stats.requestsTotal +
      tileset.stats.bytesTotal +
      tileset.stats.loaded +
      tileset.world.version !==
    before
  ) {
    tileset.state.lastChange = frame;
  }
  if (
    tileset.settledAt === undefined &&
    tileset.firstContentAt !== undefined &&
    tileset.idle
  ) {
    tileset.settledAt = performance.now();
  }
  tileset.stats.casterBytes = tileset.state.casterResident;
  tileset.stats.coldBytes = Math.max(
    0,
    tileset.stats.bytes -
      tileset.state.viewBytes -
      tileset.state.casterResident,
  );
  tileset.stats.loading = tileset.state.inFlight + tileset.state.ready.length;
  tileset.stats.inFlight = tileset.state.inFlight;
  tileset.stats.uploadQueue = tileset.state.ready.length;
  tileset.state.revisionSeen = tileset.world.contentRevision;
}

/** Builds waiting external tilesets' trees within the frame's budget. */
function buildExternals(tileset: TilesetUpdate): void {
  const budget = tileset.engine.scene.uploadBudget;
  while (tileset.state.externals.length > 0) {
    if (budget.trees > 0 && budget.ms <= 0) {
      break;
    }
    // What views wait for first, as for uploads.
    const next = tileset.state.externals.findIndex((e) => !isCaster(e.tile));
    const { tile, json } = tileset.state.externals.splice(
      Math.max(next, 0),
      1,
    )[0]!;
    tile.purpose = undefined; // structure, never drawn itself
    const start = performance.now();
    try {
      const { root } = treeFromJson(json, tile.contentUrl!, tile, tileset);
      // Built in the load-time frame: move it to the current one.
      if (!isIdentity(tileset.state.delta)) {
        tileset.moveVolumes(root, tileset.state.delta);
      }
      tile.children.push(root);
      tile.state = "ready";
      tileset.stats.tiles += countTiles(root);
    } catch (error) {
      tile.state = "failed";
      tileset.undrawnTile(
        `tileset JSON failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    budget.ms -= performance.now() - start;
    budget.trees++;
    tileset.changed();
  }
}
