import "./panel.css";
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
import { svgPathAnimationSingle } from "@stratakit/icons/path-animation-single";
import { svgStop } from "@stratakit/icons/stop";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "../page.ts";
import { AnchorLabel, CursorCard, Legend } from "./Hud.tsx";
import type { LiveSource, PanelActions, PanelModel } from "./model.ts";
import { SagChart } from "./SagChart.tsx";
import { Sites } from "./Sites.tsx";
import { Status } from "./Status.tsx";

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
              : "From 20 km out, where rigid is farthest off, down the corridor."}
          </span>
        </div>
      )}
    </section>
  );
}

export function Panel({ source, live, actions, hud, children }: PanelProps) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  return (
    <div className="dg-panel">
      <Status items={model.loading} actions={actions} />
      <PlacementSection model={model} live={live} actions={actions} />
      {children}
      <Sites sites={model.sites} actions={actions} />
      {createPortal(
        <>
          <CursorCard cursor={model.cursor} />
          <Legend legend={model.legend} />
          <AnchorLabel live={live} />
        </>,
        hud,
      )}
    </div>
  );
}
