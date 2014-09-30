/*global define*/
define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * Determines how blending factors are computed.
     *
     * @namespace
     * @alias BlendFunction
     */
    var BlendFunction = {
        /**
         * 0.  The blend factor is zero.
         *
         * @type {Number}
         * @constant
         */
        ZERO : 0,

        /**
         * 1.  The blend factor is one.
         *
         * @type {Number}
         * @constant
         */
        ONE : 1,

        /**
         * 0x0300.  The blend factor is the source color.
         *
         * @type {Number}
         * @constant
         */
        SOURCE_COLOR : 0x0300, // WebGL: SRC_COLOR

        /**
         * 0x0301.  The blend factor is one minus the source color.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_SOURCE_COLOR : 0x0301, // WebGL: ONE_MINUS_SRC_COLOR

        /**
         * 0x0306.  The blend factor is the destination color.
         *
         * @type {Number}
         * @constant
         */
        DESTINATION_COLOR : 0x0306, // WebGL: DEST_COLOR

        /**
         * 0x0307.  The blend factor is one minus the destination color.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_DESTINATION_COLOR : 0x0307, // WebGL: ONE_MINUS_DEST_COLOR

        /**
         * 0x0302.  The blend factor is the source alpha.
         *
         * @type {Number}
         * @constant
         */
        SOURCE_ALPHA : 0x0302, // WebGL: SRC_ALPHA

        /**
         * 0x0303.  The blend factor is one minus the source alpha.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_SOURCE_ALPHA : 0x0303, // WebGL: ONE_MINUS_SRC_ALPHA

        /**
         * 0x0304.  The blend factor is the destination alpha.
         *
         * @type {Number}
         * @constant
         */
        DESTINATION_ALPHA : 0x0304, // WebGL: DST_ALPHA

        /**
         * 0x0305.  The blend factor is one minus the destination alpha.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_DESTINATION_ALPHA : 0x0305, // WebGL: ONE_MINUS_DST_ALPHA

        /**
         * 0x8001.  The blend factor is the constant color.
         *
         * @type {Number}
         * @constant
         */
        CONSTANT_COLOR : 0x8001,

        /**
         * 0x8002.  The blend factor is one minus the constant color.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_CONSTANT_COLOR : 0x8002,

        /**
         * 0x8003.  The blend factor is the constant alpha.
         *
         * @type {Number}
         * @constant
         */
        CONSTANT_ALPHA : 0x8003,

        /**
         * 0x8004.  The blend factor is one minus the constant alpha.
         *
         * @type {Number}
         * @constant
         */
        ONE_MINUS_CONSTANT_ALPHA : 0x8004,

        /**
         * 0x0308.  The blend factor is the saturated source alpha.
         *
         * @type {Number}
         * @constant
         */
        SOURCE_ALPHA_SATURATE : 0x0308 // WebGL: SRC_ALPHA_SATURATE
    };

    return freezeObject(BlendFunction);
});
