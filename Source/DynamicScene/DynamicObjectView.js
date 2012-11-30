/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/Quaternion',
        '../Core/Matrix3',
        '../Core/Ellipsoid',
        '../Core/Transforms',
        '../Scene/SceneMode'
       ], function(
         defaultValue,
         DeveloperError,
         CesiumMath,
         Cartesian2,
         Cartesian3,
         Cartesian4,
         Cartographic,
         Quaternion,
         Matrix3,
         Ellipsoid,
         Transforms,
         SceneMode) {
    "use strict";

    function update2D(that, camera, objectChanged, offset, positionProperty, time, projection) {
        var viewDistance;
        var controller = that._controller2d;
        var controllerChanged = typeof controller === 'undefined' || controller !== that._lastController || controller.isDestroyed();

        //Handle case where controller was modified without our knowledge.
        if (controllerChanged) {
            var controllers = camera.getControllers();
            controllers.removeAll();
            that._lastController = that._controller2d = controller = controllers.add2D(projection);
            controller.enableTranslate = false;
            viewDistance = offset.magnitude();
        } else if (objectChanged) {
            viewDistance = offset.magnitude();
        } else {
            viewDistance = camera.position.z;
        }

        var cartographic = positionProperty.getValueCartographic(time, that._lastCartographic);
        //We are assigning the position of the camera, not of the object, so modify the height appropriately.
        cartographic.height = viewDistance;
        if (objectChanged || controllerChanged) {
            controller.setPositionCartographic(cartographic);

            //Set rotation to match offset.
            Cartesian3.normalize(offset, camera.up);
            Cartesian3.negate(camera.up, camera.up);
            Cartesian3.cross(camera.direction, camera.up, camera.right);

            //z is always zero in 2D for up and right
            camera.up.z = 0;
            Cartesian3.normalize(camera.up, camera.up);
            camera.right.z = 0;
            Cartesian3.normalize(camera.right, camera.right);

            //Remember what up was when we started, so we
            //can detect rotation when we are finished.
            Cartesian2.clone(camera.right, that._first2dUp);
        } else {
            camera.position = projection.project(cartographic);
        }

        //Store last view distance and up vector.
        that._lastDistance = camera.frustum.right - camera.frustum.left;
        Cartesian2.clone(camera.right, that._last2dUp);
    }

    var update3DTransform;
    function update3D(that, camera, objectChanged, offset, positionProperty, time, ellipsoid) {
        var controller = update3DController(that, camera, objectChanged, offset);

        var cartesian = positionProperty.getValueCartesian(time, that._lastCartesian);
        update3DTransform = Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid, update3DTransform);
        controller.setReferenceFrame(update3DTransform, Ellipsoid.UNIT_SPHERE);

        var position = camera.position;
        Cartesian3.clone(position, that._lastOffset);
        that._lastDistance = Cartesian3.magnitude(position);
    }

    var updateColumbusCartesian4 = new Cartesian4(0.0, 0.0, 0.0, 1.0);
    function updateColumbus(that, camera, objectChanged, offset, positionProperty, time, ellipsoid, projection) {
        var controller = update3DController(that, camera, objectChanged, offset);

        //The swizzling here is intentional because ColumbusView uses a different coordinate system.
        var cartographic = positionProperty.getValueCartographic(time, that._lastCartographic);
        var projectedPosition = projection.project(cartographic);
        updateColumbusCartesian4.x = projectedPosition.z;
        updateColumbusCartesian4.y = projectedPosition.x;
        updateColumbusCartesian4.z = projectedPosition.y;

        var tranform = camera.transform;
        tranform.setColumn(3, updateColumbusCartesian4, tranform);
        controller.setReferenceFrame(tranform, Ellipsoid.UNIT_SPHERE);

        var position = camera.position;
        Cartesian3.clone(position, that._lastOffset);
        that._lastDistance = Cartesian3.magnitude(position);
    }

    var update3DControllerQuaternion = new Quaternion();
    var update3DControllerMatrix3 = new Matrix3();

    function update3DController(that, camera, objectChanged, offset) {
        var controller = that._controller3d;
        var controllerChanged = typeof controller === 'undefined' || controller !== that._lastController || controller.isDestroyed();

        if (controllerChanged) {
            var controllers = camera.getControllers();
            controllers.removeAll();
            that._lastController = that._controller3d = controller = controllers.addSpindle();
            controller.constrainedAxis = Cartesian3.UNIT_Z;
        }

        if (objectChanged) {
            camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);
        } else if (controllerChanged) {
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

                var theta = startTheta - endTheta;
                var rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, theta, update3DControllerQuaternion);
                Matrix3.fromQuaternion(rotation, update3DControllerMatrix3).multiplyByVector(offset, offset);
            }
            offset.normalize(offset).multiplyByScalar(that._lastDistance, offset);
            camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);
        }

        return controller;
    }

    var dynamicObjectViewDefaultOffset = new Cartesian3(10000, -10000, 10000);
    var dynamicObjectViewCartesian3Scratch = new Cartesian3();

    /**
     * A utility object for tracking an object with the camera.
     * @alias DynamicObject
     * @constructor
     *
     * @param {DynamicObject} dynamicObject The object to track with the camera.
     * @param {Scene} scene The scene to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use for orienting the camera.
     */
    var DynamicObjectView = function(dynamicObject, scene, ellipsoid) {
        /**
         * The object to track with the camera.
         * @type DynamicObject
         */
        this.dynamicObject = dynamicObject;

        /**
         * The scene in which to track the object.
         * @type Scene
         */
        this.scene = scene;

        /**
         * The ellipsoid to use for orienting the camera.
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        //Shadow copies of the objects so we can detect changes.
        this._lastScene = undefined;
        this._lastDynamicObject = undefined;

        //Currently camera controllers are very transient,
        //We maintain a reference to each one we create as
        //well as the last one we used in order to detect
        //when we need to re-initialize the view.
        this._lastController = undefined;
        this._controller2d = undefined;
        this._controller3d = undefined;

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
    * @exception {DeveloperError} time is required.
    * @exception {DeveloperError} DynamicObjectView.scene is required.
    * @exception {DeveloperError} DynamicObjectView.dynamicObject is required.
    * @exception {DeveloperError} DynamicObjectView.ellipsoid is required.
    * @exception {DeveloperError} DynamicObjectView.dynamicObject.position is required.
    */
    DynamicObjectView.prototype.update = function(time) {
        if (typeof time === 'undefined') {
            throw new DeveloperError('time is required.');
        }

        var scene = this.scene;
        if (typeof scene === 'undefined') {
            throw new DeveloperError('DynamicObjectView.scene is required.');
        }

        var dynamicObject = this.dynamicObject;
        if (typeof dynamicObject === 'undefined') {
            throw new DeveloperError('DynamicObjectView.dynamicObject is required.');
        }

        var ellipsoid = this.ellipsoid;
        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('DynamicObjectView.ellipsoid is required.');
        }

        var positionProperty = this.dynamicObject.position;
        if (typeof positionProperty === 'undefined') {
            throw new DeveloperError('dynamicObject.position is required.');
        }

        var objectChanged = dynamicObject !== this._lastDynamicObject;

        //Determine what the current camera offset should be, this is used
        //to either set the default view when a new object is selected or
        //maintain a similar view when changing scene modes.
        var offset = this._offsetScratch;
        if (objectChanged) {
            this._lastDynamicObject = dynamicObject;

            var viewFromProperty = this.dynamicObject.viewFrom;
            if (typeof viewFromProperty === 'undefined' || typeof viewFromProperty.getValue(time, offset) === 'undefined') {
                Cartesian3.clone(dynamicObjectViewDefaultOffset, offset);
            }

            //Reset object-based cached values.
            var first2dUp = this._first2dUp;
            var last2dUp = this._last2dUp;
            first2dUp.x = first2dUp.y = 0;
            last2dUp.x = last2dUp.y = 0;
            Cartesian3.clone(offset, this._lastOffset);
            this._lastDistance = offset.magnitude();

            //If looking straight down, move the camera slightly south the avoid gimbal lock.
            if (Cartesian3.equals(offset.normalize(dynamicObjectViewCartesian3Scratch), Cartesian3.UNIT_Z)) {
                offset.y -= 0.01;
            }
        } else if (typeof this._lastOffset !== 'undefined') {
            offset = this._lastOffset;
        } else {
            Cartesian3.clone(dynamicObjectViewDefaultOffset, offset);
        }

        var sceneChanged = scene !== this._lastScene;
        if (sceneChanged) {
            //When the scene changes, we'll need to retrieve new controllers, so just wipe out our cached values.
            this._lastController = undefined;
            this._controller2d = undefined;
            this._controller3d = undefined;
            this._lastScene = scene;
        }

        var mode = scene.mode;
        if (mode === SceneMode.SCENE2D) {
            update2D(this, this.scene.getCamera(), objectChanged, offset, positionProperty, time, scene.scene2D.projection);
        } else if (mode === SceneMode.SCENE3D) {
            update3D(this, this.scene.getCamera(), objectChanged, offset, positionProperty, time, ellipsoid);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            updateColumbus(this, this.scene.getCamera(), objectChanged, offset, positionProperty, time, ellipsoid, scene.scene2D.projection);
        }
    };

    return DynamicObjectView;
});