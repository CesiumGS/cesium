/*global define*/
define([
        '../Core/Iso8601',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/defined'
    ], function(
        Iso8601,
        ClockRange,
        ClockStep,
        defined) {
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
     * @return {DynamicClock} The modified result parameter or a new DynamicClock instance if one was not provided.
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
     * Given two DynamicObjects, takes the clock properties from the second
     * and assigns them to the first.
     * @memberof DynamicClock
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicClock.mergeProperties = function(targetObject, objectToMerge) {
        var clockToMerge = objectToMerge.clock;
        if (defined(clockToMerge)) {

            var targetClock = targetObject.clock;
            if (!defined(targetClock)) {
                targetClock = new DynamicClock();
                targetObject.clock = targetClock;
            }

            targetClock.startTime = clockToMerge.startTime;
            targetClock.stopTime = clockToMerge.stopTime;
            targetClock.currentTime = clockToMerge.currentTime;
            targetClock.clockRange = clockToMerge.clockRange;
            targetClock.clockStep = clockToMerge.clockStep;
            targetClock.multiplier = clockToMerge.multiplier;
        }
    };

    /**
     * Given a DynamicObject, undefines the clock associated with it.
     * @memberof DynamicClock
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the clock from.
     */
    DynamicClock.undefineProperties = function(dynamicObject) {
        dynamicObject.clock = undefined;
    };

    return DynamicClock;
});
