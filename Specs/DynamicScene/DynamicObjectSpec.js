/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Quaternion',
             'Core/Iso8601',
             'Core/TimeInterval'
            ], function(
              DynamicObject,
              JulianDate,
              Cartesian3,
              Quaternion,
              Iso8601,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor sets id.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(dynamicObject.id).toEqual('someId');
    });

    it('isAvailable is always true if no availability defined.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(dynamicObject.isAvailable(new JulianDate())).toEqual(true);
    });

    it('isAvailable throw if no time specified.', function() {
        var dynamicObject = new DynamicObject('someId');
        expect(function() {
            dynamicObject.isAvailable();
        }).toThrow();
    });

    it('constructor creates a unique id if one is not provided.', function() {
        var object = new DynamicObject();
        var object2 = new DynamicObject();
        expect(object.id).toBeDefined();
        expect(object.id).toNotEqual(object2.id);
    });

    it('isAvailable works.', function() {
        var dynamicObject = new DynamicObject('dynamicObject');
        var interval = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        dynamicObject.availability = interval;
        expect(dynamicObject.isAvailable(interval.start.addSeconds(-1))).toEqual(false);
        expect(dynamicObject.isAvailable(interval.start)).toEqual(true);
        expect(dynamicObject.isAvailable(interval.stop)).toEqual(true);
        expect(dynamicObject.isAvailable(interval.stop.addSeconds(1))).toEqual(false);
    });
});