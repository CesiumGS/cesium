import {
  ApproximateTerrainHeights,
  BoundingSphere,
  Cartesian3,
  Color,
  defined,
  DistanceDisplayCondition,
  JulianDate,
  TimeInterval,
  TimeIntervalCollection,
  BoundingSphereState,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  PolylineGeometryUpdater,
  PolylineGraphics,
  PolylineOutlineMaterialProperty,
  StaticGroundPolylinePerMaterialBatch,
  TimeIntervalCollectionProperty,
  ClassificationType,
  GroundPolylinePrimitive,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("DataSources/StaticGroundPolylinePerMaterialBatch", function () {
  const time = JulianDate.now();
  let batch;
  let scene;
  beforeAll(function () {
    scene = createScene();

    return GroundPolylinePrimitive.initializeTerrainHeights();
  });

  afterAll(function () {
    scene.destroyForSpecs();

    GroundPolylinePrimitive._initPromise = undefined;
    GroundPolylinePrimitive._initialized = false;

    ApproximateTerrainHeights._initPromise = undefined;
    ApproximateTerrainHeights._terrainHeights = undefined;
  });

  afterEach(function () {
    if (defined(batch)) {
      batch.removeAllPrimitives();
      batch = undefined;
    }
  });

  function createGroundPolyline() {
    const polyline = new PolylineGraphics();
    polyline.clampToGround = new ConstantProperty(true);
    polyline.positions = new ConstantProperty(
      Cartesian3.fromDegreesArray([0, 0, 0.1, 0, 0.1, 0.1, 0, 0.1])
    );
    return polyline;
  }

  it("handles shared material being invalidated with geometry", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const polyline1 = createGroundPolyline();
    polyline1.material = new PolylineOutlineMaterialProperty();

    const entity = new Entity({
      polyline: polyline1,
    });

    const polyline2 = createGroundPolyline();
    polyline2.material = new PolylineOutlineMaterialProperty();

    const entity2 = new Entity({
      polyline: polyline2,
    });

    const updater = new PolylineGeometryUpdater(entity, scene);
    const updater2 = new PolylineGeometryUpdater(entity2, scene);
    batch.add(time, updater);
    batch.add(time, updater2);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);
      polyline1.material.outlineWidth = new ConstantProperty(0.5);

      return pollToPromise(function () {
        scene.initializeFrame();
        const isUpdated = batch.update(time);
        scene.render(time);
        return isUpdated;
      }).then(function () {
        expect(scene.groundPrimitives.length).toEqual(2);
        batch.removeAllPrimitives();
      });
    });
  });

  it("updates with sampled color out of range", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const color = new TimeIntervalCollectionProperty();
    color.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: Color.RED,
      })
    );
    const polyline = createGroundPolyline();
    polyline.material = new ColorMaterialProperty(color);
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      polyline: polyline,
    });

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const updater = new PolylineGeometryUpdater(entity, scene);
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
      expect(attributes.color).toEqual([255, 0, 0, 255]);

      batch.update(time);
      scene.render(time);

      primitive = scene.groundPrimitives.get(0);
      attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(attributes.color).toEqual([255, 255, 255, 255]);

      batch.removeAllPrimitives();
    });
  });

  it("updates with sampled distance display condition out of range", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }
    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    const ddc = new TimeIntervalCollectionProperty();
    ddc.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: new DistanceDisplayCondition(1.0, 2.0),
      })
    );

    const polyline = createGroundPolyline();
    polyline.distanceDisplayCondition = ddc;
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      polyline: polyline,
    });

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const updater = new PolylineGeometryUpdater(entity, scene);
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

  it("updates with sampled color out of range", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    const validTime = JulianDate.fromIso8601("2018-02-14T04:10:00+1100");
    const outOfRangeTime = JulianDate.fromIso8601("2018-02-14T04:20:00+1100");
    const show = new TimeIntervalCollectionProperty();
    show.intervals.addInterval(
      TimeInterval.fromIso8601({
        iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100",
        data: true,
      })
    );
    const polyline = createGroundPolyline();
    polyline.show = show;
    const entity = new Entity({
      availability: new TimeIntervalCollection([
        TimeInterval.fromIso8601({
          iso8601: "2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100",
        }),
      ]),
      polyline: polyline,
    });

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      false
    );

    const updater = new PolylineGeometryUpdater(entity, scene);
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
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    function buildEntity() {
      const polyline = createGroundPolyline();
      polyline.material = new PolylineOutlineMaterialProperty({
        color: Color.ORANGE,
        outlineWidth: 2,
        outlineColor: Color.BLACK,
      });

      return new Entity({
        polyline: polyline,
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

    const updater1 = new PolylineGeometryUpdater(entity1, scene);
    const updater2 = new PolylineGeometryUpdater(entity2, scene);

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

  it("batches entities that both use color materials", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );
    const polyline1 = createGroundPolyline();
    polyline1.material = Color.RED;
    const entity = new Entity({
      polyline: polyline1,
    });

    const polyline2 = createGroundPolyline();
    polyline2.material = Color.RED;
    const entity2 = new Entity({
      polyline: polyline2,
    });

    const updater = new PolylineGeometryUpdater(entity, scene);
    const updater2 = new PolylineGeometryUpdater(entity2, scene);
    batch.add(time, updater);
    batch.add(time, updater2);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);

      batch.removeAllPrimitives();
    });
  });

  it("batches entities with the same material but different Z indices separately", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const polyline1 = createGroundPolyline();
    polyline1.material = new PolylineOutlineMaterialProperty();
    polyline1.zIndex = 0;

    const entity = new Entity({
      polyline: polyline1,
    });

    const polyline2 = createGroundPolyline();
    polyline2.material = new PolylineOutlineMaterialProperty();
    polyline2.zIndex = 1;

    const entity2 = new Entity({
      polyline: polyline2,
    });

    const updater = new PolylineGeometryUpdater(entity, scene);
    const updater2 = new PolylineGeometryUpdater(entity2, scene);
    batch.add(time, updater);
    batch.add(time, updater2);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(2);

      batch.removeAllPrimitives();
    });
  });

  it("removes entities", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const polyline1 = createGroundPolyline();
    polyline1.material = new PolylineOutlineMaterialProperty();

    const entity = new Entity({
      polyline: polyline1,
    });

    const updater = new PolylineGeometryUpdater(entity, scene);
    batch.add(time, updater);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(1);

        batch.remove(updater);

        return pollToPromise(function () {
          scene.initializeFrame();
          const isUpdated = batch.update(time);
          scene.render(time);
          return isUpdated;
        });
      })
      .then(function () {
        expect(scene.groundPrimitives.length).toEqual(0);
        batch.removeAllPrimitives();
      });
  });

  it("gets bounding spheres", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }

    const resultSphere = new BoundingSphere();
    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    const polyline1 = createGroundPolyline();
    polyline1.material = new PolylineOutlineMaterialProperty();

    const entity = new Entity({
      polyline: polyline1,
    });

    const updater = new PolylineGeometryUpdater(entity, scene);

    let state = batch.getBoundingSphere(updater, resultSphere);
    expect(state).toEqual(BoundingSphereState.FAILED);

    batch.add(time, updater);

    batch.update(time);
    state = batch.getBoundingSphere(updater, resultSphere);
    expect(state).toEqual(BoundingSphereState.PENDING);

    return pollToPromise(function () {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }).then(function () {
      expect(scene.groundPrimitives.length).toEqual(1);

      state = batch.getBoundingSphere(updater, resultSphere);
      expect(state).toEqual(BoundingSphereState.DONE);

      batch.removeAllPrimitives();
    });
  });

  it("has correct show attribute after rebuilding primitive", function () {
    if (!GroundPolylinePrimitive.isSupported(scene)) {
      // Don't fail if GroundPolylinePrimitive is not supported
      return;
    }
    batch = new StaticGroundPolylinePerMaterialBatch(
      scene.groundPrimitives,
      ClassificationType.BOTH,
      false
    );

    function buildEntity() {
      const polyline = createGroundPolyline();
      polyline.material = new PolylineOutlineMaterialProperty({
        color: Color.ORANGE,
        outlineWidth: 2,
        outlineColor: Color.BLACK,
      });

      return new Entity({
        polyline: polyline,
      });
    }

    function renderScene() {
      scene.initializeFrame();
      const isUpdated = batch.update(time);
      scene.render(time);
      return isUpdated;
    }

    const entity1 = buildEntity();
    const updater1 = new PolylineGeometryUpdater(entity1, scene);
    batch.add(time, updater1);

    const entity2 = buildEntity();
    const updater2 = new PolylineGeometryUpdater(entity2, scene);

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
