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
  answerDelta,
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
    // Where ours is another quantity than the headline (the capstone's
    // light time under its distance), how far the setting moves it from
    // the published value, in its unit.
    const delta =
      pub.ours !== undefined
        ? { value: pub.ours - pub.value, unit: pub.unit }
        : ref?.status === "reference-only"
          ? ref.delta
          : undefined;
    return {
      published: {
        ...base,
        state: "off" as const,
        ...(freshness === "current" && delta && { delta }),
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
        : (pub.ours ?? answerValue) !== undefined
          ? // No effect of its own (the dish's light time, checked at every
            // row of its fixture): ours against this row's published value,
            // at the checked setup's own instant, in the answer's unit
            // (Task 6c fix 1 follow-up), not the check's worst row.
            {
              ours: pub.ours ?? answerValue!,
              difference: {
                value: (pub.ours ?? answerValue!) - pub.value,
                unit: pub.unit,
              },
              // The check judges its worst row: said apart (Task 9, I12).
              ...(r.value !== undefined &&
                r.tolerance !== undefined && {
                  worst: {
                    value: r.value,
                    tolerance: r.tolerance,
                    ...(r.unit !== undefined && { unit: r.unit }),
                  },
                }),
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
 * The drawn terrain's error above which an end's local horizon isn't
 * judged at all, m (the capstone, Task 8 fix 1): from the Earth–Moon view
 * the tiles at the ship or the tool are tens of kilometres coarse, and a
 * "may block it (±77 km)" says nothing. Zoomed to the end, the tiles there
 * are a few tens of metres, under it.
 */
export const COARSE_TERRAIN_METERS = 100;

/**
 * The traces of the evaluation's own sight lines (the capstone's, Task 8):
 * one made for another pair (its `traced` isn't its line's key) reads as
 * tracing, never as this pair's verdict; a line the evaluation no longer
 * has goes. A line traced from a named end over tiles coarser than
 * `COARSE_TERRAIN_METERS` that reads clear or may block is unknown, never
 * clear (fix 1); a definite block stays a block, and an unknown keeps its
 * own words (Task 9). A clear with no stated error (`meters` undefined) has
 * no bound to judge, so it is unknown too (Task 9).
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
    const subject = line.subject ?? `The local horizon toward ${line.label}`;
    const own = line.key === undefined || v.traced === line.key;
    if (
      line.end !== undefined &&
      own &&
      v.state === "clear" &&
      v.meters === undefined
    ) {
      out.push({
        id: v.id,
        state: "unknown",
        unbounded: line.end,
        ...(v.traced !== undefined && { traced: v.traced }),
        text: `${subject}: the terrain's error at ${line.end} isn't stated, so it isn't counted as clear.`,
        ...(v.accuracy !== undefined && { accuracy: v.accuracy }),
      });
      continue;
    }
    if (
      line.end !== undefined &&
      own &&
      (v.state === "clear" || v.state === "may-block") &&
      v.meters !== undefined &&
      v.meters > COARSE_TERRAIN_METERS
    ) {
      out.push({
        id: v.id,
        state: "unknown",
        coarse: line.end,
        ...(v.traced !== undefined && { traced: v.traced }),
        text: `${subject}: the terrain at ${line.end} isn't judged from this far out: zoom to it to trace.`,
      });
      continue;
    }
    out.push(
      own
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

/**
 * The terrain views with one "waiting" view for each of the evaluation's
 * sight lines the page hasn't traced yet (Task 9): between an answer
 * arriving and its first trace, the answer says "the terrain isn't traced
 * yet", never a bare "In view" (Review Focus 2).
 */
export function withPending(
  terrain: readonly TerrainSightView[] | undefined,
  e: Pick<ScenarioEvaluation, "sightLines">,
): TerrainSightView[] | undefined {
  const missing = (e.sightLines ?? []).filter(
    (l) => !terrain?.some((v) => v.id === l.id),
  );
  if (missing.length === 0) {
    return terrain === undefined ? undefined : [...terrain];
  }
  return [
    ...(terrain ?? []),
    ...missing.map((l): TerrainSightView => ({
      id: l.id,
      state: "waiting",
      ...(l.key !== undefined && { traced: l.key }),
      text: `${l.subject ?? `The local horizon toward ${l.label}`}: waiting for the terrain.`,
    })),
  ];
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
  /** Its short form, for the globe's callout. */
  sceneCalloutNote?: string;
  /** Its lines of sight over the terrain (sightLines.ts). */
  terrain?: ScenarioPanelView["terrain"];
  /** Moments the page found itself, after the evaluation's (the ship's lighthouse coming into view, Task 7). */
  pagePresets?: readonly Moment[];
  scrub(text: string): string;
}

export function scenarioView(input: ScenarioViewInput): ScenarioPanelView {
  const { st, tree, playing } = input;
  const spec = st.spec;
  const catalog = new Map(input.results.map((r) => [r.id, r]));
  // A failed evaluation is the current setup's outcome: never "updating"
  // for ever over the last answer (Task 9, I10).
  const failed = st.status === "error" && st.problem !== undefined;
  // After a failure nothing of the last setup's evaluation shows as this
  // one's (Task 9, N1 and N8): its answer, path, route figures, live rows,
  // presets, data and mask row all go.
  const e = failed ? undefined : st.evaluation;
  const freshness = failed ? "current" : scenarioFreshness(st, playing);
  const own =
    input.terrain !== undefined && e?.pair
      ? ownTraces(input.terrain, e)
      : input.terrain;
  const terrain = e ? withPending(own, e) : own;
  let checks: CheckRow[];
  if (failed && !st.atChecked) {
    // The evaluation failed off the checked setup: nothing re-ran, and each
    // row says so (Task 9, I10).
    checks = spec.checks
      .filter((id) => catalog.get(id)?.displayOnly !== true)
      .map((id) => ({
        status: "not-run" as const,
        kind: checkKind(spec, id, catalog.get(id)),
        id,
        title: catalog.get(id)?.title ?? id,
      }));
  } else if (e && st.evaluatedAt) {
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
    // After a failure the last setup's answer isn't this one's: it, its
    // published comparison and its delta go (Task 9, N1); the panel and
    // the callout show the error.
    ...(e &&
      !failed && {
        answer: withTerrain(withTerrainAnswer(e.answer, terrain), terrain),
      }),
    ...(failed
      ? {}
      : publishedView(
          e?.answer.published,
          catalog,
          st.atChecked,
          freshness,
          checks,
          e?.answer.value,
        )),
    // How far the setting moves the answer, in the headline's own quantity
    // (`answerDelta`, Task 9 N3): said once, in the knobs' off-the-checked-
    // setup line, not on every reference row (I8).
    ...(() => {
      const delta =
        e && !failed && !st.atChecked && freshness === "current"
          ? answerDelta(e)
          : undefined;
      return delta ? { answerDelta: delta } : {};
    })(),
    ...(path && { path }),
    ...(failed && {
      routeNote:
        "Not worked out at this setting: the route's steps and their accuracies come with an answer.",
    }),
    ...(APP_CODE[spec.id] && { appCode: APP_CODE[spec.id]! }),
    checks,
    liveExtras,
    ...(input.sceneNote !== undefined && { note: input.sceneNote }),
    ...(input.sceneNote !== undefined && {
      calloutNote: input.sceneCalloutNote ?? input.sceneNote,
    }),
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
