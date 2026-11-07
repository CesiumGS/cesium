// The frames explorer's scenarios (examples/frames-explorer/scenarios/) on
// the frames data store, through the worker's host as the page asks for
// them: each answers with its accuracy, agrees with the catalog at its
// checked setup, and off it re-runs live what its checks can't claim there
// (P3: `live` covers the non-reference check ids, and never takes a check
// id, which the host would refuse).
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
  answerTitle,
  formatAnswer,
  publishedText,
} from "../../examples/frames-explorer/panel/answerText.ts";
import { snapToStep } from "../../examples/frames-explorer/panel/knobText.ts";
import { publishedView } from "../../examples/frames-explorer/scenarioModel.ts";
import { knobsAt } from "../../examples/frames-explorer/pointDrag.ts";
import {
  BIM_CRS,
  BIM_PLACES,
  bimSite,
  covers,
  offsetText,
} from "../../examples/frames-explorer/scenarios/sites.ts";
import { siteGap } from "../../examples/frames-explorer/stress/groups/rigid-placement-budget.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import { EARTH } from "../../src/scene/Body.ts";
import { routeSteps } from "../../examples/frames-explorer/panel/routeSteps.ts";
import references from "../../examples/frames-explorer/references.json";
import {
  checkKind,
  checkRows,
  type CheckRow,
} from "../../examples/frames-explorer/scenarios/checks.ts";
import type { ScenarioEvaluation } from "../../examples/frames-explorer/scenarios/evaluate.ts";
import {
  checkRowStrings,
  checkRowText,
} from "../../examples/frames-explorer/panel/checkText.ts";
import { extrasOf } from "../../examples/frames-explorer/panelModel.ts";
import {
  checkedState,
  type KnobState,
  type ScenarioId,
} from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import {
  buildScenarioTree,
  buildTree,
  branchPath,
} from "../../examples/frames-explorer/tree.ts";
import {
  orionFromOem,
  ORION_OEM,
  STATIONS_SPK,
  runStress,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { compose, pathPoint } from "../../examples/frames-explorer/orion.ts";
import signalFixture from "../fixtures/frames/signal.json";
import {
  DSN_STATIONS,
  SACRAMENTO,
  SCENES,
  earthSiteFrame,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import {
  angleBetween,
  azimuthElevation,
  pointingByHand,
  pointingText,
  rayDirection,
} from "../../examples/frames-explorer/scenarios/pointing.ts";
import {
  createSkyRay,
  targetPlace,
} from "../../examples/frames-explorer/skyRay.ts";
import { dsnMask } from "../../examples/frames-explorer/scenarios/dsnMasks.ts";
import { maskAt } from "../../examples/frames-explorer/scenarios/horizonMask.ts";
import { blockedAt } from "../../examples/frames-explorer/scenarios/occultation.ts";
import type { LabelBoard } from "../../examples/frames-explorer/triadLayer.ts";
import {
  MOON_DIRECTION,
  MOON_RANGE,
} from "../../examples/frames-explorer/stress/groups/space.ts";
import { eastNorthUpFrame, framePoint } from "../../src/frames/local.ts";
import { measure } from "../../src/measure/measure.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";
import { adaptivePath } from "../../examples/frames-explorer/overlays.ts";
import {
  loadOrionTrack,
  orionPlace,
} from "../../examples/frames-explorer/orionTrack.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { frameTransform } from "../../src/frames/Frame.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
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
const tdbOf = (utcMs: number) =>
  Instant.fromUtc(utcMs, frames.data.leapSeconds).tdb();
const checkedTdb = (id: ScenarioId) =>
  tdbOf(Date.parse(spec(id).checked.epochUtc));

/** An off-the-checked setup for each scenario: a knob moved and the time an hour on. */
const OFF: Record<string, { knobs: KnobState; hours: number }> = {
  "one-path": { knobs: { frame: "GCRF" }, hours: 1 },
  "earth-turns": { knobs: { rate: 60 }, hours: 6 },
  "stand-on-moon": { knobs: { latitude: -45 }, hours: 24 },
  "bim-site": {
    knobs: { site: "san-francisco", crs: "utm-10n", rotation: 30, scale: 1 },
    hours: 1,
  },
  corridor: { knobs: { station: 1210, offset: -25 }, hours: 1 },
  "moon-from-here": { knobs: {}, hours: 1 },
  "dish-tracks": { knobs: { station: "DSS-14" }, hours: 1 },
};
const PORTED: readonly ScenarioId[] = [
  "one-path",
  "earth-turns",
  "moon-from-here",
  "stand-on-moon",
  "dish-tracks",
  "bim-site",
  "corridor",
];

/**
 * Task 6c: only measured-data rows say "validated", across everything a
 * row renders (checkRowStrings), with the extras the panel gives it: the
 * catalog's for its results, the live ones' without their group's words,
 * and the published counterpart's printed value in its summary.
 */
function expectValidatedOnlyMeasured(
  id: ScenarioId,
  rows: readonly CheckRow[],
  e: ScenarioEvaluation,
): void {
  const pub = e.answer.published;
  for (const row of rows) {
    const r =
      row.status === "checked" || row.status === "live"
        ? row.result
        : undefined;
    const extras = r ? extrasOf(r) : undefined;
    if (extras && row.status === "live") {
      delete extras.compared;
    }
    const t = checkRowText(
      row,
      r && extras ? { [r.id]: extras } : {},
      "current",
      pub && { checkId: pub.checkId, printed: pub.printed, unit: pub.unit },
    );
    const text = checkRowStrings(row, t, extras).join(" ");
    expect(text.length, id).toBeGreaterThan(0);
    if (row.kind !== "measured") {
      expect(/\bvalidated\b/i.test(text), `${id}: ${t.title}`).toBe(false);
    }
  }
}

const catalog = new Map<string, StressResult>();
beforeAll(async () => {
  const ids = PORTED.flatMap((id) => spec(id).checks);
  for (const r of await runStress(context(), { ids })) {
    catalog.set(r.id, r);
  }
}, 120_000);

describe("the ported scenarios through the worker's host", () => {
  for (const id of PORTED) {
    describe(id, () => {
      it("answers at its checked setup with its accuracy, the checked value its own, and a path in its tree", async () => {
        const e = await client.scenario(
          id,
          spec(id).checked.knobs,
          checkedTdb(id),
        );
        expect(e.scenario).toBe(id);
        expect(e.answer.headline.length).toBeGreaterThan(20);
        // The headline answers the question on its own: a figure, its unit
        // and a few words (fix 1).
        expect(e.answer.unit?.length, id).toBeGreaterThan(0);
        expect(e.answer.label.length, id).toBeGreaterThan(0);
        expect(e.answer.label.length, id).toBeLessThanOrEqual(60);
        expect(e.answer.accuracy.note.length).toBeGreaterThan(0);
        expect(Number.isFinite(e.answer.value)).toBe(true);
        expect(e.answer.value).toBeCloseTo(e.checkedAnswerValue!, 9);
        const tree = buildScenarioTree(buildTree(frames), e.added);
        for (const a of e.added) {
          expect(a.edge.accuracy.note.length, a.id).toBeGreaterThan(0);
        }
        const path = branchPath(tree, e.answer.path!.from, e.answer.path!.to);
        expect(path.up.length + path.down.length).toBeGreaterThan(0);
        // At the checked setup, every check row is the catalog's, passing.
        const rows = checkRows(spec(id), true, catalog, e);
        expect(rows.map((r) => r.status)).toEqual(
          spec(id).checks.map(() => "checked"),
        );
        for (const r of rows) {
          expect(r.status === "checked" && r.result.pass, id).toBe(true);
          // Task 6c: its kind with its result is the kind it showed while
          // loading, so a row never changes kind as its result comes in;
          // and only measured data says "validated".
          if (r.status === "checked") {
            expect(r.kind, r.result.id).toBe(checkKind(spec(id), r.result.id));
          }
        }
        expectValidatedOnlyMeasured(id, rows, e);
      }, 60_000);

      it("off its checked setup: live covers every check id the catalog checks without a reference, takes none, and passes", async () => {
        const off = OFF[id]!;
        const e = await client.scenario(
          id,
          off.knobs,
          checkedTdb(id) + off.hours * 3600,
        );
        const live = new Set(e.live.map((r) => r.id));
        const checks = new Set(spec(id).checks);
        for (const r of e.live) {
          expect(checks.has(r.id), r.id).toBe(false);
          expect(r.pass, `${r.id}: ${r.detail}`).toBe(true);
          expect(r.source, r.id).toBeUndefined();
        }
        for (const p of spec(id).checks) {
          const result = catalog.get(p);
          expect(result, p).toBeDefined();
          if (result!.source === undefined) {
            // Its own live stand-in, or its case's: a case's sub-result
            // named for the checked knobs (site-grids.round-trip.rotation-
            // 12.5.scale-1.0000375) is stood in for by the case's own live
            // check at any knobs (fix 1).
            const stoodIn =
              live.has(`${p}.live`) ||
              [...live].some((l) =>
                p.startsWith(`${l.slice(0, -".live".length)}.`),
              );
            expect(stoodIn, `${p} has no live stand-in`).toBe(true);
          }
        }
        // Off it, nothing reads as verified: reference rows carry no pass.
        const rows = checkRows(spec(id), false, catalog, e);
        expectValidatedOnlyMeasured(id, rows, e);
        expect(rows.some((r) => r.status === "checked")).toBe(false);
        expect(rows.filter((r) => r.status === "live")).toHaveLength(
          e.live.length,
        );
        expect(e.answer.value).not.toBe(e.checkedAnswerValue);
      }, 60_000);
    });
  }

  it("stand-on-moon at its checked setup gives the catalog's lunar clock gain", async () => {
    const e = await client.scenario(
      "stand-on-moon",
      spec("stand-on-moon").checked.knobs,
      checkedTdb("stand-on-moon"),
    );
    const catalogGain = catalog.get("lunar-time.moon-vs-earth.synodic")!.effect!
      .value;
    expect(e.answer.value).toBeCloseTo(catalogGain, 6);
    expect(e.answer.unit).toBe("µs/day");
  }, 60_000);

  it("stand-on-moon's site triad holds at the exact south pole (S5)", async () => {
    const e = await client.scenario(
      "stand-on-moon",
      { latitude: -90 },
      checkedTdb("stand-on-moon"),
    );
    const triad = e.live.find((r) => r.id === "stand-on-moon.site-triad")!;
    expect(triad.pass).toBe(true);
    expect(triad.value!).toBeLessThan(1e-12);
  }, 60_000);

  it("one-path's answer says how the speed differs frame to frame: Earth-fixed is tens of km/s", async () => {
    const at = checkedTdb("one-path");
    const [moon, itrf] = await Promise.all([
      client.scenario("one-path", { frame: "MOON_ME" }, at),
      client.scenario("one-path", { frame: "ITRF" }, at),
    ]);
    expect(moon.answer.unit).toBe("km/s");
    expect(itrf.answer.value!).toBeGreaterThan(10);
    expect(moon.answer.value!).toBeLessThan(5);
    // Orion is data pinned to its OEM's frame, not a frame of the tree.
    expect(moon.added).toEqual([]);
    expect(moon.data?.frame).toBe(orion.reference.name);
  }, 60_000);

  it("earth-turns' accuracy grows with the prediction's age", async () => {
    const at = (iso: string) =>
      client.scenario("earth-turns", { rate: 3600 }, tdbOf(Date.parse(iso)));
    const measured = await at(spec("earth-turns").checked.epochUtc);
    const predicted = await at("2026-12-01T00:00:00Z");
    expect(measured.answer.accuracy.meters!).toBeGreaterThan(0);
    expect(predicted.answer.accuracy.meters!).toBeGreaterThan(
      measured.answer.accuracy.meters!,
    );
    expect(predicted.answer.accuracy.note).toMatch(/predicted/);
  }, 60_000);
});

describe("one-path's frame choice (fix 1: the owner's reports)", () => {
  const at = checkedTdb("one-path");
  const tree = (e: { added: Parameters<typeof buildScenarioTree>[1] }) =>
    buildScenarioTree(buildTree(frames), e.added);

  for (const frame of ["GCRF", "ITRF", "MOON_ME"] as const) {
    it(`lights branchPath(data's frame, ${frame}), and spells the same route out step by step; the tree doesn't change`, async () => {
      const e = await client.scenario("one-path", { frame }, at);
      const dataFrame = orion.reference.name;
      expect(e.data).toMatchObject({ frame: dataFrame, source: "OEM" });
      expect(e.answer.path).toEqual({ from: dataFrame, to: frame });
      const t = tree(e);
      const p = branchPath(t, dataFrame, frame);
      expect(p.up[0]!.id).toBe(dataFrame);
      expect(p.down.at(-1)?.id ?? p.ancestor.id).toBe(frame);
      // The steps: the data, each lit edge in the route's order, the end.
      const ids = {
        up: p.up.map((n) => n.id),
        ancestor: p.ancestor.id,
        down: p.down.map((n) => n.id),
      };
      const steps = routeSteps(
        t,
        ids,
        { title: "start", does: "" },
        { title: "end", does: "" },
      );
      expect(steps.filter((x) => x.kind === "edge").map((x) => x.edge)).toEqual(
        [...ids.up, ...ids.down],
      );
      // The answer says the route in words, through each frame on it.
      for (const n of [...p.up.slice(1), p.ancestor, ...p.down]) {
        expect(e.answer.headline, n.id).toContain(n.id);
      }
      print(
        `one-path ${frame}: Orion's data in ${[...p.up, p.ancestor, ...p.down].map((n) => n.id).join(" → ")}`,
      );
    }, 60_000);

    it(`puts Orion's marker on the drawn path in ${frame}: its place now equals the path's sample at that time, placed now`, () => {
      // The path is drawn in `frame` at one instant (`drawnAt`) and placed
      // now by the frame now times its inverse then (orionLayer.ts `place`).
      const f =
        frame === "GCRF"
          ? frames.gcrf
          : frame === "ITRF"
            ? frames.itrf
            : frames.moonMe;
      const drawnAt = Instant.fromTdb(at);
      for (const hours of [0, 3, 30]) {
        const now = Instant.fromTdb(at + hours * 3600);
        // The path's sample at `now`, as drawn (Earth-fixed at drawnAt)...
        const inFrame = frameTransform(orion.frame, f, now).subarray(12, 15);
        const drawn = pathPoint(
          frameTransform(f, frames.itrf, drawnAt),
          inFrame,
        );
        // ...placed now:
        const placement = compose(
          frameTransform(f, frames.itrf, now),
          frameTransform(frames.itrf, f, drawnAt),
        );
        const onPath = pathPoint(placement, drawn);
        // The marker: Orion's own place in ITRF now (trajectoryInfo's itrf).
        const marker = frameTransform(orion.frame, frames.itrf, now).subarray(
          12,
          15,
        );
        const gap = Math.hypot(
          onPath[0]! - marker[0]!,
          onPath[1]! - marker[1]!,
          onPath[2]! - marker[2]!,
        );
        // Within 1 mm: far inside Orion's stated ±10 m.
        expect(gap, `${frame} +${hours} h`).toBeLessThan(1e-3);
      }
    });
  }

  it("says there's no Orion data outside the OEM, without a figure", async () => {
    const e = await client.scenario(
      "one-path",
      { frame: "ITRF" },
      at + 10 * 86_400,
    );
    expect(e.answer.headline).toMatch(/^No Orion data at this time/);
    expect(e.answer.value).toBeUndefined();
  }, 60_000);

  it("keeps the dish's mask check without Orion's data: the mask is the station's (Task 6c fix 2)", async () => {
    const s = spec("dish-tracks");
    const e = await client.scenario(
      s.id,
      { ...s.checked.knobs, station: "DSS-63" },
      checkedTdb(s.id) + 30 * 86_400,
    );
    expect(e.answer.headline).toMatch(/^No Orion data at this time/);
    expect(e.maskCheck?.label).toBe("DSS-63's published receive mask");
    expect(e.maskCheck?.samples).toHaveLength(8);
    expect(e.maskCheck?.source.document).toMatch(/810-005/);
  }, 60_000);
});

describe("Orion's dot, placed on the page's own thread, on the worker's drawn path (Task 4c)", () => {
  // The page places the dot from the OEM itself (orionTrack.ts
  // `orionPlace`), every frame; the worker draws the path (overlays.ts
  // `adaptivePath`, with orionLayer.ts's settings). They must agree: at each
  // sample's time the dot is that sample, placed then; between samples it is
  // within the path's tolerance of the drawn chord.
  const drawnAt = checkedTdb("one-path");
  const options = {
    step: 3600,
    tolerance: 5e-4,
    minStep: 5,
    floor: 100,
    maxSamples: 8000,
  };
  it("loads, on the page, the same Orion as the worker's (loadOrionTrack, checked against the manifest's SHA-256)", async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      expect(url).toBe(`/frames-data/${encodeURIComponent(ORION_OEM)}`);
      return new Response(readFileSync(join(dir, ORION_OEM)));
    }) as typeof fetch;
    try {
      const manifest = JSON.parse(
        readFileSync(join(dir, "manifest.json"), "utf8"),
      ) as StoreManifest;
      const page = await loadOrionTrack(
        frames,
        manifest,
        new AbortController().signal,
      );
      expect(page.spans).toEqual(orion.spans);
      for (const hours of [-48, 0, 0.5, 30]) {
        const t = Instant.fromTdb(drawnAt + hours * 3600);
        expect(Array.from(page.state(t)), `${hours} h`).toEqual(
          Array.from(orion.state(t)),
        );
      }
    } finally {
      globalThis.fetch = real;
    }
  });

  for (const frame of ["GCRF", "ITRF", "MOON_ME"] as const) {
    it(`agrees with the path drawn in ${frame}, at its samples and between them`, () => {
      const f =
        frame === "GCRF"
          ? frames.gcrf
          : frame === "ITRF"
            ? frames.itrf
            : frames.moonMe;
      const at = Instant.fromTdb(drawnAt);
      const g = adaptivePath(
        orion,
        f,
        frames,
        Instant.fromTdb(drawnAt - 12 * 3600),
        Instant.fromTdb(drawnAt + 12 * 3600),
        options,
        at,
      );
      expect(g.sampling.capped).toBeUndefined();
      const inverse = frameTransform(frames.itrf, f, at);
      const placedAt = (t: number) =>
        compose(frameTransform(f, frames.itrf, Instant.fromTdb(t)), inverse);
      const vertex = (i: number) => g.positions.subarray(3 * i, 3 * i + 3);
      let worstSample = 0;
      let worstBetween = 0;
      for (let k = 0; k < g.times.length; k += 2) {
        const [ta, tb] = [g.times[k]!, g.times[k + 1]!];
        // At the segment's first sample, placed at its own time.
        const dotA = orionPlace(orion, frames, Instant.fromTdb(ta))!;
        const onPath = pathPoint(placedAt(ta), vertex(k));
        worstSample = Math.max(
          worstSample,
          Math.hypot(...[0, 1, 2].map((i) => dotA[i]! - onPath[i]!)),
        );
        // Halfway between, against the chord placed then.
        const tm = (ta + tb) / 2;
        const m = placedAt(tm);
        const a = pathPoint(m, vertex(k));
        const b = pathPoint(m, vertex(k + 1));
        const dotM = orionPlace(orion, frames, Instant.fromTdb(tm))!;
        const ab = [0, 1, 2].map((i) => b[i]! - a[i]!);
        const am = [0, 1, 2].map((i) => dotM[i]! - a[i]!);
        const len2 = ab[0]! ** 2 + ab[1]! ** 2 + ab[2]! ** 2;
        const u = Math.min(
          1,
          Math.max(
            0,
            (ab[0]! * am[0]! + ab[1]! * am[1]! + ab[2]! * am[2]!) / len2,
          ),
        );
        const off = Math.hypot(...[0, 1, 2].map((i) => am[i]! - u * ab[i]!));
        const fromOrigin = Math.hypot(
          ...frameTransform(orion.frame, f, Instant.fromTdb(tm)).subarray(
            12,
            15,
          ),
        );
        worstBetween = Math.max(
          worstBetween,
          off / Math.max(options.tolerance * fromOrigin, options.floor),
        );
      }
      // The same point, to a millimetre; between samples, within the
      // path's own tolerance (0.05% of the distance, or its 100 m floor).
      expect(worstSample, `${frame}: at the samples, m`).toBeLessThan(1e-3);
      expect(
        worstBetween,
        `${frame}: between, of the tolerance`,
      ).toBeLessThanOrEqual(1);
      print(
        `Orion's dot on the ${frame} path: ${g.times.length / 2} segments, ${(worstSample * 1000).toFixed(3)} mm at the samples, ${(worstBetween * 100).toFixed(0)}% of the tolerance between`,
      );
    });
  }
});

describe("earth-turns adds Sacramento's site under ITRF (owner, fix 1)", () => {
  it("adds it, marked, under ITRF, with its edge's words; the answer's path stays ITRF to GCRF", async () => {
    const e = await client.scenario(
      "earth-turns",
      spec("earth-turns").checked.knobs,
      checkedTdb("earth-turns"),
    );
    expect(e.added.map((a) => [a.id, a.parentId])).toEqual([
      ["Sacramento ENU", "ITRF"],
    ]);
    expect(e.added[0]!.edge.accuracy.note).toMatch(/^not known/);
    expect(e.answer.path).toEqual({ from: "ITRF", to: "GCRF" });
  }, 60_000);
});

describe("the published counterpart under stand-on-moon's headline (the owner, fix 1)", () => {
  const entry = (
    references.entries as unknown as Record<
      string,
      { rate: string; source: { document: string } }
    >
  )["ashby-patla-2024"]!;

  it("at the checked setup: the reference's value and its citation, ours against it, the verdict", async () => {
    const s = spec("stand-on-moon");
    const e = await client.scenario(s.id, s.checked.knobs, checkedTdb(s.id));
    const pub = e.answer.published!;
    expect(pub.printed).toBe(entry.rate.replace("μs", "µs"));
    expect(pub.document).toBe(entry.source.document);
    expect(pub.url).toMatch(/^https:\/\/doi\.org\//);
    const r = catalog.get(pub.checkId)!;
    const t = publishedText({
      printed: pub.printed,
      document: pub.document,
      tolerance: pub.tolerance,
      unit: pub.unit,
      state: "checked",
      ours: r.effect!.value,
      difference: { value: r.value! },
      pass: r.pass,
    });
    expect(t.published).toContain("56.02 µs/day");
    expect(t.comparison).toMatch(
      /^ours 55\.\d\d µs\/day · difference .* · within 2% · passes$/,
    );
  }, 60_000);

  it("off it: the reference's value and the delta, and no verdict", async () => {
    const s = spec("stand-on-moon");
    const e = await client.scenario(s.id, { latitude: -45 }, checkedTdb(s.id));
    const rows = checkRows(s, false, catalog, e);
    const ref = rows.find(
      (row) =>
        row.status === "reference-only" &&
        row.id === e.answer.published!.checkId,
    );
    expect(ref?.status === "reference-only" && ref.delta).toBeTruthy();
    const t = publishedText({
      printed: e.answer.published!.printed,
      document: e.answer.published!.document,
      tolerance: e.answer.published!.tolerance,
      unit: e.answer.published!.unit,
      state: "off",
      delta: ref?.status === "reference-only" ? ref.delta! : undefined,
    });
    expect(t.published).toContain("56.02 µs/day");
    expect(t.comparison).toMatch(/your setting moves the answer by [+−]/);
    expect(t.comparison).not.toMatch(/passes|fails/);
  }, 60_000);

  it("the dish's headline has plan 3's light time as its published counterpart, checked by the catalog's light-time check (fix 1)", async () => {
    const s = spec("dish-tracks");
    const e = await client.scenario(s.id, s.checked.knobs, checkedTdb(s.id));
    const pub = e.answer.published!;
    expect(pub.checkId).toBe("space.dss43-orion.light-time");
    expect(pub.unit).toBe("s");
    // signal.json's DSS-43 light time at the checked setup's row.
    const row = signalFixture.rows.find(
      (r) => r.kind === "spread" && Math.abs(r.tdb - 828752222.2056508) < 1e-6,
    )!;
    expect(pub.value).toBe(row.dss43.CN.lt);
    // Ours agrees with it within plan 3's 0.5 m of light time.
    expect(Math.abs(e.answer.value! - pub.value) * 299_792_458).toBeLessThan(
      0.5,
    );
    const r = catalog.get(pub.checkId)!;
    // The panel's view: the difference at this row, in time.
    const view = publishedView(
      pub,
      catalog,
      true,
      "current",
      [],
      e.answer.value,
    ).published!;
    expect(view.difference).toEqual({
      value: e.answer.value! - pub.value,
      unit: "s",
    });
    expect(Math.abs(view.difference!.value)).toBeLessThan(0.5 / 299_792_458);
    const t = publishedText({ ...view, pass: r.pass });
    expect(t.published).toMatch(
      /^Published: 1\.3152565\d\d s one way at DSS-43/,
    );
    expect(t.comparison).toMatch(
      /^ours 1\.31525\d s · difference −?[\d.]+ ns · c·∆lt within 0\.5 m at each of its rows · passes$/,
    );
    // Off it (another station): the published value applies at the checked setup.
    const off = await client.scenario(
      s.id,
      { ...s.checked.knobs, station: "DSS-14" },
      checkedTdb(s.id),
    );
    const rows = checkRows(s, false, catalog, off);
    const ref = rows.find(
      (x) => x.status === "reference-only" && x.id === pub.checkId,
    );
    expect(ref?.status).toBe("reference-only");
  }, 60_000);

  it("only stand-on-moon's headline has a published counterpart among the ported three (and the two on the ground)", async () => {
    for (const id of [
      "one-path",
      "earth-turns",
      "bim-site",
      "corridor",
    ] as const) {
      const e = await client.scenario(
        id,
        spec(id).checked.knobs,
        checkedTdb(id),
      );
      expect(e.answer.published, id).toBeUndefined();
    }
  }, 60_000);
});

describe("bim-site: a BIM model's site grid on the globe (Task 6a)", () => {
  const s = spec("bim-site");
  const at = checkedTdb("bim-site");
  const knobs = (k: Readonly<Record<string, string | number>>): KnobState => ({
    ...s.checked.knobs,
    ...k,
  });

  it("adds its design CRS under ITRF and the site grid under it, pins the model's origin to the CRS, and answers the 31.4 m gap, its two parts each checked", async () => {
    const e = await client.scenario(s.id, s.checked.knobs, at);
    expect(e.added.map((a) => [a.id, a.parentId])).toEqual([
      ["California zone 3", "ITRF"],
      ["BIM site grid", "California zone 3"],
    ]);
    expect(e.added[0]!.edge.kind).toBe("proj-operation");
    expect(e.added[1]!.edge.accuracy.byDefinition).toBe(true);
    expect(e.data).toMatchObject({
      label: "The model's site origin",
      frame: "California zone 3",
      source: "IFC map conversion",
    });
    expect(e.data!.describes).toContain("6,000,000 ftUS");
    expect(e.answer.unit).toBe("m");
    expect(formatAnswer(e.answer.value!, "m")).toBe("31.4 m");
    expect(e.answer.path).toEqual({ from: "California zone 3", to: "ITRF" });
    // The catalog checks the same computation's parts, at the same setup.
    const drop = catalog.get("rigid-placement-budget.site-gap.drop")!;
    const along = catalog.get("rigid-placement-budget.site-gap.along")!;
    expect(drop.pass && along.pass).toBe(true);
    expect(drop.tolerance).toBe(1e-3);
    expect(along.tolerance).toBe(1e-3);
    // The headline's "2.23 m short" is the checked part along the line.
    expect(e.answer.headline).toContain(
      `${along.effect!.value.toFixed(2)} m short`,
    );
    // Drop and along at right angles, and a few mm across: the whole gap.
    expect(Math.hypot(drop.effect!.value, along.effect!.value)).toBeCloseTo(
      e.answer.value!,
      2,
    );
    print(`bim-site: ${drop.detail} | ${along.detail}`);
  }, 60_000);

  it("holds each site's origin in each CRS that covers it at one ground point (to a millimetre), and each CRS's area of use as PROJ gives it", async () => {
    const P = await context().loadProj();
    const ground = (place: (typeof BIM_PLACES)[keyof typeof BIM_PLACES]) =>
      Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: (place.longitude * Math.PI) / 180,
          latitude: (place.latitude * Math.PI) / 180,
          height: 0,
        },
        new Float64Array(3),
      );
    for (const crs of Object.values(BIM_CRS)) {
      const frame = EngineeringFrame.create(
        { name: crs.name, body: EARTH, crs: crs.crs },
        P,
      );
      const area = P.proj_get_area_of_use(
        P.proj_create(`EPSG:${crs.code.slice(5)}`),
      )!;
      expect(area.slice(0, 4), crs.code).toEqual([
        crs.area.west,
        crs.area.south,
        crs.area.east,
        crs.area.north,
      ]);
      for (const place of Object.values(BIM_PLACES)) {
        const origin = crs.origins[place.id];
        expect(origin !== undefined, `${crs.code} at ${place.id}`).toBe(
          covers(crs, place),
        );
        if (origin) {
          const p = frame.toBodyFixed([origin[0], origin[1], 0]);
          const g = ground(place);
          // San Francisco's ground point is California zone 3's origin:
          // the place's degrees are rounded to 1e-6° (0.1 m).
          expect(
            Math.hypot(p[0]! - g[0]!, p[1]! - g[1]!, p[2]! - g[2]!),
            `${crs.code} at ${place.id}`,
          ).toBeLessThan(0.1);
        }
      }
    }
    const ca = EngineeringFrame.create(
      { name: "ca", body: EARTH, crs: BIM_CRS["ca-zone-3"].crs },
      P,
    ).toBodyFixed([6_000_000, 2_100_000, 0]);
    const utm = EngineeringFrame.create(
      { name: "utm", body: EARTH, crs: BIM_CRS["utm-10n"].crs },
      P,
    ).toBodyFixed([...BIM_CRS["utm-10n"].origins["san-francisco"]!, 0]);
    expect(
      Math.hypot(ca[0]! - utm[0]!, ca[1]! - utm[1]!, ca[2]! - utm[2]!),
    ).toBeLessThan(1e-3);
  }, 60_000);

  for (const [site, crsA, crsB] of [
    ["san-francisco", "ca-zone-3", "utm-10n"],
    ["portland", "low-distortion", "utm-10n"],
  ] as const) {
    it(`at ${site}, ${crsA} and ${crsB} differ only by their scale and convergence`, async () => {
      const P = await context().loadProj();
      const gapIn = (crs: typeof crsA | typeof crsB) => {
        const b = bimSite(knobs({ site, crs }));
        const frame = EngineeringFrame.create(
          { name: `${crs} site`, body: EARTH, crs: b.crs.crs, site: b.site! },
          P,
        );
        return siteGap(frame, b.site!, 20_000);
      };
      const [a, b] = [gapIn(crsA), gapIn(crsB)];
      // One place, one rotation: the drop differs only as the convergence
      // turns the axis's azimuth (R in another direction), well under 1 cm.
      expect(Math.abs(a.drop - b.drop)).toBeLessThan(0.01);
      expect(a.latitude).toBeCloseTo(b.latitude, 6);
      // The part along differs by the CRSs' mean scales, d s (1/k̄a − 1/k̄b).
      const scale = Number(s.checked.knobs.scale);
      const byScale = 20_000 * scale * (1 / a.gridScale - 1 / b.gridScale);
      expect(Math.abs(a.short - b.short - byScale)).toBeLessThan(1e-3);
      // The two exact points 20 km out turn about the origin by the
      // difference of the convergences (the site grid turns with its CRS's
      // grid north).
      const turn = (g: typeof a) => {
        const o = g.placed.map((v, i) => v); // rigid point, for the sense
        return o;
      };
      void turn;
      const origin = Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: (BIM_PLACES[site].longitude * Math.PI) / 180,
          latitude: (BIM_PLACES[site].latitude * Math.PI) / 180,
          height: 0,
        },
        new Float64Array(3),
      );
      const chord = (p: Float64Array) =>
        p.map((v, i) => v - origin[i]!) as Float64Array;
      const [u, v] = [chord(a.exact), chord(b.exact)];
      const angle =
        Math.acos(
          Math.min(
            1,
            (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) /
              (Math.hypot(...u) * Math.hypot(...v)),
          ),
        ) /
        (Math.PI / 180);
      expect(angle).toBeCloseTo(Math.abs(a.convergence - b.convergence), 3);
      print(
        `bim-site at ${site}: ${crsA} drop ${a.drop.toFixed(4)} m, short ${a.short.toFixed(3)} m, γ ${a.convergence.toFixed(4)}°; ${crsB} drop ${b.drop.toFixed(4)} m, short ${b.short.toFixed(3)} m, γ ${b.convergence.toFixed(4)}°`,
      );
    }, 60_000);
  }

  it("labels a CRS outside its area of use, with the distortion it would bring, and computes no gap (fix 1)", async () => {
    for (const [site, crs, near] of [
      ["portland", "ca-zone-3", 9463],
      ["san-francisco", "low-distortion", 8806],
    ] as const) {
      const e = await client.scenario(s.id, knobs({ site, crs }), at);
      expect(e.answer.value, `${crs} at ${site}`).toBeUndefined();
      // The callout still answers, in words (re-review minor 1).
      expect(e.answer.label).toBe(
        `Not placed: ${BIM_CRS[crs].name} doesn't cover ${BIM_PLACES[site].where}`,
      );
      expect(answerTitle(e.answer)).toBe(e.answer.label);
      expect(e.answer.headline).toMatch(/doesn't cover/);
      expect(e.answer.accuracy.unbounded).toBe(true);
      expect(e.answer.aside).toContain(`${near.toLocaleString("en-US")} ppm`);
      expect(e.data).toBeUndefined();
      expect(e.live).toEqual([]);
      // The tree has the CRS (its operation), not a site grid it can't place.
      expect(e.added.map((a) => a.id)).toEqual([BIM_CRS[crs].name]);
    }
  }, 60_000);

  it("a ground-scaled site grid (s = k̄) leaves the drop and the chord", async () => {
    // California zone 3's mean scale along the line, from the catalog's detail.
    const k = Number(
      /k̄ (0\.\d+)/.exec(
        catalog.get("rigid-placement-budget.site-gap.along")!.detail!,
      )![1],
    );
    const e = await client.scenario(
      s.id,
      knobs({ scale: snapToStep(k, 0.0000005) }),
      at,
    );
    for (const r of e.live) {
      expect(r.pass, r.id).toBe(true);
    }
    // Within the knob's step of the drop and the chord alone (5e-7 × 20 km = 1 cm).
    expect(e.answer.value!).toBeCloseTo(
      Math.hypot(20_000 ** 2 / (2 * 6_384_892), 0.0654),
      1,
    );
  }, 60_000);
});

describe("corridor: station and offset on the clothoid road (Task 6a)", () => {
  const s = spec("corridor");
  const at = checkedTdb("corridor");

  it("round-trips the catalog's points through the ground: the answer's station and offset are the knobs' within the catalog's 1e-9 ft", async () => {
    const catalogResult = catalog.get("measurement.clothoid")!;
    expect(catalogResult.pass).toBe(true);
    let worst = 0;
    for (const station of [100, 650, 1000, 1350, 1900]) {
      for (const offset of [-25, 15]) {
        const e = await client.scenario(s.id, { station, offset }, at);
        // Relative to the road as placed: the alignment's 1e-9 ft, or what
        // the trip through PROJ adds (a few 1e-9 ft).
        expect(Math.abs(e.answer.value! - station)).toBeLessThan(1e-7);
        expect(e.answer.label).toContain(offsetText(offset));
        const live = e.live.find((r) => r.id === "measurement.clothoid.live")!;
        expect(live.pass, live.detail).toBe(true);
        expect(live.value!).toBeLessThanOrEqual(catalogResult.tolerance!);
        worst = Math.max(worst, Math.abs(e.answer.value! - station));
      }
    }
    print(
      `corridor: worst station back through the ground ${worst.toExponential(2)} ft; the catalog's worst ${catalogResult.value!.toExponential(2)} design units`,
    );
  }, 120_000);

  it("adds California zone 3 and the measurement site grid, pins the road to the site grid, and draws the road, its offset and its point", async () => {
    const e = await client.scenario(s.id, s.checked.knobs, at);
    expect(e.added.map((a) => [a.id, a.parentId])).toEqual([
      ["California zone 3", "ITRF"],
      ["Measurement site grid", "California zone 3"],
    ]);
    expect(e.data).toMatchObject({
      frame: "Measurement site grid",
      source: "alignment",
    });
    expect(e.overlays.map((o) => o.id)).toEqual(["road", "offset"]);
    expect(e.labels?.find((l) => l.marker)?.text).toBe(
      "6+50.00, 15.00 ft right",
    );
    // For a point measured in ITRF (or picked on the imagery): the route's
    // accuracy through measure, which takes in the CRS's ±2 m operation to
    // WGS 84; and relative to the road as placed, its 1e-8 ft (fix 1).
    expect(e.answer.accuracy.meters!).toBeGreaterThanOrEqual(
      e.added[0]!.edge.accuracy.meters!,
    );
    expect(e.answer.accuracy.meters!).toBeLessThan(3);
    expect(e.answer.accuracy.note).toMatch(/measured in ITRF/);
    expect(e.answer.accuracy.note).toMatch(
      /Relative to the road as placed through that operation, within/,
    );
    print(
      `corridor accuracy: ±${e.answer.accuracy.meters} m: ${e.answer.accuracy.note}`,
    );
  }, 60_000);

  it("reads the dragged point's knobs back off its own place: the local placement is good to the knobs' steps along the whole road", async () => {
    for (const [station, offset] of [
      [650, 15],
      [3, -50],
      [1997, 50],
      [1210, -25],
    ] as const) {
      const e = await client.scenario(s.id, { station, offset }, at);
      expect(knobsAt(e.drag!.at, e.drag!.toDesign, s.knobs)).toEqual({
        station,
        offset,
      });
    }
  }, 60_000);
});

describe("a dish tracks Orion (Task 6b)", () => {
  const dish = spec("dish-tracks");
  const station = (naif: number) =>
    Trajectory.fromSpk([bytes(STATIONS_SPK)], naif, frames, {
      name: `DSN ${naif}`,
      accuracy: "precise",
      j2000: "icrf",
    });
  const row = signalFixture.rows.find(
    (r) => Math.abs(r.tdb - checkedTdb("dish-tracks")) < 1e-3,
  )!;

  it("finds each of its three stations in the store's NAIF station SPK, in ITRF, where the page's triad and camera put it (within 1 m)", () => {
    const t = Instant.fromTdb(checkedTdb("dish-tracks"));
    for (const s of Object.values(DSN_STATIONS)) {
      const traj = station(s.naif);
      expect(traj.reference, s.name).toBe(frames.itrf);
      const p = traj.state(t).subarray(0, 3);
      const page = Ellipsoid.WGS84.cartographicToCartesian(
        {
          longitude: (s.longitude * Math.PI) / 180,
          latitude: (s.latitude * Math.PI) / 180,
          height: s.height!,
        },
        new Float64Array(3),
      );
      expect(
        Math.hypot(p[0]! - page[0]!, p[1]! - page[1]!, p[2]! - page[2]!),
        s.name,
      ).toBeLessThan(1);
    }
  });

  it("gives the light time at signal.json's row within plan 3's 0.5 m (c·∆lt), Newtonian as the fixture", async () => {
    expect(row, "the checked setup is a signal.json row").toBeDefined();
    const e = await client.scenario("dish-tracks", dish.checked.knobs, row.tdb);
    expect(e.answer.unit).toBe("s");
    const c = 299_792_458;
    const off = Math.abs(e.answer.value! - row.dss43.CN.lt) * c;
    print(
      `dish-tracks DSS-43 at the signal row: ${e.answer.value} s, SPICE ${row.dss43.CN.lt} s, c·∆lt ${off.toFixed(4)} m`,
    );
    expect(off).toBeLessThan(0.5);
  }, 60_000);

  it("points DSS-43 where a hand computation from the tree's own vectors says (R11), aberration its effect", async () => {
    const t = Instant.fromTdb(row.tdb);
    const e = await client.scenario("dish-tracks", dish.checked.knobs, row.tdb);
    const p = station(399043).state(t).subarray(0, 3);
    const site = eastNorthUpFrame(
      "DSS-43 ENU",
      frames.itrf,
      Ellipsoid.WGS84,
      p,
    );
    const hand = pointingByHand(frames, site, orion.frame, t);
    const { azimuth, elevation } = azimuthElevation(hand.apparent);
    // The answer's words carry the hand pointing to their 0.01°.
    expect(e.answer.label).toContain(pointingText(azimuth, elevation));
    const pointing = e.live.find((r) => r.id === "dish-tracks.pointing.live")!;
    expect(pointing.pass).toBe(true);
    expect(pointing.value!).toBeLessThan(1e-9);
    // The effect: aberration moves the pointing by about the Earth's
    // orbital speed over c (20″); from where Orion is now, the light time
    // takes most of it back (Orion moves with the Earth).
    expect(pointing.effect!.value).toBeGreaterThan(5);
    expect(pointing.effect!.value).toBeLessThan(40);
    print(
      `dish-tracks DSS-43 pointing ${pointingText(azimuth, elevation)}; by hand within ${pointing.value!} rad; aberration ${pointing.effect!.value.toFixed(3)}″`,
    );
  }, 60_000);

  it("says Orion is hidden by the Moon from DSS-43 at 23:04 UTC near the flyby, as the library's line of sight and hand limb geometry agree, and clear at 20:00", async () => {
    const at = (iso: string) => tdbOf(Date.parse(iso));
    const behind = await client.scenario(
      "dish-tracks",
      { station: "DSS-43" },
      at("2026-04-06T23:04:00Z"),
    );
    // The state leads (fix 1): no pointing figure while the signal is lost.
    expect(behind.answer.label).toBe("Signal lost: Orion is behind the Moon");
    expect(behind.answer.value).toBeUndefined();
    expect(behind.answer.sky?.state).toBe("lost");
    expect(behind.answer.sky?.text).toMatch(
      /^Signal lost: Orion is behind the Moon · loss \d\d:\d\d:\d\d UTC, acquisition/,
    );
    expect(behind.answer.aside).toMatch(
      /^no 70 m dish can hear Orion from 22:42:5\d UTC to 23:23:1\d UTC/,
    );
    const los = behind.live.find((r) => r.id === "space.line-of-sight.live")!;
    expect(los.pass, los.detail).toBe(true);
    const before = await client.scenario(
      "dish-tracks",
      { station: "DSS-43" },
      at("2026-04-06T20:00:00Z"),
    );
    expect(before.answer.sky).toMatchObject({
      state: "clear",
      text: "In view: clear of the Earth and the Moon",
    });
    // Below the horizon: the state, not a pointing below it.
    const down = await client.scenario(
      "dish-tracks",
      { station: "DSS-14" },
      at("2026-04-06T23:04:00Z"),
    );
    expect(down.answer.label).toBe("Below the horizon at DSS-14");
    expect(down.answer.value).toBeUndefined();
    // The page traces the last part over the terrain: one sight line from the dish.
    expect(before.sightLines?.map((l) => l.id)).toEqual(["orion"]);
  }, 60_000);

  it("routes Orion's data from EME2000 up to ICRF and down through GCRF and ITRF to the dish: the tree's EME2000 hangs under EARTH_ICRF, so they meet at ICRF", async () => {
    for (const id of ["DSS-14", "DSS-43", "DSS-63"] as const) {
      const e = await client.scenario("dish-tracks", { station: id }, row.tdb);
      expect(e.data?.frame).toBe("EME2000");
      const tree = buildScenarioTree(buildTree(frames), e.added);
      const p = branchPath(tree, e.answer.path!.from, e.answer.path!.to);
      expect(p.up.map((n) => n.id)).toEqual(["EME2000", "EARTH_ICRF"]);
      expect(p.ancestor.id).toBe("ICRF");
      expect(p.down.map((n) => n.id)).toEqual([
        "GCRF",
        "ITRF",
        DSN_STATIONS[id].name,
      ]);
      // The answer says the route through each frame on it.
      for (const n of [...p.up.slice(1), p.ancestor, ...p.down]) {
        expect(e.answer.headline, n.id).toContain(n.id);
      }
    }
  }, 60_000);
});

describe("Orion behind the Moon (Task 6b, the owner's ask)", () => {
  it("finds when no dish can hear Orion, the Moon or each dish's horizon in the way, its edges agreed by the library, and offers a jump to just before the loss behind the Moon", async () => {
    // The view knob is a way of looking, not a setting.
    expect(
      checkedState(
        spec("dish-tracks"),
        { station: "DSS-43", view: "orbit" },
        Date.parse(spec("dish-tracks").checked.epochUtc),
      ).atChecked,
    ).toBe(true);
    const e = await client.scenario(
      "dish-tracks",
      { station: "DSS-43" },
      checkedTdb("dish-tracks"),
    );
    const iso = (ms: number) => new Date(ms).toISOString();
    const network = (e.windows ?? []).filter((w) =>
      w.label.startsWith("No 70 m dish"),
    );
    print(
      `no dish can hear Orion: ${network.map((w) => `${iso(w.startUtc)} to ${iso(w.endUtc)}`).join("; ")}`,
    );
    const edges = e.live.find((r) => r.id === "dish-tracks.windows.live")!;
    print(`DSS-43 windows: ${edges.detail}`);
    // The library's line of sight agrees just inside and outside each edge.
    expect(edges.pass, edges.detail).toBe(true);
    // The network's loss behind the Moon: DSS-14 and DSS-63 have Orion
    // below their horizons then, so it is DSS-43's own (fix 1, item 1).
    const flyby = network.find(
      (w) =>
        w.startUtc < Date.parse("2026-04-06T23:00:00Z") &&
        w.endUtc > Date.parse("2026-04-06T23:00:00Z"),
    )!;
    expect(e.presets?.[0]?.utcMs).toBe(flyby.startUtc - 60_000);
    // Pinned (computed, not published: no NASA loss-of-signal time is cited
    // here), within 1 s; a kilometre of the real limb's relief moves an edge
    // by about 0.8 s, which the Moon as a sphere leaves out.
    const near = (ms: number, iso: string) =>
      expect(Math.abs(ms - Date.parse(iso)), iso).toBeLessThan(1000);
    near(flyby.startUtc, "2026-04-06T22:42:53.503Z");
    near(flyby.endUtc, "2026-04-06T23:23:12.000Z");
    // With the published masks (fix 2), the three 70 m dishes also leave
    // short daily gaps: the one before the flyby, pinned the same way.
    const gap = network.find(
      (w) => Math.abs(w.startUtc - Date.parse("2026-04-06T07:24:47Z")) < 60_000,
    );
    expect(gap, "the 07:25 UTC gap on the flyby day").toBeDefined();
    near(gap!.startUtc, "2026-04-06T07:24:46.980Z");
    near(gap!.endUtc, "2026-04-06T07:35:45.296Z");
    expect(edges.detail).toMatch(
      /behind the Moon: loss 22:42:5[34] UTC, acquisition 23:23:1[12] UTC/,
    );
  }, 120_000);
});

describe("where's the Moon from here (Task 6b)", () => {
  const moon = spec("moon-from-here");
  const entry = (
    references as unknown as {
      entries: Record<
        string,
        {
          azimuth: string;
          elevation: string;
          deltaAu: string;
          site: { longitude: string; latitude: string };
        }
      >;
    }
  ).entries["jpl-horizons-moon-sacramento"]!;

  it("asks Horizons about the scenario's own site", () => {
    expect(Number(entry.site.longitude)).toBe(SACRAMENTO.longitude);
    expect(Number(entry.site.latitude)).toBe(SACRAMENTO.latitude);
  });

  it("gives the distance, azimuth and elevation of JPL Horizons' table at its checked setup: the range within 1 m, the direction within 0.01″ (the catalog's), the azimuth and elevation to their printed 0.01°", async () => {
    const e = await client.scenario(
      "moon-from-here",
      {},
      checkedTdb("moon-from-here"),
    );
    const delta = Number(entry.deltaAu) * 149_597_870.7;
    print(
      `moon-from-here: ${e.answer.value} km, Horizons ${delta} km; ${e.answer.label}`,
    );
    expect(Math.abs(e.answer.value! - delta) * 1000).toBeLessThan(MOON_RANGE);
    expect(e.answer.published?.checkId).toBe(
      "space.moon-from-sacramento.range",
    );
    expect(e.answer.label).toContain(
      pointingText(Number(entry.azimuth), Number(entry.elevation)),
    );
    const direction = catalog.get("space.moon-from-sacramento.direction")!;
    expect(direction.pass).toBe(true);
    expect(direction.value!).toBeLessThan(MOON_DIRECTION);
    expect(direction.source?.document).toMatch(/Horizons/);
  }, 60_000);

  it("shows Horizons' apparent azimuth and elevation without a verdict: 0.385″ apart, still about 0.3″ with polar motion taken out, unexplained", async () => {
    const h = (
      await runStress(context(), {
        ids: ["space.moon-from-sacramento.horizon"],
      })
    ).find((r) => r.id === "space.moon-from-sacramento.horizon");
    expect(h!.displayOnly).toBe(true);
    print(`moon-from-here horizon: ${h!.detail}`);
    expect(h!.effect!.value).toBeLessThan(1);
    expect(h!.detail).toMatch(
      /still 0\.2\d\d″ apart: polar motion accounts for only part of it, and the rest is unexplained/,
    );
    // Never a check: the scenario's rows leave it out.
    expect(moon.checks).not.toContain("space.moon-from-sacramento.horizon");
  }, 60_000);

  it("works the pointing by hand from the tree's vectors (R11) at any time, and the site's frame is Sacramento's", async () => {
    const t = checkedTdb("moon-from-here") + 5 * 3600;
    const e = await client.scenario("moon-from-here", {}, t);
    const site = earthSiteFrame(frames.itrf, SACRAMENTO);
    const m = measure(
      framePoint(site, [0, 0, 0]),
      framePoint(frames.moonIcrf, [0, 0, 0]),
      Instant.fromTdb(t),
      frames,
      { shapiro: [] },
    );
    expect(e.answer.value).toBeCloseTo(m.signal!.downlink.range / 1000, 9);
    const p = e.live.find((r) => r.id === "moon-from-here.pointing.live")!;
    expect(p.pass).toBe(true);
    expect(e.added.map((a) => a.id)).toEqual([SACRAMENTO.name]);
    expect(e.answer.path).toEqual({ from: "MOON_ICRF", to: SACRAMENTO.name });
  }, 60_000);
});

describe("the line of sight drawn every frame on the page (Task 6b fix: it followed the worker's replies and stepped)", () => {
  // The page places the line at the instant the globe shows, from its own
  // frame tree and Orion's track (skyRay.ts, `rayDirection`); the worker's
  // evaluation states the answer. At sample instants they agree: the Moon's
  // within 1e-9 rad (the same site), the dish's within 1e-8 rad (the page's
  // station is the SPK's to 1 m: under 3e-9 rad at Orion's distance).
  const cases = [
    {
      id: "moon-from-here" as const,
      knobs: {},
      site: SACRAMENTO,
      target: "moon" as const,
      tolerance: 1e-9,
    },
    ...(["DSS-14", "DSS-43", "DSS-63"] as const).map((station) => ({
      id: "dish-tracks" as const,
      knobs: { station },
      site: DSN_STATIONS[station],
      target: "orion" as const,
      tolerance: 1e-8,
    })),
  ];
  for (const c of cases) {
    it(`${c.id} ${JSON.stringify(c.knobs)}: the per-frame line points where the worker's evaluation says, at sample instants`, async () => {
      const base = checkedTdb(c.id);
      const site = earthSiteFrame(frames.itrf, c.site);
      const toItrf = frameTransform(site, frames.itrf, Instant.fromTdb(base));
      const place = targetPlace(frames, c.target, orion)!;
      let worst = 0;
      for (const hours of [0, 0.5, 2, 7.25]) {
        const t = base + hours * 3600;
        const e = await client.scenario(c.id, c.knobs, t);
        const line = e.sightLines![0]!;
        const w = [0, 1, 2].map((i) => line.to[i]! - line.from[i]!);
        const lw = Math.hypot(w[0]!, w[1]!, w[2]!);
        const enu = rayDirection(
          frames,
          site,
          c.site.latitude,
          place,
          Instant.fromTdb(t),
        );
        const d = [0, 1, 2].map(
          (i) =>
            toItrf[i]! * enu[0]! +
            toItrf[4 + i]! * enu[1]! +
            toItrf[8 + i]! * enu[2]!,
        );
        worst = Math.max(
          worst,
          angleBetween(
            d,
            w.map((x) => x / lw),
          ),
        );
      }
      print(
        `${c.id} ${JSON.stringify(c.knobs)}: per-frame line within ${worst.toExponential(2)} rad of the worker's`,
      );
      expect(worst).toBeLessThan(c.tolerance);
    }, 60_000);
  }
});

describe("createSkyRay as the page runs it (fix 1): with the page's Orion track, against the worker", () => {
  /** A globe that records what the sky ray draws. */
  function fakeGlobe(shown: () => Instant) {
    const overlays = new Map<
      string,
      { placement: Float64Array; dashed: boolean }
    >();
    return {
      overlays,
      globe: {
        shownAt: () => shown(),
        setOverlay: (
          id: string,
          layers: readonly { dashed?: boolean }[],
          options: { placement?: ArrayLike<number> } = {},
        ) => {
          overlays.set(id, {
            placement: Float64Array.from(options.placement!),
            dashed: layers[0]!.dashed === true,
          });
        },
        placeOverlay: (id: string, m: ArrayLike<number>) => {
          overlays.get(id)!.placement = Float64Array.from(m);
        },
        removeOverlay: (id: string) => void overlays.delete(id),
        hasOverlay: (id: string) => overlays.has(id),
      },
    };
  }

  it("draws DSS-43's line where the worker's sight line points, dashed exactly while the worker says the Moon hides Orion", async () => {
    let at = Instant.fromTdb(checkedTdb("dish-tracks"));
    const g = fakeGlobe(() => at);
    const labels: LabelBoard = new Map();
    const knobs = { station: "DSS-43", view: "orbit" };
    const sky = createSkyRay({
      globe: g.globe as never,
      frames: () => frames,
      scene: () => SCENES["dish-tracks"],
      knobs: () => knobs,
      // The page's own track: orionFromOem on this thread, as orionLayer loads it.
      orionTrack: () => orion,
      labels,
      refreshLabels: () => {},
    });
    for (const iso of [
      "2026-04-06T12:55:53Z",
      "2026-04-06T20:00:00Z",
      "2026-04-06T22:50:00Z",
      "2026-04-06T23:10:00Z",
    ]) {
      const tdb = tdbOf(Date.parse(iso));
      at = Instant.fromTdb(tdb);
      sky.place();
      const e = await client.scenario("dish-tracks", knobs, tdb);
      const line = e.sightLines![0]!;
      const w = [0, 1, 2].map((i) => line.to[i]! - line.from[i]!);
      const lw = Math.hypot(w[0]!, w[1]!, w[2]!);
      const drawn = g.overlays.get("scenario:sky-ray:DSS-43 ENU:0")!;
      const z = [
        drawn.placement[8]!,
        drawn.placement[9]!,
        drawn.placement[10]!,
      ];
      expect(
        angleBetween(
          z,
          w.map((x) => x / lw),
        ),
        iso,
      ).toBeLessThan(1e-8);
      const lost = e.answer.label.startsWith("Signal lost");
      expect(drawn.dashed, `${iso}: dashed while the Moon hides Orion`).toBe(
        lost,
      );
    }
    sky.dispose();
    expect(g.overlays.size).toBe(0);
  }, 120_000);
});

describe("the DSN's published horizon masks (Task 6b, the owner's choice)", () => {
  it("keeps Orion out of view just above the ellipsoid's horizon but below DSS-43's mask", async () => {
    const station = Trajectory.fromSpk([bytes(STATIONS_SPK)], 399043, frames, {
      name: "DSS-43",
      accuracy: "precise",
      j2000: "icrf",
    });
    const place = Array.from(
      station.state(Instant.fromTdb(checkedTdb("dish-tracks"))).subarray(0, 3),
    );
    const dish = { place, mask: dsnMask("DSS-43") };
    // Orion rising at DSS-43 the day of the flyby: find where it is between
    // the ellipsoid's horizon and the mask, by hand.
    let found: { t: number; el: number; limit: number } | undefined;
    const start = tdbOf(Date.parse("2026-04-06T00:30:00Z"));
    for (let t = start; t < start + 4 * 3600 && !found; t += 60) {
      const b = blockedAt(frames, orion, dish, t)!;
      const limit = maskAt(dish.mask, b.azimuth);
      if (b.elevation > 0.5 && b.elevation < limit - 0.5) {
        found = { t, el: b.elevation, limit };
      }
    }
    expect(
      found,
      "a time Orion is between the horizon and the mask",
    ).toBeDefined();
    const e = await client.scenario(
      "dish-tracks",
      { station: "DSS-43" },
      found!.t,
    );
    print(
      `DSS-43 at ${new Date(Instant.fromTdb(found!.t).toUtc(frames.data.leapSeconds)).toISOString()}: Orion ${found!.el.toFixed(2)}° up, mask ${found!.limit.toFixed(2)}°: ${e.answer.label}`,
    );
    expect(e.answer.label).toBe("Below the horizon at DSS-43");
    expect(e.answer.value).toBeUndefined();
    expect(e.answer.sky?.text).toMatch(
      /horizon mask: Orion is \d+\.\d\d° up, the published receive limit there/,
    );
  }, 120_000);
});
