/*global define*/
define([
        './DeveloperError',
        './JulianDate',
        './ClockStep',
        './ClockRange',
        './TimeStandard'
       ], function(
         DeveloperError,
         JulianDate,
         ClockStep,
         ClockRange,
         TimeStandard) {
    "use strict";

    /**
     * A simple clock for keeping track of simulated time.
     *
     * @name Clock
     *
     * @param {Object} [template] The template object containing the properties to be set on the clock.
     *
     * @exception {DeveloperError} startTime must come before stopTime.
     *
     * @constructor
     *
     * @see ClockStep
     * @see ClockRange
     *
     * @example
     * //Create a clock that loops on Christmas day 2012.
     * //currentTime will default to startTime.
     * var clock = new Clock({
     *    startTime : JulianDate.fromIso8601("12-25-2012");
     *    stopTime : JulianDate.fromIso8601("12-26-2012");
     *    clockRange : ClockRange.LOOP;
     * });
     */
    var Clock = function(template) {
        var t = template;
        if (typeof t === 'undefined') {
            t = {};
        }

        var startTime = t.startTime;
        var startTimeUndefined = typeof startTime === 'undefined';

        var stopTime = t.stopTime;
        var stopTimeUndefined = typeof stopTime === 'undefined';

        var currentTime = t.currentTime;
        var currentTimeUndefined = typeof currentTime === 'undefined';

        if (startTimeUndefined && stopTimeUndefined && currentTimeUndefined) {
            currentTime = new JulianDate();
            startTime = currentTime.addDays(-0.5);
            stopTime = currentTime.addDays(0.5);
        } else if (startTimeUndefined && stopTimeUndefined) {
            startTime = currentTime.addDays(-0.5);
            stopTime = currentTime.addDays(0.5);
        } else if (startTimeUndefined && currentTimeUndefined) {
            startTime = stopTime.addDays(-1.0);
            currentTime = stopTime.addDays(0.5);
        } else if (currentTimeUndefined && stopTimeUndefined) {
            currentTime = startTime.addDays(0.5);
            stopTime = startTime.addDays(1.0);
        } else if (currentTimeUndefined) {
            currentTime = startTime.addSeconds(startTime.secondsDifference(stopTime));
        } else if (stopTimeUndefined) {
            stopTime = currentTime.addDays(0.5);
        } else if (startTimeUndefined) {
            startTime = currentTime.addDays(-0.5);
        }

        if (startTime.greaterThan(stopTime)) {
            throw new DeveloperError('startTime must come before stopTime.');
        }

        var multiplier = t.multiplier;
        if (typeof multiplier === 'undefined') {
            multiplier = 1.0;
        }

        var clockStep = t.clockStep;
        if (typeof clockStep === 'undefined') {
            clockStep = ClockStep.SYSTEM_CLOCK_DEPENDENT;
        }

        var clockRange = t.clockRange;
        if (typeof clockRange === 'undefined') {
            clockRange = ClockRange.UNBOUNDED;
        }

        /**
         * The start time of the clock.
         */
        this.startTime = TimeStandard.convertUtcToTai(startTime);

        /**
         * The stop time of the clock.
         */
        this.stopTime = TimeStandard.convertUtcToTai(stopTime);

        /**
         * The current time.
         */
        this.currentTime = currentTime;

        /**
         * Determines how fast the clock should animate, negative values allow for animating backwards.
         * For ClockStep.TICK_DEPENDENT this is the number of seconds for each tick.
         * For ClockStep.SYSTEM_CLOCK_DEPENDENT this value is multiplied by the elapsed system time
         * between each tick.
         */
        this.multiplier = multiplier;

        /**
         *Determines if clock time is frame dependent or system clock dependent.
         */
        this.clockStep = clockStep;

        /**
         * Determines if and how the clock should be constrained to the start and stop times.
         */
        this.clockRange = clockRange;

        this._lastCpuTime = new Date().getTime();
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     *
     * @param {Number} [secondsToTick] optional parameter to force the clock to tick the provided number of seconds,
     * regardless of the value of clockStep.
     *
     * @returns {JulianDate} The new value of Clock.currentTime
     */
    Clock.prototype.tick = function(secondsToTick) {
        return this._tick(secondsToTick, this.multiplier);
    };

    /**
     * Advances the clock in the opposite direction of the current multiplier.
     * If multiplier is positive and time is moving forward, this call will
     * move backwards one tick.  If multiplier is negative and time is moving
     * backwards, this call will move the clock forward one tick.
     *
     * @returns {JulianDate} The new value of Clock.currentTime
     */
    Clock.prototype.reverseTick = function() {
        return this._tick(undefined, -this.multiplier);
    };

    Clock.prototype._tick = function(secondsToTick, multiplier) {
        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var currentTime = this.currentTime;
        var currentCpuTime = new Date().getTime();

        if (typeof secondsToTick === 'undefined') {
            if (this.clockStep === ClockStep.TICK_DEPENDENT) {
                currentTime = currentTime.addSeconds(multiplier);
            } else {
                var milliseconds = currentCpuTime - this._lastCpuTime;
                currentTime = currentTime.addSeconds(multiplier * (milliseconds / 1000.0));
            }
        } else {
            currentTime = currentTime.addSeconds(secondsToTick);
        }

        if (this.clockRange === ClockRange.CLAMPED) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime;
            } else if (currentTime.greaterThan(stopTime)) {
                currentTime = stopTime;
            }
        } else if (this.clockRange === ClockRange.LOOP) {
            while (currentTime.lessThan(startTime)) {
                currentTime = stopTime.addSeconds(startTime.getSecondsDifference(currentTime));
            }
            while (currentTime.greaterThan(stopTime)) {
                currentTime = startTime.addSeconds(stopTime.getSecondsDifference(currentTime));
            }
        }

        this.currentTime = currentTime;
        this._lastCpuTime = currentCpuTime;
        return currentTime;
    };

    return Clock;
});