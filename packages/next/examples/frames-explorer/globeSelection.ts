// The selection on the globe (R14, DESIGN.md "A selection on the globe"):
// one view store (selection.ts) is the selection the tree, the globe and
// Verification share. A frame highlights its path and starts the walk; a
// result turns its overlay on, highlights its group's frames and flies to
// its site, or, asked for from a scenario's proof, is shown quietly; a
// deep-linked result not in hand runs its group first (R15). Frame content
// (F) and "Show on globe" frame the same targets.
import { DISTORTION } from "./overlayConfig.ts";
import {
  OPENING,
  framingAt,
  surface,
  type CameraView,
  type CameraViews,
} from "./cameraViews.ts";
import { frameTarget } from "./orbit.ts";
import { deg, isFrame, type PageCore } from "./page.ts";
import type { DistortionCrs, OverlayId } from "./panel/model.ts";
import type { ScenarioEvaluation } from "./scenarios/evaluate.ts";
import type { SceneSpec } from "./scenarios/scenes.ts";
import {
  formatParams,
  loadLinkedResult,
  type Known,
  type ViewParams,
} from "./selection.ts";
import { groupInfo, type Lens } from "./stress/groupInfo.ts";
import type { StressResult } from "./tests.ts";
import { pathToRoot, type TreeNode } from "./tree.ts";

export interface GlobeSelection {
  /** The frames the selection highlights (R14): a frame's path, a result's group's frames. */
  emphasis(): Set<string>;
  /** The view store changed: the link, and the globe if the selection did. */
  onView(): void;
  /** The scenario is on the globe: the link's selection applies afresh. */
  restart(): void;
  /** The next selection of result `id` is shown without flying (Open in Verification). */
  selectQuietly(id: string): void;
  /** Where a result's group points: its overlay's framing, its site, or its frames. */
  resultView(id: string): CameraView | undefined;
  /** Frame content (F): the selected frame or result, else the scenario's view, else the opening view. */
  frameContent(): void;
  /** The frames and results a link may name now (R15). */
  updateKnown(): void;
  /** A message for the panel's snackbar (a deep link that didn't resolve). */
  notice(): { id: number; text: string } | undefined;
  dispose(): void;
}

export function createGlobeSelection(deps: {
  core: Pick<PageCore, "globe" | "view" | "invalidate" | "disposed">;
  setParams(next: Readonly<Record<string, string | undefined>>): void;
  /** The scenario's part of the link (scenarioHost.ts `params`). */
  scenarioParams(): Pick<ViewParams, "scenario" | "knobs" | "time">;
  tree: { tree(): TreeNode | undefined; ids(): Set<string> };
  catalog: {
    results(): readonly StressResult[];
    lastRun(): unknown;
    run(ids: readonly string[]): Promise<string | undefined>;
  };
  userResults(): readonly StressResult[];
  evaluation(): ScenarioEvaluation | undefined;
  overlays: {
    set(id: OverlayId, on: boolean): void;
    settings(): { distortionCrs: DistortionCrs };
  };
  views: CameraViews;
  show(v: CameraView): void;
  stage: {
    scene(): SceneSpec | undefined;
    exposure(): number;
    flyToScene(): void;
  };
  refreshTriads(): void;
  startWalk(id: string | undefined): void;
  refreshCallouts(): void;
}): GlobeSelection {
  const { globe, view, invalidate, disposed } = deps.core;
  const { catalog, views } = deps;
  /** The deep-linked result being loaded (`loadLinkedResult`). */
  let linking: string | undefined;
  let notice: { id: number; text: string } | undefined;
  /** A result to select without flying (Open in Verification from a proof row). */
  let quietResult: string | undefined;
  let lastSelection = view.get().selection;
  let lastAgainst = view.get().against;

  function emphasisFrames(): Set<string> {
    const s = view.get().selection;
    const out = new Set<string>();
    const tree = deps.tree.tree();
    if (isFrame(s) && tree) {
      try {
        for (const n of pathToRoot(tree, s.id)) {
          out.add(n.id);
        }
      } catch {
        // Not in the tree: reconcile clears it.
      }
    } else if (s.kind === "result" && deps.stage.scene() === undefined) {
      // A result's group's frames, but not over a scenario's scene: a
      // catalog check through every frame (frame-tree.compositions) would
      // draw the Moon's triads in "The Earth turns" (fix 1, item 5).
      const r = catalog.results().find((x) => x.id === s.id);
      for (const f of (r && groupInfo(r.group)?.focus?.frames) ?? []) {
        out.add(f);
      }
    }
    return out;
  }

  function onView(): void {
    const v = view.get();
    deps.setParams(formatParams({ ...v, ...deps.scenarioParams() }));
    if (v.selection !== lastSelection) {
      lastSelection = v.selection;
      applySelection();
    } else if (v.against !== lastAgainst && isFrame(v.selection)) {
      // The walk's reference changed: its path on the globe follows (S-I5).
      deps.startWalk(v.selection.id);
    }
    lastAgainst = v.against;
    invalidate();
  }

  function applySelection(): void {
    const s = view.get().selection;
    deps.refreshTriads();
    deps.startWalk(isFrame(s) ? s.id : undefined);
    deps.refreshCallouts();
    if (s.kind === "none") {
      globe.emphasize(undefined);
      globe.dimGround(deps.stage.exposure());
      return;
    }
    if (isFrame(s)) {
      // Selecting a frame highlights; flying is "Show on globe" (I6).
      globe.emphasize({ frames: emphasisFrames(), selected: s.id });
      return;
    }
    // A result not in hand (a deep link, back or forward): run its group
    // (retrying once), then show it, or clear it and say why (R15).
    const has = (id: string) =>
      catalog.results().some((r) => r.id === id) ||
      deps.userResults().some((r) => r.id === id);
    if (!has(s.id)) {
      if (linking !== s.id) {
        linking = s.id;
        void loadLinkedResult(view, s.id, {
          has,
          run: async (group) => {
            const outcome = await catalog.run([group]);
            if (outcome !== undefined) {
              throw new Error(outcome);
            }
          },
          notice: (text) => {
            notice = { id: (notice?.id ?? 0) + 1, text };
            invalidate();
          },
        })
          .then((outcome) => {
            if (
              outcome === "shown" &&
              !disposed() &&
              view.get().selection === s
            ) {
              applySelection();
            }
          })
          .finally(() => {
            linking = undefined;
          });
      }
      return;
    }
    // Asked for from a scenario's proof: shown in Verification, the
    // scenario's camera and overlays left as they are (fix 2).
    if (quietResult === s.id) {
      quietResult = undefined;
      globe.emphasize({ frames: emphasisFrames() });
      return;
    }
    // A result: its overlay on, its frames highlighted, the camera at its site (R14).
    const where = resultFraming(s.id);
    if (where.overlay) {
      deps.overlays.set(where.overlay, true);
    }
    globe.emphasize({
      ...(where.overlay && { overlay: where.overlay }),
      frames: emphasisFrames(),
    });
    globe.dimGround(where.engineering);
    if (where.view) {
      deps.show(where.view);
    }
  }

  function resultFraming(id: string): {
    view?: CameraView | undefined;
    overlay?: OverlayId;
    engineering: boolean;
  } {
    const r =
      catalog.results().find((x) => x.id === id) ??
      deps.userResults().find((x) => x.id === id);
    const g = r && groupInfo(r.group);
    if (!g) {
      return { engineering: false };
    }
    const overlay: OverlayId | undefined =
      g.focus?.overlay === "designGrid"
        ? "designGrid"
        : g.focus?.overlay === "trajectoryPath"
          ? "orion"
          : g.id === "rigid-placement-budget"
            ? "rigidVsExact"
            : g.id === "distortion"
              ? "distortion"
              : undefined;
    const engineering = g.needs.includes("proj");
    if (g.id === "lunar-time") {
      return { view: views.lunarSiteView(), engineering: false };
    }
    if (g.id === "space" || g.id === "trajectory") {
      return {
        view: views.earthMoonView(),
        overlay: "orion",
        engineering: false,
      };
    }
    if (overlay === "designGrid") {
      return {
        view: surface(views.framing("designGrid")),
        overlay,
        engineering,
      };
    }
    if (overlay === "rigidVsExact") {
      return {
        view: surface(views.framing("rigidVsExact")),
        overlay,
        engineering,
      };
    }
    if (overlay === "distortion") {
      const d = DISTORTION[deps.overlays.settings().distortionCrs].look;
      return {
        view: surface(framingAt(d[0], d[1], d[2], 0, -60 * deg)),
        overlay,
        engineering,
      };
    }
    if (g.focus?.site === "california") {
      return { view: surface(views.framing("site")), engineering };
    }
    if (engineering) {
      // A check with no site of its own: show the fingerprint's first point.
      const c = r?.fingerprint?.coordinates;
      if (c && c.length >= 3 && Math.hypot(c[0]!, c[1]!, c[2]!) > 6.3e6) {
        return {
          view: surface({
            center: [c[0]!, c[1]!, c[2]!],
            range: 30_000,
            heading: 0,
            pitch: -50 * deg,
          }),
          engineering,
        };
      }
    }
    return { view: surface(OPENING), engineering: false };
  }

  function frameContent(): void {
    const t = frameTarget(deps.stage.scene()?.id, view.get().selection);
    if (t.kind === "scenario") {
      deps.stage.flyToScene();
      return;
    }
    const v =
      t.kind === "frame"
        ? views.frameView(t.id)
        : t.kind === "result"
          ? resultFraming(t.id).view
          : { framing: OPENING };
    if (v) {
      deps.show(v);
    }
  }

  function updateKnown(): void {
    const repro = groupInfo("reproducibility")!.lenses;
    const lensesOf = new Map<string, readonly Lens[]>();
    for (const r of [...catalog.results(), ...deps.userResults()]) {
      const own = groupInfo(r.group)?.lenses ?? [];
      lensesOf.set(
        r.id,
        r.fingerprint ? [...new Set([...own, ...repro])] : own,
      );
    }
    // The groups that have run: a result of another group (a deep link
    // after a group's own run) is kept until its group runs (R15).
    const ran = new Set(catalog.results().map((r) => r.group));
    const known: Known = {
      // Only once the scenario's frames are in: a link to a frame it adds
      // (the lunar site) waits for its evaluation rather than being cleared.
      ...(deps.tree.tree() && deps.evaluation() && { frames: deps.tree.ids() }),
      ...(catalog.lastRun() !== undefined && { results: lensesOf, ran }),
    };
    view.setKnown(known);
  }

  return {
    emphasis: emphasisFrames,
    onView,
    restart: () => {
      lastSelection = { kind: "none" };
      onView();
    },
    selectQuietly: (id) => {
      quietResult = id;
    },
    resultView: (id) => resultFraming(id).view,
    frameContent,
    updateKnown,
    notice: () => notice,
    dispose: () => {},
  };
}
