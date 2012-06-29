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
         */
        TICK_DEPENDENT : new Enumeration(0, 'TICK_DEPENDENT'),

        /**
         * {@link Clock#tick} advances the current time by the amount of system
         * time elapsed since the previous call multiplied by {@link Clock#multiplier}.
         */
        SYSTEM_CLOCK_DEPENDENT : new Enumeration(1, 'SYSTEM_CLOCK_DEPENDENT')
    };

    return ClockStep;
});
