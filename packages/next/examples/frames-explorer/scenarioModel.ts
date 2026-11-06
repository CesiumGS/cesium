// The scenario's part of the panel's model (the Scenarios tab): its
// knobs and checked setup, whether its answer is current, following the
// clock or updating, its proof rows, the published value it's checked
// against, the answer's path and route through the tree. Pure: the host's
// state and the page's results in, the view out (unit-tested in
// test/framesExplorerScenarioModel.test.ts).
import { extrasOf } from "./panelModel.ts";
import type {
  ClockView,
  ResultExtras,
  ScenarioPanelView,
} from "./panel/model.ts";
import { routeSteps } from "./panel/routeSteps.ts";
import type { ScenarioHostState } from "./scenarioHost.ts";
import type { ScenarioAnswer } from "./scenarios/evaluate.ts";
import { proofRows, type ProofRow } from "./scenarios/proof.ts";
import { READY, SCENES } from "./scenarios/scenes.ts";
import { checkedState } from "./scenarios/spec.ts";
import { SCENARIOS } from "./scenarios/specs.ts";
import type { StressResult } from "./tests.ts";
import { branchPath, type TreeNode } from "./tree.ts";

export type Freshness = ScenarioPanelView["freshness"];

/**
 * Whether the answer is the current setup's. Only the time moved while the
 * clock plays: one steady state that follows it ("following"), rather than
 * rows flipping to loading every evaluation.
 */
export function scenarioFreshness(
  st: Pick<ScenarioHostState, "stale" | "staleBy">,
  playing: boolean,
): Freshness {
  const following =
    st.stale && playing && st.staleBy.every((c) => c === "time");
  return !st.stale ? "current" : following ? "following" : "updating";
}

/**
 * The headline's published counterpart: off the checked setup, the
 * reference with the delta the knobs make; at it, our value against it
 * once the catalog's check is in and current, loading until then.
 */
export function publishedView(
  pub: ScenarioAnswer["published"],
  catalog: ReadonlyMap<string, StressResult>,
  atChecked: boolean,
  freshness: Freshness,
  proof: readonly ProofRow[],
): Pick<ScenarioPanelView, "published"> {
  if (!pub) {
    return {};
  }
  const base = {
    printed: pub.printed,
    document: pub.document,
    ...(pub.url !== undefined && { url: pub.url }),
    tolerance: pub.tolerance,
    unit: pub.unit,
  };
  const r = catalog.get(pub.proofId);
  if (!atChecked) {
    const ref = proof.find(
      (row) => row.kind === "reference-only" && row.id === pub.proofId,
    );
    return {
      published: {
        ...base,
        state: "off" as const,
        ...(freshness === "current" &&
          ref?.kind === "reference-only" &&
          ref.delta && { delta: ref.delta }),
      },
    };
  }
  if (!r || freshness !== "current") {
    return { published: { ...base, state: "loading" as const } };
  }
  return {
    published: {
      ...base,
      state: "checked" as const,
      ...(r.effect && { ours: r.effect.value }),
      ...(r.value !== undefined && {
        difference: {
          value: r.value,
          ...(r.unit !== undefined && { unit: r.unit }),
        },
      }),
      pass: r.pass,
    },
  };
}

export interface ScenarioViewInput {
  st: ScenarioHostState;
  /** The catalog's results (the proof's checks). */
  results: readonly StressResult[];
  tree: TreeNode | undefined;
  playing: boolean;
  rate: number;
  /** The Earth orientation's state at the clock's instant, once frame data is in. */
  eop?: ClockView["eop"];
  /** The scene's note, while its scene is on the globe. */
  sceneNote?: string;
  scrub(text: string): string;
}

export function scenarioView(input: ScenarioViewInput): ScenarioPanelView {
  const { st, tree, playing } = input;
  const spec = st.spec;
  const catalog = new Map(input.results.map((r) => [r.id, r]));
  const e = st.evaluation;
  const freshness = scenarioFreshness(st, playing);
  let proof: ProofRow[];
  if (e && st.evaluatedAt) {
    // The rows of the setup it was made at; `freshness` says whether
    // that is the current one (the panel withholds stale verdicts).
    const at = checkedState(
      spec,
      st.evaluatedAt.knobs,
      st.evaluatedAt.epochUtcMs,
    ).atChecked;
    proof = proofRows(spec, at, catalog, e);
  } else if (st.atChecked) {
    proof = proofRows(spec, true, catalog, {
      scenario: spec.id,
      added: [],
      answer: { label: "", headline: "", accuracy: { note: "" } },
      overlays: [],
      live: [],
    });
  } else {
    // Re-running: nothing is claimed until the live checks are in (R9).
    proof = spec.proof.map((id) => ({
      kind: "pending" as const,
      id,
      title: catalog.get(id)?.title ?? id,
    }));
  }
  const liveExtras: Record<string, ResultExtras> = {};
  for (const r of e?.live ?? []) {
    // A live re-run is compared with itself by another route, not with
    // its catalog group's reference: the group's words don't apply.
    const rest = extrasOf(r);
    delete rest.compared;
    liveExtras[r.id] = rest;
  }
  let path: ScenarioPanelView["path"];
  if (tree && e?.answer.path) {
    try {
      const b = branchPath(tree, e.answer.path.from, e.answer.path.to);
      path = {
        up: b.up.map((n) => n.id),
        ancestor: b.ancestor.id,
        down: b.down.map((n) => n.id),
      };
    } catch {
      // A node the tree hasn't yet (its evaluation is still on its way).
    }
  }
  return {
    id: spec.id,
    title: spec.title,
    question: spec.question,
    strip: READY.map((id) => {
      const s = SCENARIOS.find((x) => x.id === id)!;
      return { id, title: s.title, question: s.question };
    }),
    knobs: spec.knobs,
    values: st.knobs,
    checked: spec.checked.knobs,
    epochUtc: new Date(st.epochUtcMs).toISOString(),
    checkedEpochUtc: new Date(Date.parse(spec.checked.epochUtc)).toISOString(),
    atChecked: st.atChecked,
    changed: st.changed,
    status: st.status,
    freshness,
    ...(st.queued !== undefined && { queued: st.queued }),
    ...(st.problem !== undefined && {
      problem: { ...st.problem, message: input.scrub(st.problem.message) },
    }),
    ...(e && { answer: e.answer }),
    ...publishedView(
      e?.answer.published,
      catalog,
      st.atChecked,
      freshness,
      proof,
    ),
    ...(path && { path }),
    proof,
    liveExtras,
    ...(input.sceneNote !== undefined && { note: input.sceneNote }),
    focus: SCENES[spec.id]?.focus ?? [],
    ...(() => {
      const c = SCENES[spec.id]?.treeControl;
      const knob = c && spec.knobs.find((k) => k.id === c.knob);
      return knob?.options
        ? {
            treeControl: {
              knob: knob.id,
              verb: c!.verb,
              options: knob.options,
            },
          }
        : {};
    })(),
    ...(SCENES[spec.id]?.diagramNote !== undefined && {
      diagramNote: SCENES[spec.id]!.diagramNote!,
    }),
    ...(e?.data && {
      data: {
        label: e.data.label,
        frame: e.data.frame,
        source: e.data.source,
      },
    }),
    ...(() => {
      // The route spelled out: from the data (or the answer's start)
      // through each lit edge to the drawn-in frame (or its end).
      const sc = SCENES[spec.id];
      const p = e?.answer.path;
      if (!tree || !path || !p) {
        return {};
      }
      const start = e.data
        ? {
            title: `${e.data.label}, as delivered`,
            does: `position and velocity, expressed in ${e.data.frame} (${e.data.source})`,
            accuracy: e.data.accuracy,
          }
        : (sc?.routeEnds?.start ?? { title: p.from, does: "" });
      const end = e.data
        ? {
            title: `Drawn in ${p.to}`,
            does: sc?.drawnView?.[p.to] ?? "",
          }
        : (sc?.routeEnds?.end ?? { title: p.to, does: "" });
      return { route: routeSteps(tree, path, start, end) };
    })(),
    playing,
    rate: input.rate,
    ...(input.eop && { eop: input.eop }),
  };
}
