/*global defineSuite*/
defineSuite([
        'Core/Clock',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/JulianDate'
    ], function(
        Clock,
        ClockRange,
        ClockStep,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default parameters', function() {
        var clock = new Clock();
        expect(clock.stopTime).toEqual(JulianDate.addDays(clock.startTime, 1, new JulianDate()));
        expect(clock.startTime).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        expect(clock.clockRange).toEqual(ClockRange.UNBOUNDED);
        expect(clock.multiplier).toEqual(1.0);
    });

    it('constructor sets provided parameters correctly', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(112);
        var currentTime = new JulianDate(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no currentTime parameter', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(112);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no startTime parameter', function() {
        var stop = new JulianDate(112);
        var currentTime = new JulianDate(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.startTime).toEqual(clock.currentTime);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no start or stop time', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(13);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no start or current time', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(13);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            clockStep : step,
            multiplier : multiplier,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });


    it('constructor works with no current or stop time', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(13);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no stopTime parameter', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(13);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('Tick dependant clock step works animating forward.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(0.5);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Tick dependant clock step works animating backwards.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(0.5);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = -1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Tick dependant clock step works unbounded animating forward.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(1);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Tick dependant clock step works unbounded animating backwards.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(0);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Tick dependant clock loops animating forward.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(1);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(start, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Tick dependant clock step stops at start when animating backwards with ClockRange.LOOP_STOP.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);

        var currentTime = new JulianDate(0);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = -100.0;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });

        expect(clock.currentTime).toEqual(currentTime);
        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
    });

    it('Tick dependant clock step stops at end when animating forwards.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);

        var currentTime = new JulianDate(1);
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

        expect(clock.currentTime).toEqual(currentTime);
        expect(stop).toEqual(clock.tick());
        expect(stop).toEqual(clock.currentTime);
    });

    it('Ticks in real-time.', function() {
        //We can't numerically validate the real-time clock, but we
        //can at least make sure the code executes.
        var clock = new Clock({
            clockStep : ClockStep.SYSTEM_CLOCK
        });
        var time1 = JulianDate.clone(clock.tick());

        waitsFor(function() {
            var time2 = clock.tick();
            return JulianDate.greaterThan(time2, time1);
        });
    });

    it('Tick dependant clock step stops at start animating backwards.', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);

        var currentTime = new JulianDate(0);
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

        expect(clock.currentTime).toEqual(currentTime);
        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
    });

    it('throws if start time is after stop time.', function() {
        var start = new JulianDate(1);
        var stop = new JulianDate(0);
        expect(function() {
            return new Clock({
                startTime : start,
                stopTime : stop
            });
        }).toThrowDeveloperError();
    });

    it('system clock multiplier clock step works fine', function() {
        var clock = new Clock({
            clockStep : ClockStep.SYSTEM_CLOCK_MULTIPLIER
        });
        var time1 = JulianDate.clone(clock.tick());

        waitsFor(function() {
            var time2 = clock.tick();
            return JulianDate.greaterThan(time2, time1);
        });
    });

    it('clock does not advance if shouldAnimate is false and advances if true', function() {
        var clock = new Clock();
        var time1;
        var time2;

        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        var currentTime = clock.currentTime;
        clock.shouldAnimate = false;
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
        clock.shouldAnimate = true;
        time1 = JulianDate.clone(clock.tick());

        waitsFor(function() {
            time2 = clock.tick();
            return JulianDate.greaterThan(time2, time1);
        });

        runs(function() {
            clock.clockStep = ClockStep.SYSTEM_CLOCK;
            currentTime = clock.currentTime;
            clock.shouldAnimate = false;
            expect(currentTime).toEqual(clock.tick());
            expect(clock.currentTime).toEqual(currentTime);
            clock.shouldAnimate = true;
            time1 = JulianDate.clone(clock.tick());
        });

        waitsFor(function() {
            time2 = clock.tick();
            return JulianDate.greaterThan(time2, time1);
        });

        runs(function() {
            clock.clockStep = ClockStep.TICK_DEPENDENT;
            currentTime = JulianDate.clone(clock.currentTime);
            clock.shouldAnimate = false;
            expect(currentTime).toEqual(clock.tick());
            expect(clock.currentTime).toEqual(currentTime);
            clock.shouldAnimate = true;
            expect(JulianDate.greaterThan(clock.tick(), currentTime)).toEqual(true);
        });
    });
});
