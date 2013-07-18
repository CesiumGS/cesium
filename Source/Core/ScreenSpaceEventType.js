/*global define*/
define(['./Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        LEFT_DOWN : new Enumeration(0, 'LEFT_DOWN'),

        /**
         * Represents a mouse left button up event.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        LEFT_UP : new Enumeration(1, 'LEFT_UP'),

        /**
         * Represents a mouse left click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        LEFT_CLICK : new Enumeration(2, 'LEFT_CLICK'),

        /**
         * Represents a mouse left double click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 3
         */
        LEFT_DOUBLE_CLICK : new Enumeration(3, 'LEFT_DOUBLE_CLICK'),

        /**
         * Represents a mouse left button down event.
         *
         * @type {Enumeration}
         * @constant
         * @default 5
         */
        RIGHT_DOWN : new Enumeration(5, 'RIGHT_DOWN'),

        /**
         * Represents a mouse right button up event.
         *
         * @type {Enumeration}
         * @constant
         * @default 6
         */
        RIGHT_UP : new Enumeration(6, 'RIGHT_UP'),

        /**
         * Represents a mouse right click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 7
         */
        RIGHT_CLICK : new Enumeration(7, 'RIGHT_CLICK'),

        /**
         * Represents a mouse right double click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 8
         */
        RIGHT_DOUBLE_CLICK : new Enumeration(8, 'RIGHT_DOUBLE_CLICK'),

        /**
         * Represents a mouse middle button down event.
         *
         * @type {Enumeration}
         * @constant
         * @default 10
         */
        MIDDLE_DOWN : new Enumeration(10, 'MIDDLE_DOWN'),

        /**
         * Represents a mouse middle button up event.
         *
         * @type {Enumeration}
         * @constant
         * @default 11
         */
        MIDDLE_UP : new Enumeration(11, 'MIDDLE_UP'),

        /**
         * Represents a mouse middle click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 12
         */
        MIDDLE_CLICK : new Enumeration(12, 'MIDDLE_CLICK'),

        /**
         * Represents a mouse middle double click event.
         *
         * @type {Enumeration}
         * @constant
         * @default 13
         */
        MIDDLE_DOUBLE_CLICK : new Enumeration(13, 'MIDDLE_DOUBLE_CLICK'),

        /**
         * Represents a mouse move event.
         *
         * @type {Enumeration}
         * @constant
         * @default 15
         */
        MOUSE_MOVE : new Enumeration(15, 'MOUSE_MOVE'),

        /**
         * Represents a mouse wheel event.
         *
         * @type {Enumeration}
         * @constant
         * @default 16
         */
        WHEEL : new Enumeration(16, 'WHEEL'),

        /**
         * Represents the start of a two-finger event on a touch surface.
         *
         * @type {Enumeration}
         * @constant
         * @default 17
         */
        PINCH_START : new Enumeration(17, 'PINCH_START'),

        /**
         * Represents the end of a two-finger event on a touch surface.
         *
         * @type {Enumeration}
         * @constant
         * @default 18
         */
        PINCH_END : new Enumeration(18, 'PINCH_END'),

        /**
         * Represents a change of a two-finger event on a touch surface.
         *
         * @type {Enumeration}
         * @constant
         * @default 19
         */
        PINCH_MOVE : new Enumeration(19, 'PINCH_MOVE')
    };

    return ScreenSpaceEventType;
});
