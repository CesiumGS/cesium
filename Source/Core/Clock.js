/*global define*/
define(['Core/JulianDate',
        'Core/ClockStep',
        'Core/ClockRange'],
function(JulianDate,
        ClockStep,
        ClockRange) {
    "use strict";

    var Clock = function(startTime, stopTime, currentTime, clockStep, clockRange, multiplier) {
        this.startTime = startTime || new JulianDate();

        this.stopTime = stopTime || this.startTime.addDays(1);

        this.currentTime = currentTime || this.startTime;

        this.clockStep = clockStep || ClockStep.SYSTEM_CLOCK;

        this.clockRange = clockRange || ClockRange.UNBOUNDED;

        this.multiplier = multiplier || 1;

        this._lastCpuTime = new Date().getTime();

        this._lastCurrentTime = currentTime;
    };

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
            if (this.clockStep === ClockStep.FRAME_DEPENDANT) {
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
                currentTime = stopTime.addSeconds(startTime.secondsDifference(currentTime));
            }
            while (currentTime.greaterThan(stopTime)) {
                currentTime = startTime.addSeconds(stopTime.secondsDifference(currentTime));
            }
        }

        this.currentTime = this._lastCurrentTime = currentTime;
        this._lastCpuTime = currentCpuTime;
    };

    return Clock;
});