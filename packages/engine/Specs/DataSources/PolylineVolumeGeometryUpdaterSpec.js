import {
  Cartesian2,
  Cartesian3,
  CornerType,
  JulianDate,
  TimeInterval,
  TimeIntervalCollection,
  ConstantProperty,
  Entity,
  PolylineVolumeGeometryUpdater,
  PolylineVolumeGraphics,
  TimeIntervalCollectionProperty,
  PrimitiveCollection,
} from "../../index.js";;

import createDynamicGeometryUpdaterSpecs from "../createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../createDynamicProperty.js";
import createGeometryUpdaterSpecs from "../createGeometryUpdaterSpecs.js";
import createScene from "../../../../Specs/createScene.js";;

describe(
  "DataSources/PolylineVolumeGeometryUpdater",
  function () {
    let scene;
    let time;

    beforeAll(function () {
      scene = createScene();
      time = JulianDate.now();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    const shape = [
      new Cartesian2(-1, -1),
      new Cartesian2(1, -1),
      new Cartesian2(1, 1),
      new Cartesian2(1, -1),
    ];

    function createBasicPolylineVolume() {
      const polylineVolume = new PolylineVolumeGraphics();
      polylineVolume.positions = new ConstantProperty(
        Cartesian3.fromDegreesArray([0, 0, 1, 0, 1, 1, 0, 1])
      );
      polylineVolume.shape = new ConstantProperty(shape);
      const entity = new Entity();
      entity.polylineVolume = polylineVolume;
      return entity;
    }

    function createDynamicPolylineVolume() {
      const entity = createBasicPolylineVolume();
      entity.polylineVolume.shape = createDynamicProperty(shape);
      return entity;
    }

    it("A time-varying positions causes geometry to be dynamic", function () {
      const entity = createBasicPolylineVolume();
      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      entity.polylineVolume.positions = createDynamicProperty(
        Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1])
      );
      updater._onEntityPropertyChanged(entity, "polylineVolume");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying shape causes geometry to be dynamic", function () {
      const entity = createBasicPolylineVolume();
      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      entity.polylineVolume.shape = createDynamicProperty(shape);
      updater._onEntityPropertyChanged(entity, "polylineVolume");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying granularity causes geometry to be dynamic", function () {
      const entity = createBasicPolylineVolume();
      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      entity.polylineVolume.granularity = createDynamicProperty(1);
      updater._onEntityPropertyChanged(entity, "polylineVolume");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying cornerType causes geometry to be dynamic", function () {
      const entity = createBasicPolylineVolume();
      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      entity.polylineVolume.cornerType = new TimeIntervalCollectionProperty();
      entity.polylineVolume.cornerType.intervals.addInterval(
        new TimeInterval({
          start: JulianDate.now(),
          stop: JulianDate.now(),
          data: CornerType.ROUNDED,
        })
      );
      updater._onEntityPropertyChanged(entity, "polylineVolume");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      const options = {
        shape: shape,
        granularity: 0.97,
        cornerType: CornerType.MITERED,
      };

      const entity = createBasicPolylineVolume();

      const polylineVolume = entity.polylineVolume;
      polylineVolume.outline = true;
      polylineVolume.cornerType = new ConstantProperty(options.cornerType);
      polylineVolume.shape = new ConstantProperty(options.shape);
      polylineVolume.granularity = new ConstantProperty(options.granularity);

      const updater = new PolylineVolumeGeometryUpdater(entity, scene);

      let instance;
      let geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._shape).toEqual(options.shape);
      expect(geometry._granularity).toEqual(options.granularity);

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._shape).toEqual(options.shape);
      expect(geometry._granularity).toEqual(options.granularity);
      expect(geometry._cornerType).toEqual(options.cornerType);
    });

    it("dynamic updater sets properties", function () {
      const polylineVolume = new PolylineVolumeGraphics();
      polylineVolume.positions = createDynamicProperty(
        Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1])
      );
      polylineVolume.show = createDynamicProperty(true);
      polylineVolume.shape = createDynamicProperty(shape);
      polylineVolume.outline = createDynamicProperty(true);
      polylineVolume.fill = createDynamicProperty(true);
      polylineVolume.granularity = createDynamicProperty(2);
      polylineVolume.cornerType = createDynamicProperty(CornerType.MITERED);

      const entity = new Entity();
      entity.polylineVolume = polylineVolume;

      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      const dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);

      const options = dynamicUpdater._options;
      expect(options.id).toEqual(entity);
      expect(options.polylinePositions).toEqual(
        polylineVolume.positions.getValue()
      );
      expect(options.shapePositions).toEqual(polylineVolume.shape.getValue());
      expect(options.granularity).toEqual(
        polylineVolume.granularity.getValue()
      );
      expect(options.cornerType).toEqual(polylineVolume.cornerType.getValue());
    });

    it("geometryChanged event is raised when expected", function () {
      const entity = createBasicPolylineVolume();
      const updater = new PolylineVolumeGeometryUpdater(entity, scene);
      const listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.polylineVolume.positions = new ConstantProperty([]);
      updater._onEntityPropertyChanged(entity, "polylineVolume");
      expect(listener.calls.count()).toEqual(1);

      entity.polylineVolume.shape = new ConstantProperty(shape);
      updater._onEntityPropertyChanged(entity, "polylineVolume");
      expect(listener.calls.count()).toEqual(2);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(3);

      entity.polylineVolume.positions = undefined;
      updater._onEntityPropertyChanged(entity, "polylineVolume");
      expect(listener.calls.count()).toEqual(4);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.polylineVolume.shape = undefined;
      updater._onEntityPropertyChanged(entity, "polylineVolume");

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(4);
    });

    function getScene() {
      return scene;
    }

    createGeometryUpdaterSpecs(
      PolylineVolumeGeometryUpdater,
      "polylineVolume",
      createBasicPolylineVolume,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      PolylineVolumeGeometryUpdater,
      "polylineVolume",
      createDynamicPolylineVolume,
      getScene
    );
  },
  "WebGL"
);
