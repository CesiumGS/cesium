/*global define*/
define([
        './DeveloperError',
        './JulianDate',
        './ClockStep',
        './ClockRange',
        './defaultValue'
       ], function(
         DeveloperError,
         JulianDate,
         ClockStep,
         ClockRange,
         defaultValue) {
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
        this.multiplier = defaultValue(t.multiplier, 1.0);

        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         */
        this.clockStep = defaultValue(t.clockStep, ClockStep.SYSTEM_CLOCK_MULTIPLIER);

        /**
         * Determines how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type ClockRange
         */
        this.clockRange = defaultValue(t.clockRange, ClockRange.UNBOUNDED);

        /**
         * Determines if tick should actually advance time.
         * @type ClockRange
         */
        this.shouldAnimate = defaultValue(t.shouldAnimate, true);

        this._lastCpuTime = new Date().getTime();
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     * This should be called every frame, wheter animation is desired or not.
     * @memberof Clock
     *
     * @param {Number} [secondsToTick] optional parameter to force the clock to tick the provided number of seconds,
     * regardless of other settings.
     * @returns {JulianDate} The new value of the <code>currentTime</code> property.
     */
    Clock.prototype.tick = function(secondsToTick) {
        var currentCpuTime = new Date().getTime();
        if (this.clockStep === ClockStep.SYSTEM_CLOCK_TIME) {
            this.currentTime = new JulianDate();
            this._lastCpuTime = currentCpuTime;
            return this.currentTime;
        }

        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var currentTime = this.currentTime;
        var multiplier = this.multiplier;
        var shouldAnimate = this.shouldAnimate;

        if (typeof secondsToTick !== 'undefined') {
            currentTime = currentTime.addSeconds(secondsToTick);
        } else if (shouldAnimate) {
            if (this.clockStep === ClockStep.TICK_DEPENDENT) {
                currentTime = currentTime.addSeconds(multiplier);
            } else {
                var milliseconds = currentCpuTime - this._lastCpuTime;
                currentTime = currentTime.addSeconds(multiplier * (milliseconds / 1000.0));
            }
        }

        if (this.clockRange === ClockRange.CLAMPED) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime;
            } else if (currentTime.greaterThan(stopTime)) {
                currentTime = stopTime;
            }
        } else if (this.clockRange === ClockRange.LOOP_STOP) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime.clone();
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