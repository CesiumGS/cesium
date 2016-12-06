/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Quaternion'
    ], function(
        defaultValue,
        defined,
        destroyObject,
        Cartesian3,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Quaternion) {
    'use strict';

    /**
     * @private
     */
    function DeviceOrientationCameraController(scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;

        this._deviceOrientation = {};
        this._screenOrientation = window.orientation || 0;

        var that = this;

        function deviceOrientationCallback(e) {
            that._deviceOrientation = e;
        }

        function screenOrientationCallback() {
            that._screenOrientation = window.orientation || 0;
        }

        window.addEventListener('deviceorientation', deviceOrientationCallback, false);
        window.addEventListener('orientationchange', screenOrientationCallback, false);

        this._removeListener = function() {
            window.removeEventListener('deviceorientation', deviceOrientationCallback, false);
            window.removeEventListener('orientationchange', screenOrientationCallback, false);
        };
    }

    var rotMatrix = new Matrix3();
    var direction = new Cartesian3();

    function rotate(camera, alpha, beta, gamma, orient) {

        // Euler angles to rotation matrix
        var xRotation = Matrix3.fromRotationX(beta);
        var yRotation = Matrix3.fromRotationY(gamma);
        var zRotation = Matrix3.fromRotationZ(alpha);

        Matrix3.multiply(yRotation, xRotation, rotMatrix);
        Matrix3.multiply(zRotation, rotMatrix, rotMatrix);


        // Adjust for screen rotation
        var screenRotation = Matrix3.fromRotationZ(-orient);
        Matrix3.multiply(rotMatrix, screenRotation, rotMatrix);

        // Set camera
        Matrix3.getColumn(rotMatrix, 0, camera.right);
        Matrix3.getColumn(rotMatrix, 1, camera.up);
        Matrix3.getColumn(rotMatrix, 2, direction);
        Cartesian3.negate(direction, camera.direction);
    }

    DeviceOrientationCameraController.prototype.update = function() {
        if (!defined(this._deviceOrientation.alpha)) {
            return;
        }

        var alpha = this._deviceOrientation.alpha ?
          CesiumMath.toRadians(this._deviceOrientation.alpha) : 0;
        var beta = this._deviceOrientation.beta ?
          CesiumMath.toRadians(this._deviceOrientation.beta) : 0;
        var gamma = this._deviceOrientation.gamma ?
          CesiumMath.toRadians(this._deviceOrientation.gamma) : 0;
        var orient = CesiumMath.toRadians(this._screenOrientation);

        rotate(this._scene.camera, alpha, beta, gamma, orient);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     */
    DeviceOrientationCameraController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the resources held by this object.  Destroying an object allows for deterministic
     * release of resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DeviceOrientationCameraController.prototype.destroy = function() {
        this._removeListener();
        return destroyObject(this);
    };

    return DeviceOrientationCameraController;
});
