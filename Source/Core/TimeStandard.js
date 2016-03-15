/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Provides the type of time standards which JulianDate can take as input.
     *
     * @exports TimeStandard
     *
     * @see JulianDate
     */
    var TimeStandard = {
        /**
         * Represents the coordinated Universal Time (UTC) time standard.
         *
         * UTC is related to TAI according to the relationship
         * <code>UTC = TAI - deltaT</code> where <code>deltaT</code> is the number of leap
         * seconds which have been introduced as of the time in TAI.
         *
         */
        UTC : 0,

        /**
         * Represents the International Atomic Time (TAI) time standard.
         * TAI is the principal time standard to which the other time standards are related.
         */
        TAI : 1
    };

    return freezeObject(TimeStandard);
});