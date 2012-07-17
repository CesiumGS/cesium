/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Ellipsoid',
        '../Core/Cartographic',
        './Camera2DController',
        './CameraFlightController',
        './CameraSpindleController',
        './CameraFreeLookController',
        './CameraColumbusViewController',
        './CameraCentralBodyController'
    ], function(
        DeveloperError,
        destroyObject,
        Ellipsoid,
        Cartographic,
        Camera2DController,
        CameraFlightController,
        CameraSpindleController,
        CameraFreeLookController,
        CameraColumbusViewController,
        CameraCentralBodyController) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CameraControllerCollection
     * @internalConstructor
     *
     * @see Camera#getControllers
     */
    function CameraControllerCollection(camera, canvas) {
        this._controllers = [];
        this._canvas = canvas;
        this._camera = camera;
    }

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#addFreeLook
     * @see CameraControllerCollection#addFlight
     * @see CameraControllerCollection#addSpindle
     * @see CameraControllerCollection#addColumbusView
     */
    CameraControllerCollection.prototype.add2D = function(projection) {
        var twoD = new Camera2DController(this._canvas, this._camera, projection);
        this._controllers.push(twoD);
        return twoD;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#addFreeLook
     * @see CameraControllerCollection#addFlight
     * @see CameraControllerCollection#add2D
     * @see CameraControllerCollection#addColumbusView
     */
    CameraControllerCollection.prototype.addSpindle = function(ellipsoid) {
        var spindle = new CameraSpindleController(this._canvas, this._camera, ellipsoid);
        this._controllers.push(spindle);
        return spindle;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#addSpindle
     * @see CameraControllerCollection#addFlight
     * @see CameraControllerCollection#add2D
     * @see CameraControllerCollection#addColumbusView
     */
    CameraControllerCollection.prototype.addFreeLook = function(ellipsoid) {
        var freeLook = new CameraFreeLookController(this._canvas, this._camera);
        this._controllers.push(freeLook);
        return freeLook;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#addSpindle
     * @see CameraControllerCollection#addFlight
     * @see CameraControllerCollection#add2D
     * @see CameraControllerCollection#addFreeLook
     */
    CameraControllerCollection.prototype.addColumbusView = function() {
        var cv = new CameraColumbusViewController(this._canvas, this._camera);
        this._controllers.push(cv);
        return cv;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#addSpindle
     * @see CameraControllerCollection#addFreeLook
     * @see CameraControllerCollection#add2D
     * @see CameraControllerCollection#addColumbusView
     */
    CameraControllerCollection.prototype.addFlight = function(template) {
        var t = template || {};
        var ellipsoid = t.ellipsoid || Ellipsoid.WGS84;
        var destination = t.destination || ellipsoid.cartographicToCartesian(new Cartographic(0.0, 0.0, 0.0));
        var duration = t.duration || 4.0;
        var complete = template.complete;
		var flightController = new CameraFlightController(this._canvas, this._camera, ellipsoid, destination, duration, complete);
		this._controllers.push(flightController);
		return flightController;
    };

    CameraControllerCollection.prototype.addCentralBody = function() {
        var cb = new CameraCentralBodyController(this._canvas, this._camera);
        this._controllers.push(cb);
        return cb;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#removeAll
     */
    CameraControllerCollection.prototype.remove = function(controller) {
        if (controller) {
            var controllers = this._controllers;
            var i = controllers.indexOf(controller);
            if (i !== -1) {
                controllers[i].destroy();
                controllers.splice(i, 1);
                return true;
            }
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#remove
     */
    CameraControllerCollection.prototype.removeAll = function() {
        var controllers = this._controllers;
        var length = controllers.length;
        for ( var i = 0; i < length; ++i) {
            controllers[i].destroy();
        }

        this._controllers = [];
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     */
    CameraControllerCollection.prototype.contains = function(controller) {
        if (controller) {
            return (this._controllers.indexOf(controller) !== -1);
        }

        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#getLength
     */
    CameraControllerCollection.prototype.get = function(index) {
        if (typeof index === 'undefined') {
            throw new DeveloperError('index is required.');
        }

        return this._controllers[index];
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     *
     * @see CameraControllerCollection#get
     */
    CameraControllerCollection.prototype.getLength = function() {
        return this._controllers.length;
    };

    /**
     * @private
     */
    CameraControllerCollection.prototype.update = function() {
        var toRemove = [];

        var controllers = this._controllers;
        var length = controllers.length;
        for ( var i = 0; i < length; ++i) {
            if (!controllers[i].update()) {
                toRemove.push(i);
            }
        }

        // Automatically remove expired controllers
        for ( var j = 0; j < toRemove.length; ++j) {
            var index = toRemove[j];
            controllers[index].destroy();
            controllers.splice(index, 1);
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     */
    CameraControllerCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     *
     * @memberof CameraControllerCollection
     */
    CameraControllerCollection.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return CameraControllerCollection;
});
