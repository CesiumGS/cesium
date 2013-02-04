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
     *
     * @example
     * // Create a clock that loops on Christmas day 2013 and runs
     * // in real-time.  currentTime will default to startTime.
     * var clock = new Clock({
     *    startTime : JulianDate.fromIso8601("12-25-2013");
     *    stopTime : JulianDate.fromIso8601("12-26-2013");
     *    clockRange : ClockRange.LOOP_STOP;
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
            clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
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
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
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
        return _tick(secondsToTick, this.multiplier, this);
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
        return _tick(undefined, -this.multiplier, this);
    };

    function _tick(secondsToTick, multiplier, clock) {
        var currentCpuTime = new Date().getTime();
        if (clock.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            clock.currentTime = new JulianDate();
            clock._lastCpuTime = currentCpuTime;
            return clock.currentTime;
        }

        var startTime = clock.startTime;
        var stopTime = clock.stopTime;
        var currentTime = clock.currentTime;

        if (typeof secondsToTick === 'undefined') {
            if (clock.clockStep === ClockStep.TICK_DEPENDENT) {
                currentTime = currentTime.addSeconds(multiplier);
            } else {
                var milliseconds = currentCpuTime - clock._lastCpuTime;
                currentTime = currentTime.addSeconds(multiplier * (milliseconds / 1000.0));
            }
        } else {
            currentTime = currentTime.addSeconds(secondsToTick);
        }

        if (clock.clockRange === ClockRange.CLAMPED) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime;
            } else if (currentTime.greaterThan(stopTime)) {
                currentTime = stopTime;
            }
        } else if (clock.clockRange === ClockRange.LOOP_STOP) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime.clone();
            }
            while (currentTime.greaterThan(stopTime)) {
                currentTime = startTime.addSeconds(stopTime.getSecondsDifference(currentTime));
            }
        }

        clock.currentTime = currentTime;
        clock._lastCpuTime = currentCpuTime;
        return currentTime;
    }

    return Clock;
});