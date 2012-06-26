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
     * @param {JulianDate} [currentTime=new JulianDate()] The initial time of the clock.
     * @param {ClockStep} [clockStep=ClockStep.SYSTEM_CLOCK_DEPENDENT] Determines if clock time is frame dependent.
     * @param {Number} [multiplier=1.0] Determines how fast the clock should animate, negative values allow for animating backwards.
     * @param {JulianDate} [startTime=currentTime.addDays(-0.5)] The start time to use if the clock is to be bounded to a fixed time.
     * @param {JulianDate} [stopTime=startTime.addDays(1.0)] The stop time to use if the clock is to be bounded to a fixed time.
     * @param {ClockRange} [clockRange=ClockRange.UNBOUNDED] Determines if and how the clock should be constrained to the start and stop times.
     *
     * @constructor
     *
     * @see ClockStep
     * @see ClockRange
     */
    var Clock = function(currentTime, clockStep, multiplier, startTime, stopTime, clockRange) {
        /**
         * The current time.
         */
        this.currentTime = currentTime || new JulianDate();
        this.currentTime = TimeStandard.convertUtcToTai(this.currentTime);

        /**
         *Determines if clock time is frame dependent or system clock dependent.
         */
        this.clockStep = clockStep || ClockStep.SYSTEM_CLOCK_DEPENDENT;

        /**
         * Determines how fast the clock should animate, negative values allow for animating backwards.
         * For ClockStep.TICK_DEPENDENT this is the number of seconds for each tick.
         * For ClockStep.SYSTEM_CLOCK_DEPENDENT this value is multiplied by the elapsed system time
         * between each tick.
         */
        this.multiplier = multiplier || 1.0;

        var startTimeSpecified = typeof startTime !== 'undefined';
        var stopTimeSpecified = typeof stopTime !== 'undefined';

        /**
         * Determines if and how the clock should be constrained to the start and stop times.
         */
        this.clockRange = typeof clockRange !== 'undefined' ? clockRange : ClockRange.UNBOUNDED;

        /**
         * The start time of the clock.
         */
        this.startTime = startTimeSpecified ? startTime : this.currentTime.addDays(-0.5);
        this.startTime = TimeStandard.convertUtcToTai(this.startTime);

        /**
         * The stop time of the clock.
         */
        this.stopTime = stopTimeSpecified ? stopTime : this.startTime.addDays(1);
        this.stopTime = TimeStandard.convertUtcToTai(this.stopTime);

        if (this.startTime.greaterThanOrEquals(this.stopTime)) {
            throw new DeveloperError('startTime must be earlier than stopTime');
        }

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