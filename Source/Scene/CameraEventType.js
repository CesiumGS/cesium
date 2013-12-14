/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        LEFT_DRAG : new Enumeration(0, 'LEFT_DRAG'),

        /**
         *  A right mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        RIGHT_DRAG : new Enumeration(1, 'RIGHT_DRAG'),

        /**
         *  A middle mouse button press followed by moving the mouse and releasing the button.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        MIDDLE_DRAG : new Enumeration(2, 'MIDDLE_DRAG'),

        /**
         * Scrolling the middle mouse button.
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        WHEEL : new Enumeration(3, 'WHEEL'),

        /**
         * A two-finger touch on a touch surface.
         *
         * @type {Enumeration}
         * @constant
         * @default 4
         */
        PINCH : new Enumeration(4, 'PINCH')
    };

    return CameraEventType;
});
