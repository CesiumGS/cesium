import "./panel.css";
import "./story.css";
import "./toolbar.css";
// The design globe's panel (DESIGN.md "Layout", owner's feedback round F),
// in Dyno's Controls column, calm by default:
//   1. the status, one quiet line once all is in, with Copy link;
//   2. the story of the selected site: its name and place, the placement
//      switch that morphs, the evidence (the corridor's opening
//      measurements, or the site's own story), the sag chart and Fly
//      along, and the tour's way in;
//   3. the site's facts, its frame's details folded;
//   4. the viewer's own measurement, once there is one;
//   5. the scale ladder;
//   6. the checks, folded to one line.
// Over the canvas (the HUD): the toolbar (measure and view), the cursor
// card, the legend, the anchor's label, the compass, the tour's card and
// the measure tool's labels.
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgLink } from "@stratakit/icons/link";
import { svgPathAnimationSingle } from "@stratakit/icons/path-animation-single";
import { svgStatusSuccess } from "@stratakit/icons/status-success";
import { svgStop } from "@stratakit/icons/stop";
import { Icon } from "@stratakit/mui";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "../page.ts";
import { Checks } from "./Checks.tsx";
import { AnchorLabel, CompassMark, CursorCard, Legend } from "./Hud.tsx";
import {
  Evidence,
  MeasureHud,
  YourMeasurement,
  type MeasureActions,
  type MeasureLiveSource,
  type MeasureSource,
} from "./Measure.tsx";
import type {
  LiveSource,
  PanelActions,
  PanelModel,
  SiteView,
} from "./model.ts";
import { SagChart } from "./SagChart.tsx";
import { SiteFacts, Sites } from "./Sites.tsx";
import { Status } from "./Status.tsx";
import { MeasureToolbar } from "./Toolbar.tsx";
import { TourCard, TourEntry } from "./Tour.tsx";

export interface ModelSource {
  subscribe(listener: () => void): () => void;
  get(): PanelModel;
}

export interface PanelProps {
  source: ModelSource;
  live: LiveSource;
  actions: PanelActions;
  /** Over the canvas: the HUD goes here. */
  hud: HTMLElement;
  /** The measure tool's model, labels and actions (Task 19). */
  measure: {
    readonly source: MeasureSource;
    readonly live: MeasureLiveSource;
    readonly actions: MeasureActions;
  };
}

const MODE_LABEL: Record<Placement, string> = {
  rigid: "Rigid at the anchor",
  reprojected: "Reprojected",
};

/** The placement switch and its one sentence. */
function Switch({
  model,
  actions,
}: {
  model: PanelModel;
  actions: PanelActions;
}) {
  return (
    <div className="dg-placement">
      <ToggleButtonGroup
        exclusive
        size="small"
        className="dg-switch"
        value={model.mode}
        aria-label="Placement"
        disabled={!model.switchable}
        onChange={(_, v: Placement | null) => v && actions.setMode(v)}
      >
        {(["rigid", "reprojected"] as const).map((m) => (
          <ToggleButton
            key={m}
            value={m}
            render={<Button variant="outlined" />}
          >
            <i className={`dg-dot ${m}`} aria-hidden />
            {MODE_LABEL[m]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <p className="dg-morph-state dg-muted" role="status" aria-live="polite">
        {model.morphing
          ? `Moving every vertex to ${model.mode === "rigid" ? "the rigid placement" : "its reprojected position"}…`
          : (model.switchNote ??
            (model.mode === "rigid"
              ? "One transform at the anchor, as most viewers place a model: the design sags off the globe away from it."
              : "Every vertex through the design CRS, as the design means it."))}
      </p>
    </div>
  );
}

/** A ladder site's story: its extent, rigid's error at its edge, the verdict. */
function SiteStoryLine({
  site,
  actions,
}: {
  site: SiteView;
  actions: PanelActions;
}) {
  const story = site.story;
  return (
    <div className="dg-site-story">
      {story === undefined ? (
        <p className="dg-muted">Its story comes with its frame.</p>
      ) : (
        <>
          <p
            className={`dg-ev-figure dg-num ${story.acceptable ? "" : "rigid"}`}
          >
            {story.edgeError}
          </p>
          <p className="dg-ev-caption">
            Rigid's error at the edge of a model {story.extent}
            {story.cause}.
          </p>
          <p className={`dg-verdict${story.acceptable ? " ok" : ""}`}>
            {story.acceptable && <Icon href={svgStatusSuccess} aria-hidden />}
            {story.verdict}
          </p>
        </>
      )}
      <p className="dg-muted dg-away-note">
        The opening measurements are the corridor's.{" "}
        <Button
          size="small"
          variant="text"
          onClick={() => actions.selectSite("corridor")}
        >
          Fly to the corridor
        </Button>
      </p>
    </div>
  );
}

/** The story area (DESIGN.md "The sidebar" 2). */
function Story({
  model,
  live,
  actions,
  measure,
}: {
  model: PanelModel;
  live: LiveSource;
  actions: PanelActions;
  measure: PanelProps["measure"];
}) {
  const site = model.sites.find((s) => s.selected);
  const corridor = site?.id === "corridor";
  const m = useSyncExternalStore(measure.source.subscribe, measure.source.get);
  const now = useSyncExternalStore(measure.live.subscribe, measure.live.get);
  return (
    <section className="dg-section dg-story-area" aria-labelledby="dg-story-h">
      <header className="dg-story-head">
        <Typography variant="subtitle-lg" render={<h2 id="dg-story-h" />}>
          {site?.name ?? "Highway corridor"}
        </Typography>
        {site !== undefined && (
          <span className="dg-muted dg-story-place">{site.place}</span>
        )}
      </header>
      <Switch model={model} actions={actions} />
      {corridor ? (
        <Evidence model={m} live={now} actions={measure.actions} />
      ) : (
        site !== undefined && <SiteStoryLine site={site} actions={actions} />
      )}
      {model.sag !== undefined && <SagChart sag={model.sag} live={live} />}
      {(model.flyAlong !== "hidden" || model.tour === undefined) && (
        <div className="dg-actions">
          {model.flyAlong === "running" ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => actions.stopFlight()}
              startIcon={<Icon href={svgStop} aria-hidden />}
            >
              Stop
            </Button>
          ) : (
            model.flyAlong !== "hidden" && (
              <Button
                size="small"
                variant="outlined"
                disabled={model.flyAlong === "unavailable"}
                title={
                  model.flyAlong === "unavailable"
                    ? "Once the corridor's frame is in"
                    : model.alongNote
                }
                onClick={() => actions.flyAlong()}
                startIcon={<Icon href={svgPathAnimationSingle} aria-hidden />}
              >
                Fly along to the anchor
              </Button>
            )
          )}
          {model.tour === undefined && <TourEntry actions={actions} />}
        </div>
      )}
    </section>
  );
}

/** The nearest ancestor of `el` that scrolls vertically, if any. */
function scroller(el: HTMLElement): HTMLElement | undefined {
  for (let p = el.parentElement; p !== null; p = p.parentElement) {
    const y = getComputedStyle(p).overflowY;
    if ((y === "auto" || y === "scroll") && p.scrollHeight > p.clientHeight) {
      return p;
    }
  }
  return undefined;
}

/**
 * After a Fly to or the tour's start (UX review S1): the story in view. In
 * the side layout the panel scrolls on its own, so it goes back to its top,
 * where the status line and then the story are (the top, not the story's
 * heading: the status grows and shrinks as the new site loads); where the
 * panel is under the view and the page scrolls (a phone), the page scrolls
 * to the view, where the flight and the tour's card are. At once under
 * reduced motion.
 */
function revealStory(story: HTMLElement, view: HTMLElement): void {
  const behavior: ScrollBehavior = matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches
    ? "auto"
    : "smooth";
  const box = scroller(story);
  if (box === undefined) {
    return;
  }
  if (box.contains(view)) {
    const top =
      view.getBoundingClientRect().top - box.getBoundingClientRect().top;
    if (top < 0 || top > box.clientHeight / 2) {
      box.scrollBy({ top, behavior });
    }
    return;
  }
  box.scrollTo({ top: 0, behavior });
}

/**
 * The page's link, copied. The button says so itself for two seconds, by
 * the button rather than in a corner far from it; the browser may refuse.
 */
function CopyLink({ actions }: { actions: PanelActions }) {
  const [said, setSaid] = useState<{ ok: boolean; text: string }>();
  const say = (ok: boolean, text: string) => {
    setSaid({ ok, text });
    setTimeout(() => setSaid(undefined), 2000);
  };
  return (
    <>
      <Button
        size="small"
        variant="text"
        startIcon={<Icon href={svgLink} aria-hidden />}
        className={said?.ok ? "dg-copied" : undefined}
        onClick={() => {
          const clipboard = navigator.clipboard as Clipboard | undefined;
          if (clipboard === undefined) {
            say(false, "Couldn't copy: no clipboard here");
            return;
          }
          clipboard.writeText(actions.link()).then(
            () => say(true, "Link copied"),
            () => say(false, "Couldn't copy: the browser refused"),
          );
        }}
      >
        {said?.text ?? "Copy link"}
      </Button>
      <span className="dg-visually-hidden" role="status">
        {said?.text ?? ""}
      </span>
    </>
  );
}

/** The HUD's measure parts: the toolbar and the labels over the globe. */
function MeasureOverlay({
  model,
  actions,
  measure,
}: {
  model: PanelModel;
  actions: PanelActions;
  measure: PanelProps["measure"];
}) {
  const m = useSyncExternalStore(measure.source.subscribe, measure.source.get);
  const now = useSyncExternalStore(measure.live.subscribe, measure.live.get);
  return (
    <>
      <MeasureToolbar
        model={model}
        measure={m}
        actions={actions}
        measureActions={measure.actions}
      />
      <MeasureHud live={now} datasheet={m.datasheet} />
    </>
  );
}

export function Panel({ source, live, actions, hud, measure }: PanelProps) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  const m = useSyncExternalStore(measure.source.subscribe, measure.source.get);
  const site = model.sites.find((s) => s.selected);
  const panel = useRef<HTMLDivElement>(null);
  const touring = model.tour !== undefined;
  const last = useRef({ site: site?.id, touring });
  useEffect(() => {
    const before = last.current;
    last.current = { site: site?.id, touring };
    const story =
      panel.current?.querySelector<HTMLElement>(".dg-story-area") ?? null;
    if (
      story !== null &&
      (before.site !== site?.id || (touring && !before.touring))
    ) {
      revealStory(story, hud);
    }
  }, [site?.id, touring, hud]);
  return (
    <div className="dg-panel" ref={panel}>
      <div className="dg-bar">
        <Status items={model.loading} actions={actions} />
        <CopyLink actions={actions} />
      </div>
      {model.tour !== undefined && (
        <p className="dg-muted dg-bar-note">
          On the tour: {model.tour.progress.toLowerCase()}
        </p>
      )}
      <Story model={model} live={live} actions={actions} measure={measure} />
      {site !== undefined && <SiteFacts site={site} />}
      <YourMeasurement model={m} actions={measure.actions} />
      <Sites sites={model.sites} actions={actions} />
      {model.checks !== undefined && (
        <Checks checks={model.checks} actions={actions} />
      )}
      {createPortal(
        <>
          <MeasureOverlay model={model} actions={actions} measure={measure} />
          {/* The right rail: the cursor card over the legend; it steps
              left, under the toolbar, when the pointer is under it. */}
          <div
            className={`dg-hud-rail${model.cursor.aside ? " aside" : ""}`}
            onPointerEnter={() => actions.holdRail(true)}
            onPointerLeave={() => actions.holdRail(false)}
          >
            <CursorCard cursor={model.cursor} />
            {model.drawn && <Legend legend={model.legend} />}
          </div>
          <AnchorLabel live={live} />
          {model.cursor.compass !== undefined && (
            <CompassMark compass={model.cursor.compass} />
          )}
          {model.tour !== undefined && (
            <TourCard card={model.tour} actions={actions} />
          )}
        </>,
        hud,
      )}
    </div>
  );
}
