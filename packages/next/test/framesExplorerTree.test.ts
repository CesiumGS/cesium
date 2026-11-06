// The frames explorer's tree model (examples/frames-explorer/tree.ts) over
// synthetic frames, a hand-made engineering frame and a small OEM trajectory.
// The real frames store is exercised by the page and by Task 1's data test.
import { describe, expect, it } from "vitest";
import {
  buildTree,
  pathToRoot,
  type TreeNode,
} from "../examples/frames-explorer/tree.ts";
import { Frame } from "../src/frames/Frame.ts";
import { createFrames } from "../src/frames/frames.ts";
import { EARTH, MOON } from "../src/scene/Body.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import type { EarthOrientationParameters, EopSample } from "../src/time/eop.ts";
import { Trajectory } from "../src/trajectory/Trajectory.ts";
import { parseOem } from "../src/trajectory/oem.ts";
import type { EngineeringFrame } from "../src/engineering/EngineeringFrame.ts";
import { EARTH_ROTATION_RATE } from "../src/measure/constants.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

const leap = LeapSeconds.builtIn();
const ARCSEC = Math.PI / (180 * 3600);
const DAY_MS = 86_400_000;
const instant = Instant.fromTdb(0);
const utcMs = instant.toUtc(leap);

function framesWith(sample: EopSample = SAMPLE, ageDays = 0) {
  const data = syntheticFrameData(sample);
  data.eop = {
    atInstant: () => sample,
    first: Date.UTC(2000, 0, 1),
    last: Date.UTC(2030, 0, 1),
    lastObserved: utcMs - ageDays * DAY_MS,
  } as unknown as EarthOrientationParameters;
  return createFrames(data);
}

const frames = framesWith();

/** An engineering frame with the fields the tree reads; PROJ itself is not needed. */
function engineering(
  name: string,
  operation: {
    pipeline?: string;
    accuracy?: number;
    grids?: string[];
    ballpark?: boolean;
  },
  body = EARTH,
): EngineeringFrame {
  return {
    definition: { name, body },
    body,
    operation: {
      pipeline: operation.pipeline ?? "+proj=pipeline +step +proj=noop",
      accuracy: operation.accuracy,
      grids: operation.grids ?? [],
      ballpark: operation.ballpark ?? false,
    },
  } as unknown as EngineeringFrame;
}

function orion(positionSigma?: number) {
  const stamp = (s: number): string =>
    new Date(Date.UTC(2000, 0, 1, 12) + s * 1000).toISOString();
  const rows = Array.from(
    { length: 11 },
    (_, i) => `${stamp(i * 60)} 400000 0 0 0 0 0`,
  );
  const text = [
    "CCSDS_OEM_VERS = 2.0",
    "CREATION_DATE = 2026-04-01T00:00:00",
    "ORIGINATOR = TEST",
    "META_START",
    "OBJECT_NAME = ORION",
    "OBJECT_ID = 2026-001A",
    "CENTER_NAME = EARTH",
    "REF_FRAME = ICRF",
    "TIME_SYSTEM = TDB",
    `START_TIME = ${stamp(0)}`,
    `STOP_TIME = ${stamp(600)}`,
    "INTERPOLATION = LAGRANGE",
    "INTERPOLATION_DEGREE = 1",
    "META_STOP",
    ...rows,
    "",
  ].join("\n");
  return Trajectory.fromOem(parseOem(text, leap), frames, {
    name: "Orion",
    accuracy: "precise",
    ...(positionSigma === undefined ? {} : { positionSigma }),
  });
}

function find(tree: TreeNode, id: string): TreeNode | undefined {
  if (tree.id === id) {
    return tree;
  }
  for (const child of tree.children) {
    const hit = find(child, id);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function walk(tree: TreeNode, visit: (n: TreeNode) => void): void {
  visit(tree);
  tree.children.forEach((c) => walk(c, visit));
}

const parentOf = (tree: TreeNode, id: string): string | undefined =>
  pathToRoot(tree, id)[1]?.id;

describe("buildTree: the built-in frames", () => {
  const tree = buildTree(frames);

  it("is rooted at ICRF", () => {
    expect(tree.id).toBe("ICRF");
    expect(tree.edge.kind).toBe("root");
    expect(tree.frame).toBe(frames.icrf);
  });

  it("gives GCRF the IERS affine edge and EARTH_ICRF a translation", () => {
    expect(find(tree, "GCRF")!.edge.kind).toBe("iers-affine");
    expect(find(tree, "EARTH_ICRF")!.edge.kind).toBe("translation");
  });

  it("puts EME2000 under EARTH_ICRF, ITRF under GCRF and MOON_PA under MOON_ME", () => {
    expect(parentOf(tree, "EME2000")).toBe("EARTH_ICRF");
    expect(find(tree, "EME2000")!.edge.kind).toBe("constant");
    expect(parentOf(tree, "ITRF")).toBe("GCRF");
    expect(find(tree, "ITRF")!.edge.kind).toBe("rotation");
    expect(parentOf(tree, "MOON_PA")).toBe("MOON_ME");
    expect(find(tree, "MOON_PA")!.edge.kind).toBe("constant");
  });

  it("names the source of each edge", () => {
    expect(find(tree, "EARTH_ICRF")!.edge.detail).toBe(
      "ephemeris: earth (DE440)",
    );
    expect(find(tree, "ITRF")!.edge.detail).toMatch(/IAU 2006\/2000A \+ EOP/);
    expect(find(tree, "EME2000")!.edge.detail).toMatch(
      /frame bias \(IAU 2006\)/,
    );
    expect(find(tree, "GCRF")!.edge.detail).toMatch(/11\.19/);
  });

  it("has every built-in frame exactly once, with its Frame", () => {
    const seen: string[] = [];
    walk(tree, (n) => seen.push(n.id));
    const builtIn = [
      frames.icrf,
      frames.hcrs,
      frames.gcrf,
      frames.earthIcrf,
      frames.eme2000,
      frames.moonIcrf,
      frames.itrf,
      frames.moonMe,
      frames.moonPa,
    ];
    expect([...seen].sort()).toEqual(builtIn.map((f) => f.name).sort());
    for (const f of builtIn) {
      expect(find(tree, f.name)!.frame).toBe(f);
    }
  });

  it("follows each frame's real parent link", () => {
    walk(tree, (n) => {
      if (n.frame?.parent) {
        expect(parentOf(tree, n.id)).toBe(n.frame.parent.name);
      }
    });
  });
});

describe("buildTree: engineering frames, trajectories and local frames", () => {
  it("hangs an engineering frame under its body's fixed frame with a proj-operation edge naming its grids", () => {
    const design = engineering("Design", {
      pipeline:
        "+proj=pipeline +step +proj=hgridshift +grids=us_noaa_conus.tif",
      accuracy: 2,
      grids: ["us_noaa_conus.tif"],
    });
    const moonDesign = engineering("Artemis site", { ballpark: true }, MOON);
    const tree = buildTree(frames, { engineering: [design, moonDesign] });
    const node = find(tree, "engineering:Design")!;
    expect(parentOf(tree, node.id)).toBe("ITRF");
    expect(node.engineering).toBe(design);
    expect(node.edge.kind).toBe("proj-operation");
    expect(node.edge.detail).toContain("us_noaa_conus.tif");
    expect(node.edge.detail).toContain("+proj=hgridshift");
    expect(node.edge.accuracy.meters).toBe(2);
    expect(parentOf(tree, "engineering:Artemis site")).toBe("MOON_ME");
  });

  it("states an engineering frame's accuracy as ballpark or unknown, never a number", () => {
    const tree = buildTree(frames, {
      engineering: [
        engineering("Ballpark", { ballpark: true, accuracy: 1 }),
        engineering("Unknown", {}),
      ],
    });
    for (const [id, word] of [
      ["engineering:Ballpark", "ballpark"],
      ["engineering:Unknown", "unknown"],
    ] as const) {
      const node = find(tree, id)!;
      expect(node.edge.accuracy.meters).toBeUndefined();
      expect(node.edge.accuracy.note).toContain(word);
      expect(node.edge.detail).toContain(word);
    }
  });

  it("hangs a trajectory under its reference", () => {
    const traj = orion();
    const tree = buildTree(frames, { trajectories: [traj] });
    const node = find(tree, "Orion")!;
    expect(parentOf(tree, "Orion")).toBe(traj.reference.name);
    expect(node.trajectory).toBe(traj);
    expect(node.frame).toBe(traj.frame);
    expect(node.edge.kind).toBe("trajectory");
  });

  it("hangs a local frame under its parent, even under another local frame", () => {
    const a = Frame.constant(
      "LOCAL_A",
      frames.itrf,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1],
    );
    const b = Frame.constant(
      "LOCAL_B",
      a,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 5, 0, 1],
    );
    const tree = buildTree(frames, { local: [b, a] });
    expect(parentOf(tree, "LOCAL_A")).toBe("ITRF");
    expect(parentOf(tree, "LOCAL_B")).toBe("LOCAL_A");
    expect(find(tree, "LOCAL_B")!.edge.kind).toBe("constant");
  });

  it("rejects a frame whose parent is not in the tree, naming it", () => {
    const stray = Frame.constant(
      "STRAY",
      Frame.root("NOWHERE"),
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    );
    expect(() => buildTree(frames, { local: [stray] })).toThrow(
      /STRAY.*NOWHERE/,
    );
  });

  it("rejects two nodes with one id", () => {
    const twin = Frame.constant(
      "ITRF",
      frames.gcrf,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    );
    expect(() => buildTree(frames, { local: [twin] })).toThrow(/ITRF/);
  });
});

describe("pathToRoot", () => {
  it("runs MOON_PA, MOON_ME, MOON_ICRF, ICRF", () => {
    const tree = buildTree(frames);
    expect(pathToRoot(tree, "MOON_PA").map((n) => n.id)).toEqual([
      "MOON_PA",
      "MOON_ME",
      "MOON_ICRF",
      "ICRF",
    ]);
    expect(pathToRoot(tree, "ICRF").map((n) => n.id)).toEqual(["ICRF"]);
  });

  it("throws, naming the id, for one that is not in the tree", () => {
    expect(() => pathToRoot(buildTree(frames), "NOPE")).toThrow(/NOPE/);
  });
});

describe("edge accuracy (R8)", () => {
  const instants = [undefined, instant, instant.tdb()] as const;

  it("every node of a full tree has a defined accuracy, a note, and no 0 or NaN", () => {
    const traj = orion(5);
    for (const at of instants) {
      const tree = buildTree(
        frames,
        {
          engineering: [
            engineering("A", { accuracy: 2, grids: ["g.tif"] }),
            engineering("B", { ballpark: true }),
            engineering("C", {}),
          ],
          trajectories: [traj],
          local: [
            Frame.constant(
              "LOCAL",
              frames.itrf,
              [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            ),
          ],
        },
        ...(at === undefined ? [] : [at]),
      );
      let count = 0;
      walk(tree, (n) => {
        count++;
        const { accuracy } = n.edge;
        expect(accuracy, n.id).toBeDefined();
        expect(accuracy.note.length, `${n.id} note`).toBeGreaterThan(0);
        for (const v of [accuracy.meters, accuracy.radians]) {
          if (v !== undefined) {
            expect(Number.isFinite(v), `${n.id} finite`).toBe(true);
            expect(v, `${n.id} positive`).toBeGreaterThan(0);
          }
        }
        // Undefined means unknown, and the note says why.
        if (accuracy.meters === undefined && accuracy.radians === undefined) {
          expect(accuracy.note, n.id).toMatch(/not|unknown|ballpark|defines/i);
        }
      });
      expect(count).toBe(9 + 3 + 1 + 1);
    }
  });

  it("states the library's model accuracies", () => {
    const tree = buildTree(frames);
    expect(find(tree, "EARTH_ICRF")!.edge.accuracy.meters).toBe(0.01);
    expect(find(tree, "MOON_ICRF")!.edge.accuracy.meters).toBe(0.01);
    expect(find(tree, "HCRS")!.edge.accuracy.meters).toBe(0.01);
    expect(find(tree, "GCRF")!.edge.accuracy.meters).toBe(0.01);
    expect(find(tree, "EME2000")!.edge.accuracy.radians).toBe(1e-15);
  });

  it("does not claim an accuracy for the ICRF root", () => {
    const { accuracy } = buildTree(frames).edge;
    expect(accuracy.meters).toBeUndefined();
    expect(accuracy.radians).toBeUndefined();
  });

  it("gives GCRF to ITRF the measured Earth-orientation sigma at the instant", () => {
    const sigma = Math.hypot(35e-6 * EARTH_ROTATION_RATE, 1e-4 * ARCSEC);
    for (const at of [instant, instant.tdb()]) {
      const edge = find(buildTree(frames, {}, at), "ITRF")!.edge;
      expect(edge.accuracy.radians).toBeCloseTo(sigma, 15);
      expect(edge.accuracy.note).toMatch(/measured/);
    }
  });

  it("grows the Earth-orientation sigma with a predicted sample's age", () => {
    const predicted = { ...SAMPLE, predicted: true };
    const at = (days: number) =>
      find(buildTree(framesWith(predicted, days), {}, instant), "ITRF")!.edge
        .accuracy;
    const young = at(1);
    const old = at(100);
    const days = 100;
    expect(old.radians).toBeCloseTo(
      Math.hypot(
        0.00025 * days ** 0.75 * EARTH_ROTATION_RATE,
        0.00068 * days ** 0.8 * ARCSEC,
      ),
      12,
    );
    expect(old.radians!).toBeGreaterThan(young.radians!);
    expect(old.note).toMatch(/predicted.*100\.0 days.*Bulletin A/);
  });

  it("says the Earth orientation is not known where the EOP table has none", () => {
    const edge = find(
      buildTree(framesWith({ ...SAMPLE, degraded: true }), {}, instant),
      "ITRF",
    )!.edge;
    expect(edge.accuracy.radians).toBeUndefined();
    expect(edge.accuracy.note).toMatch(/outside the EOP table/);
  });

  it("says the ITRF accuracy depends on time when no instant is given", () => {
    const edge = find(buildTree(frames), "ITRF")!.edge;
    expect(edge.accuracy.radians).toBeUndefined();
    expect(edge.accuracy.note).toMatch(/instant/);
  });

  it("gives a trajectory its positionSigma at the instant, and undefined outside its data", () => {
    const traj = orion(5);
    const inside = find(
      buildTree(frames, { trajectories: [traj] }, instant),
      "Orion",
    )!.edge.accuracy;
    expect(inside.meters).toBe(5);
    const outside = find(
      buildTree(frames, { trajectories: [traj] }, Instant.fromTdb(1e7)),
      "Orion",
    )!.edge.accuracy;
    expect(outside.meters).toBeUndefined();
    expect(outside.note).toMatch(/not known/);
    const none = find(
      buildTree(frames, { trajectories: [orion()] }, instant),
      "Orion",
    )!.edge.accuracy;
    expect(none.meters).toBeUndefined();
  });
});

describe("plain data", () => {
  it("is structured-clone-safe once the frame, engineering and trajectory references are removed", () => {
    const tree = buildTree(
      frames,
      {
        engineering: [engineering("A", { accuracy: 2 })],
        trajectories: [orion(5)],
      },
      instant,
    );
    const strip = (n: TreeNode): unknown => {
      const { frame, engineering: e, trajectory, children, ...rest } = n;
      void frame;
      void e;
      void trajectory;
      return { ...rest, children: children.map(strip) };
    };
    const plain = strip(tree);
    expect(structuredClone(plain)).toEqual(plain);
    expect(JSON.parse(JSON.stringify(plain))).toEqual(plain);
  });
});
