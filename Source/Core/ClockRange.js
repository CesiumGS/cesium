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
         *
         * @type {ClockRange}
         * @constant
         * @default 0
         */
        UNBOUNDED : new Enumeration(0, 'UNBOUNDED'),

        /**
         * When {@link Clock#startTime} or {@link Clock#stopTime} is reached,
         * {@link Clock#tick} will not advance {@link Clock#currentTime} any further.
         *
         * @type {ClockRange}
         * @constant
         * @default 1
         */
        CLAMPED : new Enumeration(1, 'CLAMPED'),

        /**
         * When {@link Clock#stopTime} is reached, {@link Clock#tick} will advance
         * {@link Clock#currentTime} to the opposite end of the interval.  When
         * time is moving backwards, {@link Clock#tick} will not advance past
         * {@link Clock#startTime}
         *
         * @type {ClockRange}
         * @constant
         * @default 2
         */
        LOOP_STOP : new Enumeration(2, 'LOOP_STOP')
    };

    return ClockRange;
});
