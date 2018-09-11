define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math'
    ], function(
        defined,
        destroyObject,
        DeveloperError,
        Math) {
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

        this._flipPitchRoll = false;
        this._invertPitchFactor = 1;
        this._invertRollFactor = 1;
        this._orientationAngle = 0;

        this._pitch = undefined;
        this._roll = undefined;
        this._heading = undefined;

        var that = this;

        function handleChangedOrientationAngle()
        {
            switch(that._orientationAngle) {
                case 0:
                    that._flipPitchRoll = false;
                    that._invertPitchFactor = 1;
                    that._invertRollFactor = 1;
                    break;
                case 90:
                    that._flipPitchRoll = true;
                    that._invertPitchFactor = -1;
                    that._invertRollFactor = 1;
                    break;
                case 180:
                    that._flipPitchRoll = false;
                    that._invertPitchFactor = -1;
                    that._invertRollFactor = -1;
                    break;
                case -90:
                case 270:
                    that._flipPitchRoll = true;
                    that._invertPitchFactor = 1;
                    that._invertRollFactor = -1;
                    break;
            }
        }

        function screenOrientationChanged()
        {
            if ('orientation' in screen) {
                that._orientationAngle = screen.orientation.angle;
            } else {
                that._orientationAngle = window.orientation;
            }
            handleChangedOrientationAngle();
        }

        function msScreenOrientationChanged()
        {
            switch(screen.msOrientation) {
                case 'landscape-primary':
                    that._orientationAngle = 0;
                    break;
                case 'portrait-secondary':
                    that._orientationAngle = 90;
                    break;
                case 'landscape-secondary':
                    that._orientationAngle = 180;
                    break;
                case 'portrait-primary':
                    that._orientationAngle = 270;
                    break;
            }
            handleChangedOrientationAngle();
        }

        function updateDeviceOrientation(e) {
            that._pitch = Math.toRadians(e.beta);
            that._roll = Math.toRadians(e.gamma);
            that._heading = Math.toRadians(e.alpha);
        }

        this._enableDeviceOrientation = function(enable) {
            if (enable) {
                if ('orientation' in screen) {
                    screenOrientationChanged();
                    screen.orientation.addEventListener('change', screenOrientationChanged, false);
                } else if ('onmsorientationchange' in screen) {
                    msScreenOrientationChanged();
                    screen.addEventListener('MSOrientationChange', msScreenOrientationChanged, false);
                } else if ('orientation' in window) {
                    screenOrientationChanged();
                    window.addEventListener('orientationchange', screenOrientationChanged, false);
                }

                if ('ondeviceorientationabsolute' in window) { //Chrome 50+
                    window.addEventListener('deviceorientationabsolute', updateDeviceOrientation, false);
                } else if ('ondeviceorientation' in window) {
                    window.addEventListener('deviceorientation', updateDeviceOrientation, false);
                }
            } else {
                if ('orientation' in screen) {
                    screen.orientation.removeEventListener('change', screenOrientationChanged, false);
                } else if ('onmsorientationchange' in screen) {
                     screen.removeEventListener('MSOrientationChange', msScreenOrientationChanged, false);
                } else if ('orientation' in window) {
                    window.addEventListener('orientationchange', screenOrientationChanged, false);
                }

                if ('ondeviceorientationabsolute' in window) { //Chrome 50+
                    window.removeEventListener('deviceorientationabsolute', updateDeviceOrientation, false);
                } else if ('ondeviceorientation' in window) {
                    window.removeEventListener('deviceorientation', updateDeviceOrientation, false);
                }
            }
        }

        this._enableDeviceOrientation(true);
    }

    DeviceOrientationCameraController.prototype.update = function() {
        if (!defined(this._pitch)) {
            return;
        }

        this._scene.camera.setView({
            orientation: {
                heading : Math.toRadians(this._orientationAngle + 180) - this._heading,
                pitch : (this._flipPitchRoll ? this._roll : this._pitch) * this._invertPitchFactor - Math.toRadians(90),
                roll : (this._flipPitchRoll ? this._pitch : this._roll) * this._invertRollFactor
            }
        });
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
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    DeviceOrientationCameraController.prototype.destroy = function() {
        this._enableDeviceOrientation(false);
        return destroyObject(this);
    };

    return DeviceOrientationCameraController;
});
