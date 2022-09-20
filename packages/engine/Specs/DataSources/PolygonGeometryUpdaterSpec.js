import {
  ApproximateTerrainHeights,
  ArcType,
  Cartesian2,
  Cartesian3,
  Color,
  CoplanarPolygonGeometry,
  CoplanarPolygonOutlineGeometry,
  Ellipsoid,
  JulianDate,
  PolygonGeometry,
  PolygonHierarchy,
  PolygonOutlineGeometry,
  TimeIntervalCollection,
  ConstantProperty,
  Entity,
  PolygonGeometryUpdater,
  PolygonGraphics,
  PropertyArray,
  SampledPositionProperty,
  SampledProperty,
  GroundPrimitive,
  HeightReference,
  PrimitiveCollection,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createDynamicGeometryUpdaterSpecs from "../createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../createDynamicProperty.js";
import createGeometryUpdaterGroundGeometrySpecs from "../createGeometryUpdaterGroundGeometrySpecs.js";
import createGeometryUpdaterSpecs from "../createGeometryUpdaterSpecs.js";
import createScene from "../../../../Specs/createScene.js";;

describe(
  "DataSources/PolygonGeometryUpdater",
  function () {
    let scene;
    let time;
    let groundPrimitiveSupported;

    beforeAll(function () {
      scene = createScene();
      time = JulianDate.now();
      groundPrimitiveSupported = GroundPrimitive.isSupported(scene);
      return ApproximateTerrainHeights.initialize();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function createBasicPolygon() {
      const polygon = new PolygonGraphics();
      polygon.hierarchy = new ConstantProperty(
        new PolygonHierarchy(
          Cartesian3.fromRadiansArray([-1, -1, 1, -1, 1, 1, -1, 1])
        )
      );
      polygon.height = new ConstantProperty(0);
      const entity = new Entity();
      entity.polygon = polygon;
      return entity;
    }

    function createVerticalPolygon() {
      const polygon = new PolygonGraphics();
      polygon.hierarchy = new ConstantProperty(
        new PolygonHierarchy(
          Cartesian3.fromDegreesArrayHeights([
            -1.0,
            1.0,
            0.0,
            -2.0,
            1.0,
            0.0,
            -2.0,
            1.0,
            0.0,
          ])
        )
      );
      polygon.perPositionHeight = true;
      const entity = new Entity();
      entity.polygon = polygon;
      return entity;
    }

    function createDynamicPolygon() {
      const entity = createBasicPolygon();
      entity.polygon.extrudedHeight = createDynamicProperty(2);
      return entity;
    }

    function createBasicPolygonWithoutHeight() {
      const polygon = new PolygonGraphics();
      polygon.hierarchy = new ConstantProperty(
        new PolygonHierarchy(
          Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1])
        )
      );
      const entity = new Entity();
      entity.polygon = polygon;
      return entity;
    }

    function createDynamicPolygonWithoutHeight() {
      const entity = createBasicPolygonWithoutHeight();
      entity.polygon.granularity = createDynamicProperty(1);
      return entity;
    }

    it("Properly computes isClosed", function () {
      const entity = createBasicPolygon();
      entity.polygon.perPositionHeight = true;
      const updater = new PolygonGeometryUpdater(entity, scene);
      expect(updater.isClosed).toBe(false); //open because of perPositionHeights

      entity.polygon.perPositionHeight = false;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(true); //close because polygon is on the ground

      entity.polygon.height = 1000;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(false); //open because polygon is at a height

      entity.polygon.extrudedHeight = 1000;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(false); //open because height === extrudedHeight so it's not extruded

      entity.polygon.extrudedHeight = 100;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(true); //closed because polygon is extruded

      entity.polygon.closeTop = false;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(false); //open because top cap isn't included

      entity.polygon.closeTop = true;
      entity.polygon.closeBottom = false;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(updater.isClosed).toBe(false); //open because bottom cap isn't included
    });

    it("A time-varying positions causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      const point1 = new SampledPositionProperty();
      point1.addSample(time, new Cartesian3());
      const point2 = new SampledPositionProperty();
      point2.addSample(time, new Cartesian3());
      const point3 = new SampledPositionProperty();
      point3.addSample(time, new Cartesian3());

      entity.polygon.hierarchy = new PropertyArray();
      entity.polygon.hierarchy.setValue([point1, point2, point3]);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying height causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.height = new SampledProperty(Number);
      entity.polygon.height.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying extrudedHeight causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.extrudedHeight = new SampledProperty(Number);
      entity.polygon.extrudedHeight.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.granularity = new SampledProperty(Number);
      entity.polygon.granularity.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying stRotation causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.stRotation = new SampledProperty(Number);
      entity.polygon.stRotation.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying perPositionHeight causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.perPositionHeight = new SampledProperty(Number);
      entity.polygon.perPositionHeight.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying arcType causes geometry to be dynamic", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      entity.polygon.arcType = new SampledProperty(Number);
      entity.polygon.arcType.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "polygon");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      const options = {
        height: 431,
        extrudedHeight: 123,
        granularity: 0.97,
        stRotation: 12,
        perPositionHeight: false,
        closeTop: true,
        closeBottom: false,
        arcType: ArcType.GEODESIC,
        textureCoordinates: [[0.5, 0.3]],
      };

      const entity = createBasicPolygon();

      const polygon = entity.polygon;
      polygon.outline = true;
      polygon.perPositionHeight = new ConstantProperty(
        options.perPositionHeight
      );
      polygon.closeTop = new ConstantProperty(options.closeTop);
      polygon.closeBottom = new ConstantProperty(options.closeBottom);
      polygon.stRotation = new ConstantProperty(options.stRotation);
      polygon.height = new ConstantProperty(options.height);
      polygon.extrudedHeight = new ConstantProperty(options.extrudedHeight);
      polygon.granularity = new ConstantProperty(options.granularity);
      polygon.arcType = new ConstantProperty(options.arcType);
      polygon.textureCoordinates = new ConstantProperty(
        options.textureCoordinates
      );

      const updater = new PolygonGeometryUpdater(entity, scene);

      let instance;
      let geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry).toBeInstanceOf(PolygonGeometry);
      expect(geometry._stRotation).toEqual(options.stRotation);
      expect(geometry._height).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._closeTop).toEqual(options.closeTop);
      expect(geometry._closeBottom).toEqual(options.closeBottom);
      expect(geometry._arcType).toEqual(options.arcType);
      expect(geometry._textureCoordinates).toEqual(options.textureCoordinates);
      expect(geometry._offsetAttribute).toBeUndefined();

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry).toBeInstanceOf(PolygonOutlineGeometry);
      expect(geometry._height).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._perPositionHeight).toEqual(options.perPositionHeight);
      expect(geometry._offsetAttribute).toBeUndefined();
    });

    it("Creates coplanar polygon", function () {
      const stRotation = 12;
      const textureCoordinates = [0.3, 0.4];

      const entity = createVerticalPolygon();

      const polygon = entity.polygon;
      polygon.outline = true;
      polygon.stRotation = new ConstantProperty(stRotation);
      polygon.textureCoordinates = new ConstantProperty(textureCoordinates);

      const updater = new PolygonGeometryUpdater(entity, scene);

      let instance;
      let geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry).toBeInstanceOf(CoplanarPolygonGeometry);
      expect(geometry._stRotation).toEqual(stRotation);
      expect(geometry._textureCoordinates).toEqual(textureCoordinates);

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry).toBeInstanceOf(CoplanarPolygonOutlineGeometry);
    });

    it("Checks that a polygon with per position heights isn't on terrain", function () {
      const entity = createBasicPolygon();
      entity.polygon.height = undefined;
      entity.polygon.perPositionHeight = new ConstantProperty(true);

      const updater = new PolygonGeometryUpdater(entity, scene);

      expect(updater.onTerrain).toBe(false);
    });

    it("Checks that a polygon without per position heights is on terrain", function () {
      const entity = createBasicPolygon();
      entity.polygon.height = undefined;
      entity.polygon.perPositionHeight = new ConstantProperty(false);

      const updater = new PolygonGeometryUpdater(entity, scene);

      if (groundPrimitiveSupported) {
        expect(updater.onTerrain).toBe(true);
      } else {
        expect(updater.onTerrain).toBe(false);
      }
    });

    it("Checks that a polygon without per position heights does not use a height reference", function () {
      const entity = createBasicPolygon();
      const graphics = entity.polygon;
      graphics.perPositionHeight = new ConstantProperty(true);
      graphics.outline = true;
      graphics.outlineColor = Color.BLACK;
      graphics.height = undefined;
      graphics.extrudedHeight = undefined;
      const updater = new PolygonGeometryUpdater(entity, scene);

      let instance;

      graphics.heightReference = new ConstantProperty(
        HeightReference.RELATIVE_TO_GROUND
      );
      graphics.extrudedHeightReference = new ConstantProperty(
        HeightReference.RELATIVE_TO_GROUND
      );
      updater._onEntityPropertyChanged(entity, "polygon");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
    });

    it("dynamic updater sets properties", function () {
      const polygon = new PolygonGraphics();
      polygon.hierarchy = createDynamicProperty(
        new PolygonHierarchy(
          Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1])
        )
      );
      polygon.height = createDynamicProperty(3);
      polygon.extrudedHeight = createDynamicProperty(2);
      polygon.perPositionHeight = createDynamicProperty(false);
      polygon.granularity = createDynamicProperty(2);
      polygon.stRotation = createDynamicProperty(1);
      polygon.textureCoordinates = createDynamicProperty({
        positions: [
          new Cartesian2(0.5, 1),
          new Cartesian2(0, 0.5),
          new Cartesian2(0.5, 0),
          new Cartesian2(1, 0.5),
        ],
      });
      polygon.closeTop = createDynamicProperty(false);
      polygon.closeBottom = createDynamicProperty(false);
      polygon.arcType = createDynamicProperty(ArcType.RHUMB);

      const entity = new Entity();
      entity.polygon = polygon;

      const updater = new PolygonGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);

      const options = dynamicUpdater._options;
      expect(options.id).toEqual(entity);
      expect(options.polygonHierarchy).toEqual(polygon.hierarchy.getValue());
      expect(options.height).toEqual(polygon.height.getValue());
      expect(options.extrudedHeight).toEqual(polygon.extrudedHeight.getValue());
      expect(options.perPositionHeight).toEqual(
        polygon.perPositionHeight.getValue()
      );
      expect(options.granularity).toEqual(polygon.granularity.getValue());
      expect(options.stRotation).toEqual(polygon.stRotation.getValue());
      expect(options.textureCoordinates).toEqual(
        polygon.textureCoordinates.getValue()
      );
      expect(options.closeTop).toEqual(polygon.closeTop.getValue());
      expect(options.closeBottom).toEqual(polygon.closeBottom.getValue());
      expect(options.arcType).toEqual(polygon.arcType.getValue());
      expect(options.offsetAttribute).toBeUndefined();
    });

    it("geometryChanged event is raised when expected", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      const listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.polygon.hierarchy = new ConstantProperty([]);
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(listener.calls.count()).toEqual(1);

      entity.polygon.height = new ConstantProperty(82);
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(listener.calls.count()).toEqual(2);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(3);

      entity.polygon.hierarchy = undefined;
      updater._onEntityPropertyChanged(entity, "polygon");
      expect(listener.calls.count()).toEqual(4);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.polygon.height = undefined;
      updater._onEntityPropertyChanged(entity, "polygon");

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(4);
    });

    it("perPositionHeight is true sets onTerrain to false", function () {
      const entity = createBasicPolygonWithoutHeight();
      entity.polygon.fill = true;
      entity.polygon.perPositionHeight = true;
      const updater = new PolygonGeometryUpdater(entity, scene);
      expect(updater.onTerrain).toBe(false);
    });

    it("computes center", function () {
      const entity = createBasicPolygon();
      const updater = new PolygonGeometryUpdater(entity, scene);
      let result = updater._computeCenter(time);
      result = Ellipsoid.WGS84.scaleToGeodeticSurface(result, result);
      expect(result).toEqualEpsilon(
        Cartesian3.fromDegrees(0.0, 0.0),
        CesiumMath.EPSILON10
      );
    });

    function getScene() {
      return scene;
    }

    createGeometryUpdaterSpecs(
      PolygonGeometryUpdater,
      "polygon",
      createBasicPolygon,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      PolygonGeometryUpdater,
      "polygon",
      createDynamicPolygon,
      getScene
    );

    createGeometryUpdaterGroundGeometrySpecs(
      PolygonGeometryUpdater,
      "polygon",
      createBasicPolygonWithoutHeight,
      createDynamicPolygonWithoutHeight,
      getScene
    );
  },
  "WebGL"
);
