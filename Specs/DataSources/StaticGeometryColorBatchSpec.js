import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { CallbackProperty } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { EllipseGeometryUpdater } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { PolylineGeometryUpdater } from "../../Source/Cesium.js";
import { StaticGeometryColorBatch } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";
import { PerInstanceColorAppearance } from "../../Source/Cesium.js";
import { PolylineColorAppearance } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe("DataSources/StaticGeometryColorBatch", function () {
  const time = JulianDate.now();
  let scene;
  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("updates color attribute after rebuilding geometry primitive", function () {
    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
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
        height: 0,
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
      expect(scene.primitives.length).toEqual(1);
      const primitive = scene.primitives.get(0);
      const attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.color).toEqual([255, 0, 0, 255]);

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
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes.color).toEqual([0, 128, 0, 255]);
        batch.removeAllPrimitives();
      });
    });
  });

  it("updates with sampled color out of range", function () {
    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    const color = new TimeIntervalCollectionProperty();
    color.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: Color.RED,
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
        extrudedHeight: 20,
        material: new ColorMaterialProperty(color),
      },
    });

    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      let primitive = scene.primitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.color).toEqual([255, 0, 0, 255]);

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.primitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.color).toEqual([255, 255, 255, 255]);

      batch.removeAllPrimitives();
    });
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
        extrudedHeight: 20,
        material: Color.RED,
        distanceDisplayCondition: ddc,
      },
    });

    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      let primitive = scene.primitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.distanceDisplayCondition).toEqualEpsilon(
        [1.0, 2.0],
        CesiumMath.EPSILON6
      );

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.primitives.get(0);
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
        extrudedHeight: 20,
        show: show,
      },
    });

    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    const updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      let primitive = scene.primitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([1]);

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.primitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([0]);

      batch.removeAllPrimitives();
    });
  });

  it("updates color attribute after rebuilding polyline primitive", function () {
    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PolylineColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    const entity = new Entity({
      polyline: {
        positions: [
          Cartesian3.fromDegrees(0.0, 0.0),
          Cartesian3.fromDegrees(0.0, 1.0),
        ],
        material: Color.RED,
      },
    });

    const updater = new PolylineGeometryUpdater(entity, scene);
    batch.add(time, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      const primitive = scene.primitives.get(0);
      const attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.color).toEqual([255, 0, 0, 255]);

      entity.polyline.material = Color.GREEN;
      batch.remove(updater);
      batch.add(time, updater);
      return pollToPromise(function () {
        scene.initializeFrame();
        const isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(attributes.color).toEqual([0, 128, 0, 255]);
        batch.removeAllPrimitives();
      });
    });
  });

  it("updates with sampled depth fail color out of range", function () {
    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const color = new TimeIntervalCollectionProperty();
    color.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: Color.RED,
      })
    );
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      polyline: {
        positions: [
          Cartesian3.fromDegrees(0.0, 0.0),
          Cartesian3.fromDegrees(0.0, 1.0),
        ],
        material: Color.BLUE,
        depthFailMaterial: new ColorMaterialProperty(color),
      },
    });

    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PolylineColorAppearance,
      PolylineColorAppearance,
      false,
      ShadowMode.DISABLED
    );

    const updater = new PolylineGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      let primitive = scene.primitives.get(0);
      let attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.depthFailColor).toEqual([255, 0, 0, 255]);

      batch.update(time);
      scene.render(time);

      primitive = scene.primitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.depthFailColor).toEqual([255, 255, 255, 255]);

      batch.removeAllPrimitives();
    });
  });

  it("shows only one primitive while rebuilding primitive", function () {
    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    function buildEntity() {
      return new Entity({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: Color.RED.withAlpha(0.5),
          height: 0,
        },
      });
    }

    function renderScene() {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    const entity1 = buildEntity();
    const entity2 = buildEntity();

    const updater1 = new EllipseGeometryUpdater(entity1, scene);
    const updater2 = new EllipseGeometryUpdater(entity2, scene);

    batch.add(time, updater1);
    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        expect(primitive.show).toBeTruthy();
      })
      .then(function () {
        batch.add(time, updater2);
      })
      .then(function () {
        return pollToPromise(function () {
          renderScene();
          return scene.primitives.length === 2;
        });
      })
      .then(function () {
        let showCount = 0;
        expect(scene.primitives.length).toEqual(2);
        showCount += !!scene.primitives.get(0).show;
        showCount += !!scene.primitives.get(1).show;
        expect(showCount).toEqual(1);
      })
      .then(function () {
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        expect(primitive.show).toBeTruthy();
        batch.removeAllPrimitives();
      });
  });

  it("has correct show attribute after rebuilding primitive", function () {
    const batch = new StaticGeometryColorBatch(
      scene.primitives,
      PerInstanceColorAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    function buildEntity() {
      return new Entity({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          material: Color.RED.withAlpha(0.5),
          height: 0,
        },
      });
    }

    function renderScene() {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    const entity1 = buildEntity();
    const updater1 = new EllipseGeometryUpdater(entity1, scene);
    batch.add(time, updater1);

    const entity2 = buildEntity();
    const updater2 = new EllipseGeometryUpdater(entity2, scene);

    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([1]);

        entity1.show = false;
        updater1._onEntityPropertyChanged(entity1, "isShowing");
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        const attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        batch.add(time, updater2);
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        const primitive = scene.primitives.get(0);
        let attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        attributes = primitive.getGeometryInstanceAttributes(entity2);
        expect(attributes.show).toEqual([1]);

        batch.removeAllPrimitives();
      });
  });
});
