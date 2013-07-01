/*global define*/
define([
        './Enumeration'
       ], function(
         Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        FIXED : new Enumeration(0, 'FIXED'),
        /**
         * The inertial frame.
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        INERTIAL : new Enumeration(1, 'INERTIAL')
    };

    return ReferenceFrame;
});
