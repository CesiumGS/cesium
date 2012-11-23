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
        SPEED_MULTIPLIER : new Enumeration(1, 'SPEED_MULTIPLIER'),

        /**
         * {@link Clock#tick} sets the clock to the current system time, unless
         * the resulting time would fall out of range of {@link ClockRange}, at
         * which point this mode reverts to SPEED_MULTIPLIER.  To prevent this,
         * use {@link ClockRange.UNBOUNDED}.
         */
        SYSTEM_CLOCK_TIME : new Enumeration(1, 'SYSTEM_CLOCK_TIME')
    };

    return ClockStep;
});
