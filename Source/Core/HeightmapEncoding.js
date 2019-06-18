define([
    './freezeObject'
], function(
    freezeObject) {
    'use strict';

    /**
     * The encoding that is used for a heightmap
     *
     * @exports HeightmapEncoding
     */
    var HeightmapEncoding = {
        /**
         * No encoding
         *
         * @type {Number}
         * @constant
         */
        NONE: 0,

        /**
         * LERC encoding
         *
         * @type {Number}
         * @constant
         *
         * @see {@link https://github.com/Esri/lerc|The LERC specification}
         */
        LERC: 1
    };

    return freezeObject(HeightmapEncoding);
});
