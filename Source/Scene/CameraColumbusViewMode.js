/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * Specifies how to handle mouse events in columbus view mode.
     *
     * @exports CameraColumbusViewMode
     * @see ScreenSpaceCameraController
     */
    var CameraColumbusViewMode = {
        /**
         * The camera is free to move about anywhere.
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        FREE : new Enumeration(0, 'FREE'),

        /**
         * The camera is locked looking at a location, but is free to rotate about that single point.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        LOCKED : new Enumeration(1, 'LOCKED')
    };

    return CameraColumbusViewMode;
});
