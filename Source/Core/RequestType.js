define([
        '../Core/freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * An enum identifying the type of request. Used for finer grained logging and priority sorting.
     *
     * @exports RequestType
     */
    var RequestType = {
        /**
         * Terrain request.
         *
         * @type Number
         * @constant
         */
        TERRAIN : 0,

        /**
         * Imagery request.
         *
         * @type Number
         * @constant
         */
        IMAGERY : 1,

        /**
         * 3D Tiles request.
         *
         * @type Number
         * @constant
         */
        TILES3D : 2,

        /**
         * Other request.
         *
         * @type Number
         * @constant
         */
        OTHER : 3
    };

    return freezeObject(RequestType);
});
