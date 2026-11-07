// The frames explorer's scenarios (examples/frames-explorer/scenarios/) on
// the frames data store, through the worker's host as the page asks for
// them: each answers with its accuracy, agrees with the catalog at its
// checked setup, and off it re-runs live what its proof can't claim there
// (P3: `live` covers the non-reference proof ids, and never takes a proof
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
import { publishedText } from "../../examples/frames-explorer/panel/answerText.ts";
import { routeSteps } from "../../examples/frames-explorer/panel/routeSteps.ts";
import references from "../../examples/frames-explorer/references.json";
import { proofRows } from "../../examples/frames-explorer/scenarios/proof.ts";
import type {
  KnobState,
  ScenarioId,
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
  runStress,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { compose, pathPoint } from "../../examples/frames-explorer/orion.ts";
import { adaptivePath } from "../../examples/frames-explorer/overlays.ts";
import { orionPlace } from "../../examples/frames-explorer/orionTrack.ts";
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
};
const PORTED: readonly ScenarioId[] = [
  "one-path",
  "earth-turns",
  "stand-on-moon",
];

const catalog = new Map<string, StressResult>();
beforeAll(async () => {
  const ids = PORTED.flatMap((id) => spec(id).proof);
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
        // At the checked setup, every proof row is the catalog's, passing.
        const rows = proofRows(spec(id), true, catalog, e);
        expect(rows.map((r) => r.kind)).toEqual(
          spec(id).proof.map(() => "checked"),
        );
        for (const r of rows) {
          expect(r.kind === "checked" && r.result.pass, id).toBe(true);
        }
      }, 60_000);

      it("off its checked setup: live covers every proof id the catalog checks without a reference, takes none, and passes", async () => {
        const off = OFF[id]!;
        const e = await client.scenario(
          id,
          off.knobs,
          checkedTdb(id) + off.hours * 3600,
        );
        const live = new Set(e.live.map((r) => r.id));
        const proof = new Set(spec(id).proof);
        for (const r of e.live) {
          expect(proof.has(r.id), r.id).toBe(false);
          expect(r.pass, `${r.id}: ${r.detail}`).toBe(true);
          expect(r.source, r.id).toBeUndefined();
        }
        for (const p of spec(id).proof) {
          const result = catalog.get(p);
          expect(result, p).toBeDefined();
          if (result!.source === undefined) {
            expect(live.has(`${p}.live`), `${p} has no live stand-in`).toBe(
              true,
            );
          }
        }
        // Off it, nothing reads as verified: reference rows carry no pass.
        const rows = proofRows(spec(id), false, catalog, e);
        expect(rows.some((r) => r.kind === "checked")).toBe(false);
        expect(rows.filter((r) => r.kind === "live")).toHaveLength(
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
    const r = catalog.get(pub.proofId)!;
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
    const rows = proofRows(s, false, catalog, e);
    const ref = rows.find(
      (row) =>
        row.kind === "reference-only" && row.id === e.answer.published!.proofId,
    );
    expect(ref?.kind === "reference-only" && ref.delta).toBeTruthy();
    const t = publishedText({
      printed: e.answer.published!.printed,
      document: e.answer.published!.document,
      tolerance: e.answer.published!.tolerance,
      unit: e.answer.published!.unit,
      state: "off",
      delta: ref?.kind === "reference-only" ? ref.delta! : undefined,
    });
    expect(t.published).toContain("56.02 µs/day");
    expect(t.comparison).toMatch(/your setting moves the answer by [+−]/);
    expect(t.comparison).not.toMatch(/passes|fails/);
  }, 60_000);

  it("only stand-on-moon's headline has a published counterpart among the ported three", async () => {
    for (const id of ["one-path", "earth-turns"] as const) {
      const e = await client.scenario(
        id,
        spec(id).checked.knobs,
        checkedTdb(id),
      );
      expect(e.answer.published, id).toBeUndefined();
    }
  }, 60_000);
});
