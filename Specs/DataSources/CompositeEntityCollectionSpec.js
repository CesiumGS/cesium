import { Iso8601 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { BillboardGraphics } from "../../Source/Cesium.js";
import { CompositeEntityCollection } from "../../Source/Cesium.js";
import { CompositePositionProperty } from "../../Source/Cesium.js";
import { CompositeProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";

describe("DataSources/CompositeEntityCollection", function () {
  function CollectionListener() {
    this.timesCalled = 0;
    this.added = [];
    this.removed = [];
  }
  CollectionListener.prototype.onCollectionChanged = function (
    collection,
    added,
    removed
  ) {
    this.timesCalled++;
    this.added = added.slice(0);
    this.removed = removed.slice(0);
  };

  it("constructor has expected defaults", function () {
    const composite = new CompositeEntityCollection();
    expect(composite.collectionChanged).toBeDefined();
    expect(composite.getCollectionsLength()).toEqual(0);
    expect(composite.values.length).toEqual(0);
  });

  it("constructor with owner", function () {
    const composite = new CompositeEntityCollection();
    const child = new CompositeEntityCollection(undefined, composite);

    expect(child.owner).toEqual(composite);
  });

  it("addCollection/removeCollection works", function () {
    const entityCollection = new EntityCollection();
    entityCollection.add(new Entity());

    const entityCollection2 = new EntityCollection();
    entityCollection2.add(new Entity());

    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    expect(composite.getCollectionsLength()).toEqual(1);
    expect(composite.values.length).toEqual(1);

    composite.addCollection(entityCollection2);
    expect(composite.getCollectionsLength()).toEqual(2);
    expect(composite.values.length).toEqual(2);

    expect(composite.removeCollection(entityCollection)).toEqual(true);
    expect(composite.values.length).toEqual(1);

    expect(composite.removeCollection(entityCollection2)).toEqual(true);
    expect(composite.values.length).toEqual(0);
    expect(composite.getCollectionsLength()).toEqual(0);

    expect(composite.removeCollection(entityCollection)).toEqual(false);
  });

  it("addCollection works with index", function () {
    const entityCollection = new EntityCollection();
    const entityCollection2 = new EntityCollection();
    const entityCollection3 = new EntityCollection();

    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    composite.addCollection(entityCollection3);

    composite.addCollection(entityCollection2, 1);
    expect(composite.getCollection(0)).toBe(entityCollection);
    expect(composite.getCollection(1)).toBe(entityCollection2);
    expect(composite.getCollection(2)).toBe(entityCollection3);
  });

  it("contains returns true if in collection", function () {
    const entityCollection = new EntityCollection();
    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    const entity = entityCollection.getOrCreateEntity("asd");
    expect(entityCollection.contains(entity)).toBe(true);
  });

  it("contains returns false if not in collection", function () {
    const entityCollection = new CompositeEntityCollection();
    expect(entityCollection.contains(new Entity())).toBe(false);
  });

  it("contains throws with undefined Entity", function () {
    const entityCollection = new CompositeEntityCollection();
    expect(function () {
      entityCollection.contains(undefined);
    }).toThrowDeveloperError();
  });

  it("containsCollection works", function () {
    const entityCollection = new EntityCollection();
    const composite = new CompositeEntityCollection();

    expect(composite.containsCollection(entityCollection)).toEqual(false);
    composite.addCollection(entityCollection);
    expect(composite.containsCollection(entityCollection)).toEqual(true);
  });

  it("indexOfCollection works", function () {
    const entityCollection = new EntityCollection();
    const entityCollection2 = new EntityCollection();
    const composite = new CompositeEntityCollection();

    expect(composite.indexOfCollection(entityCollection)).toEqual(-1);

    composite.addCollection(entityCollection);
    composite.addCollection(entityCollection2);

    expect(composite.indexOfCollection(entityCollection)).toEqual(0);
    expect(composite.indexOfCollection(entityCollection2)).toEqual(1);

    composite.removeCollection(entityCollection);

    expect(composite.indexOfCollection(entityCollection2)).toEqual(0);
  });

  it("getCollection works", function () {
    const entityCollection = new EntityCollection();
    const entityCollection2 = new EntityCollection();
    const composite = new CompositeEntityCollection();

    composite.addCollection(entityCollection);
    composite.addCollection(entityCollection2);

    expect(composite.getCollection(0)).toBe(entityCollection);
    expect(composite.getCollection(1)).toBe(entityCollection2);
    expect(composite.getCollection(2)).toBeUndefined();
  });

  it("raise/lower collection works", function () {
    const entityCollection = new EntityCollection();
    const entityCollection2 = new EntityCollection();
    const entityCollection3 = new EntityCollection();
    const composite = new CompositeEntityCollection();

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

  it("add/remove works", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    const composite = new CompositeEntityCollection([entityCollection]);

    entityCollection.add(entity);
    expect(composite.values.length).toEqual(1);

    entityCollection.add(entity2);
    expect(composite.values.length).toEqual(2);

    entityCollection.remove(entity2);
    expect(composite.values.length).toEqual(1);

    entityCollection.remove(entity);
    expect(composite.values.length).toEqual(0);
  });

  it("add/remove raises expected events", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    const composite = new CompositeEntityCollection([entityCollection]);
    const listener = new CollectionListener();
    composite.collectionChanged.addEventListener(
      listener.onCollectionChanged,
      listener
    );

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

    composite.collectionChanged.removeEventListener(
      listener.onCollectionChanged,
      listener
    );
  });

  it("suspended add/remove raises expected events", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entity3 = new Entity();

    const entityCollection = new EntityCollection();

    const composite = new CompositeEntityCollection([entityCollection]);
    const listener = new CollectionListener();
    composite.collectionChanged.addEventListener(
      listener.onCollectionChanged,
      listener
    );

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

    composite.collectionChanged.removeEventListener(
      listener.onCollectionChanged,
      listener
    );
  });

  it("removeAllCollections works", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    const composite = new CompositeEntityCollection([entityCollection]);

    entityCollection.add(entity);
    entityCollection.add(entity2);
    composite.removeAllCollections();
    expect(composite.values.length).toEqual(0);
  });

  it("removeAllCollections raises expected events", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    const listener = new CollectionListener();
    const composite = new CompositeEntityCollection([entityCollection]);

    entityCollection.add(entity);
    entityCollection.add(entity2);

    composite.collectionChanged.addEventListener(
      listener.onCollectionChanged,
      listener
    );
    composite.removeAllCollections();

    expect(listener.timesCalled).toEqual(1);
    expect(listener.removed.length).toEqual(2);
    expect(listener.removed[0].id).toBe(entity.id);
    expect(listener.removed[1].id).toBe(entity2.id);
    expect(listener.added.length).toEqual(0);

    composite.removeAllCollections();
    expect(listener.timesCalled).toEqual(1);

    composite.collectionChanged.removeEventListener(
      listener.onCollectionChanged,
      listener
    );
  });

  it("suspended removeAllCollections raises expected events", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    const listener = new CollectionListener();
    const composite = new CompositeEntityCollection([entityCollection]);

    entityCollection.add(entity);
    entityCollection.add(entity2);

    composite.collectionChanged.addEventListener(
      listener.onCollectionChanged,
      listener
    );

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

    composite.collectionChanged.removeEventListener(
      listener.onCollectionChanged,
      listener
    );
  });

  it("getById works", function () {
    const entity = new Entity();
    const entity2 = new Entity();
    const entityCollection = new EntityCollection();

    entityCollection.add(entity);
    entityCollection.add(entity2);

    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    expect(composite.getById(entity.id).id).toEqual(entity.id);
    expect(composite.getById(entity2.id).id).toEqual(entity2.id);
  });

  it("getById returns undefined for non-existent object", function () {
    const composite = new CompositeEntityCollection();
    expect(composite.getById("123")).toBeUndefined();
  });

  it("computeAvailability returns infinite with no data.", function () {
    const entityCollection = new EntityCollection();
    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    const availability = composite.computeAvailability();
    expect(availability.start).toEqual(Iso8601.MINIMUM_VALUE);
    expect(availability.stop).toEqual(Iso8601.MAXIMUM_VALUE);
  });

  it("computeAvailability returns intersection of collections.", function () {
    const entityCollection = new EntityCollection();

    const entity = entityCollection.getOrCreateEntity("1");
    const entity2 = entityCollection.getOrCreateEntity("2");
    const entity3 = entityCollection.getOrCreateEntity("3");

    entity.availability = new TimeIntervalCollection();
    entity.availability.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2012-08-01/2012-08-02",
      })
    );
    entity2.availability = new TimeIntervalCollection();
    entity2.availability.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2012-08-05/2012-08-06",
      })
    );
    entity3.availability = undefined;

    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    const availability = composite.computeAvailability();
    expect(availability.start).toEqual(JulianDate.fromIso8601("2012-08-01"));
    expect(availability.stop).toEqual(JulianDate.fromIso8601("2012-08-06"));
  });

  it("computeAvailability works if only start or stop time is infinite.", function () {
    const entityCollection = new EntityCollection();

    const entity = entityCollection.getOrCreateEntity("1");
    const entity2 = entityCollection.getOrCreateEntity("2");
    const entity3 = entityCollection.getOrCreateEntity("3");

    entity.availability = new TimeIntervalCollection();
    entity.availability.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2012-08-01/9999-12-31T24:00:00Z",
      })
    );
    entity2.availability = new TimeIntervalCollection();
    entity2.availability.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "0000-01-01T00:00:00Z/2012-08-06",
      })
    );
    entity3.availability = undefined;

    const composite = new CompositeEntityCollection();
    composite.addCollection(entityCollection);
    const availability = composite.computeAvailability();
    expect(availability.start).toEqual(JulianDate.fromIso8601("2012-08-01"));
    expect(availability.stop).toEqual(JulianDate.fromIso8601("2012-08-06"));
  });

  it("coarse property compositing works", function () {
    const composite = new CompositeEntityCollection();

    const collection1 = new EntityCollection();
    const collection2 = new EntityCollection();
    const collection3 = new EntityCollection();

    //Add collections in reverse order to lower numbers of priority
    composite.addCollection(collection3);
    composite.addCollection(collection2);
    composite.addCollection(collection1);

    //Start with an object in the middle with defined position and orientation
    const entity2 = new Entity();
    collection2.add(entity2);
    entity2.position = new CompositePositionProperty();
    entity2.orientation = new CompositeProperty();

    //Initial composite should match both properties
    const compositeObject = composite.getById(entity2.id);
    expect(compositeObject).toBeDefined();
    expect(composite.values.length).toEqual(1);
    expect(compositeObject.position).toBe(entity2.position);
    expect(compositeObject.orientation).toBe(entity2.orientation);

    //Add a lower-priority object with position and viewFrom.
    const entity3 = new Entity({
      id: entity2.id,
    });
    collection3.add(entity3);
    entity3.position = new CompositePositionProperty();
    entity3.viewFrom = new CompositeProperty();

    //We keep the orientation and position from higher priority entity2
    //But add the viewFrom from 3.
    expect(composite.values.length).toEqual(1);
    expect(compositeObject.position).toBe(entity2.position);
    expect(compositeObject.orientation).toBe(entity2.orientation);
    expect(compositeObject.viewFrom).toBe(entity3.viewFrom);

    //Add a higher priority object with position
    const entity1 = new Entity({
      id: entity2.id,
    });
    collection1.add(entity1);
    entity1.position = new CompositePositionProperty();

    //We now use the position from the higher priority
    //object with other properties unchanged.
    expect(composite.values.length).toEqual(1);
    expect(compositeObject.position).toBe(entity1.position);
    expect(compositeObject.orientation).toBe(entity2.orientation);
    expect(compositeObject.viewFrom).toBe(entity3.viewFrom);
  });

  it("sub-property compositing works", function () {
    const id = "test";
    const collection1 = new EntityCollection();
    const entity1 = new Entity({
      id: id,
    });
    entity1.billboard = new BillboardGraphics();
    collection1.add(entity1);

    const collection2 = new EntityCollection();
    const entity2 = new Entity({
      id: id,
    });
    entity2.billboard = new BillboardGraphics();
    collection2.add(entity2);

    const collection3 = new EntityCollection();
    const entity3 = new Entity({
      id: id,
    });
    entity3.billboard = new BillboardGraphics();
    collection3.add(entity3);

    //Add collections in reverse order to lower numbers of priority
    const composite = new CompositeEntityCollection();
    composite.addCollection(collection3);
    composite.addCollection(collection2);
    composite.addCollection(collection1);

    const compositeObject = composite.getById(id);

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

  it("per-entity availability works", function () {
    const id = "test";
    const collection1 = new EntityCollection();
    const availability1 = new TimeIntervalCollection();
    availability1.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2019-01-01/2019-01-04",
      })
    );
    const entity1 = new Entity({
      id: id,
      availability: availability1,
    });
    collection1.add(entity1);

    const collection2 = new EntityCollection();
    const availability2 = new TimeIntervalCollection();
    availability2.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2019-01-02/2019-01-05",
      })
    );
    const entity2 = new Entity({
      id: id,
      availability: availability2,
    });
    collection2.add(entity2);

    const collection3 = new EntityCollection();
    const availability3 = new TimeIntervalCollection();
    availability3.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2019-01-03/2019-01-06",
      })
    );
    const entity3 = new Entity({
      id: id,
      availability: availability3,
    });
    collection3.add(entity3);

    //Add collections in reverse order to lower numbers of priority
    const composite = new CompositeEntityCollection();
    composite.addCollection(collection3);
    composite.addCollection(collection2);
    composite.addCollection(collection1);

    const compositeObject = composite.getById(id);
    expect(compositeObject.availability.start).toEqual(
      JulianDate.fromIso8601("2019-01-01")
    );

    composite.removeCollection(collection1);
    expect(compositeObject.availability.start).toEqual(
      JulianDate.fromIso8601("2019-01-02")
    );

    composite.removeCollection(collection2);
    expect(compositeObject.availability.start).toEqual(
      JulianDate.fromIso8601("2019-01-03")
    );
  });

  it("works when collection being composited suspends updates", function () {
    const collection = new EntityCollection();
    const composite = new CompositeEntityCollection([collection]);

    collection.suspendEvents();
    collection.getOrCreateEntity("id1");
    collection.getOrCreateEntity("id2");

    expect(composite.getById("id1")).toBeUndefined();
    expect(composite.getById("id2")).toBeUndefined();

    collection.resumeEvents();

    expect(composite.getById("id1")).toBeDefined();
    expect(composite.getById("id2")).toBeDefined();
  });

  it("custom entity properties are properly registed on new composited entity.", function () {
    const oldValue = "tubelcane";
    const newValue = "fizzbuzz";
    const propertyName = "customProperty";

    const collection = new EntityCollection();
    const e1 = collection.getOrCreateEntity("id1");
    e1.addProperty(propertyName);
    e1[propertyName] = oldValue;

    const composite = new CompositeEntityCollection([collection]);
    const e1Composite = composite.getById("id1");
    expect(e1Composite[propertyName]).toEqual(e1[propertyName]);

    const listener = jasmine.createSpy("listener");
    e1Composite.definitionChanged.addEventListener(listener);

    e1[propertyName] = newValue;
    expect(listener).toHaveBeenCalledWith(
      e1Composite,
      propertyName,
      newValue,
      oldValue
    );
  });

  it("custom entity properties are properly registed on existing composited entity.", function () {
    const oldValue = "tubelcane";
    const newValue = "fizzbuzz";
    const propertyName = "customProperty";

    const collection = new EntityCollection();
    const e1 = collection.getOrCreateEntity("id1");

    const composite = new CompositeEntityCollection([collection]);

    e1.addProperty(propertyName);
    e1[propertyName] = oldValue;

    const e1Composite = composite.getById("id1");
    expect(e1Composite[propertyName]).toEqual(e1[propertyName]);

    const listener = jasmine.createSpy("listener");
    e1Composite.definitionChanged.addEventListener(listener);

    e1[propertyName] = newValue;
    expect(listener).toHaveBeenCalledWith(
      e1Composite,
      propertyName,
      newValue,
      oldValue
    );
  });

  it("can use the same entity collection in multiple composites", function () {
    const id = "test";

    // the entity in collection1 has show === true
    const collection1 = new EntityCollection();
    const entity1 = new Entity({
      id: id,
    });
    entity1.billboard = new BillboardGraphics();
    entity1.billboard.show = new ConstantProperty(true);
    collection1.add(entity1);

    // the entity in collection1 has show === false
    const collection2 = new EntityCollection();
    const entity2 = new Entity({
      id: id,
    });
    entity2.billboard = new BillboardGraphics();
    entity2.billboard.show = new ConstantProperty(false);
    collection2.add(entity2);

    // composite1 has collection1 as higher priority
    const composite1 = new CompositeEntityCollection();
    composite1.addCollection(collection2);
    composite1.addCollection(collection1);

    // composite2 has collection2 as higher priority
    const composite2 = new CompositeEntityCollection();
    composite2.addCollection(collection1);
    composite2.addCollection(collection2);

    expect(
      composite1.getById(id).billboard.show.getValue(JulianDate.now())
    ).toEqual(true);
    expect(
      composite2.getById(id).billboard.show.getValue(JulianDate.now())
    ).toEqual(false);

    // switch the billboard show for the entity in collection2 to true, this should affect
    // composite2 but not composite1
    entity2.billboard.show = new ConstantProperty(true);
    expect(
      composite2.getById(id).billboard.show.getValue(JulianDate.now())
    ).toEqual(true);
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

  it("has entity with link to entity collection", function () {
    const id = "test";
    const collection = new EntityCollection();
    const entity = new Entity({
      id: id,
    });
    collection.add(entity);
    const composite = new CompositeEntityCollection();
    composite.addCollection(collection);
    const compositeEntity = composite.getCollection(0).values[0];
    expect(compositeEntity.entityCollection).toEqual(collection);
  });

  it("suspend events suspends recompositing", function () {
    const id = "test";
    const collection1 = new EntityCollection();
    const entity1 = new Entity({
      id: id,
    });
    collection1.add(entity1);

    const collection2 = new EntityCollection();
    const entity2 = new Entity({
      id: id,
    });
    collection2.add(entity2);
    //Add collections in reverse order to lower numbers of priority
    const composite = new CompositeEntityCollection();
    composite.addCollection(collection2);

    // suspend events
    composite.suspendEvents();
    composite.addCollection(collection1);

    // add a billboard
    const compositeObject = composite.getById(id);
    entity1.billboard = new BillboardGraphics();
    entity1.billboard.show = new ConstantProperty(false);
    // should be undefined because we haven't recomposited
    expect(compositeObject.billboard).toBeUndefined();
    // resume events
    composite.resumeEvents();

    expect(compositeObject.billboard.show).toBe(entity1.billboard.show);
  });

  it("prevents names from colliding between property events and object events", function () {
    const id = "test";
    const collection1 = new EntityCollection();
    const entity1 = new Entity({
      id: id,
    });
    collection1.add(entity1);

    const collection2 = new EntityCollection();
    const entity2 = new Entity({
      id: id,
    });
    collection2.add(entity2);

    //Add collections in reverse order to lower numbers of priority
    const composite = new CompositeEntityCollection();
    composite.addCollection(collection2);
    composite.addCollection(collection1);

    const compositeObject = composite.getById(id);

    // Add a billboard
    entity1.billboard = new BillboardGraphics();
    entity1.billboard.show = new ConstantProperty(false);

    expect(compositeObject.billboard.show).toBe(entity1.billboard.show);

    // Add a new object
    const newObject = new Entity({
      id: `${id}billboard`,
    });
    collection1.add(newObject);

    // Replace the billboard on the original object
    entity1.billboard = new BillboardGraphics();
    entity1.billboard.show = new ConstantProperty(false);

    // Add a property to the new object
    newObject.position = new CompositePositionProperty();

    // It should appear on the composite
    expect(composite.getById(newObject.id).position).toBe(newObject.position);
  });

  it("addCollection throws with undefined collection", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.addCollection(undefined);
    }).toThrowDeveloperError();
  });

  it("addCollection throws if negative index", function () {
    const collection = new EntityCollection();
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.addCollection(collection, -1);
    }).toThrowDeveloperError();
  });

  it("addCollection throws if index greater than length", function () {
    const collection = new EntityCollection();
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.addCollection(collection, 1);
    }).toThrowDeveloperError();
  });

  it("getCollection throws with undefined index", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.getCollection(undefined);
    }).toThrowDeveloperError();
  });

  it("raiseCollection throws if collection not in composite", function () {
    const composite = new CompositeEntityCollection();
    const collection = new EntityCollection();
    expect(function () {
      composite.raiseCollection(collection);
    }).toThrowDeveloperError();
  });

  it("raiseCollectionToTop throws if collection not in composite", function () {
    const composite = new CompositeEntityCollection();
    const collection = new EntityCollection();
    expect(function () {
      composite.raiseCollectionToTop(collection);
    }).toThrowDeveloperError();
  });

  it("lowerCollection throws if collection not in composite", function () {
    const composite = new CompositeEntityCollection();
    const collection = new EntityCollection();
    expect(function () {
      composite.lowerCollection(collection);
    }).toThrowDeveloperError();
  });

  it("lowerCollectionToBottom throws if collection not in composite", function () {
    const composite = new CompositeEntityCollection();
    const collection = new EntityCollection();
    expect(function () {
      composite.lowerCollectionToBottom(collection);
    }).toThrowDeveloperError();
  });

  it("raiseCollection throws if collection not defined", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.raiseCollection(undefined);
    }).toThrowDeveloperError();
  });

  it("raiseCollectionToTop throws if collection not defined", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.raiseCollectionToTop(undefined);
    }).toThrowDeveloperError();
  });

  it("lowerCollection throws if collection not defined", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.lowerCollection(undefined);
    }).toThrowDeveloperError();
  });

  it("lowerCollectionToBottom throws if collection not defined", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.lowerCollectionToBottom(undefined);
    }).toThrowDeveloperError();
  });

  it("resumeEvents throws if no matching suspendEvents", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.resumeEvents();
    }).toThrowDeveloperError();
  });

  it("getById throws if no id specified", function () {
    const composite = new CompositeEntityCollection();
    expect(function () {
      composite.getById(undefined);
    }).toThrowDeveloperError();
  });
});
