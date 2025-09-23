import pickModelOld from "./pickModelOld.js";
import pickModelNew from "./pickModelNew.js";

import CesiumMath from "../../Core/Math.js";
import Cartesian3 from "../../Core/Cartesian3.js";

// TODO For basic "performance" measurement
const measurePerformance = true;
const durationsOldMs = [];
const durationsNewMs = [];
const averaging = 1000;
let callCounter = 0;

/**
 * Find an intersection between a ray and the model surface that was rendered. The ray must be given in world coordinates.
 *
 * @param {Model} model The model to pick.
 * @param {Ray} ray The ray to test for intersection.
 * @param {FrameState} frameState The frame state.
 * @param {number} [verticalExaggeration=1.0] A scalar used to exaggerate the height of a position relative to the ellipsoid. If the value is 1.0 there will be no effect.
 * @param {number} [relativeHeight=0.0] The ellipsoid height relative to which a position is exaggerated. If the value is 0.0 the position will be exaggerated relative to the ellipsoid surface.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.default] The ellipsoid to which the exaggerated position is relative.
 * @param {Cartesian3|undefined} [result] The intersection or <code>undefined</code> if none was found.
 * @returns {Cartesian3|undefined} The intersection or <code>undefined</code> if none was found.
 *
 * @private
 */
export default function pickModel(
  model,
  ray,
  frameState,
  verticalExaggeration,
  relativeHeight,
  ellipsoid,
  result,
) {
  if (verticalExaggeration !== 1.0) {
    return pickModelOld(
      model,
      ray,
      frameState,
      verticalExaggeration,
      relativeHeight,
      ellipsoid,
      result,
    );
  }

  if (!measurePerformance) {
    return pickModelNew(model, ray, frameState, result);
  }

  const beforeOldMs = performance.now();
  const resultOld = pickModelOld(
    model,
    ray,
    frameState,
    verticalExaggeration,
    relativeHeight,
    ellipsoid,
    result,
  );
  const afterOldMs = performance.now();
  const durationOldMs = afterOldMs - beforeOldMs;

  const beforeNewMs = performance.now();
  const resultNew = pickModelNew(model, ray, frameState, result);
  const afterNewMs = performance.now();
  const durationNewMs = afterNewMs - beforeNewMs;

  if (!Cartesian3.equalsEpsilon(resultOld, resultNew, CesiumMath.EPSILON6)) {
    console.log("Different results!!!");
    console.log("  old ", resultOld);
    console.log("  new ", resultNew);
  }

  durationsOldMs.push(durationOldMs);
  while (durationsOldMs.length > averaging) {
    durationsOldMs.shift();
  }
  durationsNewMs.push(durationNewMs);
  while (durationsNewMs.length > averaging) {
    durationsNewMs.shift();
  }

  callCounter++;
  if (callCounter % averaging === 0) {
    const averageOldMs =
      durationsOldMs.reduce((a, b) => a + b) / durationsOldMs.length;
    const averageNewMs =
      durationsNewMs.reduce((a, b) => a + b) / durationsNewMs.length;
    console.log(`Average duration of ${averaging} calls`);
    console.log(` old: ${averageOldMs} ms`);
    console.log(` new: ${averageNewMs} ms`);
  }
  return resultNew;
}
