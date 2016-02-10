/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Constants to determine how an interpolated value is extrapolated
     * when querying outside the bounds of available data.
     * 
     * @exports ExtrapolationType
     *
     * @see SampledProperty
     */
    var ExtrapolationType = {
        /**
         * No extrapolation occurs.
         *
         * @type {Number}
         * @constant
         */
        NONE : 0,

        /**
         * The first or last value is used when outside the range of sample data.
         *
         * @type {Number}
         * @constant
         */
        HOLD : 1,

        /**
         * The value is extrapolated.
         *
         * @type {Number}
         * @constant
         */
        EXTRAPOLATE : 2
    };

    return freezeObject(ExtrapolationType);
});