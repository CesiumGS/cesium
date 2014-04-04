/*global defineSuite*/
defineSuite([
             'DynamicScene/StoredView',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/TimeInterval'
            ], function(
              StoredView,
              DynamicObject,
              JulianDate,
              Cartesian3,
              TimeInterval) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor requires a name.', function() {
        expect(function() {
            var storedView = new StoredView();
        }).toThrowDeveloperError();
    });

    it('constructor sets name.', function() {
        var storedView = new StoredView('someName');
        expect(storedView.name).toEqual('someName');
    });

    it('isAvailable is always true if not tracking an object.', function() {
        var storedView = new StoredView('someName');
        expect(storedView.isAvailable(new JulianDate())).toEqual(true);
    });

    it('isAvailable throw if no time specified.', function() {
        var storedView = new StoredView('someName');
        expect(function() {
            storedView.isAvailable();
        }).toThrowDeveloperError();
    });

    it('isAvailable works with a foreground object.', function() {
        var dynamicObject = new DynamicObject();
        var interval = TimeInterval.fromIso8601('2000-01-01/2001-01-01');
        dynamicObject.availability = interval;
        var storedView = new StoredView('View 1');
        storedView.foregroundObject = dynamicObject;
        expect(storedView.isAvailable(interval.start.addSeconds(-1))).toEqual(false);
        expect(storedView.isAvailable(interval.start)).toEqual(true);
        expect(storedView.isAvailable(interval.stop)).toEqual(true);
        expect(storedView.isAvailable(interval.stop.addSeconds(1))).toEqual(false);
    });

    it('isAvailable works with foreground and background objects.', function() {
        var dynamicObject1 = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var interval1 = TimeInterval.fromIso8601('2000-01-01/2002-01-01');
        var interval2 = TimeInterval.fromIso8601('2001-01-01/2003-01-01');
        dynamicObject1.availability = interval1;
        dynamicObject2.availability = interval2;
        var storedView = new StoredView('View 1');
        storedView.foregroundObject = dynamicObject1;
        storedView.backgroundObject = dynamicObject2;
        expect(storedView.isAvailable(interval2.start.addSeconds(-1))).toEqual(false);
        expect(storedView.isAvailable(interval2.start)).toEqual(true);
        expect(storedView.isAvailable(interval1.stop)).toEqual(true);
        expect(storedView.isAvailable(interval1.stop.addSeconds(1))).toEqual(false);
    });
});