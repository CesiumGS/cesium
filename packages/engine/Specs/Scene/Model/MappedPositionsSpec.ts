import {
  Rectangle,
  MappedPositions,
  Ellipsoid,
  Cartographic,
} from "../../../index.js";

describe("Scene/Model/MappedPositions", function () {
  it("constructor throws without cartographicPositions", function () {
    const cartographicPositions = undefined;
    const numPositions = 4;
    const cartographicBoundingRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const ellipsoid = Ellipsoid.WGS84;
    expect(function () {
      // eslint-disable-next-line no-new
      new MappedPositions(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });

  it("constructor throws with invalid numPositions", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const numPositions = -1;
    const cartographicBoundingRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const ellipsoid = Ellipsoid.WGS84;
    expect(function () {
      // eslint-disable-next-line no-new
      new MappedPositions(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });

  it("constructor throws without cartographicBoundingRectangle", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const numPositions = 4;
    const cartographicBoundingRectangle = undefined;
    const ellipsoid = Ellipsoid.WGS84;
    expect(function () {
      // eslint-disable-next-line no-new
      new MappedPositions(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });
  it("constructor throws without ellipsoid", function () {
    const cartographicPositions = [
      new Cartographic(0.0, 0.0),
      new Cartographic(0.1, 0.0),
      new Cartographic(0.0, 0.1),
      new Cartographic(0.1, 0.1),
    ];
    const numPositions = 4;
    const cartographicBoundingRectangle = new Rectangle(0.0, 0.0, 0.1, 0.1);
    const ellipsoid = undefined;
    expect(function () {
      // eslint-disable-next-line no-new
      new MappedPositions(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });
});
