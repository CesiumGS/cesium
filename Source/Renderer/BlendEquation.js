/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
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
         * @type {Enumeration}
         * @constant
         * @default 0x8006
         */
        ADD : new Enumeration(0x8006, 'ADD'), // WebGL: FUNC_ADD

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x800A
         */
        SUBTRACT : new Enumeration(0x800A, 'SUBTRACT'), // WebGL: FUNC_SUBTRACT

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x800B
         */
        REVERSE_SUBTRACT : new Enumeration(0x800B, 'REVERSE_SUBTRACT'), // WebGL: FUNC_REVERSE_SUBTRACT

        // No min and max like in ColladaFX GLES2 profile

        /**
         * DOC_TBA
         *
         * @param {BlendEquation} blendEquation
         *
         * @returns {Boolean}
         */
        validate : function(blendEquation) {
            return ((blendEquation === BlendEquation.ADD) ||
                    (blendEquation === BlendEquation.SUBTRACT) ||
                    (blendEquation === BlendEquation.REVERSE_SUBTRACT));
        }
    };

    return BlendEquation;
});
