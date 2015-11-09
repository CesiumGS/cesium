/*global define*/
define([
        '../Core/freezeObject',
        '../Renderer/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    "use strict";

    /**
     * Determines how two pixels' values are combined.
     *
     * @namespace
     * @alias BlendEquation
     */
    var BlendEquation = {
        /**
         * Pixel values are added componentwise.  This is used in additive blending for translucency.
         *
         * @type {Number}
         * @constant
         */
        ADD : WebGLConstants.FUNC_ADD,

        /**
         * Pixel values are subtracted componentwise (source - destination).  This is used in alpha blending for translucency.
         *
         * @type {Number}
         * @constant
         */
        SUBTRACT : WebGLConstants.FUNC_SUBTRACT,

        /**
         * Pixel values are subtracted componentwise (destination - source).
         *
         * @type {Number}
         * @constant
         */
        REVERSE_SUBTRACT : WebGLConstants.FUNC_REVERSE_SUBTRACT

        // No min and max like in ColladaFX GLES2 profile
    };

    return freezeObject(BlendEquation);
});
