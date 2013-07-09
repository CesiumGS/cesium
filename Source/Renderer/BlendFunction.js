/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports BlendFunction
     */
    var BlendFunction = {
        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        ZERO : new Enumeration(0, 'ZERO'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 1
         */
        ONE : new Enumeration(1, 'ONE'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0300
         */
        SOURCE_COLOR : new Enumeration(0x0300, 'SOURCE_COLOR'), // WebGL: SRC_COLOR

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0301
         */
        ONE_MINUS_SOURCE_COLOR : new Enumeration(0x0301, 'ONE_MINUS_SOURCE_COLOR'), // WebGL: ONE_MINUS_SRC_COLOR

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0306
         */
        DESTINATION_COLOR : new Enumeration(0x0306, 'DESTINATION_COLOR'), // WebGL: DEST_COLOR

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0307
         */
        ONE_MINUS_DESTINATION_COLOR : new Enumeration(0x0307, 'ONE_MINUS_DESTINATION_COLOR'), // WebGL: ONE_MINUS_DEST_COLOR

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0302
         */
        SOURCE_ALPHA : new Enumeration(0x0302, 'SOURCE_ALPHA'), // WebGL: SRC_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0303
         */
        ONE_MINUS_SOURCE_ALPHA : new Enumeration(0x0303, 'ONE_MINUS_SOURCE_ALPHA'), // WebGL: ONE_MINUS_SRC_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0304
         */
        DESTINATION_ALPHA : new Enumeration(0x0304, 'DESTINATION_ALPHA'), // WebGL: DST_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x0305
         */
        ONE_MINUS_DESTINATION_ALPHA : new Enumeration(0x0305, 'ONE_MINUS_DESTINATION_ALPHA'), // WebGL: ONE_MINUS_DST_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8001
         */
        CONSTANT_COLOR : new Enumeration(0x8001, 'CONSTANT_COLOR'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8002
         */
        ONE_MINUS_CONSTANT_COLOR : new Enumeration(0x8002, 'ONE_MINUS_CONSTANT_COLOR'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8003
         */
        CONSTANT_ALPHA : new Enumeration(0x8003, 'CONSTANT_ALPHA'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8004
         */
        ONE_MINUS_CONSTANT_ALPHA : new Enumeration(0x8004, 'ONE_MINUS_CONSTANT_ALPHA'),

        /**
         * DOC_TBA
         *
         * @type {Enumeration}
         * @constant
         * @default 0x8008
         */
        SOURCE_ALPHA_SATURATE : new Enumeration(0x0308, 'SOURCE_ALPHA_SATURATE'), // WebGL: SRC_ALPHA_SATURATE

        /**
         * DOC_TBA
         *
         * @param {BlendFunction} blendFunction
         *
         * @returns {Boolean}
         */
        validate : function(blendFunction) {
            return ((blendFunction === BlendFunction.ZERO) ||
                    (blendFunction === BlendFunction.ONE) ||
                    (blendFunction === BlendFunction.SOURCE_COLOR) ||
                    (blendFunction === BlendFunction.ONE_MINUS_SOURCE_COLOR) ||
                    (blendFunction === BlendFunction.DESTINATION_COLOR) ||
                    (blendFunction === BlendFunction.ONE_MINUS_DESTINATION_COLOR) ||
                    (blendFunction === BlendFunction.SOURCE_ALPHA) ||
                    (blendFunction === BlendFunction.ONE_MINUS_SOURCE_ALPHA) ||
                    (blendFunction === BlendFunction.DESTINATION_ALPHA) ||
                    (blendFunction === BlendFunction.ONE_MINUS_DESTINATION_ALPHA) ||
                    (blendFunction === BlendFunction.CONSTANT_COLOR) ||
                    (blendFunction === BlendFunction.ONE_MINUS_CONSTANT_COLOR) ||
                    (blendFunction === BlendFunction.CONSTANT_ALPHA) ||
                    (blendFunction === BlendFunction.ONE_MINUS_CONSTANT_ALPHA) ||
                    (blendFunction === BlendFunction.SOURCE_ALPHA_SATURATE));
        }
    };

    return BlendFunction;
});
