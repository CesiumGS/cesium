/*global define*/
define([
        '../Core/defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * Water mask data for a single {@link Tile}.  A water mask is a rectangular array of one-byte values,
     * where a value of 255 indicates water and a value of 0 indicates land.  Values in between 0 and 255 are
     * permitted as well in order to support smooth blending between land and water.
     *
     * @alias WaterMaskData
     * @constructor
     *
     * @param {Uint8Array} buffer The buffer containing water mask data.
     * @param {Number} width The width (longitude direction) of the water mask, in samples.
     * @param {Number} height The height (latitude direction) of the water mask, in samples.
     */
    var WaterMaskData = function WaterMaskData(buffer, width, height) {
        /**
         * The buffer containing the water mask data.
         * @type {Uint8Array}
         */
        this.buffer = buffer;

        /**
         * The width (longitude direction) of the water mask, in samples.
         * @type {Number}
         */
        this.width = width;

        /**
         * The height (latitude direction) of the water mask, in samples.
         * @type {Number}
         */
        this.height = height;
    };

    return WaterMaskData;
});