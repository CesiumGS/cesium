// The WebGL 2 renderer's support rules (the profiles plan's CS-30): which
// steps of the catalog it offers. They are data like the rest of the rules,
// each a `requires` rule that holds a step back where the renderer is not
// WebGL 2's. Rules say what WebGL 2 can't do (no compute shaders, no storage
// buffers), as the plan lists it (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// section 1); a step it can do is offered, and the milestone that builds it
// (CS-36 to CS-44) makes it draw. Steps that need an extension are in the
// rules next to the WebGPU feature they mirror (`translucency.moments32.blendable`).
import type { Predicate, Rule, Step } from "./types.ts";

/** Holds on the WebGPU renderer only: what a WebGL 2 step lacks is its. */
const WEBGPU_ONLY: Predicate = { equals: ["renderer", "webgpu"] };

interface Held {
  readonly feature: string;
  readonly steps: readonly Step[];
  readonly reason: string;
}

/** What WebGL 2 holds back, with why. */
const HELD: readonly Held[] = [
  {
    feature: "glare",
    steps: ["full", "reduced", "sources"],
    reason:
      "glare is a compute pass, and WebGL 2 has no compute shaders; it has no step in the PoC",
  },
  {
    feature: "cityLights",
    steps: ["on"],
    reason: "the PoC's WebGL 2 renderer has no step for city lights",
  },
  {
    feature: "translucency",
    steps: ["exact"],
    reason: "exact per-pixel lists need storage buffers, and WebGL 2 has none",
  },
];

export const WEBGL2_RULES: readonly Rule[] = HELD.flatMap(
  ({ feature, steps, reason }) =>
    steps.map((step): Rule => ({
      id: `${feature}.webgl2.${String(step)}`,
      kind: "requires",
      feature,
      step,
      needs: WEBGPU_ONLY,
      reason: `WebGL 2: ${reason}`,
    })),
);
