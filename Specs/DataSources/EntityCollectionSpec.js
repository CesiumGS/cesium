/*global defineSuite*/
defineSuite([
        'DataSources/EntityCollection',
        'Core/Iso8601',
        'Core/JulianDate',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/Entity'
    ], function(
        EntityCollection,
        Iso8601,
        JulianDate,
        TimeInterval,
        TimeIntervalCollection,
        Entity) {
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
        var entityCollection = new EntityCollection();
        expect(entityCollection.getObjects().length).toEqual(0);
    });

    it('add/remove works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        expect(entityCollection.getObjects().length).toEqual(1);

        entityCollection.add(entity2);
        expect(entityCollection.getObjects().length).toEqual(2);

        entityCollection.remove(entity2);
        expect(entityCollection.getObjects().length).toEqual(1);

        entityCollection.remove(entity);
        expect(entityCollection.getObjects().length).toEqual(0);
    });

    it('add/remove raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();
        entityCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        entityCollection.add(entity);
        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(entity);
        expect(listener.removed.length).toEqual(0);

        entityCollection.add(entity2);
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(entity2);
        expect(listener.removed.length).toEqual(0);

        entityCollection.remove(entity2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(entity2);

        entityCollection.remove(entity);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(entity);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended add/remove raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entity3 = new Entity();

        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();
        entityCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        entityCollection.suspendEvents();
        entityCollection.suspendEvents();
        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.add(entity3);
        entityCollection.remove(entity2);

        expect(listener.timesCalled).toEqual(0);
        entityCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(0);
        entityCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.added.length).toEqual(2);
        expect(listener.added[0]).toBe(entity);
        expect(listener.added[1]).toBe(entity3);
        expect(listener.removed.length).toEqual(0);

        entityCollection.suspendEvents();
        entityCollection.remove(entity);
        entityCollection.remove(entity3);
        entityCollection.add(entity);
        entityCollection.add(entity3);
        entityCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(1);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAll works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.removeAll();
        expect(entityCollection.getObjects().length).toEqual(0);
    });

    it('removeAll raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();

        entityCollection.add(entity);
        entityCollection.add(entity2);

        entityCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);
        entityCollection.removeAll();

        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(entity);
        expect(listener.removed[1]).toBe(entity2);
        expect(listener.added.length).toEqual(0);

        entityCollection.removeAll();
        expect(listener.timesCalled).toEqual(1);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('suspended removeAll raises expected events', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        var listener = new CollectionListener();

        entityCollection.add(entity);
        entityCollection.add(entity2);

        entityCollection.collectionChanged.addEventListener(listener.onCollectionChanged, listener);

        entityCollection.suspendEvents();
        entityCollection.removeAll();
        entityCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(entity);
        expect(listener.removed[1]).toBe(entity2);
        expect(listener.added.length).toEqual(0);

        entityCollection.suspendEvents();
        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.remove(entity2);
        entityCollection.removeAll();
        entityCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('getById works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        entityCollection.add(entity2);

        expect(entityCollection.getById(entity.id)).toBe(entity);
        expect(entityCollection.getById(entity2.id)).toBe(entity2);
    });

    it('getById returns undefined for non-existent object', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.getById('123')).toBeUndefined();
    });

    it('getOrCreateObject creates a new object if it does not exist.', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.getObjects().length).toEqual(0);
        var testObject = entityCollection.getOrCreateObject('test');
        expect(entityCollection.getObjects().length).toEqual(1);
        expect(entityCollection.getObjects()[0]).toEqual(testObject);
    });

    it('getOrCreateObject does not create a new object if it already exists.', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.getObjects().length).toEqual(0);
        var testObject = entityCollection.getOrCreateObject('test');
        expect(entityCollection.getObjects().length).toEqual(1);
        expect(entityCollection.getObjects()[0]).toEqual(testObject);
        var testObject2 = entityCollection.getOrCreateObject('test');
        expect(entityCollection.getObjects().length).toEqual(1);
        expect(entityCollection.getObjects()[0]).toEqual(testObject);
        expect(testObject2).toEqual(testObject);
    });

    it('computeAvailability returns infinite with no data.', function() {
        var entityCollection = new EntityCollection();
        var availability = entityCollection.computeAvailability();
        expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
        expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
    });

    it('computeAvailability returns intersction of collections.', function() {
        var entityCollection = new EntityCollection();

        var entity = entityCollection.getOrCreateObject('1');
        var entity2 = entityCollection.getOrCreateObject('2');
        var entity3 = entityCollection.getOrCreateObject('3');

        entity.availability = new TimeIntervalCollection();
        entity.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/2012-08-02'
        }));
        entity2.availability = new TimeIntervalCollection();
        entity2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-05/2012-08-06'
        }));
        entity3.availability = undefined;

        var availability = entityCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('computeAvailability works if only start or stop time is infinite.', function() {
        var entityCollection = new EntityCollection();

        var entity = entityCollection.getOrCreateObject('1');
        var entity2 = entityCollection.getOrCreateObject('2');
        var entity3 = entityCollection.getOrCreateObject('3');

        entity.availability = new TimeIntervalCollection();
        entity.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '2012-08-01/9999-12-31T24:00:00Z'
        }));
        entity2.availability = new TimeIntervalCollection();
        entity2.availability.addInterval(TimeInterval.fromIso8601({
            iso8601 : '0000-01-01T00:00:00Z/2012-08-06'
        }));
        entity3.availability = undefined;

        var availability = entityCollection.computeAvailability();
        expect(availability.start).toEqual(JulianDate.fromIso8601('2012-08-01'));
        expect(availability.stop).toEqual(JulianDate.fromIso8601('2012-08-06'));
    });

    it('resumeEvents throws if no matching suspendEvents ', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.resumeEvents();
        }).toThrowDeveloperError();
    });

    it('add throws with undefined Entity', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.add(undefined);
        }).toThrowDeveloperError();
    });

    it('add throws for Entity with same id', function() {
        var entityCollection = new EntityCollection();
        var entity = new Entity('1');
        var entity2 = new Entity('1');
        entityCollection.add(entity);

        expect(function() {
            entityCollection.add(entity2);
        }).toThrowRuntimeError();
    });

    it('remove throws with undefined Entity', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.remove(undefined);
        }).toThrowDeveloperError();
    });

    it('removeById throws for undefined id', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.removeById(undefined);
        }).toThrowDeveloperError();
    });

    it('getById throws if no id specified', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.getById(undefined);
        }).toThrowDeveloperError();
    });

    it('getOrCreateObject throws if no id specified', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.getOrCreateObject(undefined);
        }).toThrowDeveloperError();
    });
});
