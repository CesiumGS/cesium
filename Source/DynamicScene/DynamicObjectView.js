/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Transforms',
        '../Scene/SceneMode'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        CesiumMath,
        Matrix3,
        Transforms,
        SceneMode) {
    "use strict";

    var updateTransformMatrix3Scratch1 = new Matrix3();
    var updateTransformMatrix3Scratch2 = new Matrix3();
    var updateTransformMatrix3Scratch3 = new Matrix3();
    var updateTransformCartesian3Scratch1 = new Cartesian3();
    var updateTransformCartesian3Scratch2 = new Cartesian3();
    var updateTransformCartesian3Scratch3 = new Cartesian3();

    function updateTransform(that, camera, objectChanged, positionProperty, time, ellipsoid) {
        var cartesian = positionProperty.getValue(time, that._lastCartesian);
        if (defined(cartesian)) {
            var successful = false;

            // The time delta was determined based on how fast satellites move compared to vehicles near the surface.
            // Slower moving vehicles will most likely default to east-north-up, while faster ones will be LVLH.
            var deltaTime = time.addSeconds(0.01);
            var deltaCartesian = positionProperty.getValue(deltaTime, updateTransformCartesian3Scratch1);
            if (defined(deltaCartesian) && !Cartesian3.equalsEpsilon(cartesian, deltaCartesian, CesiumMath.EPSILON6)) {
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

                // Z along the position
                var zBasis = updateTransformCartesian3Scratch2;
                Cartesian3.normalize(cartesian, zBasis);
                Cartesian3.normalize(deltaCartesian, deltaCartesian);

                Matrix3.multiplyByVector(toInertial, zBasis, zBasis);
                Matrix3.multiplyByVector(toInertialDelta, deltaCartesian, deltaCartesian);

                // Y is along the angular momentum vector (e.g. "orbit normal")
                var yBasis = Cartesian3.cross(zBasis, deltaCartesian, updateTransformCartesian3Scratch3);
                if (!Cartesian3.equalsEpsilon(yBasis, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
                    // X is along the cross of y and z (right handed basis / in the direction of motion)
                    var xBasis = Cartesian3.cross(yBasis, zBasis, updateTransformCartesian3Scratch1);

                    Matrix3.multiplyByVector(toFixed, xBasis, xBasis);
                    Matrix3.multiplyByVector(toFixed, yBasis, yBasis);
                    Matrix3.multiplyByVector(toFixed, zBasis, zBasis);

                    Cartesian3.normalize(xBasis, xBasis);
                    Cartesian3.normalize(yBasis, yBasis);
                    Cartesian3.normalize(zBasis, zBasis);

                    var transform = camera.transform;
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

                    successful = true;
                }
            }

            if (!successful) {
                Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid, camera.transform);
            }

            that._screenSpaceCameraController.ellipsoid = Ellipsoid.UNIT_SPHERE;
        }

        updateController(that, camera, objectChanged);
    }

    function updateController(that, camera, objectChanged) {
        var scene = that.scene;

        if (objectChanged || scene.mode !== that._mode) {
            that._mode = scene.mode;
            if (scene.mode === SceneMode.SCENE2D) {
                camera.lookAt(that._offset2D, Cartesian3.ZERO, that._up2D);
            } else {
                camera.lookAt(that._offset3D, Cartesian3.ZERO, that._up3D);
            }
        }

        if (scene.mode === SceneMode.SCENE2D) {
            Cartesian3.fromElements(0.0, 0.0, camera.getMagnitude(), that._offset2D);
            Cartesian3.clone(camera.up, that._up2D);
        } else {
            Cartesian3.clone(camera.position, that._offset3D);
            Cartesian3.clone(camera.up, that._up3D);
        }
    }

    /**
     * A utility object for tracking an object with the camera.
     * @alias DynamicObjectView
     * @constructor
     *
     * @param {DynamicObject} dynamicObject The object to track with the camera.
     * @param {Scene} scene The scene to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use for orienting the camera.
     */
    var DynamicObjectView = function(dynamicObject, scene, ellipsoid) {
        /**
         * The object to track with the camera.
         * @type {DynamicObject}
         */
        this.dynamicObject = dynamicObject;

        /**
         * The scene in which to track the object.
         * @type {Scene}
         */
        this.scene = scene;
        this._lastScene = undefined;

        /**
         * The ellipsoid to use for orienting the camera.
         * @type {Ellipsoid}
         */
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        //Shadow copies of the objects so we can detect changes.
        this._lastDynamicObject = undefined;
        this._mode = undefined;

        //Re-usable objects to be used for retrieving position.
        this._lastCartesian = new Cartesian3();

        this._offset3D = new Cartesian3(10000, -10000, 10000);
        this._up3D = Cartesian3.cross(this._offset3D, Cartesian3.cross(Cartesian3.UNIT_Z, this._offset3D));
        Cartesian3.normalize(this._up3D, this._up3D);

        this._offset2D = new Cartesian3(0.0, 0.0, Cartesian3.magnitude(this._offset3D));
        this._up2D = Cartesian3.clone(Cartesian3.UNIT_Y);
    };

    /**
    * Should be called each animation frame to update the camera
    * to the latest settings.
    * @param {JulianDate} time The current animation time.
    *
    */
    DynamicObjectView.prototype.update = function(time) {
        var scene = this.scene;
        var dynamicObject = this.dynamicObject;
        var ellipsoid = this.ellipsoid;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('DynamicObjectView.scene is required.');
        }
        if (!defined(dynamicObject)) {
            throw new DeveloperError('DynamicObjectView.dynamicObject is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('DynamicObjectView.ellipsoid is required.');
        }
        if (!defined(dynamicObject.position)) {
            throw new DeveloperError('dynamicObject.position is required.');
        }
        //>>includeEnd('debug');

        if (scene !== this._lastScene) {
            this._lastScene = scene;
            this._screenSpaceCameraController = scene.screenSpaceCameraController;
        }

        var positionProperty = dynamicObject.position;
        var objectChanged = dynamicObject !== this._lastDynamicObject;
        this._lastDynamicObject = dynamicObject;

        if (scene.mode !== SceneMode.MORPHING) {
            updateTransform(this, scene.camera, objectChanged, positionProperty, time, ellipsoid);
        }
    };

    return DynamicObjectView;
});
