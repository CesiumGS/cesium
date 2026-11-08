import "./measure.css";
// The measurements (DESIGN.md "The sidebar"): the openers as the story's
// evidence rows, each a headline number with its caption, Show and a
// Details disclosure holding the rest; the user's own measurement once
// there is one, with how exact it is folded; and the labels over the globe
// (`MeasureHud`): the design-distance pills, the ends, the station marker,
// NGS's survey disk (its datasheet on hover or focus), the snap preview
// and the keyboard's crosshair. The snap mode and Clear are the toolbar's
// (Toolbar.tsx, feedback F8).
import { Button, Typography } from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId, useState } from "react";
import type { MeasureLive } from "../measureLabels.ts";
import type { GlobeTone, OpenerFigures, OpenerId } from "../measureOpeners.ts";
import type {
  DatasheetView,
  DetailRow,
  MeasurePanel,
  OpenerPanel,
} from "../measureView.ts";
import type { SnapMode } from "../page.ts";

export interface MeasureSource {
  subscribe(listener: () => void): () => void;
  get(): MeasurePanel;
}
export interface MeasureLiveSource {
  subscribe(listener: () => void): () => void;
  get(): MeasureLive;
}
export interface MeasureActions {
  setSnap(mode: SnapMode): void;
  clear(): void;
  pointAtCentre(): void;
  show(id: OpenerId): void;
  /** Flies close to the ruler's far end, where its gap shows. */
  closeInOnRuler(): void;
  /** Measures again after `measure` failed. */
  retryMeasure(): void;
  /** Selects the corridor (its openers), flying there. */
  toCorridor(): void;
}

function Details({
  rows,
  label = "Details",
  children,
}: {
  rows: readonly DetailRow[];
  label?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (rows.length === 0 && children === undefined) {
    return null;
  }
  return (
    <div className="dg-m-details">
      <button
        type="button"
        className="dg-m-disclose"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Icon href={svgChevronDown} aria-hidden className="dg-m-caret" />
        {label}
      </button>
      {open && (
        <div id={id} className="dg-m-more">
          <dl className="dg-facts dg-num">
            {rows.map((r) => (
              <Row key={r.label} row={r} />
            ))}
          </dl>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ row }: { row: DetailRow }) {
  return (
    <>
      <dt>{row.label}</dt>
      <dd>{row.value}</dd>
    </>
  );
}

/** The design and true distances, side by side and labelled. */
function Distances({
  design,
  designLabel = "Design distance",
  slope,
  trueDistance,
  small,
}: {
  design: string;
  designLabel?: string | undefined;
  slope?: string | undefined;
  trueDistance: string;
  small?: boolean;
}) {
  return (
    <dl className={`dg-m-pair dg-num${small ? " small" : ""}`}>
      <div>
        <dt>{designLabel}</dt>
        <dd>
          {design}
          {slope !== undefined && (
            <span className="dg-m-slope dg-muted">{slope} slope</span>
          )}
        </dd>
      </div>
      <div>
        <dt>True distance</dt>
        <dd>{trueDistance}</dd>
      </div>
    </dl>
  );
}

function Globe({ text, tone }: { text: string; tone: GlobeTone }) {
  return (
    <p className={`dg-m-globe ${tone}`}>
      {(tone === "rigid" || tone === "reprojected") && (
        <i className={`dg-dot ${tone}`} aria-hidden />
      )}
      <span>{text}</span>
    </p>
  );
}

/** Why `measure` failed here, with Retry. */
function Failed({
  error,
  actions,
}: {
  error: string;
  actions: MeasureActions;
}) {
  return (
    <div className="dg-m-failed" role="alert">
      <span>Couldn't measure this: {error}</span>
      <Button
        size="small"
        variant="outlined"
        onClick={() => actions.retryMeasure()}
      >
        Retry
      </Button>
    </div>
  );
}

/** One opener as an evidence row: its headline, its caption, Show, and Details. */
function Opener({
  opener,
  figures,
  datasheet,
  actions,
}: {
  opener: OpenerPanel;
  figures: OpenerFigures | undefined;
  datasheet: DatasheetView | undefined;
  actions: MeasureActions;
}) {
  const id = useId();
  // The line as drawn changes every frame of a morph: the live figures.
  const f = figures ?? opener;
  const pair = opener.id === "pair";
  return (
    <li className="dg-ev" aria-labelledby={id}>
      <div className="dg-ev-row">
        {pair ? (
          <span className="dg-ev-figure dg-num">{opener.design}</span>
        ) : (
          <>
            {/* Every frame of a morph, so not announced: the region below says it once settled. */}
            <span className={`dg-ev-figure dg-num ${f.tone}`}>
              {f.hero ?? "Not to scale"}
            </span>
            <span className="dg-visually-hidden" aria-live="polite">
              {opener.tone === "moving"
                ? ""
                : `${opener.title}: ${opener.hero ?? "not to scale"}.`}
            </span>
          </>
        )}
        <Button
          size="small"
          variant="text"
          className="dg-ev-show"
          aria-label={`Show ${opener.title} on the globe`}
          onClick={() => actions.show(opener.id)}
        >
          Show
        </Button>
      </div>
      <h3 id={id} className="dg-ev-title">
        {opener.title}
      </h3>
      <p className="dg-ev-caption">
        {pair
          ? `${opener.designLabel ?? "Design distance"}; true distance ${opener.trueDistance}, the same in both placements.`
          : (f.heroCaption ??
            "Rigid draws the station this far from where its own design puts it.")}
      </p>
      {opener.error !== undefined && (
        <Failed error={opener.error} actions={actions} />
      )}
      <Details rows={opener.details}>
        {opener.id === "marker" ? (
          <p className="dg-m-said dg-num">{f.globe}</p>
        ) : (
          <>
            {opener.id === "mark" && (
              <>
                <Globe text={f.globe} tone={f.tone} />
                <Distances
                  design={opener.design}
                  designLabel={opener.designLabel}
                  slope={opener.slope}
                  trueDistance={opener.trueDistance}
                  small
                />
              </>
            )}
            {pair && (
              <>
                {opener.slope !== undefined && (
                  <p className="dg-m-said dg-num">
                    {opener.slope} along the slope.
                  </p>
                )}
                <Globe text={f.globe} tone={f.tone} />
                <div className="dg-actions">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => actions.closeInOnRuler()}
                  >
                    Close in on the ruler
                  </Button>
                  <span className="dg-muted dg-actions-note">
                    Its far end, where ground's feet and design's part; the
                    ghost and the ribbon step aside until you move the camera.
                  </span>
                </div>
              </>
            )}
          </>
        )}
        {opener.id === "mark" && datasheet !== undefined && (
          <Datasheet sheet={datasheet} />
        )}
      </Details>
    </li>
  );
}

function Datasheet({ sheet }: { sheet: DatasheetView }) {
  return (
    <div className="dg-m-sheet">
      <pre className="dg-code-block">{sheet.lines.join("\n")}</pre>
      <p className="dg-muted">
        From NGS's datasheet for {sheet.pid}, retrieved {sheet.retrieved}
        {sheet.url !== undefined && (
          <>
            :{" "}
            <a href={sheet.url} target="_blank" rel="noreferrer noopener">
              open the datasheet
            </a>
          </>
        )}
        .
      </p>
    </div>
  );
}

/**
 * The corridor's evidence (DESIGN.md "The sidebar" 2): its three opening
 * measurements as rows; nothing on another site, whose story is its own.
 */
export function Evidence({
  model,
  live,
  actions,
}: {
  model: MeasurePanel;
  live: MeasureLive;
  actions: MeasureActions;
}) {
  if (model.away !== undefined) {
    return null;
  }
  return (
    <>
      {model.waiting !== undefined && (
        <p className="dg-muted dg-m-wait" role="status">
          {model.waiting}
        </p>
      )}
      {model.openers.length > 0 && (
        <ul className="dg-ev-list" aria-label="The opening measurements">
          {model.openers.map((o) => (
            <Opener
              key={o.id}
              opener={o}
              figures={live.figures[o.id]}
              datasheet={model.datasheet}
              actions={actions}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The viewer's own measurement (DESIGN.md "The sidebar" 4), once there is
 * one: the design and true distances, the line as drawn, and how exact it
 * is, folded (the measurement error explanation the owner kept here).
 */
export function YourMeasurement({
  model,
  actions,
}: {
  model: MeasurePanel;
  actions: MeasureActions;
}) {
  const id = useId();
  const u = model.user;
  if (u.result === undefined && u.error === undefined) {
    return null;
  }
  return (
    <section className="dg-section dg-m-user" aria-labelledby={`${id}-h`}>
      <div className="dg-section-head">
        <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
          Your measurement
        </Typography>
        <Button size="small" variant="text" onClick={() => actions.clear()}>
          Clear
        </Button>
      </div>
      {u.error !== undefined && <Failed error={u.error} actions={actions} />}
      {u.result !== undefined && (
        <>
          <Distances
            design={u.result.design}
            trueDistance={u.result.trueDistance}
          />
          <Globe text={u.result.globe} tone={u.result.tone} />
          <Details rows={u.result.details} label="How exact this is">
            {u.result.ends.map((e) => (
              <div key={e.label} className="dg-m-end">
                <span className="dg-m-end-label">{e.label}</span>
                <dl className="dg-facts dg-num">
                  {e.rows.map((r) => (
                    <Row key={r.label} row={r} />
                  ))}
                </dl>
              </div>
            ))}
          </Details>
        </>
      )}
    </section>
  );
}

/** The snap's glyph: a square on a point, a bar on a line, an arc on a curve, a cross on a surface. */
function Glyph({ kind }: { kind: string }) {
  return (
    <svg width="12" height="12" viewBox="-9 -9 18 18" aria-hidden>
      {kind === "point" && <rect x="-5" y="-5" width="10" height="10" />}
      {kind === "segment" && (
        <>
          <circle r="5" />
          <line x1="-8" y1="0" x2="8" y2="0" />
        </>
      )}
      {kind === "arc" && <path d="M -7 4 A 8 8 0 0 1 7 4" />}
      {kind === "surface" && (
        <>
          <line x1="-4" y1="-4" x2="4" y2="4" />
          <line x1="-4" y1="4" x2="4" y2="-4" />
        </>
      )}
    </svg>
  );
}

const KIND: Record<string, string> = {
  point: "point",
  segment: "line",
  arc: "curve",
  surface: "surface",
};

export function MeasureHud({
  live,
  datasheet,
}: {
  live: MeasureLive;
  datasheet: DatasheetView | undefined;
}) {
  const at = (x: number, y: number) => ({
    transform: `translate(${x}px, ${y}px)`,
  });
  const sheetId = useId();
  const [dismissed, setDismissed] = useState(false);
  return (
    <>
      {live.dots.map((d) => (
        <i
          key={d.key}
          className={`dg-m-dot ${d.tone}`}
          style={at(d.x, d.y)}
          aria-hidden
        />
      ))}
      {live.marker !== undefined && (
        <div
          className="dg-m-pin"
          style={at(live.marker.x, live.marker.y)}
          aria-hidden
        >
          <i />
          <span>{live.marker.text}</span>
        </div>
      )}
      {live.pills.map((p) => (
        <div
          key={p.key}
          className={`dg-m-pill ${p.tone}`}
          style={at(p.x, p.y)}
          aria-hidden
        >
          <span className="dg-num">{p.text}</span>
        </div>
      ))}
      {live.disk !== undefined && datasheet !== undefined && (
        <div
          className={`dg-m-disk${live.disk.left ? " left" : ""}${live.disk.up ? " up" : ""}${dismissed ? " dismissed" : ""}`}
          style={at(live.disk.x, live.disk.y)}
          // Escape dismisses the card (WCAG 1.4.13); it comes back on the
          // next hover or focus.
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDismissed(true);
            }
          }}
          onPointerEnter={() => setDismissed(false)}
          onFocus={() => setDismissed(false)}
        >
          <button
            type="button"
            className="dg-m-disk-face"
            aria-describedby={sheetId}
          >
            <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden>
              <circle r="9.5" className="rim" />
              <circle r="6.5" className="ring" />
              <path d="M 0 -4 L 3.5 2.5 L -3.5 2.5 Z" className="mark" />
            </svg>
            <span className="dg-m-disk-pid">{datasheet.pid}</span>
          </button>
          <div id={sheetId} role="tooltip" className="dg-m-disk-card">
            <span className="dg-hud-title">
              NGS survey mark {datasheet.pid} {datasheet.name}
            </span>
            <span className="dg-m-disk-lines">
              {datasheet.lines.map((l) => (
                <span key={l} className="dg-m-disk-line">
                  {l}
                </span>
              ))}
            </span>
            <span className="dg-hud-muted">
              From NGS's datasheet, retrieved {datasheet.retrieved}. Placed from
              its NAD83(2011) position, independent of the design.
            </span>
          </div>
        </div>
      )}
      {live.hover !== undefined && (
        // The snap preview (feedback F5): where a click would land, a
        // translucent dot with the snap kind's glyph; solid once exact.
        <div
          className={`dg-snap${live.hover.exact ? " exact" : ""}${live.hover.provisional ? " provisional" : ""}`}
          style={at(live.hover.x, live.hover.y)}
          aria-hidden
        >
          <i className="dg-snap-dot" />
          <span className="dg-snap-tag">
            <Glyph kind={live.hover.kind} />
            {live.hover.exact
              ? `exact ${KIND[live.hover.kind]}`
              : KIND[live.hover.kind]}
          </span>
        </div>
      )}
      {live.crosshair && <div className="dg-m-crosshair" aria-hidden />}
    </>
  );
}
