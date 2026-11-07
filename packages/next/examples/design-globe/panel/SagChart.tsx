// The rigid placement's error along the corridor (DESIGN.md principle 4,
// "the sag is the story"): zero at the anchor, growing away from it; the
// camera's station as it flies along. Drawn in the panel's own tokens; the
// curve in the rigid colour.
import { useSyncExternalStore } from "react";
import { errorText } from "../page.ts";
import type { LiveSource, SagView } from "./model.ts";

const W = 360;
const H = 92;
const PAD = { left: 4, right: 4, top: 18, bottom: 18 };

/** A station as the chart's ticks say it: "920+21". */
const stationShort = (s: number) =>
  `${Math.floor(s / 100)}+${String(Math.round(s % 100)).padStart(2, "0")}`;

export function SagChart({ sag, live }: { sag: SagView; live: LiveSource }) {
  const { station } = useSyncExternalStore(live.subscribe, live.get);
  const x = (s: number) =>
    PAD.left +
    ((s - sag.startStation) / (sag.endStation - sag.startStation)) *
      (W - PAD.left - PAD.right);
  const y = (e: number) =>
    H - PAD.bottom - (e / (sag.max || 1)) * (H - PAD.top - PAD.bottom);
  const path = sag.points
    .map(
      ([s, e], i) =>
        `${i === 0 ? "M" : "L"}${x(s).toFixed(1)} ${y(e).toFixed(1)}`,
    )
    .join(" ");
  const area = `${path} L${x(sag.endStation).toFixed(1)} ${y(0)} L${x(sag.startStation).toFixed(1)} ${y(0)} Z`;
  const ax = x(sag.anchorStation);
  const mx = x(sag.maxStation);
  /** The error at the flown station, by the samples. */
  const at =
    station === undefined
      ? undefined
      : (() => {
          const pts = sag.points;
          const i = pts.findIndex(([s]) => s >= station);
          if (i <= 0) {
            return pts[0]![1];
          }
          const [s0, e0] = pts[i - 1]!;
          const [s1, e1] = pts[i]!;
          return e0 + ((e1 - e0) * (station - s0)) / (s1 - s0);
        })();
  return (
    <figure className="dg-sag">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Rigid placement error along the corridor: 0 at the anchor, station ${stationShort(sag.anchorStation)}, growing to ${errorText(sag.max)} at station ${stationShort(sag.maxStation)}.`}
      >
        <path className="dg-sag-area" d={area} />
        <line
          className="dg-sag-base"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={y(0)}
          y2={y(0)}
        />
        <path className="dg-sag-line" d={path} />
        <line
          className="dg-sag-anchor"
          x1={ax}
          x2={ax}
          y1={PAD.top - 6}
          y2={y(0)}
        />
        <text
          className="dg-sag-label"
          x={ax}
          y={PAD.top - 8}
          textAnchor="middle"
        >
          anchor
        </text>
        <circle className="dg-sag-max" cx={mx} cy={y(sag.max)} r={2.5} />
        <text
          className="dg-sag-label dg-sag-value"
          x={Math.min(mx, W - PAD.right)}
          y={y(sag.max) - 6}
          textAnchor="end"
        >
          {errorText(sag.max)}
        </text>
        {[sag.startStation, sag.endStation].map((s, i) => (
          <text
            key={s}
            className="dg-sag-label"
            x={x(s)}
            y={H - 4}
            textAnchor={i === 0 ? "start" : "end"}
          >
            {stationShort(s)}
          </text>
        ))}
        {station !== undefined && at !== undefined && (
          <g className="dg-sag-now">
            <line x1={x(station)} x2={x(station)} y1={PAD.top} y2={y(0)} />
            <circle cx={x(station)} cy={y(at)} r={3.5} />
          </g>
        )}
      </svg>
      <figcaption className="dg-muted">{sag.caption}</figcaption>
    </figure>
  );
}
