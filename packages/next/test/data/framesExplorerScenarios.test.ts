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
import { loadProj } from "../../src/engineering/proj.ts";
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
    expect(moon.added.map((a) => a.parentId)).toEqual([orion.reference.name]);
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
