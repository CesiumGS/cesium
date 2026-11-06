// The globe legend's rows (I17, M8): one per drawn overlay, or one per line
// for an overlay whose lines are keyed apart (the rigid and the exact line,
// stop 4). Plain functions, so the legend's entries can be tested.
import type { Family } from "./families.ts";
import type { OverlayId, OverlayView } from "./model.ts";

type Line = "solid" | "dashed" | "dotted";

/** Each overlay's family (color) and line style on the globe and in the legend (M8). */
const OVERLAY_LOOK: Partial<Record<OverlayId, { family: Family; line: Line }>> =
  {
    designGrid: { family: "engineering", line: "solid" },
    siteGrid: { family: "engineering", line: "dotted" },
    rigidVsExact: { family: "engineering", line: "solid" },
    roundTrip: { family: "engineering", line: "dotted" },
    distortion: { family: "engineering", line: "solid" },
    orion: { family: "trajectory", line: "solid" },
    bias: { family: "celestial", line: "solid" },
  };

/** One entry in the legend. */
export interface LegendRow {
  /** Unique: the overlay's id, or "id:part". */
  key: string;
  overlay: OverlayId;
  /** The compact name. */
  name: string;
  /** The unfolded name. */
  label: string;
  accuracy: string;
  /** The key drawn beside it: a line style, or the triads' three axes. */
  line: Line | "axes";
  family: Family;
  /** The family's color, or white (the rigid line). */
  tone: "family" | "white";
  /** In the warning color (not bounded, or resting on an assumption). */
  attention: boolean;
}

export function legendRows(drawn: readonly OverlayView[]): LegendRow[] {
  return drawn.flatMap((o): LegendRow[] => {
    const look = OVERLAY_LOOK[o.id] ?? { family: "earth", line: "solid" };
    const attention = o.unbounded === true || o.caution === true;
    if (o.parts && o.parts.length > 0) {
      return o.parts.map((p) => ({
        key: `${o.id}:${p.key}`,
        overlay: o.id,
        name: p.short,
        label: p.label,
        accuracy: p.accuracy,
        line: p.line,
        family: look.family,
        tone: p.tone,
        attention,
      }));
    }
    return [
      {
        key: o.id,
        overlay: o.id,
        name: o.short ?? o.label,
        label: o.label,
        accuracy: o.accuracy,
        line: o.id === "triads" ? "axes" : look.line,
        family: look.family,
        tone: "family",
        attention,
      },
    ];
  });
}
