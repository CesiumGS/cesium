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
         ko) {
    "use strict";

    //TODO: Set start/stop time together, validation.

    var ClockViewModel = function(clock) {
        clock = defaultValue(clock, new Clock());
        this.clock = clock;

        var startTime = ko.observable(clock.startTime);
        /**
         * The start time of the clock.
         * @type JulianDate
         */
        this.startTime = ko.computed({
            read : function() {
                return startTime();
            },
            write : function(value) {
                startTime(value);
                clock.startTime = value;
            },
            equalityComparer : JulianDate.equals
        });

        var stopTime = ko.observable(clock.stopTime);
        /**
         * The stop time of the clock.
         * @type JulianDate
         */
        this.stopTime = ko.computed({
            read : function() {
                return stopTime();
            },
            write : function(value) {
                clock.stopTime = value;
                stopTime(value);
            },
            equalityComparer : JulianDate.equals
        });

        var currentTime = ko.observable(clock.currentTime);
        /**
         * The current time.
         * @type JulianDate
         */
        this.currentTime = ko.computed({
            read : function() {
                return currentTime();
            },
            write : function(value) {
                clock.currentTime = value;
                currentTime(value);
            },
            equalityComparer : JulianDate.equals
        });

        /**
         * The system time.
         * @type JulianDate
         */
        this.systemTime = ko.observable(new JulianDate());

        var multiplier = ko.observable(clock.multiplier);
        /**
         * Determines how much time advances when tick is called, negative values allow for advancing backwards.
         * If <code>clockStep</code> is set to ClockStep.TICK_DEPENDENT this is the number of seconds to advance.
         * If <code>clockStep</code> is set to ClockStep.SYSTEM_CLOCK_DEPENDENT this value is multiplied by the
         * elapsed system time since the last call to tick.
         * @type Number
         */
        this.multiplier = ko.computed({
            read : function() {
                return multiplier();
            },
            write : function(value) {
                clock.multiplier = value;
                multiplier(value);
            }
        },this);

        var clockStep = ko.observable(clock.clockStep);
        /**
         * Determines if calls to <code>tick</code> are frame dependent or system clock dependent.
         * @type ClockStep
         */
        this.clockStep = ko.computed({
            read : function() {
                return clockStep();
            },
            write : function(value) {
                clockStep(value);
                clock.clockStep = value;
            }
        });

        var clockRange = ko.observable();
        /**
         * Determines how tick should behave when <code>startTime</code> or <code>stopTime</code> is reached.
         * @type ClockRange
         */
        this.clockRange = ko.computed({
            read : function() {
                clockRange();
                return clock.clockRange;
            },
            write : function(value) {
                clockRange(value);
                clock.clockRange = value;
            }
        });
    };

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