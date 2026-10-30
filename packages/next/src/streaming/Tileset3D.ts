/**
 * A streamed 3D Tiles tileset in a world. Each frame the engine hands it the
 * views showing that world; selection runs per view over the shared tile
 * tree, and each tile's content is drawn only in the views that selected it
 * (record view masks). Content loads through the worker pool, uploads within
 * a per-frame budget, and is evicted least-recently-used when the cache
 * exceeds its byte budget; a tile touched by any view stays.
 */
import type { Engine } from "../scene/Engine.ts";
import type { World } from "../scene/World.ts";
import type { GltfAsset } from "../io/gltfTypes.ts";
import {
  Legacy1xSelection,
  type Legacy1xOptions,
  type SelectionView,
} from "./Legacy1x.ts";
import { loadTilesetJson, type Tile, type TileTree } from "./Tile.ts";

export interface TilesetOptions extends Legacy1xOptions {
  /** Headers for every request (e.g. ion authorization). */
  headers?: Record<string, string>;
  /** Content cache budget in bytes (1.x cacheBytes default: 512 MiB). */
  cacheBytes?: number;
  /** Concurrent content requests (1.x: 18 per server). */
  maximumRequests?: number;
  /** Uploads per frame, to bound main-thread hitches. */
  uploadsPerFrame?: number;
}

export interface TilesetStats {
  tiles: number;
  loaded: number;
  loading: number;
  bytes: number;
  /** Tiles selected per view id in the last update. */
  selected: Map<number, number>;
}

export class Tileset3D implements TileTree {
  readonly warnings = new Set<string>();
  readonly selection: Legacy1xSelection;
  readonly stats: TilesetStats = {
    tiles: 0,
    loaded: 0,
    loading: 0,
    bytes: 0,
    selected: new Map(),
  };
  /** Selected tiles per view id after the last update (parity tests). */
  readonly lastSelected = new Map<number, Tile[]>();
  private frame = 0;
  private readonly cacheBytes: number;
  private readonly maximumRequests: number;
  private readonly uploadsPerFrame: number;
  private readonly headers?: Record<string, string>;
  private readonly loaded = new Set<Tile>();
  private readonly ready: Array<{ tile: Tile; asset: GltfAsset }> = [];
  private masked = new Set<Tile>();
  private inFlight = 0;
  private destroyed = false;

  private constructor(
    private readonly engine: Engine,
    readonly world: World,
    readonly url: string,
    options: TilesetOptions,
    public root: Tile,
    readonly geometricError: number,
  ) {
    this.selection = new Legacy1xSelection(options);
    this.cacheBytes = options.cacheBytes ?? 512 * 1024 * 1024;
    this.maximumRequests = options.maximumRequests ?? 18;
    this.uploadsPerFrame = options.uploadsPerFrame ?? 8;
    this.headers = options.headers;
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

  /** True when nothing is loading or waiting to upload. */
  get idle(): boolean {
    return this.inFlight === 0 && this.ready.length === 0;
  }

  /** One frame: select per view, apply view masks, request, upload, evict. */
  update(views: SelectionView[]): void {
    if (this.destroyed) {
      return;
    }
    const frame = ++this.frame;
    const requests = new Map<Tile, number>();
    const nowMasked = new Set<Tile>();
    for (const tile of this.masked) {
      tile.viewMask = 0;
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
      for (const tile of result.touched) {
        tile.touchedFrame = frame;
      }
      for (const tile of result.requested) {
        tile.touchedFrame = frame;
        // Nearest first across views (1.x orders by distance for REPLACE).
        const distance = tile.viewState(view.id).distance;
        const previous = requests.get(tile);
        requests.set(
          tile,
          previous === undefined ? distance : Math.min(previous, distance),
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

    this.request(requests);
    this.upload();
    this.evict(frame);
    this.stats.loading = this.inFlight + this.ready.length;
  }

  private request(requests: Map<Tile, number>): void {
    const order = [...requests.entries()].sort(
      (a, b) => a[1] - b[1] || a[0].depth - b[0].depth,
    );
    for (const [tile] of order) {
      if (this.inFlight >= this.maximumRequests) {
        break;
      }
      if (tile.state !== "unloaded") {
        continue;
      }
      tile.state = "loading";
      this.inFlight++;
      void this.loadContent(tile).finally(() => this.inFlight--);
    }
  }

  private async loadContent(tile: Tile): Promise<void> {
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
        return;
      }
      const asset = await this.engine.loadGltf(
        tile.contentUrl!,
        this.headers ? { headers: this.headers } : {},
      );
      if (this.destroyed) {
        closeImages(asset);
        return;
      }
      this.ready.push({ tile, asset });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unsupported tile format/.test(message)) {
        // Loaded but drawing nothing: selection and refinement behave as in
        // 1.x, which does decode these formats.
        tile.state = "ready";
        this.warnings.add(`${message} (drawn empty)`);
        return;
      }
      tile.state = "failed";
      this.warnings.add(`content failed: ${message}`);
    }
  }

  private upload(): void {
    for (let n = 0; n < this.uploadsPerFrame && this.ready.length > 0; n++) {
      const { tile, asset } = this.ready.shift()!;
      asset.warnings.forEach((w) => this.warnings.add(w));
      try {
        const instance = this.engine.addModel(this.world, asset, {
          modelMatrix: tile.transform,
          axes: "3d-tiles",
          viewMask: 0,
        });
        tile.instance = instance;
        tile.bytes = instance.bytes;
        tile.appliedMask = 0;
        tile.state = "ready";
        this.loaded.add(tile);
        this.stats.loaded++;
        this.stats.bytes += tile.bytes;
      } catch (error) {
        tile.state = "failed";
        this.warnings.add(
          `upload failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /** Least-recently-touched first, never a tile touched this frame. */
  private evict(frame: number): void {
    if (this.stats.bytes <= this.cacheBytes) {
      return;
    }
    const candidates = [...this.loaded]
      .filter((t) => t.touchedFrame < frame)
      .sort((a, b) => a.touchedFrame - b.touchedFrame);
    for (const tile of candidates) {
      if (this.stats.bytes <= this.cacheBytes) {
        break;
      }
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
    tile.bytes = 0;
    tile.state = "unloaded";
    tile.appliedMask = -1;
    this.loaded.delete(tile);
    this.masked.delete(tile);
  }

  /** Unloads all content. The tileset can't be used afterwards. */
  destroy(): void {
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
