/*global defineSuite*/
defineSuite([
             'Core/Clock',
             'Core/ClockStep',
             'Core/ClockRange',
             'Core/JulianDate'
            ], function(
              Clock,
              ClockStep,
              ClockRange,
              JulianDate) {
    "use strict";
    /*global it,expect*/

    it('constructor sets default parameters', function() {
        var clock = new Clock();
        expect(clock.stopTime.equals(clock.startTime.addDays(1))).toEqual(true);
        expect(clock.startTime.equals(clock.currentTime.addDays(-0.5))).toEqual(true);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_DEPENDENT);
        expect(clock.clockRange).toEqual(ClockRange.UNBOUNDED);
        expect(clock.multiplier).toEqual(1.0);
    });

    it('constructor sets provided parameters correctly', function() {
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(112);
        var currentTime = JulianDate.fromTotalDays(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(start.equals(clock.startTime)).toEqual(true);
        expect(stop.equals(clock.stopTime)).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('Tick dependant clock step works animating forward.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0.5);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step works animating backwards.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0.5);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
        var multiplier = -1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step works unbounded animating forward.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(1);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.UNBOUNDED;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step works unbounded animating backwards.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.UNBOUNDED;
        var multiplier = -1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock loops animating forward.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(1);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = start.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step loops animating backwards.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
        var multiplier = -1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = stop.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime.equals(clock.tick())).toEqual(true);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step stops at end when animating .', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);

        var currentTime = JulianDate.fromTotalDays(1);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.CLAMPED;
        var multiplier = 100.0;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });

        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        expect(stop.equals(clock.tick())).toEqual(true);
        expect(stop.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick dependant clock step stops at start animating backwards.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);

        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.CLAMPED;
        var multiplier = -100.0;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });

        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        expect(start.equals(clock.tick())).toEqual(true);
        expect(start.equals(clock.currentTime)).toEqual(true);
    });

    it('Tick followed by tickReverse gets you back to the same time.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.UNBOUNDED;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });

        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        currentTime = currentTime.addSeconds(multiplier);
        clock.tick();
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        clock.reverseTick();
        currentTime = currentTime.addSeconds(-multiplier);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('Passing parameter to tick ticks that many seconds.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.SYSTEM_CLOCK_DEPENDENT;
        var range = ClockRange.UNBOUNDED;
        var multiplier = 10000;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });

        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        currentTime = currentTime.addSeconds(5);
        clock.tick(5);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
        clock.tick(-5);
        currentTime = currentTime.addSeconds(-5);
        expect(currentTime.equals(clock.currentTime)).toEqual(true);
    });

    it('throws if start time is after stop time.', function() {
        var start = JulianDate.fromTotalDays(1);
        var stop = JulianDate.fromTotalDays(0);
        expect(function() {
            return new Clock({
                startTime : start,
                stopTime : stop
            });
        }).toThrow();
    });
});
