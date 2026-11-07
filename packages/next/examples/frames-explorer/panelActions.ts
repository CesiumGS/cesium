// What the panel can ask of the page (panel/model.ts `PanelActions`): runs,
// overlays and their settings, the camera's targets, "Try your own", the
// report, links, the scenario's picker and knobs, and the clock.
import type { ExampleContext } from "../types.ts";
import { framingAt, type CameraView, type CameraViews } from "./cameraViews.ts";
import { groupRunIds } from "./content.ts";
import fingerprintFile from "./fingerprints.json";
import type { OverlayControl } from "./overlayControl.ts";
import { DISTORTION } from "./overlayConfig.ts";
import { FLYBY, deg, type PageCore } from "./page.ts";
import type { OrionFrame, PanelActions } from "./panel/model.ts";
import type { PageReport } from "./pageReport.ts";
import type { ScenarioHost } from "./scenarioHost.ts";
import { readyScenario } from "./deepLinks.ts";
import { formatParams } from "./selection.ts";

/** The fingerprinted results' ids (R12), which the Reproducibility card runs. */
const FINGERPRINTED = Object.keys(
  (fingerprintFile as { fingerprints: Record<string, unknown> }).fingerprints,
);

export function createPanelActions(deps: {
  core: Pick<PageCore, "viewer" | "client" | "view">;
  link: ExampleContext["link"];
  catalog: { run(ids?: readonly string[]): Promise<string | undefined> };
  /** Loads the frame data again (frameData.ts). */
  reloadFrames(): void;
  overlays: OverlayControl;
  orion: { setFrame(frame: OrionFrame): void };
  views: Pick<CameraViews, "frameView">;
  show(v: CameraView): void;
  selection: {
    resultView(id: string): CameraView | undefined;
    frameContent(): void;
    selectQuietly(id: string): void;
  };
  user: {
    showAsset(id: string): Promise<void>;
    run(wkt2: string): Promise<void>;
  };
  report: Pick<PageReport, "report">;
  host: Pick<ScenarioHost, "show" | "setKnob" | "backToChecked" | "params">;
}): { actions: PanelActions; dispose(): void } {
  const { viewer, client, view } = deps.core;
  const { overlays, host } = deps;
  const actions: PanelActions = {
    runAll: () => void deps.catalog.run(),
    runGroup: (group) =>
      void deps.catalog.run(groupRunIds(group, FINGERPRINTED)),
    cancel: () => client.cancel(),
    retryItem: (item) => {
      if (item === "frames") {
        deps.reloadFrames();
      } else {
        void client.load(item).catch(() => {});
      }
    },
    setOverlay: (id, on) => overlays.set(id, on),
    setOrionFrame: (f) => {
      deps.orion.setFrame(f);
      overlays.draw("orion");
    },
    setDistortionCrs: (crs) => {
      overlays.setDistortionCrs(crs);
      const d = DISTORTION[crs].look;
      deps.show({ framing: framingAt(d[0], d[1], d[2], 0, -60 * deg) });
    },
    setDistortionHeight: (h) => overlays.setDistortionHeight(h),
    setBiasFactor: (k) => overlays.setBiasFactor(k),
    setTrueScale: (on) => overlays.setTrueScale(on),
    jumpToFlyby: () => {
      viewer.clock.time = FLYBY;
    },
    showOnGlobe: (target) => {
      const v =
        "frame" in target
          ? deps.views.frameView(target.frame)
          : deps.selection.resultView(target.result);
      if (v) {
        deps.show(v);
      }
    },
    frameContent: () => deps.selection.frameContent(),
    fetchAsset: (id) => void deps.user.showAsset(id),
    runUserCrs: (wkt2) => void deps.user.run(wkt2),
    copyReport: async () => {
      await navigator.clipboard.writeText(deps.report.report().markdown);
    },
    saveReport: (format) => {
      const r = deps.report.report();
      const blob =
        format === "json"
          ? new Blob([JSON.stringify(r.json, null, 2)], {
              type: "application/json",
            })
          : new Blob([r.markdown], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `frames-explorer-report.${format === "json" ? "json" : "md"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    },
    linkTo: (target) =>
      deps.link(
        formatParams({
          selection: target,
          lens: view.get().lens,
          ...host.params(),
        }),
      ),
    selectScenario: (id) => {
      view.select({ kind: "none" });
      void host.show(readyScenario(id));
    },
    setKnob: (id, value) => host.setKnob(id, value),
    backToChecked: () => host.backToChecked(),
    goToMoment: (m) => {
      if (m.knobs) {
        for (const [id, value] of Object.entries(m.knobs)) {
          host.setKnob(id, value);
        }
      } else if (m.utcMs !== undefined) {
        viewer.clock.time = m.utcMs;
        viewer.clock.mode = "paused";
      }
    },
    selectQuietly: (id) => deps.selection.selectQuietly(id),
  };
  return { actions, dispose: () => {} };
}
