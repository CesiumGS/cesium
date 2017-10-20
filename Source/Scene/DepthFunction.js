define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * Determines the function used to compare two depths for the depth test.
     *
     * @exports DepthFunction
     */
    var DepthFunction = {
        /**
         * The depth test never passes.
         *
         * @type {Number}
         * @constant
         */
        NEVER : WebGLConstants.NEVER,

        /**
         * The depth test passes if the incoming depth is less than the stored depth.
         *
         * @type {Number}
         * @constant
         */
        LESS : WebGLConstants.LESS,

        /**
         * The depth test passes if the incoming depth is equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        EQUAL : WebGLConstants.EQUAL,

        /**
         * The depth test passes if the incoming depth is less than or equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        LESS_OR_EQUAL : WebGLConstants.LEQUAL,

        /**
         * The depth test passes if the incoming depth is greater than the stored depth.
         *
         * @type {Number}
         * @constant
         */
        GREATER : WebGLConstants.GREATER,

        /**
         * The depth test passes if the incoming depth is not equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        NOT_EQUAL : WebGLConstants.NOTEQUAL,

        /**
         * The depth test passes if the incoming depth is greater than or equal to the stored depth.
         *
         * @type {Number}
         * @constant
         */
        GREATER_OR_EQUAL : WebGLConstants.GEQUAL,

        /**
         * The depth test always passes.
         *
         * @type {Number}
         * @constant
         */
        ALWAYS : WebGLConstants.ALWAYS
    };

    return freezeObject(DepthFunction);
});
