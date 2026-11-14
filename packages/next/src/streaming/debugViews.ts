// The engine's debug views (`View.debug`): what each shows, the colours the
// shader draws them in, and the word a tile's draw carries for them.
//
// A debug view replaces the opaque pass's lighting with a flat colour and
// keeps its depth. Per tile the CPU writes one word into the draw's record
// (`DrawRecord.debug`, through the per-draw constants seam): the tile's
// level, its state, and its screen-space error and stretch as log-scaled
// bytes. The mode is the view's (`View.time.w`), so a view with debug off
// reads one uniform and nothing else. The colours below are written again,
// as the same numbers, in shaders/surface.slang (`DEBUG_LEVEL_COLORS` and
// the ramps); test/debugViews.test.ts holds the two to each other.

/** What a view's debug shading shows (`View.debug`). */
export type DebugView =
  "off" | "level" | "tiles" | "error" | "state" | "stretch" | "skirts";

/** The modes, in the order the shader numbers them (1 to 6; "off" is 0). */
export const DEBUG_VIEWS: readonly DebugView[] = [
  "off",
  "level",
  "tiles",
  "error",
  "state",
  "stretch",
  "skirts",
];

/** The shader's number for a mode (`View.time.w`): 0 for "off". */
export function debugModeId(mode: DebugView): number {
  return DEBUG_VIEWS.indexOf(mode);
}

/** What a tile is doing in the debug view's selection. */
export const TileDebugState = {
  /** Drawn, and its error is within the threshold. */
  drawn: 0,
  /** A mixed-LOD placeholder: drawn only inside its missing children's boxes. */
  placeholder: 1,
  /** Drawn whole in place of finer content still loading. */
  standIn: 2,
  /** Its refinement is held back because the view's depth hides it. */
  held: 3,
} as const;
export type TileDebugState =
  (typeof TileDebugState)[keyof typeof TileDebugState];

/** One colour of a legend, as the view draws it. */
export interface DebugLegendEntry {
  /** What the colour means. */
  readonly label: string;
  /** The colour as displayed: `#rrggbb`. */
  readonly color: string;
}

/** What the colours of a debug view mean (`View.debugLegend`). */
export interface DebugLegend {
  readonly mode: DebugView;
  /** A short heading for the legend. */
  readonly title: string;
  /** One sentence on what the view shows. */
  readonly description: string;
  /**
   * "categories": each entry is one value. "ramp": the entries sample a
   * continuous scale, in order, a gradient between them.
   */
  readonly kind: "none" | "categories" | "ramp";
  readonly entries: readonly DebugLegendEntry[];
}

type Rgb = readonly [number, number, number];

/**
 * Tile levels, repeating every eight: the Okabe-Ito palette (distinguishable
 * with the common kinds of colour blindness), as sRGB bytes.
 */
export const DEBUG_LEVEL_COLORS: readonly Rgb[] = [
  [230, 159, 0],
  [86, 180, 233],
  [0, 158, 115],
  [240, 228, 66],
  [0, 114, 178],
  [213, 94, 0],
  [204, 121, 167],
  [153, 153, 153],
];

/** Screen-space error against the threshold: viridis, low to high. */
export const DEBUG_ERROR_RAMP: readonly Rgb[] = [
  [68, 1, 84],
  [59, 82, 139],
  [33, 145, 140],
  [94, 201, 98],
  [253, 231, 37],
];

/** The stretch of a tile's error by the warp: cividis, low to high. */
export const DEBUG_STRETCH_RAMP: readonly Rgb[] = [
  [0, 34, 78],
  [68, 89, 109],
  [124, 123, 120],
  [188, 175, 111],
  [253, 231, 55],
];

/** `TileDebugState`'s colours, by its value. */
export const DEBUG_STATE_COLORS: readonly Rgb[] = [
  [0, 158, 115],
  [230, 159, 0],
  [213, 94, 0],
  [86, 180, 233],
];

/** The colour of a tile with no data for the view (a tile not yet selected). */
export const DEBUG_NO_DATA: Rgb = [90, 90, 90];

/** The error scale: log2 of (screen-space error ÷ threshold) from here to there. */
export const DEBUG_ERROR_LOG2: readonly [number, number] = [-4, 2];
/** The stretch scale: log2 of the stretch from here to there. */
export const DEBUG_STRETCH_LOG2: readonly [number, number] = [-2, 4];

const LEVEL_BITS = 0xff;
const STATE_SHIFT = 8;
const HASH_SHIFT = 11;
const ERROR_SHIFT = 16;
const STRETCH_SHIFT = 24;

function code(value: number, range: readonly [number, number]): number {
  if (!(value > 0)) {
    return 1;
  }
  const t = (Math.log2(value) - range[0]) / (range[1] - range[0]);
  return 1 + Math.round(Math.min(Math.max(t, 0), 1) * 254);
}

function uncode(byte: number, range: readonly [number, number]): number {
  return 2 ** (range[0] + ((byte - 1) / 254) * (range[1] - range[0]));
}

/** What a tile's debug word holds. */
export interface TileDebug {
  /** The tile's level in its tree (past 255 it reads 255). */
  level: number;
  state: TileDebugState;
  /** A number from 0 to 31 that tells the tile from its neighbours (the "tiles" view's colour). */
  hash: number;
  /** Its screen-space error over the view's threshold; below 1/16 or above 4 clamps. */
  error: number;
  /** The warp's stretch of its error (1 without a warp); from 1/4 to 16. */
  stretch: number;
}

/** A tile's `DrawRecord.debug`: bits 0 to 7 level, 8 to 10 state, 11 to 15 hash, then the error and stretch bytes. */
export function packTileDebug(t: TileDebug): number {
  return (
    (Math.min(Math.max(Math.floor(t.level), 0), 255) |
      (t.state << STATE_SHIFT) |
      ((t.hash & 31) << HASH_SHIFT) |
      (code(t.error, DEBUG_ERROR_LOG2) << ERROR_SHIFT) |
      (code(t.stretch, DEBUG_STRETCH_LOG2) << STRETCH_SHIFT)) >>>
    0
  );
}

/** A `DrawRecord.debug` read back (to its precision); undefined: none written. */
export function unpackTileDebug(word: number): TileDebug | undefined {
  const error = (word >>> ERROR_SHIFT) & 0xff;
  if (error === 0) {
    return undefined;
  }
  return {
    level: word & LEVEL_BITS,
    state: ((word >>> STATE_SHIFT) & 7) as TileDebugState,
    hash: (word >>> HASH_SHIFT) & 31,
    error: uncode(error, DEBUG_ERROR_LOG2),
    stretch: uncode((word >>> STRETCH_SHIFT) & 0xff, DEBUG_STRETCH_LOG2),
  };
}

function hex(rgb: Rgb): string {
  return `#${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function sample(ramp: readonly Rgb[], t: number): Rgb {
  const x = Math.min(Math.max(t, 0), 1) * (ramp.length - 1);
  const i = Math.min(Math.floor(x), ramp.length - 2);
  const f = x - i;
  return [0, 1, 2].map((k) =>
    Math.round(ramp[i]![k]! * (1 - f) + ramp[i + 1]![k]! * f),
  ) as unknown as Rgb;
}

/** The legend of `mode`. */
export function debugLegend(mode: DebugView): DebugLegend {
  switch (mode) {
    case "level":
      return {
        mode,
        title: "Tile level",
        description:
          "Each tile is coloured by its level in its tree; the eight colours repeat. Level 0 is the first colour.",
        kind: "categories",
        entries: DEBUG_LEVEL_COLORS.map((c, i) => ({
          label: `Level ${i}, ${i + 8}, ...`,
          color: hex(c),
        })),
      };
    case "tiles":
      return {
        mode,
        title: "Tiles",
        description:
          "Each tile has its own colour. Terrain tiles show a dark edge along their boundary.",
        kind: "none",
        entries: [],
      };
    case "error": {
      const span = DEBUG_ERROR_LOG2[1] - DEBUG_ERROR_LOG2[0];
      const stops = [-4, -2, 0, 1, 2];
      return {
        mode,
        title: "Screen-space error",
        description:
          "Screen-space error as a multiple of the view's threshold. Over 1 is finer detail the view still wants.",
        kind: "ramp",
        entries: stops.map((s) => ({
          label:
            s === 0
              ? "At the threshold"
              : s < 0
                ? `${2 ** s} of it or less`
                : `${2 ** s} times it or more`,
          color: hex(
            sample(DEBUG_ERROR_RAMP, (s - DEBUG_ERROR_LOG2[0]) / span),
          ),
        })),
      };
    }
    case "state":
      return {
        mode,
        title: "Tile state",
        description: "What each drawn tile is doing in this view's selection.",
        kind: "categories",
        entries: [
          { label: "Drawn", color: hex(DEBUG_STATE_COLORS[0]!) },
          {
            label: "Mixed-level placeholder",
            color: hex(DEBUG_STATE_COLORS[1]!),
          },
          {
            label: "Stand-in for finer tiles still loading",
            color: hex(DEBUG_STATE_COLORS[2]!),
          },
          {
            label: "Held: refinement blocked by occlusion",
            color: hex(DEBUG_STATE_COLORS[3]!),
          },
        ],
      };
    case "stretch": {
      const span = DEBUG_STRETCH_LOG2[1] - DEBUG_STRETCH_LOG2[0];
      const stops = [-2, 0, 1, 2, 4];
      return {
        mode,
        title: "Warp stretch",
        description:
          "How much the warp stretches the tile's error: the largest singular value of the map there, or for terrain under a height profile, its vertical slope. 1 is no stretch.",
        kind: "ramp",
        entries: stops.map((s) => ({
          label: s === 0 ? "1 (none)" : `${2 ** s}`,
          color: hex(
            sample(DEBUG_STRETCH_RAMP, (s - DEBUG_STRETCH_LOG2[0]) / span),
          ),
        })),
      };
    }
    case "skirts":
      return {
        mode,
        title: "Terrain skirts",
        description:
          "Terrain skirts, the curtains hung below each tile's edges to hide cracks, are magenta. Everything else is shaded as normal.",
        kind: "categories",
        entries: [{ label: "Skirt", color: "#ff00ff" }],
      };
    default:
      return {
        mode: "off",
        title: "Off",
        description: "Normal shading.",
        kind: "none",
        entries: [],
      };
  }
}
