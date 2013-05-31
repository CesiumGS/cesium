/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Clock',
        '../Core/JulianDate',
        '../ThirdParty/knockout'
    ], function(
        defaultValue,
        Clock,
        JulianDate,
        knockout) {
    "use strict";

    /**
     * A view model which exposes a {@link Clock} for user interfaces.
     * @alias ClockViewModel
     * @constructor
     *
     * @param {Clock} [clock] The clock object wrapped by this view model, if undefined a new instance will be created.
     *
     * @see Clock
     */
    var ClockViewModel = function(clock) {
        clock = defaultValue(clock, new Clock());
        this._clock = clock;
        this._clock.onTick.addEventListener(this.synchronize, this);

        var startTime = knockout.observable(clock.startTime);
        startTime.equalityComparer = JulianDate.equals;

        /**
         * Gets the current system time.
         * @type JulianDate
         */
        this.systemTime = knockout.observable(new JulianDate());
        this.systemTime.equalityComparer = JulianDate.equals;

        knockout.track(this, ['systemTime']);

        /**
         * The start time of the clock.
         * @type Observable
         */
        this.startTime = undefined;
        knockout.defineProperty(this, 'startTime', {
            get : startTime,
            set : function(value) {
                startTime(value);
                clock.startTime = value;
            }
        });

        var stopTime = knockout.observable(clock.stopTime);
        stopTime.equalityComparer = JulianDate.equals;

        /**
         * The stop time of the clock.
         * @type Observable
         */
        this.stopTime = undefined;
        knockout.defineProperty(this, 'stopTime', {
            get : stopTime,
            set : function(value) {
                clock.stopTime = value;
                stopTime(value);
            }
        });

        var currentTime = knockout.observable(clock.currentTime);
        currentTime.equalityComparer = JulianDate.equals;

        /**
         * The current time.
         * @type Observable
         */
        this.currentTime = undefined;
        knockout.defineProperty(this, 'currentTime', {
            get : currentTime,
            set : function(value) {
                clock.currentTime = value;
                currentTime(value);
            }
        });

        var multiplier = knockout.observable(clock.multiplier);
        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * Computed observable @type Number
         * @type Observable
         */
        this.multiplier = undefined;
        knockout.defineProperty(this, 'multiplier', {
            get : multiplier,
            set : function(value) {
                clock.multiplier = value;
                multiplier(value);
            }
        });

        var clockStep = knockout.observable(clock.clockStep);
        clockStep.equalityComparer = function(a, b) {
            return a === b;
        };

        /**
         * Determines if calls to <code>Clock.tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         */
        this.clockStep = undefined;
        knockout.defineProperty(this, 'clockStep', {
            get : clockStep,
            set : function(value) {
                clockStep(value);
                clock.clockStep = value;
            }
        });

        var clockRange = knockout.observable(clock.clockRange);
        clockRange.equalityComparer = function(a, b) {
            return a === b;
        };

        /**
         * Determines how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * Computed observable @type ClockRange
         * @type ClockRange
         */
        this.clockRange = undefined;
        knockout.defineProperty(this, 'clockRange', {
            get : clockRange,
            set : function(value) {
                clockRange(value);
                clock.clockRange = value;
            }
        });

        var shouldAnimate = knockout.observable(clock.shouldAnimate);

        /**
         * Gets or sets whether or not <code>Clock.tick</code> should actually advance time.
         * @type Boolean
         */
        this.shouldAnimate = undefined;
        knockout.defineProperty(this, 'shouldAnimate', {
            get : shouldAnimate,
            set : function(value) {
                shouldAnimate(value);
                clock.shouldAnimate = value;
            }
        });
    };

    Object.defineProperties(ClockViewModel.prototype, {
        /**
         * Gets the underlying Clock.
         * @memberof ClockViewModel.prototype
         *
         * @type {Clock}
         */
        clock : {
            get : function() {
                return this._clock;
            }
        }
    });

    /**
     * Updates the view model with the contents of the underlying clock.
     * Can be called to force an update of the viewModel if the underlying
     * clock has changed and <code>Clock.tick</code> has not yet been called.
     * @memberof ClockViewModel
     */
     ClockViewModel.prototype.synchronize = function() {
        var clock = this._clock;

        var startTime = clock.startTime;
        var stopTime = clock.stopTime;
        var currentTime = clock.currentTime;
        var multiplier = clock.multiplier;
        var clockStep = clock.clockStep;
        var clockRange = clock.clockRange;
        var shouldAnimate = clock.shouldAnimate;

        this.systemTime = new JulianDate();
        this.startTime = startTime;
        this.stopTime = stopTime;
        this.currentTime = currentTime;
        this.multiplier = multiplier;
        this.clockStep = clockStep;
        this.clockRange = clockRange;
        this.shouldAnimate = shouldAnimate;
    };

    return ClockViewModel;
});