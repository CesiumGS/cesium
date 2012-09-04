/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Transforms',
        '../Scene/SceneMode'
       ], function(
         defaultValue,
         DeveloperError,
         Cartesian3,
         Ellipsoid,
         Transforms,
         SceneMode) {
    "use strict";

    function update2D(that, camera, objectChanged, offset, positionProperty, scene, time) {
        var viewDistance;
        var controller = that._controller2d;
        var controllerChanged = typeof controller === 'undefined' || controller.isDestroyed() || controller !== that._lastController;

        if (controllerChanged) {
            var controllers = camera.getControllers();
            controllers.removeAll();
            that._lastController = that._controller2d = controller = controllers.add2D(scene.scene2D.projection);
            controller.zoomOnly = true;
            viewDistance = typeof that._lastOffset === 'undefined' ? offset.magnitude() : that._lastOffset.magnitude();
        } else if (objectChanged) {
            viewDistance = offset.magnitude();
        } else {
            viewDistance = camera.position.z;
        }

        var cartographic = that._lastCartographic = positionProperty.getValueCartographic(time, that._lastCartographic);
        if (typeof cartographic !== 'undefined') {
            cartographic.height = viewDistance;
            if (objectChanged || controllerChanged) {
                camera.frustum.near = viewDistance;
                controller.setCameraPosition(cartographic);
            } else {
                camera.position = scene.scene2D.projection.project(cartographic);
            }
        }
        that._lastDistance = camera.frustum.right - camera.frustum.left;
    }

    var update3DTransform;
    function update3D(that, camera, ellipsoid, objectChanged, offset, positionProperty, time) {
        var viewDistance;
        var controller = that._controller3d;
        var controllerChanged = typeof controller === 'undefined' || controller.isDestroyed() || controller !== that._lastController;

        if (controllerChanged) {
            var controllers = camera.getControllers();
            controllers.removeAll();
            that._lastController = that._controller3d = controller = controllers.addSpindle();
            controller.constrainedAxis = Cartesian3.UNIT_Z;
        }

        var cartesian = that._lastCartesian = positionProperty.getValueCartesian(time, that._lastCartesian);
        if (typeof cartesian !== 'undefined') {
            if (objectChanged) {
                //If looking straight down, move the camera slightly south the avoid gimbal lock.
                if (Cartesian3.equals(offset.normalize(), Cartesian3.UNIT_Z)) {
                    offset.y -= 0.01;
                }
                camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);

                //TODO There are all kinds of near plane issues in our code base right now,
                //hack around it until the multi-frustum code is in place.
                viewDistance = offset.magnitude();
                camera.frustum.near = Math.min(viewDistance * 0.1, camera.frustum.near, 0.0002 * that.ellipsoid.getRadii().getMaximumComponent());
            } else if (controllerChanged) {
                if (typeof that._lastOffset !== 'undefined') {
                    that._lastOffset.normalize(offset).multiplyByScalar(that._lastDistance, offset);
                }
                camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);

                //TODO There are all kinds of near plane issues in our code base right now,
                //hack around it until the multi-frustum code is in place.
                viewDistance = offset.magnitude();
                camera.frustum.near = Math.min(viewDistance * 0.1, camera.frustum.near, 0.0002 * that.ellipsoid.getRadii().getMaximumComponent());
            }

            update3DTransform = Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid, update3DTransform);
            controller.setReferenceFrame(update3DTransform, Ellipsoid.UNIT_SPHERE);
            that._lastOffset = camera.position;
            that._lastDistance = camera.position.magnitude();
        }
    }

    function updateColumbus(that, camera) {
        var controller = that._controllerColumbusView;
        var controllerChanged = typeof controller === 'undefined' || controller.isDestroyed() || controller !== that._lastController;

        if (controllerChanged) {
            var controllers = camera.getControllers();
            controllers.removeAll();
            that._lastController = that._controllerColumbusView = controller = controllers.addColumbusView();
        }
    }

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
         * The Scene to use.
         * @type Scene
         */
        this.scene = scene;

        /**
         * The ellipsoid to use for orienting the camera.
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        this._lastScene = undefined;
        this._lastDynamicObject = undefined;

        this._lastController = undefined;
        this._controller2d = undefined;
        this._controller3d = undefined;
        this._controllerColumbusView = undefined;

        this._lastCartesian = undefined;
        this._lastCartographic = undefined;
        this._lastDistance = undefined;
        this._lastOffset = undefined;
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

        var offset = new Cartesian3(10000, -10000, 10000);
        var objectChanged = dynamicObject !== this._lastDynamicObject;
        if (objectChanged) {
            this._lastDynamicObject = dynamicObject;
            this._lastOffset = undefined;
            var viewFromProperty = this.dynamicObject.viewFrom;
            if (typeof viewFromProperty !== 'undefined') {
                viewFromProperty.getValue(time, offset);
            }
        }

        var sceneChanged = scene !== this._lastScene;
        if (sceneChanged) {
            this._controller2d = undefined;
            this._controller3d = undefined;
            this._controllerColumbusView = undefined;
            this._lastScene = scene;
        }

        if (scene.mode === SceneMode.SCENE2D) {
            update2D(this, this.scene.getCamera(), objectChanged, offset, positionProperty, scene, time);
        } else if (scene.mode === SceneMode.SCENE3D) {
            update3D(this, this.scene.getCamera(), ellipsoid, objectChanged, offset, positionProperty, time);
        } else if (scene.mode === SceneMode.COLUMBUS_VIEW) {
            updateColumbus(this, this.scene.getCamera());
        }
    };

    return DynamicObjectView;
});