/*global define*/
define(function() {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports BlendEquation
     */
    var BlendEquation = {
        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8006
         */
        ADD : 0x8006, // WebGL: FUNC_ADD

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x800A
         */
        SUBTRACT : 0x800A, // WebGL: FUNC_SUBTRACT

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x800B
         */
        REVERSE_SUBTRACT : 0x800B // WebGL: FUNC_REVERSE_SUBTRACT

        // No min and max like in ColladaFX GLES2 profile
    };

    return BlendEquation;
});
