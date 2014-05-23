/*global define*/
define(function() {
    "use strict";

    /**
     * Constants for identifying well-known reference frames.
     *
     * @exports ReferenceFrame
     */
    var ReferenceFrame = {
        /**
         * The fixed frame.
         *
         * @type {Number}
         * @constant
         * @default 0
         */
        FIXED : 0,
        /**
         * The inertial frame.
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        INERTIAL : 1
    };

    return ReferenceFrame;
});