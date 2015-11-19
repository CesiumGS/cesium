/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    "use strict";

    /**
     * This enumerated type is used to determine how the vertices of the terrain mesh are compressed.
     *
     * @namespace
     * @alias TerrainCompression
     */
    var TerrainCompression = {
        /**
         * The vertices are not compressed.
         *
         * @type {Number}
         * @constant
         */
        NONE : 0,

        /**
         * The vertices are compressed to 16 bits.
         *
         * @type {Number}
         * @constant
         */
        BITS16 : 1,

        /**
         * The vertices are compressed to 12 bits.
         *
         * @type {Number}
         * @constant
         */
        BITS12 : 2,

        /**
         * The vertices are compressed to 8 bits.
         *
         * @type {Number}
         * @constant
         */
        BITS8 : 3
    };

    return freezeObject(TerrainCompression);
});
