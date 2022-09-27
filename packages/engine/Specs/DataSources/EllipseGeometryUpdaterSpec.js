import {
  ApproximateTerrainHeights,
  Cartesian3,
  JulianDate,
  TimeIntervalCollection,
  ConstantPositionProperty,
  ConstantProperty,
  EllipseGeometryUpdater,
  EllipseGraphics,
  Entity,
  SampledPositionProperty,
  SampledProperty,
  PrimitiveCollection,
} from "../../index.js";

import createDynamicGeometryUpdaterSpecs from "../../../../Specs/createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createGeometryUpdaterGroundGeometrySpecs from "../../../../Specs/createGeometryUpdaterGroundGeometrySpecs.js";
import createGeometryUpdaterSpecs from "../../../../Specs/createGeometryUpdaterSpecs.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "DataSources/EllipseGeometryUpdater",
  function () {
    let scene;
    let time;

    beforeAll(function () {
      scene = createScene();
      time = JulianDate.now();

      return ApproximateTerrainHeights.initialize();
    });

    afterAll(function () {
      scene.destroyForSpecs();

      ApproximateTerrainHeights._initPromise = undefined;
      ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function createBasicEllipse() {
      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);
      ellipse.height = new ConstantProperty(0);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0, 0, 0)
      );
      entity.ellipse = ellipse;
      return entity;
    }

    function createDynamicEllipse() {
      const entity = createBasicEllipse();
      entity.ellipse.semiMajorAxis = createDynamicProperty(4);
      return entity;
    }

    function createBasicEllipseWithoutHeight() {
      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = new ConstantProperty(2);
      ellipse.semiMinorAxis = new ConstantProperty(1);

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0, 0, 0)
      );
      entity.ellipse = ellipse;
      return entity;
    }

    function createDynamicEllipseWithoutHeight() {
      const entity = createBasicEllipseWithoutHeight();
      entity.ellipse.semiMajorAxis = createDynamicProperty(4);
      return entity;
    }

    it("No geometry available when semiMajorAxis is undefined", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.semiMajorAxis = undefined;
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.fillEnabled).toBe(false);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.isDynamic).toBe(false);
    });

    it("No geometry available when semiMinorAxis is undefined", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.semiMinorAxis = undefined;
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.fillEnabled).toBe(false);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.isDynamic).toBe(false);
    });

    it("A time-varying position causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.position = new SampledPositionProperty();
      entity.position.addSample(time, Cartesian3.ZERO);
      updater._onEntityPropertyChanged(entity, "position");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying semiMinorAxis causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.semiMinorAxis = new SampledProperty(Number);
      entity.ellipse.semiMinorAxis.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying semiMajorAxis causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.semiMajorAxis = new SampledProperty(Number);
      entity.ellipse.semiMajorAxis.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying rotation causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.rotation = new SampledProperty(Number);
      entity.ellipse.rotation.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying height causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.height = new SampledProperty(Number);
      entity.ellipse.height.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying extrudedHeight causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.extrudedHeight = new SampledProperty(Number);
      entity.ellipse.extrudedHeight.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.granularity = new SampledProperty(Number);
      entity.ellipse.granularity.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying stRotation causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.stRotation = new SampledProperty(Number);
      entity.ellipse.stRotation.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying numberOfVerticalLines causes geometry to be dynamic", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      entity.ellipse.numberOfVerticalLines = new SampledProperty(Number);
      entity.ellipse.numberOfVerticalLines.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipse");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      const options = {
        center: new Cartesian3(4, 5, 6),
        rotation: 1,
        semiMajorAxis: 3,
        semiMinorAxis: 2,
        height: 431,
        extrudedHeight: 123,
        granularity: 0.97,
        stRotation: 12,
        numberOfVerticalLines: 15,
      };
      const entity = new Entity();
      entity.position = new ConstantPositionProperty(options.center);

      const ellipse = new EllipseGraphics();
      ellipse.outline = true;
      ellipse.numberOfVerticalLines = new ConstantProperty(
        options.numberOfVerticalLines
      );
      ellipse.semiMajorAxis = new ConstantProperty(options.semiMajorAxis);
      ellipse.semiMinorAxis = new ConstantProperty(options.semiMinorAxis);
      ellipse.rotation = new ConstantProperty(options.rotation);
      ellipse.stRotation = new ConstantProperty(options.stRotation);
      ellipse.height = new ConstantProperty(options.height);
      ellipse.extrudedHeight = new ConstantProperty(options.extrudedHeight);
      ellipse.granularity = new ConstantProperty(options.granularity);
      entity.ellipse = ellipse;

      const updater = new EllipseGeometryUpdater(entity, scene);

      let instance;
      let geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._center).toEqual(options.center);
      expect(geometry._semiMajorAxis).toEqual(options.semiMajorAxis);
      expect(geometry._semiMinorAxis).toEqual(options.semiMinorAxis);
      expect(geometry._rotation).toEqual(options.rotation);
      expect(geometry._stRotation).toEqual(options.stRotation);
      expect(geometry._height).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._offsetAttribute).toBeUndefined();

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._center).toEqual(options.center);
      expect(geometry._semiMajorAxis).toEqual(options.semiMajorAxis);
      expect(geometry._semiMinorAxis).toEqual(options.semiMinorAxis);
      expect(geometry._rotation).toEqual(options.rotation);
      expect(geometry._height).toEqual(options.height);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
      expect(geometry._numberOfVerticalLines).toEqual(
        options.numberOfVerticalLines
      );
      expect(geometry._offsetAttribute).toBeUndefined();
    });

    it("dynamic updater sets properties", function () {
      const ellipse = new EllipseGraphics();
      ellipse.semiMajorAxis = createDynamicProperty(2);
      ellipse.semiMinorAxis = createDynamicProperty(1);
      ellipse.height = createDynamicProperty(1);

      const entity = new Entity();
      entity.position = createDynamicProperty(Cartesian3.UNIT_Z);
      entity.ellipse = ellipse;

      const updater = new EllipseGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(JulianDate.now());

      const options = dynamicUpdater._options;
      expect(options.semiMajorAxis).toEqual(ellipse.semiMajorAxis.getValue());
      expect(options.semiMinorAxis).toEqual(ellipse.semiMinorAxis.getValue());
      expect(options.height).toEqual(ellipse.height.getValue());
      expect(options.offsetAttribute).toBeUndefined();
    });

    it("geometryChanged event is raised when expected", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);
      const listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
      updater._onEntityPropertyChanged(entity, "position");
      expect(listener.calls.count()).toEqual(1);

      entity.ellipse.semiMajorAxis = new ConstantProperty(82);
      updater._onEntityPropertyChanged(entity, "ellipse");
      expect(listener.calls.count()).toEqual(2);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(3);

      entity.ellipse.semiMajorAxis = undefined;
      updater._onEntityPropertyChanged(entity, "ellipse");
      expect(listener.calls.count()).toEqual(4);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.ellipse.semiMinorAxis = undefined;
      updater._onEntityPropertyChanged(entity, "ellipse");

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(4);

      entity.ellipse.semiMajorAxis = new SampledProperty(Number);
      entity.ellipse.semiMinorAxis = new SampledProperty(Number);
      updater._onEntityPropertyChanged(entity, "ellipse");
      expect(listener.calls.count()).toEqual(5);
    });

    it("computes center", function () {
      const entity = createBasicEllipse();
      const updater = new EllipseGeometryUpdater(entity, scene);

      expect(updater._computeCenter(time)).toEqual(
        entity.position.getValue(time)
      );
    });

    function getScene() {
      return scene;
    }

    createGeometryUpdaterSpecs(
      EllipseGeometryUpdater,
      "ellipse",
      createBasicEllipse,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      EllipseGeometryUpdater,
      "ellipse",
      createDynamicEllipse,
      getScene
    );

    createGeometryUpdaterGroundGeometrySpecs(
      EllipseGeometryUpdater,
      "ellipse",
      createBasicEllipseWithoutHeight,
      createDynamicEllipseWithoutHeight,
      getScene
    );
  },
  "WebGL"
);
