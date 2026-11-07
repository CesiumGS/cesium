import "./panel.css";
// The frames explorer's panel (R14): the status strip always on top, then
// the scenarios (the first view: strip, tree, answer, knobs, proof) and, as
// a secondary entry, Verification (the catalog's checks, its overlays and
// the report); the globe's legend and the scenario's answer go to the HUD
// host over the canvas. Rendered by Dyno under StrataKit's Root
// (R17), from a model (model.ts) the page or the stub fills.
import {
  Button,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Tabs } from "@stratakit/structures";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { StressResult } from "../tests.ts";
import { OverlayRow } from "./Explore.tsx";
import {
  FrameButton,
  GlobeLegend,
  NARROW_VIEW,
  ScenarioCallout,
  useHudLayout,
} from "./Hud.tsx";
import { TimeContext } from "./liveTime.ts";
import { useStableCallback } from "./memo.ts";
import type {
  LensChoice,
  PanelActions,
  PanelModel,
  Reference,
  Selection,
  Tab,
  TimeSource,
} from "./model.ts";
import type { ViewStore } from "../selection.ts";
import { Report } from "./Report.tsx";
import { Scenarios } from "./Scenarios.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { Verify } from "./Verify.tsx";

/** The page's model, as `useSyncExternalStore` reads it. */
export interface ModelSource {
  subscribe(listener: () => void): () => void;
  get(): PanelModel;
}

export interface PanelProps {
  /** The model the page keeps up to date (panelModel.ts). */
  source: ModelSource;
  /** The selection and lens the tree, globe and tests share (R14). */
  view: ViewStore;
  actions: PanelActions;
  /** Over the canvas: the legend and the scenario's answer go here. */
  hud: HTMLElement;
  /** The clock's and the scenario's times, which move every frame while it plays (Task 4d). */
  time: TimeSource;
  initialTab?: Tab;
}

/** The two entries: the scenarios first, Verification second (spec "What happens to today's features"). */
type Entry = "scenarios" | "verification";
/** Verification's parts. */
type Part = "checks" | "overlays" | "report";

const PARTS: readonly [Part, string][] = [
  ["checks", "Checks"],
  ["overlays", "Overlays"],
  ["report", "Report"],
];

export function Panel({ time, ...rest }: PanelProps) {
  return (
    <TimeContext.Provider value={time}>
      <PanelBody {...rest} />
    </TimeContext.Provider>
  );
}

function PanelBody({
  source,
  view,
  actions,
  hud,
  initialTab,
}: Omit<PanelProps, "time">) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  const shared = useSyncExternalStore(view.subscribe, () => view.get());
  const uid = useId();
  const tabId = (t: Entry) => `${uid}-${t}`;
  const [entry, setEntry] = useState<Entry>(
    initialTab === "verify" || initialTab === "report"
      ? "verification"
      : "scenarios",
  );
  const [part, setPart] = useState<Part>(
    initialTab === "report" ? "report" : "checks",
  );
  const selection = shared.selection;
  // Stable callbacks: the memoized parts below don't render for a new one.
  const setSelection = useStableCallback((s: Selection) => view.select(s));
  const setReference = useStableCallback((r: Reference) => view.setAgainst(r));
  const lens = shared.lens;
  const setLens = (l: LensChoice) => view.setLens(l);
  const [frameFilter, setFrameFilter] = useState<string | undefined>(
    selection.kind === "frame" ? selection.id : undefined,
  );
  // A frame selected from anywhere (a deep link, back and forward) filters
  // Verify to the groups that use it, as a click in the tree does.
  const selectedFrame =
    selection.kind === "frame" || selection.kind === "node"
      ? selection.id
      : undefined;
  useEffect(() => {
    if (selectedFrame !== undefined) {
      setFrameFilter(selectedFrame);
    }
  }, [selectedFrame]);
  const [toast, setToast] = useState<string>();
  // The page's notices (a deep link that didn't resolve) show as toasts.
  const noticeId = model.notice?.id;
  const noticeText = model.notice?.text;
  useEffect(() => {
    if (noticeText !== undefined) {
      setToast(noticeText);
    }
  }, [noticeId, noticeText]);
  const viewWidth = useHudLayout(hud);
  const narrow = viewWidth < NARROW_VIEW;

  // Selecting a result flies to it (R14): the page follows the view store.
  const selectResult = (id: string | undefined) => {
    setSelection(id ? { kind: "result", id } : { kind: "none" });
  };
  const showFrames = (r: StressResult) => {
    setSelection({ kind: "result", id: r.id });
    setEntry("scenarios");
  };
  const showFailure = useStableCallback((id: string) => {
    setLens("all");
    setFrameFilter(undefined);
    setPart("checks");
    setEntry("verification");
    selectResult(id);
  });
  // From a scenario's proof row: the result selected without flying the
  // camera, so the scenario's view stays; F frames it on request (fix 2).
  const openInVerification = useStableCallback((id: string) => {
    actions.selectQuietly(id);
    setLens("all");
    setFrameFilter(undefined);
    setPart("checks");
    setEntry("verification");
    selectResult(id);
  });
  const copyLink = (s: Selection, message: string) => {
    void navigator.clipboard
      ?.writeText(actions.linkTo(s))
      .then(() => setToast(message));
  };
  const scenario = model.scenario;

  return (
    <div className="fx-panel">
      <StatusStrip
        model={model}
        actions={actions}
        onShowFailure={showFailure}
      />
      <Tabs.Provider
        selectedId={tabId(entry)}
        setSelectedId={(id) =>
          setEntry(id === tabId("verification") ? "verification" : "scenarios")
        }
      >
        <Tabs.TabList className="fx-tabs" aria-label="Frames explorer">
          <Tabs.Tab id={tabId("scenarios")}>Scenarios</Tabs.Tab>
          <Tabs.Tab id={tabId("verification")}>Verification</Tabs.Tab>
        </Tabs.TabList>
        <Tabs.TabPanel
          tabId={tabId("scenarios")}
          className="fx-tab-panel fx-tab-split"
          unmountOnHide
        >
          {scenario ? (
            <Scenarios
              model={model}
              scenario={scenario}
              actions={actions}
              selection={selection}
              setSelection={setSelection}
              reference={shared.against}
              setReference={setReference}
              hud={hud}
              onOpenResult={openInVerification}
            />
          ) : (
            <div className="fx-tab-body">
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
                role="status"
              >
                {model.treeNote ?? "The scenarios start once frame data is in."}
              </Typography>
            </div>
          )}
        </Tabs.TabPanel>
        <Tabs.TabPanel
          tabId={tabId("verification")}
          className="fx-tab-panel fx-tab-split"
          unmountOnHide
        >
          <div className="fx-verification-head">
            <Typography variant="body-sm" color="textSecondary" render={<p />}>
              The stress catalog behind every scenario&rsquo;s proof: 225
              results against their published references.
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={part}
              aria-label="Verification"
              onChange={(_, v: Part | null) => v && setPart(v)}
            >
              {PARTS.map(([p, label]) => (
                <ToggleButton
                  key={p}
                  value={p}
                  render={<Button variant="outlined" />}
                >
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
          {part === "checks" && (
            <Verify
              model={model}
              actions={actions}
              lens={lens}
              setLens={setLens}
              frameFilter={frameFilter}
              clearFrameFilter={() => setFrameFilter(undefined)}
              selected={selection.kind === "result" ? selection.id : undefined}
              onSelect={selectResult}
              onShowFrames={showFrames}
              onCopyLink={(id) =>
                copyLink({ kind: "result", id }, "Link copied")
              }
            />
          )}
          {part === "overlays" && (
            <div className="fx-split-list fx-tab-body">
              <Typography
                variant="body-sm"
                color="textSecondary"
                render={<p />}
              >
                The catalog&rsquo;s figures on the globe. A scenario switch
                turns these off; each scenario draws its own.
              </Typography>
              <ul className="fx-overlays">
                {model.overlays.map((o) => (
                  <OverlayRow
                    key={o.id}
                    overlay={o}
                    model={model}
                    actions={actions}
                  />
                ))}
              </ul>
            </div>
          )}
          {part === "report" && (
            <div className="fx-split-list">
              <Report
                model={model}
                actions={actions}
                onCopied={setToast}
                onSelectResult={(id) => {
                  selectResult(id);
                  setPart("checks");
                }}
              />
            </div>
          )}
        </Tabs.TabPanel>
      </Tabs.Provider>
      <Snackbar
        open={toast !== undefined}
        message={toast}
        autoHideDuration={2500}
        onClose={() => setToast(undefined)}
      />
      {createPortal(
        <>
          <FrameButton onFrame={actions.frameContent} />
          <GlobeLegend model={model} />
          {scenario && (
            <ScenarioCallout
              scenario={scenario}
              narrow={narrow}
              onKnob={actions.setKnob}
            />
          )}
        </>,
        hud,
      )}
    </div>
  );
}
