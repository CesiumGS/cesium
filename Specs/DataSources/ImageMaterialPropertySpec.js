import { Cartesian2 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { ImageMaterialProperty } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";

describe("DataSources/ImageMaterialProperty", function () {
  it("constructor provides the expected defaults", function () {
    const property = new ImageMaterialProperty();
    expect(property.getType()).toEqual("Image");

    const result = property.getValue();
    expect(result.image).toBeUndefined();
    expect(result.repeat).toEqual(new Cartesian2(1.0, 1.0));
    expect(result.color).toEqual(Color.WHITE);
  });

  it("constructor sets options and allows raw assignment", function () {
    const options = {
      image: "test.invalid",
      repeat: new Cartesian2(1, 2),
      color: Color.RED.withAlpha(0.5),
      transparent: true,
    };

    const property = new ImageMaterialProperty(options);
    expect(property.image).toBeInstanceOf(ConstantProperty);
    expect(property.repeat).toBeInstanceOf(ConstantProperty);
    expect(property.color).toBeInstanceOf(ConstantProperty);
    expect(property.transparent).toBeInstanceOf(ConstantProperty);

    expect(property.image.getValue()).toEqual(options.image);
    expect(property.repeat.getValue()).toEqual(options.repeat);
    expect(property.color.getValue()).toEqual(options.color);
    expect(property.transparent.getValue()).toEqual(options.transparent);
  });

  it("works with constant values", function () {
    const property = new ImageMaterialProperty();
    property.image = new ConstantProperty("http://test.invalid/image.png");
    property.repeat = new ConstantProperty(new Cartesian2(2, 3));

    const result = property.getValue(JulianDate.now());
    expect(result.image).toEqual("http://test.invalid/image.png");
    expect(result.repeat).toEqual(new Cartesian2(2, 3));
  });

  it("works with dynamic values", function () {
    const property = new ImageMaterialProperty();
    property.image = new TimeIntervalCollectionProperty();
    property.repeat = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.image.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: "http://test.invalid/image.png",
      })
    );
    property.repeat.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: new Cartesian2(2, 3),
      })
    );

    const result = property.getValue(start);
    expect(result.image).toEqual("http://test.invalid/image.png");
    expect(result.repeat).toEqual(new Cartesian2(2, 3));
  });

  it("works with a result parameter", function () {
    const property = new ImageMaterialProperty();
    property.image = new ConstantProperty("http://test.invalid/image.png");
    property.repeat = new ConstantProperty(new Cartesian2(2, 3));

    const result = {};
    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(result).toBe(returnedResult);
    expect(result.image).toEqual("http://test.invalid/image.png");
    expect(result.repeat).toEqual(new Cartesian2(2, 3));
  });

  it("equals works", function () {
    const left = new ImageMaterialProperty();
    left.image = new ConstantProperty("http://test.invalid/image.png");
    left.repeat = new ConstantProperty(new Cartesian2(2, 3));

    const right = new ImageMaterialProperty();
    right.image = new ConstantProperty("http://test.invalid/image.png");
    right.repeat = new ConstantProperty(new Cartesian2(2, 3));

    expect(left.equals(right)).toEqual(true);

    right.image = new ConstantProperty("http://test.invalid/image2.png");
    expect(left.equals(right)).toEqual(false);

    right.image = left.image;
    right.repeat = new ConstantProperty(new Cartesian2(3, 2));
    expect(left.equals(right)).toEqual(false);

    right.repeat = left.repeat;
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new ImageMaterialProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    let oldValue = property.image;
    property.image = new ConstantProperty("http://test.invalid/image.png");
    expect(listener).toHaveBeenCalledWith(
      property,
      "image",
      property.image,
      oldValue
    );
    listener.calls.reset();

    property.image.setValue("http://test.invalid/image2.png");
    expect(listener).toHaveBeenCalledWith(
      property,
      "image",
      property.image,
      property.image
    );
    listener.calls.reset();

    property.image = property.image;
    expect(listener.calls.count()).toEqual(0);
    listener.calls.reset();

    oldValue = property.repeat;
    property.repeat = new ConstantProperty(new Cartesian2(1.5, 1.5));
    expect(listener).toHaveBeenCalledWith(
      property,
      "repeat",
      property.repeat,
      oldValue
    );
    listener.calls.reset();

    property.repeat.setValue(new Cartesian2(1.0, 1.0));
    expect(listener).toHaveBeenCalledWith(
      property,
      "repeat",
      property.repeat,
      property.repeat
    );
    listener.calls.reset();

    property.repeat = property.repeat;
    expect(listener.calls.count()).toEqual(0);
  });

  it("isConstant is only true when all properties are constant or undefined", function () {
    const property = new ImageMaterialProperty();
    expect(property.isConstant).toBe(true);

    property.image = undefined;
    property.repeat = undefined;
    expect(property.isConstant).toBe(true);

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.image = new TimeIntervalCollectionProperty();
    property.image.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: "http://test.invalid/image.png",
      })
    );
    expect(property.isConstant).toBe(false);

    property.image = undefined;
    expect(property.isConstant).toBe(true);
    property.repeat = new TimeIntervalCollectionProperty();
    property.repeat.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: new Cartesian2(2, 3),
      })
    );
    expect(property.isConstant).toBe(false);
  });
});
