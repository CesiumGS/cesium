/*global defineSuite*/
defineSuite([
        'Core/Clock',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/defined',
        'Core/JulianDate'
    ], function(
        Clock,
        ClockRange,
        ClockStep,
        defined,
        JulianDate) {
    'use strict';

    it('sets default parameters when constructed', function() {
        var clock = new Clock();
        expect(clock.stopTime).toEqual(JulianDate.addDays(clock.startTime, 1, new JulianDate()));
        expect(clock.startTime).toEqual(clock.currentTime);
        expect(clock.multiplier).toEqual(1.0);
        expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        expect(clock.clockRange).toEqual(ClockRange.UNBOUNDED);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('sets provided constructor parameters correctly', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(112);
        var currentTime = new JulianDate(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });

        expect(clock.startTime).toEqual(start);
        expect(clock.startTime).not.toBe(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.stopTime).not.toBe(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.currentTime).not.toBe(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);

        clock = new Clock({
            canAnimate : false
        });
        expect(clock.canAnimate).toEqual(false);

        clock = new Clock({
            shouldAnimate : false
        });
        expect(clock.shouldAnimate).toEqual(false);
    });

    it('works when constructed with no currentTime parameter', function() {
        var start = new JulianDate(12);
        var stop = new JulianDate(112);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(start);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('works when constructed with no startTime parameter', function() {
        var stop = new JulianDate(112);
        var currentTime = new JulianDate(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            stopTime : stop,
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        expect(clock.startTime).toEqual(currentTime);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('works when constructed with no startTime or stopTime', function() {
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
        var expectedStop = JulianDate.addDays(currentTime, 1.0, new JulianDate());
        expect(clock.startTime).toEqual(currentTime);
        expect(clock.stopTime).toEqual(expectedStop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('works when constructed with no startTime or currentTime', function() {
        var stop = new JulianDate(13);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            stopTime : stop,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        var expectedStart = JulianDate.addDays(stop, -1.0, new JulianDate());
        expect(clock.startTime).toEqual(expectedStart);
        expect(clock.stopTime).toEqual(stop);
        expect(clock.currentTime).toEqual(expectedStart);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('works when constructed with no currentTime or stopTime', function() {
        var start = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        var expectedStop = JulianDate.addDays(start, 1.0, new JulianDate());
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(expectedStop);
        expect(clock.currentTime).toEqual(start);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('works when constructed with no stopTime parameter', function() {
        var start = new JulianDate(12);
        var currentTime = new JulianDate(12);
        var step = ClockStep.TICK_DEPENDENT;
        var range = ClockRange.LOOP_STOP;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            currentTime : currentTime,
            clockStep : step,
            multiplier : multiplier,
            clockRange : range
        });
        var expectedStop = JulianDate.addDays(start, 1.0, new JulianDate());
        expect(clock.startTime).toEqual(start);
        expect(clock.stopTime).toEqual(expectedStop);
        expect(clock.currentTime).toEqual(currentTime);
        expect(clock.clockStep).toEqual(step);
        expect(clock.clockRange).toEqual(range);
        expect(clock.multiplier).toEqual(multiplier);
        expect(clock.canAnimate).toEqual(true);
        expect(clock.shouldAnimate).toEqual(true);
    });

    it('throws when constructed if start time is after stop time', function() {
        var start = new JulianDate(1);
        var stop = new JulianDate(0);
        expect(function() {
            return new Clock({
                startTime : start,
                stopTime : stop
            });
        }).toThrowDeveloperError();
    });

    it('animates forward in TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(0.5);
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.LOOP_STOP
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('animates backwards in TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = new JulianDate(0.5);
        var multiplier = -1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.LOOP_STOP
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('animates forwards past stop time in UNBOUNDED TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = stop;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.UNBOUNDED
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('animates backwards past start time in UNBOUNDED TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = start;
        var multiplier = -1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.UNBOUNDED
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('loops back to start time when animating forward past stop time in LOOP_STOP TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = stop;
        var multiplier = 1.5;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.LOOP_STOP
        });
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(start, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);

        currentTime = JulianDate.addSeconds(currentTime, multiplier, new JulianDate());
        expect(currentTime).toEqual(clock.tick());
        expect(clock.currentTime).toEqual(currentTime);
    });

    it('stops at start when animating backwards past start time in LOOP_STOP TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = start;
        var multiplier = -100.0;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.LOOP_STOP
        });

        expect(clock.currentTime).toEqual(currentTime);
        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
    });

    it('stops at stop time when animating forwards past stop time in CLAMPED TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = stop;
        var multiplier = 100.0;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.CLAMPED
        });

        expect(clock.currentTime).toEqual(currentTime);
        expect(stop).toEqual(clock.tick());
        expect(stop).toEqual(clock.currentTime);
    });

    it('stops at start time when animating backwards past start time in CLAMPED TICK_DEPENDENT mode', function() {
        var start = new JulianDate(0);
        var stop = new JulianDate(1);
        var currentTime = start;
        var multiplier = -100.0;
        var clock = new Clock({
            startTime : start,
            stopTime : stop,
            currentTime : currentTime,
            clockStep : ClockStep.TICK_DEPENDENT,
            multiplier : multiplier,
            clockRange : ClockRange.CLAMPED
        });

        expect(clock.currentTime).toEqual(currentTime);
        expect(start).toEqual(clock.tick());
        expect(start).toEqual(clock.currentTime);
    });

    describe('SYSTEM_CLOCK modes', function() {
        var baseDate = new Date(2016, 6, 7);

        beforeEach(function() {
            jasmine.clock().install();
            jasmine.clock().mockDate(baseDate);

            if (typeof performance !== 'undefined' && defined(performance.now)) {
                spyOn(performance, 'now').and.callFake(function() {
                    return Date.now();
                });
            }
        });

        afterEach(function() {
            jasmine.clock().uninstall();
        });

        it('uses current time in SYSTEM_CLOCK mode (real-time mode)', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK
            });

            expect(clock.currentTime).toEqual(JulianDate.fromDate(baseDate));
            expect(clock.multiplier).toEqual(1.0);
            expect(clock.shouldAnimate).toEqual(true);

            var time1 = clock.tick();
            expect(time1).toEqual(JulianDate.fromDate(baseDate));

            jasmine.clock().tick(1000);

            var time2 = clock.tick();
            expect(time2).toEqual(JulianDate.addSeconds(JulianDate.fromDate(baseDate), 1.0, new JulianDate()));
        });

        it('switches out of SYSTEM_CLOCK mode when changing currentTime', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK
            });
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.currentTime = clock.currentTime;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.currentTime = new JulianDate(1);
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        });

        it('switches out of SYSTEM_CLOCK mode when changing multiplier', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK
            });
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.multiplier = clock.multiplier;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.multiplier = 1.5;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        });

        it('switches out of SYSTEM_CLOCK mode when changing shouldAnimate', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK
            });
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.shouldAnimate = clock.shouldAnimate;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.shouldAnimate = false;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK_MULTIPLIER);
        });

        it('sets currentTime, multiplier and shouldAnimate when switching to SYSTEM_CLOCK mode', function() {
            var clock = new Clock({
                currentTime : new JulianDate(1),
                clockStep : ClockStep.SYSTEM_CLOCK_MULTIPLIER,
                multiplier : 1.5,
                shouldAnimate : false
            });

            clock.clockStep = ClockStep.SYSTEM_CLOCK;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);
            expect(clock.currentTime).toEqual(JulianDate.fromDate(baseDate));
            expect(clock.multiplier).toEqual(1.0);
            expect(clock.shouldAnimate).toEqual(true);
        });

        it('stays in SYSTEM_CLOCK mode when changing other unrelated properties', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK
            });

            clock.startTime = new JulianDate(1);
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.stopTime = new JulianDate(2);
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.clockRange = ClockRange.CLAMP;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);

            clock.canAnimate = false;
            expect(clock.clockStep).toEqual(ClockStep.SYSTEM_CLOCK);
        });

        it('uses multiplier in SYSTEM_CLOCK_MULTIPLIER mode', function() {
            var clock = new Clock({
                clockStep : ClockStep.SYSTEM_CLOCK_MULTIPLIER,
                multiplier : 2.0
            });

            var time1 = clock.tick();
            expect(time1).toEqual(JulianDate.fromDate(baseDate));

            jasmine.clock().tick(1000);

            var time2 = clock.tick();
            expect(time2).toEqual(JulianDate.addSeconds(JulianDate.fromDate(baseDate), 2.0, new JulianDate()));
        });

        it('does not advance if shouldAnimate is false and does advance if true', function() {
            var start = JulianDate.fromDate(baseDate);

            var clock = new Clock({
                startTime : start,
                clockStep : ClockStep.SYSTEM_CLOCK_MULTIPLIER
            });

            expect(clock.currentTime).toEqual(start);
            clock.shouldAnimate = false;

            jasmine.clock().tick(1000);

            var time1 = clock.tick();
            expect(time1).toEqual(start);
            expect(clock.currentTime).toEqual(start);

            clock.shouldAnimate = true;

            jasmine.clock().tick(1000);

            time1 = clock.tick();

            expect(time1).toEqual(JulianDate.addSeconds(JulianDate.fromDate(baseDate), 1.0, new JulianDate()));

            jasmine.clock().tick(1000);

            var time2 = clock.tick();

            expect(time2).toEqual(JulianDate.addSeconds(JulianDate.fromDate(baseDate), 2.0, new JulianDate()));

            clock.currentTime = start;
            clock.clockStep = ClockStep.TICK_DEPENDENT;

            clock.shouldAnimate = false;

            time1 = clock.tick();
            expect(time1).toEqual(start);
            expect(clock.currentTime).toEqual(start);

            clock.shouldAnimate = true;
            time1 = clock.tick();

            expect(time1).toEqual(JulianDate.addSeconds(JulianDate.fromDate(baseDate), 1.0, new JulianDate()));
        });
    });
});
