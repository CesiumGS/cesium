import {
  Rectangle,
  ImageryCoverage,
  CartesianRectangle,
  Math as CesiumMath,
} from "../../../index.js";

describe("Scene/Model/ImageryCoverage", function () {
  it("_localizeCartographicRectanglesToCartesianRectangle returns unit rectangle for equal inputs", async function () {
    const ra = Rectangle.fromDegrees(10, 10, 20, 20);
    const rb = Rectangle.fromDegrees(10, 10, 20, 20);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(0, 0, 1, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle computes offset for overlapping inputs", async function () {
    const ra = Rectangle.fromDegrees(15, 15, 25, 25);
    const rb = Rectangle.fromDegrees(10, 10, 20, 20);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(0.5, 0.5, 1.5, 1.5);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle computes offset for non-overlapping inputs", async function () {
    const ra = Rectangle.fromDegrees(30, 30, 50, 50);
    const rb = Rectangle.fromDegrees(10, 10, 20, 20);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(2, 2, 4, 4);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner rectangle is left of antimeridian", async function () {
    const ra = Rectangle.fromDegrees(160, 10, 170, 50);
    const rb = Rectangle.fromDegrees(155, 10, -155, 50);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(0.1, 0, 0.3, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner rectangle is right of antimeridian", async function () {
    const ra = Rectangle.fromDegrees(-175, 10, -165, 50);
    const rb = Rectangle.fromDegrees(155, 10, -155, 50);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(0.6, 0, 0.8, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner rectangle crosses antimeridian", async function () {
    const ra = Rectangle.fromDegrees(175, 10, -175, 50);
    const rb = Rectangle.fromDegrees(155, 10, -155, 50);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(0.4, 0, 0.6, 1);

    console.log(actual);

    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner is left and outer is right of antimeridian", async function () {
    const ra = Rectangle.fromDegrees(-175, 10, -165, 50);
    const rb = Rectangle.fromDegrees(165, 10, 175, 50);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(2, 0, 3, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner is right and outer is left or antimeridian", async function () {
    const ra = Rectangle.fromDegrees(165, 10, 175, 50);
    const rb = Rectangle.fromDegrees(-175, 10, -165, 50);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(-2, 0, -1, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });

  it("_localizeCartographicRectanglesToCartesianRectangle works when inner is left or meridian and outer is right of meridian", async function () {
    const ra = Rectangle.fromDegrees(-20, 10, -10, 20);
    const rb = Rectangle.fromDegrees(10, 10, 20, 20);
    const actual = new CartesianRectangle();
    const expected = new CartesianRectangle(-3, 0, -2, 1);
    ImageryCoverage._localizeCartographicRectanglesToCartesianRectangle(
      ra,
      rb,
      actual,
    );
    expect(actual).toEqualEpsilon(expected, CesiumMath.EPSILON8);
  });
});
