/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicClock',
         'DynamicScene/DynamicObject',
         'Core/JulianDate',
         'Core/TimeInterval',
         'Core/ClockRange',
         'Core/ClockStep'
     ], function(
         DynamicClock,
         DynamicObject,
         JulianDate,
         TimeInterval,
         ClockRange,
         ClockStep) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('mergeProperties creates a clock', function() {
        var clockToMerge = new DynamicObject('1');
        clockToMerge.startTime = new JulianDate();
        clockToMerge.stopTime = new JulianDate();
        clockToMerge.currentTime = new JulianDate();
        clockToMerge.clockRange = ClockRange.CLAMPED;
        clockToMerge.clockStep = ClockStep.TICK_DEPENDENT;
        clockToMerge.multiplier = 1;
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.clock = clockToMerge;

        var targetObject = new DynamicObject('targetObject');
        DynamicClock.mergeProperties(targetObject, objectToMerge);

        var targetClock = targetObject.clock;
        expect(targetClock).toBeInstanceOf(DynamicClock);
        expect(targetClock.startTime).toEqual(clockToMerge.startTime);
        expect(targetClock.stopTime).toEqual(clockToMerge.stopTime);
        expect(targetClock.currentTime).toEqual(clockToMerge.currentTime);
        expect(targetClock.clockRange).toEqual(clockToMerge.clockRange);
        expect(targetClock.clockStep).toEqual(clockToMerge.clockStep);
        expect(targetClock.multiplier).toEqual(clockToMerge.multiplier);
    });

    it('mergeProperties always overwrites the target clock with mergeObject clock if it has one', function() {
        var clockToMerge = new DynamicObject('1');
        clockToMerge.startTime = new JulianDate();
        clockToMerge.stopTime = new JulianDate();
        clockToMerge.currentTime = new JulianDate();
        clockToMerge.clockRange = ClockRange.CLAMPED;
        clockToMerge.clockStep = ClockStep.TICK_DEPENDENT;
        clockToMerge.multiplier = 1;
        var objectToMerge = new DynamicObject('objectToMerge');
        objectToMerge.clock = clockToMerge;

        var targetClock = new DynamicClock();
        targetClock.startTime = new JulianDate();
        targetClock.stopTime = new JulianDate();
        targetClock.currentTime = new JulianDate();
        targetClock.clockRange = ClockRange.UNBOUNDED;
        targetClock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        targetClock.multiplier = 2;
        var targetObject = new DynamicObject('targetObject');
        targetObject.clock = targetClock;

        DynamicClock.mergeProperties(targetObject, objectToMerge);
        expect(targetClock.startTime).toEqual(clockToMerge.startTime);
        expect(targetClock.stopTime).toEqual(clockToMerge.stopTime);
        expect(targetClock.currentTime).toEqual(clockToMerge.currentTime);
        expect(targetClock.clockRange).toEqual(clockToMerge.clockRange);
        expect(targetClock.clockStep).toEqual(clockToMerge.clockStep);
        expect(targetClock.multiplier).toEqual(clockToMerge.multiplier);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.clock = new DynamicClock();
        DynamicClock.undefineProperties(testObject);
        expect(testObject.clock).toBeUndefined();
    });
});