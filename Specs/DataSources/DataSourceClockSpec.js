/*global defineSuite*/
defineSuite([
        'DataSources/DataSourceClock',
        'Core/ClockRange',
        'Core/ClockStep',
        'Core/JulianDate'
    ], function(
        DataSourceClock,
        ClockRange,
        ClockStep,
        JulianDate) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    it('merge assigns unassigned properties', function() {
        var source = new DataSourceClock();
        source.startTime = JulianDate.now();
        source.stopTime = JulianDate.now();
        source.currentTime = JulianDate.now();
        source.clockRange = ClockRange.CLAMPED;
        source.clockStep = ClockStep.TICK_DEPENDENT;
        source.multiplier = 1;

        var target = new DataSourceClock();
        target.merge(source);

        expect(target.startTime).toBe(source.startTime);
        expect(target.stopTime).toBe(source.stopTime);
        expect(target.currentTime).toBe(source.currentTime);
        expect(target.clockRange).toBe(source.clockRange);
        expect(target.clockStep).toBe(source.clockStep);
        expect(target.multiplier).toBe(source.multiplier);
    });

    it('merge does not assign assigned properties', function() {
        var source = new DataSourceClock();
        source.startTime = JulianDate.now();
        source.stopTime = JulianDate.now();
        source.currentTime = JulianDate.now();
        source.clockRange = ClockRange.CLAMPED;
        source.clockStep = ClockStep.TICK_DEPENDENT;
        source.multiplier = 1;

        var startTime = JulianDate.now();
        var stopTime = JulianDate.now();
        var currentTime = JulianDate.now();
        var clockRange = ClockRange.CLAMPED;
        var clockStep = ClockStep.TICK_DEPENDENT;
        var multiplier = 1;

        var target = new DataSourceClock();
        target.startTime = startTime;
        target.stopTime = stopTime;
        target.currentTime = currentTime;
        target.clockRange = clockRange;
        target.clockStep = clockStep;
        target.multiplier = multiplier;

        target.merge(source);

        expect(target.startTime).toBe(startTime);
        expect(target.stopTime).toBe(stopTime);
        expect(target.currentTime).toBe(currentTime);
        expect(target.clockRange).toBe(clockRange);
        expect(target.clockStep).toBe(clockStep);
        expect(target.multiplier).toBe(multiplier);
    });

    it('clone works', function() {
        var source = new DataSourceClock();
        source.startTime = JulianDate.now();
        source.stopTime = JulianDate.now();
        source.currentTime = JulianDate.now();
        source.clockRange = ClockRange.CLAMPED;
        source.clockStep = ClockStep.TICK_DEPENDENT;
        source.multiplier = 1;

        var result = source.clone();
        expect(result.startTime).toBe(source.startTime);
        expect(result.stopTime).toBe(source.stopTime);
        expect(result.currentTime).toBe(source.currentTime);
        expect(result.clockRange).toBe(source.clockRange);
        expect(result.clockStep).toBe(source.clockStep);
        expect(result.multiplier).toBe(source.multiplier);
    });

    it('merge throws if source undefined', function() {
        var target = new DataSourceClock();
        expect(function() {
            target.merge(undefined);
        }).toThrowDeveloperError();
    });
});