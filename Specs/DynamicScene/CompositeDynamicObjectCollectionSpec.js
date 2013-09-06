/*global defineSuite*/
defineSuite([
         'DynamicScene/CompositeDynamicObjectCollection',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicObject',
         'Core/JulianDate',
         'Core/Iso8601',
         'Core/TimeInterval',
         'DynamicScene/CzmlDataSource',
         'Scene/HorizontalOrigin'
     ], function(
         CompositeDynamicObjectCollection,
         DynamicObjectCollection,
         DynamicObject,
         JulianDate,
         Iso8601,
         TimeInterval,
         CzmlDataSource,
         HorizontalOrigin) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var CollectionListener = function() {
        this.timesCalled = 0;
        this.added = [];
        this.removed = [];
    };

    CollectionListener.prototype.onCollectionChanged = function(collection, added, removed) {
        this.timesCalled++;
        this.added = added.slice(0);
        this.removed = removed.slice(0);
    };

    it('constructor has expected defaults', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(composite.collectionChanged).toBeDefined();
        expect(composite.getLength()).toEqual(0);
        expect(composite.getObjects().length).toEqual(0);
    });

    it('add/remove works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        expect(composite.getObjects().length).toEqual(1);

        dynamicObjectCollection.add(dynamicObject2);
        expect(composite.getObjects().length).toEqual(2);

        dynamicObjectCollection.remove(dynamicObject2);
        expect(composite.getObjects().length).toEqual(1);

        dynamicObjectCollection.remove(dynamicObject);
        expect(composite.getObjects().length).toEqual(0);
    });

    it('add/remove raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);
        var listener = new CollectionListener();
        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        dynamicObjectCollection.add(dynamicObject);
        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0].id).toBe(dynamicObject.id);
        expect(listener.removed.length).toEqual(0);

        dynamicObjectCollection.add(dynamicObject2);
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0].id).toBe(dynamicObject2.id);
        expect(listener.removed.length).toEqual(0);

        dynamicObjectCollection.remove(dynamicObject2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0].id).toBe(dynamicObject2.id);

        dynamicObjectCollection.remove(dynamicObject);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0].id).toBe(dynamicObject.id);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended add/remove raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObject3 = new DynamicObject();

        var dynamicObjectCollection = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);
        var listener = new CollectionListener();
        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        composite.suspendEvents();
        composite.suspendEvents();
        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        dynamicObjectCollection.add(dynamicObject3);
        dynamicObjectCollection.remove(dynamicObject2);

        expect(listener.timesCalled).toEqual(0);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(0);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(2);
        expect(listener.added[0].id).toBe(dynamicObject.id);
        expect(listener.added[1].id).toBe(dynamicObject3.id);
        expect(listener.removed.length).toEqual(0);

        composite.suspendEvents();
        dynamicObjectCollection.remove(dynamicObject);
        dynamicObjectCollection.remove(dynamicObject3);
        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject3);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAll collections works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        composite.removeAll();
        expect(composite.getObjects().length).toEqual(0);
    });

    it('removeAll raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        composite.removeAll();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(dynamicObject.id);
        expect(listener.removed[1].id).toBe(dynamicObject2.id);
        expect(listener.added.length).toEqual(0);

        composite.removeAll();
        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAll raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        composite.suspendEvents();
        composite.removeAll();
        composite.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(dynamicObject.id);
        expect(listener.removed[1].id).toBe(dynamicObject2.id);
        expect(listener.added.length).toEqual(0);
        expect(composite.getLength()).toEqual(0);

        composite.suspendEvents();
        composite.add(dynamicObjectCollection);
        dynamicObjectCollection.removeAll();
        composite.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('getById works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        var composite = new CompositeDynamicObjectCollection();
        composite.add(dynamicObjectCollection);
        expect(composite.getById(dynamicObject.id).id).toEqual(dynamicObject.id);
        expect(composite.getById(dynamicObject2.id).id).toEqual(dynamicObject2.id);
    });

    it('getById returns undefined for non-existent object', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(composite.getById('123')).toBeUndefined();
    });

    it('computeAvailability returns infinite with no data.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();
        composite.add(dynamicObjectCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersection of collections.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var dynamicObject = dynamicObjectCollection.getOrCreateObject('1');
        var dynamicObject2 = dynamicObjectCollection.getOrCreateObject('2');
        var dynamicObject3 = dynamicObjectCollection.getOrCreateObject('3');

        dynamicObject.availability = TimeInterval.fromIso8601('2012-08-01/2012-08-02');
        dynamicObject2.availability = TimeInterval.fromIso8601('2012-08-05/2012-08-06');
        dynamicObject3.availability = undefined;

        var composite = new CompositeDynamicObjectCollection();
        composite.add(dynamicObjectCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();

        var dynamicObject = dynamicObjectCollection.getOrCreateObject('1');
        var dynamicObject2 = dynamicObjectCollection.getOrCreateObject('2');
        var dynamicObject3 = dynamicObjectCollection.getOrCreateObject('3');

        dynamicObject.availability = TimeInterval.fromIso8601('2012-08-01/9999-12-31T24:00:00Z');
        dynamicObject2.availability = TimeInterval.fromIso8601('0000-01-01T00:00:00Z/2012-08-06');
        dynamicObject3.availability = undefined;

        var composite = new CompositeDynamicObjectCollection();
        composite.add(dynamicObjectCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('resumeEvents throws if no matching suspendEvents ', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.resumeEvents();
        }).toThrow();
    });

    it('getById throws if no id specified', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.getById(undefined);
        }).toThrow();
    });
});
