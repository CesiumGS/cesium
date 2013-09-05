/*global define*/
define(['../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Iso8601'
    ], function(
        ClockRange,
        ClockStep,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        Iso8601) {
    "use strict";

    /**
     * Represents CZML document-level clock settings.
     *
     * @alias DynamicClock
     * @constructor
     */
    var DynamicClock = function() {
        /**
         * The start time of the clock to use when looping or clamped.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.start}
         */
        this.startTime = Iso8601.MAXIMUM_INTERVAL.start;

        /**
         * The stop time of the clock to use when looping or clamped.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.stop}
         */
        this.stopTime = Iso8601.MAXIMUM_INTERVAL.stop;

        /**
         * The initial time to use when switching to this clock.
         * @type {JulianDate}
         * @default {@link Iso8601.MAXIMUM_INTERVAL.start}
         */
        this.currentTime = Iso8601.MAXIMUM_INTERVAL.start;

        /**
         * Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type {ClockRange}
         * @default {@link ClockRange.LOOP_STOP}
         */
        this.clockRange = ClockRange.LOOP_STOP;

        /**
         * Determines if clock advancement is frame dependent or system clock dependent.
         * @type {ClockStep}
         * @default {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}
         */
        this.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;

        /**
         * Determines how much time advances with each tick, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @type {Number}
         * @default 1.0
         */
        this.multiplier = 1.0;
    };

    /**
     * Duplicates a DynamicClock instance.
     * @memberof DynamicClock
     *
     * @param {DynamicClock} [result] The object onto which to store the result.
     * @returns {DynamicClock} The modified result parameter or a new DynamicClock instance if one was not provided.
     */
    DynamicClock.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicClock();
        }
        result.startTime = this.startTime;
        result.stopTime = this.stopTime;
        result.clockRange = this.clockRange;
        result.clockStep = this.clockStep;
        result.multiplier = this.multiplier;
        result.currentTime = this.currentTime;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {DynamicClock} source The object to be merged into this object.
     * @exception {DeveloperError} source is required.
     */
    DynamicClock.prototype.merge = function(source) {
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        this.startTime = defaultValue(this.startTime, source.startTime);
        this.stopTime = defaultValue(this.stopTime, source.stopTime);
        this.currentTime = defaultValue(this.currentTime, source.currentTime);
        this.clockRange = defaultValue(this.clockRange, source.clockRange);
        this.clockStep = defaultValue(this.clockStep, source.clockStep);
        this.multiplier = defaultValue(this.multiplier, source.multiplier);
    };

    return DynamicClock;
});
