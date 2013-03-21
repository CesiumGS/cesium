/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicObjectCollection',
         'Core/JulianDate',
         'Core/Iso8601',
         'Core/TimeInterval',
         'DynamicScene/DynamicObject'
     ], function(
         DynamicObjectCollection,
         JulianDate,
         Iso8601,
         TimeInterval,
         DynamicObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('getObject throws if no id specified', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.getObject();
        }).toThrow();
    });

    it('getObject returns the correct object', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.getOrCreateObject('1');
        var object2 = dynamicObjectCollection.getOrCreateObject('2');
        dynamicObjectCollection.getOrCreateObject('3');
        expect(dynamicObjectCollection.getObject('2')).toEqual(object2);
    });

    it('removeObject removes the object', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.getOrCreateObject('1');
        dynamicObjectCollection.getOrCreateObject('2');
        dynamicObjectCollection.getOrCreateObject('3');
        expect(dynamicObjectCollection.removeObject('2')).toEqual(true);
        expect(dynamicObjectCollection.getObject('2')).toBeUndefined();
        expect(dynamicObjectCollection.getObjects().length).toEqual(2);
    });

    it('getOrCreateObject throws if no id specified', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.getOrCreateObject();
        }).toThrow();
    });

    it('getOrCreateObject creates a new object if it does not exist.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        expect(dynamicObjectCollection.getObjects().length).toEqual(1);
        expect(dynamicObjectCollection.getObjects()[0]).toEqual(testObject);
    });

    it('getOrCreateObject does not create a new object if it already exists.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        expect(dynamicObjectCollection.getObjects().length).toEqual(1);
        expect(dynamicObjectCollection.getObjects()[0]).toEqual(testObject);
        var testObject2 = dynamicObjectCollection.getOrCreateObject('test');
        expect(dynamicObjectCollection.getObjects().length).toEqual(1);
        expect(dynamicObjectCollection.getObjects()[0]).toEqual(testObject);
        expect(testObject2).toEqual(testObject);
    });

    it('computeAvailability returns infinite with no data.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var availability = dynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersction of collections.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var dynamicObject = dynamicObjectCollection.getOrCreateObject('1');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-01/2012-08-02'));

        dynamicObject = dynamicObjectCollection.getOrCreateObject('2');

        dynamicObject = dynamicObjectCollection.getOrCreateObject('3');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-05/2012-08-06'));

        var availability = dynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var dynamicObject = dynamicObjectCollection.getOrCreateObject('1');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('2012-08-01/9999-12-31T24:00:00Z'));

        dynamicObject = dynamicObjectCollection.getOrCreateObject('2');

        dynamicObject = dynamicObjectCollection.getOrCreateObject('3');
        dynamicObject._setAvailability(TimeInterval.fromIso8601('0000-01-01T00:00:00Z/2012-08-06'));

        var availability = dynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('clear removes all objects', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.getOrCreateObject('1');
        var object2 = dynamicObjectCollection.getOrCreateObject('2');
        dynamicObjectCollection.getOrCreateObject('3');
        expect(dynamicObjectCollection.getObjects().length).toEqual(3);
        expect(dynamicObjectCollection.getObject('2')).toEqual(object2);

        dynamicObjectCollection.clear();

        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
        expect(dynamicObjectCollection.getObject('2')).toBeUndefined();
    });
});
