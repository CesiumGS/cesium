/*global define*/
define(function() {
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
         * @type {Number}
         * @constant
         * @default 0
         */
        ZERO : 0,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 1
         */
        ONE : 1,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0300
         */
        SOURCE_COLOR : 0x0300, // WebGL: SRC_COLOR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0301
         */
        ONE_MINUS_SOURCE_COLOR : 0x0301, // WebGL: ONE_MINUS_SRC_COLOR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0306
         */
        DESTINATION_COLOR : 0x0306, // WebGL: DEST_COLOR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0307
         */
        ONE_MINUS_DESTINATION_COLOR : 0x0307, // WebGL: ONE_MINUS_DEST_COLOR

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0302
         */
        SOURCE_ALPHA : 0x0302, // WebGL: SRC_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0303
         */
        ONE_MINUS_SOURCE_ALPHA : 0x0303, // WebGL: ONE_MINUS_SRC_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0304
         */
        DESTINATION_ALPHA : 0x0304, // WebGL: DST_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x0305
         */
        ONE_MINUS_DESTINATION_ALPHA : 0x0305, // WebGL: ONE_MINUS_DST_ALPHA

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8001
         */
        CONSTANT_COLOR : 0x8001,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8002
         */
        ONE_MINUS_CONSTANT_COLOR : 0x8002,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8003
         */
        CONSTANT_ALPHA : 0x8003,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8004
         */
        ONE_MINUS_CONSTANT_ALPHA : 0x8004,

        /**
         * DOC_TBA
         *
         * @type {Number}
         * @constant
         * @default 0x8008
         */
        SOURCE_ALPHA_SATURATE : 0x0308 // WebGL: SRC_ALPHA_SATURATE
    };

    return BlendFunction;
});
