// Over the globe (DESIGN.md "The viewer"), always dark: the cursor's card
// top right (the design and globe coordinates under the cursor and the
// rigid error there, or why there are none), the legend bottom right, and
// the anchor ring's label.
import { useEffect, useState, useSyncExternalStore } from "react";
import { WHISKER_RAMP } from "../colors.ts";
import type {
  CompassView,
  CoordinateBlock,
  CursorView,
  LegendView,
  LiveSource,
} from "./model.ts";

/** How long the cursor's readout must rest before a screen reader hears it, ms. */
const ANNOUNCE_AFTER_MS = 1000;

/** One block of the card: its title, its note, and label | value | unit rows. */
function Block({ block }: { block: CoordinateBlock }) {
  return (
    <div className="dg-cc-block">
      <span className="dg-cc-title">{block.title}</span>
      <dl className="dg-cc-rows dg-num">
        {block.rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              {r.value}
              <span className="dg-cc-unit">{r.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      {block.note !== undefined && (
        <span className="dg-cc-note">{block.note}</span>
      )}
    </div>
  );
}

/**
 * The cursor's readout (feedback F12), a compact card: the design
 * coordinates (E, N, H in the CRS's units) beside the globe's (latitude,
 * longitude, ellipsoidal height), so moving the cursor shows the design
 * space reprojected; then the error, one line. Not a live region: it
 * changes with every pointer move. A screen reader hears it once it has
 * rested a second (or, for the keyboard, after Enter places the
 * crosshair's pick), politely, through a separate hidden region (Task 20
 * fix 1, page I4).
 */
export function CursorCard({ cursor }: { cursor: CursorView }) {
  const said = [cursor.text, cursor.coordinates, cursor.compass?.text]
    .filter((x) => x !== undefined)
    .join(" ");
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(said), ANNOUNCE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [said]);
  const pick = cursor.design !== undefined;
  return (
    <div
      className={`dg-hud dg-hud-cursor${cursor.muted ? " muted" : ""}${pick ? " has-pick" : ""}${cursor.aside ? " aside" : ""}`}
      role="group"
      aria-label="At the cursor"
    >
      {pick && (
        <div className="dg-cc-blocks" aria-hidden>
          <Block block={cursor.design!} />
          {cursor.globe !== undefined && <Block block={cursor.globe} />}
        </div>
      )}
      <span className={`dg-cc-say${pick ? "" : " idle"}`} aria-hidden>
        {cursor.text}
      </span>
      {cursor.tolerance !== undefined && (
        <span className="dg-cc-note dg-num" aria-hidden>
          {cursor.tolerance}
        </span>
      )}
      {cursor.compass !== undefined && (
        <span className="dg-num dg-hud-compass-text" aria-hidden>
          {cursor.compass.text}
        </span>
      )}
      <span className="dg-visually-hidden" aria-live="polite">
        {announced}
      </span>
    </div>
  );
}

/** The needles' length, CSS pixels. */
const NEEDLE = 30;
/** The compass stands off the cursor, down and to the left, clear of the snap glyph and its label. */
const OFFSET = { x: -64, y: 56 };

/**
 * The convergence compass by the picked point: true north (white, "N") and
 * grid north (the design CRS's, cyan) as the view projects them there. A
 * degree or so apart, the needles nearly coincide: the label under it, and
 * the cursor card, say the angle; the dial says which way north is.
 */
export function CompassMark({ compass }: { compass: CompassView }) {
  const size = 2 * (NEEDLE + 12);
  const c = size / 2;
  const tip = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [c + Math.sin(a) * r, c - Math.cos(a) * r] as const;
  };
  const needle = (deg: number | undefined, cls: string) => {
    if (deg === undefined) {
      return null;
    }
    const [x, y] = tip(deg, NEEDLE);
    return (
      <g className={cls}>
        <line x1={c} y1={c} x2={x} y2={y} />
        <circle cx={x} cy={y} r={2.5} />
      </g>
    );
  };
  const n =
    compass.trueNorth !== undefined
      ? tip(compass.trueNorth, NEEDLE + 9)
      : undefined;
  // Away from the view's bottom (the time controls) and its right edge.
  const dy = compass.y > compass.height - 200 ? -OFFSET.y - 24 : OFFSET.y;
  const dx = compass.x < 120 ? -OFFSET.x : OFFSET.x;
  return (
    <div
      className="dg-compass"
      style={{
        transform: `translate(${compass.x + dx - c}px, ${compass.y + dy - c}px)`,
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="dg-compass-ring" cx={c} cy={c} r={NEEDLE} />
        {needle(compass.gridNorth, "dg-compass-grid")}
        {needle(compass.trueNorth, "dg-compass-true")}
        {n !== undefined && (
          <text
            className="dg-compass-n"
            x={n[0]}
            y={n[1]}
            textAnchor="middle"
            dominantBaseline="central"
          >
            N
          </text>
        )}
        <circle className="dg-compass-hub" cx={c} cy={c} r={2.5} />
      </svg>
      <span className="dg-compass-label dg-num">
        {compass.trueNorth === undefined
          ? `${compass.short} (north is end-on here)`
          : compass.short}
      </span>
    </div>
  );
}

export function Legend({ legend }: { legend: LegendView }) {
  const solid = legend.solid === "rigid" ? "rigid" : "reprojected";
  const ghost = solid === "rigid" ? "reprojected" : "rigid";
  const [open, setOpen] = useState(false);
  return (
    <div className="dg-hud dg-hud-legend" aria-label="Legend">
      <button
        type="button"
        className="dg-legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Legend {open ? "▾" : "▸"}
      </button>
      <div className="dg-legend-body" data-open={open}>
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
              Rigid's error, from where it truly is: {legend.whiskers.min} to{" "}
              {legend.whiskers.max}
            </span>
          </div>
        )}
        {legend.ribbon !== undefined && (
          <div className="dg-key dg-key-ramp">
            <i
              className="dg-ramp tall"
              aria-hidden
              style={{
                background: `linear-gradient(to right, ${WHISKER_RAMP.join(", ")})`,
              }}
            />
            <span className="dg-num">
              Error ribbon, the ground tinted by rigid's error:{" "}
              {legend.ribbon.min} to {legend.ribbon.max}
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
