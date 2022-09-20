import {
  ApproximateTerrainHeights,
  Cartesian3,
  Rectangle,
  Math as CesiumMath 
} from "../../index.js";

describe("Core/ApproximateTerrainHeights", function () {
  beforeAll(function () {
    return ApproximateTerrainHeights.initialize();
  });

  afterAll(function () {
    ApproximateTerrainHeights._initPromise = undefined;
    ApproximateTerrainHeights._terrainHeights = undefined;
  });

  it("initializes", function () {
    return ApproximateTerrainHeights.initialize().then(function () {
      expect(ApproximateTerrainHeights._terrainHeights).toBeDefined();
    });
  });

  it("getMinimumMaximumHeights computes minimum and maximum terrain heights", function () {
    const result = ApproximateTerrainHeights.getMinimumMaximumHeights(
      Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0)
    );
    expect(result.minimumTerrainHeight).toEqualEpsilon(
      -476.12571188755,
      CesiumMath.EPSILON8
    );
    expect(result.maximumTerrainHeight).toEqualEpsilon(
      -28.53,
      CesiumMath.EPSILON8
    );
  });

  it("getMinimumMaximumHeights throws with no rectangle", function () {
    expect(function () {
      return ApproximateTerrainHeights.getMinimumMaximumHeights();
    }).toThrowDeveloperError();
  });

  it("getMinimumMaximumHeights throws if ApproximateTerrainHeights was not initialized first", function () {
    const heights = ApproximateTerrainHeights._terrainHeights;
    ApproximateTerrainHeights._terrainHeights = undefined;
    expect(function () {
      return ApproximateTerrainHeights.getMinimumMaximumHeights(
        Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0)
      );
    });
    ApproximateTerrainHeights._terrainHeights = heights;
  });

  it("getBoundingSphere computes a bounding sphere", function () {
    const result = ApproximateTerrainHeights.getBoundingSphere(
      Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0)
    );
    expect(result.center).toEqualEpsilon(
      new Cartesian3(
        -3183013.849117281,
        -5403772.559109628,
        1154581.5821590829
      ),
      CesiumMath.EPSILON8
    );
    expect(result.radius).toEqualEpsilon(
      77884.16321007285,
      CesiumMath.EPSILON8
    );
  });

  it("getBoundingSphere throws with no rectangle", function () {
    expect(function () {
      return ApproximateTerrainHeights.getBoundingSphere();
    }).toThrowDeveloperError();
  });

  it("getBoundingSphere throws if ApproximateTerrainHeights was not initialized first", function () {
    const heights = ApproximateTerrainHeights._terrainHeights;
    ApproximateTerrainHeights._terrainHeights = undefined;
    expect(function () {
      return ApproximateTerrainHeights.getBoundingSphere(
        Rectangle.fromDegrees(-121.0, 10.0, -120.0, 11.0)
      );
    });
    ApproximateTerrainHeights._terrainHeights = heights;
  });
});
