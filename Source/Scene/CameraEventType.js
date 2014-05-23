/*global define*/
define(function() {
    "use strict";

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
         * @default 0
         */
        LEFT_DRAG : 0,

        /**
         *  A right mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        RIGHT_DRAG : 1,

        /**
         *  A middle mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Number}
         * @constant
         * @default 2
         */
        MIDDLE_DRAG : 2,

        /**
         * Scrolling the middle mouse button.
         *
         * @type {Number}
         * @constant
         * @default 3
         */
        WHEEL : 3,

        /**
         * A two-finger touch on a touch surface.
         *
         * @type {Number}
         * @constant
         * @default 4
         */
        PINCH : 4
    };

    return CameraEventType;
});