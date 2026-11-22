// The eye's point limit: a model, as a stage, in place of a gain on the stars. A
// person sees a point of light only above a threshold (scene/eye.ts `eyePointLimit`),
// so where nothing was drawn, what stands above its surroundings fades out below it.
// It changes the picture, not the light: the meter, and `readHdr`, are before it. It's
// built only on the public stage interface.
import { starPeakShare } from "../atmosphere/stars.ts";
import { eyePointLimit } from "./eye.ts";
import { observerPointSpread } from "./pointSpread.ts";
import { createPostStage, type PostStage } from "./postStage.ts";

/** The stage's name: glare comes after it (render/post/chain.ts). */
export const EYE_LIMIT_STAGE = "eye-point-limit";
/** Above this adaptation, cd/m², nothing faint enough to matter shows. */
const LIMIT_UP_TO = 30;
/** The ring's radius, CSS pixels: outside a star's core at the eye's spread. */
const RING = 6;

const ringTap = (x: number, y: number) =>
  `eyeLimitTake(eyeLimitTap(input.pixel + vec2<i32>(i32(round(${x} * uniforms.ring)), i32(round(${y} * uniforms.ring))), size));`;

const shader = `fn eyeLimitTap(at: vec2<i32>, size: vec2<i32>) -> vec3<f32> {
  let p = clamp(at, vec2<i32>(0), size - vec2<i32>(1));
  // What was drawn there isn't this pixel's surroundings on the sky: it counts as dark.
  if (postDepthAt(p) != 0.0) {
    return vec3<f32>(0.0);
  }
  return postColorAt(p).rgb;
}

fn eyeLimitLum(a: vec3<f32>) -> f32 {
  return dot(a, vec3<f32>(0.2126, 0.7152, 0.0722));
}

var<private> ringFirst: vec3<f32>;
var<private> ringSecond: vec3<f32>;

fn eyeLimitTake(t: vec3<f32>) {
  if (eyeLimitLum(t) > eyeLimitLum(ringFirst)) {
    ringSecond = ringFirst;
    ringFirst = t;
  } else if (eyeLimitLum(t) > eyeLimitLum(ringSecond)) {
    ringSecond = t;
  }
}

fn postStage(input: PostInput) -> vec4<f32> {
  let c = postColorAt(input.pixel);
  if (postDepthAt(input.pixel) != 0.0) {
    return c;
  }
  let size = vec2<i32>(input.size);
  // The second brightest of a ring: a point stands above all of it, a stray star beside
  // it or not. What's extended, the Milky Way or the airglow's line, has two taps as
  // bright as itself, so it isn't a point and stays.
  ringFirst = vec3<f32>(0.0);
  ringSecond = vec3<f32>(0.0);
  ${ringTap(1, 0)}
  ${ringTap(-1, 0)}
  ${ringTap(0, 1)}
  ${ringTap(0, -1)}
  ${ringTap(0.7071, 0.7071)}
  ${ringTap(-0.7071, 0.7071)}
  ${ringTap(0.7071, -0.7071)}
  ${ringTap(-0.7071, -0.7071)}
  let around = ringSecond;
  // What stands above them, as a point's illuminance at this pixel.
  let t = (vec2<f32>(input.pixel) + vec2<f32>(0.5) - input.size * 0.5) * input.pixelAngle;
  let z = 1.0 / sqrt(1.0 + dot(t, t));
  let omega = input.pixelAngle * input.pixelAngle * z * z * z;
  let above = eyeLimitLum(c.rgb - around) / input.preExposure;
  if (above <= 0.0) {
    return c;
  }
  let lux = above * omega / uniforms.peak;
  // Over 1 magnitude around the limit: 2.5 log10 of the ratio.
  let brighter = 1.0857362 * log(max(lux / uniforms.limit, 1e-6));
  let seen = smoothstep(-0.5, 0.5, brighter);
  return vec4<f32>(around + (c.rgb - around) * seen, c.a);
}`;

/**
 * The eye's point limit, for `view.observer.stages`: magnitude 6 dark-adapted,
 * brighter in proportion to the rods' threshold. Only a view with the eye, a drawn
 * sky and an adaptation under 30 cd/m² draws it. `eyeObserver` adds it.
 */
export function eyeLimitStage(): PostStage {
  return createPostStage({
    name: EYE_LIMIT_STAGE,
    slot: "scene",
    kind: "model",
    label: "The eye's point limit (a model)",
    reads: ["depth"],
    uniforms: {
      limit: { type: "f32", value: 1 },
      peak: { type: "f32", value: 1 },
      ring: { type: "f32", value: RING },
    },
    shader,
    perView({ view }, values) {
      const state = view.autoExposure;
      const on =
        "eye" in view.observer.exposure &&
        view.background === "atmosphere" &&
        view.body.atmosphere !== undefined &&
        state !== undefined &&
        state.metered &&
        10 ** state.cones < LIMIT_UP_TO;
      values.enabled = on;
      if (on) {
        const ratio = globalThis.devicePixelRatio ?? 1;
        const { core } = observerPointSpread(view.observer);
        values.setUniform("limit", eyePointLimit(10 ** state.rods));
        values.setUniform("peak", starPeakShare(core * ratio));
        values.setUniform("ring", RING * ratio);
      }
    },
  });
}
