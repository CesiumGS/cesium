import "./panel.css";
// The frames explorer's panel (R14): the status strip always on top, then
// Explore, Verify and Report; the globe's legend and the tour caption go to
// the HUD host over the canvas. Rendered by Dyno under StrataKit's Root
// (R17), from a model (model.ts) the page or the stub fills.
import { Snackbar } from "@mui/material";
import { Tabs } from "@stratakit/structures";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { StressResult } from "../tests.ts";
import { Explore } from "./Explore.tsx";
import { GlobeLegend, NARROW_VIEW, TourCaption, useHudLayout } from "./Hud.tsx";
import { tourScaleSwitch } from "./tourScale.ts";
import type {
  LensChoice,
  PanelActions,
  PanelModel,
  Selection,
  Tab,
} from "./model.ts";
import type { ViewStore } from "../selection.ts";
import { rowName } from "./QuestionCard.tsx";
import { Report } from "./Report.tsx";
import { StatusStrip } from "./StatusStrip.tsx";
import { Verify } from "./Verify.tsx";

/** The page's model, as `useSyncExternalStore` reads it. */
export interface ModelSource {
  subscribe(listener: () => void): () => void;
  get(): PanelModel;
}

export interface PanelProps {
  /** The model the page (main.ts) keeps up to date. */
  source: ModelSource;
  /** The selection, lens and tour stop the tree, globe and tests share (R14). */
  view: ViewStore;
  actions: PanelActions;
  /** Over the canvas: the legend and the tour caption go here. */
  hud: HTMLElement;
  initialTab?: Tab;
}

const TABS: readonly [Tab, string][] = [
  ["explore", "Explore"],
  ["verify", "Verify"],
  ["report", "Report"],
];

export function Panel({ source, view, actions, hud, initialTab }: PanelProps) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  const shared = useSyncExternalStore(view.subscribe, () => view.get());
  const uid = useId();
  const tabId = (t: Tab) => `${uid}-${t}`;
  const [tab, setTab] = useState<Tab>(initialTab ?? "explore");
  const selection = shared.selection;
  const setSelection = (s: Selection) => view.select(s);
  const lens = shared.lens;
  const setLens = (l: LensChoice) => view.setLens(l);
  const [frameFilter, setFrameFilter] = useState<string | undefined>(
    selection.kind === "frame" ? selection.id : undefined,
  );
  // A frame selected from anywhere (a deep link, back and forward) filters
  // Verify to the groups that use it, as a click in the tree does.
  const selectedFrame = selection.kind === "frame" ? selection.id : undefined;
  useEffect(() => {
    if (selectedFrame !== undefined) {
      setFrameFilter(selectedFrame);
    }
  }, [selectedFrame]);
  const tourIndex = model.tour.findIndex((s) => s.id === shared.tour);
  const tour = tourIndex >= 0 ? tourIndex : undefined;
  const setTour = (i: number | undefined) =>
    view.setTour(i === undefined ? undefined : model.tour[i]?.id);
  const [toast, setToast] = useState<string>();
  // The page's notices (a deep link that didn't resolve) show as toasts.
  const noticeId = model.notice?.id;
  const noticeText = model.notice?.text;
  useEffect(() => {
    if (noticeText !== undefined) {
      setToast(noticeText);
    }
  }, [noticeId, noticeText]);
  const tourButton = useRef<HTMLButtonElement>(null);
  const viewWidth = useHudLayout(hud);
  const narrow = viewWidth < NARROW_VIEW;

  // Selecting a frame highlights and filters; it doesn't fly (I6: flying is
  // the row's action and "Show on globe").
  const selectFrame = (id: string | undefined) => {
    setSelection(id ? { kind: "frame", id } : { kind: "none" });
    setFrameFilter(id);
  };
  // Selecting a result flies to it (R14): the page follows the view store.
  const selectResult = (id: string | undefined) => {
    setSelection(id ? { kind: "result", id } : { kind: "none" });
  };
  const selected =
    selection.kind === "result"
      ? model.results.find((r) => r.id === selection.id)
      : undefined;
  // While a result is selected the tree shows its frames' paths (I5).
  const resultFrames = selected && {
    label: rowName(selected, model.extras[selected.id]),
    frames:
      model.groups.find((g) => g.id === selected.group)?.focus?.frames ?? [],
  };
  const showFrames = (r: StressResult) => {
    setSelection({ kind: "result", id: r.id });
    setTab("explore");
  };
  const showFailure = (id: string) => {
    setLens("all");
    setFrameFilter(undefined);
    setTab("verify");
    selectResult(id);
  };
  const copyLink = (
    s: Selection | { kind: "tour"; stop: string },
    message: string,
  ) => {
    void navigator.clipboard
      ?.writeText(actions.linkTo(s))
      .then(() => setToast(message));
  };
  const endTour = () => {
    setTour(undefined);
    // Back to where the tour started from (I18).
    requestAnimationFrame(() => tourButton.current?.focus());
  };

  return (
    <div className="fx-panel">
      <StatusStrip
        model={model}
        actions={actions}
        onShowFailure={showFailure}
      />
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
          className="fx-tab-panel fx-tab-split"
          unmountOnHide
        >
          <Explore
            model={model}
            actions={actions}
            selectedFrame={
              selection.kind === "frame" ? selection.id : undefined
            }
            onSelectFrame={selectFrame}
            resultFrames={resultFrames}
            onBackToResult={() => setTab("verify")}
            onStartTour={() => setTour(0)}
            tourButton={tourButton}
            reference={shared.against}
            setReference={(r) => view.setAgainst(r)}
          />
        </Tabs.TabPanel>
        <Tabs.TabPanel
          tabId={tabId("verify")}
          className="fx-tab-panel fx-tab-split"
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
            onShowFrames={showFrames}
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
          {/* On a narrow view the tour's caption takes the bottom; the
              legend comes back when the tour ends. */}
          {!(narrow && tour !== undefined) && <GlobeLegend model={model} />}
          {tour !== undefined && model.tour[tour] && (
            <TourCaption
              tour={model.tour}
              stop={tour}
              narrow={narrow}
              onStop={setTour}
              onEnd={endTour}
              onCopyLink={(stop) =>
                copyLink(
                  { kind: "tour", stop: stop.id },
                  "Link to this stop copied",
                )
              }
              scaleSwitch={tourScaleSwitch(model.tour[tour]!, model)}
              onScaleSwitch={(kind, on) =>
                kind === "convergence"
                  ? actions.setTrueScale(on)
                  : actions.setSagTrueScale(on)
              }
            />
          )}
        </>,
        hud,
      )}
    </div>
  );
}
