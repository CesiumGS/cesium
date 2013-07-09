/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports CameraEventType
     */
    var CameraEventType = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        LEFT_DRAG : new Enumeration(0, 'LEFT_DRAG'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        RIGHT_DRAG : new Enumeration(1, 'RIGHT_DRAG'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 2
         */
        MIDDLE_DRAG : new Enumeration(2, 'MIDDLE_DRAG'),

        /**
         * DOC_TBA
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
