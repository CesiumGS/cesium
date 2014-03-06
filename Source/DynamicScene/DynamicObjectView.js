/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Quaternion',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Ellipsoid',
        '../Core/Transforms',
        '../Scene/SceneMode'
       ], function(
         defaultValue,
         defined,
         DeveloperError,
         CesiumMath,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Cartographic,
         Quaternion,
         Matrix3,
         Matrix4,
         Ellipsoid,
         Transforms,
         SceneMode) {
    "use strict";

    var updateTransformMatrix3Scratch1 = new Matrix3();
    var updateTransformMatrix3Scratch2 = new Matrix3();
    var updateTransformMatrix3Scratch3 = new Matrix3();
    var updateTransformCartesian3Scratch1 = new Cartesian3();
    var updateTransformCartesian3Scratch2 = new Cartesian3();
    var updateTransformCartesian3Scratch3 = new Cartesian3();

    function updateTransform(that, camera, objectChanged, offset, positionProperty, time, ellipsoid) {
        // TODO: update lookAt to work as closely as possible in all scene modes.
        //updateController(that, camera, objectChanged, offset);

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

            var position = camera.position;
            Cartesian3.clone(position, that._lastOffset);
            that._lastDistance = Cartesian3.magnitude(position);
        }
    }

    var updateControllerQuaternion = new Quaternion();
    var updateControllerMatrix3 = new Matrix3();

    function updateController(that, camera, objectChanged, offset) {
        var scene = that.scene;

        if (objectChanged) {
            camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);
        } else if (scene.mode !== that._mode) {
            that._mode = scene.mode;

            //If we're switching from 2D and any rotation was applied to the camera,
            //apply that same rotation to the last offset used in 3D or Columbus view.
            var first2dUp = that._first2dUp;
            var last2dUp = that._last2dUp;
            if (!Cartesian2.equals(first2dUp, last2dUp)) {
                var startTheta = Math.acos(first2dUp.x);
                if (first2dUp.y < 0) {
                    startTheta = CesiumMath.TWO_PI - startTheta;
                }
                var endTheta = Math.acos(last2dUp.x);
                if (last2dUp.y < 0) {
                    endTheta = CesiumMath.TWO_PI - endTheta;
                }
                last2dUp.x = 0.0;
                last2dUp.y = 0.0;
                first2dUp.x = 0.0;
                first2dUp.y = 0.0;

                var theta = endTheta - startTheta;
                var rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, theta, updateControllerQuaternion);
                Matrix3.multiplyByVector(Matrix3.fromQuaternion(rotation, updateControllerMatrix3), offset, offset);
            }
            Cartesian3.multiplyByScalar(Cartesian3.normalize(offset, offset), that._lastDistance, offset);
            camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);
        }
    }

    var dynamicObjectViewDefaultOffset = new Cartesian3(10000, -10000, 10000);
    var dynamicObjectViewCartesian3Scratch = new Cartesian3();

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
        this._lastCartographic = new Cartographic();

        //Current distance of dynamicObject from camera so we can maintain view distance across scene modes.
        this._lastDistance = undefined;

        //Last viewing offset in 3D/Columbus view, this way we can restore to a sensible view across scene modes.
        this._lastOffset = new Cartesian3();

        //Scratch value for calculating offsets
        this._offsetScratch = new Cartesian3();

        //Tracks camera up so that we can detect 2D camera rotation and modify the 3D/Columbus view to match when switching modes.
        this._first2dUp = new Cartesian2();
        this._last2dUp = new Cartesian2();
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

        //Determine what the current camera offset should be, this is used
        //to either set the default view when a new object is selected or
        //maintain a similar view when changing scene modes.
        var offset = this._offsetScratch;
        if (objectChanged) {
            this._lastDynamicObject = dynamicObject;

            var viewFromProperty = this.dynamicObject.viewFrom;
            if (!defined(viewFromProperty) || !defined(viewFromProperty.getValue(time, offset))) {
                Cartesian3.clone(dynamicObjectViewDefaultOffset, offset);
            }

            //Reset object-based cached values.
            var first2dUp = this._first2dUp;
            var last2dUp = this._last2dUp;
            first2dUp.x = first2dUp.y = 0;
            last2dUp.x = last2dUp.y = 0;
            Cartesian3.clone(offset, this._lastOffset);
            this._lastDistance = Cartesian3.magnitude(offset);

            //If looking straight down, move the camera slightly south the avoid gimbal lock.
            if (Cartesian3.equals(Cartesian3.normalize(offset, dynamicObjectViewCartesian3Scratch), Cartesian3.UNIT_Z)) {
                offset.y -= 0.01;
            }
        } else if (defined(this._lastOffset)) {
            offset = this._lastOffset;
        } else {
            Cartesian3.clone(dynamicObjectViewDefaultOffset, offset);
        }

        if (scene.mode !== SceneMode.MORPHING) {
            updateTransform(this, scene.camera, objectChanged, offset, positionProperty, time, ellipsoid);
        }
    };

    return DynamicObjectView;
});
