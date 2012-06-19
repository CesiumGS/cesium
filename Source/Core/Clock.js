/*global define*/
define([
        './JulianDate',
        './ClockStep',
        './ClockRange',
        './TimeStandard'
    ], function(
        JulianDate,
        ClockStep,
        ClockRange,
        TimeStandard) {
    "use strict";

    /**
     * Constants related to the behavior of Clock.tick().
     *
     * @name Clock
     *
     * @param {JulianDate} [startTime=new JulianDate()] The start time of the clock.
     * @param {JulianDate} [stopTime=startTime.addDays(1)] The stop time of the clock.
     * @param {JulianDate} [currentTime=startTime] The current time of the clock.
     * @param {ClockStep} [clockStep=ClockStep.SYSTEM_CLOCK_DEPENDENT] Determines how Clock.tick() advances the currentTime.
     * @param {ClockRange} [clockRange=ClockRange.UNBOUNDED] Determines the behavior of Clock.tick() when the start or stop time is reached.
     * @param {Number} [multiplier=1.0] Determines how fast the clock should animate, negative values allow for animating backwards.
     *
     * @constructor
     *
     * @see ClockStep
     * @see ClockRange
     */
    var Clock = function(startTime, stopTime, currentTime, clockStep, clockRange, multiplier) {
        /**
         * The start time of the clock.
         */
        this.startTime = startTime || new JulianDate();
        this.startTime = TimeStandard.convertUtcToTai(this.startTime);

        /**
         * The stop time of the clock.
         */
        this.stopTime = stopTime || this.startTime.addDays(1);
        this.stopTime = TimeStandard.convertUtcToTai(this.stopTime);

        /**
         * The current time of the clock.
         */
        this.currentTime = currentTime || this.startTime;
        this.currentTime = this._lastCurrentTime = TimeStandard.convertUtcToTai(this.currentTime);

        /**
         * Determines how Clock.tick() advances the currentTime.
         */
        this.clockStep = clockStep || ClockStep.SYSTEM_CLOCK_DEPENDENT;

        /**
         * Determines the behavior of Clock.tick() when the start or stop time is reached.
         */
        this.clockRange = clockRange || ClockRange.UNBOUNDED;

        /**
         * Determines how fast the clock should animate, negative values allow for animating backwards.
         * For ClockStep.TICK_DEPENDENT this is the number of seconds for each tick.
         * For ClockStep.SYSTEM_CLOCK_DEPENDENT this value is multiplied by the elapsed system time
         * between each tick.
         */
        this.multiplier = multiplier || 1.0;

        this._lastCpuTime = new Date().getTime();
    };

    /**
     * Advances the clock from the currentTime based on the current configuration options.
     *
     * @returns {JulianDate}
     */
    Clock.prototype.tick = function() {
        var startTime = this.startTime;
        var stopTime = this.stopTime;
        var currentTime = this.currentTime;
        var currentCpuTime = new Date().getTime();

        //If the user changed currentTime himself,
        //Don't update the time on this tick, instead
        //this tick indicates the user time is now
        //the current time.
        if (this._lastCurrentTime === currentTime) {
            if (this.clockStep === ClockStep.TICK_DEPENDENT) {
                currentTime = currentTime.addSeconds(this.multiplier);
            } else {
                var milliseconds = currentCpuTime - this._lastCpuTime;
                currentTime = currentTime.addSeconds(this.multiplier * (milliseconds / 1000.0));
            }
        }

        if (this.clockRange === ClockRange.CLAMPED) {
            if (currentTime.lessThan(startTime)) {
                currentTime = startTime;
            } else if (currentTime.greaterThan(stopTime)) {
                currentTime = stopTime;
            }
        } else if (this.clockRange === ClockRange.LOOP) {
            while (currentTime.lessThan(startTime)) {
                currentTime = stopTime.addSeconds(startTime.getSecondsDifference(currentTime));
            }
            while (currentTime.greaterThan(stopTime)) {
                currentTime = startTime.addSeconds(stopTime.getSecondsDifference(currentTime));
            }
        }

        this.currentTime = this._lastCurrentTime = currentTime;
        this._lastCpuTime = currentCpuTime;
        return currentTime;
    };

    return Clock;
});