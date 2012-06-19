/*global define*/
define([
        './Enumeration'
       ], function(
         Enumeration) {
    "use strict";

    /**
     * Constants related to the behavior of Clock.tick().
     *
     * @exports ClockStep
     *
     * @see Clock
     * @see ClockRange
     */
    var ClockStep = {
        /**
         * Clock.tick() advances the current time by a fixed step, which is the number of
         * seconds specified by Clock.multiplier.
         *
         * @example
         * //Each call to tick advances the clock 60 seconds.
         * var clock = new Clock();
         * clock.step = ClockStep.TICK_DEPENDENT;
         * clock.multiplier = 60.0;
         */
        TICK_DEPENDENT : new Enumeration(0, 'TICK_DEPENDENT'),

        /**
         * Clock.tick() advances the current time by an amount of system clock time elapsed,
         * multiplied by the value of Clock.multiplier, since the last call to Clock.tick()
         *
         * @example
         * //Each call to tick advances the clock at twice the rate of real-time.
         * var clock = new Clock();
         * clock.step = SYSTEM_CLOCK_DEPENDENT;
         * clock.multiplier = 2.0;
         */
        SYSTEM_CLOCK_DEPENDENT : new Enumeration(1, 'SYSTEM_CLOCK_DEPENDENT')
    };

    return ClockStep;
});
