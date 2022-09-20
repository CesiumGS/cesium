import { Cartesian4, Color } from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";
import createPackableArraySpecs from "../../../../Specs/createPackableArraySpecs.js";;
import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

describe("Core/Cartesian4", function () {
  it("construct with default values", function () {
    const cartesian = new Cartesian4();
    expect(cartesian.x).toEqual(0.0);
    expect(cartesian.y).toEqual(0.0);
    expect(cartesian.z).toEqual(0.0);
    expect(cartesian.w).toEqual(0.0);
  });

  it("construct with all values", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    expect(cartesian.x).toEqual(1.0);
    expect(cartesian.y).toEqual(2.0);
    expect(cartesian.z).toEqual(3.0);
    expect(cartesian.w).toEqual(4.0);
  });

  it("fromArray creates a Cartesian4", function () {
    const cartesian = Cartesian4.fromArray([1.0, 2.0, 3.0, 4.0]);
    expect(cartesian).toEqual(new Cartesian4(1.0, 2.0, 3.0, 4.0));
  });

  it("fromArray with an offset creates a Cartesian4", function () {
    const cartesian = Cartesian4.fromArray([0.0, 1.0, 2.0, 3.0, 4.0, 0.0], 1);
    expect(cartesian).toEqual(new Cartesian4(1.0, 2.0, 3.0, 4.0));
  });

  it("fromArray creates a Cartesian4 with a result parameter", function () {
    const cartesian = new Cartesian4();
    const result = Cartesian4.fromArray([1.0, 2.0, 3.0, 4.0], 0, cartesian);
    expect(result).toBe(cartesian);
    expect(result).toEqual(new Cartesian4(1.0, 2.0, 3.0, 4.0));
  });

  it("fromArray throws without values", function () {
    expect(function () {
      Cartesian4.fromArray();
    }).toThrowDeveloperError();
  });

  it("fromElements returns a cartesian4 with corrrect coordinates", function () {
    const cartesian4 = Cartesian4.fromElements(2, 2, 4, 7);
    const expectedResult = new Cartesian4(2, 2, 4, 7);
    expect(cartesian4).toEqual(expectedResult);
  });

  it("fromElements result param returns cartesian4 with correct coordinates", function () {
    const cartesian4 = new Cartesian4();
    Cartesian4.fromElements(2, 2, 4, 7, cartesian4);
    const expectedResult = new Cartesian4(2, 2, 4, 7);
    expect(cartesian4).toEqual(expectedResult);
  });

  it("fromColor returns a cartesian4 with corrrect coordinates", function () {
    const cartesian4 = Cartesian4.fromColor(new Color(1.0, 2.0, 3.0, 4.0));
    expect(cartesian4).toEqual(new Cartesian4(1.0, 2.0, 3.0, 4.0));
  });

  it("fromColor result param returns cartesian4 with correct coordinates", function () {
    const cartesian4 = new Cartesian4();
    const result = Cartesian4.fromColor(
      new Color(1.0, 2.0, 3.0, 4.0),
      cartesian4
    );
    expect(cartesian4).toBe(result);
    expect(cartesian4).toEqual(new Cartesian4(1.0, 2.0, 3.0, 4.0));
  });

  it("fromColor throws without color", function () {
    expect(function () {
      Cartesian4.fromColor();
    }).toThrowDeveloperError();
  });

  it("clone without a result parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const result = Cartesian4.clone(cartesian, new Cartesian4());
    expect(cartesian).not.toBe(result);
    expect(cartesian).toEqual(result);
  });

  it("clone with a result parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const result = new Cartesian4();
    const returnedResult = Cartesian4.clone(cartesian, result);
    expect(cartesian).not.toBe(result);
    expect(result).toBe(returnedResult);
    expect(cartesian).toEqual(result);
  });

  it("clone works with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const returnedResult = Cartesian4.clone(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
  });

  it("maximumComponent works when X is greater", function () {
    const cartesian = new Cartesian4(2.0, 1.0, 0.0, -1.0);
    expect(Cartesian4.maximumComponent(cartesian)).toEqual(cartesian.x);
  });

  it("maximumComponent works when Y is greater", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 0.0, -1.0);
    expect(Cartesian4.maximumComponent(cartesian)).toEqual(cartesian.y);
  });

  it("maximumComponent works when Z is greater", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, -1.0);
    expect(Cartesian4.maximumComponent(cartesian)).toEqual(cartesian.z);
  });

  it("maximumComponent works when W is greater", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    expect(Cartesian4.maximumComponent(cartesian)).toEqual(cartesian.w);
  });

  it("minimumComponent works when X is lesser", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    expect(Cartesian4.minimumComponent(cartesian)).toEqual(cartesian.x);
  });

  it("minimumComponent works when Y is lesser", function () {
    const cartesian = new Cartesian4(2.0, 1.0, 3.0, 4.0);
    expect(Cartesian4.minimumComponent(cartesian)).toEqual(cartesian.y);
  });

  it("minimumComponent works when Z is lesser", function () {
    const cartesian = new Cartesian4(2.0, 1.0, 0.0, 4.0);
    expect(Cartesian4.minimumComponent(cartesian)).toEqual(cartesian.z);
  });

  it("minimumComponent works when W is lesser", function () {
    const cartesian = new Cartesian4(2.0, 1.0, 0.0, -1.0);
    expect(Cartesian4.minimumComponent(cartesian)).toEqual(cartesian.w);
  });

  it("minimumByComponent", function () {
    let first;
    let second;
    let expected;
    const result = new Cartesian4();

    first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expected = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    second = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    expected = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 0.0, 0.0);
    second = new Cartesian4(1.0, -20.0, 0.0, 0.0);
    expected = new Cartesian4(1.0, -20.0, 0.0, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -20.0, 0.0, 0.0);
    second = new Cartesian4(1.0, -15.0, 0.0, 0.0);
    expected = new Cartesian4(1.0, -20.0, 0.0, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.4, 0.0);
    second = new Cartesian4(1.0, -20.0, 26.5, 0.0);
    expected = new Cartesian4(1.0, -20.0, 26.4, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.5, 0.0);
    second = new Cartesian4(1.0, -20.0, 26.4, 0.0);
    expected = new Cartesian4(1.0, -20.0, 26.4, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.4, -450.0);
    second = new Cartesian4(1.0, -20.0, 26.5, 450.0);
    expected = new Cartesian4(1.0, -20.0, 26.4, -450.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.5, 450.0);
    second = new Cartesian4(1.0, -20.0, 26.4, -450.0);
    expected = new Cartesian4(1.0, -20.0, 26.4, -450.0);
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("minimumByComponent with a result parameter", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    const returnedResult = Cartesian4.minimumByComponent(first, second, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("minimumByComponent with a result parameter that is an input parameter", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.minimumByComponent(first, second, first)).toEqual(
      expected
    );

    first.x = 1.0;
    second.x = 2.0;
    expect(Cartesian4.minimumByComponent(first, second, second)).toEqual(
      expected
    );
  });

  it("minimumByComponent throws without first", function () {
    expect(function () {
      Cartesian4.minimumByComponent();
    }).toThrowDeveloperError();
  });

  it("minimumByComponent throws without second", function () {
    expect(function () {
      Cartesian4.minimumByComponent(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("minimumByComponent works when first's or second's X is lesser", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    second.x = 3.0;
    expected.x = 2.0;
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("minimumByComponent works when first's or second's Y is lesser", function () {
    const first = new Cartesian4(0.0, 2.0, 0.0, 0.0);
    const second = new Cartesian4(0.0, 1.0, 0.0, 0.0);
    const expected = new Cartesian4(0.0, 1.0, 0.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    second.y = 3.0;
    expected.y = 2.0;
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("minimumByComponent works when first's or second's Z is lesser", function () {
    const first = new Cartesian4(0.0, 0.0, 2.0, 0.0);
    const second = new Cartesian4(0.0, 0.0, 1.0, 0.0);
    const expected = new Cartesian4(0.0, 0.0, 1.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    second.z = 3.0;
    expected.z = 2.0;
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("minimumByComponent works when first's or second's W is lesser", function () {
    const first = new Cartesian4(0.0, 0.0, 0.0, 2.0);
    const second = new Cartesian4(0.0, 0.0, 0.0, 1.0);
    const expected = new Cartesian4(0.0, 0.0, 0.0, 1.0);
    const result = new Cartesian4();
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );

    second.w = 3.0;
    expected.w = 2.0;
    expect(Cartesian4.minimumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent", function () {
    let first;
    let second;
    let expected;

    first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    second = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 0.0, 0.0);
    second = new Cartesian4(1.0, -20.0, 0.0, 0.0);
    expected = new Cartesian4(2.0, -15.0, 0.0, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -20.0, 0.0, 0.0);
    second = new Cartesian4(1.0, -15.0, 0.0, 0.0);
    expected = new Cartesian4(2.0, -15.0, 0.0, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.4, 0.0);
    second = new Cartesian4(1.0, -20.0, 26.5, 0.0);
    expected = new Cartesian4(2.0, -15.0, 26.5, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.5, 0.0);
    second = new Cartesian4(1.0, -20.0, 26.4, 0.0);
    expected = new Cartesian4(2.0, -15.0, 26.5, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.5, 450.0);
    second = new Cartesian4(1.0, -20.0, 26.4, -450.0);
    expected = new Cartesian4(2.0, -15.0, 26.5, 450.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    first = new Cartesian4(2.0, -15.0, 26.5, -450.0);
    second = new Cartesian4(1.0, -20.0, 26.4, 450.0);
    expected = new Cartesian4(2.0, -15.0, 26.5, 450.0);
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent with a result parameter", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    const returnedResult = Cartesian4.maximumByComponent(first, second, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("maximumByComponent with a result parameter that is an input parameter", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, first)).toEqual(
      expected
    );

    first.x = 1.0;
    second.x = 2.0;
    expect(Cartesian4.maximumByComponent(first, second, second)).toEqual(
      expected
    );
  });

  it("maximumByComponent with a result parameter that is an input parameter", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.maximumByComponent(first, second, second)).toEqual(
      expected
    );

    first.x = 1.0;
    second.x = 2.0;
    expect(Cartesian4.maximumByComponent(first, second, second)).toEqual(
      expected
    );
  });

  it("maximumByComponent throws without first", function () {
    expect(function () {
      Cartesian4.maximumByComponent();
    }).toThrowDeveloperError();
  });

  it("maximumByComponent throws without second", function () {
    expect(function () {
      Cartesian4.maximumByComponent(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("maximumByComponent works when first's or second's X is greater", function () {
    const first = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const second = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const expected = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.x = 3.0;
    expected.x = 3.0;
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent works when first's or second's Y is greater", function () {
    const first = new Cartesian4(0.0, 2.0, 0.0, 0.0);
    const second = new Cartesian4(0.0, 1.0, 0.0, 0.0);
    const expected = new Cartesian4(0.0, 2.0, 0.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.y = 3.0;
    expected.y = 3.0;
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent works when first's or second's Z is greater", function () {
    const first = new Cartesian4(0.0, 0.0, 2.0, 0.0);
    const second = new Cartesian4(0.0, 0.0, 1.0, 0.0);
    const expected = new Cartesian4(0.0, 0.0, 2.0, 0.0);
    const result = new Cartesian4();
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.z = 3.0;
    expected.z = 3.0;
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("maximumByComponent works when first's or second's W is greater", function () {
    const first = new Cartesian4(0.0, 0.0, 0.0, 2.0);
    const second = new Cartesian4(0.0, 0.0, 0.0, 1.0);
    const expected = new Cartesian4(0.0, 0.0, 0.0, 2.0);
    const result = new Cartesian4();
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );

    second.w = 3.0;
    expected.w = 3.0;
    expect(Cartesian4.maximumByComponent(first, second, result)).toEqual(
      expected
    );
  });

  it("clamp", function () {
    let value;
    let min;
    let max;
    let expected;
    const result = new Cartesian4();

    value = new Cartesian4(-1.0, 0.0, 0.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 0.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(2.0, 0.0, 0.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(1.0, 0.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(0.0, -1.0, 0.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 0.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(0.0, 2.0, 0.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 1.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(0.0, 0.0, -1.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 0.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(0.0, 0.0, 2.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 0.0, 1.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(-2.0, 3.0, 4.0);
    min = new Cartesian4(0.0, 0.0, 0.0);
    max = new Cartesian4(1.0, 1.0, 1.0);
    expected = new Cartesian4(0.0, 1.0, 1.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);

    value = new Cartesian4(0.0, 0.0, 0.0);
    min = new Cartesian4(1.0, 2.0, 3.0);
    max = new Cartesian4(1.0, 2.0, 3.0);
    expected = new Cartesian4(1.0, 2.0, 3.0);
    expect(Cartesian4.clamp(value, min, max, result)).toEqual(expected);
  });

  it("clamp with a result parameter", function () {
    const value = new Cartesian4(-1.0, -1.0, -1.0, -1.0);
    const min = new Cartesian4(0.0, 0.0, 0.0, 0.0);
    const max = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    const expected = new Cartesian4(0.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    const returnedResult = Cartesian4.clamp(value, min, max, result);
    expect(returnedResult).toBe(result);
    expect(returnedResult).toEqual(expected);
  });

  it("clamp with a result parameter that is an input parameter", function () {
    const value = new Cartesian4(-1.0, -1.0, -1.0, -1.0);
    const min = new Cartesian4(0.0, 0.0, 0.0, 0.0);
    const max = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    const expected = new Cartesian4(0.0, 0.0, 0.0, 0.0);
    expect(Cartesian4.clamp(value, min, max, value)).toEqual(expected);

    Cartesian4.fromElements(-1.0, -1.0, -1.0, -1.0, value);
    expect(Cartesian4.clamp(value, min, max, min)).toEqual(expected);

    Cartesian4.fromElements(0.0, 0.0, 0.0, 0.0, min);
    expect(Cartesian4.clamp(value, min, max, max)).toEqual(expected);
  });

  it("clamp throws without value", function () {
    expect(function () {
      Cartesian4.clamp();
    }).toThrowDeveloperError();
  });

  it("clamp throws without min", function () {
    expect(function () {
      Cartesian4.clamp(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("clamp throws without max", function () {
    expect(function () {
      Cartesian4.clamp(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("magnitudeSquared", function () {
    const cartesian = new Cartesian4(3.0, 4.0, 5.0, 6.0);
    expect(Cartesian4.magnitudeSquared(cartesian)).toEqual(86.0);
  });

  it("magnitude", function () {
    const cartesian = new Cartesian4(3.0, 4.0, 5.0, 6.0);
    expect(Cartesian4.magnitude(cartesian)).toEqual(Math.sqrt(86.0));
  });

  it("distance", function () {
    const distance = Cartesian4.distance(
      new Cartesian4(1.0, 0.0, 0.0, 0.0),
      new Cartesian4(2.0, 0.0, 0.0, 0.0)
    );
    expect(distance).toEqual(1.0);
  });

  it("distance throws without left", function () {
    expect(function () {
      Cartesian4.distance();
    }).toThrowDeveloperError();
  });

  it("distance throws without right", function () {
    expect(function () {
      Cartesian4.distance(Cartesian4.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("distanceSquared", function () {
    const distanceSquared = Cartesian4.distanceSquared(
      new Cartesian4(1.0, 0.0, 0.0, 0.0),
      new Cartesian4(3.0, 0.0, 0.0, 0.0)
    );
    expect(distanceSquared).toEqual(4.0);
  });

  it("distanceSquared throws without left", function () {
    expect(function () {
      Cartesian4.distanceSquared();
    }).toThrowDeveloperError();
  });

  it("distanceSquared throws without right", function () {
    expect(function () {
      Cartesian4.distanceSquared(Cartesian4.UNIT_X);
    }).toThrowDeveloperError();
  });

  it("normalize works with a result parameter", function () {
    const cartesian = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const expectedResult = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const result = new Cartesian4();
    const returnedResult = Cartesian4.normalize(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("normalize works with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(2.0, 0.0, 0.0, 0.0);
    const expectedResult = new Cartesian4(1.0, 0.0, 0.0, 0.0);
    const returnedResult = Cartesian4.normalize(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("normalize throws with zero vector", function () {
    expect(function () {
      Cartesian4.normalize(Cartesian4.ZERO, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("multiplyComponents works with a result parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
    const right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(8.0, 15.0, 42.0, 72.0);
    const returnedResult = Cartesian4.multiplyComponents(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("multiplyComponents works with a result parameter that is an input parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
    const right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
    const expectedResult = new Cartesian4(8.0, 15.0, 42.0, 72.0);
    const returnedResult = Cartesian4.multiplyComponents(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("divideComponents works with a result parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 15.0);
    const right = new Cartesian4(4.0, 5.0, 8.0, 2.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(0.5, 0.6, 0.75, 7.5);
    const returnedResult = Cartesian4.divideComponents(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("divideComponents works with a result parameter that is an input parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 15.0);
    const right = new Cartesian4(4.0, 5.0, 8.0, 2.0);
    const expectedResult = new Cartesian4(0.5, 0.6, 0.75, 7.5);
    const returnedResult = Cartesian4.divideComponents(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("dot", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
    const right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
    const expectedResult = 137.0;
    const result = Cartesian4.dot(left, right);
    expect(result).toEqual(expectedResult);
  });

  it("add works with a result parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
    const right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(6.0, 8.0, 13.0, 17.0);
    const returnedResult = Cartesian4.add(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("add works with a result parameter that is an input parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 6.0, 8.0);
    const right = new Cartesian4(4.0, 5.0, 7.0, 9.0);
    const expectedResult = new Cartesian4(6.0, 8.0, 13.0, 17.0);
    const returnedResult = Cartesian4.add(left, right, left);
    expect(left).toBe(returnedResult);
    expect(left).toEqual(expectedResult);
  });

  it("subtract works with a result parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 4.0, 8.0);
    const right = new Cartesian4(1.0, 5.0, 7.0, 9.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(1.0, -2.0, -3.0, -1.0);
    const returnedResult = Cartesian4.subtract(left, right, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("subtract works with this result parameter", function () {
    const left = new Cartesian4(2.0, 3.0, 4.0, 8.0);
    const right = new Cartesian4(1.0, 5.0, 7.0, 9.0);
    const expectedResult = new Cartesian4(1.0, -2.0, -3.0, -1.0);
    const returnedResult = Cartesian4.subtract(left, right, left);
    expect(returnedResult).toBe(left);
    expect(left).toEqual(expectedResult);
  });

  it("multiplyByScalar with a result parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const result = new Cartesian4();
    const scalar = 2;
    const expectedResult = new Cartesian4(2.0, 4.0, 6.0, 8.0);
    const returnedResult = Cartesian4.multiplyByScalar(
      cartesian,
      scalar,
      result
    );
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("multiplyByScalar with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const scalar = 2;
    const expectedResult = new Cartesian4(2.0, 4.0, 6.0, 8.0);
    const returnedResult = Cartesian4.multiplyByScalar(
      cartesian,
      scalar,
      cartesian
    );
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("divideByScalar with a result parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const result = new Cartesian4();
    const scalar = 2;
    const expectedResult = new Cartesian4(0.5, 1.0, 1.5, 2.0);
    const returnedResult = Cartesian4.divideByScalar(cartesian, scalar, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("divideByScalar with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    const scalar = 2;
    const expectedResult = new Cartesian4(0.5, 1.0, 1.5, 2.0);
    const returnedResult = Cartesian4.divideByScalar(
      cartesian,
      scalar,
      cartesian
    );
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("negate with a result parameter", function () {
    const cartesian = new Cartesian4(1.0, -2.0, -5.0, 4.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(-1.0, 2.0, 5.0, -4.0);
    const returnedResult = Cartesian4.negate(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("negate with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(1.0, -2.0, -5.0);
    const expectedResult = new Cartesian4(-1.0, 2.0, 5.0);
    const returnedResult = Cartesian4.negate(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("abs with a result parameter", function () {
    const cartesian = new Cartesian4(1.0, -2.0, -4.0, -3.0);
    const result = new Cartesian4();
    const expectedResult = new Cartesian4(1.0, 2.0, 4.0, 3.0);
    const returnedResult = Cartesian4.abs(cartesian, result);
    expect(result).toBe(returnedResult);
    expect(result).toEqual(expectedResult);
  });

  it("abs with a result parameter that is an input parameter", function () {
    const cartesian = new Cartesian4(1.0, -2.0, -4.0, -3.0);
    const expectedResult = new Cartesian4(1.0, 2.0, 4.0, 3.0);
    const returnedResult = Cartesian4.abs(cartesian, cartesian);
    expect(cartesian).toBe(returnedResult);
    expect(cartesian).toEqual(expectedResult);
  });

  it("lerp works with a result parameter that is an input parameter", function () {
    const start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
    const end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
    const t = 0.25;
    const expectedResult = new Cartesian4(5.0, 11.0, 12.5, 22.5);
    const returnedResult = Cartesian4.lerp(start, end, t, start);
    expect(start).toBe(returnedResult);
    expect(start).toEqual(expectedResult);
  });

  it("lerp extrapolate forward", function () {
    const start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
    const end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
    const t = 2.0;
    let result = new Cartesian4();
    const expectedResult = new Cartesian4(12.0, 32.0, 30.0, 40.0);
    result = Cartesian4.lerp(start, end, t, result);
    expect(result).toEqual(expectedResult);
  });

  it("lerp extrapolate backward", function () {
    const start = new Cartesian4(4.0, 8.0, 10.0, 20.0);
    const end = new Cartesian4(8.0, 20.0, 20.0, 30.0);
    const t = -1.0;
    let result = new Cartesian4();
    const expectedResult = new Cartesian4(0.0, -4.0, 0.0, 10.0);
    result = Cartesian4.lerp(start, end, t, result);
    expect(result).toEqual(expectedResult);
  });

  it("most orthogonal angle is x", function () {
    const v = new Cartesian4(0.0, 1.0, 2.0, 3.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_X
    );
  });

  it("most orthogonal angle is y", function () {
    const v = new Cartesian4(1.0, 0.0, 2.0, 3.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Y
    );
  });

  it("most orthogonal angle is z", function () {
    let v = new Cartesian4(2.0, 3.0, 0.0, 1.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    );

    v = new Cartesian4(3.0, 2.0, 0.0, 1.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_Z
    );
  });

  it("most orthogonal angle is w", function () {
    let v = new Cartesian4(1.0, 2.0, 3.0, 0.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_W
    );

    v = new Cartesian4(2.0, 3.0, 1.0, 0.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_W
    );

    v = new Cartesian4(3.0, 1.0, 2.0, 0.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_W
    );

    v = new Cartesian4(3.0, 2.0, 1.0, 0.0);
    expect(Cartesian4.mostOrthogonalAxis(v, new Cartesian4())).toEqual(
      Cartesian4.UNIT_W
    );
  });

  it("equals", function () {
    const cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    expect(
      Cartesian4.equals(cartesian, new Cartesian4(1.0, 2.0, 3.0, 4.0))
    ).toEqual(true);
    expect(
      Cartesian4.equals(cartesian, new Cartesian4(2.0, 2.0, 3.0, 4.0))
    ).toEqual(false);
    expect(
      Cartesian4.equals(cartesian, new Cartesian4(2.0, 1.0, 3.0, 4.0))
    ).toEqual(false);
    expect(
      Cartesian4.equals(cartesian, new Cartesian4(1.0, 2.0, 4.0, 4.0))
    ).toEqual(false);
    expect(
      Cartesian4.equals(cartesian, new Cartesian4(1.0, 2.0, 3.0, 5.0))
    ).toEqual(false);
    expect(Cartesian4.equals(cartesian, undefined)).toEqual(false);
  });

  it("equalsEpsilon", function () {
    let cartesian = new Cartesian4(1.0, 2.0, 3.0, 4.0);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 4.0), 0.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(2.0, 2.0, 3.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(1.0, 3.0, 3.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 4.0, 4.0), 1.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(new Cartesian4(1.0, 2.0, 3.0, 5.0), 1.0)
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(2.0, 2.0, 3.0, 4.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(1.0, 3.0, 3.0, 4.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(1.0, 2.0, 4.0, 4.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(1.0, 2.0, 3.0, 5.0),
        CesiumMath.EPSILON6
      )
    ).toEqual(false);
    expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

    cartesian = new Cartesian4(3000000.0, 4000000.0, 5000000.0, 6000000.0);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.0, 4000000.0, 5000000.0, 6000000.0),
        0.0
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.2, 4000000.0, 5000000.0, 6000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.0, 4000000.2, 5000000.0, 6000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.0, 4000000.0, 5000000.2, 6000000.0),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.0, 4000000.0, 5000000.0, 6000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.2, 4000000.2, 5000000.2, 6000000.2),
        CesiumMath.EPSILON7
      )
    ).toEqual(true);
    expect(
      cartesian.equalsEpsilon(
        new Cartesian4(3000000.2, 4000000.2, 5000000.2, 6000000.2),
        CesiumMath.EPSILON9
      )
    ).toEqual(false);
    expect(cartesian.equalsEpsilon(undefined, 1)).toEqual(false);

    expect(Cartesian4.equalsEpsilon(undefined, cartesian, 1)).toEqual(false);
  });

  it("toString", function () {
    const cartesian = new Cartesian4(1.123, 2.345, 6.789, 6.123);
    expect(cartesian.toString()).toEqual("(1.123, 2.345, 6.789, 6.123)");
  });

  it("clone returns undefined with no parameter", function () {
    expect(Cartesian4.clone()).toBeUndefined();
  });

  it("maximumComponent throws with no parameter", function () {
    expect(function () {
      Cartesian4.maximumComponent();
    }).toThrowDeveloperError();
  });

  it("minimumComponent throws with no parameter", function () {
    expect(function () {
      Cartesian4.minimumComponent();
    }).toThrowDeveloperError();
  });

  it("magnitudeSquared throws with no parameter", function () {
    expect(function () {
      Cartesian4.magnitudeSquared();
    }).toThrowDeveloperError();
  });

  it("magnitude throws with no parameter", function () {
    expect(function () {
      Cartesian4.magnitude();
    }).toThrowDeveloperError();
  });

  it("normalize throws with no parameter", function () {
    expect(function () {
      Cartesian4.normalize();
    }).toThrowDeveloperError();
  });

  it("dot throws with no left parameter", function () {
    expect(function () {
      Cartesian4.dot(undefined, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throw with no left parameter", function () {
    const right = new Cartesian4(4.0, 5.0, 6.0, 7.0);
    expect(function () {
      Cartesian4.multiplyComponents(undefined, right);
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throw with no right parameter", function () {
    const left = new Cartesian4(4.0, 5.0, 6.0, 7.0);
    expect(function () {
      Cartesian4.multiplyComponents(left, undefined);
    }).toThrowDeveloperError();
  });

  it("divideComponents throw with no left parameter", function () {
    const right = new Cartesian4(4.0, 5.0, 6.0, 7.0);
    expect(function () {
      Cartesian4.divideComponents(undefined, right);
    }).toThrowDeveloperError();
  });

  it("divideComponents throw with no right parameter", function () {
    const left = new Cartesian4(4.0, 5.0, 6.0, 7.0);
    expect(function () {
      Cartesian4.divideComponents(left, undefined);
    }).toThrowDeveloperError();
  });

  it("dot throws with no right parameter", function () {
    expect(function () {
      Cartesian4.dot(new Cartesian4(), undefined);
    }).toThrowDeveloperError();
  });

  it("add throws with no left parameter", function () {
    expect(function () {
      Cartesian4.add(undefined, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("add throws with no right parameter", function () {
    expect(function () {
      Cartesian4.add(new Cartesian4(), undefined);
    }).toThrowDeveloperError();
  });

  it("subtract throws with no left parameter", function () {
    expect(function () {
      Cartesian4.subtract(undefined, new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("subtract throws with no right parameter", function () {
    expect(function () {
      Cartesian4.subtract(new Cartesian4(), undefined);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian4.multiplyByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no scalar parameter", function () {
    expect(function () {
      Cartesian4.multiplyByScalar(new Cartesian4(), undefined);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian4.divideByScalar(undefined, 2.0);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no scalar parameter", function () {
    expect(function () {
      Cartesian4.divideByScalar(new Cartesian4(), undefined);
    }).toThrowDeveloperError();
  });

  it("negate throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian4.negate(undefined);
    }).toThrowDeveloperError();
  });

  it("abs throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian4.abs(undefined);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no start parameter", function () {
    const end = new Cartesian4(8.0, 20.0, 6.0);
    const t = 0.25;
    expect(function () {
      Cartesian4.lerp(undefined, end, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no end parameter", function () {
    const start = new Cartesian4(4.0, 8.0, 6.0);
    const t = 0.25;
    expect(function () {
      Cartesian4.lerp(start, undefined, t);
    }).toThrowDeveloperError();
  });

  it("lerp throws with no t parameter", function () {
    const start = new Cartesian4(4.0, 8.0, 6.0, 7.0);
    const end = new Cartesian4(8.0, 20.0, 6.0, 7.0);
    expect(function () {
      Cartesian4.lerp(start, end, undefined);
    }).toThrowDeveloperError();
  });

  it("mostOrthogonalAxis throws with no cartesian parameter", function () {
    expect(function () {
      Cartesian4.mostOrthogonalAxis(undefined);
    }).toThrowDeveloperError();
  });

  it("minimumByComponent throws with no result", function () {
    expect(function () {
      Cartesian4.minimumByComponent(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("maximumByComponent throws with no result", function () {
    expect(function () {
      Cartesian4.maximumByComponent(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("clamp throws with no result", function () {
    expect(function () {
      Cartesian4.clamp(new Cartesian4(), new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("normalize throws with no result", function () {
    expect(function () {
      Cartesian4.normalize(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("multiplyComponents throws with no result", function () {
    expect(function () {
      Cartesian4.multiplyComponents(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("divideComponents throws with no result", function () {
    expect(function () {
      Cartesian4.divideComponents(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("add throws with no result", function () {
    expect(function () {
      Cartesian4.add(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("subtract throws with no result", function () {
    expect(function () {
      Cartesian4.subtract(new Cartesian4(), new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("multiplyByScalar throws with no result", function () {
    expect(function () {
      Cartesian4.multiplyByScalar(new Cartesian4(), 2);
    }).toThrowDeveloperError();
  });

  it("divideByScalar throws with no result", function () {
    expect(function () {
      Cartesian4.divideByScalar(new Cartesian4(), 2);
    }).toThrowDeveloperError();
  });

  it("negate throws with no result", function () {
    expect(function () {
      Cartesian4.negate(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("abs throws with no result", function () {
    expect(function () {
      Cartesian4.abs(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("mostOrthogonalAxis throws with no result", function () {
    expect(function () {
      Cartesian4.mostOrthogonalAxis(new Cartesian4());
    }).toThrowDeveloperError();
  });

  it("packs and unpacks floating point values for representation as uint8 4-vectors", function () {
    function testFloat(float) {
      const packedFloat = Cartesian4.packFloat(float);
      expect(0 <= packedFloat.x && packedFloat.x <= 255).toBe(true);
      expect(0 <= packedFloat.y && packedFloat.y <= 255).toBe(true);
      expect(0 <= packedFloat.z && packedFloat.z <= 255).toBe(true);
      expect(0 <= packedFloat.w && packedFloat.w <= 255).toBe(true);

      const unpackedFloat = Cartesian4.unpackFloat(packedFloat);
      expect(unpackedFloat).toEqual(float);
    }

    function testFloatNaN(float) {
      expect(float).toBeNaN();
      const packedFloat = Cartesian4.packFloat(float);
      const unpackedFloat = Cartesian4.unpackFloat(packedFloat);
      expect(unpackedFloat).toBeNaN();
    }

    function testFloatOutOfRange(float) {
      const packedFloat = Cartesian4.packFloat(float);
      const unpackedFloat = Cartesian4.unpackFloat(packedFloat);
      expect(unpackedFloat).toEqual(CesiumMath.sign(float) * Infinity);
    }

    testFloat(0.0);
    testFloat(-1.0);
    testFloat(+1.0);
    testFloat(123.5);
    testFloat(16777216);

    testFloat(+Infinity); // 64-bit infinity -> 32-bit infinity
    testFloat(-Infinity); // 64-bit infinity -> 32-bit infinity
    testFloatNaN(NaN); // 64-bit NaN -> 32bit NaN

    testFloatOutOfRange(+Number.MAX_VALUE);
    testFloatOutOfRange(-Number.MAX_VALUE);

    const f32 = new Float32Array(1);

    f32[0] = +Infinity;
    testFloat(f32[0]); // 32-bit infinity

    f32[0] = -Infinity;
    testFloat(f32[0]); // 32-bit infinity

    f32[0] = NaN;
    testFloatNaN(f32[0]); // 32-bit NaN
  });

  createPackableSpecs(Cartesian4, new Cartesian4(1, 2, 3, 4), [1, 2, 3, 4]);
  createPackableArraySpecs(
    Cartesian4,
    [new Cartesian4(1, 2, 3, 4), new Cartesian4(5, 6, 7, 8)],
    [1, 2, 3, 4, 5, 6, 7, 8],
    4
  );
});
