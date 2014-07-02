/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines how two pixels' values are combined.
     *
     * @namespace
     * @alias BlendEquation
     */
    var BlendEquation = {
        /**
         * 0x8006.  Pixel values are added componentwise.  This is used in additive blending for translucency.
         *
         * @type {Number}
         * @constant
         */
        ADD : 0x8006, // WebGL: FUNC_ADD

        /**
         * 0x800A.  Pixel values are subtracted componentwise (source - destination).  This is used in alpha blending for translucency.
         *
         * @type {Number}
         * @constant
         */
        SUBTRACT : 0x800A, // WebGL: FUNC_SUBTRACT

        /**
         * 0x800B.  Pixel values are subtracted componentwise (destination - source).
         *
         * @type {Number}
         * @constant
         */
        REVERSE_SUBTRACT : 0x800B // WebGL: FUNC_REVERSE_SUBTRACT

        // No min and max like in ColladaFX GLES2 profile
    };

    return freezeObject(BlendEquation);
});
