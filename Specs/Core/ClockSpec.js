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
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets default parameters', function() {
        var clock = new Clock();
        expect(clock.stopTime).toEqual(clock.startTime.addDays(1));
        expect(clock.startTime).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SPEED_MULTIPLIER);
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
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
    });

    it('constructor works with no currentTime parameter', function() {
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(112);
        var currentTime = JulianDate.fromTotalDays(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        var stop = JulianDate.fromTotalDays(112);
        var currentTime = JulianDate.fromTotalDays(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(13);
        var currentTime = JulianDate.fromTotalDays(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(13);
        var currentTime = JulianDate.fromTotalDays(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(13);
        var currentTime = JulianDate.fromTotalDays(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        var start = JulianDate.fromTotalDays(12);
        var stop = JulianDate.fromTotalDays(13);
        var currentTime = JulianDate.fromTotalDays(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP;
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = start.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.isOutOfRange()).toEqual(false);
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
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = stop.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = currentTime.addSeconds(multiplier);
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.isOutOfRange()).toEqual(false);
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

        expect(clock.currentTime).toEqual(currentTime);
        expect(stop).toEqual(clock.tick());
        expect(stop).toEqual(clock.currentTime);
        expect(clock.isOutOfRange()).toEqual(true);
    });

    it('Ticks in real-time mode.', function() {
        //We can't numerically validate the real-time clock, but we
        //can at least make sure the code executes.
        var clock = new Clock({
            clockStep : ClockStep.SYSTEM_CLOCK_TIME
        });
        var time1 = clock.tick();

        waitsFor(function() {
            var time2 = clock.tick();
            return time2.greaterThan(time1);
        });
    });

    it('Ticks in SPEED_MULTIPLIER mode.', function() {
        //We can't numerically validate the non-fixed tick size clock, but we
        //can at least make sure the code executes.
        var clock = new Clock({
            clockStep : ClockStep.SPEED_MULTIPLIER
        });
        var time1 = clock.tick();

        waitsFor(function() {
            var time2 = clock.tick();
            return time2.greaterThan(time1);
        });
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

        expect(clock.currentTime).toEqual(currentTime);
        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
        expect(clock.isOutOfRange()).toEqual(true);
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

        expect(clock.currentTime).toEqual(currentTime);
        currentTime = currentTime.addSeconds(multiplier);
        clock.tick();
        expect(clock.currentTime).toEqual(currentTime);
        clock.reverseTick();
        currentTime = currentTime.addSeconds(-multiplier);
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Passing parameter to tick ticks that many seconds.', function() {
        var start = JulianDate.fromTotalDays(0);
        var stop = JulianDate.fromTotalDays(1);
        var currentTime = JulianDate.fromTotalDays(0);
        var step = ClockStep.SPEED_MULTIPLIER;
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

        expect(clock.currentTime).toEqual(currentTime);
        currentTime = currentTime.addSeconds(5);
        clock.tick(5);
        expect(clock.currentTime).toEqual(currentTime);
        clock.tick(-5);
        currentTime = currentTime.addSeconds(-5);
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('Realtime clock with CLAMPED waits at start time without entering pause mode.', function() {
        var currentTime = new JulianDate();
        var start = currentTime.addSeconds(3600);
        var stop = currentTime.addSeconds(4800);
        var step = ClockStep.SYSTEM_CLOCK_TIME;
        var range = ClockRange.CLAMPED;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);

        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);
        expect(clock.isOutOfRange()).toEqual(false);
    });

    it('Realtime clock with CLAMPED pauses at end time.', function() {
        var currentTime = new JulianDate();
        var start = currentTime.addSeconds(-4800);
        var stop = currentTime.addSeconds(-3600);
        var step = ClockStep.SYSTEM_CLOCK_TIME;
        var range = ClockRange.CLAMPED;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);

        expect(stop).toEqual(clock.tick());
        expect(stop).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SPEED_MULTIPLIER);
        expect(clock.isOutOfRange()).toEqual(true);
    });

    it('Realtime clock with LOOP waits at start time without entering pause mode.', function() {
        var currentTime = new JulianDate();
        var start = currentTime.addSeconds(3600);
        var stop = currentTime.addSeconds(4800);
        var step = ClockStep.SYSTEM_CLOCK_TIME;
        var range = ClockRange.LOOP;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);

        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);
        expect(clock.isOutOfRange()).toEqual(false);
    });

    it('Realtime clock with LOOP loops at end time.', function() {
        var currentTime = new JulianDate();
        var start = currentTime.addSeconds(-4800);
        var stop = currentTime.addSeconds(-3600);
        var step = ClockStep.SYSTEM_CLOCK_TIME;
        var range = ClockRange.LOOP;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_TIME);

        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
        expect(clock.clockStep).toEqual(ClockStep.SPEED_MULTIPLIER);
        expect(clock.isOutOfRange()).toEqual(false);
    });

    it('isSystemTimeAvailable works.', function() {
        var currentTime = new JulianDate();
        var start = currentTime.addSeconds(-4800);
        var stop = currentTime.addSeconds(-3600);
        var step = ClockStep.SPEED_MULTIPLIER;
        var range = ClockRange.UNBOUNDED;
        var clock = new Clock({
            currentTime : currentTime,
            clockStep : step,
            startTime : start,
            stopTime : stop,
            clockRange : range
        });
        expect(clock.isSystemTimeAvailable()).toEqual(true);
        clock.clockRange = ClockRange.LOOP;
        expect(clock.isSystemTimeAvailable()).toEqual(false);
        clock.clockRange = ClockRange.CLAMPED;
        expect(clock.isSystemTimeAvailable()).toEqual(false);
        clock.stopTime = currentTime.addSeconds(4800);
        expect(clock.isSystemTimeAvailable()).toEqual(true);
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
