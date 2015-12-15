/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/OrientedBoundingBox',
        '../Core/Rectangle'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        OrientedBoundingBox,
        Rectangle) {
    "use strict";

    var TileOrientedBoundingBox = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.rectangle)) {
            throw new DeveloperError('options.rectangle is required.');
        }
        //>>includeEnd('debug');

        var rectangle = Rectangle.clone(options.rectangle);
        var minimumHeight = defaultValue(options.minimumHeight, 0.0);
        var maximumHeight = defaultValue(options.maximumHeight, 0.0);

        this.orientedBoundingBox = new OrientedBoundingBox();
        OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight);
    };

    /**
     * Computes the distance between this bounding box and the camera attached to frameState.
     * @param {FrameState} [frameState] The frameState to which the camera is attached.
     * @returns {Number} The distance between the camera and the bounding box in meters. Returns 0 if the camera is inside the bounding volume.
     *
     */
    TileOrientedBoundingBox.prototype.distanceToCamera = function(frameState) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        //>>includeEnd('debug');
        var obb = this.orientedBoundingBox;
        return Math.sqrt(obb.distanceSquaredTo(frameState.camera.positionWC));
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        var obb = this.orientedBoundingBox;
        return obb.intersectPlane(plane);
    };

    return TileOrientedBoundingBox;
});
