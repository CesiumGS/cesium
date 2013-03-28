/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Clock',
        '../Core/JulianDate',
        '../ThirdParty/knockout'
        ], function(
         DeveloperError,
         defaultValue,
         Clock,
         JulianDate,
         knockout) {
    "use strict";

    /**
     * A ViewModel which exposes a {@link Clock} for user interfaces.
     * @alias ClockViewModel
     * @constructor
     *
     * @param {Clock} [clock] The clock object wrapped by this view model, if undefined a new instance will be created.
     *
     * @see Clock
     */
    var ClockViewModel = function(clock) {
        clock = defaultValue(clock, new Clock());
        this.clock = clock;
        this.clock.onTick.addEventListener(this.synchronize, this);

        var startTime = knockout.observable(clock.startTime);
        startTime.equalityComparer = JulianDate.equals;

        /**
         * The start time of the clock.
         * @type Observable
         */
        this.startTime = knockout.computed({
            read : startTime,
            write : function(value) {
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
        this.stopTime = knockout.computed({
            read : stopTime,
            write : function(value) {
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
        this.currentTime = knockout.computed({
            read : currentTime,
            write : function(value) {
                clock.currentTime = value;
                currentTime(value);
            }
        });

        /**
         * The current system time.
         * @type Observable
         */
        this.systemTime = knockout.observable(new JulianDate());
        this.systemTime.equalityComparer = JulianDate.equals;

        var multiplier = knockout.observable(clock.multiplier);
        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * Computed observable @type Number
         * @type Observable
         */
        this.multiplier = knockout.computed({
            read : multiplier,
            write : function(value) {
                clock.multiplier = value;
                multiplier(value);
            }
        }, this);

        var clockStep = knockout.observable(clock.clockStep);
        clockStep.equalityComparer = function(a, b) {
            return a === b;
        };

        /**
         * Determines if calls to <code>Clock.tick</code> are frame dependent or system clock dependent.
         * @type Observable
         */
        this.clockStep = knockout.computed({
            read : clockStep,
            write : function(value) {
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
         * @type Observable
         */
        this.clockRange = knockout.computed({
            read : clockRange,
            write : function(value) {
                clockRange(value);
                clock.clockRange = value;
            }
        });

        var shouldAnimate = knockout.observable(clock.shouldAnimate);

        /**
         * Determines if <code>Clock.tick</code> should actually advance time.
         * @type Observable
         */
        this.shouldAnimate = knockout.computed({
            read : shouldAnimate,
            write : function(value) {
                shouldAnimate(value);
                clock.shouldAnimate = value;
            }
        });
    };

    /**
     * Updates the view model with the contents of the underlying clock.
     * Can be called to force an update of the viewModel if the underlying
     * clock has changed and <code>Clock.tick</code> has not yet been called.
     * @memberof ClockViewModel
     */
     ClockViewModel.prototype.synchronize = function() {
        var clock = this.clock;

        var startTime = clock.startTime;
        var stopTime = clock.stopTime;
        var currentTime = clock.currentTime;
        var multiplier = clock.multiplier;
        var clockStep = clock.clockStep;
        var clockRange = clock.clockRange;
        var shouldAnimate = clock.shouldAnimate;

        this.systemTime(new JulianDate());
        this.startTime(startTime);
        this.stopTime(stopTime);
        this.currentTime(currentTime);
        this.multiplier(multiplier);
        this.clockStep(clockStep);
        this.clockRange(clockRange);
        this.shouldAnimate(shouldAnimate);
    };

    return ClockViewModel;
});