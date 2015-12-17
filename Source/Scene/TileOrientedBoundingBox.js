/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/OrientedBoundingBox'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        OrientedBoundingBox) {
    "use strict";

    var TileOrientedBoundingBox = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        this.orientedBoundingBox = new OrientedBoundingBox(options.center, options.halfAxes);
    };

    defineProperties(TileOrientedBoundingBox.prototype, {
        /**
         * The underlying bounding volume
         *
         * @memberof TileOrientedBoundingBox.prototype
         *
         * @type {Object}
         * @readonly
         */
        boundingVolume : {
            get : function() {
                return this.orientedBoundingBox;
            }
        }
    });

    /**
     * Computes the distance between this bounding box and the camera attached to frameState.
     * @param {FrameState} [frameState] The frameState to which the camera is attached.
     * @returns {Number} The distance between the camera and the bounding box in meters. Returns 0 if the camera is inside the bounding volume.
     */
    TileOrientedBoundingBox.prototype.distanceToCamera = function(frameState) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        //>>includeEnd('debug');
        return Math.sqrt(this.orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC));
    };

    /**
     * Determines which side of a plane this box is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
     *                      intersects the plane.
     */
    TileOrientedBoundingBox.prototype.intersectPlane = function(plane) {
        return this.orientedBoundingBox.intersectPlane(plane);
    };


    // TODO: fill in this function. What outline geometry should it use?
    TileOrientedBoundingBox.prototype.createDebugVolume = function(color) {
        throw new DeveloperError("createDebugVolume is not yet defined for type TileOrientedBoundingBox");
    };

    return TileOrientedBoundingBox;
});
