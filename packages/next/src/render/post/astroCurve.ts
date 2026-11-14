// The astrophoto curve: a look, as a stage, over the whole image, so stars, Earth and
// clouds all go through it (CESIUM2_WEBGPU_PLAN.md §13.32). It's built only on the
// public stage interface, and is that interface's example of a stage written in Slang
// (shaders/stages/astroCurve.slang, compiled by `npm run shaders`). Nothing here
// changes the scene's light.
import {
  PostStageError,
  createPostStage,
  slangPostShader,
  type PostStage,
  type SlangPostLayout,
} from "../../scene/postStage.ts";
import wgsl from "../../shaders/generated/astroCurve.wgsl?raw";
import layout from "../../shaders/generated/astroCurve.json";

/** Its stretch at full strength, and its black point, in exposed luminance (astroCurve.slang's). */
const STRETCH = 8;
const BLACK_POINT = 0.004;

/** How hard it stretches at `strength`: above 0, so a strength of 0 is the identity. */
const stretchAt = (strength: number) => Math.max(STRETCH * strength, 0.001);

/**
 * What the curve does to exposed luminance `y`, at `strength` (0 is the identity,
 * to 10⁻³): a black point, then an asinh stretch. The function the shader holds.
 */
export function astroCurve(y: number, strength: number): number {
  const q = stretchAt(strength);
  return (
    Math.asinh(q * Math.max(y - BLACK_POINT * strength, 0)) / Math.asinh(q)
  );
}

/**
 * An astrophoto's tone curve, for `view.observer.stages`: lifts what's faint and
 * adds color, over the whole image, after the meter. It's a look, and says so: it
 * changes the picture, not the light. `strength` (default 1) is the stage's `strength`
 * uniform, set when it's made and not changed after: make another stage for another,
 * so its `shadowGain` holds.
 */
export function astrophotoCurveStage(
  options: { strength?: number } = {},
): PostStage {
  const name = "astrophoto-curve";
  const strength = options.strength ?? 1;
  if (!(strength >= 0) || !Number.isFinite(strength)) {
    throw new PostStageError(
      name,
      "strength",
      `${strength} isn't a finite number, 0 or more.`,
    );
  }
  const q = stretchAt(strength);
  return createPostStage({
    name,
    slot: "exposed",
    kind: "look",
    label: "Astrophoto curve (a look)",
    shadowGain: q / Math.asinh(q),
    uniforms: { strength: { type: "f32", value: strength } },
    shader: slangPostShader(
      "astroCurve.slang",
      wgsl,
      layout as SlangPostLayout,
    ),
  });
}
