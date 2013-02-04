/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/Clock',
        '../Core/JulianDate',
        '../ThirdParty/knockout-2.2.1'
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

        var startTime = knockout.observable(clock.startTime);
        /**
         * The start time of the clock.
         * @type Computed observable JulianDate
         */
        this.startTime = knockout.computed({
            read : startTime,
            write : function(value) {
                startTime(value);
                clock.startTime = value;
            },
            equalityComparer : JulianDate.equals
        });

        var stopTime = knockout.observable(clock.stopTime);
        /**
         * The stop time of the clock.
         * Computed observable @type JulianDate
         */
        this.stopTime = knockout.computed({
            read : stopTime,
            write : function(value) {
                clock.stopTime = value;
                stopTime(value);
            },
            equalityComparer : JulianDate.equals
        });

        var currentTime = knockout.observable(clock.currentTime);
        /**
         * The current time.
         * Computed observable @type JulianDate
         */
        this.currentTime = knockout.computed({
            read : currentTime,
            write : function(value) {
                clock.currentTime = value;
                currentTime(value);
            },
            equalityComparer : JulianDate.equals
        });

        /**
         * The current system time.
         * Computed observable @type JulianDate
         */
        this.systemTime = knockout.observable(new JulianDate());

        var multiplier = knockout.observable(clock.multiplier);
        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_MULTIPLIER this value is multiplied by the
         * elapsed system time since the last call to tick.
         * Computed observable @type Number
         */
        this.multiplier = knockout.computed({
            read : multiplier,
            write : function(value) {
                clock.multiplier = value;
                multiplier(value);
            }
        }, this);

        var clockStep = knockout.observable(clock.clockStep);
        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * Computed observable @type ClockStep
         */
        this.clockStep = knockout.computed({
            read : clockStep,
            write : function(value) {
                clockStep(value);
                clock.clockStep = value;
            }
        });

        var clockRange = knockout.observable();
        /**
         * Determines how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * Computed observable @type ClockRange
         */
        this.clockRange = knockout.computed({
            read : clockRange,
            write : function(value) {
                clockRange(value);
                clock.clockRange = value;
            }
        });
    };

    /**
     * Updates the view model with the contents of the underlying clock.
     * @memberof ClockViewModel
     */
     ClockViewModel.prototype.update = function() {
        var clock = this.clock;
        this.systemTime(new JulianDate());
        this.startTime(clock.startTime);
        this.stopTime(clock.stopTime);
        this.currentTime(clock.currentTime);
        this.multiplier(clock.multiplier);
        this.clockStep(clock.clockStep);
        this.clockRange(clock.clockRange);
    };

    return ClockViewModel;
});