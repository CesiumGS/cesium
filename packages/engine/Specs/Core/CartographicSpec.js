import { Cartesian3, Cartographic, Ellipsoid } from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/Cartographic", function () {
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

  it("default constructor sets expected properties", function () {
    const c = new Cartographic();
    expect(c.longitude).toEqual(0);
    expect(c.latitude).toEqual(0);
    expect(c.height).toEqual(0);
  });

  it("constructor sets expected properties from parameters", function () {
    const c = new Cartographic(1.0, 2.0, 3.0);
    expect(c.longitude).toEqual(1);
    expect(c.latitude).toEqual(2);
    expect(c.height).toEqual(3);
  });

  it("toCartesian conversion from Cartographic input to Cartesian3 output", function () {
    const lon = CesiumMath.toRadians(150);
    const lat = CesiumMath.toRadians(-40);
    const height = 100000;
    const ellipsoid = Ellipsoid.WGS84;
    const actual = Cartographic.toCartesian(new Cartographic(lon, lat, height));
    const expected = ellipsoid.cartographicToCartesian(
      new Cartographic(lon, lat, height)
    );
    expect(actual).toEqual(expected);
  });

  it("fromRadians works without a result parameter", function () {
    const c = Cartographic.fromRadians(Math.PI / 2, Math.PI / 4, 100.0);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(100.0);
  });

  it("fromRadians works with a result parameter", function () {
    const result = new Cartographic();
    const c = Cartographic.fromRadians(Math.PI / 2, Math.PI / 4, 100.0, result);
    expect(result).toBe(c);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(100.0);
  });

  it("fromRadians throws without longitude or latitude parameter but defaults altitude", function () {
    expect(function () {
      Cartographic.fromRadians(undefined, 0.0);
    }).toThrowDeveloperError();
    expect(function () {
      Cartographic.fromRadians(0.0, undefined);
    }).toThrowDeveloperError();
    const c = Cartographic.fromRadians(Math.PI / 2, Math.PI / 4);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(0.0);
  });

  it("fromDegrees works without a result parameter", function () {
    const c = Cartographic.fromDegrees(90.0, 45.0, 100.0);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(100);
  });

  it("fromDegrees works with a result parameter", function () {
    const result = new Cartographic();
    const c = Cartographic.fromDegrees(90.0, 45.0, 100.0, result);
    expect(result).toBe(c);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(100);
  });

  it("fromDegrees throws without longitude or latitude parameter but defaults altitude", function () {
    expect(function () {
      Cartographic.fromDegrees(undefined, 0.0);
    }).toThrowDeveloperError();
    expect(function () {
      Cartographic.fromDegrees(0.0, undefined);
    }).toThrowDeveloperError();
    const c = Cartographic.fromDegrees(90.0, 45.0);
    expect(c.longitude).toEqual(Math.PI / 2);
    expect(c.latitude).toEqual(Math.PI / 4);
    expect(c.height).toEqual(0.0);
  });

  it("fromCartesian works without a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const c = Cartographic.fromCartesian(surfaceCartesian, ellipsoid);
    expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
  });

  it("fromCartesian works with a result parameter", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const result = new Cartographic();
    const c = Cartographic.fromCartesian(surfaceCartesian, ellipsoid, result);
    expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
    expect(result).toBe(c);
  });

  it("fromCartesian works without an ellipsoid", function () {
    const c = Cartographic.fromCartesian(surfaceCartesian);
    expect(c).toEqualEpsilon(surfaceCartographic, CesiumMath.EPSILON8);
  });

  it("fromCartesian throws when there is no cartesian", function () {
    expect(function () {
      Cartographic.fromCartesian();
    }).toThrowDeveloperError();
  });

  it("fromCartesian works with a value that is above the ellipsoid surface", function () {
    const cartographic1 = Cartographic.fromDegrees(35.766989, 33.333602, 3000);
    const cartesian1 = Cartesian3.fromRadians(
      cartographic1.longitude,
      cartographic1.latitude,
      cartographic1.height
    );
    const cartographic2 = Cartographic.fromCartesian(cartesian1);

    expect(cartographic2).toEqualEpsilon(cartographic1, CesiumMath.EPSILON8);
  });

  it("fromCartesian works with a value that is bellow the ellipsoid surface", function () {
    const cartographic1 = Cartographic.fromDegrees(35.766989, 33.333602, -3000);
    const cartesian1 = Cartesian3.fromRadians(
      cartographic1.longitude,
      cartographic1.latitude,
      cartographic1.height
    );
    const cartographic2 = Cartographic.fromCartesian(cartesian1);

    expect(cartographic2).toEqualEpsilon(cartographic1, CesiumMath.EPSILON8);
  });

  it("clone without a result parameter", function () {
    const cartographic = new Cartographic(1.0, 2.0, 3.0);
    const result = cartographic.clone();
    expect(cartographic).not.toBe(result);
    expect(cartographic).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const cartographic = new Cartographic(1.0, 2.0, 3.0);
    const result = new Cartographic();
    const returnedResult = cartographic.clone(result);
    expect(cartographic).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(cartographic).toEqual(result);
  });

  it('clone works with "this" result parameter', function () {
    const cartographic = new Cartographic(1.0, 2.0, 3.0);
    const returnedResult = cartographic.clone(cartographic);
    expect(cartographic).toBe(returnedResult);
  });

  it("equals", function () {
    const cartographic = new Cartographic(1.0, 2.0, 3.0);
    expect(cartographic.equals(new Cartographic(1.0, 2.0, 3.0))).toEqual(true);
    expect(cartographic.equals(new Cartographic(2.0, 2.0, 3.0))).toEqual(false);
    expect(cartographic.equals(new Cartographic(2.0, 1.0, 3.0))).toEqual(false);
    expect(cartographic.equals(new Cartographic(1.0, 2.0, 4.0))).toEqual(false);
    expect(cartographic.equals(undefined)).toEqual(false);
  });

  it("equalsEpsilon", function () {
    const cartographic = new Cartographic(1.0, 2.0, 3.0);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 0.0)
    ).toEqual(true);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 1.0)
    ).toEqual(true);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      cartographic.equalsEpsilon(new Cartographic(2.0, 2.0, 3.0), 0.99999)
    ).toEqual(false);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 3.0, 3.0), 0.99999)
    ).toEqual(false);
    expect(
      cartographic.equalsEpsilon(new Cartographic(1.0, 2.0, 4.0), 0.99999)
    ).toEqual(false);
    expect(cartographic.equalsEpsilon(undefined, 1)).toEqual(false);
  });

  it("toString", function () {
    const cartographic = new Cartographic(1.123, 2.345, 6.789);
    expect(cartographic.toString()).toEqual("(1.123, 2.345, 6.789)");
  });

  it("clone returns undefined without cartographic parameter", function () {
    expect(Cartographic.clone(undefined)).toBeUndefined();
  });
});
