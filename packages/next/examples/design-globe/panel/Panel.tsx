import "./panel.css";
import "./story.css";
// The design globe's panel (DESIGN.md "Layout"), in Dyno's Controls column:
// the status, then the placement (the switch that morphs, the ghost, the
// exaggeration, Fly along and the sag chart), then the sites. The HUD goes
// to the host over the canvas. Tasks 19 and 20 add Measure and Checks
// between the placement and the sites (`children`).
import {
  Button,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgLink } from "@stratakit/icons/link";
import { svgPathAnimationSingle } from "@stratakit/icons/path-animation-single";
import { svgStop } from "@stratakit/icons/stop";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "../page.ts";
import { Checks } from "./Checks.tsx";
import { AnchorLabel, CompassMark, CursorCard, Legend } from "./Hud.tsx";
import type { LiveSource, PanelActions, PanelModel } from "./model.ts";
import { SagChart } from "./SagChart.tsx";
import { Sites } from "./Sites.tsx";
import { Slots } from "./Slots.tsx";
import { Status } from "./Status.tsx";
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
  /** More sections, after the placement (Tasks 19 and 20). */
  children?: ReactNode;
}

const MODE_LABEL: Record<Placement, string> = {
  rigid: "Rigid at the anchor",
  reprojected: "Reprojected",
};

function PlacementSection({
  model,
  actions,
}: {
  model: PanelModel;
  actions: PanelActions;
}) {
  const id = useId();
  return (
    <section className="dg-section" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        Placement
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        className="dg-switch"
        value={model.mode}
        aria-labelledby={`${id}-h`}
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
    </section>
  );
}

/**
 * On the globe (Task 20 fix 1, I8): the placement's toggles, the viewer
 * toggles, the sag chart and Fly along, after the measurements, so the
 * headline numbers come first.
 */
function GlobeSection({
  model,
  live,
  actions,
}: {
  model: PanelModel;
  live: LiveSource;
  actions: PanelActions;
}) {
  const id = useId();
  return (
    <section className="dg-section" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        On the globe
      </Typography>
      <div className="dg-toggles">
        <label className="dg-toggle">
          <Switch
            size="small"
            disabled={!model.switchable}
            checked={model.ghost}
            onChange={(_, on) => actions.setGhost(on)}
          />
          <span>Show the other placement</span>
        </label>
        <label className="dg-toggle">
          <Switch
            size="small"
            disabled={!model.switchable}
            checked={model.exaggerate}
            onChange={(_, on) => actions.setExaggerate(on)}
          />
          <span>
            Exaggerate the error
            {model.exaggerate && (
              <span className="dg-factor dg-num"> ×{model.exaggeration}</span>
            )}
          </span>
        </label>
        {model.view !== undefined && (
          <>
            <label className="dg-toggle two-line">
              <Switch
                size="small"
                checked={model.view.compass}
                onChange={(_, on) => actions.setCompass(on)}
                slotProps={{ input: { "aria-describedby": `${id}-compass` } }}
              />
              <span>
                Compass at the cursor
                <span id={`${id}-compass`} className="dg-toggle-hint dg-muted">
                  Grid north against true north where you point
                </span>
              </span>
            </label>
            <label className="dg-toggle two-line">
              <Switch
                size="small"
                disabled={!model.view.ribbonReady}
                checked={model.view.ribbon}
                onChange={(_, on) => actions.setRibbon(on)}
                slotProps={{ input: { "aria-describedby": `${id}-ribbon` } }}
              />
              <span>
                Error ribbon
                <span id={`${id}-ribbon`} className="dg-toggle-hint dg-muted">
                  {model.view.ribbonReady
                    ? "The ground under the corridor tinted by rigid's error"
                    : "Once the corridor's frame is in"}
                </span>
              </span>
            </label>
          </>
        )}
      </div>
      {model.sag !== undefined && <SagChart sag={model.sag} live={live} />}
      {model.flyAlong !== "hidden" && (
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
            <Button
              size="small"
              variant="outlined"
              disabled={model.flyAlong === "unavailable"}
              onClick={() => actions.flyAlong()}
              startIcon={<Icon href={svgPathAnimationSingle} aria-hidden />}
            >
              Fly along to the anchor
            </Button>
          )}
          <span className="dg-muted dg-actions-note">
            {model.flyAlong === "unavailable"
              ? "Once the corridor's frame is in."
              : (model.alongNote ?? "Down the corridor to the anchor.")}
          </span>
        </div>
      )}
    </section>
  );
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

export function Panel({ source, live, actions, hud, children }: PanelProps) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  return (
    <div className="dg-panel">
      <Status items={model.loading} actions={actions} />
      <div className="dg-bar">
        {model.tour === undefined ? (
          <TourEntry actions={actions} />
        ) : (
          <span className="dg-muted dg-bar-note">
            On the tour: {model.tour.progress.toLowerCase()}
          </span>
        )}
        <CopyLink actions={actions} />
      </div>
      <PlacementSection model={model} actions={actions} />
      {children}
      <GlobeSection model={model} live={live} actions={actions} />
      <Sites sites={model.sites} actions={actions} />
      {model.checks !== undefined && (
        <Checks checks={model.checks} actions={actions} />
      )}
      <Slots />
      {createPortal(
        <>
          <CursorCard cursor={model.cursor} />
          {model.drawn && <Legend legend={model.legend} />}
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
