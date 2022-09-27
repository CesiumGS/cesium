import {
  ApproximateTerrainHeights,
  Cartesian3,
  Color,
  DistanceDisplayCondition,
  JulianDate,
  TimeInterval,
  TimeIntervalCollection,
  CallbackProperty,
  EllipseGeometryUpdater,
  Entity,
  StaticGroundGeometryColorBatch,
  TimeIntervalCollectionProperty,
  ClassificationType,
  GroundPrimitive,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("DataSources/StaticGroundGeometryColorBatch", function () {
  const time = JulianDate.now();
  let scene;
  beforeAll(function () {
    scene = createScene();

    return GroundPrimitive.initializeTerrainHeights();
  });

  afterAll(function () {
    scene.destroyForSpecs();

    // Leave ground primitive uninitialized
    GroundPrimitive._initialized = false;
    GroundPrimitive._initPromise = undefined;
    ApproximateTerrainHeights._initPromise = undefined;
    ApproximateTerrainHeights._terrainHeights = undefined;
  });

  it("updates color attribute after rebuilding primitive", function () {
    if (!GroundPrimitive.isSupported(scene)) {
      return;
    }

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );
    const entity = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 2,
        semiMinorAxis: 1,
        show: new CallbackProperty(function () {
          return true;
        }, false),
        material: Color.RED,
      },
    });

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(time, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      const primitive = scene.groundPrimitives.get(0);
      const attributes = primitive.getGeometryInstanceAttributes(entity);
      const red = [255, 0, 0, 255];
      expect(attributes.color).toEqual(red);

      // Verify we have 1 batch
      expect(batch._batches.length).toEqual(1);

      entity.ellipse.material = Color.GREEN;
      updater._onEntityPropertyChanged(entity, "ellipse");
      batch.remove(updater);
      batch.add(time, updater);
      return pollToPromise(function () {
        scene.initializeFrame();
        const isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        const green = [0, 128, 0, 255];
        expect(attributes.color).toEqual(green);

        // Verify we have 1 batch with the key for green
        expect(batch._batches.length).toEqual(1);

        batch.removeAllPrimitives();
      });
    });
  });

  it("batches overlapping geometry separately", function () {
    if (!GroundPrimitive.isSupported(scene)) {
      return;
    }

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );
    const entity = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 2,
        semiMinorAxis: 1,
        show: new CallbackProperty(function () {
          return true;
        }, false),
        material: Color.RED,
      },
    });

    const entity2 = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 2,
        semiMinorAxis: 1,
        show: new CallbackProperty(function () {
          return true;
        }, false),
        material: Color.RED,
      },
    });

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(time, updater);

    const updater2 = new EllipseGeometryUpdater(entity2, scene);
    batch.add(time, updater2);

    expect(batch._batches.length).toEqual(2);
  });

  it("updates with sampled distance display condition out of range", function () {
    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    const ddc = new TimeIntervalCollectionProperty();
    ddc.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: new DistanceDisplayCondition(1.0, 2.0),
      })
    );
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 2,
        semiMinorAxis: 1,
        material: Color.RED,
        distanceDisplayCondition: ddc,
      },
    });

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      let primitive = scene.groundPrimitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.distanceDisplayCondition).toEqualEpsilon(
        [1.0, 2.0],
        CesiumMath.EPSILON6
      );

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.groundPrimitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.distanceDisplayCondition).toEqual([0.0, Infinity]);

      batch.removeAllPrimitives();
    });
  });

  it("updates with sampled show out of range", function () {
    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    const show = new TimeIntervalCollectionProperty();
    show.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: true,
      })
    );
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 2,
        semiMinorAxis: 1,
        material: Color.RED,
        show: show,
      },
    });

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      let primitive = scene.groundPrimitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([1]);

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.groundPrimitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([0]);

      batch.removeAllPrimitives();
    });
  });

  it("shows only one primitive while rebuilding primitive", function () {
    if (!GroundPrimitive.isSupported(scene)) {
      return;
    }

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    function renderScene() {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    const entity1 = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });

    const entity2 = new Entity({
      position: new Cartesian3(1234, 4678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });

    const updater1 = new EllipseGeometryUpdater(entity1, scene);
    const updater2 = new EllipseGeometryUpdater(entity2, scene);

    batch.add(time, updater1);
    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        expect(primitive.show).toBeTruthy();
      })
      .then(function () {
        batch.add(time, updater2);
      })
      .then(function () {
        return pollToPromise(function () {
          renderScene();
          return scene.groundPrimitives.length === 2;
        });
      })
      .then(function () {
        let showCount = 0;
        expect(scene.groundPrimitives.length).toEqual(2);
        showCount += !!scene.groundPrimitives.get(0).show;
        showCount += !!scene.groundPrimitives.get(1).show;
        expect(showCount).toEqual(1);
      })
      .then(function () {
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        expect(primitive.show).toBeTruthy();

        batch.removeAllPrimitives();
      });
  });

  it("has correct show attribute after rebuilding primitive", function () {
    if (!GroundPrimitive.isSupported(scene)) {
      return;
    }

    const batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    function renderScene() {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    const entity1 = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });
    const updater1 = new EllipseGeometryUpdater(entity1, scene);
    batch.add(time, updater1);

    const entity2 = new Entity({
      position: new Cartesian3(1234, 4678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });
    const updater2 = new EllipseGeometryUpdater(entity2, scene);

    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([1]);

        entity1.show = false;
        updater1._onEntityPropertyChanged(entity1, "isShowing");
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        batch.add(time, updater2);
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        const primitive = scene.groundPrimitives.get(0);
        let attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        attributes = primitive.getGeometryInstanceAttributes(entity2);
        expect(attributes.show).toEqual([1]);

        batch.removeAllPrimitives();
      });
  });
});
