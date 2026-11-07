// Every frame the app defines states its accuracy (the owner's follow-up,
// 2026-11-07), and no view shows two answers: for every scenario at its
// checked setup, on the tree the page draws (its own frames attached, as
// treeState.ts attaches them), each edge on the answer's path states an
// accuracy unless a source truly states none; each frame the app defines
// gives the library (`Frame.accuracy`) what its tree edge shows; and where
// the answer's ± carries an end the app defines, the walk (composed.ts,
// `pointAccuracy`) states the same figure for it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { composedView } from "../../examples/frames-explorer/composed.ts";
import {
  createHost,
  type HostPort,
  type MakeContext,
} from "../../examples/frames-explorer/host.ts";
import {
  createClient,
  type ClientWorker,
} from "../../examples/frames-explorer/protocol.ts";
import type { ScenarioEvaluation } from "../../examples/frames-explorer/scenarios/evaluate.ts";
import {
  READY,
  SCENES,
  earthSiteFrame,
  lunarSiteFrame,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import type {
  KnobState,
  ScenarioId,
} from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import { MOON_ME_RADIANS } from "../../examples/frames-explorer/scenarios/stated.ts";
import {
  ORION_OEM,
  STATIONS_SPK,
  orionFromOem,
  type StoreManifest,
  type StressContext,
} from "../../examples/frames-explorer/tests.ts";
import {
  branchPath,
  buildScenarioTree,
  buildTree,
  type TreeNode,
} from "../../examples/frames-explorer/tree.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { isUnstated } from "../../src/frames/frameAccuracy.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { Instant } from "../../src/time/Instant.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const dir = framesDataDirectory();
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
  loadProj: () => loadProj({ base: `${join(dir, "proj")}/` }),
  loadOrion: () => Promise.resolve(orion),
  loadStations: () => Promise.resolve(bytes(STATIONS_SPK)),
  manifest: JSON.parse(
    readFileSync(join(dir, "manifest.json"), "utf8"),
  ) as StoreManifest,
});

const open: MessagePort[] = [];
afterAll(() => {
  for (const port of open) {
    port.close();
  }
});

function connect() {
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
  createHost(hostPort, makeContext);
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

const client = connect();
const print = (line: string) => process.stdout.write(`${line}\n`);
const spec = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
const checkedTdb = (id: ScenarioId) =>
  Instant.fromUtc(
    Date.parse(spec(id).checked.epochUtc),
    frames.data.leapSeconds,
  ).tdb();

/**
 * Built-in edges that truly state no accuracy, with the source that says
 * so: an answer's path may cross them, and a walk across them is unbounded.
 */
const STATES_NONE: Readonly<Record<string, string>> = {
  // None today: MOON_ME's, which DE440 leaves unstated, the explorer
  // estimates (stated.ts MOON_ME_ACCURACY, the coordinator's ruling,
  // 2026-11-07).
};

/** The page's own frames for a scenario, as the stage builds them (stage.ts `applySceneKnobs`). */
function pageFrames(
  id: ScenarioId,
  knobs: KnobState,
  e: ScenarioEvaluation,
): Frame[] {
  const scene = SCENES[id]!;
  const latitude = scene.lunarSite?.(knobs);
  return [
    ...(latitude !== undefined
      ? [lunarSiteFrame(frames.moonMe, latitude)]
      : []),
    ...(scene.earthSites?.(knobs) ?? []).map((s) =>
      earthSiteFrame(frames.itrf, s),
    ),
    ...(scene.bodies?.(frames, knobs, e) ?? []),
  ];
}

/** The tree the page draws, its own frames attached (treeState.ts) and Orion's. */
function pageTree(
  id: ScenarioId,
  knobs: KnobState,
  e: ScenarioEvaluation,
  instant: Instant,
): TreeNode {
  const tree = buildScenarioTree(buildTree(frames, {}, instant), e.added);
  const local = pageFrames(id, knobs, e);
  const attach = (n: TreeNode) => {
    const f = local.find((l) => l.name === n.id);
    if (f) {
      n.frame = f;
    }
    if (n.id === orion.name) {
      n.frame = orion.frame;
    }
    n.children.forEach(attach);
  };
  attach(tree);
  return tree;
}

const nodes = (tree: TreeNode): TreeNode[] => [
  tree,
  ...tree.children.flatMap(nodes),
];

const stated = (a: TreeNode["edge"]["accuracy"]) =>
  a.byDefinition === true || a.meters !== undefined || a.radians !== undefined;

describe("every frame states its accuracy, and the walk and the answer agree (the owner's follow-up, 2026-11-07)", () => {
  it("at every scenario's checked setup: the path's edges state an accuracy, the app's frames give the library what the tree shows, and the answer carries each app-defined end at the walk's figure", async () => {
    const lines: string[] = [];
    for (const id of READY) {
      const s = spec(id);
      const knobs = s.checked.knobs;
      const t = checkedTdb(id);
      const instant = Instant.fromTdb(t);
      const e = await client.scenario(id, knobs, t);
      const tree = pageTree(id, knobs, e, instant);
      const byId = new Map(nodes(tree).map((n) => [n.id, n]));

      // Every frame the scenario adds that the page builds states an
      // accuracy to the library, and the same one its tree edge shows: one
      // accuracy per thing. (Orion's node is the library's trajectory, its
      // OEM covariance stated on its edge and composed by accuracyOf.)
      const local = new Set(pageFrames(id, knobs, e).map((f) => f.name));
      for (const a of e.added) {
        const n = byId.get(a.id)!;
        if (n.frame === undefined || !local.has(a.id)) {
          continue;
        }
        const lib = n.frame.accuracy(instant);
        expect(isUnstated(lib), `${id}: ${a.id} states nothing`).toBe(false);
        expect(a.app, `${id}: ${a.id} is the app's`).toBe(true);
        expect(
          {
            meters: lib.meters,
            radians: lib.radians,
            byDefinition: lib.byDefinition,
            note: lib.note,
          },
          `${id}: ${a.id}'s library accuracy is its tree edge's`,
        ).toEqual({
          meters: a.edge.accuracy.meters,
          radians: a.edge.accuracy.radians,
          byDefinition: a.edge.accuracy.byDefinition,
          note: a.edge.accuracy.note,
        });
        // An estimate says so, with its reasoning (the robot arm's
        // synthetic spec sheet, Task 7b, says "synthetic").
        if (!lib.byDefinition && !/^published: /.test(lib.note)) {
          expect(lib.note, `${id}: ${a.id}`).toMatch(
            /^estimated, illustrative: .+|\(synthetic\b/,
          );
        }
      }

      const path = e.answer.path;
      expect(path, `${id} has a path`).toBeDefined();
      const route = branchPath(tree, path!.from, path!.to);
      // Each edge on the path states an accuracy, unless a source says none.
      for (const n of [...route.up, ...route.down]) {
        if (!stated(n.edge.accuracy)) {
          expect(
            STATES_NONE[n.id],
            `${id}: ${n.id} on the path states nothing (${n.edge.accuracy.note})`,
          ).toBeDefined();
        }
      }
      // An end the app defines: its walk is bounded unless it crosses an
      // edge a source leaves unstated; where the answer's ± is a length,
      // it carries the end at the walk's figure.
      const lengthAnswer =
        e.answer.accuracy.meters !== undefined &&
        e.answer.accuracy.figure === undefined;
      for (const end of [path!.from, path!.to]) {
        const n = byId.get(end)!;
        if (!n.app || n.frame === undefined) {
          continue;
        }
        const walk = composedView(tree, frames, instant, "ITRF", end)!;
        const meters = walk.statement.meters;
        if (meters === undefined) {
          const by = walk.statement.terms.find((x) => x.meters === undefined);
          const route = branchPath(tree, end, "ITRF");
          const unstated = [...route.up, ...route.down].filter(
            (x) => !stated(x.edge.accuracy),
          );
          expect(
            unstated.length > 0 &&
              unstated.every((x) => STATES_NONE[x.id] !== undefined),
            `${id}: ${end}'s walk is unbounded (${by?.note ?? walk.note})`,
          ).toBe(true);
          lines.push(`${id}: ${end} walk not bounded (${walk.note})`);
          continue;
        }
        lines.push(`${id}: ${end} walk ±${meters} m`);
        if (lengthAnswer) {
          const carried = e.answer.accuracy.walks?.find((w) => w.frame === end);
          expect(carried, `${id}: the answer carries ${end}`).toBeDefined();
          expect(carried!.meters, `${id}: ${end}`).toBeCloseTo(meters, 12);
          // The answer's ± holds the walk's figure.
          expect(e.answer.accuracy.meters!).toBeGreaterThanOrEqual(
            meters - 1e-12,
          );
        }
      }
    }
    print(lines.join("\n"));
  }, 600_000);
});

describe("MOON_ME's orientation, estimated, at a point's lever (the coordinator's ruling, 2026-11-07)", () => {
  it("adds its rotation error times the lunar site's distance from the Moon's centre to the site's walk, on MOON_ME's edge, and adds nothing at MOON_ME's own origin", async () => {
    const id: ScenarioId = "stand-on-moon";
    const knobs = spec(id).checked.knobs;
    const t = checkedTdb(id);
    const instant = Instant.fromTdb(t);
    const e = await client.scenario(id, knobs, t);
    const tree = pageTree(id, knobs, e, instant);
    const site = nodes(tree).find((n) => n.id === "Lunar site")!.frame!;
    const m = frameTransform(site, frames.moonMe, instant);
    const lever = Math.hypot(m[12]!, m[13]!, m[14]!);
    expect(lever).toBeGreaterThan(1.73e6);
    for (const r of ["ITRF", "GCRF"] as const) {
      const v = composedView(tree, frames, instant, r, "Lunar site")!;
      const i = v.termEdges.findIndex(
        (x) => x.length === 1 && x[0] === "MOON_ME",
      );
      expect(i, r).toBeGreaterThanOrEqual(0);
      expect(v.statement.terms[i]!.meters).toBeCloseTo(
        MOON_ME_RADIANS * lever,
        9,
      );
      expect(v.statement.terms[i]!.note).toMatch(/^estimated, illustrative: /);
      expect(v.zeroAtOrigin.map((z) => z.edge)).not.toContain("MOON_ME");
      // The rest is the library's statement for that point, as before.
      const rest = v.statement.terms
        .filter((_, k) => k !== i)
        .map((x) => x.meters ?? 0);
      expect(v.statement.meters).toBeCloseTo(
        Math.hypot(...rest, MOON_ME_RADIANS * lever),
        12,
      );
      print(
        `lunar site against ${r}: ±${v.statement.meters} m (MOON_ME ±${MOON_ME_RADIANS * lever} m at ${lever} m)`,
      );
    }
    // At MOON_ME's own origin (the Moon's centre, MOON_PA's origin), its
    // rotation adds nothing, and the walk says why.
    const pa = composedView(tree, frames, instant, "ITRF", "MOON_PA");
    if (pa) {
      const z = pa.zeroAtOrigin.find((x) => x.edge === "MOON_ME");
      expect(z?.why).toMatch(/lever arm is 0 m/);
    }
  }, 120_000);
});
