/*global define*/
define([
        './DeveloperError',
        './JulianDate',
        './ClockStep',
        './ClockRange'
       ], function(
         DeveloperError,
         JulianDate,
         ClockStep,
         ClockRange) {
    "use strict";

    /**
     * A simple clock for keeping track of simulated time.
     * @alias Clock
     * @constructor
     *
     * @param {Object} [template] The template object containing the properties to be set on the clock.
     * @exception {DeveloperError} startTime must come before stopTime.
     *
     * @see ClockStep
     * @see ClockRange
     * @see JulianDate
     * @see AnimationController
     *
     * @example
     * //Create a clock that loops on Christmas day 2012 and runs
     * //in real-time.  currentTime will default to startTime.
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
            startTime = currentTime.clone();
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined && stopTimeUndefined) {
            startTime = currentTime.clone();
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined && currentTimeUndefined) {
            startTime = stopTime.addDays(-1.0);
            currentTime = startTime.clone();
        } else if (currentTimeUndefined && stopTimeUndefined) {
            currentTime = startTime.clone();
            stopTime = startTime.addDays(1.0);
        } else if (currentTimeUndefined) {
            currentTime = startTime.clone();
        } else if (stopTimeUndefined) {
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined) {
            startTime = currentTime.clone();
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
            clockStep = ClockStep.SPEED_MULTIPLIER;
        }

        var clockRange = t.clockRange;
        if (typeof clockRange === 'undefined') {
            clockRange = ClockRange.UNBOUNDED;
        }

        /**
         * The start time of the clock.
         * @type JulianDate
         */
        this.startTime = startTime;

        /**
         * The stop time of the clock.
         * @type JulianDate
         */
        this.stopTime = stopTime;

        /**
         * The current time.
         * @type JulianDate
         */
        this.currentTime = currentTime;

        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_DEPENDENT this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @type Number
         */
        this.multiplier = multiplier;

        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         */
        this.clockStep = clockStep;

        /**
         * Determines how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type ClockRange
         */
        this.clockRange = clockRange;

        this._lastCpuTime = new Date().getTime();
        this._isOutOfRange = false;
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     * @memberof Clock
     *
     * @param {Number} [secondsToTick] optional parameter to force the clock to tick the provided number of seconds,
     * regardless of the value of <code>clockStep</code> and <code>multiplier</code>.
     * @returns {JulianDate} The new value of the <code>currentTime</code> property.
     */
    Clock.prototype.tick = function(secondsToTick) {
        return this._tick(secondsToTick, this.multiplier);
    };

    /**
     * Advances the clock in the opposite direction of the current <code>multiplier</code>.
     * If <code>multiplier</code> is positive this will advance the clock backwards one tick.
     * If <code>multiplier</code> is negative this will advance the clock forward one tick.
     * @memberof Clock
     *
     * @returns {JulianDate} The new value of Clock.currentTime
     */
    Clock.prototype.reverseTick = function() {
        return this._tick(undefined, -this.multiplier);
    };

    /**
     * This returns true if {@link ClockStep.SYSTEM_CLOCK_TIME} is a valid mode given
     * the current {@link ClockRange} setting.  This can change over time, as the system
     * time passes in and out of range.
     * @memberof Clock
     *
     * @returns {Boolean} value
     */
    Clock.prototype.isSystemTimeAvailable = function () {
        if (this.clockRange === ClockRange.UNBOUNDED) {
            return true;
        }

        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var currentTime = new JulianDate();
        return !(currentTime.lessThan(startTime) || currentTime.greaterThan(stopTime));
    };

    /**
     * This returns true only in {@link ClockRange.CLAMPED} mode after a {@link Clock#tick} or
     * {@link Clock#reverseTick} has reached a clamp point.  It indicates that pause mode
     * should be engaged.
     * @memberof Clock
     *
     * @returns {Boolean} value
     */
    Clock.prototype.isOutOfRange = function () {
        return this._isOutOfRange;
    };

    Clock.prototype._tick = function(secondsToTick, multiplier) {
        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var currentTime = this.currentTime;
        var currentCpuTime = new Date().getTime();
        this._isOutOfRange = false;

        if (this.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            currentTime = new JulianDate();
        } else if (typeof secondsToTick === 'undefined') {
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
                // SYSTEM_CLOCK_TIME + CLAMPED at start time, don't report out of range,
                // just wait at the start time for the realtime event to begin.
                if (this.clockStep !== ClockStep.SYSTEM_CLOCK_TIME) {
                    // Other modes pause at the CLAMPED start time.
                    this._isOutOfRange = true;
                }
            } else if (currentTime.greaterThan(stopTime)) {
                currentTime = stopTime;
                this._isOutOfRange = true;
                // SYSTEM_CLOCK_TIME + CLAMPED at end time, pause at the end time.
                if (this.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                    this.clockStep = ClockStep.SPEED_MULTIPLIER;
                }
            }
        } else if (this.clockRange === ClockRange.LOOP) {
            if (this.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
                if (currentTime.lessThan(startTime)) {
                    // SYSTEM_CLOCK_TIME + LOOP at start time simply waits at the start time to begin.
                    currentTime = startTime;
                }
                if (currentTime.greaterThan(stopTime)) {
                    // SYSTEM_CLOCK_TIME + LOOP at end time switches to SPEED_MULTIPLIER mode and restarts.
                    currentTime = startTime;
                    this.clockStep = ClockStep.SPEED_MULTIPLIER;
                }
            } else {
                while (currentTime.greaterThan(stopTime)) {
                    currentTime = startTime.addSeconds(stopTime.getSecondsDifference(currentTime));
                }
                if (currentTime.lessThan(startTime)) {
                    currentTime = startTime;
                    this._isOutOfRange = true;
                }
            }
        }

        this.currentTime = currentTime;
        this._lastCpuTime = currentCpuTime;
        return currentTime;
    };

    return Clock;
});