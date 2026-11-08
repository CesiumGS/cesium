import "./panel.css";
import "./story.css";
// The design globe's panel (DESIGN.md "Layout"), in Dyno's Controls column:
// the status, then the placement (the switch that morphs, the ghost, the
// exaggeration, Fly along and the sag chart), then the sites. The HUD goes
// to the host over the canvas. Tasks 19 and 20 add Measure and Checks
// between the placement and the sites (`children`).
import {
  Button,
  Snackbar,
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
              />
              <span>
                Compass at the cursor
                <span className="dg-toggle-hint dg-muted">
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
              />
              <span>
                Error ribbon
                <span className="dg-toggle-hint dg-muted">
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

/** The page's link, copied; the browser may refuse the clipboard. */
function CopyLink({
  actions,
  onDone,
}: {
  actions: PanelActions;
  onDone: (message: string) => void;
}) {
  return (
    <Button
      size="small"
      variant="text"
      startIcon={<Icon href={svgLink} aria-hidden />}
      onClick={() => {
        const link = actions.link();
        const clipboard = navigator.clipboard as Clipboard | undefined;
        if (clipboard === undefined) {
          onDone("Couldn't copy: this browser gives the page no clipboard");
          return;
        }
        clipboard.writeText(link).then(
          () => onDone("Link copied"),
          () => onDone("Couldn't copy: the browser refused the clipboard"),
        );
      }}
    >
      Copy link
    </Button>
  );
}

export function Panel({ source, live, actions, hud, children }: PanelProps) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  const [toast, setToast] = useState<string | undefined>();
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
        <CopyLink actions={actions} onDone={setToast} />
      </div>
      <PlacementSection model={model} live={live} actions={actions} />
      {children}
      <Sites sites={model.sites} actions={actions} />
      {model.checks !== undefined && (
        <Checks checks={model.checks} actions={actions} />
      )}
      <Slots />
      <Snackbar
        open={toast !== undefined}
        message={toast}
        autoHideDuration={3000}
        onClose={() => setToast(undefined)}
      />
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
