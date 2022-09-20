import {
  Color,
  ColorGeometryInstanceAttribute,
  DistanceDisplayCondition,
  DistanceDisplayConditionGeometryInstanceAttribute,
  JulianDate,
  ShowGeometryInstanceAttribute,
  TimeInterval,
  ColorMaterialProperty,
  ConstantProperty,
  EllipsoidGeometryUpdater,
  Entity,
  GridMaterialProperty,
  SampledProperty,
  TimeIntervalCollectionProperty,
  ShadowMode,
} from "../packages/engine/index.js";

function createGeometryUpdaterSpecs(
  Updater,
  geometryPropertyName,
  createEntity,
  getScene
) {
  const time = JulianDate.now();

  it("Constructor sets expected defaults", function () {
    const entity = createEntity();
    const updater = new Updater(entity, getScene());

    expect(updater.isDestroyed()).toBe(false);
    expect(updater.entity).toBe(entity);
    expect(updater.isClosed).toBe(updater._getIsClosed(updater._options));
    expect(updater.fillEnabled).toBe(true);
    expect(updater.fillMaterialProperty).toBeInstanceOf(ColorMaterialProperty);
    expect(updater.outlineEnabled).toBe(false);
    expect(updater.hasConstantFill).toBe(true);
    expect(updater.hasConstantOutline).toBe(true);
    expect(updater.outlineColorProperty).toBe(undefined);
    expect(updater.outlineWidth).toBe(1.0);
    expect(updater.shadowsProperty.getValue()).toBe(ShadowMode.DISABLED);
    expect(updater.distanceDisplayConditionProperty.getValue()).toEqual(
      new DistanceDisplayCondition()
    );
    expect(updater.isDynamic).toBe(false);
    expect(updater.onTerrain).toBe(false);
    expect(updater.isOutlineVisible(time)).toBe(false);
    expect(updater.isFilled(time)).toBe(true);
    updater.destroy();
    expect(updater.isDestroyed()).toBe(true);
  });

  it("No geometry created when entity geometry property is undefined ", function () {
    const entity = new Entity();
    const updater = new Updater(entity, getScene());

    expect(updater.fillEnabled).toBe(false);
    expect(updater.outlineEnabled).toBe(false);
    expect(updater.isDynamic).toBe(false);
  });

  it("No geometry available when not filled or outline.", function () {
    const entity = createEntity();
    entity[geometryPropertyName].fill = new ConstantProperty(false);
    entity[geometryPropertyName].outline = new ConstantProperty(false);
    const updater = new Updater(entity, getScene());

    expect(updater.fillEnabled).toBe(false);
    expect(updater.outlineEnabled).toBe(false);
    expect(updater.isDynamic).toBe(false);
  });

  it("Values correct when using default graphics", function () {
    const entity = createEntity();
    const updater = new Updater(entity, getScene());

    expect(updater.isClosed).toBe(updater._getIsClosed(updater._options));
    expect(updater.fillEnabled).toBe(true);
    expect(updater.fillMaterialProperty).toEqual(
      new ColorMaterialProperty(Color.WHITE)
    );
    expect(updater.outlineEnabled).toBe(false);
    expect(updater.hasConstantFill).toBe(true);
    expect(updater.hasConstantOutline).toBe(true);
    expect(updater.outlineColorProperty).toBe(undefined);
    expect(updater.outlineWidth).toBe(1.0);
    expect(updater.shadowsProperty).toEqual(
      new ConstantProperty(ShadowMode.DISABLED)
    );
    expect(updater.distanceDisplayConditionProperty).toEqual(
      new ConstantProperty(new DistanceDisplayCondition())
    );
    expect(updater.isDynamic).toBe(false);
  });

  it("material is correctly exposed.", function () {
    const entity = createEntity();
    entity[geometryPropertyName].material = new GridMaterialProperty(
      Color.BLUE
    );
    const updater = new Updater(entity, getScene());

    expect(updater.fillMaterialProperty).toBe(
      entity[geometryPropertyName].material
    );
  });

  it("A time-varying outlineWidth causes geometry to be dynamic", function () {
    const entity = createEntity();
    entity[geometryPropertyName].outlineWidth = new SampledProperty(Number);
    entity[geometryPropertyName].outlineWidth.addSample(time, 1);
    const updater = new Updater(entity, getScene());

    expect(updater.isDynamic).toBe(true);
  });

  it("Correctly exposes outlineWidth", function () {
    const entity = createEntity();
    entity[geometryPropertyName].outlineWidth = new ConstantProperty(8);
    const updater = new Updater(entity, getScene());

    expect(updater.outlineWidth).toBe(8);
  });

  it("Attributes have expected values at creation time", function () {
    const time1 = new JulianDate(0, 0);
    const time2 = new JulianDate(10, 0);
    const time3 = new JulianDate(20, 0);

    const fill = new TimeIntervalCollectionProperty();
    fill.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: false,
      })
    );
    fill.intervals.addInterval(
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

    const outline = new TimeIntervalCollectionProperty();
    outline.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: false,
      })
    );
    outline.intervals.addInterval(
      new TimeInterval({
        start: time2,
        stop: time3,
        isStartIncluded: false,
        data: true,
      })
    );

    const outlineColor = new SampledProperty(Color);
    outlineColor.addSample(time, Color.BLUE);
    outlineColor.addSample(time2, Color.RED);
    outlineColor.addSample(time3, Color.YELLOW);

    const entity = createEntity();
    entity[geometryPropertyName].fill = fill;
    entity[geometryPropertyName].material = colorMaterial;
    entity[geometryPropertyName].outline = outline;
    entity[geometryPropertyName].outlineColor = outlineColor;

    const updater = new Updater(entity, getScene());

    let instance = updater.createFillGeometryInstance(time2);
    let attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(
        colorMaterial.color.getValue(time2)
      )
    );
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(fill.getValue(time2))
    );

    instance = updater.createOutlineGeometryInstance(time2);
    attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2))
    );
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(outline.getValue(time2))
    );
  });

  it("createFillGeometryInstance obeys Entity.show is false.", function () {
    const entity = createEntity();
    entity.show = false;
    entity[geometryPropertyName].fill = true;
    const updater = new Updater(entity, getScene());
    const instance = updater.createFillGeometryInstance(new JulianDate());
    const attributes = instance.attributes;
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(false)
    );
  });

  it("createOutlineGeometryInstance obeys Entity.show is false.", function () {
    const entity = createEntity();
    entity.show = false;
    entity[geometryPropertyName].outline = true;
    const updater = new Updater(entity, getScene());
    const instance = updater.createFillGeometryInstance(new JulianDate());
    const attributes = instance.attributes;
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(false)
    );
  });

  it("createFillGeometryInstance throws if object is not filled", function () {
    if (Updater === EllipsoidGeometryUpdater) {
      // ellipsoid doesn't throw developer error because it always creates both fill and outline when dynamic
      return;
    }
    const entity = new Entity();
    const updater = new Updater(entity, getScene());
    expect(function () {
      return updater.createFillGeometryInstance(time);
    }).toThrowDeveloperError();
  });

  it("createFillGeometryInstance throws if no time provided", function () {
    const entity = createEntity();
    const updater = new Updater(entity, getScene());
    expect(function () {
      return updater.createFillGeometryInstance(undefined);
    }).toThrowDeveloperError();
  });

  it("createOutlineGeometryInstance throws if object is not outlined", function () {
    if (Updater === EllipsoidGeometryUpdater) {
      // ellipsoid doesn't throw developer error because it always creates both fill and outline when dynamic
      return;
    }
    const entity = new Entity();
    const updater = new Updater(entity, getScene());
    expect(function () {
      return updater.createOutlineGeometryInstance(time);
    }).toThrowDeveloperError();
  });

  it("createOutlineGeometryInstance throws if no time provided", function () {
    const entity = createEntity();
    entity[geometryPropertyName].outline = new ConstantProperty(true);
    const updater = new Updater(entity, getScene());
    expect(function () {
      return updater.createOutlineGeometryInstance(undefined);
    }).toThrowDeveloperError();
  });

  function validateGeometryInstanceAttributes(options) {
    const entity = createEntity();

    const geometryProperty = entity[geometryPropertyName];
    geometryProperty.show = true;
    geometryProperty.fill = true;
    geometryProperty.material = options.material;
    geometryProperty.outline = true;
    geometryProperty.outlineColor = new ConstantProperty(options.outlineColor);
    geometryProperty.distanceDisplayCondition =
      options.distanceDisplayCondition;

    const updater = new Updater(entity, getScene());

    let instance;
    let attributes;

    instance = updater.createFillGeometryInstance(time);
    attributes = instance.attributes;
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
      ShowGeometryInstanceAttribute.toValue(true)
    );
    if (options.distanceDisplayCondition) {
      expect(attributes.distanceDisplayCondition.value).toEqual(
        DistanceDisplayConditionGeometryInstanceAttribute.toValue(
          options.distanceDisplayCondition
        )
      );
    }

    instance = updater.createOutlineGeometryInstance(time);
    attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(options.outlineColor)
    );
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(true)
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
    validateGeometryInstanceAttributes({
      material: new ColorMaterialProperty(Color.RED),
      outlineColor: Color.BLUE,
    });
  });

  it("Creates expected per-material geometry", function () {
    validateGeometryInstanceAttributes({
      material: new GridMaterialProperty(),
      outlineColor: Color.GREEN,
    });
  });

  it("Creates expected distance display condition geometry", function () {
    validateGeometryInstanceAttributes({
      material: new ColorMaterialProperty(Color.BLUE),
      outlineColor: Color.RED,
      distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
    });
  });

  it("Attributes have expected values at creation time", function () {
    const time1 = new JulianDate(0, 0);
    const time2 = new JulianDate(10, 0);
    const time3 = new JulianDate(20, 0);

    const fill = new TimeIntervalCollectionProperty();
    fill.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: false,
      })
    );
    fill.intervals.addInterval(
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

    const outline = new TimeIntervalCollectionProperty();
    outline.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: false,
      })
    );
    outline.intervals.addInterval(
      new TimeInterval({
        start: time2,
        stop: time3,
        isStartIncluded: false,
        data: true,
      })
    );

    const outlineColor = new SampledProperty(Color);
    outlineColor.addSample(time, Color.BLUE);
    outlineColor.addSample(time2, Color.RED);
    outlineColor.addSample(time3, Color.YELLOW);

    const entity = createEntity();
    const geoemtry = entity[geometryPropertyName];
    geoemtry.fill = fill;
    geoemtry.material = colorMaterial;
    geoemtry.outline = outline;
    geoemtry.outlineColor = outlineColor;

    const updater = new Updater(entity, getScene());

    let instance = updater.createFillGeometryInstance(time2);
    let attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(
        colorMaterial.color.getValue(time2)
      )
    );
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(fill.getValue(time2))
    );

    instance = updater.createOutlineGeometryInstance(time2);
    attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2))
    );
    expect(attributes.show.value).toEqual(
      ShowGeometryInstanceAttribute.toValue(outline.getValue(time2))
    );
  });

  it("Works with dynamic color with missing interval", function () {
    const time1 = new JulianDate(0, 0);
    const time2 = new JulianDate(10, 0);
    const missingTime = new JulianDate(15, 0);
    const time3 = new JulianDate(20, 0);
    const time4 = new JulianDate(30, 0);

    const colorMaterial = new ColorMaterialProperty();

    const color = new TimeIntervalCollectionProperty();
    color.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: Color.BLUE,
      })
    );
    color.intervals.addInterval(
      new TimeInterval({
        start: time3,
        stop: time4,
        isStartIncluded: false,
        data: Color.YELLOW,
      })
    );
    colorMaterial.color = color;

    const outlineColor = new TimeIntervalCollectionProperty();
    outlineColor.intervals.addInterval(
      new TimeInterval({
        start: time1,
        stop: time2,
        data: Color.RED,
      })
    );
    outlineColor.intervals.addInterval(
      new TimeInterval({
        start: time3,
        stop: time4,
        isStartIncluded: false,
        data: Color.GREEN,
      })
    );

    const entity = createEntity();
    const geometry = entity[geometryPropertyName];
    geometry.fill = true;
    geometry.outline = true;
    geometry.material = colorMaterial;
    geometry.outlineColor = outlineColor;

    const updater = new Updater(entity, getScene());

    let instance = updater.createFillGeometryInstance(missingTime);
    let attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(Color.WHITE)
    );

    instance = updater.createOutlineGeometryInstance(missingTime);
    attributes = instance.attributes;
    expect(attributes.color.value).toEqual(
      ColorGeometryInstanceAttribute.toValue(Color.BLACK)
    );
  });
}
export default createGeometryUpdaterSpecs;
