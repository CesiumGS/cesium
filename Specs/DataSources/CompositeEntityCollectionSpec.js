/*global defineSuite*/
defineSuite([
        'DataSources/CompositeEntityCollection',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/BillboardGraphics',
        'DataSources/CompositePositionProperty',
        'DataSources/CompositeProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/EntityCollection'
    ], function(
        CompositeEntityCollection,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        BillboardGraphics,
        CompositePositionProperty,
        CompositeProperty,
        ConstantProperty,
        Entity,
        EntityCollection) {
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
        var composite = new CompositeEntityCollection();
        expect(composite.collectionChanged).toBeDefined();
        expect(composite.getCollectionsLength()).toEqual(0);
        expect(composite.entities.length).toEqual(0);
    });

    it('addCollection/removeCollection works', function() {
        var entityCollection = new EntityCollection();
        entityCollection.add(new Entity());

        var entityCollection2 = new EntityCollection();
        entityCollection2.add(new Entity());

        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        expect(composite.getCollectionsLength()).toEqual(1);
        expect(composite.entities.length).toEqual(1);

        composite.addCollection(entityCollection2);
        expect(composite.getCollectionsLength()).toEqual(2);
        expect(composite.entities.length).toEqual(2);

        expect(composite.removeCollection(entityCollection)).toEqual(true);
        expect(composite.entities.length).toEqual(1);

        expect(composite.removeCollection(entityCollection2)).toEqual(true);
        expect(composite.entities.length).toEqual(0);
        expect(composite.getCollectionsLength()).toEqual(0);

        expect(composite.removeCollection(entityCollection)).toEqual(false);
    });

    it('addCollection works with index', function() {
        var entityCollection = new EntityCollection();
        var entityCollection2 = new EntityCollection();
        var entityCollection3 = new EntityCollection();

        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        composite.addCollection(entityCollection3);

        composite.addCollection(entityCollection2, 1);
        expect(composite.getCollection(0)).toBe(entityCollection);
        expect(composite.getCollection(1)).toBe(entityCollection2);
        expect(composite.getCollection(2)).toBe(entityCollection3);
    });

    it('containsCollection works', function() {
        var entityCollection = new EntityCollection();
        var composite = new CompositeEntityCollection();

        expect(composite.containsCollection(entityCollection)).toEqual(false);
        composite.addCollection(entityCollection);
        expect(composite.containsCollection(entityCollection)).toEqual(true);
    });

    it('indexOfCollection works', function() {
        var entityCollection = new EntityCollection();
        var entityCollection2 = new EntityCollection();
        var composite = new CompositeEntityCollection();

        expect(composite.indexOfCollection(entityCollection)).toEqual(-1);

        composite.addCollection(entityCollection);
        composite.addCollection(entityCollection2);

        expect(composite.indexOfCollection(entityCollection)).toEqual(0);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(1);

        composite.removeCollection(entityCollection);

        expect(composite.indexOfCollection(entityCollection2)).toEqual(0);
    });

    it('getCollection works', function() {
        var entityCollection = new EntityCollection();
        var entityCollection2 = new EntityCollection();
        var composite = new CompositeEntityCollection();

        composite.addCollection(entityCollection);
        composite.addCollection(entityCollection2);

        expect(composite.getCollection(0)).toBe(entityCollection);
        expect(composite.getCollection(1)).toBe(entityCollection2);
        expect(composite.getCollection(2)).toBeUndefined();
    });

    it('raise/lower collection works', function() {
        var entityCollection = new EntityCollection();
        var entityCollection2 = new EntityCollection();
        var entityCollection3 = new EntityCollection();
        var composite = new CompositeEntityCollection();

        composite.addCollection(entityCollection);
        composite.addCollection(entityCollection2);
        composite.addCollection(entityCollection3);

        expect(composite.indexOfCollection(entityCollection2)).toEqual(1);
        composite.raiseCollection(entityCollection2);

        expect(composite.indexOfCollection(entityCollection2)).toEqual(2);
        composite.lowerCollection(entityCollection2);

        composite.lowerCollection(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(0);

        composite.lowerCollection(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(0);

        composite.raiseCollectionToTop(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(2);

        composite.raiseCollectionToTop(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(2);

        composite.lowerCollectionToBottom(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(0);

        composite.lowerCollectionToBottom(entityCollection2);
        expect(composite.indexOfCollection(entityCollection2)).toEqual(0);
    });

    it('add/remove works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var composite = new CompositeEntityCollection([entityCollection]);

        entityCollection.add(entity);
        expect(composite.entities.length).toEqual(1);

        entityCollection.add(entity2);
        expect(composite.entities.length).toEqual(2);

        entityCollection.remove(entity2);
        expect(composite.entities.length).toEqual(1);

        entityCollection.remove(entity);
        expect(composite.entities.length).toEqual(0);
    });

    it('add/remove raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var composite = new CompositeEntityCollection([entityCollection]);
        var listener = new CollectionListener();
        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        entityCollection.add(entity);
        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0].id).toBe(entity.id);
        expect(listener.removed.length).toEqual(0);

        entityCollection.add(entity2);
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0].id).toBe(entity2.id);
        expect(listener.removed.length).toEqual(0);

        entityCollection.remove(entity2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0].id).toBe(entity2.id);

        entityCollection.remove(entity);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0].id).toBe(entity.id);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended add/remove raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entity3 = new Entity();

        var entityCollection = new EntityCollection();

        var composite = new CompositeEntityCollection([entityCollection]);
        var listener = new CollectionListener();
        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        composite.suspendEvents();
        composite.suspendEvents();
        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.add(entity3);
        entityCollection.remove(entity2);

        expect(listener.timesCalled).toEqual(0);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(0);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(2);
        expect(listener.added[0].id).toBe(entity.id);
        expect(listener.added[1].id).toBe(entity3.id);
        expect(listener.removed.length).toEqual(0);

        composite.suspendEvents();
        entityCollection.remove(entity);
        entityCollection.remove(entity3);
        entityCollection.add(entity);
        entityCollection.add(entity3);
        composite.resumeEvents();

        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAllCollections works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var composite = new CompositeEntityCollection([entityCollection]);

        entityCollection.add(entity);
        entityCollection.add(entity2);
        composite.removeAllCollections();
        expect(composite.entities.length).toEqual(0);
    });

    it('removeAllCollections raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();
        var composite = new CompositeEntityCollection([entityCollection]);

        entityCollection.add(entity);
        entityCollection.add(entity2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        composite.removeAllCollections();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(entity.id);
        expect(listener.removed[1].id).toBe(entity2.id);
        expect(listener.added.length).toEqual(0);

        composite.removeAllCollections();
        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAllCollections raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();
        var composite = new CompositeEntityCollection([entityCollection]);

        entityCollection.add(entity);
        entityCollection.add(entity2);

        composite.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        composite.suspendEvents();
        composite.removeAllCollections();
        composite.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0].id).toBe(entity.id);
        expect(listener.removed[1].id).toBe(entity2.id);
        expect(listener.added.length).toEqual(0);
        expect(composite.getCollectionsLength()).toEqual(0);

        composite.suspendEvents();
        composite.addCollection(entityCollection);
        entityCollection.removeAll();
        composite.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        composite.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('getById works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        entityCollection.add(entity2);

        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        expect(composite.getById(entity.id).id).toEqual(entity.id);
        expect(composite.getById(entity2.id).id).toEqual(entity2.id);
    });

    it('getById returns undefined for non-existent object', function() {
        var composite = new CompositeEntityCollection();
        expect(composite.getById('123')).toBeUndefined();
    });

    it('computeAvailability returns infinite with no data.', function() {
        var entityCollection = new EntityCollection();
        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersection of collections.', function() {
        var entityCollection = new EntityCollection();

        var entity = entityCollection.getOrCreateEntity('1');
        var entity2 = entityCollection.getOrCreateEntity('2');
        var entity3 = entityCollection.getOrCreateEntity('3');

        entity.availability = new TimeIntervalCollection();
        entity.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/2012-08-02'
        }));
        entity2.availability = new TimeIntervalCollection();
        entity2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-05/2012-08-06'
        }));
        entity3.availability = undefined;

        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var entityCollection = new EntityCollection();

        var entity = entityCollection.getOrCreateEntity('1');
        var entity2 = entityCollection.getOrCreateEntity('2');
        var entity3 = entityCollection.getOrCreateEntity('3');

        entity.availability = new TimeIntervalCollection();
        entity.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/9999-12-31T24:00:00Z'
        }));
        entity2.availability = new TimeIntervalCollection();
        entity2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '0000-01-01T00:00:00Z/2012-08-06'
        }));
        entity3.availability = undefined;

        var composite = new CompositeEntityCollection();
        composite.addCollection(entityCollection);
        var availability = composite.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('coarse property compositing works', function() {
        var composite = new CompositeEntityCollection();

        var collection1 = new EntityCollection();
        var collection2 = new EntityCollection();
        var collection3 = new EntityCollection();

        //Add collections in reverse order to lower numbers of priority
        composite.addCollection(collection3);
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        //Start with an object in the middle with defined position and orientation
        var entity2 = new Entity();
        collection2.add(entity2);
        entity2.position = new CompositePositionProperty();
        entity2.orientation = new CompositeProperty();

        //Initial composite should match both properties
        var compositeObject = composite.getById(entity2.id);
        expect(compositeObject).toBeDefined();
        expect(composite.entities.length).toEqual(1);
        expect(compositeObject.position).toBe(entity2.position);
        expect(compositeObject.orientation).toBe(entity2.orientation);

        //Add a lower-priority object with position and viewFrom.
        var entity3 = new Entity(entity2.id);
        collection3.add(entity3);
        entity3.position = new CompositePositionProperty();
        entity3.viewFrom = new CompositeProperty();

        //We keep the orientation and position from higher priority entity2
        //But add the viewFrom from 3.
        expect(composite.entities.length).toEqual(1);
        expect(compositeObject.position).toBe(entity2.position);
        expect(compositeObject.orientation).toBe(entity2.orientation);
        expect(compositeObject.viewFrom).toBe(entity3.viewFrom);

        //Add a higher priority object with position
        var entity1 = new Entity(entity2.id);
        collection1.add(entity1);
        entity1.position = new CompositePositionProperty();

        //We now use the position from the higher priority
        //object with other properties unchanged.
        expect(composite.entities.length).toEqual(1);
        expect(compositeObject.position).toBe(entity1.position);
        expect(compositeObject.orientation).toBe(entity2.orientation);
        expect(compositeObject.viewFrom).toBe(entity3.viewFrom);
    });

    it('sub-property compositing works', function() {
        var id = 'test';
        var collection1 = new EntityCollection();
        var entity1 = new Entity(id);
        entity1.billboard = new BillboardGraphics();
        collection1.add(entity1);

        var collection2 = new EntityCollection();
        var entity2 = new Entity(id);
        entity2.billboard = new BillboardGraphics();
        collection2.add(entity2);

        var collection3 = new EntityCollection();
        var entity3 = new Entity(id);
        entity3.billboard = new BillboardGraphics();
        collection3.add(entity3);

        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeEntityCollection();
        composite.addCollection(collection3);
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        var compositeObject = composite.getById(id);

        // Start with an object in the middle with defined billboard
        entity2.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(entity2.billboard.show);

        entity3.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(entity2.billboard.show);

        entity1.billboard.show = new CompositeProperty();
        expect(compositeObject.billboard.show).toBe(entity1.billboard.show);

        entity2.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBe(entity1.billboard.show);

        entity1.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBe(entity3.billboard.show);

        entity3.billboard.show = undefined;
        expect(compositeObject.billboard.show).toBeUndefined();
    });

    it('can use the same entity collection in multiple composites', function() {
        var id = 'test';

        // the entity in collection1 has show === true
        var collection1 = new EntityCollection();
        var entity1 = new Entity(id);
        entity1.billboard = new BillboardGraphics();
        entity1.billboard.show = new ConstantProperty(true);
        collection1.add(entity1);

        // the entity in collection1 has show === false
        var collection2 = new EntityCollection();
        var entity2 = new Entity(id);
        entity2.billboard = new BillboardGraphics();
        entity2.billboard.show = new ConstantProperty(false);
        collection2.add(entity2);

        // composite1 has collection1 as higher priority
        var composite1 = new CompositeEntityCollection();
        composite1.addCollection(collection2);
        composite1.addCollection(collection1);

        // composite2 has collection2 as higher priority
        var composite2 = new CompositeEntityCollection();
        composite2.addCollection(collection1);
        composite2.addCollection(collection2);

        expect(composite1.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(true);
        expect(composite2.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(false);

        // switch the billboard show for the entity in collection2 to true, this should affect
        // composite2 but not composite1
        entity2.billboard.show = new ConstantProperty(true);
        expect(composite2.getById(id).billboard.show.getValue(JulianDate.now())).toEqual(true);
        expect(composite1.getById(id).billboard.show).toBe(entity1.billboard.show);
        expect(composite2.getById(id).billboard.show).toBe(entity2.billboard.show);

        // add a position property to the entity in collection1
        entity1.position = new CompositePositionProperty();

        // both composites should use the position from the object in collection1
        expect(composite1.getById(id).position).toBe(entity1.position);
        expect(composite2.getById(id).position).toBe(entity1.position);

        // add a position property to the entity in collection1
        entity2.position = new CompositePositionProperty();

        // composite1 should use the position from the object in collection1
        // composite2 should use the position from the object in collection2
        expect(composite1.getById(id).position).toBe(entity1.position);
        expect(composite2.getById(id).position).toBe(entity2.position);
    });

    it('suspend events suspends recompositing', function() {
        var id = 'test';
        var collection1 = new EntityCollection();
        var entity1 = new Entity(id);
        collection1.add(entity1);

        var collection2 = new EntityCollection();
        var entity2 = new Entity(id);
        collection2.add(entity2);
        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeEntityCollection();
        composite.addCollection(collection2);

        // suspend events
        composite.suspendEvents();
        composite.addCollection(collection1);

        // add a billboard
        var compositeObject = composite.getById(id);
        entity1.billboard = new BillboardGraphics();
        entity1.billboard.show = new ConstantProperty(false);
        // should be undefined because we haven't recomposited
        expect(compositeObject.billboard).toBeUndefined();
        // resume events
        composite.resumeEvents();

        expect(compositeObject.billboard.show).toBe(entity1.billboard.show);
    });

    it('prevents names from colliding between property events and object events', function() {
        var id = 'test';
        var collection1 = new EntityCollection();
        var entity1 = new Entity(id);
        collection1.add(entity1);

        var collection2 = new EntityCollection();
        var entity2 = new Entity(id);
        collection2.add(entity2);

        //Add collections in reverse order to lower numbers of priority
        var composite = new CompositeEntityCollection();
        composite.addCollection(collection2);
        composite.addCollection(collection1);

        var compositeObject = composite.getById(id);

        // Add a billboard
        entity1.billboard = new BillboardGraphics();
        entity1.billboard.show = new ConstantProperty(false);

        expect(compositeObject.billboard.show).toBe(entity1.billboard.show);

        // Add a new object
        var newObject = new Entity(id + 'billboard');
        collection1.add(newObject);

        // Replace the billboard on the original object
        entity1.billboard = new BillboardGraphics();
        entity1.billboard.show = new ConstantProperty(false);

        // Add a property to the new object
        newObject.position = new CompositePositionProperty();

        // It should appear on the composite
        expect(composite.getById(newObject.id).position).toBe(newObject.position);
    });

    it('addCollection throws with undefined collection', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.addCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('addCollection throws if negative index', function() {
        var collection = new EntityCollection();
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.addCollection(collection, -1);
        }).toThrowDeveloperError();
    });

    it('addCollection throws if index greater than length', function() {
        var collection = new EntityCollection();
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.addCollection(collection, 1);
        }).toThrowDeveloperError();
    });

    it('getCollection throws with undefined index', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.getCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('raiseCollection throws if collection not in composite', function() {
        var composite = new CompositeEntityCollection();
        var collection = new EntityCollection();
        expect(function() {
            composite.raiseCollection(collection);
        }).toThrowDeveloperError();
    });

    it('raiseCollectionToTop throws if collection not in composite', function() {
        var composite = new CompositeEntityCollection();
        var collection = new EntityCollection();
        expect(function() {
            composite.raiseCollectionToTop(collection);
        }).toThrowDeveloperError();
    });

    it('lowerCollection throws if collection not in composite', function() {
        var composite = new CompositeEntityCollection();
        var collection = new EntityCollection();
        expect(function() {
            composite.lowerCollection(collection);
        }).toThrowDeveloperError();
    });

    it('lowerCollectionToBottom throws if collection not in composite', function() {
        var composite = new CompositeEntityCollection();
        var collection = new EntityCollection();
        expect(function() {
            composite.lowerCollectionToBottom(collection);
        }).toThrowDeveloperError();
    });

    it('raiseCollection throws if collection not defined', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.raiseCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('raiseCollectionToTop throws if collection not defined', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.raiseCollectionToTop(undefined);
        }).toThrowDeveloperError();
    });

    it('lowerCollection throws if collection not defined', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.lowerCollection(undefined);
        }).toThrowDeveloperError();
    });

    it('lowerCollectionToBottom throws if collection not defined', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.lowerCollectionToBottom(undefined);
        }).toThrowDeveloperError();
    });

    it('resumeEvents throws if no matching suspendEvents', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.resumeEvents();
        }).toThrowDeveloperError();
    });

    it('getById throws if no id specified', function() {
        var composite = new CompositeEntityCollection();
        expect(function() {
            composite.getById(undefined);
        }).toThrowDeveloperError();
    });
});
