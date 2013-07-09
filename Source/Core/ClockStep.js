/*global define*/
define([
        './Enumeration'
       ], function(
         Enumeration) {
    "use strict";

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
         * @type {Enumeration}
         * @constant
         * @default 0
         */
        TICK_DEPENDENT : new Enumeration(0, 'TICK_DEPENDENT'),

        /**
         * {@link Clock#tick} advances the current time by the amount of system
         * time elapsed since the previous call multiplied by {@link Clock#multiplier}.
         *
         * @type {Enumeration}
         * @constant
         * @default 1 
         */
        SYSTEM_CLOCK_MULTIPLIER : new Enumeration(1, 'SYSTEM_CLOCK_MULTIPLIER'),

        /**
         * {@link Clock#tick} sets the clock to the current system time;
         * ignoring all other settings.
         *
         * @type {Enumeration}
         * @constant
         * @default 2 
         */
        SYSTEM_CLOCK : new Enumeration(2, 'SYSTEM_CLOCK')
    };

    return ClockStep;
});
