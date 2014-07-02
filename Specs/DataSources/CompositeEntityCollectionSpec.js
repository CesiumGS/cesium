/*global defineSuite*/
defineSuite([
        'DynamicScene/CompositeDynamicObjectCollection',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DynamicScene/CompositePositionProperty',
        'DynamicScene/CompositeProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicBillboard',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicObjectCollection'
    ], function(
        CompositeDynamicObjectCollection,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        CompositePositionProperty,
        CompositeProperty,
        ConstantProperty,
        DynamicBillboard,
        DynamicObject,
        DynamicObjectCollection) {
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
        expect(composite.getCollectionsLength()).toEqual(0);
        expect(composite.getObjects().length).toEqual(0);
    });

    it('addCollection/removeCollection works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        dynamicObjectCollection.add(new DynamicObject());

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        dynamicObjectCollection2.add(new DynamicObject());

        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(dynamicObjectCollection);
        expect(composite.getCollectionsLength()).toEqual(1);
        expect(composite.getObjects().length).toEqual(1);

        composite.addCollection(dynamicObjectCollection2);
        expect(composite.getCollectionsLength()).toEqual(2);
        expect(composite.getObjects().length).toEqual(2);

        expect(composite.removeCollection(dynamicObjectCollection)).toEqual(true);
        expect(composite.getObjects().length).toEqual(1);

        expect(composite.removeCollection(dynamicObjectCollection2)).toEqual(true);
        expect(composite.getObjects().length).toEqual(0);
        expect(composite.getCollectionsLength()).toEqual(0);

        expect(composite.removeCollection(dynamicObjectCollection)).toEqual(false);
    });

    it('addCollection works with index', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var dynamicObjectCollection3 = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(dynamicObjectCollection);
        composite.addCollection(dynamicObjectCollection3);

        composite.addCollection(dynamicObjectCollection2, 1);
        expect(composite.getCollection(0)).toBe(dynamicObjectCollection);
        expect(composite.getCollection(1)).toBe(dynamicObjectCollection2);
        expect(composite.getCollection(2)).toBe(dynamicObjectCollection3);
    });

    it('containsCollection works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();

        expect(composite.containsCollection(dynamicObjectCollection)).toEqual(false);
        composite.addCollection(dynamicObjectCollection);
        expect(composite.containsCollection(dynamicObjectCollection)).toEqual(true);
    });

    it('indexOfCollection works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();

        expect(composite.indexOfCollection(dynamicObjectCollection)).toEqual(-1);

        composite.addCollection(dynamicObjectCollection);
        composite.addCollection(dynamicObjectCollection2);

        expect(composite.indexOfCollection(dynamicObjectCollection)).toEqual(0);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(1);

        composite.removeCollection(dynamicObjectCollection);

        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(0);
    });

    it('getCollection works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();

        composite.addCollection(dynamicObjectCollection);
        composite.addCollection(dynamicObjectCollection2);

        expect(composite.getCollection(0)).toBe(dynamicObjectCollection);
        expect(composite.getCollection(1)).toBe(dynamicObjectCollection2);
        expect(composite.getCollection(2)).toBeUndefined();
    });

    it('raise/lower collection works', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var dynamicObjectCollection3 = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();

        composite.addCollection(dynamicObjectCollection);
        composite.addCollection(dynamicObjectCollection2);
        composite.addCollection(dynamicObjectCollection3);

        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(1);
        composite.raiseCollection(dynamicObjectCollection2);

        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(2);
        composite.lowerCollection(dynamicObjectCollection2);

        composite.lowerCollection(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(0);

        composite.lowerCollection(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(0);

        composite.raiseCollectionToTop(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(2);

        composite.raiseCollectionToTop(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(2);

        composite.lowerCollectionToBottom(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(0);

        composite.lowerCollectionToBottom(dynamicObjectCollection2);
        expect(composite.indexOfCollection(dynamicObjectCollection2)).toEqual(0);
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

    it('removeAllCollections works', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);
        composite.removeAllCollections();
        expect(composite.getObjects().length).toEqual(0);
    });

    it('removeAllCollections raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        composite.removeAllCollections();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(dynamicObject.id);
        expect(listener.removed[1].id).toBe(dynamicObject2.id);
        expect(listener.added.length).toEqual(0);

        composite.removeAllCollections();
        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAllCollections raises expected events', function() {
        var dynamicObject = new DynamicObject();
        var dynamicObject2 = new DynamicObject();
        var dynamicObjectCollection = new DynamicObjectCollection();

        var listener = new CollectionListener();
        var composite = new CompositeDynamicObjectCollection([dynamicObjectCollection]);

        dynamicObjectCollection.add(dynamicObject);
        dynamicObjectCollection.add(dynamicObject2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        composite.suspendEvents();
        composite.removeAllCollections();
        composite.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(dynamicObject.id);
        expect(listener.removed[1].id).toBe(dynamicObject2.id);
        expect(listener.added.length).toEqual(0);
        expect(composite.getCollectionsLength()).toEqual(0);

        composite.suspendEvents();
        composite.addCollection(dynamicObjectCollection);
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
        composite.addCollection(dynamicObjectCollection);
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
        composite.addCollection(dynamicObjectCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersection of collections.', function() {
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

        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(dynamicObjectCollection);
        var availability = composite.computeAvailability();
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

        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(dynamicObjectCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('coarse property compositing works', function() {
        var composite = new CompositeDynamicObjectCollection();

        var collection1 = new DynamicObjectCollection();
        var collection2 = new DynamicObjectCollection();
        var collection3 = new DynamicObjectCollection();

        //Add collections in reverse order to lower numbers of priority
        composite.addCollection(collection3);
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        //Start with an object in the middle with defined position and orientation
        var dynamicObject2 = new DynamicObject();
        collection2.add(dynamicObject2);
        dynamicObject2.position = new CompositePositionProperty();
        dynamicObject2.orientation = new CompositeProperty();

        //Initial composite should match both properties
        var compositeObject = composite.getById(dynamicObject2.id);
        expect(compositeObject).toBeDefined();
        expect(composite.getObjects().length).toEqual(1);
        expect(compositeObject.position).toBe(dynamicObject2.position);
        expect(compositeObject.orientation).toBe(dynamicObject2.orientation);

        //Add a lower-priority object with position and viewFrom.
        var dynamicObject3 = new DynamicObject(dynamicObject2.id);
        collection3.add(dynamicObject3);
        dynamicObject3.position = new CompositePositionProperty();
        dynamicObject3.viewFrom = new CompositeProperty();

        //We keep the orientation and position from higher priority dynamicObject2
        //But add the viewFrom from 3.
        expect(composite.getObjects().length).toEqual(1);
        expect(compositeObject.position).toBe(dynamicObject2.position);
        expect(compositeObject.orientation).toBe(dynamicObject2.orientation);
        expect(compositeObject.viewFrom).toBe(dynamicObject3.viewFrom);

        //Add a higher priority object with position and vertexPositions
        var dynamicObject1 = new DynamicObject(dynamicObject2.id);
        collection1.add(dynamicObject1);
        dynamicObject1.position = new CompositePositionProperty();
        dynamicObject1.vertexPositions = new CompositeProperty();

        //We now use the position and vertexPositions from the higher priority
        //object with other properties unchanged.
        expect(composite.getObjects().length).toEqual(1);
        expect(compositeObject.position).toBe(dynamicObject1.position);
        expect(compositeObject.vertexPositions).toBe(dynamicObject1.vertexPositions);
        expect(compositeObject.orientation).toBe(dynamicObject2.orientation);
        expect(compositeObject.viewFrom).toBe(dynamicObject3.viewFrom);
    });

    it('sub-property compositing works', function() {
        var id = 'test';
        var collection1 = new DynamicObjectCollection();
        var dynamicObject1 = new DynamicObject(id);
        dynamicObject1.billboard = new DynamicBillboard();
        collection1.add(dynamicObject1);

        var collection2 = new DynamicObjectCollection();
        var dynamicObject2 = new DynamicObject(id);
        dynamicObject2.billboard = new DynamicBillboard();
        collection2.add(dynamicObject2);

        var collection3 = new DynamicObjectCollection();
        var dynamicObject3 = new DynamicObject(id);
        dynamicObject3.billboard = new DynamicBillboard();
        collection3.add(dynamicObject3);

        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(collection3);
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        var compositeObject = composite.getById(id);

        // Start with an object in the middle with defined billboard
        dynamicObject2.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(dynamicObject2.billboard.show);

        dynamicObject3.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(dynamicObject2.billboard.show);

        dynamicObject1.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(dynamicObject1.billboard.show);

        dynamicObject2.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBe(dynamicObject1.billboard.show);

        dynamicObject1.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBe(dynamicObject3.billboard.show);

        dynamicObject3.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBeUndefined();
    });

    it('can use the same dynamic object collection in multiple composites', function() {
        var id = 'test';

        // the dynamic object in collection1 has show === true
        var collection1 = new DynamicObjectCollection();
        var dynamicObject1 = new DynamicObject(id);
        dynamicObject1.billboard = new DynamicBillboard();
        dynamicObject1.billboard.show = new ConstantProperty(true);
        collection1.add(dynamicObject1);

        // the dynamic object in collection1 has show === false
        var collection2 = new DynamicObjectCollection();
        var dynamicObject2 = new DynamicObject(id);
        dynamicObject2.billboard = new DynamicBillboard();
        dynamicObject2.billboard.show = new ConstantProperty(false);
        collection2.add(dynamicObject2);

        // composite1 has collection1 as higher priority
        var composite1 = new CompositeDynamicObjectCollection();
        composite1.addCollection(collection2);
        composite1.addCollection(collection1);

        // composite2 has collection2 as higher priority
        var composite2 = new CompositeDynamicObjectCollection();
        composite2.addCollection(collection1);
        composite2.addCollection(collection2);

        expect(composite1.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(true);
        expect(composite2.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(false);

        // switch the billboard show for the dynamic object in collection2 to true, this should affect
        // composite2 but not composite1
        dynamicObject2.billboard.show = new ConstantProperty(true);
        expect(composite2.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(true);
        expect(composite1.getById(id).billboard.show).toBe(dynamicObject1.billboard.show);
        expect(composite2.getById(id).billboard.show).toBe(dynamicObject2.billboard.show);

        // add a position property to the dynamic object in collection1
        dynamicObject1.position = new CompositePositionProperty();

        // both composites should use the position from the object in collection1
        expect(composite1.getById(id).position).toBe(dynamicObject1.position);
        expect(composite2.getById(id).position).toBe(dynamicObject1.position);

        // add a position property to the dynamic object in collection1
        dynamicObject2.position = new CompositePositionProperty();

        // composite1 should use the position from the object in collection1
        // composite2 should use the position from the object in collection2
        expect(composite1.getById(id).position).toBe(dynamicObject1.position);
        expect(composite2.getById(id).position).toBe(dynamicObject2.position);
    });

    it('suspend events suspends recompositing', function() {
        var id = 'test';
        var collection1 = new DynamicObjectCollection();
        var dynamicObject1 = new DynamicObject(id);
        collection1.add(dynamicObject1);

        var collection2 = new DynamicObjectCollection();
        var dynamicObject2 = new DynamicObject(id);
        collection2.add(dynamicObject2);
        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(collection2);

        // suspend events
        composite.suspendEvents();
        composite.addCollection(collection1);

        // add a billboard
        var compositeObject = composite.getById(id);
        dynamicObject1.billboard = new DynamicBillboard();
        dynamicObject1.billboard.show = new ConstantProperty(false);
        // should be undefined because we haven't recomposited
        expect(compositeObject.billboard).toBeUndefined();
        // resume events
        composite.resumeEvents();

        expect(compositeObject.billboard.show).toBe(dynamicObject1.billboard.show);
    });

    it('prevents names from colliding between property events and object events', function() {
        var id = 'test';
        var collection1 = new DynamicObjectCollection();
        var dynamicObject1 = new DynamicObject(id);
        collection1.add(dynamicObject1);

        var collection2 = new DynamicObjectCollection();
        var dynamicObject2 = new DynamicObject(id);
        collection2.add(dynamicObject2);

        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeDynamicObjectCollection();
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        var compositeObject = composite.getById(id);

        // Add a billboard
        dynamicObject1.billboard = new DynamicBillboard();
        dynamicObject1.billboard.show = new ConstantProperty(false);

        expect(compositeObject.billboard.show).toBe(dynamicObject1.billboard.show);

        // Add a new object
        var newObject = new DynamicObject(id + 'billboard');
        collection1.add(newObject);

        // Replace the billboard on the original object
        dynamicObject1.billboard = new DynamicBillboard();
        dynamicObject1.billboard.show = new ConstantProperty(false);

        // Add a property to the new object
        newObject.position = new CompositePositionProperty();

        // It should appear on the composite
        expect(composite.getById(newObject.id).position).toBe(newObject.position);
    });

    it('addCollection throws with undefined collection', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.addCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('addCollection throws if negative index', function() {
        var collection = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.addCollection(collection, -1);
        }).toThrowDeveloperError();
    });

    it('addCollection throws if index greater than length', function() {
        var collection = new DynamicObjectCollection();
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.addCollection(collection, 1);
        }).toThrowDeveloperError();
    });

    it('getCollection throws with undefined index', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.getCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('raiseCollection throws if collection not in composite', function() {
        var composite = new CompositeDynamicObjectCollection();
        var collection = new DynamicObjectCollection();
        expect(function() {
            composite.raiseCollection(collection);
        }).toThrowDeveloperError();
    });

    it('raiseCollectionToTop throws if collection not in composite', function() {
        var composite = new CompositeDynamicObjectCollection();
        var collection = new DynamicObjectCollection();
        expect(function() {
            composite.raiseCollectionToTop(collection);
        }).toThrowDeveloperError();
    });

    it('lowerCollection throws if collection not in composite', function() {
        var composite = new CompositeDynamicObjectCollection();
        var collection = new DynamicObjectCollection();
        expect(function() {
            composite.lowerCollection(collection);
        }).toThrowDeveloperError();
    });

    it('lowerCollectionToBottom throws if collection not in composite', function() {
        var composite = new CompositeDynamicObjectCollection();
        var collection = new DynamicObjectCollection();
        expect(function() {
            composite.lowerCollectionToBottom(collection);
        }).toThrowDeveloperError();
    });

    it('raiseCollection throws if collection not defined', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.raiseCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('raiseCollectionToTop throws if collection not defined', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.raiseCollectionToTop(undefined);
        }).toThrowDeveloperError();
    });

    it('lowerCollection throws if collection not defined', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.lowerCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('lowerCollectionToBottom throws if collection not defined', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.lowerCollectionToBottom(undefined);
        }).toThrowDeveloperError();
    });

    it('resumeEvents throws if no matching suspendEvents', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.resumeEvents();
        }).toThrowDeveloperError();
    });

    it('getById throws if no id specified', function() {
        var composite = new CompositeDynamicObjectCollection();
        expect(function() {
            composite.getById(undefined);
        }).toThrowDeveloperError();
    });
});
