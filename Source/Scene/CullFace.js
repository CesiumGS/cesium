/*global define*/
define([
        '../Core/freezeObject',
        '../Core/WebGLConstants'
    ], function(
        freezeObject,
        WebGLConstants) {
    'use strict';

    /**
     * Determines which triangles, if any, are culled.
     *
     * @exports CullFace
     */
    var CullFace = {
        /**
         * Front-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        FRONT : WebGLConstants.FRONT,

        /**
         * Back-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        BACK : WebGLConstants.BACK,

        /**
         * Both front-facing and back-facing triangles are culled.
         *
         * @type {Number}
         * @constant
         */
        FRONT_AND_BACK : WebGLConstants.FRONT_AND_BACK
    };

    return freezeObject(CullFace);
});
