// The panel's model (panel/model.ts), built from every part of the page on
// the panel's next read after `invalidate` (page.ts `createModelSource`):
// the loading items, the tree, the clock, the overlays, the catalog's and
// "Try your own"'s results with what each was compared with, the scenario
// (scenarioModel.ts) and the report's environment.
import type { Frames } from "../../src/frames/frames.ts";
import { earthOrientationSigma } from "../../src/measure/accuracy.ts";
import type { Instant } from "../../src/time/Instant.ts";
import { RESULT_LABELS, comparedFor } from "./content.ts";
import type { LoadingModel } from "./loading.ts";
import { CONVERGENCE_FACTOR } from "./overlayConfig.ts";
import { meters, type PageCore } from "./page.ts";
import type {
  ClockView,
  ComposedAccuracy,
  EnvironmentLine,
  OrionFrame,
  OverlayView,
  PanelModel,
  ResultExtras,
  RunView,
  ScenarioPanelView,
  UserCrsView,
} from "./panel/model.ts";
import type { SceneLegendRow } from "./panel/legendRows.ts";
import type { OverlaySettings } from "./overlayControl.ts";
import type { DataItem } from "./protocol.ts";
import references from "./references.json";
import { GROUP_INFO, groupInfo } from "./stress/groupInfo.ts";
import type { StressResult } from "./tests.ts";
import type { TreeNode } from "./tree.ts";

/**
 * The Earth orientation's state at the clock's instant (its time is the
 * time source's, page.ts). A predicted sample's age is kept to the tenth
 * of a day it is printed at, so the model doesn't change every frame while
 * the clock plays (Task 4d).
 */
export function clockView(
  frames: Frames | undefined,
  instant: Instant | undefined,
): ClockView {
  if (!frames || !instant) {
    return { eop: { kind: "measured" } };
  }
  const sigma = earthOrientationSigma(frames, instant);
  return {
    eop: sigma.degraded
      ? { kind: "outside", span: sigma.span }
      : sigma.predicted
        ? { kind: "predicted", ageDays: Math.round(sigma.ageDays * 10) / 10 }
        : { kind: "measured" },
  };
}

/** What a result was compared with, its label and notes (Verification's rows). */
export function extrasOf(r: StressResult): ResultExtras {
  const g = groupInfo(r.group);
  const label = RESULT_LABELS[r.id];
  return {
    ...(label !== undefined && { label }),
    ...(r.accuracyNote !== undefined && { accuracyNote: r.accuracyNote }),
    compared:
      r.expectedError !== undefined
        ? { kind: "error", text: `An error matching /${r.expectedError}/.` }
        : comparedFor(
            r.id,
            g?.compared ?? {
              kind: "independent",
              text: "The case's own check.",
            },
          ),
    ...(r.trace !== undefined && { trace: r.trace }),
    ...(r.source !== undefined && { source: r.source }),
    ...(r.group === "measurement" &&
      r.accuracy?.meters !== undefined && {
        relative: `The site's absolute placement is ±${meters(r.accuracy.meters)} (1σ); this check measures a distance, which that placement doesn't affect.`,
      }),
  };
}

/** Groups waiting for an item (R9): a need still loading, or not yet tried while a run goes on. */
export function waitingGroups(
  loading: Pick<LoadingModel, "get">,
  running: boolean,
  results: readonly StressResult[],
): Record<string, DataItem> {
  const out: Record<string, DataItem> = {};
  for (const g of GROUP_INFO) {
    for (const need of g.needs) {
      const s = loading.get(need).state;
      const pending = s === "fetching" || (running && s === "idle");
      const has = results.some((r) => r.group === g.id);
      if (pending && !has) {
        out[g.id] = need;
        break;
      }
    }
  }
  return out;
}

export interface PanelModelBuilder {
  build(): PanelModel;
  dispose(): void;
}

export function createPanelModel(deps: {
  core: Pick<PageCore, "loading" | "frames" | "instantNow">;
  token: string | undefined;
  tree: {
    tree(): TreeNode | undefined;
    note(): string | undefined;
    composed(): ComposedAccuracy;
  };
  overlays: { views(): OverlayView[]; settings(): OverlaySettings };
  orionFrame(): OrionFrame;
  catalog: { results(): readonly StressResult[]; runView(): RunView };
  user: { results(): readonly StressResult[]; view(): UserCrsView };
  scenario(): ScenarioPanelView;
  /** The current scenario's own legend rows, while its scene shows. */
  sceneLegend?(): readonly SceneLegendRow[] | undefined;
  environment(): EnvironmentLine[];
  /** A message for the panel's snackbar (a deep link that didn't resolve). */
  notice(): { id: number; text: string } | undefined;
}): PanelModelBuilder {
  const { loading, frames, instantNow } = deps.core;

  function build(): PanelModel {
    const tree = deps.tree.tree();
    const treeNote = deps.tree.note();
    const catalog = deps.catalog.results();
    const all = [...catalog, ...deps.user.results()];
    const extras: Record<string, ResultExtras> = {};
    for (const r of all) {
      extras[r.id] = extrasOf(r);
    }
    const runView = deps.catalog.runView();
    const userCrs = deps.user.view();
    const notice = deps.notice();
    return {
      items: loading.items,
      ...(tree ? { tree } : {}),
      ...(treeNote !== undefined && { treeNote }),
      composed: deps.tree.composed(),
      clock: clockView(frames(), instantNow()),
      overlays: deps.overlays.views(),
      orionFrame: deps.orionFrame(),
      ...deps.overlays.settings(),
      convergenceFactor: CONVERGENCE_FACTOR,
      triadScale:
        "triads drawn at 6% of the camera's distance, 2 m to 2,000 km; ITRF and GCRF at 1.5 Earth radii",
      ...(() => {
        const rows = deps.sceneLegend?.();
        return rows ? { sceneLegend: rows } : {};
      })(),
      groups: GROUP_INFO,
      results: all,
      extras,
      waiting: waitingGroups(loading, runView.state === "running", catalog),
      run: runView,
      ...(runView.state === "running"
        ? { runBusy: "A run is going on; this group can run when it ends." }
        : userCrs.state === "running"
          ? {
              runBusy:
                "Your CRS's checks are running; this group can run when they end.",
            }
          : {}),
      token: deps.token !== undefined ? "available" : undefined,
      userCrs,
      exampleWkt2: (
        references.entries as unknown as Record<string, { wkt2?: string }>
      )["input-wkt2-tokyo-jprcs-ix"]!.wkt2!,
      scenario: deps.scenario(),
      environment: deps.environment(),
      ...(notice !== undefined && { notice }),
    };
  }

  return { build, dispose: () => {} };
}
