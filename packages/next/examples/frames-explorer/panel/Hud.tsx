// The globe's HUD (R14, R17): the legend at the bottom right, listing every
// active overlay with its accuracy (R8: accuracy is never shown only in the
// panel), and the tour's caption at the top right. Both are rendered from
// the panel's React tree into the viewer's container (main.ts makes the
// host), clear of Dyno's inspector (top left) and credits (bottom left). The
// HUD exception (DESIGN.md) covers only the family and axis colors; surfaces
// and type are StrataKit's tokens.
import { Button, IconButton, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronUp } from "@stratakit/icons/chevron-up";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgLink } from "@stratakit/icons/link";
import { Icon } from "@stratakit/mui";
import { useLayoutEffect, useState } from "react";
import type { Family } from "./families.ts";
import type { OverlayView, PanelModel, TourStop } from "./model.ts";

const OVERLAY_FAMILY: Partial<Record<OverlayView["id"], Family>> = {
  designGrid: "engineering",
  siteGrid: "engineering",
  rigidVsExact: "engineering",
  roundTrip: "engineering",
  distortion: "engineering",
  orion: "trajectory",
  bias: "celestial",
};

/**
 * Keeps the HUD clear of the viewer's time controls (bottom centre, one or
 * two rows as the view's width allows): `--fx-hud-bottom` on the host is the
 * room they take, so the legend sits above them.
 */
export function useClearOfTimeControls(host: HTMLElement) {
  useLayoutEffect(() => {
    const view = host.parentElement;
    if (!view) {
      return;
    }
    const measure = () => {
      const time = view.querySelector<HTMLElement>(".cesium-time");
      const bottom = view.getBoundingClientRect().bottom;
      const top = time?.getBoundingClientRect().top;
      host.style.setProperty(
        "--fx-hud-bottom",
        `${top === undefined ? 12 : Math.max(12, bottom - top + 12)}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(view);
    const time = view.querySelector(".cesium-time");
    if (time) {
      observer.observe(time);
    }
    return () => observer.disconnect();
  }, [host]);
}

export function GlobeLegend({
  model,
  host,
}: {
  model: PanelModel;
  host: HTMLElement;
}) {
  // Folded on a narrow view, where it would cover the globe.
  const [open, setOpen] = useState(() => host.clientWidth >= 560);
  const active = model.overlays.filter((o) => o.on && o.state !== "missing");
  if (active.length === 0) {
    return null;
  }
  return (
    <section className="fx-hud fx-legend" aria-label="Legend">
      <div className="fx-legend-head">
        <Typography variant="subtitle-sm" render={<h2 />} className="fx-strong">
          On the globe
        </Typography>
        <IconButton
          size="small"
          aria-expanded={open}
          aria-label={open ? "Fold the legend" : "Unfold the legend"}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon href={open ? svgChevronDown : svgChevronUp} />
        </IconButton>
      </div>
      {open && (
        <>
          <ul className="fx-legend-list">
            {active.map((o) => (
              <li key={o.id}>
                {o.id === "triads" ? (
                  <span className="fx-axes" aria-hidden>
                    <span className="fx-axis-x" />
                    <span className="fx-axis-y" />
                    <span className="fx-axis-z" />
                  </span>
                ) : (
                  <span
                    className={`fx-swatch fx-swatch-line fx-family-${OVERLAY_FAMILY[o.id] ?? "earth"}`}
                    aria-hidden
                  />
                )}
                <span className="fx-legend-text">
                  <span className="fx-legend-name">
                    {o.label}
                    {o.state === "waiting" && (
                      <span className="fx-muted"> (fetching)</span>
                    )}
                  </span>
                  <span
                    className={`fx-legend-acc${o.unbounded ? " fx-unbounded" : ""}`}
                  >
                    {o.accuracy}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {active.some((o) => o.id === "triads") && (
            <p className="fx-legend-note">
              Axes x <span className="fx-axis-word fx-axis-word-x">red</span>, y{" "}
              <span className="fx-axis-word fx-axis-word-y">green</span>, z{" "}
              <span className="fx-axis-word fx-axis-word-z">blue</span>;{" "}
              {model.triadScale}.
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function TourCaption({
  tour,
  stop,
  onStop,
  onEnd,
  onCopyLink,
}: {
  tour: readonly TourStop[];
  stop: number;
  onStop: (index: number) => void;
  onEnd: () => void;
  onCopyLink: (stop: TourStop) => void;
}) {
  const s = tour[stop]!;
  return (
    <section className="fx-hud fx-tour" aria-label="Tour" aria-live="polite">
      <div className="fx-tour-head">
        <Typography
          variant="caption-lg"
          color="textSecondary"
          render={<span />}
        >
          Stop {stop + 1} of {tour.length}
        </Typography>
        <IconButton
          size="small"
          aria-label="End the tour"
          title="End the tour"
          onClick={onEnd}
        >
          <Icon href={svgDismiss} />
        </IconButton>
      </div>
      <Typography variant="subtitle-md" render={<h2 />} className="fx-strong">
        {s.title}
      </Typography>
      <Typography variant="body-sm" render={<p />}>
        {s.caption}
      </Typography>
      <div className="fx-tour-buttons">
        <IconButton
          size="small"
          aria-label="Copy a link to this stop"
          title="Copy a link to this stop"
          onClick={() => onCopyLink(s)}
        >
          <Icon href={svgLink} />
        </IconButton>
        <span className="fx-tour-steps">
          <Button
            size="small"
            variant="outlined"
            disabled={stop === 0}
            onClick={() => onStop(stop - 1)}
          >
            Back
          </Button>
          {stop < tour.length - 1 ? (
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={() => onStop(stop + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="primary"
              onClick={onEnd}
            >
              Finish
            </Button>
          )}
        </span>
      </div>
    </section>
  );
}
