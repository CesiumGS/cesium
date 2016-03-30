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
    'use strict';

    function CollectionListener() {
        this.timesCalled = 0;
        this.added = undefined;
        this.removed = undefined;
        this.changed = undefined;
    }
    CollectionListener.prototype.onCollectionChanged = function(collection, added, removed, changed) {
        this.timesCalled++;
        this.added = added.slice(0);
        this.removed = removed.slice(0);
        this.changed = changed.slice(0);
    };

    it('constructor has expected defaults', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.id).toBeDefined();
        expect(entityCollection.values.length).toEqual(0);
    });

    it('add/remove works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        expect(entityCollection.values.length).toEqual(1);

        entityCollection.add(entity2);
        expect(entityCollection.values.length).toEqual(2);

        entityCollection.remove(entity2);
        expect(entityCollection.values.length).toEqual(1);

        entityCollection.remove(entity);
        expect(entityCollection.values.length).toEqual(0);
    });

    it('add sets entityCollection on entity', function() {
        var entity = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        expect(entity.entityCollection).toBe(entityCollection);
    });

    it('Entity.isShowing changes when collection show changes.', function() {
        var entity = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);

        expect(entity.isShowing).toBe(true);

        var listener = jasmine.createSpy('listener');
        entity.definitionChanged.addEventListener(listener);

        entityCollection.show = false;

        expect(listener.calls.count()).toBe(1);
        expect(listener.calls.argsFor(0)).toEqual([entity, 'isShowing', false, true]);
        expect(entity.isShowing).toBe(false);
    });

    it('add with template', function() {
        var entityCollection = new EntityCollection();

        var entity = entityCollection.add({
            id : '1'
        });

        expect(entityCollection.values.length).toEqual(1);
        expect(entity.id).toBe('1');
        expect(entity.constructor).toBe(Entity);
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
        expect(listener.changed.length).toEqual(0);

        entity.name = 'newName';
        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(0);
        expect(listener.changed.length).toEqual(1);
        expect(listener.changed[0]).toBe(entity);

        entityCollection.add(entity2);
        expect(listener.timesCalled).toEqual(3);
        expect(listener.added.length).toEqual(1);
        expect(listener.added[0]).toBe(entity2);
        expect(listener.removed.length).toEqual(0);
        expect(listener.changed.length).toEqual(0);

        entityCollection.remove(entity2);
        expect(listener.timesCalled).toEqual(4);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(entity2);
        expect(listener.changed.length).toEqual(0);

        entityCollection.remove(entity);
        expect(listener.timesCalled).toEqual(5);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(entity);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('raises expected events when reentrant', function() {
        var entityCollection = new EntityCollection();

        var entity = new Entity();
        var entity2 = new Entity();
        entityCollection.add(entity);
        entityCollection.add(entity2);

        var entityToDelete = new Entity();
        entityCollection.add(entityToDelete);

        var entityToAdd = new Entity();

        var inCallback = false;
        var listener = jasmine.createSpy('listener').and.callFake(function(collection, added, removed, changed) {
            //When we set the name to `newName` below, this code will modify entity2's name, thus triggering
            //another event firing that occurs after all current subscribers have been notified of the
            //event we are inside of.

            //By checking that inCallback is false, we are making sure the entity2.name assignment
            //is delayed until after the first round of events is fired.
            expect(inCallback).toBe(false);
            inCallback = true;
            if (entity2.name !== 'Bob') {
                entity2.name = 'Bob';
            }
            if (entityCollection.contains(entityToDelete)) {
                entityCollection.removeById(entityToDelete.id);
            }
            if (!entityCollection.contains(entityToAdd)) {
                entityCollection.add(entityToAdd);
            }
            inCallback = false;
        });
        entityCollection.collectionChanged.addEventListener(listener);

        entity.name = 'newName';
        expect(listener.calls.count()).toBe(2);
        expect(listener.calls.argsFor(0)).toEqual([entityCollection, [], [], [entity]]);
        expect(listener.calls.argsFor(1)).toEqual([entityCollection, [entityToAdd], [entityToDelete], [entity2]]);

        expect(entity.name).toEqual('newName');
        expect(entity2.name).toEqual('Bob');
        expect(entityCollection.contains(entityToDelete)).toEqual(false);
        expect(entityCollection.contains(entityToAdd)).toEqual(true);
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
        entity2.name = 'newName2';
        entity3.name = 'newName3';
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
        expect(listener.changed.length).toEqual(0);

        entityCollection.suspendEvents();
        entity.name = 'newName';
        entity3.name = 'newewName3';
        entityCollection.remove(entity3);
        entityCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(2);
        expect(listener.added.length).toEqual(0);
        expect(listener.removed.length).toEqual(1);
        expect(listener.removed[0]).toBe(entity3);
        expect(listener.changed.length).toEqual(1);
        expect(listener.changed[0]).toBe(entity);

        entityCollection.suspendEvents();
        entityCollection.remove(entity);
        entityCollection.add(entity);
        entityCollection.resumeEvents();

        expect(listener.timesCalled).toEqual(2);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeAll works', function() {
        var entity = new Entity();
        var entity2 = new Entity();
        var entityCollection = new EntityCollection();

        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.removeAll();
        expect(entityCollection.values.length).toEqual(0);
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
        entity2.name = 'newName';
        entityCollection.removeAll();
        entityCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);
        expect(listener.removed.length).toEqual(2);
        expect(listener.removed[0]).toBe(entity);
        expect(listener.removed[1]).toBe(entity2);
        expect(listener.added.length).toEqual(0);
        expect(listener.changed.length).toEqual(0);

        entityCollection.suspendEvents();
        entityCollection.add(entity);
        entityCollection.add(entity2);
        entityCollection.remove(entity2);
        entityCollection.removeAll();
        entityCollection.resumeEvents();
        expect(listener.timesCalled).toEqual(1);

        entityCollection.collectionChanged.removeEventListener(listener.onCollectionChanged, listener);
    });

    it('removeById returns false if id not in collection.', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.removeById('notThere')).toBe(false);
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

    it('getOrCreateEntity creates a new object if it does not exist.', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.values.length).toEqual(0);
        var testObject = entityCollection.getOrCreateEntity('test');
        expect(entityCollection.values.length).toEqual(1);
        expect(entityCollection.values[0]).toEqual(testObject);
    });

    it('getOrCreateEntity does not create a new object if it already exists.', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.values.length).toEqual(0);
        var testObject = entityCollection.getOrCreateEntity('test');
        expect(entityCollection.values.length).toEqual(1);
        expect(entityCollection.values[0]).toEqual(testObject);
        var testObject2 = entityCollection.getOrCreateEntity('test');
        expect(entityCollection.values.length).toEqual(1);
        expect(entityCollection.values[0]).toEqual(testObject);
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

        var availability = entityCollection.computeAvailability();
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
        var entity = new Entity({
            id : '1'
        });
        var entity2 = new Entity({
            id : '1'
        });
        entityCollection.add(entity);

        expect(function() {
            entityCollection.add(entity2);
        }).toThrowRuntimeError();
    });

    it('contains returns true if in collection', function() {
        var entityCollection = new EntityCollection();
        var entity = entityCollection.getOrCreateEntity('asd');
        expect(entityCollection.contains(entity)).toBe(true);
    });

    it('contains returns false if not in collection', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.contains(new Entity())).toBe(false);
    });

    it('contains throws with undefined Entity', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.contains(undefined);
        }).toThrowDeveloperError();
    });

    it('remove returns false with undefined Entity', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.remove(undefined)).toBe(false);
    });

    it('removeById returns false with undefined id', function() {
        var entityCollection = new EntityCollection();
        expect(entityCollection.removeById(undefined)).toBe(false);
    });

    it('getById throws if no id specified', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.getById(undefined);
        }).toThrowDeveloperError();
    });

    it('getOrCreateEntity throws if no id specified', function() {
        var entityCollection = new EntityCollection();
        expect(function() {
            entityCollection.getOrCreateEntity(undefined);
        }).toThrowDeveloperError();
    });
});
