// The globe's HUD (R14, R17): the legend at the bottom right, listing every
// overlay that is drawn with its accuracy (R8: accuracy is never shown only
// in the panel), and the tour's caption at the top right (at the bottom on a
// narrow view). Both are rendered from the panel's React tree into the
// viewer's container (main.ts makes the host), clear of Dyno's inspector
// (top left) and credits (bottom left). The HUD is dark in either scheme, as
// the viewer's own widgets are (I16): panel.css points its StrataKit tokens
// at the viewer's HUD theme.
import {
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgChevronUp } from "@stratakit/icons/chevron-up";
import { svgDismiss } from "@stratakit/icons/dismiss";
import { svgLink } from "@stratakit/icons/link";
import { Icon } from "@stratakit/mui";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { captionFold, focusAfter, foldReducer } from "./fold.ts";
import { legendRows } from "./legendRows.ts";
import type { PanelModel, TourStop } from "./model.ts";
import type { TourScaleSwitch } from "./tourScale.ts";

/** Below this view width the HUD goes compact: legend folded, the caption at the bottom (I18). */
export { NARROW_VIEW } from "../content.ts";

/**
 * Keeps the HUD clear of the viewer's time controls (bottom centre, one or
 * two rows as the view's width allows): `--fx-hud-bottom` on the host is the
 * room they take, so the legend sits above them. Returns the view's width.
 */
export function useHudLayout(host: HTMLElement): number {
  const [width, setWidth] = useState(() => host.clientWidth);
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
      setWidth(view.clientWidth);
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
  return width;
}

/**
 * The legend (I17): compact by default, one line per drawn overlay (its
 * swatch, name and accuracy, ellipsized, the full line on hover and focus);
 * unfolded, the full lines and the triads' note.
 */
export function GlobeLegend({ model }: { model: PanelModel }) {
  const [open, setOpen] = useState(false);
  const drawn = model.overlays.filter((o) => o.on && o.state === "drawn");
  if (drawn.length === 0) {
    return null;
  }
  return (
    <section
      className={`fx-hud fx-legend${open ? " fx-legend-open" : ""}`}
      aria-label="Legend"
    >
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
      <ul className="fx-legend-list">
        {legendRows(drawn).map((row) => (
          <li
            key={row.key}
            tabIndex={open ? undefined : 0}
            title={`${row.label}: ${row.accuracy}`}
          >
            {row.line === "axes" ? (
              <span className="fx-axes" aria-hidden>
                <span className="fx-axis-x" />
                <span className="fx-axis-y" />
                <span className="fx-axis-z" />
              </span>
            ) : (
              <span
                className={`fx-line-key fx-line-${row.line} ${row.tone === "white" ? "fx-line-white" : `fx-family-${row.family}`}`}
                aria-hidden
              />
            )}
            <span className="fx-legend-text">
              <span className="fx-legend-name">
                {open ? row.label : row.name}
              </span>
              <span
                className={`fx-legend-acc${row.attention ? " fx-unbounded" : ""}`}
              >
                {row.accuracy}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {open && drawn.some((o) => o.id === "triads") && (
        <p className="fx-legend-note">
          Axes x <span className="fx-axis-word fx-axis-word-x">red</span>, y{" "}
          <span className="fx-axis-word fx-axis-word-y">green</span>, z{" "}
          <span className="fx-axis-word fx-axis-word-z">blue</span>;{" "}
          {model.triadScale}.
        </p>
      )}
    </section>
  );
}

/**
 * The tour's caption (I18): focus moves to its heading at each stop; Escape
 * ends the tour (focus back to "Take the tour"); the arrow keys step. On a
 * narrow view it starts folded to one row (the stop, its title and the
 * steps), so it doesn't cover the lower half of the subject (F42); the
 * chevron unfolds the caption and the link, and the choice holds across
 * stops.
 */
export function TourCaption({
  tour,
  stop,
  narrow,
  onStop,
  onEnd,
  onCopyLink,
  scaleSwitch,
  onScaleSwitch,
}: {
  tour: readonly TourStop[];
  stop: number;
  narrow: boolean;
  onStop: (index: number) => void;
  onEnd: () => void;
  onCopyLink: (stop: TourStop) => void;
  /** The stop's "Show true scale" switch, where it exaggerates (`tourScaleSwitch`). */
  scaleSwitch?: TourScaleSwitch;
  onScaleSwitch?: (kind: TourScaleSwitch["kind"], on: boolean) => void;
}) {
  const s = tour[stop]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const [foldState, dispatch] = useReducer(foldReducer, undefined, () =>
    foldReducer(undefined, { type: "init" }),
  );
  const view = captionFold(narrow, foldState.unfolded);
  const folded = view.folded;
  const bodyId = useId();
  useEffect(() => {
    dispatch({ type: "stop" });
    if (focusAfter({ type: "stop" }) === "heading") {
      heading.current?.focus({ preventScroll: true, focusVisible: false });
    }
  }, [stop]);
  // The heading moves between the row and the caption as it folds: focus
  // stays on the toggle (F42).
  const toggled = useRef(false);
  useEffect(() => {
    if (toggled.current && focusAfter({ type: "toggle" }) === "toggle") {
      toggleButton.current?.focus();
    }
    toggled.current = false;
  }, [foldState]);
  const steps = (
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
  );
  const fold = view.toggle && (
    <IconButton
      ref={toggleButton}
      size="small"
      aria-expanded={view.toggle.expanded}
      aria-controls={bodyId}
      aria-label={view.toggle.label}
      title={view.toggle.label}
      onClick={() => {
        toggled.current = true;
        dispatch({ type: "toggle" });
      }}
    >
      <Icon href={view.toggle.expanded ? svgChevronDown : svgChevronUp} />
    </IconButton>
  );
  const end = (
    <IconButton
      size="small"
      aria-label="End the tour"
      title="End the tour (Escape)"
      onClick={onEnd}
    >
      <Icon href={svgDismiss} />
    </IconButton>
  );
  return (
    <section
      className={`fx-hud fx-tour${narrow ? " fx-tour-narrow" : ""}${folded ? " fx-tour-folded" : ""}`}
      aria-label="Tour"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onEnd();
        } else if (e.key === "ArrowRight" && stop < tour.length - 1) {
          onStop(stop + 1);
        } else if (e.key === "ArrowLeft" && stop > 0) {
          onStop(stop - 1);
        }
      }}
    >
      <div className="fx-tour-head">
        {/* Colors by token class, never MUI's color prop: the HUD is dark
            in either scheme and MUI's palette follows the page (N2). */}
        <Typography
          variant="caption-lg"
          render={<span />}
          className="fx-hud-muted fx-tour-count"
        >
          Stop {stop + 1} of {tour.length}
        </Typography>
        {view.titleInRow && (
          <Typography
            variant="body-sm"
            render={<h2 ref={heading} tabIndex={-1} title={s.title} />}
            className="fx-strong fx-tour-title"
          >
            {s.title}
          </Typography>
        )}
        <span className="fx-tour-head-actions">
          {folded && steps}
          {fold}
          {end}
        </span>
      </div>
      {!view.titleInRow && (
        <Typography
          variant="subtitle-md"
          render={<h2 ref={heading} tabIndex={-1} />}
          className="fx-strong fx-tour-title"
        >
          {s.title}
        </Typography>
      )}
      <div id={bodyId} className="fx-tour-body" hidden={view.bodyHidden}>
        <Typography variant="body-sm" render={<p />}>
          {s.caption}
        </Typography>
        {scaleSwitch && (
          <FormControlLabel
            className="fx-tour-scale"
            control={
              <Switch
                size="small"
                checked={scaleSwitch.checked}
                onChange={(_, on) => onScaleSwitch?.(scaleSwitch.kind, on)}
              />
            }
            label={<span className="fx-option-label">{scaleSwitch.label}</span>}
          />
        )}
        <div className="fx-tour-buttons">
          <IconButton
            size="small"
            aria-label="Copy a link to this stop"
            title="Copy a link to this stop"
            onClick={() => onCopyLink(s)}
          >
            <Icon href={svgLink} />
          </IconButton>
          {steps}
        </div>
      </div>
    </section>
  );
}
