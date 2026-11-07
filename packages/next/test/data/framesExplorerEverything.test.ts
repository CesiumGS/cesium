// The capstone, "Everything at once" (Task 8), on the frames data store,
// through the worker's host as the page asks for it: for every pair of its
// five objects the distance is the norm of their ICRF difference, the light
// time is the library's `solveLightTime`, and the answer's path gives the
// tree's ancestor table (Review Focus 5, corrected after Task 6b: Orion
// hangs under EME2000, under EARTH_ICRF). The page's own ends of the leader
// line agree with the worker's at sample instants, the pair's accuracy is
// bounded only where both ends' walks are, and its checks hold on and off
// the checked setup, none saying "validated".
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MessageChannel, type MessagePort } from "node:worker_threads";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { pairPlaces } from "../../examples/frames-explorer/bodyLines.ts";
import { composedView } from "../../examples/frames-explorer/composed.ts";
import {
  createHost,
  type HostPort,
  type MakeContext,
} from "../../examples/frames-explorer/host.ts";
import {
  checkRowStrings,
  checkRowText,
} from "../../examples/frames-explorer/panel/checkText.ts";
import { answerTitle } from "../../examples/frames-explorer/panel/answerText.ts";
import { extrasOf } from "../../examples/frames-explorer/panelModel.ts";
import {
  createClient,
  type ClientWorker,
} from "../../examples/frames-explorer/protocol.ts";
import { checkRows } from "../../examples/frames-explorer/scenarios/checks.ts";
import type { ScenarioEvaluation } from "../../examples/frames-explorer/scenarios/evaluate.ts";
import {
  CAPSTONE,
  CAPSTONE_DISH,
  CAPSTONE_LATITUDE,
  DSN_STATIONS,
  SCENES,
  earthSiteFrame,
  lunarSiteFrame,
  type CapstoneObject,
} from "../../examples/frames-explorer/scenarios/scenes.ts";
import type { KnobState } from "../../examples/frames-explorer/scenarios/spec.ts";
import { SCENARIOS } from "../../examples/frames-explorer/scenarios/specs.ts";
import {
  buildScenarioTree,
  buildTree,
  branchPath,
  type TreeNode,
} from "../../examples/frames-explorer/tree.ts";
import {
  ORION_OEM,
  STATIONS_SPK,
  orionFromOem,
  runStress,
  type StoreManifest,
  type StressContext,
  type StressResult,
} from "../../examples/frames-explorer/tests.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import type { FrameData } from "../../src/ephemeris/loadFrameData.ts";
import { frameTransform, type Frame } from "../../src/frames/Frame.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { framePoint } from "../../src/frames/local.ts";
import { solveLightTime } from "../../src/measure/lightTime.ts";
import { Instant } from "../../src/time/Instant.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";
import { Trajectory } from "../../src/trajectory/Trajectory.ts";

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
const SPEC = SCENARIOS.find((s) => s.id === "everything")!;
const SCENE = SCENES.everything!;
const leap = frames.data.leapSeconds;
const CHECKED = Instant.fromUtc(Date.parse(SPEC.checked.epochUtc), leap).tdb();
const OBJECTS = Object.keys(CAPSTONE) as CapstoneObject[];
const PAIRS: [CapstoneObject, CapstoneObject][] = OBJECTS.flatMap((a) =>
  OBJECTS.filter((b) => b !== a).map((b): [CapstoneObject, CapstoneObject] => [
    a,
    b,
  ]),
);
const dist = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
const at3 = (m: ArrayLike<number>) => [m[12]!, m[13]!, m[14]!];
const evaluate = (knobs: KnobState, tdb = CHECKED) =>
  client.scenario("everything", knobs, tdb);

/** The station's place from the SPK, as the worker reads it. */
const station = Trajectory.fromSpk(
  [bytes(STATIONS_SPK)],
  DSN_STATIONS[CAPSTONE_DISH].naif,
  frames,
  { name: CAPSTONE_DISH, accuracy: "precise", j2000: "icrf" },
);

/** The page's own frames for the five objects, as the stage builds them (scenes.ts). */
function pageFrames(e: ScenarioEvaluation): Frame[] {
  return [
    lunarSiteFrame(frames.moonMe, CAPSTONE_LATITUDE),
    earthSiteFrame(frames.itrf, DSN_STATIONS[CAPSTONE_DISH]),
    ...SCENE.bodies!(frames, SPEC.checked.knobs, e),
  ];
}

/** The tree the page draws, with its frames attached (treeState.ts) and Orion's (the worker's statements). */
function pageTree(e: ScenarioEvaluation, instant: Instant): TreeNode {
  const tree = buildScenarioTree(buildTree(frames, {}, instant), e.added);
  const local = pageFrames(e);
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

/** Each object's chain to the root, nearest first (hand-written). */
const ARM_CHAIN = [
  "Wrist",
  "Elbow",
  "Shoulder",
  "Base yaw",
  "Arm base",
  "LC-39A pad ENU",
  "ITRF",
  "GCRF",
  "ICRF",
];
const CHAIN: Record<string, string[]> = {
  "DSS-43 ENU": ["ITRF", "GCRF", "ICRF"],
  "Mast sensor": ["Ship body", "ITRF", "GCRF", "ICRF"],
  orion: ["EME2000", "EARTH_ICRF", "ICRF"],
  "Lunar site": ["MOON_ME", "MOON_ICRF", "ICRF"],
  Tool: ARM_CHAIN,
};
/** Where each pair meets: siblings on the Earth at ITRF, everything else at the root. */
const meetOf = (a: CapstoneObject, b: CapstoneObject) =>
  CAPSTONE[a].place && CAPSTONE[b].place ? "ITRF" : "ICRF";

const catalog = new Map<string, StressResult>();
const evaluations = new Map<string, ScenarioEvaluation>();
beforeAll(async () => {
  for (const r of await runStress(context(), { ids: [...SPEC.checks] })) {
    catalog.set(r.id, r);
  }
  for (const [a, b] of PAIRS) {
    evaluations.set(`${a}>${b}`, await evaluate({ from: a, to: b }));
  }
}, 300_000);
const of = (a: CapstoneObject, b: CapstoneObject) =>
  evaluations.get(`${a}>${b}`)!;

describe("the capstone: every pair of its five objects (Task 8)", () => {
  it("states each pair's distance as the norm of the two origins' difference in ICRF", () => {
    const instant = Instant.fromTdb(CHECKED);
    for (const [a, b] of PAIRS) {
      const e = of(a, b);
      expect(e.scenario).toBe("everything");
      // The ends, placed independently of the worker: the station from its
      // SPK, the rest from the page's frames, Orion from its OEM.
      const icrf = (o: CapstoneObject): number[] => {
        if (o === "orion") {
          return at3(frameTransform(orion.frame, frames.icrf, instant));
        }
        if (o === "dish") {
          const p = station.state(instant).subarray(0, 3);
          const m = frameTransform(frames.itrf, frames.icrf, instant);
          return [0, 1, 2].map(
            (i) =>
              m[i]! * p[0]! +
              m[4 + i]! * p[1]! +
              m[8 + i]! * p[2]! +
              m[12 + i]!,
          );
        }
        const f = pageFrames(e).find((l) => l.name === CAPSTONE[o].node)!;
        return at3(frameTransform(f, frames.icrf, instant));
      };
      const d = dist(icrf(a), icrf(b));
      expect(e.answer.unit).toBe("km");
      expect(e.answer.value! * 1000, `${a} to ${b}`).toBeCloseTo(d, 3);
      expect(dist(e.pair!.from.icrf, e.pair!.to.icrf)).toBeCloseTo(d, 3);
      expect(answerTitle(e.answer)).toMatch(/ km apart$/);
    }
  });

  it("gives each pair's light time as the library's solveLightTime, To heard at From (Newtonian, as plan 3), within 1e-12 s", () => {
    const instant = Instant.fromTdb(CHECKED);
    for (const [a, b] of PAIRS) {
      const e = of(a, b);
      const local = pageFrames(e);
      const point = (o: CapstoneObject) =>
        o === "orion"
          ? framePoint(orion.frame, [0, 0, 0])
          : o === "dish"
            ? framePoint(frames.itrf, station.state(instant).subarray(0, 3))
            : framePoint(
                local.find((l) => l.name === CAPSTONE[o].node)!,
                [0, 0, 0],
              );
      const lt = solveLightTime(
        point(a),
        point(b),
        instant,
        "reception",
        frames,
        [],
      ).lightTime;
      const shown = /Light ([\d.,]+) (s|ms) one way/.exec(e.answer.aside!)!;
      const value = Number(shown[1]!.replace(/,/g, ""));
      expect(value * (shown[2] === "ms" ? 1e-3 : 1)).toBeCloseTo(lt, 6);
      const live = e.live.find((r) => r.id === "everything.light-time.live")!;
      expect(live.pass, live.detail).toBe(true);
      expect(live.detail).toContain(
        lt.toPrecision(10).replace(/0+$/, "").slice(0, 8),
      );
    }
  });

  it("lights the route the tree's ancestor table gives for every pair (Review Focus 5)", () => {
    for (const [a, b] of PAIRS) {
      const e = of(a, b);
      const tree = buildScenarioTree(buildTree(frames), e.added);
      const [from, to] = [CAPSTONE[a].node, CAPSTONE[b].node];
      expect(e.answer.path).toEqual({ from, to });
      const path = branchPath(tree, from, to);
      const meet = meetOf(a, b);
      expect(path.ancestor.id, `${a} to ${b}`).toBe(meet);
      expect(path.up.map((n) => n.id)).toEqual([
        from,
        ...CHAIN[from]!.slice(0, CHAIN[from]!.indexOf(meet)),
      ]);
      expect(path.down.map((n) => n.id)).toEqual([
        ...CHAIN[to]!.slice(0, CHAIN[to]!.indexOf(meet)).reverse(),
        to,
      ]);
    }
    // The longest path, the checked setup: the ship's mast and the lunar
    // site meet only at the root.
    const longest = branchPath(
      buildScenarioTree(buildTree(frames), of("ship", "lunar-site").added),
      CAPSTONE.ship.node,
      CAPSTONE["lunar-site"].node,
    );
    expect(longest.up.length + longest.down.length).toBe(7);
  });

  it("places the page's own ends of the leader line where the worker's are, at sample instants", async () => {
    for (const [a, b] of [
      ["ship", "lunar-site"],
      ["dish", "orion"],
      ["tool", "dish"],
    ] as [CapstoneObject, CapstoneObject][]) {
      for (const dt of [0, 600, 3 * 3600]) {
        const tdb = CHECKED + dt;
        const e = await evaluate({ from: a, to: b }, tdb);
        const ends = pairPlaces(
          e.pair!,
          pageFrames(e),
          orion,
          frames,
          Instant.fromTdb(tdb),
        )!;
        for (const [page, worker, o] of [
          [ends.from, e.pair!.from, a],
          [ends.to, e.pair!.to, b],
        ] as const) {
          // The dish's place on the page is the SPK's to 0.1 m (scenes.ts);
          // the rest are the same frames, to round-off.
          const tolerance = o === "dish" ? 1 : 1e-3;
          expect(dist(page.itrf, worker.itrf), `${o} at +${dt} s`).toBeLessThan(
            tolerance,
          );
          expect(dist(page.icrf, worker.icrf), `${o} at +${dt} s`).toBeLessThan(
            tolerance,
          );
        }
      }
    }
  }, 120_000);

  it("is bounded only where both ends' walks are, and states its terms largest first", () => {
    const instant = Instant.fromTdb(CHECKED);
    for (const [a, b] of PAIRS) {
      const e = of(a, b);
      const tree = pageTree(e, instant);
      const walk = (o: CapstoneObject) =>
        composedView(tree, frames, instant, "GCRF", CAPSTONE[o].node)!.statement
          .meters;
      const bounded = walk(a) !== undefined && walk(b) !== undefined;
      expect(e.answer.accuracy.meters !== undefined, `${a} to ${b}`).toBe(
        bounded,
      );
      expect(e.pair!.meters).toBe(e.answer.accuracy.meters);
      // Stated terms largest first; those that state nothing after them
      // (the dish's own position, DSN 810-005's centimetres: fix 1, M4).
      const sizes = e.answer.breakdown!.map((t) => t.meters ?? -1);
      expect(sizes).toEqual([...sizes].sort((p, q) => q - p));
      const dish = a === "dish" || b === "dish";
      expect(
        e.answer.breakdown!.some(
          (t) => t.meters === undefined && /DSN 810-005/.test(t.label),
        ),
      ).toBe(dish);
      if (bounded) {
        expect(e.answer.accuracy.meters).toBeCloseTo(
          Math.hypot(
            ...e.answer.breakdown!.flatMap((t) =>
              t.meters === undefined ? [] : [t.meters],
            ),
          ),
          9,
        );
        if (dish) {
          expect(e.answer.accuracy.note).toMatch(
            /not stated, so it is left out/,
          );
        }
      }
    }
  });

  it("says plainly whether one sees the other, the hand geometry agreeing", () => {
    for (const [a, b] of PAIRS) {
      const e = of(a, b);
      const los = e.live.find((r) => r.id === "everything.line-of-sight.live")!;
      expect(los.pass, `${a} to ${b}: ${los.detail}`).toBe(true);
      const sky = e.answer.sky!;
      if (CAPSTONE[a].place && CAPSTONE[b].place) {
        // On the Earth, all three are over each other's horizon.
        expect(sky.state).toBe("lost");
        expect(sky.text).toMatch(/the Earth is in the way \(the straight line/);
        expect(e.sightLines).toEqual([]);
      }
      const ground = [a, b].find((o) => o === "ship" || o === "tool");
      if (
        sky.state === "clear" &&
        ground !== undefined &&
        !(CAPSTONE[a].place && CAPSTONE[b].place)
      ) {
        // The ship's or the tool's local horizon is traced on the page, for
        // this pair, from that end.
        expect(e.sightLines!.map((l) => [l.id, l.key, l.end])).toEqual([
          ["pair", JSON.stringify([a, b]), CAPSTONE[ground].name],
        ]);
        expect(sky.line).toBe("pair");
        expect(sky.key).toBe(JSON.stringify([a, b]));
      }
      if (
        (a === "dish" || b === "dish") &&
        !(CAPSTONE[a].place && CAPSTONE[b].place)
      ) {
        // The dish's horizon is its published receive mask (fix 1).
        expect(e.sightLines).toEqual([]);
        if (los.detail!.startsWith("library: clear")) {
          expect(sky.text).toMatch(
            /DSS-43's (published receive )?(horizon )?mask/,
          );
        }
      }
    }
  });
});

describe("the capstone's checks and moments (Task 8, fix 1)", () => {
  it("at its checked setup, DSS-43 receiving from Orion: its own published light time beside the answer, its own hand formulas and round trips, all passing; none says validated", () => {
    const e = of("dish", "orion");
    expect(SPEC.checked.knobs).toEqual({ from: "dish", to: "orion" });
    expect(e.answer.unpublished).toBeUndefined();
    const pub = e.answer.published!;
    expect(pub.checkId).toBe("space.dss43-orion.light-time");
    // Ours, in seconds, against plan 3's value at this very row.
    expect(Math.abs(pub.ours! - pub.value) * 299_792_458).toBeLessThan(0.5);
    const rows = checkRows(SPEC, true, catalog, e);
    expect(rows.map((r) => [r.status, r.kind])).toEqual([
      ["checked", "published"],
      ["live", "hand"],
      ["live", "roundTrip"],
      ["live", "hand"],
    ]);
    for (const r of rows) {
      if (r.status === "checked" || r.status === "live") {
        expect(r.result.pass, `${r.result.id}: ${r.result.detail}`).toBe(true);
        const extras = extrasOf(r.result);
        const t = checkRowText(r, { [r.result.id]: extras }, "current");
        expect(
          /\bvalidated\b/i.test(checkRowStrings(r, t, extras).join(" ")),
        ).toBe(false);
      }
    }
    // Its sky leads clear, above DSS-43's published mask.
    expect(e.answer.sky!.text).toMatch(/above DSS-43's published receive mask/);
  });

  it("off it: live re-runs, passing, under no check's id; the published light time applies at the checked setup, moving the answer only for its own pair", async () => {
    for (const [a, b] of PAIRS.filter(
      ([x, y]) => !(x === "dish" && y === "orion"),
    )) {
      const e = of(a, b);
      for (const r of e.live) {
        expect(SPEC.checks.includes(r.id), r.id).toBe(false);
        expect(r.pass, `${a} to ${b}: ${r.id}: ${r.detail}`).toBe(true);
        expect(r.source).toBeUndefined();
      }
      expect(e.answer.published).toBeUndefined();
      expect(e.answer.unpublished).toMatch(/^No published value for this pair/);
      const rows = checkRows(SPEC, false, catalog, e);
      expect(rows.some((r) => r.status === "checked")).toBe(false);
      const ref = rows.filter((r) => r.status === "reference-only");
      expect(ref.map((r) => r.kind)).toEqual(["published"]);
      // Another pair's distance is not this one's moved.
      expect(ref.some((r) => r.status === "reference-only" && r.delta)).toBe(
        false,
      );
      expect(
        rows.filter((r) => r.status === "live").map((r) => r.kind),
      ).toEqual(e.live.map(() => "live"));
      for (const r of rows) {
        const extras = r.status === "live" ? extrasOf(r.result) : undefined;
        if (extras) {
          delete extras.compared;
        }
        const t = checkRowText(
          r,
          r.status === "live" && extras ? { [r.result.id]: extras } : {},
          "current",
        );
        expect(
          /\bvalidated\b/i.test(checkRowStrings(r, t, extras).join(" ")),
        ).toBe(false);
      }
    }
    expect(of("orion", "dish").answer.unpublished).toMatch(/turned round/);
    // The checked pair an hour on: its own distance moved, in km.
    const later = await evaluate(SPEC.checked.knobs, CHECKED + 3600);
    const ref = checkRows(SPEC, false, catalog, later).find(
      (r) => r.status === "reference-only",
    );
    expect(ref?.status === "reference-only" && ref.delta?.unit).toBe("km");
    expect(later.answer.published?.ours).toBeDefined();
    // No published comparison runs as a live re-run.
    expect(later.live.some((r) => /dss43|SPICE/.test(r.id + r.title))).toBe(
      false,
    );
  });

  it("agrees with the dish's own scenario on DSS-43's horizon at the same instants (its published mask)", async () => {
    for (const dt of [0, 3 * 3600, 6 * 3600, 9 * 3600, 12 * 3600, 15 * 3600]) {
      const tdb = CHECKED + dt;
      const mine = await evaluate({ from: "dish", to: "orion" }, tdb);
      const dish = await client.scenario(
        "dish-tracks",
        { station: "DSS-43", view: "dish" },
        tdb,
      );
      expect(mine.answer.sky!.state, `+${dt} s`).toBe(dish.answer.sky!.state);
      if (/^Below DSS-43's/.test(dish.answer.sky!.text)) {
        expect(mine.answer.sky!.text).toBe(dish.answer.sky!.text);
      }
    }
  }, 300_000);

  it("says plainly when Orion has no data, and rethrows nothing for a pair without it", async () => {
    const early = Instant.fromUtc(
      Date.parse("2026-01-01T00:00:00Z"),
      leap,
    ).tdb();
    const none = await evaluate({ from: "ship", to: "orion" }, early);
    expect(none.answer.label).toBe("No Orion data at this time");
    expect(none.answer.accuracy.unbounded).toBe(true);
    const fine = await evaluate({ from: "ship", to: "tool" }, early);
    expect(fine.answer.value).toBeGreaterThan(3000);
  });

  it("offers the longest path (the ship and the lunar site) and Orion behind the Moon, which the answer then says", async () => {
    const e = of("dish", "orion");
    const [longest, behind] = e.presets!;
    expect(longest).toMatchObject({
      id: "longest-path",
      knobs: { from: "ship", to: "lunar-site" },
      utcMs: Date.parse(SPEC.checked.epochUtc),
    });
    expect(behind).toMatchObject({
      id: "behind-moon",
      icon: "moon",
      knobs: { from: "dish", to: "orion" },
    });
    const at = await evaluate(
      behind!.knobs!,
      Instant.fromUtc(behind!.utcMs!, leap).tdb(),
    );
    expect(at.answer.sky?.text).toMatch(/the Moon is in the way/);
    // The dish's behind-the-Moon windows mark the timeline for this pair.
    expect(
      at.windows!.some(
        (w) => w.startUtc <= behind!.utcMs! && behind!.utcMs! <= w.endUtc,
      ),
    ).toBe(true);
    expect(of("ship", "tool").windows).toEqual([]);
  }, 120_000);
});
