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

        this._camera = undefined;
        this._lastScene = undefined;
        this._lastDynamicObject = undefined;

        this._lastController = undefined;
        this._controller2d = undefined;
        this._controller3d = undefined;
        this._controllerColumbusView = undefined;
        this._lastCartographic = undefined;
        this._lastCartesian = undefined;
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

        var objectChanged = dynamicObject !== this._lastDynamicObject;
        if (objectChanged) {
            this._lastDynamicObject = dynamicObject;
        }

        var sceneChanged = scene !== this._lastScene;
        if (sceneChanged) {
            this._controller2d = undefined;
            this._controller3d = undefined;
            this._controllerColumbusView = undefined;
            this._lastScene = scene;
            this._camera = this.scene.getCamera();
        }

        var camera = this._camera;

        var controller;
        var controllers;
        switch (scene.mode) {
        case SceneMode.SCENE2D:
            controller = this._controller2d;
            if (typeof controller === 'undefined' || controller.isDestroyed() || controller !== this._lastController) {
                controllers = camera.getControllers();
                controllers.removeAll();
                this._lastController = this._controller2d = controller = controllers.add2D(scene.scene2D.projection);
                controller.zoomOnly = true;
            }
            var cartographic = this._lastCartographic = positionProperty.getValueCartographic(time, this._lastCartographic);
            if (typeof cartographic !== 'undefined') {
                camera.position = scene.scene2D.projection.project(cartographic);
            }
            break;
        case SceneMode.SCENE3D:
            controller = this._controller3d;
            if (objectChanged || typeof controller === 'undefined' || controller.isDestroyed() || controller !== this._lastController) {
                controllers = camera.getControllers();
                controllers.removeAll();
                this._lastController = this._controller3d = controller = controllers.addSpindle();
                controller.constrainedAxis = Cartesian3.UNIT_Z;
                camera.direction = Cartesian3.UNIT_Y.negate();
                camera.position = new Cartesian3(0, 20000, 0);
            }
            var cartesian = this._lastCartesian = positionProperty.getValueCartesian(time, this._lastCartesian);
            if (typeof cartesian !== 'undefined') {
                var transform = Transforms.eastNorthUpToFixedFrame(cartesian, ellipsoid);
                controller.setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
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