// The panel parts with hand-written comparators (Task 4d review): each
// renders again only when a field on its compared list changes, so a field
// it reads that isn't on the list would leave it stale. Knobs, the answer
// and a proof row are rendered here (react-dom/server, in Node) with their
// `scenario` (or row text) behind a Proxy that records every field read;
// the reads must be a subset of the list. The diagram's pill comparator
// and its shape key are checked directly.
import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { Root } from "@stratakit/mui";
import { describe, expect, it } from "vitest";
import {
  KNOBS_READS,
  Knobs,
} from "../examples/frames-explorer/panel/Knobs.tsx";
import type { ScenarioPanelView } from "../examples/frames-explorer/panel/model.ts";
import { ProofItem } from "../examples/frames-explorer/panel/Proof.tsx";
import { proofRowText } from "../examples/frames-explorer/panel/proofText.ts";
import {
  ANSWER_READS,
  ScenarioAnswer,
} from "../examples/frames-explorer/panel/ScenarioAnswer.tsx";
import {
  sameNodeProps,
  shapeKey,
  type NodeProps,
} from "../examples/frames-explorer/panel/TreeDiagram.tsx";
import type { ScenarioHostState } from "../examples/frames-explorer/scenarioHost.ts";
import { scenarioView } from "../examples/frames-explorer/scenarioModel.ts";
import type { ScenarioEvaluation } from "../examples/frames-explorer/scenarios/evaluate.ts";
import { SCENARIOS } from "../examples/frames-explorer/scenarios/specs.ts";
import { buildTree, type TreeNode } from "../examples/frames-explorer/tree.ts";
import { createFrames } from "../src/frames/frames.ts";
import { Instant } from "../src/time/Instant.ts";
import { syntheticFrameData } from "./syntheticFrames.ts";

/** `obj` behind a Proxy that records the names of the fields read from it. */
function recording<T extends object>(obj: T): { proxy: T; reads: Set<string> } {
  const reads = new Set<string>();
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      if (typeof key === "string") {
        reads.add(key);
      }
      return Reflect.get(target, key, receiver) as unknown;
    },
    has(target, key) {
      if (typeof key === "string") {
        reads.add(key);
      }
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      // A spread or Object.keys reads every field.
      reads.add("(every field)");
      return Reflect.ownKeys(target);
    },
  });
  return { proxy, reads };
}

const frames = createFrames(syntheticFrameData());
const instant = Instant.fromTdb(0);
const tree = buildTree(frames, {}, instant);
const spec = SCENARIOS.find((s) => s.id === "one-path")!;

const result = {
  id: "trajectory.moon-me.distance",
  group: "trajectory",
  title: "Orion two routes",
  pass: true,
  value: 1e-6,
  unit: "m",
  accuracy: { meters: 0.01, note: "test", terms: [] },
} as unknown as ScenarioEvaluation["live"][number];

const evaluation: ScenarioEvaluation = {
  scenario: "one-path",
  added: [],
  answer: {
    label: "relative to the Moon (MOON_ME)",
    aside: "0.4 km/s in GCRF",
    headline: "Orion moves at 1.06 km/s relative to the Moon.",
    value: 1.06,
    unit: "km/s",
    accuracy: { meters: 12, note: "the OEM's covariance" },
    path: { from: "MOON_ME", to: "GCRF" },
    method: [{ title: "Read", text: "the OEM" }],
  },
  data: {
    label: "Orion",
    frame: "MOON_ME",
    source: "OEM",
    accuracy: { meters: 5, note: "the OEM's covariance" },
  },
  overlays: [],
  live: [result],
} as unknown as ScenarioEvaluation;

function view(over: Partial<ScenarioHostState> = {}): ScenarioPanelView {
  const st: ScenarioHostState = {
    spec,
    knobs: { ...spec.checked.knobs, frame: "ITRF" },
    epochUtcMs: Date.parse(spec.checked.epochUtc) + 3_600_000,
    atChecked: false,
    changed: ["frame", "time"],
    status: "ready",
    evaluation,
    evaluatedAt: {
      knobs: { ...spec.checked.knobs, frame: "ITRF" },
      epochUtcMs: Date.parse(spec.checked.epochUtc),
    },
    stale: true,
    staleBy: ["time"],
    generation: 3,
    ...over,
  };
  return scenarioView({
    st,
    results: [result],
    tree,
    playing: true,
    rate: 3600,
    eop: { kind: "predicted", ageDays: 3.2 },
    sceneNote: "The scene's note.",
    scrub: (t) => t,
  });
}

/** Scenario views over the parts' branches: following, updating, loading, an error, at the checked setup. */
const views = (): ScenarioPanelView[] => [
  view(),
  view({ staleBy: ["frame"] }),
  view({ evaluation: undefined, evaluatedAt: undefined, status: "loading" }),
  view({
    status: "error",
    problem: { message: "no data", missing: true },
  }),
  view({
    atChecked: true,
    changed: [],
    stale: false,
    staleBy: [],
    knobs: spec.checked.knobs,
  }),
];

const noop = () => {};

/** Renders `el` under StrataKit's Root, as Dyno does. */
const render = (el: ReactElement) =>
  renderToString(createElement(Root, { colorScheme: "dark" }, el));

/** Renders `make(proxy)` for each value and returns every field read. */
function readsOf<T extends object>(
  values: readonly T[],
  make: (proxy: T) => ReactElement,
): Set<string> {
  const all = new Set<string>();
  for (const v of values) {
    const { proxy, reads } = recording(v);
    render(make(proxy));
    reads.forEach((r) => all.add(r));
  }
  return all;
}

const outside = (reads: Set<string>, list: readonly string[]) =>
  [...reads].filter((r) => !list.includes(r));

describe("what each memoized part reads is on its compared list (Task 4d)", () => {
  it("Knobs", () => {
    const reads = readsOf(views(), (s) =>
      createElement(Knobs, { scenario: s, onKnob: noop, onBack: noop }),
    );
    expect(reads.size).toBeGreaterThan(3);
    expect(outside(reads, KNOBS_READS)).toEqual([]);
  });

  it("ScenarioAnswer", () => {
    const reads = readsOf(views(), (s) =>
      createElement(ScenarioAnswer, { scenario: s }),
    );
    expect(reads.size).toBeGreaterThan(3);
    expect(outside(reads, ANSWER_READS)).toEqual([]);
  });

  it("a collapsed proof row reads only its head's text", () => {
    const s = view();
    for (const row of s.proof) {
      const t = proofRowText(row, s.liveExtras, s.freshness, undefined);
      const rec = recording(t);
      const rowRec = recording(row);
      render(
        createElement(ProofItem, {
          row: rowRec.proxy,
          t: rec.proxy,
          expanded: false,
          region: "r",
          onToggle: noop,
          extras: undefined,
          freshness: s.freshness,
          atChecked: s.atChecked,
          onOpenResult: noop,
          onBack: noop,
        }),
      );
      expect(
        outside(rec.reads, [
          "key",
          "tone",
          "title",
          "verdict",
          "status",
          "summary",
        ]),
      ).toEqual([]);
      expect([...rowRec.reads]).toEqual([]);
    }
  });

  it("a diagram pill's comparator sees a change in every prop", () => {
    const h = {} as NodeProps["h"];
    const base: NodeProps = {
      id: "ITRF",
      label: "ITRF",
      className: "fx-node",
      style: {
        transform: "translate(1px, 2px)",
        inlineSize: 80,
        from: "x",
        i: 0,
      },
      tabbable: true,
      pressed: false,
      ariaLabel: "ITRF, Earth. Edge from GCRF → ITRF: rotation, 1 nrad",
      tag: undefined,
      h,
    };
    expect(sameNodeProps(base, { ...base, style: { ...base.style } })).toBe(
      true,
    );
    const changed: Record<keyof NodeProps, unknown> = {
      id: "GCRF",
      label: "GCRF",
      className: "fx-node fx-lit",
      style: { ...base.style, i: 2 },
      tabbable: false,
      pressed: true,
      ariaLabel: "ITRF, Earth. Edge from GCRF → ITRF: rotation, 2 nrad",
      tag: "Drawing in",
      h: {} as NodeProps["h"],
    };
    for (const k of Object.keys(changed) as (keyof NodeProps)[]) {
      expect(sameNodeProps(base, { ...base, [k]: changed[k] }), k).toBe(false);
    }
    for (const k of Object.keys(base.style) as (keyof NodeProps["style"])[]) {
      const style = {
        ...base.style,
        [k]: k === "inlineSize" || k === "i" ? 99 : "y",
      };
      expect(sameNodeProps(base, { ...base, style }), `style.${k}`).toBe(false);
    }
  });

  /** The tree's nodes and edges copied; the frames they stand for shared. */
  const copy = (n: TreeNode): TreeNode => ({
    ...n,
    edge: { ...n.edge },
    children: n.children.map(copy),
  });

  it("the diagram's shape key moves with its frames, not with their values", () => {
    const drift = copy(tree);
    drift.children[0]!.edge.accuracy = { meters: 123, note: "drifted" };
    expect(shapeKey(drift, false)).toBe(shapeKey(tree, false));
    // The Expand dialog's slots are as wide as each edge's label.
    expect(shapeKey(drift, true)).not.toBe(shapeKey(tree, true));
    const renamed = copy(tree);
    renamed.children[0]!.label = "Renamed";
    expect(shapeKey(renamed, false)).not.toBe(shapeKey(tree, false));
    const pruned = copy(tree);
    pruned.children.pop();
    expect(shapeKey(pruned, false)).not.toBe(shapeKey(tree, false));
  });
});
