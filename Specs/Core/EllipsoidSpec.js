import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Rectangle } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/Ellipsoid", function () {
  const radii = new Cartesian3(1.0, 2.0, 3.0);
  const radiiSquared = Cartesian3.multiplyComponents(
    radii,
    radii,
    new Cartesian3()
  );
  const radiiToTheFourth = Cartesian3.multiplyComponents(
    radiiSquared,
    radiiSquared,
    new Cartesian3()
  );
  const oneOverRadii = new Cartesian3(1 / radii.x, 1 / radii.y, 1 / radii.z);
  const oneOverRadiiSquared = new Cartesian3(
    1 / radiiSquared.x,
    1 / radiiSquared.y,
    1 / radiiSquared.z
  );
  const minimumRadius = 1.0;
  const maximumRadius = 3.0;

  //All values computes using STK Components
  const spaceCartesian = new Cartesian3(
    4582719.8827300891,
    -4582719.8827300882,
    1725510.4250797231
  );
  const spaceCartesianGeodeticSurfaceNormal = new Cartesian3(
    0.6829975339864266,
    -0.68299753398642649,
    0.25889908678270795
  );

  const spaceCartographic = new Cartographic(
    CesiumMath.toRadians(-45.0),
    CesiumMath.toRadians(15.0),
    330000.0
  );
  const spaceCartographicGeodeticSurfaceNormal = new Cartesian3(
    0.68301270189221941,
    -0.6830127018922193,
    0.25881904510252074
  );

  const surfaceCartesian = new Cartesian3(
    4094327.7921465295,
    1909216.4044747739,
    4487348.4088659193
  );
  const surfaceCartographic = new Cartographic(
    CesiumMath.toRadians(25.0),
    CesiumMath.toRadians(45.0),
    0.0
  );

  it("default constructor creates zero Ellipsoid", function () {
    const ellipsoid = new Ellipsoid();
    expect(ellipsoid.radii).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.radiiSquared).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.radiiToTheFourth).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.oneOverRadii).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.oneOverRadiiSquared).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.minimumRadius).toEqual(0.0);
    expect(ellipsoid.maximumRadius).toEqual(0.0);
  });

  it("fromCartesian3 creates zero Ellipsoid with no parameters", function () {
    const ellipsoid = Ellipsoid.fromCartesian3();
    expect(ellipsoid.radii).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.radiiSquared).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.radiiToTheFourth).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.oneOverRadii).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.oneOverRadiiSquared).toEqual(Cartesian3.ZERO);
    expect(ellipsoid.minimumRadius).toEqual(0.0);
    expect(ellipsoid.maximumRadius).toEqual(0.0);
  });

  it("constructor computes correct values", function () {
    const ellipsoid = new Ellipsoid(radii.x, radii.y, radii.z);
    expect(ellipsoid.radii).toEqual(radii);
    expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
    expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
    expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
    expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
    expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
    expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
  });

  it("fromCartesian3 computes correct values", function () {
    const ellipsoid = Ellipsoid.fromCartesian3(radii);
    expect(ellipsoid.radii).toEqual(radii);
    expect(ellipsoid.radiiSquared).toEqual(radiiSquared);
    expect(ellipsoid.radiiToTheFourth).toEqual(radiiToTheFourth);
    expect(ellipsoid.oneOverRadii).toEqual(oneOverRadii);
    expect(ellipsoid.oneOverRadiiSquared).toEqual(oneOverRadiiSquared);
    expect(ellipsoid.minimumRadius).toEqual(minimumRadius);
    expect(ellipsoid.maximumRadius).toEqual(maximumRadius);
  });

  it("geodeticSurfaceNormalCartographic works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.geodeticSurfaceNormalCartographic(
      spaceCartographic
    );
    expect(returnedResult).toEqualEpsilon(
      spaceCartographicGeodeticSurfaceNormal,
      CesiumMath.EPSILON15
    );
  });

  it("geodeticSurfaceNormalCartographic works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const result = new Cartesian3();
    const returnedResult = ellipsoid.geodeticSurfaceNormalCartographic(
      spaceCartographic,
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqualEpsilon(
      spaceCartographicGeodeticSurfaceNormal,
      CesiumMath.EPSILON15
    );
  });

  it("geodeticSurfaceNormal works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.geodeticSurfaceNormal(spaceCartesian);
    expect(returnedResult).toEqualEpsilon(
      spaceCartesianGeodeticSurfaceNormal,
      CesiumMath.EPSILON15
    );
  });

  it("geodeticSurfaceNormal returns undefined when given the origin", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.geodeticSurfaceNormal(Cartesian3.ZERO);
    expect(returnedResult).toBeUndefined();
  });

  it("geodeticSurfaceNormal works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const result = new Cartesian3();
    const returnedResult = ellipsoid.geodeticSurfaceNormal(
      spaceCartesian,
      result
    );
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqualEpsilon(
      spaceCartesianGeodeticSurfaceNormal,
      CesiumMath.EPSILON15
    );
  });

  it("cartographicToCartesian works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartographicToCartesian(spaceCartographic);
    expect(returnedResult).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
  });

  it("cartographicToCartesian works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const result = new Cartesian3();
    const returnedResult = ellipsoid.cartographicToCartesian(
      spaceCartographic,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqualEpsilon(spaceCartesian, CesiumMath.EPSILON7);
  });

  it("cartographicArrayToCartesianArray works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartographicArrayToCartesianArray([
      spaceCartographic,
      surfaceCartographic,
    ]);
    expect(returnedResult.length).toEqual(2);
    expect(returnedResult[0]).toEqualEpsilon(
      spaceCartesian,
      CesiumMath.EPSILON7
    );
    expect(returnedResult[1]).toEqualEpsilon(
      surfaceCartesian,
      CesiumMath.EPSILON7
    );
  });

  it("cartographicArrayToCartesianArray works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const resultCartesian = new Cartesian3();
    const result = [resultCartesian];
    const returnedResult = ellipsoid.cartographicArrayToCartesianArray(
      [spaceCartographic, surfaceCartographic],
      result
    );
    expect(result).toBe(returnedResult);
    expect(result[0]).toBe(resultCartesian);
    expect(returnedResult.length).toEqual(2);
    expect(returnedResult[0]).toEqualEpsilon(
      spaceCartesian,
      CesiumMath.EPSILON7
    );
    expect(returnedResult[1]).toEqualEpsilon(
      surfaceCartesian,
      CesiumMath.EPSILON7
    );
  });

  it("cartesianToCartographic works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartesianToCartographic(surfaceCartesian);
    expect(returnedResult).toEqualEpsilon(
      surfaceCartographic,
      CesiumMath.EPSILON8
    );
  });

  it("cartesianToCartographic works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const result = new Cartographic();
    const returnedResult = ellipsoid.cartesianToCartographic(
      surfaceCartesian,
      result
    );
    expect(result).toBe(returnedResult);
    expect(returnedResult).toEqualEpsilon(
      surfaceCartographic,
      CesiumMath.EPSILON8
    );
  });

  it("cartesianToCartographic works close to center", function () {
    const expected = new Cartographic(
      9.999999999999999e-11,
      1.0067394967422763e-20,
      -6378137.0
    );
    const returnedResult = Ellipsoid.WGS84.cartesianToCartographic(
      new Cartesian3(1e-50, 1e-60, 1e-70)
    );
    expect(returnedResult).toEqual(expected);
  });

  it("cartesianToCartographic return undefined very close to center", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartesianToCartographic(
      new Cartesian3(1e-150, 1e-150, 1e-150)
    );
    expect(returnedResult).toBeUndefined();
  });

  it("cartesianToCartographic return undefined at center", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartesianToCartographic(Cartesian3.ZERO);
    expect(returnedResult).toBeUndefined();
  });

  it("cartesianArrayToCartographicArray works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const returnedResult = ellipsoid.cartesianArrayToCartographicArray([
      spaceCartesian,
      surfaceCartesian,
    ]);
    expect(returnedResult.length).toEqual(2);
    expect(returnedResult[0]).toEqualEpsilon(
      spaceCartographic,
      CesiumMath.EPSILON7
    );
    expect(returnedResult[1]).toEqualEpsilon(
      surfaceCartographic,
      CesiumMath.EPSILON7
    );
  });

  it("cartesianArrayToCartographicArray works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const resultCartographic = new Cartographic();
    const result = [resultCartographic];
    const returnedResult = ellipsoid.cartesianArrayToCartographicArray(
      [spaceCartesian, surfaceCartesian],
      result
    );
    expect(result).toBe(returnedResult);
    expect(result.length).toEqual(2);
    expect(result[0]).toBe(resultCartographic);
    expect(result[0]).toEqualEpsilon(spaceCartographic, CesiumMath.EPSILON7);
    expect(result[1]).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON7);
  });

  it("scaleToGeodeticSurface scaled in the x direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(1.0, 0.0, 0.0);
    const cartesian = new Cartesian3(9.0, 0.0, 0.0);
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeodeticSurface scaled in the y direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(0.0, 2.0, 0.0);
    const cartesian = new Cartesian3(0.0, 8.0, 0.0);
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeodeticSurface scaled in the z direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(0.0, 0.0, 3.0);
    const cartesian = new Cartesian3(0.0, 0.0, 8.0);
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeodeticSurface works without a result parameter", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(
      0.2680893773941855,
      1.1160466902266495,
      2.3559801120411263
    );
    const cartesian = new Cartesian3(4.0, 5.0, 6.0);
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("scaleToGeodeticSurface works with a result parameter", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(
      0.2680893773941855,
      1.1160466902266495,
      2.3559801120411263
    );
    const cartesian = new Cartesian3(4.0, 5.0, 6.0);
    const result = new Cartesian3();
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("scaleToGeocentricSurface scaled in the x direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(1.0, 0.0, 0.0);
    const cartesian = new Cartesian3(9.0, 0.0, 0.0);
    const returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeocentricSurface scaled in the y direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(0.0, 2.0, 0.0);
    const cartesian = new Cartesian3(0.0, 8.0, 0.0);
    const returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeocentricSurface scaled in the z direction", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(0.0, 0.0, 3.0);
    const cartesian = new Cartesian3(0.0, 0.0, 8.0);
    const returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
    expect(returnedResult).toEqual(expected);
  });

  it("scaleToGeocentricSurface works without a result parameter", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(
      0.7807200583588266,
      0.9759000729485333,
      1.1710800875382399
    );
    const cartesian = new Cartesian3(4.0, 5.0, 6.0);
    const returnedResult = ellipsoid.scaleToGeocentricSurface(cartesian);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("scaleToGeocentricSurface works with a result parameter", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const expected = new Cartesian3(
      0.7807200583588266,
      0.9759000729485333,
      1.1710800875382399
    );
    const cartesian = new Cartesian3(4.0, 5.0, 6.0);
    const result = new Cartesian3();
    const returnedResult = ellipsoid.scaleToGeocentricSurface(
      cartesian,
      result
    );
    expect(returnedResult).toBe(result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("scaleToGeodeticSurface returns undefined at center", function () {
    const ellipsoid = new Ellipsoid(1.0, 2.0, 3.0);
    const cartesian = new Cartesian3(0.0, 0.0, 0.0);
    const returnedResult = ellipsoid.scaleToGeodeticSurface(cartesian);
    expect(returnedResult).toBeUndefined();
  });

  it("transformPositionToScaledSpace works without a result parameter", function () {
    const ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
    const expected = new Cartesian3(2.0, 2.0, 2.0);
    const cartesian = new Cartesian3(4.0, 6.0, 8.0);
    const returnedResult = ellipsoid.transformPositionToScaledSpace(cartesian);
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("transformPositionToScaledSpace works with a result parameter", function () {
    const ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
    const expected = new Cartesian3(3.0, 3.0, 3.0);
    const cartesian = new Cartesian3(6.0, 9.0, 12.0);
    const result = new Cartesian3();
    const returnedResult = ellipsoid.transformPositionToScaledSpace(
      cartesian,
      result
    );
    expect(returnedResult).toBe(result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("transformPositionFromScaledSpace works without a result parameter", function () {
    const ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
    const expected = new Cartesian3(4.0, 6.0, 8.0);
    const cartesian = new Cartesian3(2.0, 2.0, 2.0);
    const returnedResult = ellipsoid.transformPositionFromScaledSpace(
      cartesian
    );
    expect(returnedResult).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("transformPositionFromScaledSpace works with a result parameter", function () {
    const ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
    const expected = new Cartesian3(6.0, 9.0, 12.0);
    const cartesian = new Cartesian3(3.0, 3.0, 3.0);
    const result = new Cartesian3();
    const returnedResult = ellipsoid.transformPositionFromScaledSpace(
      cartesian,
      result
    );
    expect(returnedResult).toBe(result);
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON16);
  });

  it("equals works in all cases", function () {
    const ellipsoid = new Ellipsoid(1.0, 0.0, 0.0);
    expect(ellipsoid.equals(new Ellipsoid(1.0, 0.0, 0.0))).toEqual(true);
    expect(ellipsoid.equals(new Ellipsoid(1.0, 1.0, 0.0))).toEqual(false);
    expect(ellipsoid.equals(undefined)).toEqual(false);
  });

  it("toString produces expected values", function () {
    const expected = "(1, 2, 3)";
    const ellipsoid = new Ellipsoid(1, 2, 3);
    expect(ellipsoid.toString()).toEqual(expected);
  });

  it("constructor throws if x less than 0", function () {
    expect(function () {
      return new Ellipsoid(-1, 0, 0);
    }).toThrowDeveloperError();
  });

  it("constructor throws if y less than 0", function () {
    expect(function () {
      return new Ellipsoid(0, -1, 0);
    }).toThrowDeveloperError();
  });

  it("constructor throws if z less than 0", function () {
    expect(function () {
      return new Ellipsoid(0, 0, -1);
    }).toThrowDeveloperError();
  });

  it("expect Ellipsoid.geocentricSurfaceNormal is be Cartesian3.normalize", function () {
    expect(Ellipsoid.WGS84.geocentricSurfaceNormal).toBe(Cartesian3.normalize);
  });

  it("geodeticSurfaceNormalCartographic throws with no cartographic", function () {
    expect(function () {
      Ellipsoid.WGS84.geodeticSurfaceNormalCartographic(undefined);
    }).toThrowDeveloperError();
  });

  it("geodeticSurfaceNormal throws with no cartesian", function () {
    expect(function () {
      Ellipsoid.WGS84.geodeticSurfaceNormal(undefined);
    }).toThrowDeveloperError();
  });

  it("cartographicToCartesian throws with no cartographic", function () {
    expect(function () {
      Ellipsoid.WGS84.cartographicToCartesian(undefined);
    }).toThrowDeveloperError();
  });

  it("cartographicArrayToCartesianArray throws with no cartographics", function () {
    expect(function () {
      Ellipsoid.WGS84.cartographicArrayToCartesianArray(undefined);
    }).toThrowDeveloperError();
  });

  it("cartesianToCartographic throws with no cartesian", function () {
    expect(function () {
      Ellipsoid.WGS84.cartesianToCartographic(undefined);
    }).toThrowDeveloperError();
  });

  it("cartesianArrayToCartographicArray throws with no cartesians", function () {
    expect(function () {
      Ellipsoid.WGS84.cartesianArrayToCartographicArray(undefined);
    }).toThrowDeveloperError();
  });

  it("scaleToGeodeticSurface throws with no cartesian", function () {
    expect(function () {
      Ellipsoid.WGS84.scaleToGeodeticSurface(undefined);
    }).toThrowDeveloperError();
  });

  it("scaleToGeocentricSurface throws with no cartesian", function () {
    expect(function () {
      Ellipsoid.WGS84.scaleToGeocentricSurface(undefined);
    }).toThrowDeveloperError();
  });

  it("clone copies any object with the proper structure", function () {
    const myEllipsoid = {
      _radii: { x: 1.0, y: 2.0, z: 3.0 },
      _radiiSquared: { x: 4.0, y: 5.0, z: 6.0 },
      _radiiToTheFourth: { x: 7.0, y: 8.0, z: 9.0 },
      _oneOverRadii: { x: 10.0, y: 11.0, z: 12.0 },
      _oneOverRadiiSquared: { x: 13.0, y: 14.0, z: 15.0 },
      _minimumRadius: 16.0,
      _maximumRadius: 17.0,
      _centerToleranceSquared: 18.0,
    };

    const cloned = Ellipsoid.clone(myEllipsoid);
    expect(cloned).toBeInstanceOf(Ellipsoid);
    expect(cloned).toEqual(myEllipsoid);
  });

  it("clone uses result parameter if provided", function () {
    const myEllipsoid = {
      _radii: { x: 1.0, y: 2.0, z: 3.0 },
      _radiiSquared: { x: 4.0, y: 5.0, z: 6.0 },
      _radiiToTheFourth: { x: 7.0, y: 8.0, z: 9.0 },
      _oneOverRadii: { x: 10.0, y: 11.0, z: 12.0 },
      _oneOverRadiiSquared: { x: 13.0, y: 14.0, z: 15.0 },
      _minimumRadius: 16.0,
      _maximumRadius: 17.0,
      _centerToleranceSquared: 18.0,
    };

    const result = new Ellipsoid();
    const cloned = Ellipsoid.clone(myEllipsoid, result);
    expect(cloned).toBe(result);
    expect(cloned).toEqual(myEllipsoid);
  });

  it("getSurfaceNormalIntersectionWithZAxis throws with no position", function () {
    expect(function () {
      Ellipsoid.WGS84.getSurfaceNormalIntersectionWithZAxis(undefined);
    }).toThrowDeveloperError();
  });

  it("getSurfaceNormalIntersectionWithZAxis throws if the ellipsoid is not an ellipsoid of revolution", function () {
    expect(function () {
      const ellipsoid = new Ellipsoid(1, 2, 3);
      const cartesian = new Cartesian3();
      ellipsoid.getSurfaceNormalIntersectionWithZAxis(cartesian);
    }).toThrowDeveloperError();
  });

  it("getSurfaceNormalIntersectionWithZAxis throws if the ellipsoid has radii.z === 0", function () {
    expect(function () {
      const ellipsoid = new Ellipsoid(1, 2, 0);
      const cartesian = new Cartesian3();
      ellipsoid.getSurfaceNormalIntersectionWithZAxis(cartesian);
    }).toThrowDeveloperError();
  });

  it("getSurfaceNormalIntersectionWithZAxis works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = Cartographic.fromDegrees(35.23, 33.23);
    const cartesianOnTheSurface = ellipsoid.cartographicToCartesian(
      cartographic
    );
    const returnedResult = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface
    );
    expect(returnedResult).toBeInstanceOf(Cartesian3);
  });

  it("getSurfaceNormalIntersectionWithZAxis works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = Cartographic.fromDegrees(35.23, 33.23);
    const cartesianOnTheSurface = ellipsoid.cartographicToCartesian(
      cartographic
    );
    const returnedResult = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined,
      cartesianOnTheSurface
    );
    expect(returnedResult).toBe(cartesianOnTheSurface);
  });

  it("getSurfaceNormalIntersectionWithZAxis returns undefined if the result is outside the ellipsoid with buffer parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = Cartographic.fromDegrees(35.23, 33.23);
    const cartesianOnTheSurface = ellipsoid.cartographicToCartesian(
      cartographic
    );
    const returnedResult = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      ellipsoid.radii.z
    );
    expect(returnedResult).toBe(undefined);
  });

  it("getSurfaceNormalIntersectionWithZAxis returns undefined if the result is outside the ellipsoid without buffer parameter", function () {
    const majorAxis = 10;
    const minorAxis = 1;
    const ellipsoid = new Ellipsoid(majorAxis, majorAxis, minorAxis);
    const cartographic = Cartographic.fromDegrees(45.0, 90.0);
    const cartesianOnTheSurface = ellipsoid.cartographicToCartesian(
      cartographic
    );
    const returnedResult = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined
    );
    expect(returnedResult).toBe(undefined);
  });

  it("getSurfaceNormalIntersectionWithZAxis returns a result that is equal to a value that computed in a different way", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const cartographic = Cartographic.fromDegrees(35.23, 33.23);
    let cartesianOnTheSurface = ellipsoid.cartographicToCartesian(cartographic);
    const surfaceNormal = ellipsoid.geodeticSurfaceNormal(
      cartesianOnTheSurface
    );
    const magnitude = cartesianOnTheSurface.x / surfaceNormal.x;

    const expected = new Cartesian3();
    expected.z = cartesianOnTheSurface.z - surfaceNormal.z * magnitude;
    let result = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined
    );
    expect(result).toEqualEpsilon(expected, CesiumMath.EPSILON8);

    // at the equator
    cartesianOnTheSurface = new Cartesian3(ellipsoid.radii.x, 0, 0);
    result = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined
    );
    expect(result).toEqualEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON8);
  });

  it("getSurfaceNormalIntersectionWithZAxis returns a result that when it's used as an origin for a vector with the surface normal direction it produces an accurate cartographic", function () {
    const ellipsoid = Ellipsoid.WGS84;
    let cartographic = Cartographic.fromDegrees(35.23, 33.23);
    let cartesianOnTheSurface = ellipsoid.cartographicToCartesian(cartographic);
    let surfaceNormal = ellipsoid.geodeticSurfaceNormal(cartesianOnTheSurface);

    let result = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined
    );

    let surfaceNormalWithLength = Cartesian3.multiplyByScalar(
      surfaceNormal,
      ellipsoid.maximumRadius,
      new Cartesian3()
    );
    let position = Cartesian3.add(
      result,
      surfaceNormalWithLength,
      new Cartesian3()
    );
    let resultCartographic = ellipsoid.cartesianToCartographic(position);
    resultCartographic.height = 0.0;
    expect(resultCartographic).toEqualEpsilon(
      cartographic,
      CesiumMath.EPSILON8
    );

    // at the north pole
    cartographic = Cartographic.fromDegrees(0, 90);
    cartesianOnTheSurface = new Cartesian3(0, 0, ellipsoid.radii.z);
    surfaceNormal = ellipsoid.geodeticSurfaceNormal(cartesianOnTheSurface);
    surfaceNormalWithLength = Cartesian3.multiplyByScalar(
      surfaceNormal,
      ellipsoid.maximumRadius,
      new Cartesian3()
    );
    result = ellipsoid.getSurfaceNormalIntersectionWithZAxis(
      cartesianOnTheSurface,
      undefined
    );
    position = Cartesian3.add(
      result,
      surfaceNormalWithLength,
      new Cartesian3()
    );
    resultCartographic = ellipsoid.cartesianToCartographic(position);
    resultCartographic.height = 0.0;
    expect(resultCartographic).toEqualEpsilon(
      cartographic,
      CesiumMath.EPSILON8
    );
  });

  it("ellipsoid is initialized with _squaredXOverSquaredZ property", function () {
    const ellipsoid = new Ellipsoid(4, 4, 3);

    const squaredXOverSquaredZ =
      ellipsoid.radiiSquared.x / ellipsoid.radiiSquared.z;
    expect(ellipsoid._squaredXOverSquaredZ).toEqual(squaredXOverSquaredZ);
  });

  it("surfaceArea throws without rectangle", function () {
    expect(function () {
      return Ellipsoid.WGS84.surfaceArea(undefined);
    }).toThrowDeveloperError();
  });

  it("computes surfaceArea", function () {
    // area of an oblate spheroid
    let ellipsoid = new Ellipsoid(4, 4, 3);
    let a2 = ellipsoid.radiiSquared.x;
    let c2 = ellipsoid.radiiSquared.z;
    let e = Math.sqrt(1.0 - c2 / a2);
    let area =
      CesiumMath.TWO_PI * a2 +
      CesiumMath.PI * (c2 / e) * Math.log((1.0 + e) / (1.0 - e));
    expect(
      ellipsoid.surfaceArea(
        new Rectangle(
          -CesiumMath.PI,
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI,
          CesiumMath.PI_OVER_TWO
        )
      )
    ).toEqualEpsilon(area, CesiumMath.EPSILON3);

    // area of a prolate spheroid
    ellipsoid = new Ellipsoid(3, 3, 4);
    a2 = ellipsoid.radiiSquared.x;
    c2 = ellipsoid.radiiSquared.z;
    e = Math.sqrt(1.0 - a2 / c2);
    const a = ellipsoid.radii.x;
    const c = ellipsoid.radii.z;
    area =
      CesiumMath.TWO_PI * a2 + CesiumMath.TWO_PI * ((a * c) / e) * Math.asin(e);
    expect(
      ellipsoid.surfaceArea(
        new Rectangle(
          -CesiumMath.PI,
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI,
          CesiumMath.PI_OVER_TWO
        )
      )
    ).toEqualEpsilon(area, CesiumMath.EPSILON3);
  });

  createPackableSpecs(Ellipsoid, Ellipsoid.WGS84, [
    Ellipsoid.WGS84.radii.x,
    Ellipsoid.WGS84.radii.y,
    Ellipsoid.WGS84.radii.z,
  ]);
});
