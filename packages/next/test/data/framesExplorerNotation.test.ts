// No e-notation in what the page shows (Task 9, I13; DESIGN.md "powers of
// ten written out ('3.4 × 10⁻⁹', never '3.4e-9')"): every scenario's answer
// at its checked setup and its check rows, and every catalog result's
// title and detail, on the frames data store.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import {
  createHost,
  type HostPort,
  type MakeContext,
} from "../../examples/frames-explorer/host.ts";
import {
  accuracyLine,
  answerTitle,
  publishedText,
} from "../../examples/frames-explorer/panel/answerText.ts";
import {
  checkRowStrings,
  checkRowText,
} from "../../examples/frames-explorer/panel/checkText.ts";
import { extrasOf } from "../../examples/frames-explorer/panelModel.ts";
import {
  createClient,
  type ClientWorker,
} from "../../examples/frames-explorer/protocol.ts";
import { checkRows } from "../../examples/frames-explorer/scenarios/checks.ts";
import { READY } from "../../examples/frames-explorer/scenarios/scenes.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import {
  ORION_OEM,
  STATIONS_SPK,
  orionFromOem,
  runStress,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import {
  MEASURED_AT,
  MEASURED_AT_UTC,
  SIGNAL_ROW_UTC,
} from "../../examples/frames-explorer/stress/epochs.ts";
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

/** JavaScript's e-notation, as `String(1e-9)` prints it. */
const E_NOTATION = /\de[-+]?\d/;
/**
 * A PROJ definition's own parameters (`+towgs84=…`, `+k=…`) are PROJ's
 * text, quoted as it is (a code block in the panel), so they're left out.
 */
const shown = (t: string) => t.replace(/\+[a-z_0-9]+=\S+/g, "");
const leap = frames.data.leapSeconds;

describe("no e-notation in what the page shows (Task 9, I13)", () => {
  let catalog: StressResult[] = [];

  it("in every catalog result's title and detail", async () => {
    catalog = await runStress(context());
    expect(catalog.length).toBeGreaterThan(200);
    const bad = catalog.flatMap((r) =>
      [r.title, r.detail, r.accuracyNote, r.effect?.label]
        .filter((t): t is string => typeof t === "string")
        .filter((t) => E_NOTATION.test(shown(t)))
        .map((t) => `${r.id}: ${t.slice(0, 160)}`),
    );
    expect(bad).toEqual([]);
  }, 600_000);

  it("in every scenario's answer and check rows at its checked setup", async () => {
    const byId = new Map(catalog.map((r) => [r.id, r]));
    const bad: string[] = [];
    for (const id of READY) {
      const spec = SCENARIOS.find((s) => s.id === id)!;
      const tdb = Instant.fromUtc(
        Date.parse(spec.checked.epochUtc),
        leap,
      ).tdb();
      const e = await client.scenario(id, spec.checked.knobs, tdb);
      const a = e.answer;
      const texts = [
        answerTitle(a),
        a.aside,
        a.headline,
        a.unpublished,
        a.sky?.text,
        accuracyLine(a),
        ...(a.breakdown ?? []).flatMap((t) => [t.label, t.note]),
        ...(a.method ?? []).flatMap((m) => [m.title, m.text]),
        ...(a.published
          ? Object.values(
              publishedText({
                ...a.published,
                state: "loading",
              }),
            )
          : []),
      ];
      const extras = Object.fromEntries(
        [...byId.values(), ...e.live].map((r) => [r.id, extrasOf(r)]),
      );
      for (const row of checkRows(spec, true, byId, e)) {
        const t = checkRowText(row, extras);
        const key = "result" in row ? row.result.id : "id" in row ? row.id : "";
        texts.push(...checkRowStrings(row, t, extras[key]));
      }
      for (const r of e.live) {
        texts.push(r.title, r.detail);
      }
      for (const t of texts) {
        if (typeof t === "string" && E_NOTATION.test(shown(t))) {
          bad.push(`${id}: ${t.slice(0, 160)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  }, 600_000);
});

describe("the BIM site where its CRS doesn't reach (Task 9, I9)", () => {
  it("says which checks can't re-run there and why, never an empty section", async () => {
    const spec = SCENARIOS.find((s) => s.id === "bim-site")!;
    const tdb = Instant.fromUtc(Date.parse(spec.checked.epochUtc), leap).tdb();
    const e = await client.scenario(
      "bim-site",
      { ...spec.checked.knobs, site: "portland" },
      tdb,
    );
    expect(e.live).toEqual([]);
    const rows = checkRows(spec, false, new Map(), e).filter(
      (r) => r.status === "not-run",
    );
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (const r of rows) {
      const t = checkRowText(r, {});
      expect(t.status).toBe("Not run");
      expect(t.summary).toMatch(/doesn't cover Portland/);
    }
    // Where the CRS covers it, they run live.
    const utm = await client.scenario(
      "bim-site",
      { ...spec.checked.knobs, site: "portland", crs: "utm-10n" },
      tdb,
    );
    expect(utm.live.length).toBeGreaterThanOrEqual(4);
    expect(utm.notRun ?? []).toEqual([]);
  }, 120_000);
});

/**
 * Cases whose result holds at any epoch, so a scenario may cite them at its
 * own: MOON_ME to MOON_PA is a constant rotation (specs.ts, stand-on-moon).
 */
const EPOCH_FREE = new Set(["space.effects.moon-me-pa"]);

describe("each scenario's checked setup is its catalog cases' (final review, finding 1)", () => {
  it("cites cases that ran at the scenario's checked epoch", async () => {
    const results = await runStress(context());
    const byId = new Map(results.map((r) => [r.id, r]));
    const off: string[] = [];
    let compared = 0;
    for (const spec of SCENARIOS) {
      const tdb = Instant.fromUtc(
        Date.parse(spec.checked.epochUtc),
        leap,
      ).tdb();
      for (const id of spec.checks) {
        const r = byId.get(id);
        expect(r, `${spec.id}: ${id} is in the catalog`).toBeDefined();
        if (r?.instant === undefined || EPOCH_FREE.has(id)) {
          continue;
        }
        compared++;
        if (Math.abs(r.instant - tdb) > 1e-3) {
          off.push(`${spec.id}: ${id} at TDB ${r.instant}, checked at ${tdb}`);
        }
      }
    }
    expect(off).toEqual([]);
    expect(compared).toBeGreaterThan(5);
  }, 600_000);

  it("holds the signal row's UTC to the fixture's spread row", () => {
    const fixture = JSON.parse(
      readFileSync(join(__dirname, "../fixtures/frames/signal.json"), "utf8"),
    ) as { rows: { kind: string; tdb: number }[] };
    // One of the fixture's "spread" rows, to the ms (the epoch's comment
    // names TDB 828752222.2056508).
    const tdb = Instant.fromUtc(Date.parse(SIGNAL_ROW_UTC), leap).tdb();
    const nearest = Math.min(
      ...fixture.rows
        .filter((r) => r.kind === "spread")
        .map((r) => Math.abs(r.tdb - tdb)),
    );
    expect(nearest).toBeLessThan(1e-3);
    expect(MEASURED_AT_UTC).toBe(`${MEASURED_AT}Z`);
  });
});
