/*global define*/
define([
        './Enumeration'
       ], function(
         Enumeration) {
    "use strict";

    /**
     * Constants used by {@link Clock#tick} to determine behavior
     * when {@link Clock#startTime} or {@link Clock#stopTime} is reached.
     *
     * @exports ClockRange
     *
     * @see Clock
     * @see ClockStep
     */
    var ClockRange = {
        /**
         * {@link Clock#tick} will always advances the clock in its current direction.
         */
        UNBOUNDED : new Enumeration(0, 'UNBOUNDED'),

        /**
         * When {@link Clock#startTime} or {@link Clock#stopTime} is reached,
         * {@link Clock#tick} will not advance {@link Clock#currentTime} any further.
         */
        CLAMPED : new Enumeration(1, 'CLAMPED'),

        /**
         * When {@link Clock#startTime} or {@link Clock#stopTime} is reached,
         * {@link Clock#tick} will advance {@link Clock#currentTime} to the opposite end of the interval.
         */
        LOOP : new Enumeration(1, 'LOOP')
    };

    return ClockRange;
});
