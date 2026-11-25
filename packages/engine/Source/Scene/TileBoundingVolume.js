import { DeveloperError } from "@cesium/core";

/**
 * Defines a bounding volume for a tile. This type describes an interface
 * and is not intended to be instantiated directly.
 *
 * @alias TileBoundingVolume
 * @constructor
 *
 * @see TileBoundingRegion
 * @see TileBoundingSphere
 * @see TileOrientedBoundingBox
 *
 * @private
 */
function TileBoundingVolume() {}

/**
 * The underlying bounding volume.
 *
 * @type {object}
 * @readonly
 */
TileBoundingVolume.prototype.boundingVolume = undefined;

/**
 * The underlying bounding sphere.
 *
 * @type {BoundingSphere}
 * @readonly
 */
TileBoundingVolume.prototype.boundingSphere = undefined;

/**
 * Calculates the distance between the tile and the camera.
 *
 * @param {FrameState} frameState The frame state.
 * @return {number} The distance between the tile and the camera, in meters.
 *                  Returns 0.0 if the camera is inside the tile.
 */
TileBoundingVolume.prototype.distanceToCamera = function (frameState) {
  DeveloperError.throwInstantiationError();
};

/**
 * Determines which side of a plane this volume is located:
 * {@link Intersect.INSIDE} if the entire volume is on the side the plane's normal points to,
 * {@link Intersect.OUTSIDE} if the entire volume is on the opposite side, or
 * {@link Intersect.INTERSECTING} if the volume intersects the plane.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} The side of the plane the volume is on.
 */
TileBoundingVolume.prototype.intersectPlane = function (plane) {
  DeveloperError.throwInstantiationError();
};

/**
 * Creates a debug primitive that shows the outline of the tile bounding
 * volume.
 *
 * @param {Color} color The desired color of the primitive's mesh
 * @return {Primitive}
 */
TileBoundingVolume.prototype.createDebugVolume = function (color) {
  DeveloperError.throwInstantiationError();
};
export default TileBoundingVolume;
