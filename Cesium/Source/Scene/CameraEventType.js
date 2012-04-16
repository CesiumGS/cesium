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
         * @constant
         * @type {Enumeration}
         */
        LEFT_DRAG : new Enumeration(0, "Left Drag"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        RIGHT_DRAG : new Enumeration(1, "Right Drag"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        MIDDLE_DRAG : new Enumeration(2, "Middle Drag"),

        /**
         * DOC_TBA
         *
         * @constant
         * @type {Enumeration}
         */
        WHEEL : new Enumeration(3, "Wheel")
    };

    return CameraEventType;
});