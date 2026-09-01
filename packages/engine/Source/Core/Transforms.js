// @ts-check

import CelestialFrameTransforms from "./CelestialFrameTransforms.js";
import FixedFrameTransforms from "./FixedFrameTransforms.js";

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
 * @borrows CelestialFrameTransforms.computeIcrfToCentralBodyFixedMatrix as computeIcrfToCentralBodyFixedMatrix
 * @borrows CelestialFrameTransforms.computeTemeToPseudoFixedMatrix as computeTemeToPseudoFixedMatrix
 * @borrows CelestialFrameTransforms.preloadIcrfFixed as preloadIcrfFixed
 * @borrows CelestialFrameTransforms.computeIcrfToFixedMatrix as computeIcrfToFixedMatrix
 * @borrows CelestialFrameTransforms.computeMoonFixedToIcrfMatrix as computeMoonFixedToIcrfMatrix
 * @borrows CelestialFrameTransforms.computeIcrfToMoonFixedMatrix as computeIcrfToMoonFixedMatrix
 * @borrows CelestialFrameTransforms.computeFixedToIcrfMatrix as computeFixedToIcrfMatrix
 */
const Transforms = {
  ...FixedFrameTransforms,
  ...CelestialFrameTransforms,
};

export default Transforms;
