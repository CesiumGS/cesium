/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Enumerates the available input for interacting with the camera.
     *
     * @exports CameraEventType
     */
    var CameraEventType = {
        /**
         * A left mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Number}
         * @constant
         */
        LEFT_DRAG : 0,

        /**
         *  A right mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Number}
         * @constant
         */
        RIGHT_DRAG : 1,

        /**
         *  A middle mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Number}
         * @constant
         */
        MIDDLE_DRAG : 2,

        /**
         * Scrolling the middle mouse button.
         *
         * @type {Number}
         * @constant
         */
        WHEEL : 3,

        /**
         * A two-finger touch on a touch surface.
         *
         * @type {Number}
         * @constant
         */
        PINCH : 4
    };

    return freezeObject(CameraEventType);
});
