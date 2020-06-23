import { Color } from "../Source/Cesium.js";
import { GeometryOffsetAttribute } from "../Source/Cesium.js";
import { JulianDate } from "../Source/Cesium.js";
import { ColorMaterialProperty } from "../Source/Cesium.js";
import { ConstantProperty } from "../Source/Cesium.js";
import { SampledProperty } from "../Source/Cesium.js";
import { ClassificationType } from "../Source/Cesium.js";
import { GroundPrimitive } from "../Source/Cesium.js";
import { HeightReference } from "../Source/Cesium.js";
import { PrimitiveCollection } from "../Source/Cesium.js";

function createGeometryUpdaterGroundGeometrySpecs(
  Updater,
  geometryPropertyName,
  createEntity,
  createDynamicEntity,
  getScene
) {
  var time = JulianDate.now();

  it("has default zIndex of zero", function () {
    var entity = createEntity();

    var updater = new Updater(entity, getScene());
    expect(updater.zIndex.getValue()).toBe(0);
  });

  it("uses zIndex value", function () {
    var entity = createEntity();
    entity[geometryPropertyName].zIndex = 22;

    var updater = new Updater(entity, getScene());
    expect(updater.zIndex.getValue()).toBe(22);
  });

  it("A time-varying color does not cause ground geometry to be dynamic", function () {
    var entity = createEntity();
    var color = new SampledProperty(Color);
    color.addSample(time, Color.WHITE);
    entity[geometryPropertyName].material = new ColorMaterialProperty(color);
    var updater = new Updater(entity, getScene());

    expect(updater.isDynamic).toBe(false);
  });

  it("Checks that an entity without height and extrudedHeight is on terrain", function () {
    var entity = createEntity();
    var geometry = entity[geometryPropertyName];
    geometry.height = undefined;
    geometry.outline = new ConstantProperty(true);

    var updater = new Updater(entity, getScene());

    if (GroundPrimitive.isSupported(getScene())) {
      expect(updater.onTerrain).toBe(true);
      expect(updater.outlineEnabled).toBe(false);
    } else {
      expect(updater.onTerrain).toBe(false);
      expect(updater.outlineEnabled).toBe(true);
    }
  });

  it("Checks that an entity with height isn't on terrain", function () {
    var entity = createEntity();
    entity[geometryPropertyName].height = new ConstantProperty(1);

    var updater = new Updater(entity, getScene());

    expect(updater.onTerrain).toBe(false);
  });

  it("Checks that an entity with extrudedHeight isn't on terrain", function () {
    var entity = createEntity();
    var geometry = entity[geometryPropertyName];
    geometry.height = undefined;
    geometry.extrudedHeight = new ConstantProperty(1);

    var updater = new Updater(entity, getScene());

    expect(updater.onTerrain).toBe(false);
  });

  it("fill is true sets onTerrain to true", function () {
    var entity = createEntity();
    entity[geometryPropertyName].fill = true;
    var updater = new Updater(entity, getScene());
    if (GroundPrimitive.isSupported(getScene())) {
      expect(updater.onTerrain).toBe(true);
    } else {
      expect(updater.onTerrain).toBe(false);
    }
  });

  it("fill is false sets onTerrain to false", function () {
    var entity = createEntity();
    entity[geometryPropertyName].fill = false;
    var updater = new Updater(entity, getScene());
    expect(updater.onTerrain).toBe(false);
  });

  it("a defined height sets onTerrain to false", function () {
    var entity = createEntity();
    var geometry = entity[geometryPropertyName];
    geometry.fill = true;
    geometry.height = 0;
    var updater = new Updater(entity, getScene());
    expect(updater.onTerrain).toBe(false);
  });

  it("a defined extrudedHeight sets onTerrain to false", function () {
    var entity = createEntity();
    var geometry = entity[geometryPropertyName];
    geometry.fill = true;
    geometry.extrudedHeight = 12;
    var updater = new Updater(entity, getScene());
    expect(updater.onTerrain).toBe(false);
  });

  it("Creates geometry with no offsetAttribute when geometry is on terrain", function () {
    var entity = createEntity();

    var updater = new Updater(entity, getScene());

    var instance;
    var geometry;
    instance = updater.createFillGeometryInstance(time);
    geometry = instance.geometry;
    expect(geometry._offsetAttribute).toBeUndefined();
  });

  it("Creates geometry with expected offsetAttribute based on height and extrudedHeight", function () {
    var entity = createEntity();
    var graphics = entity[geometryPropertyName];
    graphics.outline = true;
    graphics.outlineColor = Color.BLACK;
    graphics.height = new ConstantProperty(20.0);
    graphics.extrudedHeight = new ConstantProperty(0.0);
    var updater = new Updater(entity, getScene());

    var instance;

    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();

    graphics.heightReference = new ConstantProperty(HeightReference.NONE);
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.NONE
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();

    graphics.heightReference = new ConstantProperty(HeightReference.NONE);
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();

    graphics.heightReference = new ConstantProperty(HeightReference.NONE);
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.RELATIVE_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );

    graphics.heightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.NONE
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );

    graphics.heightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );

    graphics.heightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.RELATIVE_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
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
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.NONE
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );

    graphics.heightReference = new ConstantProperty(
      HeightReference.RELATIVE_TO_GROUND
    );
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.CLAMP_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.TOP
    );

    graphics.heightReference = new ConstantProperty(
      HeightReference.RELATIVE_TO_GROUND
    );
    graphics.extrudedHeightReference = new ConstantProperty(
      HeightReference.RELATIVE_TO_GROUND
    );
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.ALL
    );
    instance = updater.createOutlineGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toEqual(
      GeometryOffsetAttribute.ALL
    );

    graphics.height = undefined;
    graphics.extrudedHeight = undefined;
    updater._onEntityPropertyChanged(entity, geometryPropertyName);
    instance = updater.createFillGeometryInstance(time);
    expect(instance.geometry._offsetAttribute).toBeUndefined();
  });

  it("color material sets onTerrain to true", function () {
    var entity = createEntity();
    var geometry = entity[geometryPropertyName];
    geometry.fill = true;
    geometry.material = new ColorMaterialProperty(Color.WHITE);
    var updater = new Updater(entity, getScene());
    if (GroundPrimitive.isSupported(getScene())) {
      expect(updater.onTerrain).toBe(true);
    } else {
      expect(updater.onTerrain).toBe(false);
    }
  });

  it("dynamic updater on terrain", function () {
    var entity = createDynamicEntity();

    var updater = new Updater(entity, getScene());
    var primitives = new PrimitiveCollection();
    var groundPrimitives = new PrimitiveCollection();
    var dynamicUpdater = updater.createDynamicUpdater(
      primitives,
      groundPrimitives
    );
    expect(dynamicUpdater.isDestroyed()).toBe(false);
    expect(primitives.length).toBe(0);
    expect(groundPrimitives.length).toBe(0);

    dynamicUpdater.update(time);

    if (GroundPrimitive.isSupported(getScene())) {
      expect(primitives.length).toBe(0);
      expect(groundPrimitives.length).toBe(1);
    } else {
      expect(primitives.length).toBe(2);
      expect(groundPrimitives.length).toBe(0);
    }

    dynamicUpdater.destroy();
    updater.destroy();
  });

  it("dynamic updater on terrain propagates classification type", function () {
    var entity = createDynamicEntity();
    entity[geometryPropertyName].classificationType = ClassificationType.BOTH;

    var updater = new Updater(entity, getScene());
    var primitives = new PrimitiveCollection();
    var groundPrimitives = new PrimitiveCollection();
    var dynamicUpdater = updater.createDynamicUpdater(
      primitives,
      groundPrimitives
    );

    dynamicUpdater.update(time);

    if (GroundPrimitive.isSupported(getScene())) {
      expect(groundPrimitives.get(0).classificationType).toEqual(
        ClassificationType.BOTH
      );
    }

    dynamicUpdater.destroy();
    updater.destroy();
  });
}
export default createGeometryUpdaterGroundGeometrySpecs;
