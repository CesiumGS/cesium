import "./panel.css";
// The frames explorer's panel (R14): the status strip always on top, then
// Explore, Verify and Report; the globe's legend and the tour caption go to
// the HUD host over the canvas. Rendered by Dyno under StrataKit's Root
// (R17), from a model (model.ts) the page or the stub fills.
import { Snackbar } from "@mui/material";
import { Tabs } from "@stratakit/structures";
import { useId, useState } from "react";
import { createPortal } from "react-dom";
import type { StressResult } from "../tests.ts";
import { Explore } from "./Explore.tsx";
import { GlobeLegend, TourCaption, useClearOfTimeControls } from "./Hud.tsx";
import type {
  LensChoice,
  PanelActions,
  PanelModel,
  Selection,
  Tab,
} from "./model.ts";
import { Report } from "./Report.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { Verify } from "./Verify.tsx";

export interface PanelProps {
  model: PanelModel;
  actions: PanelActions;
  /** Over the canvas: the legend and the tour caption go here. */
  hud: HTMLElement;
  initial?: {
    tab?: Tab;
    selection?: Selection;
    lens?: LensChoice;
    /** A tour stop's index, to open the tour at. */
    tour?: number;
  };
}

const TABS: readonly [Tab, string][] = [
  ["explore", "Explore"],
  ["verify", "Verify"],
  ["report", "Report"],
];

export function Panel({ model, actions, hud, initial = {} }: PanelProps) {
  const uid = useId();
  const tabId = (t: Tab) => `${uid}-${t}`;
  const [tab, setTab] = useState<Tab>(initial.tab ?? "explore");
  const [selection, setSelection] = useState<Selection>(
    initial.selection ?? { kind: "none" },
  );
  const [lens, setLens] = useState<LensChoice>(initial.lens ?? "all");
  const [frameFilter, setFrameFilter] = useState<string | undefined>(
    initial.selection?.kind === "frame" ? initial.selection.id : undefined,
  );
  const [tour, setTour] = useState<number | undefined>(initial.tour);
  const [toast, setToast] = useState<string>();
  useClearOfTimeControls(hud);

  const selectFrame = (id: string | undefined) => {
    setSelection(id ? { kind: "frame", id } : { kind: "none" });
    setFrameFilter(id);
    if (id) {
      actions.showOnGlobe({ frame: id });
    }
  };
  const selectResult = (id: string | undefined) => {
    setSelection(id ? { kind: "result", id } : { kind: "none" });
    if (id) {
      actions.showOnGlobe({ result: id });
    }
  };
  const highlightFrames = (r: StressResult) => {
    const frame = model.groups
      .find((g) => g.id === r.group)
      ?.focus?.frames.at(-1);
    if (frame) {
      setSelection({ kind: "frame", id: frame });
      setTab("explore");
    }
  };
  const copyLink = (
    s: Selection | { kind: "tour"; stop: string },
    message: string,
  ) => {
    void navigator.clipboard
      ?.writeText(actions.linkTo(s))
      .then(() => setToast(message));
  };

  return (
    <div className="fx-panel">
      <StatusStrip model={model} />
      <Tabs.Provider
        selectedId={tabId(tab)}
        setSelectedId={(id) => {
          const t = TABS.find(([k]) => tabId(k) === id)?.[0];
          if (t) {
            setTab(t);
          }
        }}
      >
        <Tabs.TabList className="fx-tabs" aria-label="Frames explorer">
          {TABS.map(([t, label]) => (
            <Tabs.Tab key={t} id={tabId(t)}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.TabList>
        <Tabs.TabPanel
          tabId={tabId("explore")}
          className="fx-tab-panel"
          unmountOnHide
        >
          <Explore
            model={model}
            actions={actions}
            selectedFrame={
              selection.kind === "frame" ? selection.id : undefined
            }
            onSelectFrame={selectFrame}
            onStartTour={() => setTour(0)}
          />
        </Tabs.TabPanel>
        <Tabs.TabPanel
          tabId={tabId("verify")}
          className="fx-tab-panel fx-tab-verify"
          unmountOnHide
        >
          <Verify
            model={model}
            actions={actions}
            lens={lens}
            setLens={setLens}
            frameFilter={frameFilter}
            clearFrameFilter={() => setFrameFilter(undefined)}
            selected={selection.kind === "result" ? selection.id : undefined}
            onSelect={selectResult}
            onHighlightFrames={highlightFrames}
            onCopyLink={(id) => copyLink({ kind: "result", id }, "Link copied")}
          />
        </Tabs.TabPanel>
        <Tabs.TabPanel
          tabId={tabId("report")}
          className="fx-tab-panel"
          unmountOnHide
        >
          <Report
            model={model}
            actions={actions}
            onCopied={setToast}
            onSelectResult={(id) => {
              selectResult(id);
              setTab("verify");
            }}
          />
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
          <GlobeLegend model={model} host={hud} />
          {tour !== undefined && model.tour[tour] && (
            <TourCaption
              tour={model.tour}
              stop={tour}
              onStop={setTour}
              onEnd={() => setTour(undefined)}
              onCopyLink={(stop) =>
                copyLink(
                  { kind: "tour", stop: stop.id },
                  "Link to this stop copied",
                )
              }
            />
          )}
        </>,
        hud,
      )}
    </div>
  );
}
