// The frames explorer's worker protocol (examples/frames-explorer/protocol.ts
// and host.ts)
// on the real catalog and data: the host over a Node MessageChannel against
// the frames data store, compared with direct calls (Review Focus 7). The
// stub-catalog tests are in test/framesExplorerProtocol.test.ts.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import references from "../../examples/frames-explorer/references.json";
import {
  TRAJECTORY_CHUNK_EXTENT,
  createHost,
  type HostPort,
  type MakeContext,
} from "../../examples/frames-explorer/host.ts";
import {
  createClient,
  type ClientWorker,
  type FrameParams,
  type OverlayGeometry,
} from "../../examples/frames-explorer/protocol.ts";
import {
  designGrid,
  distortion,
  overlayMesh,
  polyline,
  dashedLine,
  rigidVsExact,
  RIGID_VS_EXACT_COLORS,
  segments,
  adaptivePath,
  trajectoryPath,
  trueNorthLines,
} from "../../examples/frames-explorer/overlays.ts";
import { composedView } from "../../examples/frames-explorer/composed.ts";
import { buildTree } from "../../examples/frames-explorer/tree.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import {
  STRESS_CASES,
  boundCrsChecks,
  orionFromOem,
  ORION_OEM,
  runStress,
  type Fingerprint,
  type StoreManifest,
  type StressCase,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { Instant } from "../../src/time/Instant.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
const base = `${join(dir, "proj")}/`;
const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
const frames = createFrames({
  leapSeconds: LeapSeconds.builtIn(),
  eop: EarthOrientationParameters.fromCelestrakCsv(
    readFileSync(join(dir, "EOP-All.csv"), "utf8"),
  ),
  ephemeris: Ephemeris.fromPacks(
    bytes("planets-de440-2000-2050.pack"),
    bytes("moon-pa-de440-2000-2050.pack"),
  ),
  warnings: [],
} satisfies FrameData);
const orion = orionFromOem(readFileSync(join(dir, ORION_OEM), "utf8"), frames);

const context = (): StressContext => ({
  frames,
  // Node's PROJ finds the grids beside proj.db, so GEOID18 needs no loading.
  loadProj: () => loadProj({ base }),
  loadOrion: () => Promise.resolve(orion),
  manifest: JSON.parse(
    readFileSync(join(dir, "manifest.json"), "utf8"),
  ) as StoreManifest,
});

const recorded = (
  JSON.parse(
    readFileSync(
      new URL(
        "../../examples/frames-explorer/fingerprints.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { fingerprints: Record<string, Fingerprint> }
).fingerprints;

const print = (line: string) => process.stdout.write(`${line}\n`);

const open: MessagePort[] = [];
afterAll(() => {
  for (const port of open) {
    port.close();
  }
});

function connect(cases?: readonly StressCase[]) {
  const { port1, port2 } = new MessageChannel();
  open.push(port1, port2);
  const hostPort: HostPort = {
    postMessage: (message, transfer) =>
      port1.postMessage(message, transfer as never),
    get onmessage() {
      return null;
    },
    set onmessage(handler) {
      port1.onmessage = handler as never;
    },
  };
  const makeContext: MakeContext = async () => context();
  createHost(hostPort, makeContext, {
    fingerprints: recorded,
    ...(cases && { cases }),
  });
  const worker: ClientWorker = {
    postMessage: (message) => port2.postMessage(message),
    get onmessage() {
      return null;
    },
    set onmessage(handler) {
      port2.onmessage = handler as never;
    },
    onerror: null,
    onmessageerror: null,
    terminate: () => port2.close(),
  };
  return createClient(worker, new AbortController().signal);
}

describe("the worker protocol on the real catalog", () => {
  it(
    "streams results equal to a direct run, and times every case",
    { timeout: 120_000 },
    async () => {
      const direct = await runStress(context(), { fingerprints: recorded });
      const times = new Map<string, number>();
      const timed = STRESS_CASES.map((c): StressCase => ({
        ...c,
        async run(ctx) {
          const start = performance.now();
          try {
            return await c.run(ctx);
          } finally {
            times.set(c.id, performance.now() - start);
          }
        },
      }));
      const client = connect(timed);
      const streamed: StressResult[] = [];
      const summary = await client.run(undefined, (r) => streamed.push(r));
      expect(streamed).toStrictEqual(direct);
      expect(summary.failed).toBe(0);
      expect(summary.skipped).toBe(0);
      expect(summary.cancelled).toBe(false);
      // A cancel waits for the case in progress: the longest case bounds it.
      const slowest = [...times].sort((a, b) => b[1] - a[1]).slice(0, 3);
      print(
        `frames explorer worker: ${streamed.length} results in ${(summary.ms / 1000).toFixed(2)} s; slowest cases ${slowest
          .map(([id, ms]) => `${id} ${ms.toFixed(0)} ms`)
          .join(", ")}`,
      );
    },
  );

  it("runs R18's checks on a user WKT2 as a direct call does", async () => {
    const entry = references.entries["input-wkt2-ed50-utm31n"] as {
      wkt2: string;
    };
    const direct = await boundCrsChecks(context(), entry.wkt2, "ED50 site");
    const client = connect();
    const streamed: StressResult[] = [];
    await client.userCrs(entry.wkt2, "ED50 site", (r) => streamed.push(r));
    expect(streamed).toStrictEqual(direct);
    expect(streamed.length).toBeGreaterThan(3);
  });
});

describe("overlays built in the worker", () => {
  // NAD83(2011) / California zone 3 (ftUS) + NAVD88 height: reads GEOID18.
  const california: FrameParams = {
    name: "California zone 3",
    body: "earth",
    crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
  };
  const extent = {
    min: [6_000_000, 2_100_000] as [number, number],
    max: [6_200_000, 2_250_000] as [number, number],
  };
  let frame: EngineeringFrame | undefined;
  const direct = async () => {
    frame ??= EngineeringFrame.create(
      { name: california.name, body: EARTH, crs: california.crs },
      await loadProj({ base }),
    );
    return frame;
  };
  const chunksOf = (g: OverlayGeometry) =>
    Object.fromEntries(g.layers.map((l) => [l.name, l.chunks]));

  it("designGrid and trueNorthLines equal the builders' meshes, with the operation", async () => {
    const client = connect();
    const f = await direct();
    const grid = await client.overlay("designGrid", {
      frame: california,
      extent,
      step: 50_000,
      segment: 10_000,
    });
    expect(chunksOf(grid)).toStrictEqual({
      grid: overlayMesh(designGrid(f, extent, 50_000, 10_000)),
    });
    expect(grid.operation?.grids).toContain("us_noaa_g2018u0.tif");
    expect(grid.operation?.pipeline).toBe(f.operation.pipeline);
    const north = await client.overlay("trueNorthLines", {
      frame: california,
      extent,
      step: 50_000,
      segment: 10_000,
    });
    expect(chunksOf(north)).toStrictEqual({
      trueNorth: overlayMesh(trueNorthLines(f, extent, 50_000, 10_000)),
    });
  });

  it("rigidVsExact and distortion equal the builders' output", async () => {
    const client = connect();
    const f = await direct();
    const from = [6_100_000, 2_150_000] as const;
    const to = [6_165_000, 2_150_000] as const;
    const rigid = await client.overlay("rigidVsExact", {
      frame: california,
      from,
      to,
      samples: 32,
      dashes: 8,
      ticks: 4,
      marks: [20_000],
    });
    const want = rigidVsExact(f, from, to, 32, { ticks: 4, marks: [20_000] });
    expect(rigid.sagAtEnd).toBe(want.sagAtEnd);
    expect(rigid.sagAtEnd).toBeGreaterThan(1);
    expect(chunksOf(rigid)).toStrictEqual({
      exact: overlayMesh(polyline(want.exact, RIGID_VS_EXACT_COLORS.exact)),
      rigid: overlayMesh(
        dashedLine(
          want.rigid.subarray(0, 3),
          want.rigid.subarray(want.rigid.length - 3),
          8,
          RIGID_VS_EXACT_COLORS.rigid,
        ),
      ),
      ticks: overlayMesh(segments(want.ticks, RIGID_VS_EXACT_COLORS.rigid)),
    });
    expect(rigid.marks).toStrictEqual(
      want.marks.map((m) => ({
        distance: m.distance,
        exact: Array.from(m.exact),
        rigid: Array.from(m.rigid),
        separation: m.separation,
      })),
    );
    const options = { height: 0, tissotRadius: 2000 };
    const d = await client.overlay("distortion", {
      frame: california,
      extent,
      step: 25_000,
      ...options,
    });
    const wantD = distortion(f, extent, 25_000, options);
    expect(chunksOf(d)).toStrictEqual({
      tissot: overlayMesh(wantD.tissot),
      contours: overlayMesh(wantD.contours),
    });
    expect(d.labels).toStrictEqual({
      positions: wantD.labels.positions,
      values: wantD.labels.ppm,
      unit: "ppm",
    });
    expect(d.skipped).toBe(wantD.skipped);
  });

  it("trajectoryPath draws Orion as the builder does", async () => {
    const client = connect();
    const [t0, t1] = orion.spans[0]!;
    const at = (t0 + t1) / 2;
    const path = await client.overlay("trajectoryPath", {
      drawIn: "gcrf",
      t0,
      t1,
      step: 600,
      at,
    });
    const want = trajectoryPath(
      orion,
      frames.gcrf,
      frames,
      Instant.fromTdb(t0),
      Instant.fromTdb(t1),
      600,
      Instant.fromTdb(at),
    );
    expect(want.positions.length).toBeGreaterThan(100);
    expect(chunksOf(path)).toStrictEqual({ path: overlayMesh(want) });
  });

  it("trajectoryPath with an adaptive step draws Orion as adaptivePath does, with its sampling", async () => {
    const client = connect();
    const [t0, t1] = [orion.spans[0]![0], orion.spans.at(-1)![1]];
    const at = (t0 + t1) / 2;
    const adaptive = { tolerance: 2e-3, minStep: 10, maxSamples: 3000 };
    const path = await client.overlay("trajectoryPath", {
      drawIn: "gcrf",
      t0,
      t1,
      step: 3600,
      at,
      adaptive,
    });
    const want = adaptivePath(
      orion,
      frames.gcrf,
      frames,
      Instant.fromTdb(t0),
      Instant.fromTdb(t1),
      { step: 3600, ...adaptive },
      Instant.fromTdb(at),
    );
    expect(chunksOf(path)).toStrictEqual({
      path: overlayMesh(want, { extent: TRAJECTORY_CHUNK_EXTENT }),
    });
    expect(path.sampling).toEqual(want.sampling);
    expect(path.sampling!.samples).toBeLessThanOrEqual(3000);
  });

  it("trajectoryInfo gives Orion's tree node and its statements in one reply", async () => {
    const client = connect();
    const at = Instant.fromUtc(
      Date.parse("2026-04-06T23:00:00Z"),
      frames.data.leapSeconds,
    );
    const info = await client.trajectoryInfo(at.tdb());
    expect(info.at).toBe(at.tdb());
    expect(info.parent).toBe(orion.reference.name);
    expect(info.node).toMatchObject({
      id: orion.name,
      label: "Orion",
      edge: { kind: "trajectory" },
      children: [],
    });
    expect(info.node.edge.accuracy.meters).toBe(orion.positionSigma(at));
    // Plain data: no class instances cross.
    expect(info.node).not.toHaveProperty("frame");
    expect(info.node).not.toHaveProperty("trajectory");
    const tree = buildTree(frames, { trajectories: [orion] }, at);
    for (const reference of ["ITRF", "GCRF", "ICRF"] as const) {
      expect(info.composed[reference]).toStrictEqual(
        composedView(tree, frames, at, reference, orion.name),
      );
    }
    // Near the Moon, the unstated time scale dominates: about 10 m.
    const m = info.composed.ITRF.statement.meters!;
    expect(m).toBeGreaterThan(5);
    expect(m).toBeLessThan(20);
    const p = frameTransform(orion.frame, frames.itrf, at);
    expect(info.itrf).toEqual([p[12], p[13], p[14]]);
  });
});
