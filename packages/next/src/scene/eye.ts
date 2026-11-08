/**
 * The eye's response to light (View.ts `Exposure` "eye", plan §4.2): what
 * a person there would see, shown on a display.
 *
 * Visibility follows Ferwerda, Pattanaik, Shirley and Greenberg (1996), "A
 * Model of Visual Adaptation for Realistic Image Synthesis": cones and rods
 * each have a threshold-versus-intensity curve (the smallest visible
 * difference at an adaptation luminance, measured psychophysically), and
 * the world's light is scaled so what is just visible there is just
 * visible on the display: cones by tp(display) / tp(world), rods by
 * ts(display) / ts(world), the rods weighing in through the mesopic range
 * (achromatic: they see no color). That keeps visibility, not brightness:
 * alone, it shows a moonlit scene about as bright as a sunlit one.
 *
 * How bright a scene looks follows Tumblin and Rushmeier (1993, as revised
 * by Tumblin, Hodgins and Guenter 1999), from Stevens' brightness data: at
 * a lower adaptation, the same relative light looks dimmer, by
 * 10^((γ(world) − γ(day)) / γ(display)). Night is about 1.8 stops darker
 * than day by moonlight, 3.1 on a moonless night.
 *
 * One calibration: by day the display shows the world's adaptation level
 * at 0.18 of white (`EYE_TARGET`). That target is a choice, made by
 * comparison with 1.x and the owner's review on 2026-11-08, not a physical
 * constant. It belongs to the eye alone: a camera's automatic exposure
 * (a reflected-light meter, K = 12.5) is a separate mode, defined
 * physically, and is unchanged.
 */

/** A display's white, cd/m² (sRGB's reference display: 80-100). */
export const DISPLAY_WHITE = 100;
/** The viewer's adaptation at the display, cd/m²: half its white (Ferwerda). */
export const DISPLAY_ADAPTATION = 50;

/**
 * The cones' threshold at adaptation luminance `la` (cd/m²), cd/m²
 * (Ferwerda et al. 1996, from Blackwell's data).
 */
export function coneThreshold(la: number): number {
  const l = Math.log10(Math.max(la, 1e-12));
  const t =
    l <= -2.6 ? -0.72 : l >= 1.9 ? l - 1.255 : (0.249 * l + 0.65) ** 2.7 - 0.72;
  return 10 ** t;
}

/**
 * The rods' threshold at scotopic adaptation luminance `la` (scotopic
 * cd/m²), scotopic cd/m² (Ferwerda et al. 1996, from Barlow's data).
 */
export function rodThreshold(la: number): number {
  const l = Math.log10(Math.max(la, 1e-12));
  const t =
    l <= -3.94
      ? -2.86
      : l >= -1.44
        ? l - 0.395
        : (0.405 * l + 1.6) ** 2.18 - 2.86;
  return 10 ** t;
}

/**
 * How much the rods see at photopic adaptation `la` (cd/m²): 1 below the
 * mesopic range (0.01 cd/m²), 0 above it (10), between as Ferwerda et al.
 */
export function rodWeight(la: number): number {
  const k = 1 - (la - 0.01) / (10 - 0.01);
  return Math.min(Math.max(k, 0), 1) ** 2;
}

/**
 * Stevens' brightness exponent at adaptation luminance `l` (cd/m²), as
 * Tumblin and Rushmeier use it.
 */
function brightnessExponent(l: number): number {
  return l > 100 ? 2.655 : 1.855 + 0.4 * Math.log10(l + 2.3e-5);
}

/**
 * How bright a scene adapted to `la` (cd/m²) looks against daylight's, as
 * a factor (Tumblin and Rushmeier): 1 from 100 cd/m² up, 0.28 by moonlight
 * (0.03), 0.12 on a moonless night (1e-4).
 */
export function brightness(la: number): number {
  return (
    10 **
    ((brightnessExponent(la) - 2.655) / brightnessExponent(DISPLAY_ADAPTATION))
  );
}

/**
 * Daylight shows its adaptation level at this share of white: a choice (by
 * comparison with 1.x, reviewed 2026-11-08), not a physical constant.
 * present.slang `eyeSees` holds the same number.
 */
const EYE_TARGET = 0.18;
const CALIBRATION =
  EYE_TARGET /
  ((coneThreshold(DISPLAY_ADAPTATION) * 10 ** 1.255) / DISPLAY_WHITE);

/** Scotopic luminance of white light per unit of luminance (D65). */
export const SCOTOPIC_WHITE = 2.573;

/**
 * The display's response to the world's light for an eye adapted to
 * `photopic` (cd/m²) and `scotopic` (scotopic cd/m²): what shows (a share
 * of the display's white) per cd/m² seen by the cones (in color), and per
 * scotopic cd/m² seen by the rods (gray). `compensation`: stops brighter.
 */
export function eyeResponse(
  photopic: number,
  scotopic: number,
  compensation = 0,
): { cones: number; rods: number } {
  const scale =
    (CALIBRATION * brightness(photopic) * 2 ** compensation) / DISPLAY_WHITE;
  return {
    cones:
      (scale * coneThreshold(DISPLAY_ADAPTATION)) / coneThreshold(photopic),
    rods:
      (scale * rodWeight(photopic) * rodThreshold(DISPLAY_ADAPTATION)) /
      rodThreshold(scotopic),
  };
}

/**
 * How much faster than a real eye the eye adapts by default (`Exposure`
 * "eye" `speed`): to dark in a few seconds (the rods' 600 s over 400),
 * to light at once.
 */
export const EYE_ADAPTATION_SPEED = 400;

/**
 * The eye's adaptation moving toward a level, as log10 luminance, over
 * `dt` seconds: exponentially, faster toward light than toward dark
 * (Pattanaik et al. 2000; Durand and Dorsey 2000), at a real eye's pace
 * times `speed`. Toward light the cones take 0.1 s, the rods 0.4 s
 * (Krawczyk et al. 2005); toward dark the cones reach their plateau in
 * about 10 minutes and the rods theirs in 30 to 40 (Hecht, Haig and Chase
 * 1937): time constants of about a third of that, 180 s and 600 s.
 */
export function adapt(
  current: number,
  target: number,
  dt: number,
  receptor: "cones" | "rods",
  speed = 1,
): number {
  const brighter = target > current;
  const tau =
    receptor === "cones" ? (brighter ? 0.1 : 180) : brighter ? 0.4 : 600;
  return current + (target - current) * (1 - Math.exp((-dt * speed) / tau));
}
