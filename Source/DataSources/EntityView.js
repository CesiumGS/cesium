/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/JulianDate',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Transforms',
        '../Scene/HeadingPitchRange',
        '../Scene/SceneMode'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        Transforms,
        HeadingPitchRange,
        SceneMode) {
    "use strict";

    var updateTransformMatrix3Scratch1 = new Matrix3();
    var updateTransformMatrix3Scratch2 = new Matrix3();
    var updateTransformMatrix3Scratch3 = new Matrix3();
    var updateTransformMatrix4Scratch = new Matrix4();
    var updateTransformCartesian3Scratch1 = new Cartesian3();
    var updateTransformCartesian3Scratch2 = new Cartesian3();
    var updateTransformCartesian3Scratch3 = new Cartesian3();
    var updateTransformCartesian3Scratch4 = new Cartesian3();
    var updateTransformCartesian3Scratch5 = new Cartesian3();
    var updateTransformCartesian3Scratch6 = new Cartesian3();
    var deltaTime = new JulianDate();
    var northUpAxisFactor = 1.25;  // times ellipsoid's maximum radius

    function updateTransform(that, camera, updateLookAt, positionProperty, time, ellipsoid) {
        var updatedCameraTransform = false;

        var cartesian = positionProperty.getValue(time, that._lastCartesian);
        if (defined(cartesian)) {
            var hasBasis = false;
            var xBasis;
            var yBasis;
            var zBasis;

            var mode = that.scene.mode;
            if (mode === SceneMode.SCENE3D) {
                // The time delta was determined based on how fast satellites move compared to vehicles near the surface.
                // Slower moving vehicles will most likely default to east-north-up, while faster ones will be VVLH.
                deltaTime = JulianDate.addSeconds(time, 0.001, deltaTime);
                var deltaCartesian = positionProperty.getValue(deltaTime, updateTransformCartesian3Scratch1);
                if (defined(deltaCartesian)) {
                    var toInertial = Transforms.computeFixedToIcrfMatrix(time, updateTransformMatrix3Scratch1);
                    var toInertialDelta = Transforms.computeFixedToIcrfMatrix(deltaTime, updateTransformMatrix3Scratch2);
                    var toFixed;

                    if (!defined(toInertial) || !defined(toInertialDelta)) {
                        toFixed = Transforms.computeTemeToPseudoFixedMatrix(time, updateTransformMatrix3Scratch3);
                        toInertial = Matrix3.transpose(toFixed, updateTransformMatrix3Scratch1);
                        toInertialDelta = Transforms.computeTemeToPseudoFixedMatrix(deltaTime, updateTransformMatrix3Scratch2);
                        Matrix3.transpose(toInertialDelta, toInertialDelta);
                    } else {
                        toFixed = Matrix3.transpose(toInertial, updateTransformMatrix3Scratch3);
                    }

                    var inertialCartesian = Matrix3.multiplyByVector(toInertial, cartesian, updateTransformCartesian3Scratch5);
                    var inertialDeltaCartesian = Matrix3.multiplyByVector(toInertialDelta, deltaCartesian, updateTransformCartesian3Scratch6);

                    Cartesian3.subtract(inertialCartesian, inertialDeltaCartesian, updateTransformCartesian3Scratch4);
                    var inertialVelocity = Cartesian3.magnitude(updateTransformCartesian3Scratch4) * 1000.0; // meters/sec

                    // http://en.wikipedia.org/wiki/Standard_gravitational_parameter
                    // Consider adding this to Cesium.Ellipsoid?
                    var mu = 3.986004418e14; // m^3 / sec^2

                    var semiMajorAxis = -mu / (inertialVelocity * inertialVelocity - (2 * mu / Cartesian3.magnitude(inertialCartesian)));

                    if (semiMajorAxis < 0 || semiMajorAxis > northUpAxisFactor * ellipsoid.maximumRadius) {
                        // North-up viewing from deep space.

                        // X along the nadir
                        xBasis = updateTransformCartesian3Scratch2;
                        Cartesian3.normalize(cartesian, xBasis);
                        Cartesian3.negate(xBasis, xBasis);

                        // Z is North
                        zBasis = Cartesian3.clone(Cartesian3.UNIT_Z, updateTransformCartesian3Scratch3);

                        // Y is along the cross of z and x (right handed basis / in the direction of motion)
                        yBasis = Cartesian3.cross(zBasis, xBasis, updateTransformCartesian3Scratch1);
                        if (Cartesian3.magnitude(yBasis) > CesiumMath.EPSILON7) {
                            Cartesian3.normalize(xBasis, xBasis);
                            Cartesian3.normalize(yBasis, yBasis);

                            zBasis = Cartesian3.cross(xBasis, yBasis, updateTransformCartesian3Scratch3);
                            Cartesian3.normalize(zBasis, zBasis);

                            hasBasis = true;
                        }
                    } else if (!Cartesian3.equalsEpsilon(cartesian, deltaCartesian, CesiumMath.EPSILON7)) {
                        // Approximation of VVLH (Vehicle Velocity Local Horizontal) with the Z-axis flipped.

                        // Z along the position
                        zBasis = updateTransformCartesian3Scratch2;
                        Cartesian3.normalize(inertialCartesian, zBasis);
                        Cartesian3.normalize(inertialDeltaCartesian, inertialDeltaCartesian);

                        // Y is along the angular momentum vector (e.g. "orbit normal")
                        yBasis = Cartesian3.cross(zBasis, inertialDeltaCartesian, updateTransformCartesian3Scratch3);
                        if (!Cartesian3.equalsEpsilon(yBasis, Cartesian3.ZERO, CesiumMath.EPSILON7)) {
                            // X is along the cross of y and z (right handed basis / in the direction of motion)
                            xBasis = Cartesian3.cross(yBasis, zBasis, updateTransformCartesian3Scratch1);

                            Matrix3.multiplyByVector(toFixed, xBasis, xBasis);
                            Matrix3.multiplyByVector(toFixed, yBasis, yBasis);
                            Matrix3.multiplyByVector(toFixed, zBasis, zBasis);

                            Cartesian3.normalize(xBasis, xBasis);
                            Cartesian3.normalize(yBasis, yBasis);
                            Cartesian3.normalize(zBasis, zBasis);

                            hasBasis = true;
                        }
                    }
                }
            }

            if (defined(that._boundingSphereOffset)) {
                Cartesian3.add(that._boundingSphereOffset, cartesian, cartesian);
            }
            var transform = updateTransformMatrix4Scratch;
            if (hasBasis) {
                transform[0]  = xBasis.x;
                transform[1]  = xBasis.y;
                transform[2]  = xBasis.z;
                transform[3]  = 0.0;
                transform[4]  = yBasis.x;
                transform[5]  = yBasis.y;
                transform[6]  = yBasis.z;
                transform[7]  = 0.0;
                transform[8]  = zBasis.x;
                transform[9]  = zBasis.y;
                transform[10] = zBasis.z;
                transform[11] = 0.0;
                transform[12]  = cartesian.x;
                transform[13]  = cartesian.y;
                transform[14] = cartesian.z;
                transform[15] = 0.0;
            } else {
                // Stationary or slow-moving, low-altitude objects use East-North-Up.
                Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid, transform);
            }

            var offset;
            if ((mode === SceneMode.SCENE2D && that._offset2D.range === 0.0) || (mode !== SceneMode.SCENE2D  && Cartesian3.equals(that._offset3D, Cartesian3.ZERO))) {
                offset = undefined;
            } else {
                offset = mode === SceneMode.SCENE2D ? that._offset2D : that._offset3D;
            }

            camera.lookAtTransform(transform, offset);
            updatedCameraTransform = true;
        }

        if (updateLookAt && !updatedCameraTransform) {
            camera.lookAtTransform(camera.transform, that.scene.mode === SceneMode.SCENE2D ? that._offset2D : that._offset3D);
        }
    }

    /**
     * A utility object for tracking an entity with the camera.
     * @alias EntityView
     * @constructor
     *
     * @param {Entity} entity The entity to track with the camera.
     * @param {Scene} scene The scene to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use for orienting the camera.
     * @param {BoundingSphere} [boundingSphere] An initial bounding sphere for setting the default view.
     */
    var EntityView = function(entity, scene, ellipsoid, boundingSphere) {

        /**
         * The entity to track with the camera.
         * @type {Entity}
         */
        this.entity = entity;

        /**
         * The scene in which to track the object.
         * @type {Scene}
         */
        this.scene = scene;

        /**
         * The ellipsoid to use for orienting the camera.
         * @type {Ellipsoid}
         */
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        /**
         * Gets or sets an initial bounding sphere for viewing the entity.
         * @type {Entity}
         */
        this.boundingSphere = BoundingSphere.clone(boundingSphere);

        this._boundingSphereOffset = undefined;

        //Shadow copies of the objects so we can detect changes.
        this._lastEntity = undefined;
        this._mode = undefined;

        this._lastCartesian = new Cartesian3();
        this._defaultOffset3D = undefined;
        this._defaultOffset2D = undefined;

        this._offset3D = new Cartesian3();
        this._offset2D = new HeadingPitchRange();
    };

    // STATIC properties defined here, not per-instance.
    defineProperties(EntityView, {
        /**
         * Gets or sets a camera offset that will be used to
         * initialize subsequent EntityViews.
         * @memberof EntityView
         * @type {Cartesian3}
         */
        defaultOffset3D : {
            get : function() {
                return this._defaultOffset3D;
            },
            set : function(vector) {
                this._defaultOffset3D = Cartesian3.clone(vector, new Cartesian3());
                this._defaultOffset2D = new HeadingPitchRange(0.0, 0.0, Cartesian3.magnitude(this._defaultOffset3D));
            }
        }
    });

    // Initialize the static property.
    EntityView.defaultOffset3D = new Cartesian3(-14000, 3500, 3500);

    var scratchHeadingPitchRange = new HeadingPitchRange();
    var scratchCartesian = new Cartesian3();

    /**
    * Should be called each animation frame to update the camera
    * to the latest settings.
    * @param {JulianDate} time The current animation time.
    *
    */
    EntityView.prototype.update = function(time) {
        var scene = this.scene;
        var entity = this.entity;
        var ellipsoid = this.ellipsoid;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('EntityView.scene is required.');
        }
        if (!defined(entity)) {
            throw new DeveloperError('EntityView.entity is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('EntityView.ellipsoid is required.');
        }
        if (!defined(entity.position)) {
            throw new DeveloperError('entity.position is required.');
        }
        //>>includeEnd('debug');

        var sceneMode = scene.mode;
        if (sceneMode === SceneMode.MORPHING) {
            return;
        }

        var positionProperty = entity.position;
        var objectChanged = entity !== this._lastEntity;
        var sceneModeChanged = sceneMode !== this._mode;

        var offset3D = this._offset3D;
        var offset2D = this._offset2D;
        var camera = scene.camera;

        var updateLookAt = objectChanged || sceneModeChanged;
        if (objectChanged) {
            var viewFromProperty = entity.viewFrom;
            var hasViewFrom = defined(viewFromProperty);
            var sphere = this.boundingSphere;
            this._boundingSphereOffset = undefined;

            if (!hasViewFrom && defined(sphere)) {
                var controller = scene.screenSpaceCameraController;
                controller.minimumZoomDistance = Math.min(controller.minimumZoomDistance, sphere.radius * 0.5);

                //The default HPR is not ideal for high altitude objects so
                //we scale the pitch as we get further from the earth for a more
                //downward view.
                scratchHeadingPitchRange.pitch = -CesiumMath.PI_OVER_FOUR;
                scratchHeadingPitchRange.range = 0;
                var position = positionProperty.getValue(time, scratchCartesian);
                if (defined(position)) {
                    var factor = 2 - 1 / Math.max(1, Cartesian3.magnitude(position) / ellipsoid.maximumRadius);
                    scratchHeadingPitchRange.pitch *= factor;
                }

                camera.viewBoundingSphere(sphere, scratchHeadingPitchRange);
                this._boundingSphereOffset = Cartesian3.subtract(sphere.center, entity.position.getValue(time), new Cartesian3());
                updateLookAt = false;
            } else if (!hasViewFrom || !defined(viewFromProperty.getValue(time, offset3D))) {
                HeadingPitchRange.clone(EntityView._defaultOffset2D, offset2D);
                Cartesian3.clone(EntityView._defaultOffset3D, offset3D);
            } else {
                offset2D.heading = 0.0;
                offset2D.range = Cartesian3.magnitude(offset3D);
            }
        } else if (!sceneModeChanged && scene.mode !== SceneMode.MORPHING) {
            if (this._mode === SceneMode.SCENE2D) {
                offset2D.heading = camera.heading;
                offset2D.range = camera.frustum.right - camera.frustum.left;
            } else if (this._mode === SceneMode.SCENE3D || this._mode === SceneMode.COLUMBUS_VIEW) {
                Cartesian3.clone(camera.position, offset3D);
            }
        }

        this._lastEntity = entity;
        this._mode = scene.mode !== SceneMode.MORPHING ? scene.mode : this._mode;

        if (scene.mode !== SceneMode.MORPHING) {
            updateTransform(this, camera, updateLookAt, positionProperty, time, ellipsoid);
        }
    };

    return EntityView;
});
