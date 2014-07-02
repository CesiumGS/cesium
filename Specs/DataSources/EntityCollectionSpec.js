/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicObjectCollection',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DynamicScene/DynamicObject'
    ], function(
        DynamicObjectCollection,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        DynamicObject) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var CollectionListener = function() {
        this.timesCalled = 0;
        this.added = undefined;
        this.removed = undefined;
    };

    CollectionListener.prototype.onCollectionChanged = function(collection, added, removed) {
        this.timesCalled++;
        this.added = added.slice(0);
        this.removed = removed.slice(0);
    };

    it('constructor has expected defaults', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
    });

    it('add/remove works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        dynamicObjectCollection.add(dynamicObject);
        expect(dynamicObjectCollection.getObjects().length).toEqual(1);

        dynamicObjectCollection.add(dynamicObject2);
        expect(dynamicObjectCollection.getObjects().length).toEqual(2);

        dynamicObjectCollection.remove(dynamicObject2);
        expect(dynamicObjectCollection.getObjects().length).toEqual(1);

        dynamicObjectCollection.remove(dynamicObject);
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
    });

    it('add/remove raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        dynamicObjectCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        dynamicObjectCollection.add(dynamicObject);
        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(dynamicObject);
        expect(listener.removed.length).toEqual(0);

        dynamicObjectCollection.add(dynamicObject2);
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(dynamicObject2);
        expect(listener.removed.length).toEqual(0);

        dynamicObjectCollection.remove(dynamicObject2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(dynamicObject2);

        dynamicObjectCollection.remove(dynamicObject);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(dynamicObject);

        dynamicObjectCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended add/remove raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObject3 = new DynamicObject();

        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        dynamicObjectCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        dynamicObjectCollection.suspendEvents();
        dynamicObjectCollection.suspendEvents();
        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        dynamicObjectCollection.add(dynamicObject3);
        dynamicObjectCollection.remove(dynamicObject2);

        expect(listener.timesCalled).toEqual(0);
        dynamicObjectCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(0);
        dynamicObjectCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(2);
        expect(listener.added[0]).toBe(dynamicObject);
        expect(listener.added[1]).toBe(dynamicObject3);
        expect(listener.removed.length).toEqual(0);

        dynamicObjectCollection.suspendEvents();
        dynamicObjectCollection.remove(dynamicObject);
        dynamicObjectCollection.remove(dynamicObject3);
        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject3);
        dynamicObjectCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);

        dynamicObjectCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAll works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        dynamicObjectCollection.removeAll();
        expect(dynamicObjectCollection.getObjects().length).toEqual(0);
    });

    it('removeAll raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        dynamicObjectCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        dynamicObjectCollection.removeAll();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(dynamicObject);
        expect(listener.removed[1]).toBe(dynamicObject2);
        expect(listener.added.length).toEqual(0);

        dynamicObjectCollection.removeAll();
        expect(listener.timesCalled).toEqual(1);

        dynamicObjectCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAll raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        dynamicObjectCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        dynamicObjectCollection.suspendEvents();
        dynamicObjectCollection.removeAll();
        dynamicObjectCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(dynamicObject);
        expect(listener.removed[1]).toBe(dynamicObject2);
        expect(listener.added.length).toEqual(0);

        dynamicObjectCollection.suspendEvents();
        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        dynamicObjectCollection.remove(dynamicObject2);
        dynamicObjectCollection.removeAll();
        dynamicObjectCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        dynamicObjectCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('getById works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        expect(dynamicObjectCollection.getById(dynamicObject.id)).toBe(dynamicObject);
        expect(dynamicObjectCollection.getById(dynamicObject2.id)).toBe(dynamicObject2);
    });

    it('getById returns undefined for non-existent object', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(dynamicObjectCollection.getById('123')).toBeUndefined();
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
        var dynamicObject2 = dynamicObjectCollection.getOrCreateObject('2');
        var dynamicObject3 = dynamicObjectCollection.getOrCreateObject('3');

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/2012-08-02'
        }));
        dynamicObject2.availability = new TimeIntervalCollection();
        dynamicObject2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-05/2012-08-06'
        }));
        dynamicObject3.availability = undefined;

        var availability = dynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var dynamicObject = dynamicObjectCollection.getOrCreateObject('1');
        var dynamicObject2 = dynamicObjectCollection.getOrCreateObject('2');
        var dynamicObject3 = dynamicObjectCollection.getOrCreateObject('3');

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/9999-12-31T24:00:00Z'
        }));
        dynamicObject2.availability = new TimeIntervalCollection();
        dynamicObject2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '0000-01-01T00:00:00Z/2012-08-06'
        }));
        dynamicObject3.availability = undefined;

        var availability = dynamicObjectCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('resumeEvents throws if no matching suspendEvents ', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.resumeEvents();
        }).toThrowDeveloperError();
    });

    it('add throws with undefined DynamicObject', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.add(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws for DynamicObject with same id', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var dynamicObject = new DynamicObject('1');
        var dynamicObject2 = new DynamicObject('1');
        dynamicObjectCollection.add(dynamicObject);

        expect(function() {
            dynamicObjectCollection.add(dynamicObject2);
        }).toThrowRuntimeError();
    });

    it('remove throws with undefined DynamicObject', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.remove(undefined);
        }).toThrowDeveloperError();
    });

    it('removeById throws for undefined id', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.removeById(undefined);
        }).toThrowDeveloperError();
    });

    it('getById throws if no id specified', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.getById(undefined);
        }).toThrowDeveloperError();
    });

    it('getOrCreateObject throws if no id specified', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        expect(function() {
            dynamicObjectCollection.getOrCreateObject(undefined);
        }).toThrowDeveloperError();
    });
});
