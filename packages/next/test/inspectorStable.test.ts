// The inspector's layout must not depend on its values: a snapshot of an idle
// engine and one of a heavily loading engine, with and without a hover, a
// pinned moment or a frozen (per-tick) window, render the same skeleton:
// the same elements, classes and row counts, text and inline widths aside.
import { describe, expect, it } from "vitest";
import {
  renderSections,
  summaryHtml,
  type Cursor,
  type FrameWin,
  type InspectorView,
  type SlowWin,
  type TickEntry,
} from "../widgets/inspector.ts";
import type { InspectorSnapshot } from "../widgets/inspectable.ts";

const SERIES = [
  "cache",
  "targets",
  "inFlight",
  "window",
  "received",
  "prefetch",
  "uploadQueue",
  "decode",
  "frames",
  "cpu",
] as const;

/** Tags and class lists, in order, with open and close marks: the skeleton. */
function skeleton(html: string | undefined): string[] {
  const out: string[] = [];
  for (const m of (html ?? "").matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>/g)) {
    const cls = /\sclass="([^"]*)"/.exec(m[3]!)?.[1] ?? "";
    out.push(m[1] ? `/${m[2]}` : `${m[2]}.${cls.trim().replace(/\s+/g, ".")}`);
  }
  return out;
}

const PASSES = ["shadows", "opaque", "imagery", "stars", "output", "pick"];

function slow(n: number, f: (i: number) => number): SlowWin {
  return {
    n,
    valid: n,
    times: Array.from({ length: n }, (_, i) => i * 250),
    series: Object.fromEntries(
      SERIES.map((k, j) => [k, Array.from({ length: n }, (_, i) => f(i + j))]),
    ) as SlowWin["series"],
  };
}

function frame(
  n: number,
  f: (i: number) => number,
  perTick: boolean,
): FrameWin {
  const entries: TickEntry[] = Array.from({ length: n }, (_, i) => ({
    tick: 1000 + i,
    t: i * 16,
    rendering: true,
    why: ["camera"],
    cpuMs: f(i),
  }));
  const passes = new Map(
    PASSES.map((p, k) => [
      p,
      Array.from({ length: n }, (_, i) => f(i + k) / 4),
    ]),
  );
  return {
    n,
    valid: n,
    times: Array.from({ length: n }, (_, i) => i * (perTick ? 16 : 250)),
    ...(perTick
      ? {
          ticks: entries.map((e) => e.tick),
          detail: entries,
          measured: entries.map(() => true),
        }
      : {}),
    cpu: Array.from({ length: n }, (_, i) => f(i)),
    fps: Array.from({ length: n }, (_, i) => f(i) * 2),
    passes,
    order: PASSES,
    untimed: Array.from({ length: n }, (_, i) => f(i) / 8),
    inFrame: Array.from({ length: n }, (_, i) => f(i) / 16),
    between: Array.from({ length: n }, (_, i) => f(i) / 16),
  };
}

const KINDS = [
  "terrain",
  "meshes",
  "instanced",
  "patches",
  "billboards",
  "lines",
  "points",
];

function snapshot(scale: number): InspectorSnapshot {
  const heavy = scale > 1;
  const big = (n: number) => n * scale;
  return {
    state: heavy ? "loading" : "settled",
    frame: {
      cpuMs: 0.5 * scale,
      gpuMs: 0.4 * scale,
      gpuSpanMs: 0.6 * scale,
      gpuWallMs: 2 * scale,
      gpuIntervalMs: heavy ? 16.7 : undefined,
      triangles: big(100),
      trianglesPerPixel: 0.01 * scale,
      intervalMs: 16.7,
      rendering: heavy ? "continuous" : "on demand",
      framesRendered: big(10),
      raysCast: big(3),
      geometry: KINDS.map((kind, i) => ({
        kind,
        draws: i < 2 || heavy ? big(i + 1) : 0,
        triangles: heavy ? big(1e5) : 0,
        points: heavy && i === 6 ? big(1e5) : 0,
        segments: 0,
      })),
      work: {
        uploadCalls: big(1),
        uploadBytes: big(1e6),
        textureCalls: big(2),
        textureBytes: big(1e6),
        submits: big(1),
        copyCalls: 0,
        copyBytes: 0,
        createdCount: big(1),
        createdBytes: big(1e5),
        mapCalls: 0,
        uploadBy: heavy
          ? [
              ["a very long label that has to be cut with an ellipsis", 5e6, 3],
              ["b", 4e6, 2],
              ["c", 3e6, 1],
              ["d", 2e6, 1],
            ]
          : [],
        createdBy: heavy ? [["x", 5e6, 1]] : [],
      },
    },
    tiles: {
      drawn: big(12),
      perView: [
        ["main", big(10)],
        ["inset", big(2)],
      ],
      undrawn: heavy ? 40 : 0,
      loading: big(30),
      window: {
        max: 128,
        adaptive: true,
        protocol: "h2",
        cancelled: big(1),
        uploadQueue: heavy ? 17 : 0,
      },
      cache: { bytes: heavy ? 580e6 : 1e6, budget: 512e6, overflow: 64e6 },
      sse: { maximum: 16, adjusted: heavy ? 18.25 : undefined },
      received: { requests: big(100), bytes: big(1e6) },
      purposes: [
        "Base",
        "Intermediate",
        "View",
        "Prefetch",
        "Height samples",
      ].map((label) => ({
        label,
        requests: big(10),
        bytes: heavy ? big(1e6) : 0,
        drawn: big(5),
        unused: heavy ? 3 : 0,
        cancelled: 0,
      })),
      load: {
        phases: [
          { label: "Root tileset", ms: big(30) },
          { label: "To first content", ms: big(100) },
          { label: "To settled", ms: big(300) },
        ],
        settled: !heavy,
      },
    },
    pipeline: {
      samples: heavy ? 200 : 1,
      stages: heavy
        ? {
            queued: { p50: 5, p95: 50 },
            network: { p50: 800, p95: 2000 },
            decode: { p50: 3, p95: 3 },
          }
        : { network: { p50: 1, p95: 1 } },
      content: {
        triangles: big(1e4),
        lines: heavy ? 9 : 0,
        points: 0,
        features: big(5),
        geometryBytes: heavy ? 5e7 : 0,
        textureBytes: heavy ? 1e7 : 0,
        images: heavy ? { "image/jpeg": 4, "image/x-odd": 2 } : {},
        ...(heavy ? { formats: "glb 120 · b3dm 4" } : {}),
      },
    },
    memory: [
      { label: "Draw records", unit: "count", used: big(10), capacity: 1000 },
      {
        label: "Models",
        unit: "count",
        used: 3,
        text: "3 · 1 held",
        detail: "Uploaded models.",
      },
      { label: "Render targets", unit: "bytes", used: big(1e6), capacity: 1e8 },
    ],
    gpu: {
      adapter: "Test adapter",
      renderTargetBytes: big(1e6),
      canvas: [800, 600],
    },
    camera: [0, 0, 0],
  };
}

const idle: InspectorView = {
  snap: snapshot(1),
  frame: frame(3, () => 0, false),
  slow: slow(3, () => 0),
};
const heavy = (over: Partial<InspectorView> = {}): InspectorView => ({
  snap: snapshot(500),
  frame: frame(120, (i) => (i * 7) % 50, false),
  slow: slow(120, (i) => (i * 13) % 1e6),
  lastMove: { ms: 2300, requests: 400, bytes: 4e7 },
  ...over,
});

const HOVER: Cursor = { t: 5000 };

describe("the inspector's skeleton", () => {
  it("is the same whatever the values", () => {
    const a = renderSections(idle);
    const b = renderSections(heavy());
    for (const key of Object.keys(a) as Array<keyof typeof a>) {
      expect(skeleton(b[key]), key).toEqual(skeleton(a[key]));
      if (key !== "pick" && key !== "record" && key !== "problems") {
        expect(skeleton(a[key]).length, key).toBeGreaterThan(0);
      }
    }
  });

  it("is the same with a hover, a pinned moment or a frozen window", () => {
    const base = skeleton(renderSections(heavy()).frame);
    const hover = renderSections(heavy({ cursor: HOVER }));
    const pinned = renderSections(heavy({ cursor: HOVER, pinned: true }));
    // Frozen: per-tick windows (300 ticks), with a pinned tick, and the tick
    // window of a freshly started inspector (a few ticks).
    const ticks = renderSections(
      heavy({
        frame: frame(300, (i) => (i * 3) % 40, true),
        cursor: { t: 1600, tick: 1100 },
        pinned: true,
      }),
    );
    const few = renderSections(heavy({ frame: frame(300, () => 0, true) }));
    for (const html of [hover, pinned, ticks, few]) {
      expect(skeleton(html.frame)).toEqual(base);
      expect(skeleton(html.streaming)).toEqual(
        skeleton(renderSections(heavy()).streaming),
      );
      expect(skeleton(html.memory)).toEqual(
        skeleton(renderSections(heavy()).memory),
      );
    }
  });

  it("keeps the header's segments", () => {
    for (const expanded of [false, true]) {
      const a = summaryHtml(snapshot(1), expanded);
      const b = summaryHtml(
        { ...snapshot(500), problems: { errors: [], warnings: ["w"] } },
        expanded,
      );
      const c = summaryHtml({ ...snapshot(500), state: "paused" }, expanded);
      expect(skeleton(b)).toEqual(skeleton(a));
      expect(skeleton(c)).toEqual(skeleton(a));
    }
  });

  it("lists every geometry kind and three slots of each largest list", () => {
    const html = renderSections(idle).frame!;
    for (const label of ["Terrain tiles", "Point clouds", "Lines, vectors"]) {
      expect(html).toContain(label);
    }
    expect(html.match(/data-zero="1"/g)!.length).toBeGreaterThan(3);
    // No sentence of prose is left in the live panel (it is behind an "i").
    expect(html).not.toContain("Counted before GPU culling</");
    expect(html).not.toContain("None:");
    expect(html).not.toContain("Largest writes:");
  });
});
