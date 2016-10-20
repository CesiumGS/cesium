/*global define*/
define([
        './ClockRange',
        './ClockStep',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Event',
        './getTimestamp',
        './JulianDate'
    ], function(
        ClockRange,
        ClockStep,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        getTimestamp,
        JulianDate) {
    'use strict';

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
     * @param {Number} [options.multiplier=1.0] Determines how much time advances when {@link Clock#tick} is called, negative values allow for advancing backwards.
     * @param {ClockStep} [options.clockStep=ClockStep.SYSTEM_CLOCK_MULTIPLIER] Determines if calls to {@link Clock#tick} are frame dependent or system clock dependent.
     * @param {ClockRange} [options.clockRange=ClockRange.UNBOUNDED] Determines how the clock should behave when {@link Clock#startTime} or {@link Clock#stopTime} is reached.
     * @param {Boolean} [options.canAnimate=true] Indicates whether {@link Clock#tick} can advance time.  This could be false if data is being buffered, for example.  The clock will only tick when both {@link Clock#canAnimate} and {@link Clock#shouldAnimate} are true.
     * @param {Boolean} [options.shouldAnimate=true] Indicates whether {@link Clock#tick} should attempt to advance time.  The clock will only tick when both {@link Clock#canAnimate} and {@link Clock#shouldAnimate} are true.
     *
     * @exception {DeveloperError} startTime must come before stopTime.
     *
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
     *
     * @see ClockStep
     * @see ClockRange
     * @see JulianDate
     */
    function Clock(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var currentTime = options.currentTime;
        var startTime = options.startTime;
        var stopTime = options.stopTime;

        if (!defined(currentTime)) {
            // if not specified, current time is the start time,
            // or if that is not specified, 1 day before the stop time,
            // or if that is not specified, then now.
            if (defined(startTime)) {
                currentTime = JulianDate.clone(startTime);
            } else if (defined(stopTime)) {
                currentTime = JulianDate.addDays(stopTime, -1.0, new JulianDate());
            } else {
                currentTime = JulianDate.now();
            }
        } else {
            currentTime = JulianDate.clone(currentTime);
        }

        if (!defined(startTime)) {
            // if not specified, start time is the current time
            // (as determined above)
            startTime = JulianDate.clone(currentTime);
        } else {
            startTime = JulianDate.clone(startTime);
        }

        if (!defined(stopTime)) {
            // if not specified, stop time is 1 day after the start time
            // (as determined above)
            stopTime = JulianDate.addDays(startTime, 1.0, new JulianDate());
        } else {
            stopTime = JulianDate.clone(stopTime);
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
         * Determines how the clock should behave when
         * {@link Clock#startTime} or {@link Clock#stopTime}
         * is reached.
         * @type {ClockRange}
         * @default {@link ClockRange.UNBOUNDED}
         */
        this.clockRange = defaultValue(options.clockRange, ClockRange.UNBOUNDED);

        /**
         * Indicates whether {@link Clock#tick} can advance time.  This could be false if data is being buffered,
         * for example.  The clock will only advance time when both
         * {@link Clock#canAnimate} and {@link Clock#shouldAnimate} are true.
         * @type {Boolean}
         * @default true
         */
        this.canAnimate = defaultValue(options.canAnimate, true);

        /**
         * An {@link Event} that is fired whenever {@link Clock#tick} is called.
         * @type {Event}
         */
        this.onTick = new Event();

        this._currentTime = undefined;
        this._multiplier = undefined;
        this._clockStep = undefined;
        this._shouldAnimate = undefined;
        this._lastSystemTime = getTimestamp();

        // set values using the property setters to
        // make values consistent.

        this.currentTime = currentTime;
        this.multiplier = defaultValue(options.multiplier, 1.0);
        this.clockStep = defaultValue(options.clockStep, ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        this.shouldAnimate = defaultValue(options.shouldAnimate, true);
    }

    defineProperties(Clock.prototype, {
        /**
         * The current time.
         * Changing this property will change
         * {@link Clock#clockStep} from {@link ClockStep.SYSTEM_CLOCK} to
         * {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}.
         * @memberof Clock.prototype
         * @type {JulianDate}
         */
        currentTime : {
            get : function() {
                return this._currentTime;
            },
            set : function(value) {
                if (JulianDate.equals(this._currentTime, value)) {
                    return;
                }

                if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
                    this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                }

                this._currentTime = value;
            }
        },

        /**
         * Gets or sets how much time advances when {@link Clock#tick} is called. Negative values allow for advancing backwards.
         * If {@link Clock#clockStep} is set to {@link ClockStep.TICK_DEPENDENT}, this is the number of seconds to advance.
         * If {@link Clock#clockStep} is set to {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}, this value is multiplied by the
         * elapsed system time since the last call to {@link Clock#tick}.
         * Changing this property will change
         * {@link Clock#clockStep} from {@link ClockStep.SYSTEM_CLOCK} to
         * {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}.
         * @memberof Clock.prototype
         * @type {Number}
         * @default 1.0
         */
        multiplier : {
            get : function() {
                return this._multiplier;
            },
            set : function(value) {
                if (this._multiplier === value) {
                    return;
                }

                if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
                    this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                }

                this._multiplier = value;
            }
        },

        /**
         * Determines if calls to {@link Clock#tick} are frame dependent or system clock dependent.
         * Changing this property to {@link ClockStep.SYSTEM_CLOCK} will set
         * {@link Clock#multiplier} to 1.0, {@link Clock#shouldAnimate} to true, and
         * {@link Clock#currentTime} to the current system clock time.
         * @memberof Clock.prototype
         * @type ClockStep
         * @default {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}
         */
        clockStep : {
            get : function() {
                return this._clockStep;
            },
            set : function(value) {
                if (value === ClockStep.SYSTEM_CLOCK) {
                    this._multiplier = 1.0;
                    this._shouldAnimate = true;
                    this._currentTime = JulianDate.now();
                }

                this._clockStep = value;
            }
        },


        /**
         * Indicates whether {@link Clock#tick} should attempt to advance time.
         * The clock will only advance time when both
         * {@link Clock#canAnimate} and {@link Clock#shouldAnimate} are true.
         * Changing this property will change
         * {@link Clock#clockStep} from {@link ClockStep.SYSTEM_CLOCK} to
         * {@link ClockStep.SYSTEM_CLOCK_MULTIPLIER}.
         * @memberof Clock.prototype
         * @type {Boolean}
         * @default true
         */
        shouldAnimate : {
            get : function() {
                return this._shouldAnimate;
            },
            set : function(value) {
                if (this._shouldAnimate === value) {
                    return;
                }

                if (this._clockStep === ClockStep.SYSTEM_CLOCK) {
                    this._clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
                }

                this._shouldAnimate = value;
            }
        }
    });

    /**
     * Advances the clock from the current time based on the current configuration options.
     * tick should be called every frame, regardless of whether animation is taking place
     * or not.  To control animation, use the {@link Clock#shouldAnimate} property.
     *
     * @returns {JulianDate} The new value of the {@link Clock#currentTime} property.
     */
    Clock.prototype.tick = function() {
        var currentSystemTime = getTimestamp();
        var currentTime = JulianDate.clone(this._currentTime);

        if (this.canAnimate && this._shouldAnimate) {
            var clockStep = this._clockStep;
            if (clockStep === ClockStep.SYSTEM_CLOCK) {
                currentTime = JulianDate.now(currentTime);
            } else {
                var multiplier = this._multiplier;

                if (clockStep === ClockStep.TICK_DEPENDENT) {
                    currentTime = JulianDate.addSeconds(currentTime, multiplier, currentTime);
                } else {
                    var milliseconds = currentSystemTime - this._lastSystemTime;
                    currentTime = JulianDate.addSeconds(currentTime, multiplier * (milliseconds / 1000.0), currentTime);
                }

                var clockRange = this.clockRange;
                var startTime = this.startTime;
                var stopTime = this.stopTime;

                if (clockRange === ClockRange.CLAMPED) {
                    if (JulianDate.lessThan(currentTime, startTime)) {
                        currentTime = JulianDate.clone(startTime, currentTime);
                    } else if (JulianDate.greaterThan(currentTime, stopTime)) {
                        currentTime = JulianDate.clone(stopTime, currentTime);
                    }
                } else if (clockRange === ClockRange.LOOP_STOP) {
                    if (JulianDate.lessThan(currentTime, startTime)) {
                        currentTime = JulianDate.clone(startTime, currentTime);
                    }
                    while (JulianDate.greaterThan(currentTime, stopTime)) {
                        currentTime = JulianDate.addSeconds(startTime, JulianDate.secondsDifference(currentTime, stopTime), currentTime);
                    }
                }
            }
        }

        this._currentTime = currentTime;
        this._lastSystemTime = currentSystemTime;
        this.onTick.raiseEvent(this);
        return currentTime;
    };

    return Clock;
});
