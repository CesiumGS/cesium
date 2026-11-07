// The robot arm at a spaceport (Task 7b) on the frames data store, through
// the worker's host as the page asks for it: its app-defined frames and
// route, the tool-to-station distance and its composed accuracy, its checks
// on and off the checked setup (CCV6's NAD83(2011) to ITRF2020 is measured
// data, the only row that may say "validated"), and the page's own arm
// against the worker's at sample instants. Earth-turns' angular case through
// the library's composer is here too (it needs the EOP table).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
import {
  checkRowStrings,
  checkRowText,
} from "../../examples/frames-explorer/panel/checkText.ts";
import { extrasOf } from "../../examples/frames-explorer/panelModel.ts";
import {
  checkKind,
  checkRows,
} from "../../examples/frames-explorer/scenarios/checks.ts";
import {
  ARM,
  MARK,
  PAD,
} from "../../examples/frames-explorer/scenarios/arm.ts";
import { orientation } from "../../examples/frames-explorer/scenarios/earthTurns.ts";
import { decimalYear } from "../../examples/frames-explorer/scenarios/robotArm.ts";
import {
  SCENES,
  pageArm,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import type {
  KnobState,
  ScenarioId,
} from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import references from "../../examples/frames-explorer/references.json";
import {
  buildScenarioTree,
  buildTree,
  branchPath,
} from "../../examples/frames-explorer/tree.ts";
import {
  runStress,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { framePoint } from "../../src/frames/local.ts";
import { pointAccuracy } from "../../src/frames/pointAccuracy.ts";
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
const base = `${join(dir, "proj")}/`;
const context = (): StressContext => ({
  frames,
  loadProj: () => loadProj({ base }),
  loadOrion: () => Promise.reject(new Error("no Orion here")),
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
const spec = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
const tdbOf = (utcMs: number) =>
  Instant.fromUtc(utcMs, frames.data.leapSeconds).tdb();
const checkedTdb = (id: ScenarioId) =>
  tdbOf(Date.parse(spec(id).checked.epochUtc));
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

const ID: ScenarioId = "robot-arm";
const OFF: { knobs: KnobState; seconds: number } = {
  knobs: { yaw: -40, shoulder: 10, elbow: -30, wrist: 15 },
  seconds: 3600,
};

const catalog = new Map<string, StressResult>();
beforeAll(async () => {
  for (const r of await runStress(context(), { ids: [...spec(ID).checks] })) {
    catalog.set(r.id, r);
  }
}, 120_000);

describe("the robot arm (Task 7b) through the worker's host", () => {
  it("at its checked setup: the app's frames, the station's route through PROJ and down the arm, and every check the catalog's, passing; only the measured row may say validated", async () => {
    const s = spec(ID);
    const e = await client.scenario(ID, s.checked.knobs, checkedTdb(ID));
    expect(e.scenario).toBe(ID);
    expect(e.answer.label).toBe(`from the tool to ${MARK.name}`);
    const tree = buildScenarioTree(buildTree(frames), e.added);
    const b = branchPath(tree, e.answer.path!.from, e.answer.path!.to);
    expect([
      ...b.up.map((n) => n.id),
      b.ancestor.id,
      ...b.down.map((n) => n.id),
    ]).toEqual([
      MARK.frame,
      "ITRF",
      PAD.name,
      ARM.base,
      ARM.yaw,
      ARM.shoulder,
      ARM.elbow,
      ARM.wrist,
      ARM.tool,
    ]);
    expect(e.data?.frame).toBe(e.answer.path!.from);
    expect(SCENES[ID]!.drawIn).toBe(e.answer.path!.to);
    // The arm's frames are the app's; NAD83(2011) is PROJ's.
    expect(e.added.filter((a) => a.app).map((a) => a.id)).toEqual([
      PAD.name,
      ARM.base,
      ARM.yaw,
      ARM.shoulder,
      ARM.elbow,
      ARM.wrist,
      ARM.tool,
    ]);
    expect(e.added.find((a) => a.id === MARK.frame)!.edge.kind).toBe(
      "proj-operation",
    );
    const rows = checkRows(s, true, catalog, e);
    expect(rows.map((r) => r.status)).toEqual(s.checks.map(() => "checked"));
    expect(rows.map((r) => r.kind)).toEqual([
      "measured",
      "hand",
      "hand",
      "roundTrip",
    ]);
    for (const r of rows) {
      if (r.status === "checked") {
        expect(r.result.pass, `${r.result.id}: ${r.result.detail}`).toBe(true);
        expect(r.kind, r.result.id).toBe(checkKind(s, r.result.id));
        const extras = extrasOf(r.result);
        const t = checkRowText(r, { [r.result.id]: extras }, "current");
        const text = checkRowStrings(r, t, extras).join(" ");
        if (r.kind !== "measured") {
          expect(/\bvalidated\b/i.test(text), text).toBe(false);
        }
      }
    }
  }, 120_000);

  it("states the straight-line distance as the norm of the tool's and the station's ITRF difference, with the accuracy the library composes and the station's", async () => {
    const s = spec(ID);
    const instant = Instant.fromTdb(checkedTdb(ID));
    const e = await client.scenario(ID, s.checked.knobs, checkedTdb(ID));
    const a = e.arm!;
    expect(e.answer.value).toBeCloseTo(dist(a.tool, a.mark), 9);
    expect(e.answer.unit).toBe("m");
    // About 17 km: CCV6 at Cape Canaveral.
    expect(e.answer.value!).toBeGreaterThan(16_000);
    expect(e.answer.value!).toBeLessThan(19_000);
    const arm = pageArm(frames.itrf, s.checked.knobs);
    const tool = pointAccuracy(
      framePoint(arm.tool, [0, 0, 0], instant),
      frames.itrf,
    );
    expect(e.answer.accuracy.meters).toBeCloseTo(
      Math.hypot(tool.meters!, a.markMeters, a.projMeters ?? NaN),
      12,
    );
    expect(e.answer.accuracy.note).toMatch(/root-sum-square/);
    expect(e.answer.accuracy.note).toMatch(/shoulder/);
    // PROJ's NAD83(2011) to ITRF2020 is exact by definition.
    expect(a.projMeters).toBe(0);
    expect(e.answer.breakdown!.length).toBeGreaterThan(5);
  }, 120_000);

  it("puts the station where NGS's ITRF2020 position and velocity put it at the checked epoch, within the check's millimetres", async () => {
    const s = spec(ID);
    const e = await client.scenario(ID, s.checked.knobs, checkedTdb(ID));
    const m = (
      references.entries as unknown as Record<
        string,
        {
          itrf2020: {
            x: string;
            y: string;
            z: string;
            velocity: { vx: string; vy: string; vz: string };
          };
        }
      >
    )["ngs-DI3564"]!.itrf2020;
    const years = decimalYear(Date.parse(s.checked.epochUtc)) - 2020;
    const ngs = [
      Number(m.x) + Number(m.velocity.vx) * years,
      Number(m.y) + Number(m.velocity.vy) * years,
      Number(m.z) + Number(m.velocity.vz) * years,
    ];
    expect(dist(e.arm!.mark, ngs)).toBeLessThan(0.003);
  }, 120_000);

  it("places the page's own arm where the worker's is, at sample instants and both setups, within 1 µm", async () => {
    const s = spec(ID);
    for (const [knobs, dt] of [
      [s.checked.knobs, 0],
      [OFF.knobs, OFF.seconds],
    ] as const) {
      const tdb = checkedTdb(ID) + dt;
      const e = await client.scenario(ID, knobs, tdb);
      const arm = pageArm(frames.itrf, knobs);
      for (const t of [tdb - 600, tdb, tdb + 3600]) {
        const m = frameTransform(arm.tool, frames.itrf, Instant.fromTdb(t));
        expect(dist([m[12]!, m[13]!, m[14]!], e.arm!.tool)).toBeLessThan(1e-6);
      }
    }
  }, 120_000);

  it("off it: the knobs move the tool, live re-runs stand in for every check without a published value, and the station's row applies at the checked setup", async () => {
    const s = spec(ID);
    const at = await client.scenario(ID, s.checked.knobs, checkedTdb(ID));
    const e = await client.scenario(
      ID,
      OFF.knobs,
      checkedTdb(ID) + OFF.seconds,
    );
    expect(dist(e.arm!.tool, at.arm!.tool)).toBeGreaterThan(1);
    const live = new Set(e.live.map((r) => r.id));
    for (const r of e.live) {
      expect(s.checks.includes(r.id), r.id).toBe(false);
      expect(r.pass, `${r.id}: ${r.detail}`).toBe(true);
      expect(r.source, r.id).toBeUndefined();
    }
    for (const p of s.checks) {
      const result = catalog.get(p)!;
      if (result.source === undefined) {
        expect(live.has(`${p}.live`), `${p} has no live stand-in`).toBe(true);
      }
    }
    const rows = checkRows(s, false, catalog, e);
    expect(rows.some((r) => r.status === "checked")).toBe(false);
    expect(
      rows
        .filter((r) => r.status === "reference-only")
        .map((r) => r.status === "reference-only" && r.id),
    ).toEqual(["reference-values.ngs-di3564.itrf2020"]);
  }, 120_000);
});

describe("earth-turns' angular case through the library's composer", () => {
  it("is the ITRF edge's angular sigma times the equatorial radius", () => {
    const instant = Instant.fromTdb(checkedTdb("earth-turns"));
    const r = frames.itrf.accuracy(instant).radians!;
    expect(r).toBeGreaterThan(0);
    const a = orientation(context(), instant);
    expect(a.meters).toBeCloseTo(r * 6_378_137, 15);
    const p = pointAccuracy(
      framePoint(frames.itrf, [6_378_137, 0, 0], instant),
      frames.gcrf,
    );
    expect(p.terms).toHaveLength(1);
    expect(p.terms[0]).toMatchObject({ frame: "ITRF", kind: "angular" });
    expect(p.terms[0]!.lever).toBe(6_378_137);
  });
});
