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
     * @param {Object} [options] Object with the following properties:
     * @param {JulianDate} [options.startTime] The start time of the clock.
     * @param {JulianDate} [options.stopTime] The stop time of the clock.
     * @param {JulianDate} [options.currentTime] The current time.
     * @param {Number} [options.multiplier=1.0] Determines how much time advances when tick is called, negative values allow for advancing backwards.
     * @param {ClockStep} [options.clockStep=ClockStep.SYSTEM_CLOCK_MULTIPLIER] Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
     * @param {ClockRange} [options.clockRange=ClockRange.UNBOUNDED] Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
     * @param {Boolean} [options.canAnimate=true] Indicates whether tick can advance time.  This could be false if data is being buffered, for example.  The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
     * @param {Boolean} [options.shouldAnimate=true] Indicates whether tick should attempt to advance time.  The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
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
     *    startTime : Cesium.JulianDate.fromIso8601("2013-12-25"),
     *    currentTime : Cesium.JulianDate.fromIso8601("2013-12-25"),
     *    stopTime : Cesium.JulianDate.fromIso8601("2013-12-26"),
     *    clockRange : Cesium.ClockRange.LOOP_STOP,
     *    clockStep : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER
     * });
     */
    var Clock = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var startTime = options.startTime;
        var startTimeUndefined = !defined(startTime);

        var stopTime = options.stopTime;
        var stopTimeUndefined = !defined(stopTime);

        var currentTime = options.currentTime;
        var currentTimeUndefined = !defined(currentTime);

        if (startTimeUndefined && stopTimeUndefined && currentTimeUndefined) {
            currentTime = JulianDate.now();
            startTime = JulianDate.clone(currentTime);
            stopTime = JulianDate.addDays(currentTime, 1.0, new JulianDate());
        } else if (startTimeUndefined && stopTimeUndefined) {
            startTime = JulianDate.clone(currentTime);
            stopTime = JulianDate.addDays(currentTime, 1.0, new JulianDate());
        } else if (startTimeUndefined && currentTimeUndefined) {
            startTime = JulianDate.addDays(stopTime, -1.0, new JulianDate());
            currentTime = JulianDate.clone(startTime);
        } else if (currentTimeUndefined && stopTimeUndefined) {
            currentTime = JulianDate.clone(startTime);
            stopTime = JulianDate.addDays(startTime, 1.0, new JulianDate());
        } else if (currentTimeUndefined) {
            currentTime = JulianDate.clone(startTime);
        } else if (stopTimeUndefined) {
            stopTime = JulianDate.addDays(currentTime, 1.0, new JulianDate());
        } else if (startTimeUndefined) {
            startTime = JulianDate.clone(currentTime);
        }

        //>>includeStart('debug', pragmas.debug);
        if (JulianDate.greaterThan(startTime, stopTime)) {
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
        this.multiplier = defaultValue(options.multiplier, 1.0);

        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         * @default {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}
         */
        this.clockStep = defaultValue(options.clockStep, ClockStep.SYSTEM_CLOCK_MULTIPLIER);

        /**
         * Determines how the clock should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type {ClockRange}
         * @default {@link ClockRange.UNBOUNDED}
         */
        this.clockRange = defaultValue(options.clockRange, ClockRange.UNBOUNDED);

        /**
         * Indicates whether tick can advance time.  This could be false if data is being buffered,
         * for example.  The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
         * @type {Boolean}
         * @default true
         */
        this.canAnimate = defaultValue(options.canAnimate, true);

        /**
         * Indicates whether tick should attempt to advance time.
         * The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
         * @type {Boolean}
         * @default true
         */
        this.shouldAnimate = defaultValue(options.shouldAnimate, true);

        /**
         * An {@link Event} that is fired whenever <code>tick</code>.
         * @type {Event}
         */
        this.onTick = new Event();

        this._lastSystemTime = getTimestamp();
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     * tick should be called every frame, regardless of whether animation is taking place
     * or not.  To control animation, use the <code>shouldAnimate</code> property.
     *
     * @returns {JulianDate} The new value of the <code>currentTime</code> property.
     */
    Clock.prototype.tick = function() {
        var currentSystemTime = getTimestamp();
        var currentTime = JulianDate.clone(this.currentTime);
        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var multiplier = this.multiplier;

        if (this.canAnimate && this.shouldAnimate) {
            if (this.clockStep === ClockStep.SYSTEM_CLOCK) {
                currentTime = JulianDate.now(currentTime);
            } else {
                if (this.clockStep === ClockStep.TICK_DEPENDENT) {
                    currentTime = JulianDate.addSeconds(currentTime, multiplier, currentTime);
                } else {
                    var milliseconds = currentSystemTime - this._lastSystemTime;
                    currentTime = JulianDate.addSeconds(currentTime, multiplier * (milliseconds / 1000.0), currentTime);
                }

                if (this.clockRange === ClockRange.CLAMPED) {
                    if (JulianDate.lessThan(currentTime, startTime)) {
                        currentTime = JulianDate.clone(startTime, currentTime);
                    } else if (JulianDate.greaterThan(currentTime, stopTime)) {
                        currentTime = JulianDate.clone(stopTime, currentTime);
                    }
                } else if (this.clockRange === ClockRange.LOOP_STOP) {
                    if (JulianDate.lessThan(currentTime, startTime)) {
                        currentTime = JulianDate.clone(startTime, currentTime);
                    }
                    while (JulianDate.greaterThan(currentTime, stopTime)) {
                        currentTime = JulianDate.addSeconds(startTime, JulianDate.secondsDifference(currentTime, stopTime), currentTime);
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