import { Color } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { PolylineOutlineMaterialProperty } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";

describe("DataSources/PolylineOutlineMaterialProperty", function () {
  it("constructor provides the expected defaults", function () {
    const property = new PolylineOutlineMaterialProperty();
    expect(property.getType()).toEqual("PolylineOutline");

    const result = property.getValue();
    expect(result.color).toEqual(Color.WHITE);
    expect(result.outlineColor).toEqual(Color.BLACK);
    expect(result.outlineWidth).toEqual(1.0);
  });

  it("constructor sets options and allows raw assignment", function () {
    const options = {
      color: Color.RED,
      outlineColor: Color.BLUE,
      outlineWidth: 5,
    };

    const property = new PolylineOutlineMaterialProperty(options);
    expect(property.color).toBeInstanceOf(ConstantProperty);
    expect(property.outlineColor).toBeInstanceOf(ConstantProperty);
    expect(property.outlineWidth).toBeInstanceOf(ConstantProperty);

    expect(property.color.getValue()).toEqual(options.color);
    expect(property.outlineColor.getValue()).toEqual(options.outlineColor);
    expect(property.outlineWidth.getValue()).toEqual(options.outlineWidth);
  });

  it("works with constant values", function () {
    const property = new PolylineOutlineMaterialProperty();
    property.color = new ConstantProperty(Color.RED);
    property.outlineColor = new ConstantProperty(Color.BLUE);

    const result = property.getValue(JulianDate.now());
    expect(result.color).toEqual(Color.RED);
    expect(result.outlineColor).toEqual(Color.BLUE);
  });

  it("works with dynamic values", function () {
    const property = new PolylineOutlineMaterialProperty();
    property.color = new TimeIntervalCollectionProperty();
    property.outlineColor = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.color.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.BLUE,
      })
    );
    property.outlineColor.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.RED,
      })
    );

    const result = property.getValue(start);
    expect(result.color).toEqual(Color.BLUE);
    expect(result.outlineColor).toEqual(Color.RED);
  });

  it("works with a result parameter", function () {
    const property = new PolylineOutlineMaterialProperty();
    property.color = new ConstantProperty(Color.RED);
    property.outlineColor = new ConstantProperty(Color.BLUE);

    const result = {
      color: Color.YELLOW.clone(),
      outlineColor: Color.BROWN.clone(),
    };
    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(returnedResult).toBe(result);
    expect(result.color).toEqual(Color.RED);
    expect(result.outlineColor).toEqual(Color.BLUE);
  });

  it("equals works", function () {
    const left = new PolylineOutlineMaterialProperty();
    left.color = new ConstantProperty(Color.WHITE);
    left.outlineColor = new ConstantProperty(Color.BLACK);
    left.outlineWidth = new ConstantProperty(5);

    const right = new PolylineOutlineMaterialProperty();
    right.color = new ConstantProperty(Color.WHITE);
    right.outlineColor = new ConstantProperty(Color.BLACK);
    right.outlineWidth = new ConstantProperty(5);
    expect(left.equals(right)).toEqual(true);

    right.color = new ConstantProperty(Color.RED);
    expect(left.equals(right)).toEqual(false);

    right.color = left.color;
    right.outlineColor = new ConstantProperty(Color.BLUE);
    expect(left.equals(right)).toEqual(false);

    right.outlineColor = left.outlineColor;
    right.outlineWidth = new ConstantProperty(6);
    expect(left.equals(right)).toEqual(false);
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new PolylineOutlineMaterialProperty();
    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    let oldValue = property.color;
    property.color = new ConstantProperty(Color.RED);
    expect(listener).toHaveBeenCalledWith(
      property,
      "color",
      property.color,
      oldValue
    );
    listener.calls.reset();

    property.color.setValue(Color.YELLOW);
    expect(listener).toHaveBeenCalledWith(
      property,
      "color",
      property.color,
      property.color
    );
    listener.calls.reset();

    property.color = property.color;
    expect(listener.calls.count()).toEqual(0);
    listener.calls.reset();

    oldValue = property.outlineColor;
    property.outlineColor = new ConstantProperty(Color.BLUE);
    expect(listener).toHaveBeenCalledWith(
      property,
      "outlineColor",
      property.outlineColor,
      oldValue
    );
    listener.calls.reset();

    property.outlineColor.setValue(Color.GREEN);
    expect(listener).toHaveBeenCalledWith(
      property,
      "outlineColor",
      property.outlineColor,
      property.outlineColor
    );
    listener.calls.reset();

    property.outlineColor = property.outlineColor;
    expect(listener.calls.count()).toEqual(0);

    oldValue = property.outlineWidth;
    property.outlineWidth = new ConstantProperty(2.5);
    expect(listener).toHaveBeenCalledWith(
      property,
      "outlineWidth",
      property.outlineWidth,
      oldValue
    );
    listener.calls.reset();

    property.outlineWidth.setValue(1.5);
    expect(listener).toHaveBeenCalledWith(
      property,
      "outlineWidth",
      property.outlineWidth,
      property.outlineWidth
    );
    listener.calls.reset();

    property.outlineWidth = property.outlineWidth;
    expect(listener.calls.count()).toEqual(0);
  });

  it("isConstant is only true when all properties are constant or undefined", function () {
    const property = new PolylineOutlineMaterialProperty();
    expect(property.isConstant).toBe(true);

    property.color = undefined;
    property.outlineColor = undefined;
    property.outlineWidth = undefined;
    expect(property.isConstant).toBe(true);

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.color = new TimeIntervalCollectionProperty();
    property.color.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.RED,
      })
    );
    expect(property.isConstant).toBe(false);

    property.color = undefined;
    expect(property.isConstant).toBe(true);
    property.outlineColor = new TimeIntervalCollectionProperty();
    property.outlineColor.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.BLUE,
      })
    );
    expect(property.isConstant).toBe(false);

    property.outlineColor = undefined;
    expect(property.isConstant).toBe(true);
    property.outlineWidth = new TimeIntervalCollectionProperty();
    property.outlineWidth.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: 2.0,
      })
    );
    expect(property.isConstant).toBe(false);
  });
});
