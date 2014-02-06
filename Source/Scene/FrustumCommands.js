/*global define*/
define(['../Core/defaultValue'], function(defaultValue) {
    "use strict";

    /**
     * Defines a list of commands whose geometry are bound by near and far distances from the camera.
     * @alias FrustumCommands
     * @constructor
     *
     * @param {Number} [near=0.0] The lower bound or closest distance from the camera.
     * @param {Number} [far=0.0] The upper bound or farthest distance from the camera.
     */
    var FrustumCommands = function(near, far) {
        /**
         * The lower bound or closest distance from the camera.
         * @type {Number}
         * @default 0.0
         */
        this.near = defaultValue(near, 0.0);
        /**
         * The upper bound or farthest distance from the camera.
         * @type {Number}
         * @default 0.0
         */
        this.far = defaultValue(far, 0.0);
        /**
         * The list of opaque commands.
         * @type {Array}
         * @default []
         */
        this.opaqueCommands = [];
        /**
         * The list of translucent commands.
         * @type {Array}
         * @default []
         */
        this.translucentCommands = [];
    };

    return FrustumCommands;
});