import {
  Color,
  JulianDate,
  TimeInterval,
  ConstantProperty,
  PolylineArrowMaterialProperty,
  TimeIntervalCollectionProperty,
} from "../../../Source/Cesium.js";

describe("DataSources/PolylineArrowMaterialProperty", function () {
  it("constructor provides the expected defaults", function () {
    let property = new PolylineArrowMaterialProperty();
    expect(property.color).toBeUndefined();
    expect(property.getType()).toEqual("PolylineArrow");
    expect(property.isConstant).toBe(true);

    const result = property.getValue();
    expect(result.color).toEqual(Color.WHITE);

    const colorProperty = new ConstantProperty(Color.BLUE);
    property = new PolylineArrowMaterialProperty(colorProperty);
    expect(property.color).toBe(colorProperty);

    property = new PolylineArrowMaterialProperty(Color.BLUE);
    expect(property.color).toBeInstanceOf(ConstantProperty);
    expect(property.color.getValue()).toEqual(Color.BLUE);
  });

  it("works with constant values", function () {
    const property = new PolylineArrowMaterialProperty();
    property.color = new ConstantProperty(Color.RED);

    const result = property.getValue(JulianDate.now());
    expect(result.color).toEqual(Color.RED);
  });

  it("works with dynamic values", function () {
    const property = new PolylineArrowMaterialProperty();
    property.color = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.color.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.BLUE,
      })
    );

    expect(property.isConstant).toBe(false);

    const result = property.getValue(start);
    expect(result.color).toEqual(Color.BLUE);
  });

  it("works with a result parameter", function () {
    const property = new PolylineArrowMaterialProperty();
    property.color = new ConstantProperty(Color.RED);

    const result = {
      color: Color.BLUE.clone(),
    };
    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(returnedResult).toBe(result);
    expect(result.color).toEqual(Color.RED);
  });

  it("equals works", function () {
    const left = new PolylineArrowMaterialProperty();
    left.color = new ConstantProperty(Color.WHITE);

    const right = new PolylineArrowMaterialProperty();
    right.color = new ConstantProperty(Color.WHITE);
    expect(left.equals(right)).toEqual(true);

    right.color = new ConstantProperty(Color.BLACK);
    expect(left.equals(right)).toEqual(false);
  });

  it("raises definitionChanged when a color property is assigned or modified", function () {
    const property = new PolylineArrowMaterialProperty();

    const listener = jasmine.createSpy("listener");
    property.definitionChanged.addEventListener(listener);

    const oldValue = property.color;
    property.color = new ConstantProperty(Color.WHITE);
    expect(listener).toHaveBeenCalledWith(
      property,
      "color",
      property.color,
      oldValue
    );
    listener.calls.reset();

    property.color.setValue(Color.BLACK);
    expect(listener).toHaveBeenCalledWith(
      property,
      "color",
      property.color,
      property.color
    );
    listener.calls.reset();

    property.color = property.color;
    expect(listener.calls.count()).toEqual(0);
  });
});
