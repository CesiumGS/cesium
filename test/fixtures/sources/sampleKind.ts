// An in-memory sample source, for the tests only (test/sourceSeam.test.ts):
// a "whole" source with no network that writes to every sink (draws, images,
// features, points, custom rows), wants its content through the shared
// budget, decodes on a worker through its kind's decoder, and pushes
// samples, invalidations and feature changes when a test tells it to.
import { createBox } from "../../../packages/core/src/scene/meshes.ts";
import {
  READ_ONLY,
  type WriteCapabilities,
} from "../../../packages/core/src/source/editing.ts";
import type {
  ContentSource,
  ResolvedAsset,
  SourceChange,
  SourceHost,
  SourceKind,
  SourceTick,
} from "../../../packages/core/src/source/types.ts";

/** The decoder's job type. */
export const SUM = "test:sum";

/** The content key its version checks want. */
const VERSION = "version";

/** What a sample source's options may say (`ResolvedAsset.options`). */
interface SampleOptions {
  /** Its content keys, each loaded once granted. Default ["a"]. */
  keys?: string[];
  /** The origin its wants name. Default its URL's. */
  origin?: string;
  /** Every want's class. Default "now". */
  class?: "now" | "refine" | "prefetch";
  /** Bytes per key. Default 1000. */
  bytes?: number;
  /** It may write (CS-831): every row must then be named. */
  writable?: boolean;
  /** Leave the rows unnamed (to show the writable check). */
  unnamed?: boolean;
  /**
   * Check its server's version every this many seconds on the views' clock
   * (CS-863), under the budget, and push an invalidation when it changes.
   */
  polls?: number;
  /** Declare pushes: false. */
  silent?: boolean;
}

export class SampleSource implements ContentSource {
  readonly kind = "sample";
  readonly capabilities;
  readonly ready = Promise.resolve();
  readonly credits = [{ html: "Sample data" }];
  readonly writer;
  /** Each tick it saw: its grant's keys, the views and invalidations. */
  readonly ticks: {
    keys: readonly string[];
    views: number;
    invalidated: number;
  }[] = [];
  readonly loaded = new Set<string>();
  /** The server's version as last read, and when it was checked. */
  version: string | undefined;
  private lastPoll = -Infinity;
  private polling = false;
  private readonly options: SampleOptions;

  constructor(
    readonly asset: ResolvedAsset,
    readonly host: SourceHost,
  ) {
    this.options = (asset.options ?? {}) as SampleOptions;
    const write: WriteCapabilities = this.options.writable
      ? { ...READ_ONLY, update: true, versioned: "feature" }
      : READ_ONLY;
    this.capabilities = {
      selection: "whole",
      outputs: ["meshes", "raster", "features", "points", "test:splats"],
      settles: true,
      pushes: !this.options.silent,
      ...(this.options.polls !== undefined
        ? { polls: { intervalSeconds: this.options.polls } }
        : {}),
      write,
    } as const;
    this.writer = this.options.writable
      ? { commit: async () => ({ ok: true as const, version: "2" }) }
      : undefined;
  }

  update(tick: SourceTick): void {
    this.ticks.push({
      keys: tick.grant.keys,
      views: tick.views.length,
      invalidated: tick.invalidated.length,
    });
    for (const change of tick.invalidated) {
      for (const key of change.keys ?? [...this.loaded]) {
        this.loaded.delete(key);
      }
    }
    const origin = this.options.origin ?? this.asset.url.origin;
    for (const key of tick.grant.keys) {
      if (key === VERSION) {
        this.poll(tick.seconds);
        continue;
      }
      this.write(key);
      this.host.budget.settle(key);
    }
    const interval = this.options.polls;
    if (
      interval !== undefined &&
      !this.polling &&
      tick.seconds - this.lastPoll >= interval
    ) {
      // Its own check, on its declared interval, through the shared budget.
      this.host.budget.want({
        key: VERSION,
        class: "refine",
        benefit: 1,
        cost: { bytes: 0 },
        origin,
      });
    }
    for (const key of this.options.keys ?? ["a"]) {
      if (!this.loaded.has(key)) {
        this.host.budget.want({
          key,
          class: this.options.class ?? "now",
          benefit: 1,
          cost: { bytes: this.options.bytes ?? 1000 },
          origin,
        });
      }
    }
  }

  /** Writes key `key`'s content to every sink. */
  write(key: string): void {
    const { sinks } = this.host;
    const names = (prefix: string, n: number) =>
      this.options.unnamed
        ? undefined
        : Array.from({ length: n }, (_, i) => `${prefix}-${i}`);
    const mesh = sinks.draws.addMesh(createBox());
    sinks.draws.addDraw({
      mesh,
      id: `${key}/box`,
      origin: Float64Array.of(0, 0, 0),
    });
    sinks.images.put({
      key,
      footprint: { scheme: "test", level: 0, x: 0, y: 0 },
      width: 1,
      height: 1,
      pixels: { format: "rgba8", data: Uint8Array.of(255, 0, 0, 255) },
      credits: [{ html: `Image ${key}` }],
    });
    sinks.features.put({
      key,
      geometry: "line",
      crs: "EPSG:4979",
      count: 2,
      positions: Float64Array.of(0, 0, 0, 1, 0, 0, 1, 1, 0, 2, 2, 0),
      offsets: Uint32Array.of(0, 2, 4),
      ...(names("road", 2) ? { names: names("road", 2) } : {}),
      properties: { lanes: Float64Array.of(2, 4), name: ["Main", "Side"] },
      credits: [{ html: "Roads" }],
    });
    sinks.points.put({
      key,
      crs: "EPSG:4978",
      count: 3,
      positions: new Float64Array(9),
      ...(names("car", 3) ? { names: names("car", 3) } : {}),
      properties: { speed: new Float64Array(3) },
    });
    sinks.custom("test:splats").put({
      key,
      count: 1,
      columns: { scale: Float32Array.of(0.5) },
      ...(names("splat", 1) ? { names: names("splat", 1) } : {}),
    });
    this.loaded.add(key);
  }

  /** Reads the server's version (CS-809's provider) and pushes what changed. */
  private poll(seconds: number): void {
    this.polling = true;
    this.lastPoll = seconds;
    void this.host.fetch
      .fetch(new URL("version", this.asset.url), { kind: "endpoint" })
      .then((response) => response.text())
      .then((version) => {
        if (this.version !== undefined && version !== this.version) {
          this.host.changed({ kind: "invalidate", version });
        }
        this.version = version;
      })
      .finally(() => {
        this.polling = false;
        this.host.budget.settle(VERSION, 0);
        this.host.budget.release(VERSION);
      });
  }

  /** A push, as its feed would make one. */
  push(change: SourceChange): void {
    this.host.changed(change);
  }

  /** Sums `values` on a worker, through its kind's decoder. */
  sum(
    values: Float64Array,
  ): Promise<{ sum: number; doubled: Float64Array; thread: number }> {
    return this.host.jobs.submit<{
      sum: number;
      doubled: Float64Array;
      thread: number;
    }>({
      type: SUM,
      payload: { values },
    }).promise;
  }

  destroy(): void {}
}

const kind: SourceKind = {
  id: "sample",
  accepts: (asset) => asset.url.pathname.endsWith(".sample"),
  open: (asset, host) => new SampleSource(asset, host),
  decoders: [
    { type: SUM, module: new URL("./sumDecoder.ts", import.meta.url) },
  ],
};
export default kind;
