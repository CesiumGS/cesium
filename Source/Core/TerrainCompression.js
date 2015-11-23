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
     *
     * @private
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
         * The vertices are compressed to 12 bits.
         *
         * @type {Number}
         * @constant
         */
        BITS12 : 1
    };

    return freezeObject(TerrainCompression);
});
