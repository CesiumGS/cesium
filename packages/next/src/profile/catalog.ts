// The feature catalog: one entry per feature, all of it data. The ladders
// here are first drafts of today's behavior, to be confirmed per feature as
// each is wired in (docs/superpowers/plans/2026-11-13-engine-profiles.md,
// section 2). Which steps compile to different code (and so count against the
// variant budget) is an estimate until the paths milestone reads the shaders.
import type { Catalog, FeatureEntry, Step } from "./types.ts";

const runtime = (...steps: Step[]) =>
  Object.fromEntries(steps.map((s) => [String(s), "runtime" as const]));
const compile = (...steps: Step[]) =>
  Object.fromEntries(steps.map((s) => [String(s), "compile" as const]));

export const CATALOG = {
  glare: {
    scope: "view",
    steps: ["full", "reduced", "sources"],
    defaultLook: false,
    importance: "extra",
    class: "appearance",
    stepKind: runtime("full", "reduced", "sources"),
    fallback: "off",
    doc: "Veil and spikes around bright sources, at a cost that grows with the view's pixels.",
  },
  shadows: {
    scope: "view",
    steps: ["full"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: runtime("full"),
    fallback: "off",
    doc: "Cascaded shadows from the sun, 4 cascades at 2048 pixels.",
  },
  ambientOcclusion: {
    scope: "view",
    steps: ["full"],
    defaultLook: true,
    importance: "extra",
    class: "appearance",
    stepKind: runtime("full"),
    fallback: "off",
    doc: "Contact darkening from the depth buffer.",
  },
  translucency: {
    scope: "view",
    steps: ["exact", "moments32", "moments16"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: compile("exact", "moments32", "moments16"),
    fallback: "moments16",
    doc: "Order-independent translucency: exact per-pixel lists, or blended moments in 32-bit or 16-bit floats.",
  },
  fxaa: {
    scope: "view",
    steps: ["on"],
    defaultLook: false,
    importance: "extra",
    class: "appearance",
    stepKind: runtime("on"),
    fallback: "off",
    doc: "Edge smoothing on the display color.",
  },
  resolution: {
    scope: "view",
    steps: [1, 0.75, 0.5],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: runtime(1, 0.75, 0.5),
    fallback: 1,
    doc: "The scene's render scale relative to the canvas's backing store.",
  },
  msaa: {
    scope: "engine",
    steps: ["4x", "1x+fxaa"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: compile("4x", "1x+fxaa"),
    fallback: "1x+fxaa",
    doc: "The sample count of the scene targets. Changing it rebuilds every pipeline.",
  },
  aerialPerspective: {
    scope: "view",
    steps: ["march", "screen", "volume"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: compile("march", "screen", "volume"),
    fallback: "volume",
    doc: "Haze between the camera and what it sees. Which method is best depends on the camera's altitude.",
  },
  sunDisk: {
    scope: "view",
    steps: ["on"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: runtime("on"),
    fallback: "off",
    doc: "The sun drawn as a disk.",
  },
  cityLights: {
    scope: "view",
    steps: ["on"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: runtime("on"),
    fallback: "off",
    doc: "Lights on the night side of the globe.",
  },
  lodTransitions: {
    scope: "view",
    steps: ["morph", "pop"],
    defaultLook: true,
    importance: "preferred",
    class: "appearance",
    stepKind: runtime("morph", "pop"),
    fallback: "pop",
    doc: "How a tile's level of detail changes: blended, or all at once.",
  },
  normals: {
    scope: "view",
    steps: ["exact", "linear"],
    defaultLook: true,
    importance: "preferred",
    class: "accuracy",
    stepKind: runtime("exact", "linear"),
    fallback: "linear",
    doc: "How shading normals follow a transform: exactly, or linearly (src/transform/compile.ts).",
  },
} as const satisfies Catalog;

export type FeatureName = keyof typeof CATALOG;

/** The most compiled variants the catalog may multiply into (test/profileInvariants.test.ts). */
export const VARIANT_BUDGET = 32;

/** What the catalog's compile-time steps multiply into: one factor a feature. */
export function variantCount(catalog: Catalog = CATALOG): number {
  let count = 1;
  for (const entry of Object.values(catalog) as FeatureEntry[]) {
    const compiled = Object.values(entry.stepKind).filter(
      (k) => k === "compile",
    ).length;
    count *= Math.max(compiled, 1);
  }
  return count;
}
