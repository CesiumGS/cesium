/*global defineSuite*/
defineSuite([
        'Widgets/ClockViewModel',
        'Core/Clock',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/JulianDate'
    ], function(
        ClockViewModel,
        Clock,
        ClockRange,
        ClockStep,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('default constructor creates a clock', function() {
        var clockViewModel = new ClockViewModel();
        expect(clockViewModel.clock).toBeDefined();
    });

    it('constructor sets expected properties', function() {
        var clock = new Clock();
        clock.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clock.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clock.currentTime = JulianDate.fromIso8601("2012-01-01T12:00:00");
        clock.multiplier = 1;
        clock.clockStep = ClockStep.TICK_DEPENDENT;
        clock.clockRange = ClockRange.UNBOUNDED;
        clock.shouldAnimate = false;

        var clockViewModel = new ClockViewModel(clock);
        expect(clockViewModel.clock).toBe(clock);
        expect(clockViewModel.startTime).toEqual(clock.startTime);
        expect(clockViewModel.stopTime).toEqual(clock.stopTime);
        expect(clockViewModel.currentTime).toEqual(clock.currentTime);
        expect(clockViewModel.multiplier).toEqual(clock.multiplier);
        expect(clockViewModel.clockStep).toEqual(clock.clockStep);
        expect(clockViewModel.clockRange).toEqual(clock.clockRange);
        expect(clockViewModel.systemTime).toBeDefined();
        expect(clockViewModel.shouldAnimate).toEqual(false);
    });

    it('observables are updated from the clock', function() {
        var clock = new Clock();
        clock.startTime = JulianDate.fromIso8601("2012-01-01T00:00:00");
        clock.stopTime = JulianDate.fromIso8601("2012-01-02T00:00:00");
        clock.currentTime = JulianDate.fromIso8601("2012-01-01T12:00:00");
        clock.multiplier = 1;
        clock.clockStep = ClockStep.TICK_DEPENDENT;
        clock.clockRange = ClockRange.UNBOUNDED;
        clock.shouldAnimate = false;

        var clockViewModel = new ClockViewModel(clock);
        expect(clockViewModel.clock).toBe(clock);
        expect(clockViewModel.startTime).toEqual(clock.startTime);
        expect(clockViewModel.stopTime).toEqual(clock.stopTime);
        expect(clockViewModel.currentTime).toEqual(clock.currentTime);
        expect(clockViewModel.multiplier).toEqual(clock.multiplier);
        expect(clockViewModel.clockStep).toEqual(clock.clockStep);
        expect(clockViewModel.clockRange).toEqual(clock.clockRange);
        expect(clockViewModel.shouldAnimate).toEqual(clock.shouldAnimate);
        expect(clockViewModel.systemTime).toBeDefined();

        clock.startTime = JulianDate.fromIso8601("2013-01-01T00:00:00");
        clock.stopTime = JulianDate.fromIso8601("2013-01-02T00:00:00");
        clock.currentTime = JulianDate.fromIso8601("2013-01-01T12:00:00");
        clock.multiplier = 2;
        clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        clock.clockRange = ClockRange.CLAMPED;
        clock.shouldAnimate = true;

        expect(clockViewModel.startTime).toNotEqual(clock.startTime);
        expect(clockViewModel.stopTime).toNotEqual(clock.stopTime);
        expect(clockViewModel.currentTime).toNotEqual(clock.currentTime);
        expect(clockViewModel.multiplier).toNotEqual(clock.multiplier);
        expect(clockViewModel.clockStep).toNotEqual(clock.clockStep);
        expect(clockViewModel.clockRange).toNotEqual(clock.clockRange);
        expect(clockViewModel.shouldAnimate).toNotEqual(clock.shouldAnimate);

        clock.tick();

        expect(clockViewModel.startTime).toEqual(clock.startTime);
        expect(clockViewModel.stopTime).toEqual(clock.stopTime);
        expect(clockViewModel.currentTime).toEqual(clock.currentTime);
        expect(clockViewModel.multiplier).toEqual(clock.multiplier);
        expect(clockViewModel.clockStep).toEqual(clock.clockStep);
        expect(clockViewModel.clockRange).toEqual(clock.clockRange);
        expect(clockViewModel.shouldAnimate).toEqual(clock.shouldAnimate);
    });
});