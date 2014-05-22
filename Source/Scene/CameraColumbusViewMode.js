/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         * @default 0
         */
        FREE : 0,

        /**
         * The camera is locked looking at a location, but is free to rotate about that single point.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        LOCKED : 1
    };

    return CameraColumbusViewMode;
});