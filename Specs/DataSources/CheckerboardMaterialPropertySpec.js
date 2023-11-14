import { Cartesian2 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { TimeInterval } from "../../Source/Cesium.js";
import { CheckerboardMaterialProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { TimeIntervalCollectionProperty } from "../../Source/Cesium.js";
import testDefinitionChanged from "../testDefinitionChanged.js";

describe("DataSources/CheckerboardMaterialProperty", function () {
  it("constructor provides the expected defaults", function () {
    const property = new CheckerboardMaterialProperty();
    expect(property.getType()).toEqual("Checkerboard");
    expect(property.isConstant).toBe(true);
    expect(property.evenColor).toBeUndefined();
    expect(property.oddColor).toBeUndefined();
    expect(property.repeat).toBeUndefined();

    const result = property.getValue();
    expect(result.lightColor).toEqual(Color.WHITE);
    expect(result.darkColor).toEqual(Color.BLACK);
    expect(result.repeat).toEqual(new Cartesian2(2.0, 2.0));
  });

  it("constructor sets options and allows raw assignment", function () {
    const options = {
      evenColor: Color.RED,
      oddColor: Color.BLUE,
      repeat: new Cartesian2(1, 2),
    };

    const property = new CheckerboardMaterialProperty(options);
    expect(property.evenColor).toBeInstanceOf(ConstantProperty);
    expect(property.oddColor).toBeInstanceOf(ConstantProperty);
    expect(property.repeat).toBeInstanceOf(ConstantProperty);

    expect(property.evenColor.getValue()).toEqual(options.evenColor);
    expect(property.oddColor.getValue()).toEqual(options.oddColor);
    expect(property.repeat.getValue()).toEqual(options.repeat);
  });

  it("works with constant values", function () {
    const property = new CheckerboardMaterialProperty();
    property.evenColor = new ConstantProperty(Color.RED);
    property.oddColor = new ConstantProperty(Color.BLUE);
    property.repeat = new ConstantProperty(new Cartesian2(5, 5));

    const result = property.getValue(JulianDate.now());
    expect(result.lightColor).toEqual(Color.RED);
    expect(result.darkColor).toEqual(Color.BLUE);
    expect(result.repeat).toEqual(new Cartesian2(5, 5));
  });

  it("works with dynamic values", function () {
    const property = new CheckerboardMaterialProperty();
    property.evenColor = new TimeIntervalCollectionProperty();
    property.oddColor = new TimeIntervalCollectionProperty();
    property.repeat = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.evenColor.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.RED,
      })
    );
    property.oddColor.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: Color.BLUE,
      })
    );
    property.repeat.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: new Cartesian2(5, 5),
      })
    );

    expect(property.isConstant).toBe(false);

    const result = property.getValue(start);
    expect(result.lightColor).toEqual(Color.RED);
    expect(result.darkColor).toEqual(Color.BLUE);
    expect(result.repeat).toEqual(new Cartesian2(5, 5));
  });

  it("works with a result parameter", function () {
    const property = new CheckerboardMaterialProperty();
    property.evenColor = new ConstantProperty(Color.RED);
    property.oddColor = new ConstantProperty(Color.BLUE);
    property.repeat = new ConstantProperty(new Cartesian2(5, 5));

    const result = {
      lightColor: Color.YELLOW.clone(),
      darkColor: Color.YELLOW.clone(),
      repeat: new Cartesian2(1, 1),
    };
    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(returnedResult).toBe(result);
    expect(result.lightColor).toEqual(Color.RED);
    expect(result.darkColor).toEqual(Color.BLUE);
    expect(result.repeat).toEqual(new Cartesian2(5, 5));
  });

  it("equals works", function () {
    const left = new CheckerboardMaterialProperty();
    left.evenColor = new ConstantProperty(Color.RED);
    left.oddColor = new ConstantProperty(Color.BLUE);
    left.repeat = new ConstantProperty(new Cartesian2(5, 5));

    const right = new CheckerboardMaterialProperty();
    right.evenColor = new ConstantProperty(Color.RED);
    right.oddColor = new ConstantProperty(Color.BLUE);
    right.repeat = new ConstantProperty(new Cartesian2(5, 5));

    expect(left.equals(right)).toEqual(true);

    right.evenColor = new ConstantProperty(Color.BLACK);
    expect(left.equals(right)).toEqual(false);

    right.evenColor = new ConstantProperty(Color.RED);
    right.oddColor = new ConstantProperty(Color.BLACK);
    expect(left.equals(right)).toEqual(false);

    right.oddColor = new ConstantProperty(Color.BLUE);
    right.repeat = new ConstantProperty(new Cartesian2(5, 6));
    expect(left.equals(right)).toEqual(false);

    right.repeat = new ConstantProperty(new Cartesian2(5, 5));
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new CheckerboardMaterialProperty();
    testDefinitionChanged(property, "evenColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "oddColor", Color.RED, Color.BLUE);
    testDefinitionChanged(
      property,
      "repeat",
      new Cartesian2(5, 5),
      new Cartesian2(7, 7)
    );
  });
});
