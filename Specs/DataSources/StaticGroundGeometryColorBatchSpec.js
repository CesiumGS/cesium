import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { EllipseGeometryUpdater } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { StaticGroundGeometryColorBatch } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";
import { ClassificationType } from "../../Source/Cesium.js";
import { GroundPrimitive } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe("DataSources/StaticGroundGeometryColorBatch", function () {
  var time = JulianDate.now();
  var scene;
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

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );
    var entity = new Entity({
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

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(time, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      var primitive = scene.groundPrimitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
      var red = [255, 0, 0, 255];
      expect(attributes.color).toEqual(red);

      // Verify we have 1 batch
      expect(batch._batches.length).toEqual(1);

      entity.ellipse.material = Color.GREEN;
      updater._onEntityPropertyChanged(entity, "ellipse");
      batch.remove(updater);
      batch.add(time, updater);
      return pollToPromise(function () {
        scene.initializeFrame();
        var isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        var primitive = scene.groundPrimitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity);
        var green = [0, 128, 0, 255];
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

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );
    var entity = new Entity({
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

    var entity2 = new Entity({
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

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(time, updater);

    var updater2 = new EllipseGeometryUpdater(entity2, scene);
    batch.add(time, updater2);

    expect(batch._batches.length).toEqual(2);
  });

  it("updates with sampled distance display condition out of range", function () {
    var validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    var outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    var ddc = new TimeIntervalCollectionProperty();
    ddc.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: new DistanceDisplayCondition(1.0, 2.0),
      })
    );
    var entity = new Entity({
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

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      var primitive = scene.groundPrimitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
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
    var validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    var outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    var show = new TimeIntervalCollectionProperty();
    show.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: true,
      })
    );
    var entity = new Entity({
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

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      var primitive = scene.groundPrimitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
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

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    function renderScene() {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    var entity1 = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });

    var entity2 = new Entity({
      position: new Cartesian3(1234, 4678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });

    var updater1 = new EllipseGeometryUpdater(entity1, scene);
    var updater2 = new EllipseGeometryUpdater(entity2, scene);

    batch.add(time, updater1);
    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        var primitive = scene.groundPrimitives.get(0);
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
        var showCount = 0;
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
        var primitive = scene.groundPrimitives.get(0);
        expect(primitive.show).toBeTruthy();

        batch.removeAllPrimitives();
      });
  });

  it("has correct show attribute after rebuilding primitive", function () {
    if (!GroundPrimitive.isSupported(scene)) {
      return;
    }

    var batch = new StaticGroundGeometryColorBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH
    );

    function renderScene() {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    var entity1 = new Entity({
      position: new Cartesian3(1234, 5678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });
    var updater1 = new EllipseGeometryUpdater(entity1, scene);
    batch.add(time, updater1);

    var entity2 = new Entity({
      position: new Cartesian3(1234, 4678, 9101112),
      ellipse: {
        semiMajorAxis: 0.2,
        semiMinorAxis: 0.1,
        outline: true,
        outlineColor: Color.RED.withAlpha(0.5),
      },
    });
    var updater2 = new EllipseGeometryUpdater(entity2, scene);

    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        var primitive = scene.groundPrimitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([1]);

        entity1.show = false;
        updater1._onEntityPropertyChanged(entity1, "isShowing");
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        var primitive = scene.groundPrimitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        batch.add(time, updater2);
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);
        var primitive = scene.groundPrimitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        attributes = primitive.getGeometryInstanceAttributes(entity2);
        expect(attributes.show).toEqual([1]);

        batch.removeAllPrimitives();
      });
  });
});
