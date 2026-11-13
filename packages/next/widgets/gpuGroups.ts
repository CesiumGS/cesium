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
  "hzb",
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
const PICKS = new Set(["pick", "warp-fit", "points", "mips"]);

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
