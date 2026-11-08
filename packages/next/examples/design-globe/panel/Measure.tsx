import "./measure.css";
// The measure section (DESIGN.md "The story", "Layout" 4) and its labels over
// the globe. Up front, the measurements the page opens with: each one's
// headline, the design and true distances side by side and labelled, and a
// sentence on the line as the globe draws it, in that placement's colour;
// behind "Details", the rest. Then the user's own measurement: the snap
// mode, what to do next, and the same headline and details. Over the globe:
// the design-distance pills, the ends, the station marker, NGS's survey disk
// (its datasheet on hover or focus), the snap glyph and the keyboard's
// crosshair.
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { svgChevronDown } from "@stratakit/icons/chevron-down";
import { svgMeasureDistance } from "@stratakit/icons/measure-distance";
import { Icon } from "@stratakit/mui";
import { type ReactNode, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type {
  DatasheetView,
  DetailRow,
  GlobeTone,
  MeasureLive,
  MeasurePanel,
  OpenerFigures,
  OpenerId,
  OpenerPanel,
} from "../measureTool.ts";
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
}

const SNAP_LABEL: Record<SnapMode, string> = {
  exact: "Alignment (exact)",
  geometry: "Geometry",
  none: "None",
};

function Details({
  rows,
  children,
}: {
  rows: readonly DetailRow[];
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
        Details
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
  trueDistance,
  small,
}: {
  design: string;
  trueDistance: string;
  small?: boolean;
}) {
  return (
    <dl className={`dg-m-pair dg-num${small ? " small" : ""}`}>
      <div>
        <dt>Design distance</dt>
        <dd>{design}</dd>
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
  return (
    <article
      className={`dg-m${opener.quiet ? " quiet" : ""}`}
      aria-labelledby={id}
    >
      <div className="dg-m-head">
        <h3 id={id} className="dg-m-title">
          {opener.title}
        </h3>
        <Button
          size="small"
          variant="text"
          onClick={() => actions.show(opener.id)}
        >
          Show
        </Button>
      </div>
      {opener.id === "marker" ? (
        <>
          <p className={`dg-m-hero dg-num ${f.tone}`} aria-live="polite">
            <span className="dg-m-big">{f.drawn ?? "Not to scale"}</span>
            <span className="dg-m-hero-text">{f.globe}</span>
          </p>
          <Distances
            design={opener.design}
            trueDistance={opener.trueDistance}
            small
          />
        </>
      ) : (
        <>
          <Distances
            design={opener.design}
            trueDistance={opener.trueDistance}
            small={opener.quiet}
          />
          <Globe text={f.globe} tone={f.tone} />
        </>
      )}
      <Details rows={opener.details}>
        {opener.id === "mark" && datasheet !== undefined && (
          <Datasheet sheet={datasheet} />
        )}
      </Details>
    </article>
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

function Yours({
  model,
  actions,
}: {
  model: MeasurePanel;
  actions: MeasureActions;
}) {
  const id = useId();
  const u = model.user;
  return (
    <div
      className="dg-m-user"
      onKeyDown={(e) => {
        if (e.key === "Escape" && u.phase !== "empty") {
          actions.clear();
        }
      }}
    >
      <Typography
        variant="subtitle-sm"
        render={<h3 className="dg-m-subhead" />}
      >
        Your measurement
      </Typography>
      <div className="dg-m-snap">
        <span id={`${id}-snap`} className="dg-muted">
          Snap to
        </span>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={model.snap}
          aria-labelledby={`${id}-snap`}
          onChange={(_, v: SnapMode | null) => v && actions.setSnap(v)}
        >
          {(["exact", "geometry", "none"] as const).map((m) => (
            <ToggleButton
              key={m}
              value={m}
              render={<Button variant="outlined" />}
            >
              {SNAP_LABEL[m]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
      <p
        className={`dg-m-next${u.refused ? " refused" : " dg-muted"}`}
        role="status"
        aria-live="polite"
      >
        {u.busy ? "Snapping…" : u.instruction}
      </p>
      {u.result !== undefined && (
        <>
          <Distances
            design={u.result.design}
            trueDistance={u.result.trueDistance}
          />
          <Globe text={u.result.globe} tone={u.result.tone} />
          <Details rows={u.result.details}>
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
      <div className="dg-actions">
        <Button
          size="small"
          variant="outlined"
          onClick={() => actions.pointAtCentre()}
          startIcon={<Icon href={svgMeasureDistance} aria-hidden />}
        >
          {u.phase === "first"
            ? "Second point at the view's centre"
            : "Point at the view's centre"}
        </Button>
        {u.phase !== "empty" && (
          <Button size="small" variant="text" onClick={() => actions.clear()}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

export function Measure({
  source,
  live,
  actions,
  hud,
}: {
  source: MeasureSource;
  live: MeasureLiveSource;
  actions: MeasureActions;
  hud: HTMLElement;
}) {
  const model = useSyncExternalStore(source.subscribe, source.get);
  const now = useSyncExternalStore(live.subscribe, live.get);
  const id = useId();
  return (
    <section className="dg-section dg-measure" aria-labelledby={`${id}-h`}>
      <Typography variant="subtitle-md" render={<h2 id={`${id}-h`} />}>
        Measure
      </Typography>
      {model.waiting !== undefined && (
        <p className="dg-muted dg-m-wait" role="status">
          {model.waiting}
        </p>
      )}
      {model.openers.length > 0 && (
        <div className="dg-m-list">
          {model.openers.map((o) => (
            <Opener
              key={o.id}
              opener={o}
              figures={now.figures[o.id]}
              datasheet={model.datasheet}
              actions={actions}
            />
          ))}
        </div>
      )}
      <Yours model={model} actions={actions} />
      {createPortal(<MeasureHud live={now} datasheet={model.datasheet} />, hud)}
    </section>
  );
}

/** The snap's glyph: a square on a point, a bar on a line, an arc on a curve, a cross on a surface. */
function Glyph({ kind }: { kind: string }) {
  return (
    <svg width="18" height="18" viewBox="-9 -9 18 18" aria-hidden>
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

function MeasureHud({
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
          className={`dg-m-disk${live.disk.left ? " left" : ""}${live.disk.up ? " up" : ""}`}
          style={at(live.disk.x, live.disk.y)}
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
            {datasheet.lines.map((l) => (
              <span key={l} className="dg-m-disk-line">
                {l}
              </span>
            ))}
            <span className="dg-hud-muted">
              From NGS's datasheet, retrieved {datasheet.retrieved}. Placed from
              its NAD83(2011) position, independent of the design.
            </span>
          </div>
        </div>
      )}
      {live.hover !== undefined && (
        <div
          className={`dg-m-glyph${live.hover.exact ? " exact" : ""}`}
          style={at(live.hover.x, live.hover.y)}
          aria-hidden
        >
          <Glyph kind={live.hover.kind} />
          <span>
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
