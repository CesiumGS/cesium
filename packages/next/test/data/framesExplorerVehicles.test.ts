// The drone over the site and the ship entering San Francisco Bay (Task 7)
// on the frames data store, through the worker's host as the page asks for
// them: their trees and routes, their checks on and off the checked setup,
// GEOID18's part, the drone's local placement against PROJ, and the page's
// own frames (built from the evaluation's track, as the stage builds them)
// against the worker's at sample instants.
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
  footprintAt,
  withTerrainAnswer,
} from "../../examples/frames-explorer/panel/answerText.ts";
import {
  checkRowStrings,
  checkRowText,
} from "../../examples/frames-explorer/panel/checkText.ts";
import { extrasOf } from "../../examples/frames-explorer/panelModel.ts";
import {
  checkKind,
  checkRows,
} from "../../examples/frames-explorer/scenarios/checks.ts";
import { localPlacement } from "../../examples/frames-explorer/scenarios/drone.ts";
import {
  SCENES,
  shipStartTdb,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import {
  BIM_CRS,
  FTUS_PER_M,
} from "../../examples/frames-explorer/scenarios/sites.ts";
import type {
  KnobState,
  ScenarioId,
} from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import {
  CAMERA_MOUNT,
  MAST_SENSOR,
  SHIP,
  shipSpan,
} from "../../examples/frames-explorer/scenarios/vehicles.ts";
import {
  sightWindows,
  type SightSample,
} from "../../examples/frames-explorer/buoyWindow.ts";
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
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { EARTH } from "../../src/scene/Body.ts";
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
const print = (line: string) => process.stdout.write(`${line}\n`);
const spec = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;
const tdbOf = (utcMs: number) =>
  Instant.fromUtc(utcMs, frames.data.leapSeconds).tdb();
const checkedTdb = (id: ScenarioId) =>
  tdbOf(Date.parse(spec(id).checked.epochUtc));
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

/** An off-the-checked setup for each: a knob moved and the time on. */
const OFF: Record<"drone" | "ship", { knobs: KnobState; seconds: number }> = {
  drone: { knobs: { tilt: 30, along: 20, datum: "ellipsoid" }, seconds: 60 },
  ship: { knobs: { mast: 40, datum: "navd88" }, seconds: -1800 },
};

const catalog = new Map<string, StressResult>();
beforeAll(async () => {
  const ids = [...new Set([...spec("drone").checks, ...spec("ship").checks])];
  for (const r of await runStress(context(), { ids })) {
    catalog.set(r.id, r);
  }
}, 120_000);

for (const id of ["drone", "ship"] as const) {
  describe(`${id} (Task 7) through the worker's host`, () => {
    it("at its checked setup: its frames added, its route, and every check the catalog's, passing, of the kind it showed while loading; only measured data says validated", async () => {
      const s = spec(id);
      const e = await client.scenario(id, s.checked.knobs, checkedTdb(id));
      expect(e.scenario).toBe(id);
      expect(e.answer.label.length).toBeGreaterThan(0);
      expect(e.answer.label.length).toBeLessThanOrEqual(60);
      expect(e.answer.accuracy.note.length).toBeGreaterThan(0);
      for (const a of e.added) {
        expect(a.edge.accuracy.note.length, a.id).toBeGreaterThan(0);
      }
      const tree = buildScenarioTree(buildTree(frames), e.added);
      const b = branchPath(tree, e.answer.path!.from, e.answer.path!.to);
      const route = [
        ...b.up.map((n) => n.id),
        b.ancestor.id,
        ...b.down.map((n) => n.id),
      ];
      expect(route).toEqual(
        id === "drone"
          ? [
              "Camera mount",
              "Drone body",
              "ITRF",
              "California zone 3",
              "BIM site grid",
            ]
          : ["Ship body", "ITRF", "California zone 3"],
      );
      expect(e.data?.frame).toBe(e.answer.path!.from);
      // The diagram tags the frame it draws in, the route's end.
      expect(SCENES[id]!.drawIn).toBe(e.answer.path!.to);
      const rows = checkRows(s, true, catalog, e);
      expect(rows.map((r) => r.status)).toEqual(s.checks.map(() => "checked"));
      for (const r of rows) {
        if (r.status === "checked") {
          expect(r.result.pass, `${r.result.id}: ${r.result.detail}`).toBe(
            true,
          );
          expect(r.kind, r.result.id).toBe(checkKind(s, r.result.id));
          const extras = extrasOf(r.result);
          const t = checkRowText(r, { [r.result.id]: extras }, "current");
          const text = checkRowStrings(r, t, extras).join(" ");
          expect(/\bvalidated\b/i.test(text), text).toBe(false);
        }
      }
      // The kinds: hand formulas, round trips, and NGS's GEOID18 value as published.
      expect(rows.map((r) => r.kind)).toEqual(
        id === "drone"
          ? ["hand", "hand", "hand", "roundTrip", "roundTrip", "published"]
          : ["hand", "hand", "hand", "roundTrip", "roundTrip", "published"],
      );
    }, 120_000);

    it("off it: live re-runs stand in for every check without a published value, take no check id, and pass", async () => {
      const s = spec(id);
      const off = OFF[id];
      const e = await client.scenario(
        id,
        off.knobs,
        checkedTdb(id) + off.seconds,
      );
      const live = new Set(e.live.map((r) => r.id));
      for (const r of e.live) {
        expect(s.checks.includes(r.id), r.id).toBe(false);
        expect(r.pass, `${r.id}: ${r.detail}`).toBe(true);
        expect(r.source, r.id).toBeUndefined();
      }
      for (const p of s.checks) {
        const result = catalog.get(p)!;
        expect(result, p).toBeDefined();
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
      ).toEqual(["heights-and-wgs84.three-heights.navd88"]);
    }, 120_000);
  });
}

describe("the drone: what the camera looks at, on the design grid", () => {
  it("reads the spot off a local placement that agrees with PROJ within its stated drift, and the site grid's x and y through the map conversion", async () => {
    const s = spec("drone");
    const e = await client.scenario(
      "drone",
      s.checked.knobs,
      checkedTdb("drone"),
    );
    const fp = e.answer.footprint!;
    const P = await loadProj({ base });
    const ca = EngineeringFrame.create(
      { name: "ca", body: EARTH, crs: BIM_CRS["ca-zone-3"].crs },
      P,
    );
    const site = EngineeringFrame.create(
      {
        name: "site",
        body: EARTH,
        crs: BIM_CRS["ca-zone-3"].crs,
        site: {
          origin: [fp.site.origin[0], fp.site.origin[1], 0],
          rotation: fp.site.rotation,
          scale: fp.site.scale,
        },
      },
      P,
    );
    // Points 0 to 1.5 km from where it is exact, on the way down the ray,
    // at heights from the drone's down (the grid doesn't depend on height).
    const line = e.sightLines![0]!;
    for (const along of [0, 0.02, 0.1, 0.4]) {
      const p = line.from.map((x, i) => x + along * (line.to[i]! - x));
      const q = Float64Array.from(along === 0 ? fp.at : p);
      const ours = footprintAt(fp, q);
      const exact = ca.fromBodyFixed(q);
      const grid = site.fromBodyFixed(q);
      const off =
        Math.hypot(ours.e - exact[0]!, ours.n - exact[1]!) / FTUS_PER_M;
      expect(off, `${along}`).toBeLessThanOrEqual(ours.drift + 1e-6);
      expect(
        Math.hypot(ours.x - grid[0]!, ours.y - grid[1]!) / FTUS_PER_M,
      ).toBeLessThan(ours.drift + 1e-6);
    }
    // Its drift a kilometre out is millimetres.
    expect(fp.perSquareMeter * 1e6).toBeLessThan(0.01);
    const again = localPlacement(ca, fp.at);
    expect(again.toDesign).toEqual(fp.placement.toDesign);
  }, 120_000);

  it("turns a traced hit into the answer: E and N on the grid, x and y on the site grid, the accuracy the terrain's along the ray with the datum's; a trace for other knobs is still tracing", async () => {
    const s = spec("drone");
    const e = await client.scenario(
      "drone",
      s.checked.knobs,
      checkedTdb("drone"),
    );
    const fp = e.answer.footprint!;
    const hit = fp.at;
    const view = {
      id: "camera",
      state: "blocked" as const,
      text: "",
      meters: 2.4,
      hitAt: hit,
      from: e.sightLines![0]!.from,
      traced: fp.key,
    };
    const a = withTerrainAnswer(e.answer, [view]);
    expect(a.label).toMatch(
      /^Looking at E 6,0\d\d,\d{3}\.\d, N 2,1\d\d,\d{3}\.\d ftUS$/,
    );
    expect(a.aside).toMatch(
      /on the BIM site grid x −?[\d,]+\.\d, y −?[\d,]+\.\d ftUS/,
    );
    // ±2.4 m along a 45° ray, the ±2 m datum: about ±3.1 m.
    expect(a.accuracy.meters!).toBeCloseTo(Math.hypot(2.4, 2), 3);
    const stale = withTerrainAnswer(e.answer, [{ ...view, traced: "other" }]);
    expect(stale.label).toBe("Tracing the camera's ray on the terrain");
    expect(stale.accuracy.unbounded).toBe(true);
    const unknown = withTerrainAnswer(e.answer, [
      { ...view, state: "unknown", unknownFraction: 0.4 },
    ]);
    expect(unknown.label).toMatch(/^Can't tell/);
  }, 120_000);

  it("reads the reported 250 m as NAVD88 through GEOID18 (the drone 32 m lower than as ellipsoidal), and the headline says how far that moves the spot", async () => {
    const s = spec("drone");
    const navd = await client.scenario(
      "drone",
      s.checked.knobs,
      checkedTdb("drone"),
    );
    const ell = await client.scenario(
      "drone",
      { ...s.checked.knobs, datum: "ellipsoid" },
      checkedTdb("drone"),
    );
    const n = navd.track!.heights.map((h, i) => h - ell.track!.heights[i]!);
    print(
      `drone: GEOID18 N at the line's ends ${n.map((x) => x.toFixed(3)).join(", ")} m`,
    );
    for (const x of n) {
      expect(x).toBeGreaterThan(-34);
      expect(x).toBeLessThan(-31);
    }
    expect(
      dist(navd.sightLines![0]!.from, ell.sightLines![0]!.from),
    ).toBeCloseTo(-n[0]! / 2 - n[1]! / 2, 1);
    expect(navd.answer.headline).toMatch(
      /NAVD88's zero 3\d\.\d\d m below the ellipsoid/,
    );
  }, 120_000);
});

describe("the ship: its place on the port's grid, and its sight line to the buoy", () => {
  it("puts its reference point on California zone 3 through PROJ, its mast up its pitching body, and the sea at NAVD88 0 through GEOID18", async () => {
    const s = spec("ship");
    const t = checkedTdb("ship");
    const e = await client.scenario("ship", s.checked.knobs, t);
    const P = await loadProj({ base });
    const ca = EngineeringFrame.create(
      { name: "ca", body: EARTH, crs: BIM_CRS["ca-zone-3"].crs },
      P,
    );
    const [body, mast] = SCENES.ship!.bodies!(frames, s.checked.knobs, e);
    const instant = Instant.fromTdb(t);
    const b = frameTransform(body!, frames.itrf, instant);
    const d = ca.fromBodyFixed(Float64Array.of(b[12]!, b[13]!, b[14]!));
    const ft = (v: number) =>
      v.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    expect(e.answer.label).toBe(`E ${ft(d[0]!)}, N ${ft(d[1]!)} ftUS`);
    const m = frameTransform(mast!, frames.itrf, instant);
    expect(
      dist([m[12]!, m[13]!, m[14]!], [b[12]!, b[13]!, b[14]!]),
    ).toBeCloseTo(25, 9);
    for (const h of e.track!.heights) {
      expect(h).toBeGreaterThan(-34);
      expect(h).toBeLessThan(-31);
    }
    expect(e.answer.headline).toContain("plan 4b");
    const ell = await client.scenario(
      "ship",
      { ...s.checked.knobs, datum: "ellipsoid" },
      t,
    );
    expect(ell.track!.heights.every((h) => h === 0)).toBe(true);
    expect(ell.answer.headline).toMatch(/float that much too high/);
  }, 120_000);

  it("the page's own frames, built from the evaluation's track, put the mast where the worker's sight line starts, at instants along the track (per-frame geometry, Task 4c's rule)", async () => {
    const s = spec("ship");
    const start = shipStartTdb(frames);
    const span = shipSpan(SHIP.vertices.map(() => -32)).seconds;
    let worst = 0;
    for (const f of [0.05, 0.3, 0.55, 0.8, 0.99]) {
      const t = start + f * span + 0.37;
      const e = await client.scenario("ship", s.checked.knobs, t);
      const local = SCENES.ship!.bodies!(frames, s.checked.knobs, e);
      const mast = local.find((x) => x.name === MAST_SENSOR)!;
      const m = frameTransform(mast, frames.itrf, Instant.fromTdb(t));
      worst = Math.max(
        worst,
        dist([m[12]!, m[13]!, m[14]!], e.sightLines![0]!.from),
      );
    }
    print(
      `ship: the page's mast against the worker's, worst ${worst.toExponential(2)} m`,
    );
    expect(worst).toBeLessThan(1e-6);
  }, 120_000);

  it("the page's drone frames put the camera where the worker's ray starts, along it", async () => {
    let worst = 0;
    for (const knobs of [
      { tilt: 45, along: 50, datum: "navd88" },
      { tilt: 10, along: 0, datum: "ellipsoid" },
      { tilt: 90, along: 100, datum: "navd88" },
    ]) {
      const e = await client.scenario("drone", knobs, checkedTdb("drone"));
      const local = SCENES.drone!.bodies!(frames, knobs, e);
      const mount = local.find((x) => x.name === CAMERA_MOUNT)!;
      const m = frameTransform(
        mount,
        frames.itrf,
        Instant.fromTdb(checkedTdb("drone")),
      );
      const line = e.sightLines![0]!;
      const dir = line.to.map(
        (x, i) => (x - line.from[i]!) / e.answer.footprint!.reach,
      );
      worst = Math.max(
        worst,
        dist([m[12]!, m[13]!, m[14]!], line.from),
        dist([m[0]!, m[1]!, m[2]!], dir) * 1000,
      );
    }
    expect(worst).toBeLessThan(1e-6);
  }, 120_000);

  it("marks the spans where the drawn terrain doesn't block the line, and the moment the buoy clears the headland only after the land blocked it", () => {
    const at = (s: string): SightSample[] =>
      [...s].map((c) =>
        c === "c"
          ? "clear"
          : c === "b"
            ? "blocked"
            : c === "w"
              ? "within"
              : "unknown",
      );
    const start = Date.parse(SHIP.startUtc);
    const a = sightWindows(at("uubbbwwccbbu"), start, 60);
    expect(
      a.windows.map((w) => [w.startUtc - start, w.endUtc - start]),
    ).toEqual([[5 * 60_000, 9 * 60_000]]);
    expect(a.windows[0]!.label).toMatch(/within the terrain's error/);
    expect(a.moment?.utcMs).toBe(start + 5 * 60_000);
    expect(a.moment?.label).toBe("Buoy clears the headland");
    // After terrain not drawn: no moment (nothing says the land hid it).
    const b = sightWindows(at("uuccc"), start, 60);
    expect(b.windows).toHaveLength(1);
    expect(b.windows[0]!.label).toMatch(/in sight from the mast/);
    expect(b.moment).toBeUndefined();
  });
});
