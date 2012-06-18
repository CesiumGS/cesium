/*global define*/
define([
        './Enumeration'
       ], function(
         Enumeration) {
    "use strict";

    /**
     * Constants related to the behavior of Clock.tick().
     *
     * @exports ClockRange
     *
     * @see Clock
     * @see ClockStep
     */
    var ClockRange = {
        /**
         * The clock will has no defined start or stop times and animates
         * in the current direction forever.
         *
         * @example
         * //Clock tick will always advance in the current animation direction.
         * var clock = new Clock();
         * clock.range = ClockRange.UNBOUNDED;
         */
        UNBOUNDED : new Enumeration(0, 'UNBOUNDED'),

        /**
         * When the configured start or stop time is reached, further calls to
         * Clock.tick() will have no effect.
         *
         * @example
         * //Clock tick will stop whenever start or stop is reached.
         * var clock = new Clock(start, stop);
         * clock.range = ClockRange.CLAMPED;
         */
        CLAMPED : new Enumeration(1, 'CLAMPED'),

        /**
         * When the configured start or stop time is reached, the next animation
         * step will loop to the opposite time.  That is, if stop is reached it
         * will loop to start or if start is reached it will loop to stop.
         *
         * @example
         * //Clock tick will loop whenever start or stop is reached.
         * var clock = new Clock(start, stop);
         * clock.range = ClockRange.LOOP;
         */
        LOOP : new Enumeration(1, 'LOOP')
    };

    return ClockRange;
});
