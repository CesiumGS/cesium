// Over the globe (DESIGN.md "On the globe"), always dark: the cursor's
// readout top right (the rigid error under the cursor, or why there are no
// design coordinates), the legend bottom right, and the anchor ring's label.
import { useSyncExternalStore } from "react";
import { WHISKER_RAMP } from "../overlays.ts";
import type { CursorView, LegendView, LiveSource } from "./model.ts";

export function CursorCard({ cursor }: { cursor: CursorView }) {
  return (
    <div
      className={`dg-hud dg-hud-cursor${cursor.muted ? " muted" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="dg-hud-title">At the cursor</span>
      <span>{cursor.text}</span>
      {cursor.coordinates !== undefined && (
        <span className="dg-num dg-hud-coords">{cursor.coordinates}</span>
      )}
      {cursor.tolerance !== undefined && (
        <span className="dg-hud-muted dg-num">{cursor.tolerance}</span>
      )}
    </div>
  );
}

export function Legend({ legend }: { legend: LegendView }) {
  const solid = legend.solid === "rigid" ? "rigid" : "reprojected";
  const ghost = solid === "rigid" ? "reprojected" : "rigid";
  return (
    <div className="dg-hud dg-hud-legend" aria-label="Legend">
      <div className="dg-key">
        <i className={`dg-swatch solid ${solid}`} aria-hidden />
        <span>{legend.solidText}</span>
      </div>
      {legend.ghostText !== undefined && (
        <div className="dg-key">
          <i className={`dg-swatch line ${ghost}`} aria-hidden />
          <span>{legend.ghostText}</span>
        </div>
      )}
      {legend.whiskers !== undefined && (
        <div className="dg-key dg-key-ramp">
          <i
            className="dg-ramp"
            aria-hidden
            style={{
              background: `linear-gradient(to right, ${WHISKER_RAMP.join(", ")})`,
            }}
          />
          <span className="dg-num">
            Rigid error every 1,000 ftUS: {legend.whiskers.min} to{" "}
            {legend.whiskers.max}
          </span>
        </div>
      )}
      {legend.anchor && (
        <div className="dg-key">
          <i className="dg-swatch ring" aria-hidden />
          <span>The anchor: the placements agree here</span>
        </div>
      )}
      {legend.exaggeration !== 1 && (
        <div className="dg-key dg-key-warn">
          Errors drawn ×{legend.exaggeration}, not to scale
        </div>
      )}
    </div>
  );
}

export function AnchorLabel({ live }: { live: LiveSource }) {
  const { anchor } = useSyncExternalStore(live.subscribe, live.get);
  if (anchor === undefined) {
    return null;
  }
  return (
    <div
      className="dg-globe-label"
      style={{ transform: `translate(${anchor.x}px, ${anchor.y}px)` }}
      aria-hidden
    >
      <span>Anchor</span>
    </div>
  );
}
