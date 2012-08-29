/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Transforms',
        '../Scene/SceneMode'
       ], function(
         DeveloperError,
         Cartesian3,
         Ellipsoid,
         Transforms,
         SceneMode) {
    "use strict";

    /**
     * @alias DynamicObject
     * @constructor
     */
    var DynamicObjectView = function(dynamicObject, scene, ellipsoid) {
        this.dynamicObject = dynamicObject;
        this.scene = scene;
        this.ellipsoid = ellipsoid;

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
     *
     * @param time
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

        var camera = this.scene.getCamera();

        var controller;
        var controllers;
        var viewDistance;
        var controllerChanged;

        switch (scene.mode) {
        case SceneMode.SCENE2D:
            controller = this._controller2d;
            controllerChanged = typeof controller === 'undefined' || controller.isDestroyed() || controller !== this._lastController;

            if (controllerChanged) {
                controllers = camera.getControllers();
                controllers.removeAll();
                this._lastController = this._controller2d = controller = controllers.add2D(scene.scene2D.projection);
                controller.zoomOnly = true;
                viewDistance = typeof this._lastOffset === 'undefined' ? offset.magnitude() : this._lastOffset.magnitude();
            } else if (objectChanged) {
                viewDistance = offset.magnitude();
            } else {
                viewDistance = camera.position.z;
            }

            var cartographic = this._lastCartographic = positionProperty.getValueCartographic(time, this._lastCartographic);
            if (typeof cartographic !== 'undefined') {
                cartographic.height = viewDistance;
                if (objectChanged || controllerChanged) {
                    camera.frustum.near = viewDistance;
                    controller.setCameraPosition(cartographic);
                } else {
                    camera.position = scene.scene2D.projection.project(cartographic);
                }
            }
            this._lastDistance = camera.frustum.right - camera.frustum.left;
            break;
        case SceneMode.SCENE3D:
            controller = this._controller3d;
            controllerChanged = typeof controller === 'undefined' || controller.isDestroyed() || controller !== this._lastController;

            if (controllerChanged) {
                controllers = camera.getControllers();
                controllers.removeAll();
                this._lastController = this._controller3d = controller = controllers.addSpindle();
                controller.constrainedAxis = Cartesian3.UNIT_Z;
            }

            var cartesian = this._lastCartesian = positionProperty.getValueCartesian(time, this._lastCartesian);
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
                    camera.frustum.near = Math.min(viewDistance * 0.1, camera.frustum.near, 0.0002 * this.ellipsoid.getRadii().getMaximumComponent());
                } else if (controllerChanged) {
                    if (typeof this._lastOffset !== 'undefined') {
                        this._lastOffset.normalize(offset).multiplyByScalar(this._lastDistance, offset);
                    }
                    camera.lookAt(offset, Cartesian3.ZERO, Cartesian3.UNIT_Z);

                    //TODO There are all kinds of near plane issues in our code base right now,
                    //hack around it until the multi-frustum code is in place.
                    viewDistance = offset.magnitude();
                    camera.frustum.near = Math.min(viewDistance * 0.1, camera.frustum.near, 0.0002 * this.ellipsoid.getRadii().getMaximumComponent());
                }

                var transform = Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid);
                controller.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
                this._lastOffset = camera.position;
                this._lastDistance = camera.position.magnitude();
            }
            break;
        case SceneMode.COLUMBUS_VIEW:
            controller = this._controllerColumbusView;
            if (objectChanged || typeof controller === 'undefined' || controller.isDestroyed() || controller !== this._lastController) {
                controllers = camera.getControllers();
                controllers.removeAll();
                this._lastController = this._controller3d = controller = controllers.addColumbusView();
            }
            break;
        }
    };

    return DynamicObjectView;
});