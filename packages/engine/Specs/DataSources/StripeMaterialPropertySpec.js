import {
  Color,
  JulianDate,
  TimeInterval,
  ConstantProperty,
  StripeMaterialProperty,
  StripeOrientation,
  TimeIntervalCollectionProperty,
} from "../../../Source/Cesium.js";

import testDefinitionChanged from "../testDefinitionChanged.js";

describe("DataSources/StripeMaterialProperty", function () {
  it("constructor provides the expected defaults", function () {
    const property = new StripeMaterialProperty();
    expect(property.getType()).toEqual("Stripe");
    expect(property.isConstant).toBe(true);
    expect(property.orientation).toBeUndefined();
    expect(property.evenColor).toBeUndefined();
    expect(property.oddColor).toBeUndefined();
    expect(property.offset).toBeUndefined();
    expect(property.repeat).toBeUndefined();

    const result = property.getValue();
    expect(result.horizontal).toEqual(true);
    expect(result.evenColor).toEqual(Color.WHITE);
    expect(result.oddColor).toEqual(Color.BLACK);
    expect(result.offset).toEqual(0);
    expect(result.repeat).toEqual(1);
  });

  it("constructor sets options and allows raw assignment", function () {
    const options = {
      orientation: StripeOrientation.VERTICAL,
      evenColor: Color.RED,
      oddColor: Color.BLUE,
      offset: 1,
      repeat: 2,
    };

    const property = new StripeMaterialProperty(options);
    expect(property.orientation).toBeInstanceOf(ConstantProperty);
    expect(property.evenColor).toBeInstanceOf(ConstantProperty);
    expect(property.oddColor).toBeInstanceOf(ConstantProperty);
    expect(property.offset).toBeInstanceOf(ConstantProperty);
    expect(property.repeat).toBeInstanceOf(ConstantProperty);

    expect(property.orientation.getValue()).toEqual(options.orientation);
    expect(property.evenColor.getValue()).toEqual(options.evenColor);
    expect(property.oddColor.getValue()).toEqual(options.oddColor);
    expect(property.offset.getValue()).toEqual(options.offset);
    expect(property.repeat.getValue()).toEqual(options.repeat);
  });

  it("works with constant values", function () {
    const property = new StripeMaterialProperty();
    property.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
    property.evenColor = new ConstantProperty(Color.RED);
    property.oddColor = new ConstantProperty(Color.BLUE);
    property.offset = new ConstantProperty(10);
    property.repeat = new ConstantProperty(20);

    const result = property.getValue(JulianDate.now());
    expect(result.horizontal).toEqual(false);
    expect(result.evenColor).toEqual(Color.RED);
    expect(result.oddColor).toEqual(Color.BLUE);
    expect(result.offset).toEqual(10);
    expect(result.repeat).toEqual(20);
  });

  it("works with dynamic values", function () {
    const property = new StripeMaterialProperty();
    property.orientation = new TimeIntervalCollectionProperty();
    property.evenColor = new TimeIntervalCollectionProperty();
    property.oddColor = new TimeIntervalCollectionProperty();
    property.offset = new TimeIntervalCollectionProperty();
    property.repeat = new TimeIntervalCollectionProperty();

    const start = new JulianDate(1, 0);
    const stop = new JulianDate(2, 0);
    property.orientation.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: false,
      })
    );
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
    property.offset.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: 10,
      })
    );
    property.repeat.intervals.addInterval(
      new TimeInterval({
        start: start,
        stop: stop,
        data: 20,
      })
    );

    expect(property.isConstant).toBe(false);

    const result = property.getValue(start);
    expect(result.horizontal).toEqual(false);
    expect(result.evenColor).toEqual(Color.RED);
    expect(result.oddColor).toEqual(Color.BLUE);
    expect(result.offset).toEqual(10);
    expect(result.repeat).toEqual(20);
  });

  it("works with a result parameter", function () {
    const property = new StripeMaterialProperty();
    property.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
    property.evenColor = new ConstantProperty(Color.RED);
    property.oddColor = new ConstantProperty(Color.BLUE);
    property.offset = new ConstantProperty(10);
    property.repeat = new ConstantProperty(20);

    const result = {
      horizontal: true,
      evenColor: Color.YELLOW.clone(),
      oddColor: Color.YELLOW.clone(),
      offset: 3,
      repeat: 4,
    };
    const returnedResult = property.getValue(JulianDate.now(), result);
    expect(returnedResult).toBe(result);
    expect(result.horizontal).toEqual(false);
    expect(result.evenColor).toEqual(Color.RED);
    expect(result.oddColor).toEqual(Color.BLUE);
    expect(result.offset).toEqual(10);
    expect(result.repeat).toEqual(20);
  });

  it("equals works", function () {
    const left = new StripeMaterialProperty();
    left.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
    left.evenColor = new ConstantProperty(Color.RED);
    left.oddColor = new ConstantProperty(Color.BLUE);
    left.offset = new ConstantProperty(10);
    left.repeat = new ConstantProperty(20);

    const right = new StripeMaterialProperty();
    right.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
    right.evenColor = new ConstantProperty(Color.RED);
    right.oddColor = new ConstantProperty(Color.BLUE);
    right.offset = new ConstantProperty(10);
    right.repeat = new ConstantProperty(20);

    expect(left.equals(right)).toEqual(true);

    right.orientation = new ConstantProperty(StripeOrientation.HORIZONTAL);
    expect(left.equals(right)).toEqual(false);

    right.orientation = new ConstantProperty(StripeOrientation.VERTICAL);
    right.evenColor = new ConstantProperty(Color.BLACK);
    expect(left.equals(right)).toEqual(false);

    right.evenColor = new ConstantProperty(Color.RED);
    right.oddColor = new ConstantProperty(Color.BLACK);
    expect(left.equals(right)).toEqual(false);

    right.oddColor = new ConstantProperty(Color.BLUE);
    right.offset = new ConstantProperty(1);
    expect(left.equals(right)).toEqual(false);

    right.offset = new ConstantProperty(10);
    right.repeat = new ConstantProperty(2);
    expect(left.equals(right)).toEqual(false);

    right.repeat = new ConstantProperty(20);
    expect(left.equals(right)).toEqual(true);
  });

  it("raises definitionChanged when a property is assigned or modified", function () {
    const property = new StripeMaterialProperty();
    testDefinitionChanged(property, "orientation", false, true);
    testDefinitionChanged(property, "evenColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "oddColor", Color.RED, Color.BLUE);
    testDefinitionChanged(property, "offset", 2, 5);
    testDefinitionChanged(property, "repeat", 3, 4);
  });
});
