/**
 * `Inspectable` for a 2.0 engine, from its public statistics: frame
 * timing, the tilesets' streaming and content pipeline, and the world's GPU
 * pools.
 */
import type {
  ContentSummary,
  Engine,
  RequestPurpose,
  Tileset3D,
  View,
  World,
} from "../src/index.ts";
import type {
  ContentMix,
  Inspectable,
  InspectorSnapshot,
  MemoryRow,
  StagePercentiles,
} from "./inspectable.ts";

/** Request purposes in the inspector's order, with their labels. */
const PURPOSE_LABELS: Record<RequestPurpose, string> = {
  base: "Base",
  intermediate: "Intermediate",
  view: "View",
  prefetch: "Prefetch",
  sample: "Height samples",
};

/** A single model loaded without a tileset: its load, end to end. */
export interface ModelLoad {
  summary: ContentSummary;
  networkMs: number;
  decodeMs: number;
  uploadMs: number;
}

export interface EngineSnapshotOptions {
  /** The tilesets to report (terrain included), read on every snapshot. */
  tilesets: () => readonly Tileset3D[];
  /** Named views, for tiles drawn per view (when there are several). */
  views?: () => ReadonlyArray<readonly [string, View]>;
  /** The world whose GPU pools to report (default: the first tileset's). */
  world?: World;
  canvas?: HTMLCanvasElement;
  /** When loading began (`performance.now()`), for the load timeline. */
  loadStartedAt?: number;
  /** When the content's endpoint resolved (ion), within the load. */
  resolvedAt?: number;
  /** A model loaded on its own, when there is no tileset. */
  model?: () => ModelLoad | undefined;
  /** Frame timing measured by the host instead of the engine's own. */
  frame?: () => InspectorSnapshot["frame"];
}

export interface EngineInspectOptions extends EngineSnapshotOptions {
  name: string;
  color?: string;
}

export function inspectEngine(
  engine: Engine,
  options: EngineInspectOptions,
): Inspectable {
  return {
    name: options.name,
    ...(options.color ? { color: options.color } : {}),
    snapshot: () => engineSnapshot(engine, options),
  };
}

/** One snapshot of a 2.0 engine (for hosts that build their own `Inspectable`). */
export function engineSnapshot(
  engine: Engine,
  options: EngineSnapshotOptions,
): InspectorSnapshot {
  const tilesets = options.tilesets();
  const s = engine.stats;
  const out: InspectorSnapshot = {
    state: tilesets.some((t) => t.freezeSelection)
      ? "paused"
      : tilesets.every((t) => t.idle)
        ? "settled"
        : "loading",
    frame: options.frame?.() ?? {
      cpuMs: s.cpuMs,
      ...(Number.isNaN(s.gpuMs) ? {} : { gpuMs: s.gpuMs }),
      rendering:
        engine.renderMode === "continuous" ? "continuous" : "on demand",
      framesRendered: s.framesRendered,
    },
  };
  const warnings = [...new Set(tilesets.flatMap((t) => [...t.warnings]))];
  if (warnings.length > 0) {
    out.problems = { errors: [], warnings };
  }

  if (tilesets.length > 0) {
    const sum = (f: (t: Tileset3D) => number) =>
      tilesets.reduce((n, t) => n + f(t), 0);
    const widest = tilesets.reduce((a, b) =>
      b.stats.maxInFlight > a.stats.maxInFlight ? b : a,
    );
    const views = options.views?.() ?? [];
    out.tiles = {
      drawn: sum((t) =>
        [...t.stats.selected.values()].reduce((a, b) => a + b, 0),
      ),
      ...(views.length > 1
        ? {
            perView: views.map(
              ([name, v]) =>
                [
                  name,
                  sum(
                    (t) =>
                      t.stats.selected.get(Math.log2(engine.viewBit(v))) ?? 0,
                  ),
                ] as [string, number],
            ),
          }
        : {}),
      known: sum((t) => t.stats.tiles),
      loading: sum((t) => t.stats.inFlight),
      window: {
        max: widest.stats.maxInFlight,
        adaptive: widest.stats.adaptive,
        ...(widest.stats.protocol ? { protocol: widest.stats.protocol } : {}),
        cancelled: sum((t) => t.stats.cancelled),
        uploadQueue: sum((t) => t.stats.uploadQueue),
      },
      cache: {
        bytes: sum((t) => t.stats.bytes),
        budget: Math.max(...tilesets.map((t) => t.stats.budget)),
        overflow: Math.max(...tilesets.map((t) => t.stats.overflow)),
      },
      sse: {
        // Over several tilesets (terrain at 2 px, buildings at 16), the
        // coarsest threshold.
        maximum: Math.max(
          ...tilesets.map((t) => t.selection.maximumScreenSpaceError),
        ),
        adjusted: Math.max(...tilesets.map((t) => t.stats.screenSpaceError)),
        placeholders: sum((t) => t.stats.placeholders),
      },
      received: {
        requests: sum((t) => t.stats.requestsTotal),
        bytes: sum((t) => t.stats.bytesReceived),
      },
      purposes: (Object.keys(PURPOSE_LABELS) as RequestPurpose[])
        .map((p) => ({
          label: PURPOSE_LABELS[p],
          requests: sum((t) => t.stats.purposes[p].requests),
          bytes: sum((t) => t.stats.purposes[p].bytes),
          drawn: sum((t) => t.stats.purposes[p].drawn),
          unused: sum((t) => t.stats.purposes[p].unused),
          cancelled: sum((t) => t.stats.purposes[p].cancelled),
        }))
        .filter((p, i) => p.requests > 0 || i < 4), // samples when any
      load: loadPhases(tilesets, options),
    };

    // The tileset with the most recent loads speaks for the pipeline.
    const busiest = tilesets
      .map((t) => t.pipeline())
      .reduce((a, b) => (b.samples > a.samples ? b : a));
    const content = emptyMix();
    const formats: Record<string, number> = {};
    for (const t of tilesets) {
      addMix(content, t.resident);
      for (const [f, n] of Object.entries(t.resident.formats)) {
        formats[f] = (formats[f] ?? 0) + n;
      }
    }
    content.formats = Object.entries(formats)
      .filter(([, n]) => n > 0)
      .map(([f, n]) => `${f} ${n}`)
      .join(" · ");
    out.pipeline = {
      samples: busiest.samples,
      stages: busiest.stages as Record<string, StagePercentiles>,
      content,
    };
  } else {
    const model = options.model?.();
    if (model) {
      const one = (ms: number) => ({ p50: ms, p95: ms });
      const content = emptyMix();
      addMix(content, model.summary);
      content.formats = model.summary.format;
      out.pipeline = {
        samples: 1,
        note: "one model",
        stages: {
          network: one(model.networkMs),
          decode: one(model.decodeMs),
          upload: one(model.uploadMs),
        },
        content,
      };
    }
  }

  const world = options.world ?? tilesets[0]?.world;
  const targets = engine.renderTargetMemory;
  if (world) {
    const m = world.memory;
    const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;
    const rows: MemoryRow[] = [
      { label: "Vertex arena", unit: "bytes", ...m.vertexBytes },
      { label: "Index arena", unit: "bytes", ...m.indexBytes },
      { label: "Draw records", unit: "count", ...m.draws },
      { label: "Materials", unit: "count", ...m.materials },
      {
        label: "Render targets",
        unit: "bytes",
        used: targets.residentBytes,
        capacity: targets.workingSetBytes + targets.idleBudget,
        text: `${mb(targets.residentBytes)} resident · idle cap ${mb(targets.idleBudget)}`,
      },
      {
        label: "Fixed GPU tables",
        unit: "bytes",
        used: m.tableBytes,
        text: `${mb(m.tableBytes)} (records, lists, indirect args)`,
      },
    ];
    out.memory = rows;
  }
  const info = engine.gpu.adapter.info;
  out.gpu = {
    adapter: `${info.vendor} ${info.architecture}`.trim(),
    views: s.views,
    batches: s.batches,
    renderTargetBytes: targets.residentBytes,
    ...(options.canvas
      ? { canvas: [options.canvas.width, options.canvas.height] }
      : {}),
  };
  return out;
}

/** Resolve, root tileset, to first content, to settled (or still streaming). */
function loadPhases(
  tilesets: readonly Tileset3D[],
  options: EngineSnapshotOptions,
): NonNullable<NonNullable<InspectorSnapshot["tiles"]>["load"]> {
  const now = performance.now();
  const start =
    options.loadStartedAt ?? Math.min(...tilesets.map((t) => t.createdAt));
  const root = Math.max(...tilesets.map((t) => t.createdAt));
  const firsts = tilesets
    .map((t) => t.firstContentAt)
    .filter((v): v is number => v !== undefined);
  const first = firsts.length > 0 ? Math.min(...firsts) : undefined;
  const settled = tilesets.every((t) => t.settledAt !== undefined)
    ? Math.max(...tilesets.map((t) => t.settledAt!))
    : undefined;
  const end = settled ?? now;
  const phases: Array<{ label: string; ms: number }> = [];
  if (options.resolvedAt !== undefined) {
    phases.push({ label: "Resolve endpoint", ms: options.resolvedAt - start });
  }
  phases.push(
    {
      label: "Root tileset",
      ms: Math.max(0, root - (options.resolvedAt ?? start)),
    },
    { label: "To first content", ms: Math.max(0, (first ?? end) - root) },
    {
      label: settled !== undefined ? "To settled" : "Streaming",
      ms: first !== undefined ? Math.max(0, end - first) : 0,
    },
  );
  return { phases, settled: settled !== undefined };
}

function emptyMix(): ContentMix {
  return {
    triangles: 0,
    lines: 0,
    points: 0,
    features: 0,
    geometryBytes: 0,
    textureBytes: 0,
    images: {},
  };
}

function addMix(mix: ContentMix, s: Omit<ContentSummary, "format">): void {
  mix.triangles += s.triangles;
  mix.lines += s.lines;
  mix.points += s.points;
  mix.features += s.features;
  mix.geometryBytes += s.geometryBytes;
  mix.textureBytes += s.textureBytes;
  for (const [type, n] of Object.entries(s.images)) {
    mix.images[type] = (mix.images[type] ?? 0) + n;
  }
}
