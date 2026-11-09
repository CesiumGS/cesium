// Shared page helpers for the frames data tests: the store, the explorer's host,
// and the tree a scenario's page draws.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";

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
  SCENES,
  earthSiteFrame,
  lunarSiteFrame,
  READY,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import type {
  KnobState,
  ScenarioId,
} from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";

import {
  ORION_OEM,
  STATIONS_SPK,
  orionFromOem,
  type StoreManifest,
  type StressContext,
} from "../../examples/frames-explorer/tests.ts";
import {
  buildScenarioTree,
  buildTree,
  type TreeNode,
} from "../../examples/frames-explorer/tree.ts";
import { catalogGridsFrom } from "../../examples/frames-explorer/stress/groups/global-geoids.ts";
import { gridSource, loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { type Frame } from "../../src/frames/Frame.ts";

import { composedAccuracy } from "../../examples/frames-explorer/composed.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { eastNorthUpFrame, framePoint } from "../../src/frames/local.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { measure } from "../../src/measure/measure.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { Instant } from "../../src/time/Instant.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

export const dir = framesDataDirectory();
/** The grids this file's PROJ loads: Node, like the browser, loads none unless named (Task 21). */
const GRIDS = ["us_noaa_g2018u0.tif"];
export const bytes = (file: string): ArrayBuffer => {
  const b = readFileSync(join(dir, file));
  return b.buffer.slice(
    b.byteOffset,
    b.byteOffset + b.byteLength,
  ) as ArrayBuffer;
};
export const frames = createFrames({
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
export const orion = orionFromOem(
  readFileSync(join(dir, ORION_OEM), "utf8"),
  frames,
);
export const context = (): StressContext => ({
  frames,
  loadProj: () => loadProj({ base: `${join(dir, "proj")}/`, grids: GRIDS }),
  // The PROJ-data catalog's grids, as the browser's /proj-grids/ serves them
  // (EGM2008's opt-in is not taken here).
  loadCatalogGrids: catalogGridsFrom(
    () => loadProj({ base: `${join(dir, "proj")}/`, grids: GRIDS }),
    () => gridSource({ base: `${join(dir, "grids")}/` }),
  ),
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

export function connect() {
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

export const print = (line: string) => process.stdout.write(`${line}\n`);
export const spec = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
export const checkedTdb = (id: ScenarioId) =>
  Instant.fromUtc(
    Date.parse(spec(id).checked.epochUtc),
    frames.data.leapSeconds,
  ).tdb();

/** The page's own frames for a scenario, as the stage builds them (stage.ts `applySceneKnobs`). */
export function pageFrames(
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
export function pageTree(
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

export const nodes = (tree: TreeNode): TreeNode[] => [
  tree,
  ...tree.children.flatMap(nodes),
];

export interface AccuracyRow {
  readonly key: string;
  readonly meters: number | null;
}

const stationTrajectories = new Map<string, Trajectory<string>>();
const station = (dish: string, instant: Instant) => {
  let t = stationTrajectories.get(dish);
  if (!t) {
    t = Trajectory.fromSpk(
      [bytes(STATIONS_SPK)],
      399000 + Number(dish.slice(3)),
      frames,
      { name: dish, accuracy: "precise", j2000: "icrf" },
    );
    stationTrajectories.set(dish, t);
  }
  const s = t.state(instant);
  return framePoint(
    eastNorthUpFrame(
      `${dish}-enu`,
      frames.itrf,
      Ellipsoid.WGS84,
      s.subarray(0, 3),
    ),
    [0, 0, 0],
  );
};

/** Every composed accuracy the explorer shows and `measure` states for six cases, as plain rows sorted by key. */
let pageClient: ReturnType<typeof connect> | undefined;
export async function accuracyRows(): Promise<AccuracyRow[]> {
  const rows: AccuracyRow[] = [];
  for (const id of READY) {
    const s = spec(id);
    const t = checkedTdb(id);
    const instant = Instant.fromTdb(t);
    const e = await (pageClient ??= connect()).scenario(id, s.checked.knobs, t);
    const tree = pageTree(id, s.checked.knobs, e, instant);
    const all = composedAccuracy(tree, frames, instant);
    for (const [reference, views] of Object.entries(all)) {
      for (const [node, view] of Object.entries(views)) {
        rows.push({
          key: `scenario/${id}/${reference}/${node}`,
          meters: view.statement.meters ?? null,
        });
      }
    }
  }
  const at = Instant.fromIso(
    "2026-04-06T12:00:00",
    "UTC",
    frames.data.leapSeconds,
  );
  const orionPoint = framePoint(orion.frame, [0, 0, 0]);
  const earth = framePoint(frames.itrf, [0, 0, 0]);
  const moon = framePoint(frames.moonMe, [0, 0, 0]);
  const site = (a: number, b: number) =>
    framePoint(
      eastNorthUpFrame("site", frames.itrf, Ellipsoid.WGS84, [a, b, 0]),
      [0, 0, 0],
    );
  const lunar = framePoint(lunarSiteFrame(frames.moonMe, -89.5), [0, 0, 0]);
  const cases: [
    string,
    Parameters<typeof measure>[0],
    Parameters<typeof measure>[1],
  ][] = [
    ["dss43-orion", station("DSS43", at), orionPoint],
    ["orion-moon", orionPoint, moon],
    ["lunar-89.5S-earth", lunar, earth],
    ["earth-sites-1km", site(6378137, 0), site(6378137, 1000)],
    ["barycentre-earth", framePoint(frames.icrf, [0, 0, 0]), earth],
    ["orion-dss14", orionPoint, station("DSS14", at)],
  ];
  for (const [name, a, b] of cases) {
    rows.push({
      key: `measure/${name}`,
      meters: measure(a, b, at, frames).accuracy.meters ?? null,
    });
  }
  return rows.sort((x, y) => (x.key < y.key ? -1 : 1));
}
