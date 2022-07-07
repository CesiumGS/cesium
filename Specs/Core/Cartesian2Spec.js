import { Cartesian2 } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import createPackableArraySpecs from "../createPackableArraySpecs.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/Cartesian2", function () {
  it("construct with default values", function () {
    const cartesian = new Cartesian2();
    expect(cartesian.x).toEqual(0.0);
    expect(cartesian.y).toEqual(0.0);
  });

  it("construct with only an x value", function () {
    const cartesian = new Cartesian2(1.0);
    expect(cartesian.x).toEqual(1.0);
    expect(cartesian.y).toEqual(0.0);
  });

  it("construct with all values", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    expect(cartesian.x).toEqual(1.0);
    expect(cartesian.y).toEqual(2.0);
  });

  it("fromArray creates a Cartesian2", function () {
    let cartesian = new Cartesian2();
    cartesian = Cartesian2.fromArray([1.0, 2.0]);
    expect(cartesian).toEqual(new Cartesian2(1.0, 2.0));
  });

  it("fromArray with an offset creates a Cartesian2", function () {
    let cartesian = new Cartesian2();
    cartesian = Cartesian2.fromArray([0.0, 1.0, 2.0, 0.0], 1);
    expect(cartesian).toEqual(new Cartesian2(1.0, 2.0));
  });

  it("fromArray throws without values", function () {
    expect(function () {
      Cartesian2.fromArray();
    }).toThrowDeveloperError();
  });

  it("clone with a result parameter", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    const result = new Cartesian2();
    const returnedResult = Cartesian2.clone(cartesian, result);
    expect(cartesian).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(cartesian).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    const returnedResult = Cartesian2.clone(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
  });

  it("maximumComponent works when X is greater", function () {
    const cartesian = new Cartesian2(2.0, 1.0);
    expect(Cartesian2.maximumComponent(cartesian)).toEqual(cartesian.x);
  });

  it("maximumComponent works when Y is greater", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    expect(Cartesian2.maximumComponent(cartesian)).toEqual(cartesian.y);
  });

  it("minimumComponent works when X is lesser", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    expect(Cartesian2.minimumComponent(cartesian)).toEqual(cartesian.x);
  });

  it("minimumComponent works when Y is lesser", function () {
    const cartesian = new Cartesian2(2.0, 1.0);
    expect(Cartesian2.minimumComponent(cartesian)).toEqual(cartesian.y);
  });

  it("minimumByComponent", function () {
    let first;
    let second;
    let expected;
    const result = new Cartesian2();

    first = new Cartesian2(2.0, 0.0);
    second = new Cartesian2(1.0, 0.0);
    expected = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(1.0, 0.0);
    second = new Cartesian2(2.0, 0.0);
    expected = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(1.0, -20.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -20.0);
    second = new Cartesian2(1.0, -15.0);
    expected = new Cartesian2(1.0, -20.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(1.0, -20.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(1.0, -20.0);
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("minimumByComponent with a result parameter", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(1.0, 0.0);
    const result = new Cartesian2();
    const returnedResult = Cartesian2.minimumByComponent(first, second, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("minimumByComponent with a result parameter that is an input parameter", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.minimumByComponent(first, second, first)).toEqual(
      expected
    );

    first.x = 1.0;
    second.x = 2.0;
    expect(Cartesian2.minimumByComponent(first, second, second)).toEqual(
      expected
    );
  });

  it("minimumByComponent throws without first", function () {
    expect(function () {
      Cartesian2.minimumByComponent();
    }).toThrowDeveloperError();
  });

  it("minimumByComponent throws without second", function () {
    expect(function () {
      Cartesian2.minimumByComponent(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("minimumByComponent works when first's or second's X is lesser", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.minimumByComponent(first, second, expected)).toEqual(
      expected
    );

    second.x = 3.0;
    expected.x = 2.0;
    expect(Cartesian2.minimumByComponent(first, second, expected)).toEqual(
      expected
    );
  });

  it("minimumByComponent works when first's or second's Y is lesser", function () {
    const first = new Cartesian2(0.0, 2.0);
    const second = new Cartesian2(0.0, 1.0);
    const expected = new Cartesian2(0.0, 1.0);
    const result = new Cartesian2();
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    second.y = 3.0;
    expected.y = 2.0;
    expect(Cartesian2.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent", function () {
    let first;
    let second;
    let expected;
    const result = new Cartesian2();

    first = new Cartesian2(2.0, 0.0);
    second = new Cartesian2(1.0, 0.0);
    expected = new Cartesian2(2.0, 0.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(1.0, 0.0);
    second = new Cartesian2(2.0, 0.0);
    expected = new Cartesian2(2.0, 0.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(2.0, -15.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -20.0);
    second = new Cartesian2(1.0, -15.0);
    expected = new Cartesian2(2.0, -15.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(2.0, -15.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian2(2.0, -15.0);
    second = new Cartesian2(1.0, -20.0);
    expected = new Cartesian2(2.0, -15.0);
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent with a result parameter", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(2.0, 0.0);
    const result = new Cartesian2();
    const returnedResult = Cartesian2.maximumByComponent(first, second, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("maximumByComponent with a result parameter that is an input parameter", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(2.0, 0.0);
    expect(Cartesian2.maximumByComponent(first, second, first)).toEqual(
      expected
    );

    first.x = 1.0;
    second.x = 2.0;
    expect(Cartesian2.maximumByComponent(first, second, second)).toEqual(
      expected
    );
  });

  it("maximumByComponent throws without first", function () {
    expect(function () {
      Cartesian2.maximumByComponent();
    }).toThrowDeveloperError();
  });

  it("maximumByComponent throws without second", function () {
    expect(function () {
      Cartesian2.maximumByComponent(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("maximumByComponent works when first's or second's X is greater", function () {
    const first = new Cartesian2(2.0, 0.0);
    const second = new Cartesian2(1.0, 0.0);
    const expected = new Cartesian2(2.0, 0.0);
    const result = new Cartesian2();
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.x = 3.0;
    expected.x = 3.0;
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent works when first's or second's Y is greater", function () {
    const first = new Cartesian2(0.0, 2.0);
    const second = new Cartesian2(0.0, 1.0);
    const expected = new Cartesian2(0.0, 2.0);
    const result = new Cartesian2();
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.y = 3.0;
    expected.y = 3.0;
    expect(Cartesian2.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("clamp", function () {
    let value;
    let min;
    let max;
    let expected;
    const result = new Cartesian2();

    value = new Cartesian2(-1.0, 0.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(2.0, 0.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(0.0, -1.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(0.0, 2.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 1.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(0.0, 0.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(0.0, 0.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(-2.0, 3.0);
    min = new Cartesian2(0.0, 0.0);
    max = new Cartesian2(1.0, 1.0);
    expected = new Cartesian2(0.0, 1.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian2(0.0, 0.0);
    min = new Cartesian2(1.0, 2.0);
    max = new Cartesian2(1.0, 2.0);
    expected = new Cartesian2(1.0, 2.0);
    expect(Cartesian2.clamp(value, min, max, result)).toEqual(expected);
  });

  it("clamp with a result parameter", function () {
    const value = new Cartesian2(-1.0, -1.0);
    const min = new Cartesian2(0.0, 0.0);
    const max = new Cartesian2(1.0, 1.0);
    const expected = new Cartesian2(0.0, 0.0);
    const result = new Cartesian2();
    const returnedResult = Cartesian2.clamp(value, min, max, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("clamp with a result parameter that is an input parameter", function () {
    const value = new Cartesian2(-1.0, -1.0);
    const min = new Cartesian2(0.0, 0.0);
    const max = new Cartesian2(1.0, 1.0);
    const expected = new Cartesian2(0.0, 0.0);
    expect(Cartesian2.clamp(value, min, max, value)).toEqual(expected);

    Cartesian2.fromElements(-1.0, -1.0, value);
    expect(Cartesian2.clamp(value, min, max, min)).toEqual(expected);

    Cartesian2.fromElements(0.0, 0.0, value);
    expect(Cartesian2.clamp(value, min, max, max)).toEqual(expected);
  });

  it("clamp throws without value", function () {
    expect(function () {
      Cartesian2.clamp();
    }).toThrowDeveloperError();
  });

  it("clamp throws without min", function () {
    expect(function () {
      Cartesian2.clamp(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("clamp throws without max", function () {
    expect(function () {
      Cartesian2.clamp(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("magnitudeSquared", function () {
    const cartesian = new Cartesian2(2.0, 3.0);
    expect(Cartesian2.magnitudeSquared(cartesian)).toEqual(13);
  });

  it("magnitude", function () {
    const cartesian = new Cartesian2(2.0, 3.0);
    expect(Cartesian2.magnitude(cartesian)).toEqual(Math.sqrt(13.0));
  });

  it("distance", function () {
    const distance = Cartesian2.distance(
      new Cartesian2(1.0, 0.0),
      new Cartesian2(2.0, 0.0)
    );
    expect(distance).toEqual(1.0);
  });

  it("distance throws without left", function () {
    expect(function () {
      Cartesian2.distance();
    }).toThrowDeveloperError();
  });

  it("distance throws without right", function () {
    expect(function () {
      Cartesian2.distance(Cartesian2.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("distanceSquared", function () {
    const distanceSquared = Cartesian2.distanceSquared(
      new Cartesian2(1.0, 0.0),
      new Cartesian2(3.0, 0.0)
    );
    expect(distanceSquared).toEqual(4.0);
  });

  it("distanceSquared throws without left", function () {
    expect(function () {
      Cartesian2.distanceSquared();
    }).toThrowDeveloperError();
  });

  it("distanceSquared throws without right", function () {
    expect(function () {
      Cartesian2.distanceSquared(Cartesian2.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("normalize works with a result parameter", function () {
    const cartesian = new Cartesian2(2.0, 0.0);
    const expectedResult = new Cartesian2(1.0, 0.0);
    const result = new Cartesian2();
    const returnedResult = Cartesian2.normalize(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("normalize works with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(2.0, 0.0);
    const expectedResult = new Cartesian2(1.0, 0.0);
    const returnedResult = Cartesian2.normalize(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("normalize throws with zero vector", function () {
    expect(function () {
      Cartesian2.normalize(Cartesian2.ZERO, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyComponents works with a result parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(8.0, 15.0);
    const returnedResult = Cartesian2.multiplyComponents(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("multiplyComponents works with a result parameter that is an input parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const expectedResult = new Cartesian2(8.0, 15.0);
    const returnedResult = Cartesian2.multiplyComponents(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("divideComponents works with a result parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(0.5, 0.6);
    const returnedResult = Cartesian2.divideComponents(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("divideComponents works with a result parameter that is an input parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const expectedResult = new Cartesian2(0.5, 0.6);
    const returnedResult = Cartesian2.divideComponents(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("dot", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const expectedResult = 23.0;
    const result = Cartesian2.dot(left, right);
    expect(result).toEqual(expectedResult);
  });

  it("cross", function () {
    const left = new Cartesian2(0.0, 1.0);
    const right = new Cartesian2(1.0, 0.0);
    const expectedResult = -1.0;
    const result = Cartesian2.cross(left, right);
    expect(result).toEqual(expectedResult);
  });

  it("add works with a result parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(6.0, 8.0);
    const returnedResult = Cartesian2.add(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expectedResult);
  });

  it("add works with a result parameter that is an input parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(4.0, 5.0);
    const expectedResult = new Cartesian2(6.0, 8.0);
    const returnedResult = Cartesian2.add(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expectedResult);
  });

  it("subtract works with a result parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(1.0, 5.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(1.0, -2.0);
    const returnedResult = Cartesian2.subtract(left, right, result);
    expect(returnedResult).toBe(result);
    expect(result).toEqual(expectedResult);
  });

  it("subtract works with this result parameter", function () {
    const left = new Cartesian2(2.0, 3.0);
    const right = new Cartesian2(1.0, 5.0);
    const expectedResult = new Cartesian2(1.0, -2.0);
    const returnedResult = Cartesian2.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expectedResult);
  });

  it("multiplyByScalar with a result parameter", function () {
    const cartesian = new Cartesian2(1, 2);
    const result = new Cartesian2();
    const scalar = 2;
    const expectedResult = new Cartesian2(2, 4);
    const returnedResult = Cartesian2.multiplyByScalar(
      cartesian,
      scalar,
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("multiplyByScalar with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(1, 2);
    const scalar = 2;
    const expectedResult = new Cartesian2(2, 4);
    const returnedResult = Cartesian2.multiplyByScalar(
      cartesian,
      scalar,
      cartesian
    );
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("divideByScalar with a result parameter", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    const result = new Cartesian2();
    const scalar = 2;
    const expectedResult = new Cartesian2(0.5, 1.0);
    const returnedResult = Cartesian2.divideByScalar(cartesian, scalar, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("divideByScalar with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    const scalar = 2;
    const expectedResult = new Cartesian2(0.5, 1.0);
    const returnedResult = Cartesian2.divideByScalar(
      cartesian,
      scalar,
      cartesian
    );
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("negate with a result parameter", function () {
    const cartesian = new Cartesian2(1.0, -2.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(-1.0, 2.0);
    const returnedResult = Cartesian2.negate(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("negate with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(1.0, -2.0);
    const expectedResult = new Cartesian2(-1.0, 2.0);
    const returnedResult = Cartesian2.negate(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("abs with a result parameter", function () {
    const cartesian = new Cartesian2(1.0, -2.0);
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(1.0, 2.0);
    const returnedResult = Cartesian2.abs(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("abs with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian2(1.0, -2.0);
    const expectedResult = new Cartesian2(1.0, 2.0);
    const returnedResult = Cartesian2.abs(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("lerp works with a result parameter", function () {
    const start = new Cartesian2(4.0, 8.0);
    const end = new Cartesian2(8.0, 20.0);
    const t = 0.25;
    const result = new Cartesian2();
    const expectedResult = new Cartesian2(5.0, 11.0);
    const returnedResult = Cartesian2.lerp(start, end, t, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("lerp works with a result parameter that is an input parameter", function () {
    const start = new Cartesian2(4.0, 8.0);
    const end = new Cartesian2(8.0, 20.0);
    const t = 0.25;
    const expectedResult = new Cartesian2(5.0, 11.0);
    const returnedResult = Cartesian2.lerp(start, end, t, start);
    expect(start).toBe(returnedResult);
    expect(start).toEqual(expectedResult);
  });

  it("lerp extrapolate forward", function () {
    const start = new Cartesian2(4.0, 8.0);
    const end = new Cartesian2(8.0, 20.0);
    const t = 2.0;
    const expectedResult = new Cartesian2(12.0, 32.0);
    const result = Cartesian2.lerp(start, end, t, new Cartesian2());
    expect(result).toEqual(expectedResult);
  });

  it("lerp extrapolate backward", function () {
    const start = new Cartesian2(4.0, 8.0);
    const end = new Cartesian2(8.0, 20.0);
    const t = -1.0;
    const expectedResult = new Cartesian2(0.0, -4.0);
    const result = Cartesian2.lerp(start, end, t, new Cartesian2());
    expect(result).toEqual(expectedResult);
  });

  it("angleBetween works for right angles", function () {
    const x = Cartesian2.UNIT_X;
    const y = Cartesian2.UNIT_Y;
    expect(Cartesian2.angleBetween(x, y)).toEqual(CesiumMath.PI_OVER_TWO);
    expect(Cartesian2.angleBetween(y, x)).toEqual(CesiumMath.PI_OVER_TWO);
  });

  it("angleBetween works for acute angles", function () {
    const x = new Cartesian2(0.0, 1.0);
    const y = new Cartesian2(1.0, 1.0);
    expect(Cartesian2.angleBetween(x, y)).toEqualEpsilon(
      CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON14
    );
    expect(Cartesian2.angleBetween(y, x)).toEqualEpsilon(
      CesiumMath.PI_OVER_FOUR,
      CesiumMath.EPSILON14
    );
  });

  it("angleBetween works for obtuse angles", function () {
    const x = new Cartesian2(0.0, 1.0);
    const y = new Cartesian2(-1.0, -1.0);
    expect(Cartesian2.angleBetween(x, y)).toEqualEpsilon(
      (CesiumMath.PI * 3.0) / 4.0,
      CesiumMath.EPSILON14
    );
    expect(Cartesian2.angleBetween(y, x)).toEqualEpsilon(
      (CesiumMath.PI * 3.0) / 4.0,
      CesiumMath.EPSILON14
    );
  });

  it("angleBetween works for zero angles", function () {
    const x = Cartesian2.UNIT_X;
    expect(Cartesian2.angleBetween(x, x)).toEqual(0.0);
  });

  it("most orthogonal angle is x", function () {
    const v = new Cartesian2(0.0, 1.0);
    expect(Cartesian2.mostOrthogonalAxis(v, new Cartesian2())).toEqual(
      Cartesian2.UNIT_X
    );
  });

  it("most orthogonal angle is y", function () {
    const v = new Cartesian2(1.0, 0.0);
    expect(Cartesian2.mostOrthogonalAxis(v, new Cartesian2())).toEqual(
      Cartesian2.UNIT_Y
    );
  });

  it("equals", function () {
    const cartesian = new Cartesian2(1.0, 2.0);
    expect(Cartesian2.equals(cartesian, new Cartesian2(1.0, 2.0))).toEqual(
      true
    );
    expect(Cartesian2.equals(cartesian, new Cartesian2(2.0, 2.0))).toEqual(
      false
    );
    expect(Cartesian2.equals(cartesian, new Cartesian2(2.0, 1.0))).toEqual(
      false
    );
    expect(Cartesian2.equals(cartesian, undefined)).toEqual(false);
  });

  it("equalsEpsilon", function () {
    let cartesian = new Cartesian2(1.0, 2.0);
    expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 0.0)).toEqual(
      true
    );
    expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 2.0), 1.0)).toEqual(
      true
    );
    expect(cartesian.equalsEpsilon(new Cartesian2(2.0, 2.0), 1.0)).toEqual(
      true
    );
    expect(cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), 1.0)).toEqual(
      true
    );
    expect(
      cartesian.equalsEpsilon(new Cartesian2(1.0, 3.0), CesiumMath.EPSILON6)
    ).toEqual(false);
    expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

    cartesian = new Cartesian2(3000000.0, 4000000.0);
    expect(
      cartesian.equalsEpsilon(new Cartesian2(3000000.0, 4000000.0), 0.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian2(3000000.0, 4000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian2(3000000.2, 4000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian2(3000000.2, 4000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian2(3000000.2, 4000000.2),
        CesiumMath.EPSILON9
      )
    ).toEqual(false);
    expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

    expect(Cartesian2.equalsEpsilon(undefined, cartesian, 1)).toEqual(false);
  });

  it("toString", function () {
    const cartesian = new Cartesian2(1.123, 2.345);
    expect(cartesian.toString()).toEqual("(1.123, 2.345)");
  });

  it("clone returns undefined with no parameter", function () {
    expect(Cartesian2.clone()).toBeUndefined();
  });

  it("maximumComponent throws with no parameter", function () {
    expect(function () {
      Cartesian2.maximumComponent();
    }).toThrowDeveloperError();
  });

  it("minimumComponent throws with no parameter", function () {
    expect(function () {
      Cartesian2.minimumComponent();
    }).toThrowDeveloperError();
  });

  it("magnitudeSquared throws with no parameter", function () {
    expect(function () {
      Cartesian2.magnitudeSquared();
    }).toThrowDeveloperError();
  });

  it("magnitude throws with no parameter", function () {
    expect(function () {
      Cartesian2.magnitude();
    }).toThrowDeveloperError();
  });

  it("normalize throws with no parameter", function () {
    expect(function () {
      Cartesian2.normalize();
    }).toThrowDeveloperError();
  });

  it("dot throws with no left parameter", function () {
    expect(function () {
      Cartesian2.dot(undefined, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("dot throws with no right parameter", function () {
    expect(function () {
      Cartesian2.dot(new Cartesian2(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throw with no left parameter", function () {
    const right = new Cartesian2(4.0, 5.0);
    expect(function () {
      Cartesian2.multiplyComponents(undefined, right);
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throw with no right parameter", function () {
    const left = new Cartesian2(4.0, 5.0);
    expect(function () {
      Cartesian2.multiplyComponents(left, undefined);
    }).toThrowDeveloperError();
  });

  it("divideComponents throw with no left parameter", function () {
    const right = new Cartesian2(4.0, 5.0);
    expect(function () {
      Cartesian2.divideComponents(undefined, right);
    }).toThrowDeveloperError();
  });

  it("divideComponents throw with no right parameter", function () {
    const left = new Cartesian2(4.0, 5.0);
    expect(function () {
      Cartesian2.divideComponents(left, undefined);
    }).toThrowDeveloperError();
  });

  it("add throws with no left parameter", function () {
    expect(function () {
      Cartesian2.add(undefined, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("add throws with no right parameter", function () {
    expect(function () {
      Cartesian2.add(new Cartesian2(), undefined);
    }).toThrowDeveloperError();
  });

  it("subtract throws with no left parameter", function () {
    expect(function () {
      Cartesian2.subtract(undefined, new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("subtract throws with no right parameter", function () {
    expect(function () {
      Cartesian2.subtract(new Cartesian2(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian2.multiplyByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no scalar parameter", function () {
    expect(function () {
      Cartesian2.multiplyByScalar(new Cartesian2(), undefined);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian2.divideByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no scalar parameter", function () {
    expect(function () {
      Cartesian2.divideByScalar(new Cartesian2(), undefined);
    }).toThrowDeveloperError();
  });

  it("negate throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian2.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("abs throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian2.abs(undefined);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no start parameter", function () {
    const end = new Cartesian2(8.0, 20.0);
    const t = 0.25;
    expect(function () {
      Cartesian2.lerp(undefined, end, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no end parameter", function () {
    const start = new Cartesian2(4.0, 8.0);
    const t = 0.25;
    expect(function () {
      Cartesian2.lerp(start, undefined, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no t parameter", function () {
    const start = new Cartesian2(4.0, 8.0);
    const end = new Cartesian2(8.0, 20.0);
    expect(function () {
      Cartesian2.lerp(start, end, undefined);
    }).toThrowDeveloperError();
  });

  it("angleBetween throws with no left parameter", function () {
    const right = new Cartesian2(8.0, 20.0);
    expect(function () {
      Cartesian2.angleBetween(undefined, right);
    }).toThrowDeveloperError();
  });

  it("angleBetween throws with no right parameter", function () {
    const left = new Cartesian2(4.0, 8.0);
    expect(function () {
      Cartesian2.angleBetween(left, undefined);
    }).toThrowDeveloperError();
  });

  it("mostOrthogonalAxis throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian2.mostOrthogonalAxis(undefined);
    }).toThrowDeveloperError();
  });

  it("fromElements returns a cartesian2 with corrrect coordinates", function () {
    const cartesian2 = Cartesian2.fromElements(2, 2);
    const expectedResult = new Cartesian2(2, 2);
    expect(cartesian2).toEqual(expectedResult);
  });

  it("fromElements result param returns cartesian2 with correct coordinates", function () {
    const cartesian2 = new Cartesian2();
    Cartesian2.fromElements(2, 2, cartesian2);
    const expectedResult = new Cartesian2(2, 2);
    expect(cartesian2).toEqual(expectedResult);
  });

  it("minimumByComponent throws with no result", function () {
    expect(function () {
      Cartesian2.minimumByComponent(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("maximumByComponent throws with no result", function () {
    expect(function () {
      Cartesian2.maximumByComponent(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("clamp throws with no result", function () {
    expect(function () {
      Cartesian2.clamp(new Cartesian2(), new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("normalize throws with no result", function () {
    expect(function () {
      Cartesian2.normalize(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throws with no result", function () {
    expect(function () {
      Cartesian2.multiplyComponents(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("divideComponents throws with no result", function () {
    expect(function () {
      Cartesian2.divideComponents(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("add throws with no result", function () {
    expect(function () {
      Cartesian2.add(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("subtact throws with no result", function () {
    expect(function () {
      Cartesian2.subtract(new Cartesian2(), new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no result", function () {
    expect(function () {
      Cartesian2.multiplyByScalar(new Cartesian2(), 2);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no result", function () {
    expect(function () {
      Cartesian2.divideByScalar(new Cartesian2(), 2);
    }).toThrowDeveloperError();
  });

  it("negate throws with no result", function () {
    expect(function () {
      Cartesian2.negate(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("abs throws with no result", function () {
    expect(function () {
      Cartesian2.abs(new Cartesian2());
    }).toThrowDeveloperError();
  });

  it("lerp throws with no result", function () {
    expect(function () {
      Cartesian2.lerp(new Cartesian2(), new Cartesian2(), 10);
    }).toThrowDeveloperError();
  });

  it("mostOrthogonalAxis throws with no result", function () {
    expect(function () {
      Cartesian2.mostOrthogonalAxis(new Cartesian2());
    }).toThrowDeveloperError();
  });

  createPackableSpecs(Cartesian2, new Cartesian2(1, 2), [1, 2]);
  createPackableArraySpecs(
    Cartesian2,
    [new Cartesian2(1, 2), new Cartesian2(3, 4)],
    [1, 2, 3, 4],
    2
  );
});
