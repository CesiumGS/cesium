// The frames explorer (plan Task 6): the frame tree and engineering frames,
// drawn on the globe and stress-tested in the page.
//
// Part 6a, the design pass: the panel's real StrataKit components on stub
// data (panel/stub.ts), in the state the `stub` param picks ("ready",
// "fetching", "missing", "failure", "start"). Part 6b replaces the stub with
// the worker (protocol.ts), the overlays, the selection and the report.
import { createElement } from "react";
import type { ExampleContext, ExampleRun } from "../types.ts";
import type {
  LensChoice,
  PanelActions,
  Selection,
  Tab,
} from "./panel/model.ts";
import { Panel } from "./panel/Panel.tsx";
import { SCENARIOS, type Scenario, stubModel } from "./panel/stub.ts";

const TABS: readonly Tab[] = ["explore", "verify", "report"];
const LENSES: readonly LensChoice[] = [
  "all",
  "civil",
  "bim",
  "gis",
  "space",
  "timing",
  "offshore",
  "av",
];

/** `select=result:<id>` or `frame:<id>` (R15); anything else is none. */
function parseSelection(text: string | undefined): Selection {
  const m = /^(result|frame):(.+)$/.exec(text ?? "");
  return m ? { kind: m[1] as "result" | "frame", id: m[2]! } : { kind: "none" };
}

const pick = <T extends string>(
  options: readonly T[],
  value: string | undefined,
): T | undefined => options.find((o) => o === value);

export function run(context: ExampleContext): ExampleRun {
  const { viewer, params, scope } = context;
  const scenario: Scenario = pick(SCENARIOS, params.stub) ?? "ready";
  const model = stubModel(scenario);

  // The HUD host over the canvas: the legend and tour captions (R17).
  const hud = document.createElement("div");
  hud.className = "fx-hud-host";
  viewer.container.append(hud);
  scope.defer(() => hud.remove());

  const tour = model.tour.findIndex((s) => s.id === params.tour);
  const noop = () => {};
  const stubReport = () =>
    [
      "# Frames explorer report (stub)",
      "",
      `${model.results.length} results from the stub; part 6b writes the real report.`,
    ].join("\n");
  // The panel and the canvas show one instant (I13; 6b follows the clock).
  viewer.clock.time = Date.parse(model.clock.utc);
  const actions: PanelActions = {
    runAll: noop,
    retryItem: noop,
    runGroup: noop,
    cancel: noop,
    setOverlay: noop,
    setOrionFrame: noop,
    setDistortionCrs: noop,
    setDistortionHeight: noop,
    setBiasFactor: noop,
    jumpToFlyby: noop,
    showOnGlobe: noop,
    fetchAsset: noop,
    runUserCrs: noop,
    copyReport: () =>
      navigator.clipboard?.writeText(stubReport()) ?? Promise.resolve(),
    saveReport: (format) => {
      const blob =
        format === "json"
          ? new Blob([JSON.stringify({ results: model.results }, null, 2)], {
              type: "application/json",
            })
          : new Blob([stubReport()], { type: "text/markdown" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `frames-explorer-report.${format === "json" ? "json" : "md"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 0);
    },
    linkTo: (target) => {
      // 6b: a link built from the example's params (selection.ts).
      const search =
        target.kind === "tour"
          ? `tour=${encodeURIComponent(target.stop)}`
          : target.kind === "none"
            ? ""
            : `select=${target.kind}:${encodeURIComponent(target.id)}`;
      const base = location.href.split("?")[0]!;
      return search ? `${base}?${search}` : base;
    },
  };

  return {
    dispose: noop,
    panel: createElement(Panel, {
      model,
      actions,
      hud,
      initial: {
        ...(pick(TABS, params.tab) && { tab: pick(TABS, params.tab)! }),
        selection: parseSelection(params.select),
        ...(pick(LENSES, params.lens) && { lens: pick(LENSES, params.lens)! }),
        ...(tour >= 0 && { tour }),
      },
    }),
  };
}
