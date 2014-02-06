/*global define*/
define([
        './ClockRange',
        './ClockStep',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Event',
        './getTimestamp',
        './JulianDate'
    ], function(
        ClockRange,
        ClockStep,
        defaultValue,
        defined,
        DeveloperError,
        Event,
        getTimestamp,
        JulianDate) {
    "use strict";

    /**
     * A simple clock for keeping track of simulated time.
     *
     * @alias Clock
     * @constructor
     *
     * @param {JulianDate} [description.startTime] The start time of the clock.
     * @param {JulianDate} [description.stopTime] The stop time of the clock.
     * @param {JulianDate} [description.currentTime] The current time.
     * @param {Number} [description.multiplier=1.0] Determines how much time advances when tick is called, negative values allow for advancing backwards.
     * @param {ClockStep} [description.clockStep=ClockStep.SYSTEM_CLOCK_MULTIPLIER] Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
     * @param {ClockRange} [description.clockRange=ClockRange.UNBOUNDED] Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
     * @param {Boolean} [description.shouldAnimate=true] Determines if tick should actually advance time.
     *
     * @exception {DeveloperError} startTime must come before stopTime.
     *
     * @see ClockStep
     * @see ClockRange
     * @see JulianDate
     *
     * @example
     * // Create a clock that loops on Christmas day 2013 and runs in real-time.
     * var clock = new Cesium.Clock({
     *    startTime : Cesium.JulianDate.fromIso8601("12-25-2013"),
     *    currentTime : Cesium.JulianDate.fromIso8601("12-25-2013"),
     *    stopTime : Cesium.JulianDate.fromIso8601("12-26-2013"),
     *    clockRange : Cesium.ClockRange.LOOP_STOP,
     *    clockStep : SYSTEM_CLOCK_MULTIPLIER
     * });
     */
    var Clock = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        var startTime = description.startTime;
        var startTimeUndefined = !defined(startTime);

        var stopTime = description.stopTime;
        var stopTimeUndefined = !defined(stopTime);

        var currentTime = description.currentTime;
        var currentTimeUndefined = !defined(currentTime);

        if (startTimeUndefined && stopTimeUndefined && currentTimeUndefined) {
            currentTime = new JulianDate();
            startTime = JulianDate.clone(currentTime);
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined && stopTimeUndefined) {
            startTime = JulianDate.clone(currentTime);
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined && currentTimeUndefined) {
            startTime = stopTime.addDays(-1.0);
            currentTime = JulianDate.clone(startTime);
        } else if (currentTimeUndefined && stopTimeUndefined) {
            currentTime = JulianDate.clone(startTime);
            stopTime = startTime.addDays(1.0);
        } else if (currentTimeUndefined) {
            currentTime = JulianDate.clone(startTime);
        } else if (stopTimeUndefined) {
            stopTime = currentTime.addDays(1.0);
        } else if (startTimeUndefined) {
            startTime = JulianDate.clone(currentTime);
        }

        //>>includeStart('debug', pragmas.debug);
        if (startTime.greaterThan(stopTime)) {
            throw new DeveloperError('startTime must come before stopTime.');
        }
        //>>includeEnd('debug');

        /**
         * The start time of the clock.
         * @type {JulianDate}
         */
        this.startTime = startTime;

        /**
         * The stop time of the clock.
         * @type {JulianDate}
         */
        this.stopTime = stopTime;

        /**
         * The current time.
         * @type {JulianDate}
         */
        this.currentTime = currentTime;

        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @type {Number}
         * @default 1.0
         */
        this.multiplier = defaultValue(description.multiplier, 1.0);

        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         * @default {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}
         */
        this.clockStep = defaultValue(description.clockStep, ClockStep.SYSTEM_CLOCK_MULTIPLIER);

        /**
         * Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type {ClockRange}
         * @default {@link ClockRange.UNBOUNDED}
         */
        this.clockRange = defaultValue(description.clockRange, ClockRange.UNBOUNDED);

        /**
         * Determines if tick should actually advance time.
         * @type {Boolean}
         * @default true
         */
        this.shouldAnimate = defaultValue(description.shouldAnimate, true);

        /**
         * An {@link Event} that is fired whenever <code>tick</code>.
         */
        this.onTick = new Event();

        this._lastSystemTime = getTimestamp();
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     * tick should be called every frame, regardless of whether animation is taking place
     * or not.  To control animation, use the <code>shouldAnimate</code> property.
     * @memberof Clock
     *
     * @returns {JulianDate} The new value of the <code>currentTime</code> property.
     */
    Clock.prototype.tick = function() {
        var currentSystemTime = getTimestamp();
        var currentTime = this.currentTime;
        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var multiplier = this.multiplier;

        if (this.shouldAnimate) {
            if (this.clockStep === ClockStep.SYSTEM_CLOCK) {
                currentTime = new JulianDate();
            } else {
                if (this.clockStep === ClockStep.TICK_DEPENDENT) {
                    currentTime = currentTime.addSeconds(multiplier);
                } else {
                    var milliseconds = currentSystemTime - this._lastSystemTime;
                    currentTime = currentTime.addSeconds(multiplier * (milliseconds / 1000.0));
                }

                if (this.clockRange === ClockRange.CLAMPED) {
                    if (currentTime.lessThan(startTime)) {
                        currentTime = startTime;
                    } else if (currentTime.greaterThan(stopTime)) {
                        currentTime = stopTime;
                    }
                } else if (this.clockRange === ClockRange.LOOP_STOP) {
                    if (currentTime.lessThan(startTime)) {
                        currentTime = JulianDate.clone(startTime);
                    }
                    while (currentTime.greaterThan(stopTime)) {
                        currentTime = startTime.addSeconds(stopTime.getSecondsDifference(currentTime));
                    }
                }
            }
        }

        this.currentTime = currentTime;
        this._lastSystemTime = currentSystemTime;
        this.onTick.raiseEvent(this);
        return currentTime;
    };

    return Clock;
});
