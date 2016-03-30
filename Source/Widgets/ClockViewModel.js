/*global define*/
define([
        '../Core/Clock',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/EventHelper',
        '../Core/JulianDate',
        '../ThirdParty/knockout'
    ], function(
        Clock,
        defined,
        defineProperties,
        destroyObject,
        EventHelper,
        JulianDate,
        knockout) {
    'use strict';

    /**
     * A view model which exposes a {@link Clock} for user interfaces.
     * @alias ClockViewModel
     * @constructor
     *
     * @param {Clock} [clock] The clock object wrapped by this view model, if undefined a new instance will be created.
     *
     * @see Clock
     */
    function ClockViewModel(clock) {
        if (!defined(clock)) {
            clock = new Clock();
        }
        this._clock = clock;

        this._eventHelper = new EventHelper();
        this._eventHelper.add(clock.onTick, this.synchronize, this);

        var startTime = knockout.observable(clock.startTime);
        startTime.equalityComparer = JulianDate.equals;

        /**
         * Gets the current system time.  This property is observable.
         * @type {JulianDate}
         * @default JulianDate()
         */
        this.systemTime = knockout.observable(JulianDate.now());
        this.systemTime.equalityComparer = JulianDate.equals;

        knockout.track(this, ['systemTime']);

        /**
         * Gets or sets the start time of the clock.  This property is observable.
         * @type {JulianDate}
         * @default undefined
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
         * Gets or sets the stop time of the clock.  This property is observable.
         * @type {JulianDate}
         * @default undefined
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
         * Gets or sets the current time.  This property is observable.
         * @type {JulianDate}
         * @default undefined
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
         * Gets or sets how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.  This property is observable.
         * @type {Number}
         * @default undefined
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
         * Gets or sets whether calls to <code>Clock.tick</code> are frame dependent or system clock dependent.
         * This property is observable.
         * @type {ClockStep}
         * @default undefined
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
         * Gets or sets how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * This property is observable.
         * @type {ClockRange}
         * @default undefined
         */
        this.clockRange = undefined;
        knockout.defineProperty(this, 'clockRange', {
            get : clockRange,
            set : function(value) {
                clockRange(value);
                clock.clockRange = value;
            }
        });

        var canAnimate = knockout.observable(clock.canAnimate);

        /**
         * Gets or sets whether or not <code>Clock.tick</code> can advance time.
         * This could be false if data is being buffered, for example.
         * The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
         * This property is observable.
         * @type {Boolean}
         * @default undefined
         */
        this.canAnimate = undefined;
        knockout.defineProperty(this, 'canAnimate', {
            get : canAnimate,
            set : function(value) {
                canAnimate(value);
                clock.canAnimate = value;
            }
        });

        var shouldAnimate = knockout.observable(clock.shouldAnimate);

        /**
         * Gets or sets whether or not <code>Clock.tick</code> should attempt to advance time.
         * The clock will only tick when both <code>canAnimate</code> and <code>shouldAnimate</code> are true.
         * This property is observable.
         * @type {Boolean}
         * @default undefined
         */
        this.shouldAnimate = undefined;
        knockout.defineProperty(this, 'shouldAnimate', {
            get : shouldAnimate,
            set : function(value) {
                shouldAnimate(value);
                clock.shouldAnimate = value;
            }
        });
    }

    defineProperties(ClockViewModel.prototype, {
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
     */
    ClockViewModel.prototype.synchronize = function() {
        var clock = this._clock;

        var startTime = clock.startTime;
        var stopTime = clock.stopTime;
        var currentTime = clock.currentTime;
        var multiplier = clock.multiplier;
        var clockStep = clock.clockStep;
        var clockRange = clock.clockRange;
        var canAnimate = clock.canAnimate;
        var shouldAnimate = clock.shouldAnimate;

        this.systemTime = JulianDate.now();
        this.startTime = startTime;
        this.stopTime = stopTime;
        this.currentTime = currentTime;
        this.multiplier = multiplier;
        this.clockStep = clockStep;
        this.clockRange = clockRange;
        this.canAnimate = canAnimate;
        this.shouldAnimate = shouldAnimate;
    };

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    ClockViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    ClockViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();

        destroyObject(this);
    };

    return ClockViewModel;
});
