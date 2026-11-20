/**
 * The inspector's condensed view of GPU time: pass labels (the engine's
 * `gpuPasses`) folded into a few groups, plus what no timestamp covers.
 * Pure: no DOM, so a test shares it. The recorder keeps every label.
 */

/** The groups, in the order the inspector lists them. */
export const GPU_GROUPS = [
  "Scene",
  "Lighting & sky",
  "Imagery",
  "Post & output",
  "Picks & misc",
  "Other",
] as const;
export type GpuGroup = (typeof GPU_GROUPS)[number];

const SCENE = new Set([
  "shadows",
  "cull",
  "dice",
  "occlusion-depth",
  "hzb",
  "occlusion-retest",
  "occlusion-query",
  "prepass",
  "ambient-occlusion",
  "ambient-occlusion.blur",
  "opaque",
  "caps",
]);
const SKY = new Set([
  "lights",
  "sky-view",
  "aerial-perspective",
  "star-cull",
  "stars",
  "environment",
  "atmosphere",
]);
const PICKS = new Set(["pick", "curvilinear-fit", "points", "mips"]);

/** The group a pass label belongs to; labels this doesn't know are "Other". */
export function groupOf(label: string): GpuGroup {
  if (SCENE.has(label) || label.startsWith("translucent")) {
    return "Scene";
  }
  if (SKY.has(label)) {
    return "Lighting & sky";
  }
  if (label === "imagery") {
    return "Imagery";
  }
  if (label === "output" || label === "exposure" || label.startsWith("glare")) {
    return "Post & output";
  }
  return PICKS.has(label) ? "Picks & misc" : "Other";
}

/**
 * The GPU frame interval (busy back to back) less the time timed passes
 * ran, ms: the work no timestamp covers (uploads, copies, presenting). NaN
 * if either is unknown, as when the GPU idled; never negative.
 */
export function untimedMs(interval: number | undefined, union: number): number {
  return interval === undefined || Number.isNaN(interval) || Number.isNaN(union)
    ? Number.NaN
    : Math.max(0, interval - union);
}

export interface GpuGroupTotal {
  name: GpuGroup;
  ms: number;
  /** Its passes, largest first. */
  passes: Array<[string, number]>;
}

/** The passes folded into their groups (empty groups left out), largest first. */
export function groupPasses(
  passes: ReadonlyArray<readonly [string, number]>,
): GpuGroupTotal[] {
  const by = new Map<GpuGroup, GpuGroupTotal>();
  for (const [label, ms] of passes) {
    const name = groupOf(label);
    let group = by.get(name);
    if (!group) {
      group = { name, ms: 0, passes: [] };
      by.set(name, group);
    }
    group.ms += ms;
    group.passes.push([label, ms]);
  }
  for (const group of by.values()) {
    group.passes.sort((a, b) => b[1] - a[1]);
  }
  return GPU_GROUPS.filter((g) => by.has(g)).map((g) => by.get(g)!);
}

/** A pass's history, aligned to the window, with its summary. */
export interface PassSeries {
  name: string;
  /** One value a sample, oldest first, `length` long; 0 before it appeared. */
  series: number[];
  /** Its mean over the window, ms. */
  mean: number;
  /** Its largest sample, ms. */
  max: number;
}

/** A group's passes over the window, and their sum. */
export interface GroupSeries {
  name: GpuGroup;
  series: number[];
  mean: number;
  max: number;
  /** Its passes, in run order, every one (zero or not). */
  passes: PassSeries[];
}

/** The window's GPU time, grouped and aligned, for the inspector's charts. */
export interface GpuWindow {
  groups: GroupSeries[];
  untimed: PassSeries;
  /** Groups plus untimed, a sample: the stack's height. */
  total: number[];
  /** The mean of `total`, ms: the base of every share. */
  totalMean: number;
}

const summarize = (name: string, series: number[]): PassSeries => {
  let sum = 0;
  let max = 0;
  for (const v of series) {
    sum += v;
    max = Math.max(max, v);
  }
  return { name, series, mean: series.length ? sum / series.length : 0, max };
};

/**
 * Right-aligns `values` (newest last) to `length` samples, 0 before the first
 * and for NaN or negative samples (a frame that skipped the pass, or an idle
 * GPU's untimed share).
 */
export function align(values: readonly number[], length: number): number[] {
  const out = new Array<number>(length).fill(0);
  const from = Math.max(0, values.length - length);
  for (let i = from; i < values.length; i++) {
    const v = values[i]!;
    out[length - (values.length - i)] = Number.isFinite(v) && v > 0 ? v : 0;
  }
  return out;
}

/**
 * The passes' histories folded into groups over a window of `length`
 * samples: each group's sum a sample, the passes in `order` (run order;
 * others after), and the stack total with the untimed share on top.
 */
export function gpuWindow(
  passes: ReadonlyMap<string, readonly number[]>,
  order: readonly string[],
  untimed: readonly number[],
  length: number,
): GpuWindow {
  const rank = new Map(order.map((pass, k) => [pass, k]));
  const at = (pass: string) => rank.get(pass) ?? order.length;
  const names = [...passes.keys()].sort((a, b) => at(a) - at(b));
  const by = new Map<GpuGroup, PassSeries[]>();
  for (const name of names) {
    const group = groupOf(name);
    const list = by.get(group) ?? [];
    list.push(summarize(name, align(passes.get(name)!, length)));
    by.set(group, list);
  }
  const total = new Array<number>(length).fill(0);
  const groups = GPU_GROUPS.filter((g) => by.has(g)).map((name) => {
    const members = by.get(name)!;
    const sum = new Array<number>(length).fill(0);
    for (const p of members) {
      for (let i = 0; i < length; i++) {
        sum[i]! += p.series[i]!;
      }
    }
    for (let i = 0; i < length; i++) {
      total[i]! += sum[i]!;
    }
    return {
      ...summarize(name, sum),
      name,
      passes: members,
    };
  });
  const rest = summarize("Untimed", align(untimed, length));
  for (let i = 0; i < length; i++) {
    total[i]! += rest.series[i]!;
  }
  return { groups, untimed: rest, total, totalMean: summarize("", total).mean };
}
