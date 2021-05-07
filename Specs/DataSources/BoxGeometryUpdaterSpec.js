import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeIntervalCollection } from "../../Source/Cesium.js";
import { BoxGeometryUpdater } from "../../Source/Cesium.js";
import { BoxGraphics } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { Entity } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { PrimitiveCollection } from "../../Source/Cesium.js";
import createDynamicGeometryUpdaterSpecs from "../createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../createDynamicProperty.js";
import createGeometryUpdaterSpecs from "../createGeometryUpdaterSpecs.js";
import createScene from "../createScene.js";

describe(
  "DataSources/BoxGeometryUpdater",
  function () {
    var scene;
    var time;

    beforeAll(function () {
      scene = createScene();
      time = JulianDate.now();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    function createBasicBox() {
      var box = new BoxGraphics();
      box.dimensions = new ConstantProperty(new Cartesian3(1, 2, 3));
      var entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0, 0, 0)
      );
      entity.box = box;
      return entity;
    }

    function createDynamicBox() {
      var entity = createBasicBox();
      entity.box.dimensions = createDynamicProperty(new Cartesian3(1, 2, 3));
      return entity;
    }

    it("A time-varying dimensions causes geometry to be dynamic", function () {
      var entity = createBasicBox();
      var updater = new BoxGeometryUpdater(entity, scene);
      entity.box.dimensions = createDynamicProperty();
      updater._onEntityPropertyChanged(entity, "box");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      var entity = createBasicBox();

      var dimensions = new Cartesian3(1, 2, 3);
      var box = entity.box;
      box.outline = true;
      box.dimensions = dimensions;

      var updater = new BoxGeometryUpdater(entity, scene);

      var instance;
      var geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._maximum).toEqual(
        Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3())
      );
      expect(geometry._offsetAttribute).toBeUndefined();

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._max).toEqual(
        Cartesian3.multiplyByScalar(dimensions, 0.5, new Cartesian3())
      );
      expect(geometry._offsetAttribute).toBeUndefined();
    });

    it("Creates geometry with expected offsetAttribute", function () {
      var entity = createBasicBox();
      var graphics = entity.box;
      graphics.outline = true;
      graphics.outlineColor = Color.BLACK;
      graphics.height = new ConstantProperty(20.0);
      graphics.extrudedHeight = new ConstantProperty(0.0);
      var updater = new BoxGeometryUpdater(entity, getScene());

      var instance;

      updater._onEntityPropertyChanged(entity, "box");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();

      graphics.heightReference = new ConstantProperty(HeightReference.NONE);
      updater._onEntityPropertyChanged(entity, "box");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();

      graphics.heightReference = new ConstantProperty(
        HeightReference.CLAMP_TO_GROUND
      );
      updater._onEntityPropertyChanged(entity, "box");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );

      graphics.heightReference = new ConstantProperty(
        HeightReference.RELATIVE_TO_GROUND
      );
      updater._onEntityPropertyChanged(entity, "box");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );
    });

    it("dynamic updater sets properties", function () {
      var entity = createDynamicBox();

      var updater = new BoxGeometryUpdater(entity, scene);
      var dynamicUpdater = updater.createDynamicUpdater(
        new PrimitiveCollection(),
        new PrimitiveCollection()
      );
      dynamicUpdater.update(JulianDate.now());

      expect(dynamicUpdater._options.dimensions).toEqual(
        entity.box.dimensions.getValue()
      );
      expect(dynamicUpdater._options.offsetAttribute).toBeUndefined();
    });

    it("geometryChanged event is raised when expected", function () {
      var entity = createBasicBox();
      var updater = new BoxGeometryUpdater(entity, scene);
      var listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.box.dimensions = new ConstantProperty();
      updater._onEntityPropertyChanged(entity, "box");
      expect(listener.calls.count()).toEqual(1);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(2);

      entity.box.dimensions = undefined;
      updater._onEntityPropertyChanged(entity, "box");
      expect(listener.calls.count()).toEqual(3);

      //Since there's no valid geometry, changing another property should not raise the event.
      entity.box.height = undefined;
      updater._onEntityPropertyChanged(entity, "box");

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(3);
    });

    it("computes center", function () {
      var entity = createBasicBox();
      var updater = new BoxGeometryUpdater(entity, scene);

      expect(updater._computeCenter(time)).toEqual(
        entity.position.getValue(time)
      );
    });

    function getScene() {
      return scene;
    }

    createGeometryUpdaterSpecs(
      BoxGeometryUpdater,
      "box",
      createBasicBox,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      BoxGeometryUpdater,
      "box",
      createDynamicBox,
      getScene
    );
  },
  "WebGL"
);
