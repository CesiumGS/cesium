import {
  ApproximateTerrainHeights,
  Cartesian3,
  JulianDate,
  Rectangle,
  TimeIntervalCollection,
  ConstantProperty,
  Entity,
  RectangleGeometryUpdater,
  RectangleGraphics,
  SampledProperty,
  PrimitiveCollection,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createDynamicGeometryUpdaterSpecs from "../../../../Specs/createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createGeometryUpdaterGroundGeometrySpecs from "../../../../Specs/createGeometryUpdaterGroundGeometrySpecs.js";
import createGeometryUpdaterSpecs from "../../../../Specs/createGeometryUpdaterSpecs.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "DataSources/RectangleGeometryUpdater",
  function () {
    let time;
    let scene;

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
      const rectangle = new RectangleGraphics();
      const entity = new Entity();
      entity.rectangle = rectangle;
      entity.rectangle.coordinates = new ConstantProperty(
        new Rectangle(-1, -1, 1, 1)
      );
      entity.rectangle.height = new ConstantProperty(0);
      return entity;
    }

    function createDynamicRectangle() {
      const entity = createBasicRectangle();
      entity.rectangle.extrudedHeight = createDynamicProperty(2);
      return entity;
    }

    function createBasicRectangleWithoutHeight() {
      const rectangle = new RectangleGraphics();
      const entity = new Entity();
      entity.rectangle = rectangle;
      entity.rectangle.coordinates = new ConstantProperty(
        new Rectangle(0, 0, 1, 1)
      );
      return entity;
    }

    function createDynamicRectangleWithoutHeight() {
      const entity = createBasicRectangleWithoutHeight();
      entity.rectangle.rotation = createDynamicProperty(2);
      return entity;
    }

    it("Properly detects closed geometry.", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.extrudedHeight = new ConstantProperty(1000);
      updater._onEntityPropertyChanged(entity, "rectangle");
      expect(updater.isClosed).toBe(true);
    });

    it("A time-varying coordinates causes geometry to be dynamic", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.coordinates = new SampledProperty(Rectangle);
      entity.rectangle.coordinates.addSample(JulianDate.now(), new Rectangle());
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying height causes geometry to be dynamic", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.height = new SampledProperty(Number);
      entity.rectangle.height.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying extrudedHeight causes geometry to be dynamic", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.extrudedHeight = new SampledProperty(Number);
      entity.rectangle.extrudedHeight.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.granularity = new SampledProperty(Number);
      entity.rectangle.granularity.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying stRotation causes geometry to be dynamic", function () {
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      entity.rectangle.stRotation = new SampledProperty(Number);
      entity.rectangle.stRotation.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "rectangle");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      const options = {
        height: 431,
        extrudedHeight: 123,
        granularity: 0.97,
        rotation: 1,
        stRotation: 12,
      };

      const entity = createBasicRectangle();

      const rectangle = entity.rectangle;
      rectangle.outline = true;
      rectangle.rotation = new ConstantProperty(options.rotation);
      rectangle.stRotation = new ConstantProperty(options.stRotation);
      rectangle.height = new ConstantProperty(options.height);
      rectangle.extrudedHeight = new ConstantProperty(options.extrudedHeight);
      rectangle.granularity = new ConstantProperty(options.granularity);

      const updater = new RectangleGeometryUpdater(entity, scene);

      let instance;
      let geometry;
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
      const rectangle = new RectangleGraphics();
      rectangle.coordinates = createDynamicProperty(new Rectangle(0, 0, 1, 1));
      rectangle.show = createDynamicProperty(true);
      rectangle.height = createDynamicProperty(3);
      rectangle.extrudedHeight = createDynamicProperty(2);
      rectangle.outline = createDynamicProperty(true);
      rectangle.fill = createDynamicProperty(true);
      rectangle.granularity = createDynamicProperty(2);
      rectangle.stRotation = createDynamicProperty(1);

      const entity = new Entity();
      entity.rectangle = rectangle;

      const updater = new RectangleGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);

      const options = dynamicUpdater._options;
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
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);
      const listener = jasmine.createSpy("listener");
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
      const entity = createBasicRectangle();
      const updater = new RectangleGeometryUpdater(entity, scene);

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
