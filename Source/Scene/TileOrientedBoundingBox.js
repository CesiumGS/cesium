/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/BoxOutlineGeometry',
        '../Core/Cartesian3',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/OrientedBoundingBox',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        BoxOutlineGeometry,
        Cartesian3,
        ColorGeometryInstanceAttribute,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        Matrix3,
        Matrix4,
        OrientedBoundingBox,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    function TileOrientedBoundingBox(center, halfAxes) {
        this._orientedBoundingBox = new OrientedBoundingBox(center, halfAxes);
        this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(this._orientedBoundingBox);
    }

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
                return this._orientedBoundingBox;
            }
        },
        /**
         * The underlying bounding sphere
         * 
         * @memberof TileOrientedBoundingBox.prototype
         * 
         * @type {BoundingSphere}
         * @readonly
         */
        boundingSphere : { 
            get : function() {
                return this._boundingSphere;
            }
        }
    });

    /**
     * Computes the distance between this bounding box and the camera attached to frameState.
     *
     * @param {FrameState} frameState The frameState to which the camera is attached.
     * @returns {Number} The distance between the camera and the bounding box in meters. Returns 0 if the camera is inside the bounding volume.
     */
    TileOrientedBoundingBox.prototype.distanceToCamera = function(frameState) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        //>>includeEnd('debug');
        return Math.sqrt(this._orientedBoundingBox.distanceSquaredTo(frameState.camera.positionWC));
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
        return this._orientedBoundingBox.intersectPlane(plane);
    };

    /**
     * Update the bounding box after the tile is transformed.
     */
    TileOrientedBoundingBox.prototype.update = function(center, halfAxes) {
        Cartesian3.clone(center, this._orientedBoundingBox.center);
        Matrix3.clone(halfAxes, this._orientedBoundingBox.halfAxes);
        BoundingSphere.fromOrientedBoundingBox(this._orientedBoundingBox, this._boundingSphere);
    };

    /**
     * Creates a debug primitive that shows the outline of the box.
     *
     * @param {Color} color The desired color of the primitive's mesh
     * @return {Primitive}
     */
    TileOrientedBoundingBox.prototype.createDebugVolume = function(color) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');

        var geometry = new BoxOutlineGeometry({
            // Make a 2x2x2 cube
            minimum: new Cartesian3(-1.0, -1.0, -1.0),
            maximum: new Cartesian3(1.0, 1.0, 1.0)
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
