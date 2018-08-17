define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Check',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defineProperties',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/SphereOutlineGeometry',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        Check,
        ColorGeometryInstanceAttribute,
        defineProperties,
        GeometryInstance,
        Matrix4,
        SphereOutlineGeometry,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    /**
     * A tile bounding volume specified as a sphere.
     * @alias TileBoundingSphere
     * @constructor
     *
     * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
     * @param {Number} [radius=0.0] The radius of the bounding sphere.
     *
     * @private
     */
    function TileBoundingSphere(center, radius) {
        this._boundingSphere = new BoundingSphere(center, radius);
    }

    defineProperties(TileBoundingSphere.prototype, {
        /**
         * The center of the bounding sphere
         *
         * @memberof TileBoundingSphere.prototype
         *
         * @type {Cartesian3}
         * @readonly
         */
        center : {
            get : function() {
                return this._boundingSphere.center;
            }
        },

        /**
         * The radius of the bounding sphere
         *
         * @memberof TileBoundingSphere.prototype
         *
         * @type {Number}
         * @readonly
         */
        radius : {
            get : function() {
                return this._boundingSphere.radius;
            }
        },

        /**
         * The underlying bounding volume
         *
         * @memberof TileBoundingSphere.prototype
         *
         * @type {Object}
         * @readonly
         */
        boundingVolume : {
            get : function() {
                return this._boundingSphere;
            }
        },
        /**
         * The underlying bounding sphere
         *
         * @memberof TileBoundingSphere.prototype
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
     * Computes the distance between this bounding sphere and the camera attached to frameState.
     *
     * @param {FrameState} frameState The frameState to which the camera is attached.
     * @returns {Number} The distance between the camera and the bounding sphere in meters. Returns 0 if the camera is inside the bounding volume.
     *
     */
    TileBoundingSphere.prototype.distanceToCamera = function(frameState) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('frameState', frameState);
        //>>includeEnd('debug');
        var boundingSphere = this._boundingSphere;
        return Math.max(0.0, Cartesian3.distance(boundingSphere.center, frameState.camera.positionWC) - boundingSphere.radius);
    };

    /**
     * Determines which side of a plane this sphere is located.
     *
     * @param {Plane} plane The plane to test against.
     * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
     *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
     *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
     *                      intersects the plane.
     */
    TileBoundingSphere.prototype.intersectPlane = function(plane) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('plane', plane);
        //>>includeEnd('debug');
        return BoundingSphere.intersectPlane(this._boundingSphere, plane);
    };

    /**
     * Update the bounding sphere after the tile is transformed.
     *
     * @param {Cartesian3} center The center of the bounding sphere.
     * @param {Number} radius The radius of the bounding sphere.
     */
    TileBoundingSphere.prototype.update = function(center, radius) {
        Cartesian3.clone(center, this._boundingSphere.center);
        this._boundingSphere.radius = radius;
    };

    /**
     * Creates a debug primitive that shows the outline of the sphere.
     *
     * @param {Color} color The desired color of the primitive's mesh
     * @return {Primitive}
     */
    TileBoundingSphere.prototype.createDebugVolume = function(color) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('color', color);
        //>>includeEnd('debug');
        var geometry = new SphereOutlineGeometry({
            radius: this.radius
        });
        var modelMatrix = Matrix4.fromTranslation(this.center, new Matrix4.clone(Matrix4.IDENTITY));
        var instance = new GeometryInstance({
            geometry : geometry,
            id : 'outline',
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

    return TileBoundingSphere;
});
