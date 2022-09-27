import {
  ApproximateTerrainHeights,
  ArcType,
  BoundingSphere,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  defined,
  DistanceDisplayCondition,
  DistanceDisplayConditionGeometryInstanceAttribute,
  GroundPolylineGeometry,
  JulianDate,
  PolylinePipeline,
  ShowGeometryInstanceAttribute,
  TimeInterval,
  TimeIntervalCollection,
  BoundingSphereState,
  CallbackProperty,
  ColorMaterialProperty,
  ConstantProperty,
  Entity,
  GridMaterialProperty,
  PolylineGeometryUpdater,
  PolylineGraphics,
  PropertyArray,
  SampledPositionProperty,
  SampledProperty,
  TimeIntervalCollectionProperty,
  Globe,
  GroundPolylinePrimitive,
  ShadowMode,
} from "../../index.js";

import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "DataSources/PolylineGeometryUpdater",
  function () {
    let scene;
    beforeAll(function () {
      scene = createScene();
      scene.globe = new Globe();
      return GroundPolylinePrimitive.initializeTerrainHeights();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      GroundPolylinePrimitive._initPromise = undefined;
      GroundPolylinePrimitive._initialized = false;

      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    const time = JulianDate.now();

    const basicPositions = Cartesian3.fromRadiansArray([
      0,
      0,
      1,
      0,
      1,
      1,
      0,
      1,
    ]);
    function createBasicPolyline() {
      const polyline = new PolylineGraphics();
      polyline.positions = new ConstantProperty(basicPositions);
      const entity = new Entity();
      entity.polyline = polyline;
      return entity;
    }

    it("Constructor sets expected defaults", function () {
      const entity = new Entity();
      const updater = new PolylineGeometryUpdater(entity, scene);

      expect(updater.isDestroyed()).toBe(false);
      expect(updater.entity).toBe(entity);
      expect(updater.isClosed).toBe(false);
      expect(updater.fillEnabled).toBe(false);
      expect(updater.fillMaterialProperty).toBe(undefined);
      expect(updater.depthFailMaterialProperty).toBe(undefined);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.hasConstantFill).toBe(true);
      expect(updater.hasConstantOutline).toBe(true);
      expect(updater.outlineColorProperty).toBe(undefined);
      expect(updater.shadowsProperty).toBe(undefined);
      expect(updater.distanceDisplayConditionProperty).toBe(undefined);
      expect(updater.isDynamic).toBe(false);
      expect(updater.clampToGround).toBe(false);
      expect(updater.arcType).toBe(undefined);
      expect(updater.zIndex).toBe(0);

      expect(updater.isOutlineVisible(time)).toBe(false);
      expect(updater.isFilled(time)).toBe(false);
      updater.destroy();
      expect(updater.isDestroyed()).toBe(true);
    });

    it("No geometry available when polyline is undefined ", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline = undefined;

      expect(updater.fillEnabled).toBe(false);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.isDynamic).toBe(false);
    });

    it("No geometry available when not shown.", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.show = new ConstantProperty(false);

      expect(updater.fillEnabled).toBe(false);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.isDynamic).toBe(false);
    });

    it("Values correct when using default graphics", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);

      expect(updater.isClosed).toBe(false);
      expect(updater.fillEnabled).toBe(true);
      expect(updater.fillMaterialProperty).toEqual(
        new ColorMaterialProperty(Color.WHITE)
      );
      expect(updater.depthFailMaterialProperty).toBe(undefined);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.hasConstantFill).toBe(true);
      expect(updater.hasConstantOutline).toBe(true);
      expect(updater.outlineColorProperty).toBe(undefined);
      expect(updater.shadowsProperty).toEqual(
        new ConstantProperty(ShadowMode.DISABLED)
      );
      expect(updater.distanceDisplayConditionProperty).toEqual(
        new ConstantProperty(new DistanceDisplayCondition())
      );
      expect(updater.isDynamic).toBe(false);
      expect(updater.clampToGround).toBe(false);
      expect(updater.arcType).toBe(undefined);
      expect(updater.zIndex).toEqual(new ConstantProperty(0));
    });

    it("Polyline material is correctly exposed.", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.material = new ColorMaterialProperty();
      expect(updater.fillMaterialProperty).toBe(entity.polyline.material);
    });

    it("Polyline depth fail material is correctly exposed.", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.depthFailMaterial = new ColorMaterialProperty();
      expect(updater.depthFailMaterialProperty).toBe(
        entity.polyline.depthFailMaterial
      );
    });

    it("A time-varying positions causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      const point1 = new SampledPositionProperty();
      point1.addSample(time, new Cartesian3());
      const point2 = new SampledPositionProperty();
      point2.addSample(time, new Cartesian3());
      const point3 = new SampledPositionProperty();
      point3.addSample(time, new Cartesian3());

      entity.polyline.positions = new PropertyArray();
      entity.polyline.positions.setValue([point1, point2, point3]);
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying width causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.width = new SampledProperty(Number);
      entity.polyline.width.addSample(time, 1);
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying arcType causes geometry to be dynamic", function () {
      const arcType = new TimeIntervalCollectionProperty();
      arcType.intervals.addInterval(
        new TimeInterval({
          start: new JulianDate(0, 0),
          stop: new JulianDate(10, 0),
          data: ArcType.NONE,
        })
      );

      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.arcType = arcType;
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.granularity = new SampledProperty(Number);
      entity.polyline.granularity.addSample(time, 1);
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying clampToGround causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.clampToGround = new SampledProperty(Number);
      entity.polyline.clampToGround.addSample(time, true);
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying arcType causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.arcType = new SampledProperty(Number);
      entity.polyline.arcType.addSample(time, 1);
      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying zIndex causes geometry to be dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      entity.polyline.zIndex = new SampledProperty(Number);
      entity.polyline.zIndex.addSample(time, 1);
      expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
      const entity = createBasicPolyline();
      const clampToGround = options.clampToGround;

      const polyline = entity.polyline;
      polyline.show = new ConstantProperty(options.show);
      polyline.material = options.material;
      polyline.depthFailMaterial = options.depthFailMaterial;

      polyline.width = new ConstantProperty(options.width);
      polyline.granularity = new ConstantProperty(options.granularity);
      polyline.distanceDisplayCondition = options.distanceDisplayCondition;
      polyline.clampToGround = new ConstantProperty(clampToGround);
      polyline.arcType = new ConstantProperty(options.arcType);

      const updater = new PolylineGeometryUpdater(entity, scene);

      const instance = updater.createFillGeometryInstance(time);
      const geometry = instance.geometry;
      const attributes = instance.attributes;

      if (clampToGround) {
        expect(geometry.width).toEqual(options.width);
      } else {
        expect(geometry._width).toEqual(options.width);
        if (defined(options.arcType)) {
          expect(geometry._arcType).toEqual(options.arcType);
        }
        expect(geometry._granularity).toEqual(options.granularity);

        if (
          options.depthFailMaterial &&
          options.depthFailMaterial instanceof ColorMaterialProperty
        ) {
          expect(attributes.depthFailColor.value).toEqual(
            ColorGeometryInstanceAttribute.toValue(
              options.depthFailMaterial.color.getValue(time)
            )
          );
        } else {
          expect(attributes.depthFailColor).toBeUndefined();
        }
      }

      if (options.material instanceof ColorMaterialProperty) {
        expect(attributes.color.value).toEqual(
          ColorGeometryInstanceAttribute.toValue(
            options.material.color.getValue(time)
          )
        );
      } else {
        expect(attributes.color).toBeUndefined();
      }
      expect(attributes.show.value).toEqual(
        ShowGeometryInstanceAttribute.toValue(options.show)
      );
      if (options.distanceDisplayCondition) {
        expect(attributes.distanceDisplayCondition.value).toEqual(
          DistanceDisplayConditionGeometryInstanceAttribute.toValue(
            options.distanceDisplayCondition
          )
        );
      }
    }

    it("Creates expected per-color geometry", function () {
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        width: 3,
        clampToGround: false,
        granularity: 1.0,
        arcType: ArcType.NONE,
      });

      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      // On terrain
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        width: 3,
        clampToGround: true,
        granularity: 1.0,
        arcType: ArcType.GEODESIC,
      });
    });

    it("Creates expected per-color geometry with color depth fail appearance", function () {
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        depthFailMaterial: new ColorMaterialProperty(Color.BLUE),
        width: 3,
        clampToGround: false,
        granularity: 1.0,
        arcType: ArcType.GEODESIC,
      });
    });

    it("Creates expected per-color geometry with material depth fail appearance", function () {
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        depthFailMaterial: new GridMaterialProperty(),
        width: 3,
        clampToGround: false,
        granularity: 1.0,
        arcType: ArcType.RHUMB,
      });
    });

    it("Creates expected per-material geometry", function () {
      validateGeometryInstance({
        show: true,
        material: new GridMaterialProperty(),
        width: 4,
        clampToGround: false,
        granularity: 0.5,
        arcType: ArcType.GEODESIC,
      });

      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      // On terrain
      validateGeometryInstance({
        show: true,
        material: new GridMaterialProperty(),
        width: 4,
        clampToGround: true,
        granularity: 0.5,
        arcType: ArcType.GEODESIC,
      });
    });

    it("Creates expected per-material geometry with color depth fail appearance", function () {
      validateGeometryInstance({
        show: true,
        material: new GridMaterialProperty(),
        depthFailMaterial: new ColorMaterialProperty(Color.BLUE),
        width: 4,
        clampToGround: false,
        granularity: 0.5,
      });
    });

    it("Creates expected per-material geometry with color depth fail appearance", function () {
      validateGeometryInstance({
        show: true,
        material: new GridMaterialProperty(),
        depthFailMaterial: new GridMaterialProperty(),
        width: 4,
        clampToGround: false,
        granularity: 0.5,
      });
    });

    it("Creates expected distance display condition geometry", function () {
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        width: 3,
        clampToGround: false,
        granularity: 1.0,
        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
      });

      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      // On terrain
      validateGeometryInstance({
        show: true,
        material: new ColorMaterialProperty(Color.RED),
        width: 3,
        clampToGround: true,
        granularity: 1.0,
        distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
      });
    });

    it("Attributes have expected values at creation time", function () {
      const time1 = new JulianDate(0, 0);
      const time2 = new JulianDate(10, 0);
      const time3 = new JulianDate(20, 0);

      const show = new TimeIntervalCollectionProperty();
      show.intervals.addInterval(
        new TimeInterval({
          start: time1,
          stop: time2,
          data: false,
        })
      );
      show.intervals.addInterval(
        new TimeInterval({
          start: time2,
          stop: time3,
          isStartIncluded: false,
          data: true,
        })
      );

      const colorMaterial = new ColorMaterialProperty();
      colorMaterial.color = new SampledProperty(Color);
      colorMaterial.color.addSample(time, Color.YELLOW);
      colorMaterial.color.addSample(time2, Color.BLUE);
      colorMaterial.color.addSample(time3, Color.RED);

      const entity = createBasicPolyline();
      entity.polyline.show = show;
      entity.polyline.material = colorMaterial;

      const updater = new PolylineGeometryUpdater(entity, scene);

      const instance = updater.createFillGeometryInstance(time2);
      const attributes = instance.attributes;
      expect(attributes.color.value).toEqual(
        ColorGeometryInstanceAttribute.toValue(
          colorMaterial.color.getValue(time2)
        )
      );
      expect(attributes.show.value).toEqual(
        ShowGeometryInstanceAttribute.toValue(show.getValue(time2))
      );
    });

    it("createFillGeometryInstance obeys Entity.show is false.", function () {
      const entity = createBasicPolyline();
      entity.show = false;
      entity.polyline.fill = true;
      const updater = new PolylineGeometryUpdater(entity, scene);
      const instance = updater.createFillGeometryInstance(new JulianDate());
      const attributes = instance.attributes;
      expect(attributes.show.value).toEqual(
        ShowGeometryInstanceAttribute.toValue(false)
      );
    });

    it("dynamic updater sets properties", function () {
      const entity = new Entity();
      const polyline = new PolylineGraphics();
      entity.polyline = polyline;

      const time = new JulianDate(0, 0);
      const time2 = new JulianDate(10, 0);
      const time3 = new JulianDate(20, 0);

      const width = new SampledProperty(Number);
      width.addSample(time, 1);
      width.addSample(time2, 2);
      width.addSample(time3, 3);

      polyline.show = new ConstantProperty(true);
      polyline.width = width;
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0, 0, 0),
        Cartesian3.fromDegrees(0, 1, 0),
      ]);
      polyline.material = new ColorMaterialProperty(Color.RED);
      polyline.granularity = new ConstantProperty(0.001);
      polyline.arcType = new ConstantProperty(ArcType.NONE);

      const updater = new PolylineGeometryUpdater(entity, scene);

      const primitives = scene.primitives;
      expect(primitives.length).toBe(0);

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        scene.groundPrimitives
      );
      expect(dynamicUpdater.isDestroyed()).toBe(false);

      dynamicUpdater.update(time2);

      expect(primitives.length).toBe(1);
      const polylineCollection = primitives.get(0);
      const primitive = polylineCollection.get(0);

      expect(primitive.show).toEqual(true);
      expect(primitive.width).toEqual(2);
      expect(primitive.material.type).toEqual("Color");
      expect(primitive.material.uniforms.color).toEqual(Color.RED);
      expect(primitive.positions.length).toEqual(2);

      polyline.arcType = new ConstantProperty(ArcType.GEODESIC);
      dynamicUpdater.update(time3);

      expect(primitive.width).toEqual(3);
      expect(primitive.positions.length).toBeGreaterThan(2);

      dynamicUpdater.destroy();
      expect(primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);
      updater.destroy();
    });

    it("clampToGround can be dynamic", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const entity = new Entity();
      const polyline = new PolylineGraphics();
      entity.polyline = polyline;

      const time = new JulianDate(0, 0);

      let isClampedToGround = true;
      const clampToGround = new CallbackProperty(function () {
        return isClampedToGround;
      }, false);

      polyline.show = new ConstantProperty(true);
      polyline.width = new ConstantProperty(1.0);
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0, 0, 0),
        Cartesian3.fromDegrees(0, 1, 0),
      ]);
      polyline.material = new ColorMaterialProperty(Color.RED);
      polyline.granularity = new ConstantProperty(0.001);
      polyline.clampToGround = clampToGround;

      const updater = new PolylineGeometryUpdater(entity, scene);

      const groundPrimitives = scene.groundPrimitives;
      expect(groundPrimitives.length).toBe(0);

      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        groundPrimitives
      );
      expect(dynamicUpdater.isDestroyed()).toBe(false);
      expect(groundPrimitives.length).toBe(0);

      dynamicUpdater.update(time);

      expect(groundPrimitives.length).toBe(1);
      const primitive = groundPrimitives.get(0);

      expect(primitive.show).toEqual(true);

      isClampedToGround = false;
      dynamicUpdater.update(time);

      dynamicUpdater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(groundPrimitives.length).toBe(0);

      updater.destroy();
    });

    it("arcType can be dynamic", function () {
      const entity = new Entity();
      const polyline = new PolylineGraphics();
      entity.polyline = polyline;

      const time = new JulianDate(0, 0);

      let arcTypeVar = ArcType.GEODESIC;
      const arcType = new CallbackProperty(function () {
        return arcTypeVar;
      }, false);

      polyline.show = new ConstantProperty(true);
      polyline.width = new ConstantProperty(1.0);
      polyline.positions = new ConstantProperty([
        Cartesian3.fromDegrees(0, 0, 0),
        Cartesian3.fromDegrees(0, 1, 0),
      ]);
      polyline.material = new ColorMaterialProperty(Color.RED);
      polyline.granularity = new ConstantProperty(0.001);
      polyline.clampToGround = new ConstantProperty(false);
      polyline.arcType = arcType;

      const updater = new PolylineGeometryUpdater(entity, scene);

      const primitives = scene.primitives;
      expect(primitives.length).toBe(0);

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        scene.groundPrimitives
      );
      expect(dynamicUpdater.isDestroyed()).toBe(false);
      expect(primitives.length).toBe(0);

      dynamicUpdater.update(time);

      expect(primitives.length).toBe(1);
      const polylineCollection = primitives.get(0);
      const polylineObject = polylineCollection.get(0);

      expect(polylineObject.show).toEqual(true);

      const geodesicPolylinePositionsLength = polylineObject.positions.length;

      arcTypeVar = ArcType.NONE;
      dynamicUpdater.update(time);

      expect(polylineObject.positions.length).not.toEqual(
        geodesicPolylinePositionsLength
      );

      dynamicUpdater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(primitives.length).toBe(0);

      updater.destroy();
    });

    it("geometryChanged event is raised when expected", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      const listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.polyline.positions = new ConstantProperty(
        Cartesian3.fromRadiansArray([0, 0, 1, 0])
      );
      expect(listener.calls.count()).toEqual(1);

      entity.polyline.width = new ConstantProperty(82);
      expect(listener.calls.count()).toEqual(2);

      entity.availability = new TimeIntervalCollection();
      expect(listener.calls.count()).toEqual(3);

      entity.polyline.positions = undefined;
      expect(listener.calls.count()).toEqual(4);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.polyline.width = undefined;

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      expect(listener.calls.count()).toEqual(4);
    });

    it("createFillGeometryInstance throws if object is not shown", function () {
      const entity = new Entity();
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(function () {
        return updater.createFillGeometryInstance(time);
      }).toThrowDeveloperError();
    });

    it("createFillGeometryInstance throws if no time provided", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(function () {
        return updater.createFillGeometryInstance(undefined);
      }).toThrowDeveloperError();
    });

    it("createOutlineGeometryInstance throws", function () {
      const entity = new Entity();
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(function () {
        return updater.createOutlineGeometryInstance();
      }).toThrowDeveloperError();
    });

    it("createDynamicUpdater throws if not dynamic", function () {
      const entity = createBasicPolyline();
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(function () {
        return updater.createDynamicUpdater(
          scene.primitives,
          scene.groundPrimitives
        );
      }).toThrowDeveloperError();
      updater.destroy();
    });

    it("createDynamicUpdater throws if primitives undefined", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = new SampledProperty(Number);
      entity.polyline.width.addSample(time, 4);
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(updater.isDynamic).toBe(true);
      expect(function () {
        return updater.createDynamicUpdater(undefined, scene.groundPrimitives);
      }).toThrowDeveloperError();
      updater.destroy();
    });

    it("createDynamicUpdater throws if groundPrimitives undefined", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = new SampledProperty(Number);
      entity.polyline.width.addSample(time, 4);
      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(updater.isDynamic).toBe(true);
      expect(function () {
        return updater.createDynamicUpdater(scene.primitives);
      }).toThrowDeveloperError();
      updater.destroy();
    });

    it("dynamicUpdater.update throws if no time specified", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = new SampledProperty(Number);
      entity.polyline.width.addSample(time, 4);
      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );
      expect(function () {
        dynamicUpdater.update(undefined);
      }).toThrowDeveloperError();
      dynamicUpdater.destroy();
      updater.destroy();
    });

    it("Constructor throws if no entity supplied", function () {
      expect(function () {
        return new PolylineGeometryUpdater(undefined, scene);
      }).toThrowDeveloperError();
    });

    it("Constructor throws if no scene supplied", function () {
      const entity = new Entity();
      expect(function () {
        return new PolylineGeometryUpdater(entity, undefined);
      }).toThrowDeveloperError();
    });

    it("Computes dynamic geometry bounding sphere for fill.", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);

      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );
      dynamicUpdater.update(time);

      const result = new BoundingSphere(0);
      const state = dynamicUpdater.getBoundingSphere(result);
      expect(state).toBe(BoundingSphereState.DONE);

      const primitive = scene.primitives.get(0);
      const line = primitive.get(0);
      expect(result).toEqual(BoundingSphere.fromPoints(line.positions));

      dynamicUpdater.destroy();
      updater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);
    });

    it("Computes dynamic geometry bounding sphere on terrain.", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);
      entity.polyline.clampToGround = true;

      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );
      dynamicUpdater.update(time);

      const result = new BoundingSphere(0);
      let state = dynamicUpdater.getBoundingSphere(result);
      expect(state).toBe(BoundingSphereState.PENDING);

      return pollToPromise(function () {
        scene.initializeFrame();
        scene.render();
        state = dynamicUpdater.getBoundingSphere(result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        const primitive = scene.groundPrimitives.get(0);
        expect(state).toBe(BoundingSphereState.DONE);
        const attributes = primitive.getGeometryInstanceAttributes(entity);
        expect(result).toEqual(attributes.boundingSphere);

        dynamicUpdater.destroy();
        updater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(scene.groundPrimitives.length).toBe(0);
      });
    });

    it("Fails dynamic geometry bounding sphere for entity without billboard.", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);
      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );

      const result = new BoundingSphere();
      const state = dynamicUpdater.getBoundingSphere(result);
      expect(state).toBe(BoundingSphereState.FAILED);

      dynamicUpdater.destroy();
      updater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);
    });

    it("Compute dynamic geometry bounding sphere throws without result.", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);
      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );

      expect(function () {
        dynamicUpdater.getBoundingSphere(undefined);
      }).toThrowDeveloperError();

      dynamicUpdater.destroy();
      updater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);
    });

    it("calls generateCartesianRhumbArc for RHUMB arcType", function () {
      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);
      entity.polyline.arcType = ArcType.RHUMB;

      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );
      spyOn(PolylinePipeline, "generateCartesianRhumbArc").and.callThrough();
      dynamicUpdater.update(time);
      expect(PolylinePipeline.generateCartesianRhumbArc).toHaveBeenCalled();
      dynamicUpdater.destroy();
      updater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);
    });

    it("arcType GEODESIC with undefined globe does not call generateCartesianArc", function () {
      if (!Entity.supportsPolylinesOnTerrain(scene)) {
        return;
      }

      const entity = createBasicPolyline();
      entity.polyline.width = createDynamicProperty(1);
      scene.globe = undefined;
      const updater = new PolylineGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        scene.primitives,
        scene.groundPrimitives
      );
      spyOn(PolylinePipeline, "generateCartesianArc").and.callThrough();
      dynamicUpdater.update(time);
      expect(PolylinePipeline.generateCartesianArc).not.toHaveBeenCalled();
      dynamicUpdater.destroy();
      updater.destroy();

      expect(scene.primitives.length).toBe(0);
      expect(scene.groundPrimitives.length).toBe(0);

      scene.globe = new Globe();
    });

    it("clampToGround true without support for polylines on terrain does not generate GroundPolylineGeometry", function () {
      spyOn(Entity, "supportsPolylinesOnTerrain").and.callFake(function () {
        return false;
      });

      const entity = createBasicPolyline();

      const polyline = entity.polyline;
      polyline.show = new ConstantProperty(true);
      polyline.clampToGround = new ConstantProperty(true);

      const updater = new PolylineGeometryUpdater(entity, scene);
      expect(updater.clampToGround).toBe(false);

      const instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry).not.toBeInstanceOf(GroundPolylineGeometry);

      updater.destroy();
    });
  },
  "WebGL"
);
