/*global define*/
define([
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        BoxOutlineGeometry,
        Cartesian3,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        Matrix4,
        OrientedBoundingBox,
        PerInstanceColorAppearance,
        Primitive) {
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');
        return this.orientedBoundingBox.intersectPlane(plane);
    };

    TileOrientedBoundingBox.prototype.createDebugVolume = function(color) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        var geometry = new BoxOutlineGeometry({
            // Make a cube of unit size -- all sides of length 1.0
            minimum: new Cartesian3(-0.5, -0.5, -0.5),
            maximum: new Cartesian3(0.5, 0.5, 0.5)
        });
        var modelMatrix = Matrix4.fromRotationTranslation(this.boundingVolume.halfAxes, this.boundingVolume.center);
        var instance = new GeometryInstance({
            geometry : geometry,
            modelMatrix : modelMatrix,
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(color)
            }
        });

        return new Primitive({
            geometryInstances : instance,
            appearance : new PerInstanceColorAppearance({
                translucent : false,
                flat : true
            }),
            asynchronous : false
        });
    };

    return TileOrientedBoundingBox;
});
