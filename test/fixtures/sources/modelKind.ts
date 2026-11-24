// A source over a model of its server's truth (test/sourceSeam.test.ts, T2):
// point features in tiles, each feature a key with a value and a label, held
// in a plain Map the test changes. The source serves each tile it keeps
// resident from the model as the model stands when the tile loads, and its
// feed pushes what the test commits. It holds no copy of the model.
import type {
  ContentSource,
  ResolvedAsset,
  SourceChange,
  SourceHost,
  SourceKind,
  SourceTick,
} from "../../../packages/core/src/source/types.ts";
import { READ_ONLY } from "../../../packages/core/src/source/editing.ts";

/** One feature as its server holds it. */
export interface ModelFeature {
  readonly tile: string;
  readonly value: number;
  readonly label: string;
}

/** A server's truth: features by key, and the tiles its sources keep resident. */
export class ModelServer {
  /** Every server by its ID (`options.server`). */
  static readonly servers = new Map<string, ModelServer>();
  readonly features = new Map<string, ModelFeature>();

  constructor(
    readonly id: string,
    /** The tiles a source over it keeps resident. */
    readonly resident: readonly string[],
  ) {
    ModelServer.servers.set(id, this);
  }
}

export class ModelSource implements ContentSource {
  static readonly made: ModelSource[] = [];
  readonly kind = "model";
  readonly capabilities = {
    selection: "whole",
    outputs: ["points"],
    settles: true,
    pushes: true,
    write: READ_ONLY,
  } as const;
  readonly ready = Promise.resolve();
  readonly credits = [];
  readonly server: ModelServer;
  /** Tiles it loaded and holds now. */
  readonly loaded = new Set<string>();
  /** The most invalidations one update has seen (T2's coverage). */
  mostInvalidated = 0;
  /** Region-only invalidations its updates have seen (T2's coverage). */
  regionsSeen = 0;

  constructor(
    readonly asset: ResolvedAsset,
    readonly host: SourceHost,
  ) {
    ModelSource.made.push(this);
    const id = (asset.options as { server?: string } | undefined)?.server;
    const server = id === undefined ? undefined : ModelServer.servers.get(id);
    if (!server) {
      throw new Error("the model source names no server");
    }
    this.server = server;
  }

  update(tick: SourceTick): void {
    this.mostInvalidated = Math.max(
      this.mostInvalidated,
      tick.invalidated.length,
    );
    for (const change of tick.invalidated) {
      const area = change.region?.region;
      if (change.keys === undefined && area !== undefined) {
        // A region is this source's to map to keys: tile tN spans
        // longitudes N to N + 1. The engine dropped nothing for it, so the
        // source releases what it reloads.
        this.regionsSeen++;
        for (const tile of [...this.loaded]) {
          const n = Number(tile.slice(1));
          if (n >= area.west && n < area.east) {
            this.loaded.delete(tile);
            this.host.budget.release(tile);
          }
        }
        continue;
      }
      for (const key of change.keys ?? [...this.loaded]) {
        this.loaded.delete(key);
      }
    }
    for (const tile of tick.grant.keys) {
      this.load(tile);
      this.host.budget.settle(tile);
    }
    for (const tile of this.server.resident) {
      if (!this.loaded.has(tile)) {
        this.host.budget.want({
          key: tile,
          class: "now",
          benefit: 1,
          cost: { bytes: 100 },
          origin: "https://model.test",
        });
      }
    }
  }

  /** Writes tile `tile` as the model holds it now. */
  private load(tile: string): void {
    const rows = [...this.server.features]
      .filter(([, f]) => f.tile === tile)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    this.host.sinks.points.put({
      key: tile,
      crs: "EPSG:4978",
      count: rows.length,
      positions: new Float64Array(rows.length * 3),
      names: rows.map(([key]) => key),
      properties: {
        value: Float64Array.from(rows, ([, f]) => f.value),
        label: rows.map(([, f]) => f.label),
      },
    });
    this.loaded.add(tile);
  }

  /** A push, as its feed would make one. */
  push(change: SourceChange): void {
    this.host.changed(change);
  }

  destroy(): void {}
}

const kind: SourceKind = {
  id: "model",
  accepts: (asset) => asset.url.pathname.endsWith(".model"),
  open: (asset, host) => new ModelSource(asset, host),
};
export default kind;
