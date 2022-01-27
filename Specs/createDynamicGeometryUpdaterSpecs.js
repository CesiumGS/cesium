import { BoundingSphere } from "../Source/Cesium.js";
import { JulianDate } from "../Source/Cesium.js";
import { Math as CesiumMath } from "../Source/Cesium.js";
import { BoundingSphereState } from "../Source/Cesium.js";
import { EllipsoidGeometryUpdater } from "../Source/Cesium.js";
import { PrimitiveCollection } from "../Source/Cesium.js";
import createDynamicProperty from "./createDynamicProperty.js";
import pollToPromise from "./pollToPromise.js";

function createDynamicGeometryUpdaterSpecs(
  Updater,
  geometryPropertyName,
  createDynamicEntity,
  getScene
) {
  const time = JulianDate.now();

  it("dynamic updater sets properties", function () {
    if (Updater === EllipsoidGeometryUpdater) {
      // Dynamic ellipsoids create primitives a little differently
      // This is covered in EllipsoidGeometryUpdaterSpecs instead
      return;
    }
    const entity = createDynamicEntity();
    const geometry = entity[geometryPropertyName];

    geometry.show = createDynamicProperty(true);
    geometry.outline = createDynamicProperty(true);
    geometry.fill = createDynamicProperty(true);

    const updater = new Updater(entity, getScene());
    const primitives = new PrimitiveCollection();
    const groundPrimitives = new PrimitiveCollection();
    const dynamicUpdater = updater.createDynamicUpdater(
      primitives,
      groundPrimitives
    );
    expect(primitives.length).toBe(0);
    expect(groundPrimitives.length).toBe(0);

    dynamicUpdater.update(JulianDate.now());
    expect(primitives.length).toBe(2);
    expect(groundPrimitives.length).toBe(0);
    expect(dynamicUpdater.isDestroyed()).toBe(false);

    expect(dynamicUpdater._options.id).toBe(entity);

    entity.show = false;
    updater._onEntityPropertyChanged(entity, "show");
    dynamicUpdater.update(JulianDate.now());
    expect(primitives.length).toBe(0);
    entity.show = true;
    updater._onEntityPropertyChanged(entity, "show");

    geometry.show.setValue(false);
    updater._onEntityPropertyChanged(entity, "box");
    dynamicUpdater.update(JulianDate.now());
    expect(primitives.length).toBe(0);

    geometry.show.setValue(true);
    geometry.fill.setValue(false);
    updater._onEntityPropertyChanged(entity, "box");
    dynamicUpdater.update(JulianDate.now());
    expect(primitives.length).toBe(1);

    geometry.fill.setValue(true);
    geometry.outline.setValue(false);
    updater._onEntityPropertyChanged(entity, "box");
    dynamicUpdater.update(JulianDate.now());
    expect(primitives.length).toBe(1);

    dynamicUpdater.destroy();
    expect(primitives.length).toBe(0);
    updater.destroy();
  });

  it("Computes dynamic geometry bounding sphere for fill.", function () {
    const scene = getScene();
    const entity = createDynamicEntity();
    const geometry = entity[geometryPropertyName];
    const updater = new Updater(entity, scene);
    geometry.fill = true;
    geometry.outline = false;
    updater._onEntityPropertyChanged(entity, updater._geometryPropertyName);
    const dynamicUpdater = updater.createDynamicUpdater(
      scene.primitives,
      scene.groundPrimitives
    );
    dynamicUpdater.update(time);

    let state;
    const result = new BoundingSphere();

    return pollToPromise(function () {
      scene.initializeFrame();
      scene.render();
      state = dynamicUpdater.getBoundingSphere(result);
      return state !== BoundingSphereState.PENDING;
    }).then(function () {
      const primitive = scene.primitives.get(0);
      expect(state).toBe(BoundingSphereState.DONE);
      const attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(result).toEqualEpsilon(
        attributes.boundingSphere,
        CesiumMath.EPSILON6
      );

      updater.destroy();
      scene.primitives.removeAll();
    });
  });

  it("Computes dynamic geometry bounding sphere for outline.", function () {
    const scene = getScene();
    const entity = createDynamicEntity();
    const geometry = entity[geometryPropertyName];
    const updater = new Updater(entity, scene);
    geometry.fill = false;
    geometry.outline = true;
    updater._onEntityPropertyChanged(entity, updater._geometryPropertyName);

    const dynamicUpdater = updater.createDynamicUpdater(
      scene.primitives,
      scene.groundPrimitives
    );
    dynamicUpdater.update(time);

    let state;
    const result = new BoundingSphere();
    return pollToPromise(function () {
      scene.initializeFrame();
      scene.render();
      state = dynamicUpdater.getBoundingSphere(result);
      return state !== BoundingSphereState.PENDING;
    }).then(function () {
      const primitive = scene.primitives.get(0);
      expect(state).toBe(BoundingSphereState.DONE);
      const attributes = primitive.getGeometryInstanceAttributes(entity);
      expect(result).toEqualEpsilon(
        attributes.boundingSphere,
        CesiumMath.EPSILON6
      );

      updater.destroy();
      scene.primitives.removeAll();
    });
  });

  it("Compute dynamic geometry bounding sphere throws without result.", function () {
    const scene = getScene();
    const entity = createDynamicEntity();
    const updater = new Updater(entity, scene);
    const dynamicUpdater = updater.createDynamicUpdater(
      scene.primitives,
      scene.groundPrimitives
    );

    expect(function () {
      dynamicUpdater.getBoundingSphere(undefined);
    }).toThrowDeveloperError();

    updater.destroy();
    scene.primitives.removeAll();
  });
}
export default createDynamicGeometryUpdaterSpecs;
