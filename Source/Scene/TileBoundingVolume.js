/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
    ], function(
        defined,
        defineProperties,
        DeveloperError) {
    "use strict";

    /**
     * Defines a bounding volume for a tile. This type describes an interface
     * and is not intended to be instantiated directly.
     *
     * @see TileBoundingBox
     * @see TileBoundingSphere
     */
    var TileBoundingVolume = function() {
    };

    /**
     * Calculates the distance between the tile and the camera.
     *
     * @function
     *
     * @param {FrameState} frameState The frame state.
     * @return {Number} The distance between the tile and the camera, in meters.
     *                  Returns 0.0 if the camera is inside the tile.
     *
     */
    TileBoundingVolume.prototype.distanceToCamera = DeveloperError.throwInstantiationError;

    /**
     * Determines which side of a plane this volume is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire volume is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the volume
     *                      intersects the plane.
     */
     TileBoundingVolume.prototype.intersectPlane = DeveloperError.throwInstantiationError;

    return TileBoundingVolume;
});
