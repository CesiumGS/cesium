/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines which triangles, if any, are culled.
     *
     * @namespace
     * @alias CullFace
     */
    var CullFace = {
        /**
         * 0x0404.  Front-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        FRONT : 0x0404,

        /**
         * 0x405.  Back-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        BACK : 0x0405,

        /**
         * 0x0408.  Both face- and back-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        FRONT_AND_BACK : 0x0408
    };

    return freezeObject(CullFace);
});
