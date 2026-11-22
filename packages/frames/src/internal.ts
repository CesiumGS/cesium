/**
 * @cesium/frames/internal: the names @cesium/frames's lockstep siblings import that its
 * entry point doesn't publish (CS-883). Outside the stable API: not for
 * applications, and it may change in any release.
 *
 * @packageDocumentation
 */
export { framesDataFormatProblem } from "./ephemeris/framesDataFormat.ts";
export { DE440_EARTH_MOON_METERS } from "./frames.ts";
export type { Frames } from "./frames.ts";
export { derivative, positionIn, velocityIn } from "./motion.ts";
export type { Sampler } from "./motion.ts";
