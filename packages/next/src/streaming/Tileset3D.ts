/**
 * A streamed 3D Tiles tileset in a world. Each frame the engine hands it the
 * views showing that world; selection runs per view over the shared tile
 * tree, and each tile's content is drawn only in the views that selected it
 * (record view masks). Content loads through the worker pool, uploads within
 * a per-frame budget, and is evicted least-recently-used when the cache
 * exceeds its byte budget; a tile touched by any view stays.
 */
import type { Engine } from "../scene/Engine.ts";
import type { ClipBox, World } from "../scene/World.ts";
import type { ModelOptions } from "../scene/gltfModel.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  Legacy1xSelection,
  type SelectionView,
  type TileSelection,
} from "./Legacy1x.ts";
import { BudgetedSelection, type BudgetedOptions } from "./Budgeted.ts";
import { loadTilesetJson, type Tile, type TileTree } from "./Tile.ts";
import { volumeObb } from "./volumes.ts";
import type { RequestSample } from "./RequestScheduler.ts";
import type { GlobeImagery } from "../globe/GlobeImagery.ts";
import {
  accumulate,
  emptyTotals,
  stageStats,
  summarizeContent,
  type ContentTotals,
  type Stage,
  type StageStats,
  type StageTimes,
} from "./pipeline.ts";

/** Recent content loads kept for stage percentiles. */
const PIPELINE_WINDOW = 256;
/** Frames without any view touching an in-flight tile before it is cancelled. */
const CANCEL_AFTER_FRAMES = 30;

/**
 * A hierarchical content source other than a 3D Tiles tileset.json (plan
 * §3.7): its own root, content loader and placement; selection, requests,
 * cache, view masks and rendering stay shared.
 */
export interface TileSource {
  readonly url: string;
  readonly root: Tile;
  readonly geometricError: number;
  /** The tree new tiles belong to (implicit trees grow as tiles load). */
  tree: TileTree;
  /** Decoded content of one tile. */
  loadTile(tile: Tile, signal: AbortSignal): Promise<GltfAsset>;
  /** Placement of a tile's content. */
  modelOptions(tile: Tile): Pick<ModelOptions, "modelMatrix" | "axes">;
  /** A selection policy of its own for `options` (default: the tileset's). */
  createSelection?(options: TilesetOptions): TileSelection | undefined;
}

export interface TilesetOptions extends BudgetedOptions {
  /**
   * Tile selection: "budgeted" (default) adds skip-LOD, visible-only coverage,
   * hold, prefetch and free refinement from the shared cache; "legacy1x"
   * reproduces CesiumJS 1.x for parity tests.
   */
  policy?: "legacy1x" | "budgeted";
  /** Headers for every request (e.g. ion authorization). */
  headers?: Record<string, string>;
  /** Content cache budget in bytes (1.x cacheBytes default: 512 MiB). */
  cacheBytes?: number;
  /**
   * How far the cache may exceed `cacheBytes` for content the views need
   * before detail is reduced (1.x maximumCacheOverflowBytes: 512 MiB).
   */
  maximumCacheOverflowBytes?: number;
  /**
   * Pins the request window for this tileset's origin. Without it the window
   * adapts per origin, shared by every tileset there (RequestScheduler).
   */
  maximumRequests?: number;
  /** Uploads per frame, to bound main-thread hitches. */
  uploadsPerFrame?: number;
}

export interface TilesetStats {
  tiles: number;
  loaded: number;
  loading: number;
  bytes: number;
  /** Content cache budget (eviction starts above it). */
  budget: number;
  /** Allowed overflow before the screen-space error is raised. */
  overflow: number;
  /** Current memory-adjusted screen-space error threshold. */
  screenSpaceError: number;
  /** Tiles drawn as mixed-LOD placeholders this frame, over all views. */
  placeholders: number;
  /** Content requests in flight, and the origin's current window. */
  inFlight: number;
  maxInFlight: number;
  /** Whether the window adapts, and the origin's negotiated protocol. */
  adaptive: boolean;
  protocol?: string;
  /** Requests cancelled because no view needed them any more. */
  cancelled: number;
  /** Decoded content waiting for its upload slot. */
  uploadQueue: number;
  /** Cumulative content requests started (L1′ measurements). */
  requestsTotal: number;
  /** Cumulative GPU bytes uploaded (L1′ measurements). */
  bytesTotal: number;
  /** Cumulative content bytes received over the network. */
  bytesReceived: number;
  /** Tiles selected per view id in the last update. */
  selected: Map<number, number>;
}

export class Tileset3D implements TileTree {
  readonly warnings = new Set<string>();
  /** The selection policy (`setPolicy` replaces it). */
  get selection(): TileSelection {
    return this.policy;
  }
  private policy: TileSelection;
  private readonly options: TilesetOptions;
  readonly stats: TilesetStats = {
    tiles: 0,
    loaded: 0,
    loading: 0,
    bytes: 0,
    budget: 0,
    overflow: 0,
    screenSpaceError: 16,
    placeholders: 0,
    inFlight: 0,
    maxInFlight: 0,
    adaptive: true,
    cancelled: 0,
    uploadQueue: 0,
    requestsTotal: 0,
    bytesTotal: 0,
    bytesReceived: 0,
    selected: new Map(),
  };
  /** False hides the tileset in every view; it keeps its cache. */
  get show(): boolean {
    return this.shown;
  }
  set show(value: boolean) {
    if (value !== this.shown) {
      this.shown = value;
      this.lastChange = this.frame; // update the views' masks next frame
    }
  }
  private shown = true;
  /** Globe imagery draped on this terrain tileset (`engine.addTerrain`). */
  imagery?: GlobeImagery;
  /** Selected tiles per view id after the last update (parity tests). */
  readonly lastSelected = new Map<number, Tile[]>();
  private frame = 0;
  /** A non-3D-Tiles source, when streaming one (fromSource). */
  private source?: TileSource;
  /** Last frame in which an update changed anything. */
  private lastChange = 0;
  private readonly cacheBytes: number;
  private readonly overflowBytes: number;
  private readonly fixedWindow?: number;
  /** The root's origin, and every origin this tileset requested from. */
  private readonly origin: string;
  private readonly origins = new Set<string>();
  private readonly loading = new Map<Tile, AbortController>();
  private readonly uploadsPerFrame: number;
  private readonly headers?: Record<string, string>;
  private readonly loaded = new Set<Tile>();
  private readonly ready: Array<{
    tile: Tile;
    asset: GltfAsset;
    arrivedAt: number;
  }> = [];
  /** Unloaded tiles wanted by some view, since when (queue time). */
  private readonly wanted = new Map<Tile, number>();
  private readonly recent: StageTimes[] = [];
  /** What resident content holds, summed over loaded tiles. */
  readonly resident: ContentTotals = emptyTotals();
  /** Load milestones (performance.now()): created, first content, idle. */
  readonly createdAt = performance.now();
  firstContentAt?: number;
  settledAt?: number;
  private masked = new Set<Tile>();
  private placeholders = new Set<Tile>();
  private inFlight = 0;
  private destroyed = false;

  private constructor(
    private readonly engine: Engine,
    readonly world: World,
    readonly url: string,
    options: TilesetOptions,
    public root: Tile,
    readonly geometricError: number,
    source?: TileSource,
  ) {
    this.options = options;
    this.policy = createSelection(options, source);
    this.cacheBytes = options.cacheBytes ?? 512 * 1024 * 1024;
    this.overflowBytes = options.maximumCacheOverflowBytes ?? 512 * 1024 * 1024;
    if (options.maximumRequests !== undefined) {
      this.fixedWindow = options.maximumRequests;
    }
    this.origin = this.originOf(url);
    this.useOrigin(this.origin);
    this.uploadsPerFrame = options.uploadsPerFrame ?? 8;
    this.headers = options.headers;
    this.stats.budget = this.cacheBytes;
    this.stats.overflow = this.overflowBytes;
    this.stats.adaptive = this.fixedWindow === undefined;
  }

  static async load(
    engine: Engine,
    world: World,
    url: string,
    options: TilesetOptions = {},
  ): Promise<Tileset3D> {
    const warnings = new Set<string>();
    const { root, geometricError } = await loadTilesetJson(
      url,
      options.headers,
      undefined,
      { warnings },
    );
    const tileset = new Tileset3D(
      engine,
      world,
      url,
      options,
      root,
      geometricError,
    );
    warnings.forEach((w) => tileset.warnings.add(w));
    tileset.stats.tiles = countTiles(root);
    // Tiles keep a reference to the tree they were built for; point them here.
    retarget(root, tileset);
    return tileset;
  }

  /** Streams a non-3D-Tiles source (terrain) through the same machinery. */
  static fromSource(
    engine: Engine,
    world: World,
    source: TileSource,
    options: TilesetOptions = {},
  ): Tileset3D {
    const tileset = new Tileset3D(
      engine,
      world,
      source.url,
      options,
      source.root,
      source.geometricError,
      source,
    );
    tileset.source = source;
    source.tree = tileset;
    tileset.stats.tiles = countTiles(source.root);
    retarget(source.root, tileset);
    return tileset;
  }

  /**
   * Switches the selection policy in place: loaded content, the cache and
   * requests stay; the next update selects under the new rules. The
   * current maximum screen-space error carries over.
   */
  setPolicy(policy: "legacy1x" | "budgeted"): void {
    const options = {
      ...this.options,
      policy,
      maximumScreenSpaceError: this.policy.maximumScreenSpaceError,
    };
    this.policy = createSelection(options, this.source);
    // Per-tile selection state belongs to the old policy, whose pass
    // numbers the new one would mistake for its own.
    const reset = (tile: Tile) => {
      tile.views.length = 0;
      if (tile.globe) {
        tile.globe.selection.length = 0;
      }
      for (const child of tile.children) {
        reset(child);
      }
    };
    reset(this.root);
    this.lastChange = this.frame;
  }

  /** Counts tiles an implicit tree created (TileTree). */
  tilesAdded(count: number): void {
    this.stats.tiles += count;
  }

  /** True when nothing is loading or waiting to upload. */
  get idle(): boolean {
    return this.inFlight === 0 && this.ready.length === 0;
  }

  /**
   * Needs `update()` even with every camera still: loading, waiting for a
   * request slot, changed in the last few frames (an upload can enable
   * further refinement), or the memory-adjusted SSE still moving toward its
   * target.
   */
  get active(): boolean {
    return (
      !this.idle ||
      // Wanted tiles still waiting for a request slot (the origin's window,
      // shared with other tilesets, may be full).
      this.wanted.size > 0 ||
      this.frame - this.lastChange < 3 ||
      this.imagery?.busy === true ||
      this.selection.memoryAdjustedScreenSpaceError !==
        this.selection.maximumScreenSpaceError
    );
  }

  /**
   * Where recent content loads spent their time: p50 and p95 per stage over
   * the last loads (queued for a request slot, network, worker wait, decode,
   * waiting for an upload slot, upload).
   */
  pipeline(): { samples: number; stages: Record<Stage, StageStats> } {
    return { samples: this.recent.length, stages: stageStats(this.recent) };
  }

  /** One frame: select per view, apply view masks, request, upload, evict. */
  update(allViews: SelectionView[]): void {
    if (this.destroyed) {
      return;
    }
    const frame = ++this.frame;
    // Hidden: no view selects anything (drawn tiles leave every view).
    const views = this.show ? allViews : [];
    if (allViews.length === 0) {
      // No view yet (e.g. its world isn't shown yet): stay active, so the
      // first selection runs as soon as a view appears.
      this.lastChange = frame;
    }
    const before =
      this.stats.requestsTotal +
      this.stats.bytesTotal +
      this.stats.loaded +
      this.world.version;
    const requests = new Map<Tile, number>();
    const nowMasked = new Set<Tile>();
    for (const tile of this.masked) {
      tile.viewMask = 0;
    }
    const nowPlaceholders = new Set<Tile>();
    for (const tile of this.placeholders) {
      tile.placeholderMask = 0;
      tile.holes = undefined;
    }
    for (const view of views) {
      const result = this.selection.select(
        this.root,
        this.geometricError,
        view,
      );
      const bit = (1 << view.id) >>> 0;
      for (const tile of result.selected) {
        tile.viewMask = (tile.viewMask | bit) >>> 0;
        nowMasked.add(tile);
      }
      for (const [tile, holes] of result.placeholders ?? []) {
        tile.placeholderMask = (tile.placeholderMask | bit) >>> 0;
        tile.holes ??= new Set();
        for (const hole of holes) {
          tile.holes.add(hole);
        }
        nowPlaceholders.add(tile);
      }
      for (const tile of result.touched) {
        tile.touchedFrame = frame;
      }
      for (const tile of result.requested) {
        tile.touchedFrame = frame;
        // Nearest first across views (1.x orders by distance for REPLACE);
        // a policy may supply its own priority.
        const priority =
          result.priority?.get(tile) ?? tile.viewState(view.id).distance;
        const previous = requests.get(tile);
        requests.set(
          tile,
          previous === undefined ? priority : Math.min(previous, priority),
        );
      }
      this.lastSelected.set(view.id, result.selected);
      this.stats.selected.set(view.id, result.selected.length);
    }
    // View masks: only tiles whose mask changed touch their draw records.
    for (const tile of new Set([...this.masked, ...nowMasked])) {
      if (tile.instance && tile.appliedMask !== tile.viewMask) {
        for (const draw of tile.instance.draws) {
          this.world.setViewMask(draw, tile.viewMask);
        }
        tile.appliedMask = tile.viewMask;
      }
    }
    this.masked = nowMasked;
    // Mixed-LOD placeholders: clipped to their holes (unioned over views)
    // in the views where finer content draws beside them.
    for (const tile of new Set([...this.placeholders, ...nowPlaceholders])) {
      if (
        tile.instance &&
        (tile.appliedPlaceholderMask !== tile.placeholderMask ||
          !sameTiles(tile.appliedHoles, tile.holes))
      ) {
        if (tile.clip) {
          this.world.freeClip(tile.clip);
          tile.clip = undefined;
        }
        if (tile.placeholderMask !== 0 && tile.holes) {
          tile.clip = this.world.allocateClip(
            [...tile.holes].map((hole) => clipBox(hole, tile.geometricError)),
          );
        }
        for (const draw of tile.instance.draws) {
          this.world.setPlaceholder(draw, tile.placeholderMask, tile.clip);
        }
        tile.appliedPlaceholderMask = tile.placeholderMask;
        tile.appliedHoles = tile.holes;
      }
    }
    this.placeholders = nowPlaceholders;
    this.stats.placeholders = nowPlaceholders.size;

    // Queue time: since a still-unloaded tile was first wanted.
    const now = performance.now();
    for (const tile of requests.keys()) {
      if (tile.state === "unloaded" && !this.wanted.has(tile)) {
        this.wanted.set(tile, now);
      }
    }
    for (const tile of this.wanted.keys()) {
      if (!requests.has(tile)) {
        this.wanted.delete(tile);
      }
    }
    // Cancel requests no view has touched for a while (1.x cancels those
    // not touched this frame; a short grace absorbs jitter).
    for (const [tile, controller] of this.loading) {
      if (
        !controller.signal.aborted &&
        tile.touchedFrame < frame - CANCEL_AFTER_FRAMES
      ) {
        controller.abort();
        this.engine.requests.cancelled(this.originOf(tile.contentUrl!));
        this.stats.cancelled++;
      }
    }
    this.request(requests);
    this.engine.requests.backlog(this.origin, this.ready.length);
    const window = this.engine.requests.stats(this.origin);
    if (window) {
      this.stats.maxInFlight = window.window;
      this.stats.adaptive = window.adaptive;
      if (window.protocol) {
        this.stats.protocol = window.protocol;
      }
    }
    this.upload();
    if (this.imagery) {
      // Imagery for the terrain tiles drawn in any view, nearest first.
      const wanted = new Map<Tile, number>();
      for (const tile of nowMasked) {
        let priority = Infinity;
        for (const view of views) {
          priority = Math.min(priority, tile.viewState(view.id).distance);
        }
        wanted.set(tile, priority);
      }
      this.imagery.update(wanted);
    }
    this.evict(frame);
    if (
      this.stats.requestsTotal +
        this.stats.bytesTotal +
        this.stats.loaded +
        this.world.version !==
      before
    ) {
      this.lastChange = frame;
    }
    if (
      this.settledAt === undefined &&
      this.firstContentAt !== undefined &&
      this.idle
    ) {
      this.settledAt = performance.now();
    }
    this.stats.loading = this.inFlight + this.ready.length;
    this.stats.inFlight = this.inFlight;
    this.stats.uploadQueue = this.ready.length;
  }

  private request(requests: Map<Tile, number>): void {
    const order = [...requests.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].depth - b[0].depth,
    );
    const full = new Set<string>();
    for (const [tile] of order) {
      if (tile.state !== "unloaded") {
        continue;
      }
      const origin = this.originOf(tile.contentUrl!);
      if (full.has(origin)) {
        continue;
      }
      this.useOrigin(origin);
      if (!this.engine.requests.tryAcquire(origin)) {
        full.add(origin);
        continue;
      }
      tile.state = "loading";
      tile.fetchStartAt = performance.now();
      tile.wantedAt = this.wanted.get(tile) ?? tile.fetchStartAt;
      this.wanted.delete(tile);
      this.inFlight++;
      this.stats.requestsTotal++;
      const controller = new AbortController();
      this.loading.set(tile, controller);
      void this.loadContent(tile, controller.signal)
        .then((sample) => this.engine.requests.release(origin, sample))
        .finally(() => {
          this.inFlight--;
          this.loading.delete(tile);
          // Any completion is a change, also one without content to upload
          // (an external tileset's children need selecting, a failure needs
          // reporting): stay active for the next updates.
          this.lastChange = this.frame;
        });
    }
  }

  private async loadContent(
    tile: Tile,
    signal: AbortSignal,
  ): Promise<RequestSample | undefined> {
    try {
      if (tile.external) {
        const { root } = await loadTilesetJson(
          tile.contentUrl!,
          this.headers,
          tile,
          this,
        );
        if (this.destroyed) {
          return;
        }
        tile.children.push(root);
        tile.state = "ready";
        this.stats.tiles += countTiles(root);
        return undefined;
      }
      const asset = this.source
        ? await this.source.loadTile(tile, signal)
        : await this.engine.loadGltf(tile.contentUrl!, {
            ...(this.headers ? { headers: this.headers } : {}),
            signal,
          });
      if (this.destroyed) {
        closeImages(asset);
        return undefined;
      }
      this.stats.bytesReceived += asset.timing?.bytes ?? 0;
      this.ready.push({ tile, asset, arrivedAt: performance.now() });
      return asset.timing
        ? {
            bytes: asset.timing.bytes,
            ...(asset.timing.protocol
              ? { protocol: asset.timing.protocol }
              : {}),
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
        this.warnings.add(`${message} (drawn empty)`);
        return undefined;
      }
      tile.state = "failed";
      this.warnings.add(`content failed: ${message}`);
      return undefined;
    }
  }

  /**
   * Uploads decoded content within the per-frame cap, then adjusts the
   * screen-space error for memory as 1.x processTiles does: uploads stop
   * while the cache exceeds budget + overflow, the threshold rises ×1.02 per
   * frame while content is still waiting, and relaxes back below budget.
   */
  private upload(): void {
    const limit = this.cacheBytes + this.overflowBytes;
    let exceeded = false;
    const budget = this.engine.uploadBudget;
    for (let n = 0; n < this.uploadsPerFrame && this.ready.length > 0; n++) {
      if (this.stats.bytes > limit) {
        exceeded = true;
        break;
      }
      // The engine-wide budget for this frame (one upload always goes).
      if (budget.uploads > 0 && budget.bytes <= 0) {
        break;
      }
      const { tile, asset, arrivedAt } = this.ready.shift()!;
      asset.warnings.forEach((w) => this.warnings.add(w));
      // Before the upload, which consumes the images.
      const summary = summarizeContent(asset);
      const uploadStart = performance.now();
      try {
        const instance = this.engine.addModel(this.world, asset, {
          ...(this.source
            ? this.source.modelOptions(tile)
            : { modelMatrix: tile.transform, axes: "3d-tiles" as const }),
          viewMask: 0,
        });
        tile.instance = instance;
        tile.bytes = instance.bytes;
        budget.bytes -= instance.bytes;
        budget.uploads++;
        const uploaded = performance.now();
        const network = asset.timing?.networkMs ?? 0;
        const decode = asset.timing?.decodeMs ?? 0;
        this.recent.push({
          queued: tile.fetchStartAt - tile.wantedAt,
          network,
          worker: Math.max(0, arrivedAt - tile.fetchStartAt - network - decode),
          decode,
          uploadWait: uploadStart - arrivedAt,
          upload: uploaded - uploadStart,
        });
        if (this.recent.length > PIPELINE_WINDOW) {
          this.recent.shift();
        }
        tile.summary = summary;
        accumulate(this.resident, summary, 1);
        this.firstContentAt ??= uploaded;
        tile.copyright = asset.copyright;
        tile.appliedMask = 0;
        tile.state = "ready";
        this.loaded.add(tile);
        this.stats.loaded++;
        this.stats.bytes += tile.bytes;
        this.stats.bytesTotal += tile.bytes;
      } catch (error) {
        tile.state = "failed";
        this.warnings.add(
          `upload failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    const selection = this.selection;
    if (this.stats.bytes < this.cacheBytes) {
      selection.memoryAdjustedScreenSpaceError = Math.max(
        selection.memoryAdjustedScreenSpaceError / 1.02,
        selection.maximumScreenSpaceError,
      );
    } else if (exceeded && this.ready.length > 0) {
      selection.memoryAdjustedScreenSpaceError *= 1.02;
    }
    this.stats.screenSpaceError = selection.memoryAdjustedScreenSpaceError;
  }

  /** Least-recently-touched first, never a tile touched this frame. */
  private evict(frame: number): void {
    // Eviction starts at the budget; the overflow is for content in use.
    if (this.stats.bytes <= this.cacheBytes) {
      return;
    }
    const candidates = [...this.loaded]
      .filter((t) => t.touchedFrame < frame)
      .sort((a, b) => a.touchedFrame - b.touchedFrame);
    // Spread over frames, as uploads are: after a camera jump everything
    // shown before becomes evictable at once, and freeing it all in one
    // frame (textures and buffers by the hundred) stalls that frame. Past
    // the hard limit (budget + overflow), whatever is needed goes now.
    let allowance = Math.max(
      2 * this.engine.uploadBytesPerFrame,
      this.stats.bytes - (this.cacheBytes + this.overflowBytes),
    );
    for (const tile of candidates) {
      if (this.stats.bytes <= this.cacheBytes || allowance <= 0) {
        break;
      }
      allowance -= tile.bytes;
      this.unload(tile);
    }
  }

  private unload(tile: Tile): void {
    if (tile.instance) {
      this.engine.removeModel(this.world, tile.instance);
      tile.instance = undefined;
    }
    this.stats.bytes -= tile.bytes;
    this.stats.loaded--;
    if (tile.summary) {
      accumulate(this.resident, tile.summary, -1);
      tile.summary = undefined;
    }
    tile.bytes = 0;
    tile.state = "unloaded";
    tile.appliedMask = -1;
    tile.appliedPlaceholderMask = 0;
    tile.placeholderMask = 0;
    tile.holes = tile.appliedHoles = undefined;
    if (tile.clip) {
      this.world.freeClip(tile.clip);
      tile.clip = undefined;
    }
    this.placeholders.delete(tile);
    this.loaded.delete(tile);
    this.masked.delete(tile);
  }

  /**
   * Data credits of the content currently selected in any view, most
   * frequent first (as 1.x orders tileset credits). Each copyright string may
   * list several credits separated by semicolons.
   */
  credits(): string[] {
    const counts = new Map<string, number>();
    for (const tiles of this.lastSelected.values()) {
      for (const tile of tiles) {
        for (const credit of (tile.copyright ?? "").split(";")) {
          const text = credit.trim();
          if (text) {
            counts.set(text, (counts.get(text) ?? 0) + 1);
          }
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([text]) => text);
  }

  private originOf(url: string): string {
    try {
      return new URL(url, globalThis.location?.href).origin;
    } catch {
      return "";
    }
  }

  private useOrigin(origin: string): void {
    if (!this.origins.has(origin)) {
      this.origins.add(origin);
      this.engine.requests.register(origin, this.fixedWindow);
    }
  }

  /** Unloads all content. The tileset can't be used afterwards. */
  destroy(): void {
    for (const controller of this.loading.values()) {
      controller.abort();
    }
    this.imagery?.destroy();
    this.imagery = undefined;
    for (const origin of this.origins) {
      this.engine.requests.unregister(origin);
    }
    this.origins.clear();
    for (const tile of [...this.loaded]) {
      this.unload(tile);
    }
    for (const { asset } of this.ready) {
      closeImages(asset);
    }
    this.ready.length = 0;
    this.destroyed = true;
  }
}

function retarget(tile: Tile, tree: TileTree): void {
  tile.tileset = tree;
  for (const child of tile.children) {
    retarget(child, tree);
  }
}

/** The source's own policy (terrain's globe Legacy1x), else 3D Tiles'. */
function createSelection(
  options: TilesetOptions,
  source: TileSource | undefined,
): TileSelection {
  return (
    source?.createSelection?.(options) ??
    (options.policy === "legacy1x"
      ? new Legacy1xSelection(options)
      : new BudgetedSelection(options))
  );
}

function countTiles(tile: Tile): number {
  return 1 + tile.children.reduce((n, c) => n + countTiles(c), 0);
}

function closeImages(asset: GltfAsset): void {
  for (const image of asset.images) {
    if (image instanceof ImageBitmap) {
      image.close();
    }
  }
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
  const box = volumeObb(tile.volume);
  const sphere = tile.volume.sphere;
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
