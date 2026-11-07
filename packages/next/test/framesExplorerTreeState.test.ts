// The frame tree at the clock's instant (examples/frames-explorer/
// treeState.ts), Task 4d: while the clock plays, the tree's shape stays
// and only the values that drift with time (the Earth-orientation sigma on
// the ITRF edge, the composed accuracy) are updated, in place: no rebuild,
// and every node whose value didn't change keeps its identity, so the
// diagram's unchanged pills and edges don't render again.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { composedAccuracy } from "../examples/frames-explorer/composed.ts";
import type { ScenarioEvaluation } from "../examples/frames-explorer/scenarios/evaluate.ts";
import * as treeModule from "../examples/frames-explorer/tree.ts";
import type {
  AddedFrameSpec,
  TreeNode,
} from "../examples/frames-explorer/tree.ts";
import { createTreeState } from "../examples/frames-explorer/treeState.ts";
import { createFrames } from "../src/frames/frames.ts";
import { Instant } from "../src/time/Instant.ts";
import type { EarthOrientationParameters, EopSample } from "../src/time/eop.ts";
import { SAMPLE, syntheticFrameData } from "./syntheticFrames.ts";

vi.mock("../examples/frames-explorer/tree.ts", async (importOriginal) => {
  const real = await importOriginal<typeof treeModule>();
  return {
    ...real,
    buildTree: vi.fn(real.buildTree),
    buildScenarioTree: vi.fn(real.buildScenarioTree),
  };
});

const DAY_MS = 86_400_000;
const start = Instant.fromTdb(0);

/** Frames whose EOP is measured, or predicted from `ageDays` before `start` on. */
function framesWith(predicted: boolean, ageDays = 0) {
  const sample: EopSample = { ...SAMPLE, predicted };
  const data = syntheticFrameData(sample);
  const utc = start.toUtc(data.leapSeconds);
  data.eop = {
    atInstant: () => sample,
    first: Date.UTC(2000, 0, 1),
    last: Date.UTC(2030, 0, 1),
    lastObserved: utc - ageDays * DAY_MS,
  } as unknown as EarthOrientationParameters;
  return createFrames(data);
}

const find = (n: TreeNode | undefined, id: string): TreeNode | undefined =>
  n === undefined
    ? undefined
    : n.id === id
      ? n
      : n.children.map((c) => find(c, id)).find((x) => x !== undefined);

const site = (meters: number): AddedFrameSpec => ({
  id: "SITE",
  label: "Site",
  parentId: "ITRF",
  edge: {
    kind: "constant",
    detail: "a site",
    accuracy: { meters, note: "the site's survey" },
  },
});

const evaluation = (added: AddedFrameSpec[]): ScenarioEvaluation =>
  ({
    scenario: "earth-turns",
    added,
    answer: { label: "", headline: "", accuracy: { note: "" } },
    overlays: [],
    live: [],
  }) as unknown as ScenarioEvaluation;

function setup(predicted: boolean) {
  const frames = framesWith(predicted, 3);
  let instant = start;
  let e: ScenarioEvaluation | undefined = evaluation([site(0.02)]);
  const invalidate = vi.fn();
  const state = createTreeState({
    core: {
      frames: () => frames,
      instantNow: () => instant,
      invalidate,
    },
    local: () => [],
    evaluation: () => e,
    orion: () => undefined,
    updateKnown: () => {},
  });
  return {
    frames,
    state,
    invalidate,
    /** The clock plays on by `seconds`. */
    play(seconds: number) {
      instant = Instant.fromTdb(instant.tdb() + seconds);
    },
    instant: () => instant,
    setEvaluation(next: ScenarioEvaluation | undefined) {
      e = next;
    },
  };
}

const builds = () =>
  vi.mocked(treeModule.buildTree).mock.calls.length +
  vi.mocked(treeModule.buildScenarioTree).mock.calls.length;

beforeEach(() => {
  vi.mocked(treeModule.buildTree).mockClear();
  vi.mocked(treeModule.buildScenarioTree).mockClear();
});

describe("the tree while the clock plays (Task 4d)", () => {
  it("isn't rebuilt: a measured EOP keeps every node, and the composed accuracy is the instant's", () => {
    const s = setup(false);
    s.state.rebuild();
    const tree = s.state.tree();
    const built = builds();
    for (let i = 0; i < 100; i++) {
      // A minute of clock time a frame, as at the tour's 3,600×.
      s.play(60);
      s.state.refresh();
    }
    expect(builds()).toBe(built);
    expect(s.state.tree()).toBe(tree);
    // The composed accuracy is current (R8): a fresh composition's.
    expect(s.state.composed()).toEqual(
      composedAccuracy(tree!, s.frames, s.instant()),
    );
    // Nothing changed since: the panel isn't asked to render again.
    const composed = s.state.composed();
    s.invalidate.mockClear();
    s.state.refresh();
    s.state.orionChanged();
    expect(s.state.composed()).toBe(composed);
    expect(s.invalidate).not.toHaveBeenCalled();
  });

  it("updates a drifting Earth-orientation sigma in place: only the ITRF edge's node and its ancestors are new", () => {
    const s = setup(true);
    s.state.rebuild();
    const before = s.state.tree()!;
    const built = builds();
    s.play(10 * 86_400);
    s.state.refresh();
    expect(builds()).toBe(built);
    const after = s.state.tree()!;
    // The ITRF edge states the sigma at the new instant, as a fresh build does.
    const fresh = treeModule.buildTree(s.frames, {}, s.instant());
    expect(find(after, "ITRF")!.edge.accuracy).toEqual(
      find(fresh, "ITRF")!.edge.accuracy,
    );
    expect(find(after, "ITRF")!.edge.accuracy).not.toEqual(
      find(before, "ITRF")!.edge.accuracy,
    );
    // Its ancestors are new objects (the path to the root); every other
    // node, and the added site below ITRF, keeps its identity.
    expect(after).not.toBe(before);
    for (const id of ["HCRS", "MOON_ICRF", "MOON_ME", "MOON_PA", "EME2000"]) {
      expect(find(after, id), id).toBe(find(before, id));
    }
    expect(find(after, "SITE")).toBe(find(before, "SITE"));
    // The composed accuracy is the new instant's.
    expect(s.state.composed()).toEqual(
      composedAccuracy(after, s.frames, s.instant()),
    );
    expect(s.invalidate).toHaveBeenCalled();
  });

  it("takes a re-evaluation with the same frames as new values, and rebuilds only when the frames change", () => {
    const s = setup(false);
    s.state.rebuild();
    const before = s.state.tree()!;
    const built = builds();
    // The same site, a new evaluation object (each reply is one).
    s.setEvaluation(evaluation([site(0.02)]));
    s.state.evaluationChanged();
    expect(builds()).toBe(built);
    expect(s.state.tree()).toBe(before);
    // Its accuracy moved: the site's node is new, the rest as it was.
    s.setEvaluation(evaluation([site(0.05)]));
    s.state.evaluationChanged();
    expect(builds()).toBe(built);
    expect(find(s.state.tree(), "SITE")!.edge.accuracy.meters).toBe(0.05);
    expect(find(s.state.tree(), "MOON_ME")).toBe(find(before, "MOON_ME"));
    // Another frame: the shape changed, so the tree is built again.
    s.setEvaluation(
      evaluation([
        site(0.05),
        { ...site(0.01), id: "MAST", label: "Mast", parentId: "SITE" },
      ]),
    );
    s.state.evaluationChanged();
    expect(builds()).toBeGreaterThan(built);
    expect(find(s.state.tree(), "MAST")?.added).toBe(true);
  });
});
