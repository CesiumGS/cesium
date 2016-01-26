/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/SphereOutlineGeometry',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        ColorGeometryInstanceAttribute,
        defined,
        defineProperties,
        DeveloperError,
        GeometryInstance,
        Matrix4,
        SphereOutlineGeometry,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    var TileBoundingSphere = function(center, radius) {
        this.boundingSphere = new BoundingSphere(center, radius);
    };

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
                return this.boundingSphere.center;
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
                return this.boundingSphere.radius;
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
                return this.boundingSphere;
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
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        //>>includeEnd('debug');
        var bs = this.boundingSphere;
        return Math.max(0.0, Cartesian3.distance(bs.center, frameState.camera.positionWC) - bs.radius);
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
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');
        return BoundingSphere.intersectPlane(this.boundingSphere, plane);
    };

    TileBoundingSphere.prototype.createDebugVolume = function(color) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(color)) {
            throw new DeveloperError('color is required.');
        }
        //>>includeEnd('debug');
        var geometry = new SphereOutlineGeometry({
            radius: this.radius
        });
        var modelMatrix = Matrix4.fromTranslation(this.center, new Matrix4.clone(Matrix4.IDENTITY));
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

    return TileBoundingSphere;
});
