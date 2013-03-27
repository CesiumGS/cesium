/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicClock',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Iso8601',
             'Core/TimeInterval',
             'Core/ClockRange',
             'Core/ClockStep'
            ], function(
              DynamicClock,
              DynamicObject,
              JulianDate,
              Iso8601,
              TimeInterval,
              ClockRange,
              ClockStep) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var clockPacket = {
        clock : {
            interval : '2012-03-15T10:00:00Z/2012-03-16T10:00:00Z',
            currentTime : '2012-03-15T10:00:00Z',
            multiplier : 60.0,
            range : 'LOOP_STOP',
            step : 'SYSTEM_CLOCK_MULTIPLIER'
        }
    };

    var interval = TimeInterval.fromIso8601(clockPacket.clock.interval);
    var currentTime = JulianDate.fromIso8601(clockPacket.clock.currentTime);
    var multiplier = clockPacket.clock.multiplier;
    var range = ClockRange[clockPacket.clock.range];
    var step = ClockStep[clockPacket.clock.step];

    it('processCzmlPacket adds clock data.', function() {
        var dynamicObject = new DynamicObject('document');
        expect(DynamicClock.processCzmlPacket(dynamicObject, clockPacket)).toEqual(true);
        expect(dynamicObject.clock).toBeDefined();
        expect(dynamicObject.clock.startTime).toEqual(interval.start);
        expect(dynamicObject.clock.stopTime).toEqual(interval.stop);
        expect(dynamicObject.clock.currentTime).toEqual(currentTime);
        expect(dynamicObject.clock.clockRange).toEqual(range);
        expect(dynamicObject.clock.clockStep).toEqual(step);
        expect(dynamicObject.clock.multiplier).toEqual(multiplier);
    });

    it('processCzmlPacket only adds data on the document.', function() {
        var clockPacket = {
            clock : {
                interval : "2012-03-15T10:00:00Z/2012-03-16T10:00:00Z",
                currentTime : "2012-03-15T10:00:00Z",
                multiplier : 60.0,
                range : "LOOP_STOP",
                step : "SYSTEM_CLOCK_MULTIPLIER"
            }
        };

        var documentObject = new DynamicObject('document');
        var dynamicObject = new DynamicObject('notTheDocument');
        expect(DynamicClock.processCzmlPacket(dynamicObject, clockPacket)).toEqual(false);
        expect(dynamicObject.clock).toBeUndefined();
        expect(DynamicClock.processCzmlPacket(documentObject, clockPacket)).toEqual(true);
        expect(documentObject.clock).toBeDefined();
    });

    it('processCzmlPacket returns false if no data.', function() {
        var packet = {};
        var dynamicObject = new DynamicObject('document');
        expect(DynamicClock.processCzmlPacket(dynamicObject, packet)).toEqual(false);
        expect(dynamicObject.clock).toBeUndefined();
    });

    it('mergeProperties creates a clock', function() {
        var objectToMerge = new DynamicObject('document');
        DynamicClock.processCzmlPacket(objectToMerge, clockPacket);

        var targetObject = new DynamicObject('targetObject');
        DynamicClock.mergeProperties(targetObject, objectToMerge);
        expect(targetObject.clock).toBeDefined();

        expect(targetObject.clock.startTime).toEqual(objectToMerge.clock.startTime);
        expect(targetObject.clock.stopTime).toEqual(objectToMerge.clock.stopTime);
        expect(targetObject.clock.currentTime).toEqual(objectToMerge.clock.currentTime);
        expect(targetObject.clock.clockRange).toEqual(objectToMerge.clock.clockRange);
        expect(targetObject.clock.clockStep).toEqual(objectToMerge.clock.clockStep);
        expect(targetObject.clock.multiplier).toEqual(objectToMerge.clock.multiplier);
    });

    it('mergeProperties does not overwrite the target clock if the merging object clock is undefined', function() {
        var objectToMerge = new DynamicObject('document');

        var targetObject = new DynamicObject('document');
        DynamicClock.processCzmlPacket(targetObject, clockPacket);

        DynamicClock.mergeProperties(targetObject, objectToMerge);
        expect(targetObject.clock).toBeDefined();
        expect(targetObject.clock.startTime).toEqual(interval.start);
        expect(targetObject.clock.stopTime).toEqual(interval.stop);
        expect(targetObject.clock.currentTime).toEqual(currentTime);
        expect(targetObject.clock.clockRange).toEqual(range);
        expect(targetObject.clock.clockStep).toEqual(step);
        expect(targetObject.clock.multiplier).toEqual(multiplier);
    });

    it('mergeProperties always overwrites the target clock with mergeObject clock if it has one', function() {
        var objectToMerge = new DynamicObject('document');
        DynamicClock.processCzmlPacket(objectToMerge, clockPacket);

        var targetObject = new DynamicObject('document');
        var clockPacket2 = {
            clock : {
                interval : '2013-03-15T10:00:00Z/2014-03-16T10:00:00Z',
                currentTime : '2013-03-15T10:00:00Z',
                multiplier : 65.0,
                range : 'CLAMPED',
                step : 'SYSTEM_CLOCK'
            }
        };

        DynamicClock.processCzmlPacket(targetObject, clockPacket2);
        expect(targetObject.clock.startTime).toNotEqual(objectToMerge.clock.startTime);
        expect(targetObject.clock.stopTime).toNotEqual(objectToMerge.clock.stopTime);
        expect(targetObject.clock.currentTime).toNotEqual(objectToMerge.clock.currentTime);
        expect(targetObject.clock.clockRange).toNotEqual(objectToMerge.clock.clockRange);
        expect(targetObject.clock.clockStep).toNotEqual(objectToMerge.clock.clockStep);
        expect(targetObject.clock.multiplier).toNotEqual(objectToMerge.clock.multiplier);

        DynamicClock.mergeProperties(targetObject, objectToMerge);
        expect(targetObject.clock.startTime).toEqual(objectToMerge.clock.startTime);
        expect(targetObject.clock.stopTime).toEqual(objectToMerge.clock.stopTime);
        expect(targetObject.clock.currentTime).toEqual(objectToMerge.clock.currentTime);
        expect(targetObject.clock.clockRange).toEqual(objectToMerge.clock.clockRange);
        expect(targetObject.clock.clockStep).toEqual(objectToMerge.clock.clockStep);
        expect(targetObject.clock.multiplier).toEqual(objectToMerge.clock.multiplier);
    });

    it('undefineProperties works', function() {
        var testObject = new DynamicObject('testObject');
        testObject.clock = new DynamicClock();
        DynamicClock.undefineProperties(testObject);
        expect(testObject.clock).toBeUndefined();
    });
});