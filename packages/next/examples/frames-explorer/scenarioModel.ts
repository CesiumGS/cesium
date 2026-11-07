// The scenario's part of the panel's model (the Scenarios tab): its
// knobs and checked setup, whether its answer is current, following the
// clock or updating, its check rows, the published value it's checked
// against, the answer's path and route through the tree. Pure: the host's
// state and the page's results in, the view out (unit-tested in
// test/framesExplorerScenarioModel.test.ts).
import { extrasOf } from "./panelModel.ts";
import type {
  ClockView,
  ResultExtras,
  ScenarioPanelView,
  TerrainSightView,
} from "./panel/model.ts";
import { APP_CODE } from "./panel/appCode.ts";
import { routeSteps } from "./panel/routeSteps.ts";
import { withTerrain, withTerrainAnswer } from "./panel/answerText.ts";
import type { ScenarioHostState } from "./scenarioHost.ts";
import type {
  Moment,
  ScenarioAnswer,
  ScenarioEvaluation,
} from "./scenarios/evaluate.ts";
import {
  checkKind,
  checkRows,
  maskCheckRow,
  type CheckRow,
} from "./scenarios/checks.ts";
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
  checks: readonly CheckRow[],
  /** The answer's own value, ours where the check has no effect of its own (the dish's light time). */
  answerValue?: number,
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
  const r = catalog.get(pub.checkId);
  if (!atChecked) {
    const ref = checks.find(
      (row) => row.status === "reference-only" && row.id === pub.checkId,
    );
    return {
      published: {
        ...base,
        state: "off" as const,
        ...(freshness === "current" &&
          ref?.status === "reference-only" &&
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
      ...(r.effect
        ? {
            ours: r.effect.value,
            ...(r.value !== undefined && {
              difference: {
                value: r.value,
                ...(r.unit !== undefined && { unit: r.unit }),
              },
            }),
          }
        : answerValue !== undefined
          ? // No effect of its own (the dish's light time, checked at every
            // row of its fixture): ours against this row's published value,
            // at the checked setup's own instant, in the answer's unit
            // (Task 6c fix 1 follow-up), not the check's worst row.
            {
              ours: answerValue,
              difference: { value: answerValue - pub.value, unit: pub.unit },
            }
          : r.value !== undefined && {
              difference: {
                value: r.value,
                ...(r.unit !== undefined && { unit: r.unit }),
              },
            }),
      pass: r.pass,
    },
  };
}

/**
 * The traces of the evaluation's own sight lines (the capstone's, Task 8):
 * one made for another pair (its `traced` isn't its line's key) reads as
 * tracing, never as this pair's verdict; a line the evaluation no longer
 * has goes.
 */
export function ownTraces(
  terrain: readonly TerrainSightView[],
  e: Pick<ScenarioEvaluation, "sightLines">,
): TerrainSightView[] {
  const out: TerrainSightView[] = [];
  for (const v of terrain) {
    const line = e.sightLines?.find((l) => l.id === v.id);
    if (!line) {
      continue;
    }
    out.push(
      line.key === undefined || v.traced === line.key
        ? v
        : {
            id: v.id,
            state: "waiting",
            text: `${line.subject ?? `The local horizon toward ${line.label}`}: tracing on the terrain.`,
          },
    );
  }
  return out;
}

export interface ScenarioViewInput {
  st: ScenarioHostState;
  /** The catalog's results (the scenario's checks). */
  results: readonly StressResult[];
  tree: TreeNode | undefined;
  playing: boolean;
  rate: number;
  /** The Earth orientation's state at the clock's instant, once frame data is in. */
  eop?: ClockView["eop"];
  /** The scene's note, while its scene is on the globe. */
  sceneNote?: string;
  /** Its lines of sight over the terrain (sightLines.ts). */
  terrain?: ScenarioPanelView["terrain"];
  /** Moments the page found itself, after the evaluation's (the ship's buoy coming into view, Task 7). */
  pagePresets?: readonly Moment[];
  scrub(text: string): string;
}

export function scenarioView(input: ScenarioViewInput): ScenarioPanelView {
  const { st, tree, playing } = input;
  const spec = st.spec;
  const catalog = new Map(input.results.map((r) => [r.id, r]));
  const e = st.evaluation;
  const freshness = scenarioFreshness(st, playing);
  const terrain =
    input.terrain !== undefined && e?.pair
      ? ownTraces(input.terrain, e)
      : input.terrain;
  let checks: CheckRow[];
  if (e && st.evaluatedAt) {
    // The rows of the setup it was made at; `freshness` says whether
    // that is the current one (the panel withholds stale verdicts).
    const at = checkedState(
      spec,
      st.evaluatedAt.knobs,
      st.evaluatedAt.epochUtcMs,
    ).atChecked;
    checks = checkRows(spec, at, catalog, e);
  } else if (st.atChecked) {
    checks = checkRows(spec, true, catalog, {
      scenario: spec.id,
      added: [],
      answer: { label: "", headline: "", accuracy: { note: "" } },
      overlays: [],
      live: [],
    });
  } else {
    // Re-running: nothing is claimed until the live checks are in (R9).
    checks = spec.checks.map((id) => ({
      status: "pending" as const,
      kind: checkKind(spec, id),
      id,
      title: catalog.get(id)?.title ?? id,
    }));
  }
  // The dish's terrain against the DSN's mask (Task 6c fix 1): judged on
  // the page at any station, so on and off the checked setup alike.
  const mask = e?.maskCheck;
  if (mask) {
    checks = [
      ...checks,
      maskCheckRow(
        {
          label: mask.label,
          samples: mask.samples.length,
          source: mask.source,
        },
        input.terrain?.find((t) => t.id === "mask-check"),
      ),
    ];
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
    checkedBy: spec.checkedBy ?? "published references",
    ...(() => {
      // A scene's drawn-in frame, at the knobs (the dish's station).
      const d = SCENES[spec.id]?.drawIn;
      return d === undefined
        ? {}
        : { drawIn: typeof d === "function" ? d(st.knobs) : d };
    })(),
    strip: READY.map((id) => {
      const s = SCENARIOS.find((x) => x.id === id)!;
      return { id, title: s.title, question: s.question };
    }),
    knobs: spec.knobs,
    values: st.knobs,
    checked: spec.checked.knobs,
    checkedEpochUtc: new Date(Date.parse(spec.checked.epochUtc)).toISOString(),
    atChecked: st.atChecked,
    changed: st.changed,
    status: st.status,
    freshness,
    ...(st.queued !== undefined && { queued: st.queued }),
    ...(st.problem !== undefined && {
      problem: { ...st.problem, message: input.scrub(st.problem.message) },
    }),
    ...(e && {
      answer: withTerrain(withTerrainAnswer(e.answer, terrain), terrain),
    }),
    ...publishedView(
      e?.answer.published,
      catalog,
      st.atChecked,
      freshness,
      checks,
      e?.answer.value,
    ),
    ...(path && { path }),
    ...(APP_CODE[spec.id] && { appCode: APP_CODE[spec.id]! }),
    checks,
    liveExtras,
    ...(input.sceneNote !== undefined && { note: input.sceneNote }),
    ...(terrain !== undefined && { terrain }),
    ...(() => {
      const presets = [...(e?.presets ?? []), ...(input.pagePresets ?? [])];
      return presets.length > 0 ? { presets } : {};
    })(),
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
    ...(() => {
      // The capstone's pair (Task 8): its two knobs, each value's node.
      const tp = SCENES[spec.id]?.treePair;
      const knob = tp && spec.knobs.find((k) => k.id === tp.from);
      return tp && knob?.options
        ? {
            pair: {
              from: tp.from,
              to: tp.to,
              options: knob.options
                .filter((o) => tp.nodes[o.value] !== undefined)
                .map((o) => ({
                  value: o.value,
                  node: tp.nodes[o.value]!,
                  label: o.label,
                  short: o.short ?? o.value,
                })),
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
      // The ends as the evaluation's knobs name them (the capstone's pair).
      const ends =
        sc?.routeEndsFor?.(st.evaluatedAt?.knobs ?? st.knobs) ?? sc?.routeEnds;
      const start = e.data
        ? {
            title: `${e.data.label}, as delivered`,
            does: `${e.data.describes ?? "position and velocity"}, expressed in ${e.data.frame} (${e.data.source})`,
            accuracy: e.data.accuracy,
          }
        : (ends?.start ?? { title: p.from, does: "" });
      const end = e.data
        ? {
            title: `Drawn in ${p.to}`,
            does: sc?.drawnView?.[p.to] ?? "",
          }
        : (ends?.end ?? { title: p.to, does: "" });
      return {
        route: routeSteps(
          tree,
          path,
          start,
          end,
          e.data ? undefined : sc?.routeLegs,
        ),
        ...(!e.data && sc?.routeLegs && { routeLegs: sc.routeLegs }),
      };
    })(),
    playing,
    rate: input.rate,
    ...(input.eop && { eop: input.eop }),
  };
}
