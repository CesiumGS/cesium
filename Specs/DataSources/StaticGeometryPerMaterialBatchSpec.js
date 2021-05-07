import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { BoxGeometryUpdater } from "../../Source/Cesium.js";
import { CheckerboardMaterialProperty } from "../../Source/Cesium.js";
import { ColorMaterialProperty } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { EllipseGeometryUpdater } from "../../Source/Cesium.js";
import { EllipseGraphics } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { GridMaterialProperty } from "../../Source/Cesium.js";
import { PolylineArrowMaterialProperty } from "../../Source/Cesium.js";
import { PolylineGeometryUpdater } from "../../Source/Cesium.js";
import { PolylineGraphics } from "../../Source/Cesium.js";
import { StaticGeometryPerMaterialBatch } from "../../Source/Cesium.js";
import { StripeMaterialProperty } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";
import { MaterialAppearance } from "../../Source/Cesium.js";
import { PolylineColorAppearance } from "../../Source/Cesium.js";
import { PolylineMaterialAppearance } from "../../Source/Cesium.js";
import { ShadowMode } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe("DataSources/StaticGeometryPerMaterialBatch", function () {
  var time = JulianDate.now();
  var scene;
  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  it("handles shared material being invalidated with geometry", function () {
    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    var ellipse = new EllipseGraphics();
    ellipse.semiMajorAxis = new ConstantProperty(2);
    ellipse.semiMinorAxis = new ConstantProperty(1);
    ellipse.material = new GridMaterialProperty();

    var entity = new Entity();
    entity.position = new ConstantPositionProperty(
      new Cartesian3(1234, 5678, 9101112)
    );
    entity.ellipse = ellipse;

    var ellipse2 = new EllipseGraphics();
    ellipse2.semiMajorAxis = new ConstantProperty(3);
    ellipse2.semiMinorAxis = new ConstantProperty(2);
    ellipse2.material = new GridMaterialProperty();

    var entity2 = new Entity();
    entity2.position = new ConstantPositionProperty(
      new Cartesian3(1234, 5678, 9101112)
    );
    entity2.ellipse = ellipse2;

    var updater = new EllipseGeometryUpdater(entity, scene);
    var updater2 = new EllipseGeometryUpdater(entity2, scene);
    batch.add(time, updater);
    batch.add(time, updater2);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      ellipse.material.cellAlpha = new ConstantProperty(0.5);

      return pollToPromise(function () {
        scene.initializeFrame();
        var isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.primitives.length).toEqual(2);
        batch.removeAllPrimitives();
      });
    });
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
        extrudedHeight: 20,
        material: new GridMaterialProperty(),
        distanceDisplayCondition: ddc,
      },
    });

    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      var primitive = scene.primitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
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
        extrudedHeight: 20,
        material: new GridMaterialProperty(),
        show: show,
      },
    });

    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    var updater = new EllipseGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      var primitive = scene.primitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([1]);

      batch.update(outOfRangeTime);
      scene.render(outOfRangeTime);

      primitive = scene.primitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.show).toEqual([0]);

      batch.removeAllPrimitives();
    });
  });

  it("handles shared material being invalidated for polyline", function () {
    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      PolylineMaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    var polyline = new PolylineGraphics();
    polyline.positions = new ConstantProperty([
      Cartesian3.fromDegrees(0.0, 0.0),
      Cartesian3.fromDegrees(0.0, 1.0),
    ]);
    polyline.material = new PolylineArrowMaterialProperty();

    var entity = new Entity();
    entity.polyline = polyline;

    var polyline2 = new PolylineGraphics();
    polyline2.positions = new ConstantProperty([
      Cartesian3.fromDegrees(0.0, 0.0),
      Cartesian3.fromDegrees(0.0, 1.0),
    ]);
    polyline2.material = new PolylineArrowMaterialProperty();

    var entity2 = new Entity();
    entity2.polyline = polyline2;

    var updater = new PolylineGeometryUpdater(entity, scene);
    var updater2 = new PolylineGeometryUpdater(entity2, scene);
    batch.add(time, updater);
    batch.add(time, updater2);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      polyline.material.color = new ConstantProperty(Color.RED);

      return pollToPromise(function () {
        scene.initializeFrame();
        var isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.primitives.length).toEqual(2);
        batch.removeAllPrimitives();
      });
    });
  });

  it("updates with sampled depth fail color out of range", function () {
    var validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    var color = new TimeIntervalCollectionProperty();
    color.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: Color.RED,
      })
    );
    var entity = new Entity({
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
        material: new PolylineArrowMaterialProperty(),
        depthFailMaterial: new ColorMaterialProperty(color),
      },
    });

    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      PolylineMaterialAppearance,
      PolylineColorAppearance,
      false,
      ShadowMode.DISABLED
    );

    var updater = new PolylineGeometryUpdater(entity, scene);
    batch.add(validTime, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      var isUpdated = batch.update(validTime);
      scene.render(validTime);
      return isUpdated;
    }).then(function () {
      expect(scene.primitives.length).toEqual(1);
      var primitive = scene.primitives.get(0);
      var attributes = primitive.getGeometryInstanceAttributes(entity);
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
    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    function buildEntity() {
      var material = new GridMaterialProperty({
        color: Color.YELLOW,
        cellAlpha: 0.3,
        lineCount: new Cartesian2(8, 8),
        lineThickness: new Cartesian2(2.0, 2.0),
      });

      return new Entity({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          height: 0,
          material: material,
        },
      });
    }

    function renderScene() {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    var entity1 = buildEntity();
    var entity2 = buildEntity();

    var updater1 = new EllipseGeometryUpdater(entity1, scene);
    var updater2 = new EllipseGeometryUpdater(entity2, scene);

    batch.add(time, updater1);
    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        var primitive = scene.primitives.get(0);
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
        var showCount = 0;
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
        var primitive = scene.primitives.get(0);
        expect(primitive.show).toBeTruthy();

        batch.removeAllPrimitives();
      });
  });

  it("removes all updaters", function () {
    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    function buildEntity(MaterialProperty) {
      var material = new MaterialProperty({
        evenColor: Color.YELLOW,
        oddColor: Color.BLUE,
      });

      return new Entity({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          height: 0,
          material: material,
        },
      });
    }

    function renderScene() {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    var entity1 = buildEntity(StripeMaterialProperty);
    var entity2 = buildEntity(CheckerboardMaterialProperty);
    var entity3 = buildEntity(StripeMaterialProperty);
    var entity4 = buildEntity(CheckerboardMaterialProperty);

    var updater1 = new EllipseGeometryUpdater(entity1, scene);
    var updater2 = new EllipseGeometryUpdater(entity2, scene);
    var updater3 = new EllipseGeometryUpdater(entity3, scene);
    var updater4 = new EllipseGeometryUpdater(entity4, scene);
    var emptyUpdater = new BoxGeometryUpdater(entity1, scene);

    batch.add(time, updater1);
    batch.add(time, updater2);
    batch.add(time, updater3);
    batch.add(time, updater4);
    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.primitives.length).toEqual(2);
      })
      .then(function () {
        batch.remove(updater1);
        batch.remove(updater2);
        batch.remove(emptyUpdater);
        batch.remove(updater3);
        batch.remove(updater4);
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(0);
        batch.removeAllPrimitives();
      });
  });

  it("has correct show attribute after rebuilding primitive", function () {
    var batch = new StaticGeometryPerMaterialBatch(
      scene.primitives,
      MaterialAppearance,
      undefined,
      false,
      ShadowMode.DISABLED
    );

    function buildEntity() {
      var material = new GridMaterialProperty({
        color: Color.YELLOW,
        cellAlpha: 0.3,
        lineCount: new Cartesian2(8, 8),
        lineThickness: new Cartesian2(2.0, 2.0),
      });

      return new Entity({
        position: new Cartesian3(1234, 5678, 9101112),
        ellipse: {
          semiMajorAxis: 2,
          semiMinorAxis: 1,
          height: 0,
          material: material,
        },
      });
    }

    function renderScene() {
      scene.initializeFrame();
      var isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    var entity1 = buildEntity();
    var updater1 = new EllipseGeometryUpdater(entity1, scene);
    batch.add(time, updater1);

    var entity2 = buildEntity();
    var updater2 = new EllipseGeometryUpdater(entity2, scene);

    return pollToPromise(renderScene)
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([1]);

        entity1.show = false;
        updater1._onEntityPropertyChanged(entity1, "isShowing");
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        batch.add(time, updater2);
        return pollToPromise(renderScene);
      })
      .then(function () {
        expect(scene.primitives.length).toEqual(1);
        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(entity1);
        expect(attributes.show).toEqual([0]);

        attributes = primitive.getGeometryInstanceAttributes(entity2);
        expect(attributes.show).toEqual([1]);

        batch.removeAllPrimitives();
      });
  });
});
