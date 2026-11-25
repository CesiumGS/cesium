// @ts-check

import { FixedFrameTransforms, deprecationWarning } from "@cesium/core";
import CelestialFrameTransforms from "./CelestialFrameTransforms.js";

/** @import { JulianDate, Matrix3, TimeInterval } from "@cesium/core"; */

/**
 * Contains functions for transforming positions to various reference frames.
 *
 * @namespace Transforms
 *
 * @borrows FixedFrameTransforms.localFrameToFixedFrameGenerator as localFrameToFixedFrameGenerator
 * @borrows FixedFrameTransforms.eastNorthUpToFixedFrame as eastNorthUpToFixedFrame
 * @borrows FixedFrameTransforms.northEastDownToFixedFrame as northEastDownToFixedFrame
 * @borrows FixedFrameTransforms.northUpEastToFixedFrame as northUpEastToFixedFrame
 * @borrows FixedFrameTransforms.northWestUpToFixedFrame as northWestUpToFixedFrame
 * @borrows FixedFrameTransforms.headingPitchRollToFixedFrame as headingPitchRollToFixedFrame
 * @borrows FixedFrameTransforms.headingPitchRollQuaternion as headingPitchRollQuaternion
 * @borrows FixedFrameTransforms.fixedFrameToHeadingPitchRoll as fixedFrameToHeadingPitchRoll
 * @borrows FixedFrameTransforms.pointToWindowCoordinates as pointToWindowCoordinates
 * @borrows FixedFrameTransforms.rotationMatrixFromPositionVelocity as rotationMatrixFromPositionVelocity
 */
const Transforms = {
  ...FixedFrameTransforms,
};

const deprecatedCelestialMembers = [
  "computeIcrfToCentralBodyFixedMatrix",
  "computeTemeToPseudoFixedMatrix",
  "preloadIcrfFixed",
  "computeIcrfToFixedMatrix",
  "computeMoonFixedToIcrfMatrix",
  "computeIcrfToMoonFixedMatrix",
  "computeFixedToIcrfMatrix",
  "earthOrientationParameters",
  "iau2006XysData",
];

/**
 * The default function to compute a rotation matrix to transform a point or vector from the International Celestial
 * Reference Frame (GCRF/ICRF) inertial frame axes to the central body, typically Earth, fixed frame axis at a given
 * time for use in lighting and transformation from inertial reference frames.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeIcrfToCentralBodyFixedMatrix} instead.
 *
 * @function computeIcrfToCentralBodyFixedMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3|undefined} The rotation matrix, or undefined if the data necessary to do the
 *                   transformation is not yet loaded.
 */

/**
 * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
 * pseudo-fixed axes at a given time.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeTemeToPseudoFixedMatrix} instead.
 *
 * @function computeTemeToPseudoFixedMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
 */

/**
 * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
 * direction, over a given interval.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.preloadIcrfFixed} instead.
 *
 * @function preloadIcrfFixed
 * @memberof Transforms
 * @param {TimeInterval} timeInterval The interval to preload.
 * @returns {Promise<void>} A promise that, when resolved, indicates that the preload has completed.
 */

/**
 * Computes a rotation matrix to transform a point or vector from the International Celestial
 * Reference Frame (GCRF/ICRF) inertial frame axes to the Earth-Fixed frame axes (ITRF)
 * at a given time.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeIcrfToFixedMatrix} instead.
 *
 * @function computeIcrfToFixedMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3|undefined} The rotation matrix, or undefined if the data necessary to do the
 *                   transformation is not yet loaded.
 */

/**
 * Computes a rotation matrix to transform a point or vector from the Moon-Fixed frame axes
 * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
 * at a given time.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeMoonFixedToIcrfMatrix} instead.
 *
 * @function computeMoonFixedToIcrfMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The rotation matrix.
 */

/**
 * Computes a rotation matrix to transform a point or vector from the International Celestial
 * Reference Frame (GCRF/ICRF) inertial frame axes to the Moon-Fixed frame axes
 * at a given time.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeIcrfToMoonFixedMatrix} instead.
 *
 * @function computeIcrfToMoonFixedMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3} The rotation matrix.
 */

/**
 * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes (ITRF)
 * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
 * at a given time.
 *
 * @deprecated This function has been deprecated and will be removed in CesiumJS 1.153. Use {@link CelestialFrameTransforms.computeFixedToIcrfMatrix} instead.
 *
 * @function computeFixedToIcrfMatrix
 * @memberof Transforms
 * @param {JulianDate} date The time at which to compute the rotation matrix.
 * @param {Matrix3} [result] The object onto which to store the result.
 * @returns {Matrix3|undefined} The rotation matrix, or undefined if the data necessary to do the
 *                   transformation is not yet loaded.
 */

// Forward to CelestialFrameTransforms, rather than copying, so assignments such as earthOrientationParameters take effect internally.
for (const name of deprecatedCelestialMembers) {
  const identifier = `Transforms.${name}`;
  const message = `${identifier} was deprecated in CesiumJS 1.148 and will be removed in 1.153. Use CelestialFrameTransforms.${name} instead.`;
  Object.defineProperty(Transforms, name, {
    enumerable: true,
    configurable: true,
    get: function () {
      deprecationWarning(identifier, message);
      return /** @type {any} */ (CelestialFrameTransforms)[name];
    },
    set: function (value) {
      deprecationWarning(identifier, message);
      /** @type {any} */ (CelestialFrameTransforms)[name] = value;
    },
  });
}

export default Transforms;
