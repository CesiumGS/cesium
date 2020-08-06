import { ApproximateTerrainHeights } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { RectangleGeometryUpdater } from "../../Source/Cesium.js";
import { RectangleGraphics } from "../../Source/Cesium.js";
import { SampledProperty } from "../../Source/Cesium.js";
import { PrimitiveCollection } from "../../Source/Cesium.js";
import createDynamicGeometryUpdaterSpecs from "../createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../createDynamicProperty.js";
import createGeometryUpdaterGroundGeometrySpecs from "../createGeometryUpdaterGroundGeometrySpecs.js";
import createGeometryUpdaterSpecs from "../createGeometryUpdaterSpecs.js";
import createScene from "../createScene.js";

describe(
  "DataSources/RectangleGeometryUpdater",
  function () {
    var time;
    var scene;

    beforeAll(function () {
      scene = createScene();
      time = new JulianDate(0, 0);

      return ApproximateTerrainHeights.initialize();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function createBasicRectangle() {
      var rectangle = new RectangleGraphics();
      var entity = new Entity();
      entity.rectangle = rectangle;
      entity.rectangle.coordinates = new ConstantProperty(
        new Rectangle(-1, -1, 1, 1)
      );
      entity.rectangle.height = new ConstantProperty(0);
      return entity;
    }

    function createDynamicRectangle() {
      var entity = createBasicRectangle();
      entity.rectangle.extrudedHeight = createDynamicProperty(2);
      return entity;
    }

    function createBasicRectangleWithoutHeight() {
      var rectangle = new RectangleGraphics();
      var entity = new Entity();
      entity.rectangle = rectangle;
      entity.rectangle.coordinates = new ConstantProperty(
        new Rectangle(0, 0, 1, 1)
      );
      return entity;
    }

    function createDynamicRectangleWithoutHeight() {
      var entity = createBasicRectangleWithoutHeight();
      entity.rectangle.rotation = createDynamicProperty(2);
      return entity;
    }

    it("Properly detects closed geometry.", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.extrudedHeight = new ConstantProperty(1000);
      updater._onEntityPropertyChanged(entity, "rectangle");
      expect(updater.isClosed).toBe(true);
    });

    it("A time-varying coordinates causes geometry to be dynamic", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.coordinates = new SampledProperty(Rectangle);
      entity.rectangle.coordinates.addSample(JulianDate.now(), new Rectangle());
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying height causes geometry to be dynamic", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.height = new SampledProperty(Number);
      entity.rectangle.height.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying extrudedHeight causes geometry to be dynamic", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.extrudedHeight = new SampledProperty(Number);
      entity.rectangle.extrudedHeight.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.granularity = new SampledProperty(Number);
      entity.rectangle.granularity.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying stRotation causes geometry to be dynamic", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.stRotation = new SampledProperty(Number);
      entity.rectangle.stRotation.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      var options = {
        height: 431,
        extrudedHeight: 123,
        granularity: 0.97,
        rotation: 1,
        stRotation: 12,
      };

      var entity = createBasicRectangle();

      var rectangle = entity.rectangle;
      rectangle.outline = true;
      rectangle.rotation = new ConstantProperty(options.rotation);
      rectangle.stRotation = new ConstantProperty(options.stRotation);
      rectangle.height = new ConstantProperty(options.height);
      rectangle.extrudedHeight = new ConstantProperty(options.extrudedHeight);
      rectangle.granularity = new ConstantProperty(options.granularity);

      var updater = new RectangleGeometryUpdater(entity, scene);

      var instance;
      var geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._rotation).toEqual(options.rotation);
      expect(geometry._stRotation).toEqual(options.stRotation);
      expect(geometry._surfaceHeight).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._offsetAttribute).toBeUndefined();

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._surfaceHeight).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._offsetAttribute).toBeUndefined();
    });

    it("dynamic updater sets properties", function () {
      var rectangle = new RectangleGraphics();
      rectangle.coordinates = createDynamicProperty(new Rectangle(0, 0, 1, 1));
      rectangle.show = createDynamicProperty(true);
      rectangle.height = createDynamicProperty(3);
      rectangle.extrudedHeight = createDynamicProperty(2);
      rectangle.outline = createDynamicProperty(true);
      rectangle.fill = createDynamicProperty(true);
      rectangle.granularity = createDynamicProperty(2);
      rectangle.stRotation = createDynamicProperty(1);

      var entity = new Entity();
      entity.rectangle = rectangle;

      var updater = new RectangleGeometryUpdater(entity, scene);
      var dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);

      var options = dynamicUpdater._options;
      expect(options.id).toEqual(entity);
      expect(options.rectangle).toEqual(rectangle.coordinates.getValue());
      expect(options.height).toEqual(rectangle.height.getValue());
      expect(options.extrudedHeight).toEqual(
        rectangle.extrudedHeight.getValue()
      );
      expect(options.granularity).toEqual(rectangle.granularity.getValue());
      expect(options.stRotation).toEqual(rectangle.stRotation.getValue());
      expect(options.offsetAttribute).toBeUndefined();
    });

    it("geometryChanged event is raised when expected", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);
      var listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.rectangle.height = new ConstantProperty(82);
      updater._onEntityPropertyChanged(entity, "rectangle");
      expect(listener.calls.count()).toEqual(1);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(2);

      entity.rectangle.coordinates = undefined;
      updater._onEntityPropertyChanged(entity, "rectangle");
      expect(listener.calls.count()).toEqual(3);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.rectangle.height = undefined;
      updater._onEntityPropertyChanged(entity, "rectangle");

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(3);
    });

    it("computes center", function () {
      var entity = createBasicRectangle();
      var updater = new RectangleGeometryUpdater(entity, scene);

      expect(updater._computeCenter(time)).toEqualEpsilon(
        Cartesian3.fromDegrees(0.0, 0.0),
        CesiumMath.EPSILON10
      );
    });

    function getScene() {
      return scene;
    }
    createGeometryUpdaterSpecs(
      RectangleGeometryUpdater,
      "rectangle",
      createBasicRectangle,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      RectangleGeometryUpdater,
      "rectangle",
      createDynamicRectangle,
      getScene
    );

    createGeometryUpdaterGroundGeometrySpecs(
      RectangleGeometryUpdater,
      "rectangle",
      createBasicRectangleWithoutHeight,
      createDynamicRectangleWithoutHeight,
      getScene
    );
  },
  "WebGL"
);
