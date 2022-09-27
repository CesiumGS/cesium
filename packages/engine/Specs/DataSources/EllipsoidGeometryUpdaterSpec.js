import {
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  GeometryOffsetAttribute,
  JulianDate,
  Quaternion,
  TimeIntervalCollection,
  ColorMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  EllipsoidGeometryUpdater,
  EllipsoidGraphics,
  Entity,
  SampledPositionProperty,
  SampledProperty,
  HeightReference,
  PrimitiveCollection,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createDynamicGeometryUpdaterSpecs from "../../../../Specs/createDynamicGeometryUpdaterSpecs.js";
import createDynamicProperty from "../../../../Specs/createDynamicProperty.js";
import createGeometryUpdaterSpecs from "../../../../Specs/createGeometryUpdaterSpecs.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "DataSources/EllipsoidGeometryUpdater",
  function () {
    const time = JulianDate.now();
    let scene;

    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    function createBasicEllipsoid() {
      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.radii = new ConstantProperty(new Cartesian3(1, 2, 3));

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(0, 0, 0)
      );
      entity.ellipsoid = ellipsoid;
      return entity;
    }

    function createDynamicEllipsoid() {
      const entity = createBasicEllipsoid();
      entity.ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
      return entity;
    }

    it("No geometry available when radii is undefined", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.radii = undefined;
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.fillEnabled).toBe(false);
      expect(updater.outlineEnabled).toBe(false);
      expect(updater.isDynamic).toBe(false);
    });

    it("A time-varying position causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.position = new SampledPositionProperty();
      entity.position.addSample(time, Cartesian3.ZERO);
      updater._onEntityPropertyChanged(entity, "position");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying radii causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.radii = new SampledProperty(Cartesian3);
      entity.ellipsoid.radii.addSample(time, new Cartesian3(1, 2, 3));
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying stackPartitions causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.stackPartitions = new SampledProperty(Number);
      entity.ellipsoid.stackPartitions.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying slicePartitions causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.slicePartitions = new SampledProperty(Number);
      entity.ellipsoid.slicePartitions.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying subdivisions causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.subdivisions = new SampledProperty(Number);
      entity.ellipsoid.subdivisions.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying innerRadii causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.innerRadii = new SampledProperty(Cartesian3);
      entity.ellipsoid.innerRadii.addSample(time, new Cartesian3(1, 2, 3));
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying minimumClock causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.minimumClock = new SampledProperty(Number);
      entity.ellipsoid.minimumClock.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying maximumClock causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.maximumClock = new SampledProperty(Number);
      entity.ellipsoid.maximumClock.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying minimumCone causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.minimumCone = new SampledProperty(Number);
      entity.ellipsoid.minimumCone.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("A time-varying maximumCone causes geometry to be dynamic", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);
      entity.ellipsoid.maximumCone = new SampledProperty(Number);
      entity.ellipsoid.maximumCone.addSample(time, 1);
      updater._onEntityPropertyChanged(entity, "ellipsoid");

      expect(updater.isDynamic).toBe(true);
    });

    it("Creates geometry with expected properties", function () {
      const options = {
        radii: new Cartesian3(1, 2, 3),
        innerRadii: new Cartesian3(0.5, 1, 1.5),
        minimumClock: CesiumMath.toRadians(90.0),
        maximumClock: CesiumMath.toRadians(270.0),
        minimumCone: CesiumMath.toRadians(45.0),
        maximumCone: CesiumMath.toRadians(90.0),
        stackPartitions: 32,
        slicePartitions: 64,
        subdivisions: 15,
      };

      const entity = new Entity();
      entity.position = new ConstantPositionProperty(new Cartesian3(4, 5, 6));
      entity.orientation = new ConstantProperty(Quaternion.IDENTITY);

      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.outline = true;
      ellipsoid.radii = new ConstantProperty(options.radii);
      ellipsoid.stackPartitions = new ConstantProperty(options.stackPartitions);
      ellipsoid.slicePartitions = new ConstantProperty(options.slicePartitions);
      ellipsoid.innerRadii = new ConstantProperty(options.innerRadii);
      ellipsoid.minimumClock = new ConstantProperty(options.minimumClock);
      ellipsoid.maximumClock = new ConstantProperty(options.maximumClock);
      ellipsoid.minimumCone = new ConstantProperty(options.minimumCone);
      ellipsoid.maximumCone = new ConstantProperty(options.maximumCone);
      ellipsoid.subdivisions = new ConstantProperty(options.subdivisions);
      entity.ellipsoid = ellipsoid;

      const updater = new EllipsoidGeometryUpdater(entity, scene);

      let instance;
      let geometry;
      instance = updater.createFillGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._center).toEqual(options.center);
      expect(geometry._radii).toEqual(options.radii);
      expect(geometry._innerRadii).toEqual(options.innerRadii);
      expect(geometry._minimumClock).toEqual(options.minimumClock);
      expect(geometry._maximumClock).toEqual(options.maximumClock);
      expect(geometry._minimumCone).toEqual(options.minimumCone);
      expect(geometry._maximumCone).toEqual(options.maximumCone);
      expect(geometry._stackPartitions).toEqual(options.stackPartitions);
      expect(geometry._slicePartitions).toEqual(options.slicePartitions);
      expect(geometry._offsetAttribute).toBeUndefined();

      instance = updater.createOutlineGeometryInstance(time);
      geometry = instance.geometry;
      expect(geometry._center).toEqual(options.center);
      expect(geometry._radii).toEqual(options.radii);
      expect(geometry._innerRadii).toEqual(options.innerRadii);
      expect(geometry._minimumClock).toEqual(options.minimumClock);
      expect(geometry._maximumClock).toEqual(options.maximumClock);
      expect(geometry._minimumCone).toEqual(options.minimumCone);
      expect(geometry._maximumCone).toEqual(options.maximumCone);
      expect(geometry._stackPartitions).toEqual(options.stackPartitions);
      expect(geometry._slicePartitions).toEqual(options.slicePartitions);
      expect(geometry._subdivisions).toEqual(options.subdivisions);
      expect(geometry._offsetAttribute).toBeUndefined();
    });

    it("Creates geometry with expected offsetAttribute", function () {
      const entity = createBasicEllipsoid();
      const graphics = entity.ellipsoid;
      graphics.outline = true;
      graphics.outlineColor = Color.BLACK;
      graphics.height = new ConstantProperty(20.0);
      graphics.extrudedHeight = new ConstantProperty(0.0);
      const updater = new EllipsoidGeometryUpdater(entity, getScene());

      let instance;

      updater._onEntityPropertyChanged(entity, "ellipsoid");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();

      graphics.heightReference = new ConstantProperty(HeightReference.NONE);
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toBeUndefined();

      graphics.heightReference = new ConstantProperty(
        HeightReference.CLAMP_TO_GROUND
      );
      updater._onEntityPropertyChanged(entity, "ellipsoid");
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
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      instance = updater.createFillGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );
      instance = updater.createOutlineGeometryInstance(time);
      expect(instance.geometry._offsetAttribute).toEqual(
        GeometryOffsetAttribute.ALL
      );
    });

    it("computes center", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);

      expect(updater._computeCenter(time)).toEqual(
        entity.position.getValue(time)
      );
    });

    it("dynamic ellipsoid creates and updates", function () {
      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.show = createDynamicProperty(true);
      ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
      ellipsoid.outline = createDynamicProperty(true);
      ellipsoid.fill = createDynamicProperty(true);

      const entity = new Entity();
      entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
      entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
      entity.ellipsoid = ellipsoid;

      const updater = new EllipsoidGeometryUpdater(entity, scene);
      const primitives = new PrimitiveCollection();

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        new PrimitiveCollection()
      );
      expect(dynamicUpdater.isDestroyed()).toBe(false);
      expect(primitives.length).toBe(0);

      dynamicUpdater.update(time);
      expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting
      expect(primitives.get(0).show).toBe(true);
      expect(primitives.get(1).show).toBe(true);

      ellipsoid.show.setValue(false);
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      dynamicUpdater.update(time);
      expect(primitives.get(0).show).toBe(false);
      expect(primitives.get(1).show).toBe(false);
      expect(primitives.length).toBe(2);

      dynamicUpdater.destroy();
      expect(primitives.length).toBe(0);
      updater.destroy();
    });

    it("dynamic ellipsoid is hidden if missing required values", function () {
      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.show = createDynamicProperty(true);
      ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
      ellipsoid.outline = createDynamicProperty(true);
      ellipsoid.fill = createDynamicProperty(true);

      const entity = new Entity();
      entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
      entity.ellipsoid = ellipsoid;

      const updater = new EllipsoidGeometryUpdater(entity, scene);
      const primitives = scene.primitives;

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);
      expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

      scene.initializeFrame();
      scene.render();

      //no position
      entity.position.setValue(undefined);
      updater._onEntityPropertyChanged(entity, "position");
      dynamicUpdater.update(time);
      expect(primitives.get(0).show).toBe(false);
      expect(primitives.get(1).show).toBe(false);
      expect(primitives.length).toBe(2);

      //no radii
      entity.position.setValue(Cartesian3.fromDegrees(0, 0, 0));
      updater._onEntityPropertyChanged(entity, "position");
      ellipsoid.radii.setValue(undefined);
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      dynamicUpdater.update(time);
      expect(primitives.get(0).show).toBe(false);
      expect(primitives.get(1).show).toBe(false);
      expect(primitives.length).toBe(2);

      //everything valid again
      ellipsoid.radii.setValue(new Cartesian3(1, 2, 3));
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      dynamicUpdater.update(time);
      expect(primitives.get(0).show).toBe(true);
      expect(primitives.get(1).show).toBe(true);
      expect(primitives.length).toBe(2);

      dynamicUpdater.destroy();
      expect(primitives.length).toBe(0);
      updater.destroy();
    });

    it("Inner radii should be set when not in 3D mode", function () {
      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
      ellipsoid.innerRadii = createDynamicProperty(new Cartesian3(0.5, 1, 1.5));
      // Turns 3d mode path off
      ellipsoid.heightReference = new ConstantProperty(
        HeightReference.RELATIVE_TO_GROUND
      );
      ellipsoid.material = new ColorMaterialProperty(Color.RED);

      const entity = new Entity();
      entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
      entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
      entity.ellipsoid = ellipsoid;

      const updater = new EllipsoidGeometryUpdater(entity, scene);
      const primitives = scene.primitives;

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);

      scene.initializeFrame();
      scene.render();

      expect(dynamicUpdater._options.innerRadii).toEqual(
        ellipsoid.innerRadii.getValue()
      );
    });

    it("dynamic ellipsoid fast path updates attributes", function () {
      const ellipsoid = new EllipsoidGraphics();
      ellipsoid.show = createDynamicProperty(true);
      ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
      ellipsoid.outline = createDynamicProperty(true);
      ellipsoid.fill = createDynamicProperty(true);
      ellipsoid.outlineColor = createDynamicProperty(Color.BLUE);
      ellipsoid.material = new ColorMaterialProperty(Color.RED);

      const entity = new Entity();
      entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
      entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
      entity.ellipsoid = ellipsoid;

      const updater = new EllipsoidGeometryUpdater(entity, scene);
      const primitives = scene.primitives;

      const dynamicUpdater = updater.createDynamicUpdater(
        primitives,
        new PrimitiveCollection()
      );
      dynamicUpdater.update(time);
      expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

      scene.initializeFrame();
      scene.render();

      ellipsoid.fill.setValue(false);
      ellipsoid.outline.setValue(false);
      ellipsoid.outlineColor = createDynamicProperty(Color.YELLOW);
      ellipsoid.material = new ColorMaterialProperty(Color.ORANGE);
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      dynamicUpdater.update(time);

      let attributes = primitives.get(0).getGeometryInstanceAttributes(entity);
      expect(attributes.show[0]).toEqual(0);
      expect(primitives.get(0).appearance.material.uniforms.color).toEqual(
        ellipsoid.material.color.getValue()
      );

      attributes = primitives.get(1).getGeometryInstanceAttributes(entity);
      expect(attributes.show[0]).toEqual(0);
      expect(attributes.color).toEqual(
        ColorGeometryInstanceAttribute.toValue(
          ellipsoid.outlineColor.getValue()
        )
      );
    });

    it("geometryChanged event is raised when expected", function () {
      const entity = createBasicEllipsoid();
      const updater = new EllipsoidGeometryUpdater(entity, scene);

      const listener = jasmine.createSpy("listener");
      updater.geometryChanged.addEventListener(listener);

      entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
      updater._onEntityPropertyChanged(entity, "position");
      expect(listener.calls.count()).toEqual(1);

      entity.ellipsoid.radii = new ConstantProperty(new Cartesian3(1, 2, 3));
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      expect(listener.calls.count()).toEqual(2);

      entity.availability = new TimeIntervalCollection();
      updater._onEntityPropertyChanged(entity, "availability");
      expect(listener.calls.count()).toEqual(3);

      entity.ellipsoid.radii = undefined;
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      expect(listener.calls.count()).toEqual(4);

      //Modifying an unrelated property should not have any effect.
      entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
      updater._onEntityPropertyChanged(entity, "viewFrom");
      expect(listener.calls.count()).toEqual(4);

      entity.ellipsoid.radii = new SampledProperty(Cartesian3);
      updater._onEntityPropertyChanged(entity, "ellipsoid");
      expect(listener.calls.count()).toEqual(5);
    });

    function getScene() {
      return scene;
    }

    createGeometryUpdaterSpecs(
      EllipsoidGeometryUpdater,
      "ellipsoid",
      createBasicEllipsoid,
      getScene
    );

    createDynamicGeometryUpdaterSpecs(
      EllipsoidGeometryUpdater,
      "ellipsoid",
      createDynamicEllipsoid,
      getScene
    );
  },
  "WebGL"
);
