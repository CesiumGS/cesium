// The astrophoto curve: a look, as a stage, over the whole image, so stars, Earth and
// clouds all go through it (CESIUM2_WEBGPU_PLAN.md §13.32). It's built only on the
// public stage interface. Nothing here changes the scene's light.
import {
  PostStageError,
  createPostStage,
  type PostStage,
} from "../../scene/postStage.ts";

/** Its stretch at full strength, and its black point, in exposed luminance. */
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

const shader = (
  strength: number,
) => `fn postStage(input: PostInput) -> vec4<f32> {
  let c = postColorAt(input.pixel);
  const s: f32 = ${strength};
  let y = dot(c.rgb, vec3<f32>(0.2126, 0.7152, 0.0722));
  let q = max(8.0 * s, 0.001);
  let curved = asinh(q * max(y - 0.004 * s, 0.0)) / asinh(q);
  // One ratio for all three, so hue holds, then saturation about the curved gray.
  let ratio = curved / max(y, 1e-6);
  let colored = mix(vec3<f32>(curved), c.rgb * ratio, 1.0 + 0.4 * s);
  return vec4<f32>(max(colored, vec3<f32>(0.0)), c.a);
}`;

/**
 * An astrophoto's tone curve, for `view.observer.stages`: lifts what's faint and
 * adds color, over the whole image, after the meter. It's a look, and says so: it
 * changes the picture, not the light. `strength` (default 1) is fixed in its
 * shader: make another stage for another, so its `shadowGain` holds.
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
    shader: shader(strength),
  });
}
