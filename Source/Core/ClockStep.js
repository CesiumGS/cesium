/*global define*/
define([
        './freezeObject'
    ], function(
        freezeObject) {
    'use strict';

    /**
     * Constants to determine how much time advances with each call
     * to {@link Clock#tick}.
     *
     * @exports ClockStep
     *
     * @see Clock
     * @see ClockRange
     */
    var ClockStep = {
        /**
         * {@link Clock#tick} advances the current time by a fixed step,
         * which is the number of seconds specified by {@link Clock#multiplier}.
         *
         * @type {Number}
         * @constant
         */
        TICK_DEPENDENT : 0,

        /**
         * {@link Clock#tick} advances the current time by the amount of system
         * time elapsed since the previous call multiplied by {@link Clock#multiplier}.
         *
         * @type {Number}
         * @constant
         */
        SYSTEM_CLOCK_MULTIPLIER : 1,

        /**
         * {@link Clock#tick} sets the clock to the current system time;
         * ignoring all other settings.
         *
         * @type {Number}
         * @constant
         */
        SYSTEM_CLOCK : 2
    };

    return freezeObject(ClockStep);
});