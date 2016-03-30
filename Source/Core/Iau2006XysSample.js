/*global define*/
define(function() {
    'use strict';

    /**
     * An IAU 2006 XYS value sampled at a particular time.
     *
     * @alias Iau2006XysSample
     * @constructor
     *
     * @param {Number} x The X value.
     * @param {Number} y The Y value.
     * @param {Number} s The S value.
     *
     * @private
     */
    function Iau2006XysSample(x, y, s) {
        /**
         * The X value.
         * @type {Number}
         */
        this.x = x;

        /**
         * The Y value.
         * @type {Number}
         */
        this.y = y;

        /**
         * The S value.
         * @type {Number}
         */
        this.s = s;
    }

    return Iau2006XysSample;
});
