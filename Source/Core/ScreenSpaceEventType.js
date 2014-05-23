/*global define*/
define(function() {
    "use strict";

    /**
     * This enumerated type is for classifying mouse events: down, up, click, double click, move and move while a button is held down.
     *
     * @exports ScreenSpaceEventType
     */
    var ScreenSpaceEventType = {
        /**
         * Represents a mouse left button down event.
         *
         * @type {Number}
         * @constant
         * @default 0
         */
        LEFT_DOWN : 0,

        /**
         * Represents a mouse left button up event.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        LEFT_UP : 1,

        /**
         * Represents a mouse left click event.
         *
         * @type {Number}
         * @constant
         * @default 2
         */
        LEFT_CLICK : 2,

        /**
         * Represents a mouse left double click event.
         *
         * @type {Number}
         * @constant
         * @default 3
         */
        LEFT_DOUBLE_CLICK : 3,

        /**
         * Represents a mouse left button down event.
         *
         * @type {Number}
         * @constant
         * @default 5
         */
        RIGHT_DOWN : 5,

        /**
         * Represents a mouse right button up event.
         *
         * @type {Number}
         * @constant
         * @default 6
         */
        RIGHT_UP : 6,

        /**
         * Represents a mouse right click event.
         *
         * @type {Number}
         * @constant
         * @default 7
         */
        RIGHT_CLICK : 7,

        /**
         * Represents a mouse right double click event.
         *
         * @type {Number}
         * @constant
         * @default 8
         */
        RIGHT_DOUBLE_CLICK : 8,

        /**
         * Represents a mouse middle button down event.
         *
         * @type {Number}
         * @constant
         * @default 10
         */
        MIDDLE_DOWN : 10,

        /**
         * Represents a mouse middle button up event.
         *
         * @type {Number}
         * @constant
         * @default 11
         */
        MIDDLE_UP : 11,

        /**
         * Represents a mouse middle click event.
         *
         * @type {Number}
         * @constant
         * @default 12
         */
        MIDDLE_CLICK : 12,

        /**
         * Represents a mouse middle double click event.
         *
         * @type {Number}
         * @constant
         * @default 13
         */
        MIDDLE_DOUBLE_CLICK : 13,

        /**
         * Represents a mouse move event.
         *
         * @type {Number}
         * @constant
         * @default 15
         */
        MOUSE_MOVE : 15,

        /**
         * Represents a mouse wheel event.
         *
         * @type {Number}
         * @constant
         * @default 16
         */
        WHEEL : 16,

        /**
         * Represents the start of a two-finger event on a touch surface.
         *
         * @type {Number}
         * @constant
         * @default 17
         */
        PINCH_START : 17,

        /**
         * Represents the end of a two-finger event on a touch surface.
         *
         * @type {Number}
         * @constant
         * @default 18
         */
        PINCH_END : 18,

        /**
         * Represents a change of a two-finger event on a touch surface.
         *
         * @type {Number}
         * @constant
         * @default 19
         */
        PINCH_MOVE : 19
    };

    return ScreenSpaceEventType;
});