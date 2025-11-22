import {
  Cartesian3,
  Ellipsoid,
  VerticalExaggeration,
  Math as CesiumMath,
} from "../../index.js";

describe("Core/VerticalExaggeration", function () {
  it("getHeight leaves heights unchanged with a scale of 1.0", function () {
    const height = 100.0;
    const scale = 1.0;
    const relativeHeight = 0.0;

    const result = VerticalExaggeration.getHeight(
      height,
      scale,
      relativeHeight,
    );
    expect(result).toEqual(height);
  });

  it("getHeight scales up heights above relativeHeight", function () {
    const height = 150.0;
    const scale = 2.0;
    const relativeHeight = 100.0;

    const result = VerticalExaggeration.getHeight(
      height,
      scale,
      relativeHeight,
    );
    expect(result).toEqual(200.0);
  });

  it("getHeight does not change heights equal to relativeHeight", function () {
    const height = 100.0;
    const scale = 1.0;
    const relativeHeight = 100.0;

    const result = VerticalExaggeration.getHeight(
      height,
      scale,
      relativeHeight,
    );
    expect(result).toEqual(100.0);
  });

  it("getHeight scales down heights below relativeHeight", function () {
    const height = 100.0;
    const scale = 2.0;
    const relativeHeight = 200.0;

    const result = VerticalExaggeration.getHeight(
      height,
      scale,
      relativeHeight,
    );
    expect(result).toEqual(0.0);
  });

  it("getPosition leaves positions unchanged with a scale of 1.0", function () {
    const position = Cartesian3.fromRadians(0.0, 0.0, 100.0);
    const ellipsoid = Ellipsoid.WGS84;
    const verticalExaggeration = 1.0;
    const verticalExaggerationRelativeHeight = 0.0;

    const result = VerticalExaggeration.getPosition(
      position,
      ellipsoid,
      verticalExaggeration,
      verticalExaggerationRelativeHeight,
    );
    expect(result).toEqualEpsilon(position, CesiumMath.EPSILON8);
  });

  it("getPosition scales up positions above relativeHeight", function () {
    const position = Cartesian3.fromRadians(0.0, 0.0, 150.0);
    const ellipsoid = Ellipsoid.WGS84;
    const verticalExaggeration = 2.0;
    const verticalExaggerationRelativeHeight = 100.0;

    const result = VerticalExaggeration.getPosition(
      position,
      ellipsoid,
      verticalExaggeration,
      verticalExaggerationRelativeHeight,
    );
    expect(result).toEqualEpsilon(
      Cartesian3.fromRadians(0.0, 0.0, 200.0),
      CesiumMath.EPSILON8,
    );
  });

  it("getPosition does not change positions equal to relativeHeight", function () {
    const position = Cartesian3.fromRadians(0.0, 0.0, 100.0);
    const ellipsoid = Ellipsoid.WGS84;
    const verticalExaggeration = 1.0;
    const verticalExaggerationRelativeHeight = 100.0;

    const result = VerticalExaggeration.getPosition(
      position,
      ellipsoid,
      verticalExaggeration,
      verticalExaggerationRelativeHeight,
    );
    expect(result).toEqualEpsilon(position, CesiumMath.EPSILON8);
  });

  it("getPosition scales down positions below relativeHeight", function () {
    const position = Cartesian3.fromRadians(0.0, 0.0, 100.0);
    const ellipsoid = Ellipsoid.WGS84;
    const verticalExaggeration = 2.0;
    const verticalExaggerationRelativeHeight = 200.0;

    const result = VerticalExaggeration.getPosition(
      position,
      ellipsoid,
      verticalExaggeration,
      verticalExaggerationRelativeHeight,
    );
    expect(result).toEqualEpsilon(
      Cartesian3.fromRadians(0.0, 0.0, 0.0),
      CesiumMath.EPSILON8,
    );
  });
});
