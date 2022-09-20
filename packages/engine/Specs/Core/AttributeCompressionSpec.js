import {
  AttributeCompression,
  AttributeType,
  ComponentDatatype,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  defined,
  Math as CesiumMath,
} from "../../index.js";;

describe("Core/AttributeCompression", function () {
  const negativeUnitZ = new Cartesian3(0.0, 0.0, -1.0);
  it("oct decode(0, 0)", function () {
    const result = new Cartesian3();
    AttributeCompression.octDecode(0, 0, result);
    expect(result).toEqual(negativeUnitZ);
  });

  it("oct encode(0, 0, -1)", function () {
    const result = new Cartesian2();
    AttributeCompression.octEncode(negativeUnitZ, result);
    expect(result).toEqual(new Cartesian2(255, 255));
  });

  it("oct encode(0, 0, 1)", function () {
    const result = new Cartesian2();
    AttributeCompression.octEncode(Cartesian3.UNIT_Z, result);
    expect(result).toEqual(new Cartesian2(128, 128));
  });

  it("oct encode(0, 0, -1) to 4 components", function () {
    const result = new Cartesian4();
    AttributeCompression.octEncodeToCartesian4(negativeUnitZ, result);
    expect(result).toEqual(new Cartesian4(255, 255, 255, 255));
  });

  it("oct encode(0, 0, 1) to 4 components", function () {
    const result = new Cartesian4();
    AttributeCompression.octEncodeToCartesian4(Cartesian3.UNIT_Z, result);
    expect(result).toEqual(new Cartesian4(128, 0, 128, 0));
  });

  it("oct extents are equal", function () {
    const result = new Cartesian3();
    // lower left
    AttributeCompression.octDecode(0, 0, result);
    expect(result).toEqual(negativeUnitZ);
    // lower right
    AttributeCompression.octDecode(255, 0, result);
    expect(result).toEqual(negativeUnitZ);
    // upper right
    AttributeCompression.octDecode(255, 255, result);
    expect(result).toEqual(negativeUnitZ);
    // upper left
    AttributeCompression.octDecode(255, 0, result);
    expect(result).toEqual(negativeUnitZ);
  });

  it("throws oct encode vector undefined", function () {
    let vector;
    const result = new Cartesian3();
    expect(function () {
      AttributeCompression.octEncode(vector, result);
    }).toThrowDeveloperError();
  });

  it("throws oct encode result undefined", function () {
    let result;
    expect(function () {
      AttributeCompression.octEncode(Cartesian3.UNIT_Z, result);
    }).toThrowDeveloperError();
  });

  it("throws oct encode non unit vector", function () {
    const nonUnitLengthVector = new Cartesian3(2.0, 0.0, 0.0);
    const result = new Cartesian2();
    expect(function () {
      AttributeCompression.octEncode(nonUnitLengthVector, result);
    }).toThrowDeveloperError();
  });

  it("throws oct encode zero length vector", function () {
    const result = new Cartesian2();
    expect(function () {
      AttributeCompression.octEncode(Cartesian3.ZERO, result);
    }).toThrowDeveloperError();
  });

  it("throws oct decode result undefined", function () {
    let result;
    expect(function () {
      AttributeCompression.octDecode(0, 0, result);
    }).toThrowDeveloperError();
  });

  it("throws oct decode x out of bounds", function () {
    const result = new Cartesian3();
    expect(function () {
      AttributeCompression.octDecode(256, 0, result);
    }).toThrowDeveloperError();
  });

  it("throws oct decode y out of bounds", function () {
    const result = new Cartesian3();
    expect(function () {
      AttributeCompression.octDecode(0, 256, result);
    }).toThrowDeveloperError();
  });

  it("throws 4-component oct decode out of bounds", function () {
    const result = new Cartesian3();
    expect(function () {
      AttributeCompression.octDecodeFromCartesian4(
        new Cartesian4(256, 0, 0, 0),
        result
      );
    }).toThrowDeveloperError();

    expect(function () {
      AttributeCompression.octDecodeFromCartesian4(
        new Cartesian4(0, 256, 0, 0),
        result
      );
    }).toThrowDeveloperError();

    expect(function () {
      AttributeCompression.octDecodeFromCartesian4(
        new Cartesian4(0, 0, 256, 0),
        result
      );
    }).toThrowDeveloperError();

    expect(function () {
      AttributeCompression.octDecodeFromCartesian4(
        new Cartesian4(0, 0, 0, 256),
        result
      );
    }).toThrowDeveloperError();
  });

  it("oct encoding", function () {
    const epsilon = CesiumMath.EPSILON1;

    const encoded = new Cartesian2();
    const result = new Cartesian3();
    let normal = new Cartesian3(0.0, 0.0, 1.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 0.0, -1.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 1.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, -1.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 0.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 0.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    expect(
      AttributeCompression.octDecode(encoded.x, encoded.y, result)
    ).toEqualEpsilon(normal, epsilon);
  });

  it("oct encoding high precision", function () {
    const rangeMax = 4294967295;
    const epsilon = CesiumMath.EPSILON8;

    const encoded = new Cartesian2();
    const result = new Cartesian3();
    let normal = new Cartesian3(0.0, 0.0, 1.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 0.0, -1.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 1.0, 0.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, -1.0, 0.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 0.0, 0.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 0.0, 0.0);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeInRange(normal, rangeMax, encoded);
    expect(
      AttributeCompression.octDecodeInRange(
        encoded.x,
        encoded.y,
        rangeMax,
        result
      )
    ).toEqualEpsilon(normal, epsilon);
  });

  it("oct encoding to 4 components", function () {
    const epsilon = CesiumMath.EPSILON1;

    const encoded = new Cartesian4();
    const result = new Cartesian3();
    let normal = new Cartesian3(0.0, 0.0, 1.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 0.0, -1.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 1.0, 0.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, -1.0, 0.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 0.0, 0.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 0.0, 0.0);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncodeToCartesian4(normal, encoded);
    expect(
      AttributeCompression.octDecodeFromCartesian4(encoded, result)
    ).toEqualEpsilon(normal, epsilon);
  });

  it("octFloat encoding", function () {
    const epsilon = CesiumMath.EPSILON1;

    const result = new Cartesian3();
    let normal = new Cartesian3(0.0, 0.0, 1.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 0.0, -1.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, 1.0, 0.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(0.0, -1.0, 0.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 0.0, 0.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 0.0, 0.0);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);

    normal = new Cartesian3(-1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    expect(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(normal),
        result
      )
    ).toEqualEpsilon(normal, epsilon);
  });

  it("octFloat encoding is equivalent to oct encoding", function () {
    const encoded = new Cartesian2();
    const result1 = new Cartesian3();
    const result2 = new Cartesian3();

    let normal = new Cartesian3(0.0, 0.0, 1.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(0.0, 0.0, -1.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(0.0, 1.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(0.0, -1.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(1.0, 0.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(-1.0, 0.0, 0.0);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(-1.0, -1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(-1.0, 1.0, 1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(-1.0, 1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);

    normal = new Cartesian3(-1.0, -1.0, -1.0);
    Cartesian3.normalize(normal, normal);
    AttributeCompression.octEncode(normal, encoded);
    AttributeCompression.octDecode(encoded.x, encoded.y, result1);
    AttributeCompression.octDecodeFloat(
      AttributeCompression.octEncodeFloat(normal),
      result2
    );
    expect(result1).toEqual(result2);
  });

  it("encodeFloat throws without vector", function () {
    expect(function () {
      AttributeCompression.octEncodeFloat(undefined);
    }).toThrowDeveloperError();
  });

  it("decodeFloat throws without value", function () {
    expect(function () {
      AttributeCompression.octDecodeFloat(undefined, new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("decodeFloat throws without result", function () {
    expect(function () {
      AttributeCompression.octDecodeFloat(0.0, undefined);
    }).toThrowDeveloperError();
  });

  it("encode and packFloat is equivalent to oct encoding", function () {
    const vector = new Cartesian3(1.0, 1.0, 1.0);
    Cartesian3.normalize(vector, vector);

    const encoded = AttributeCompression.octEncode(vector, new Cartesian2());
    const encodedFloat = AttributeCompression.octPackFloat(encoded);
    expect(
      AttributeCompression.octDecodeFloat(encodedFloat, new Cartesian3())
    ).toEqual(
      AttributeCompression.octDecode(encoded.x, encoded.y, new Cartesian3())
    );
  });

  it("packFloat throws without encoded", function () {
    expect(function () {
      AttributeCompression.octPackFloat(undefined);
    }).toThrowDeveloperError();
  });

  it("pack is equivalent to oct encoding", function () {
    const x = Cartesian3.UNIT_X;
    const y = Cartesian3.UNIT_Y;
    const z = Cartesian3.UNIT_Z;

    const packed = AttributeCompression.octPack(x, y, z, new Cartesian2());
    const decodedX = new Cartesian3();
    const decodedY = new Cartesian3();
    const decodedZ = new Cartesian3();
    AttributeCompression.octUnpack(packed, decodedX, decodedY, decodedZ);

    expect(decodedX).toEqual(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(x),
        new Cartesian3()
      )
    );
    expect(decodedY).toEqual(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(y),
        new Cartesian3()
      )
    );
    expect(decodedZ).toEqual(
      AttributeCompression.octDecodeFloat(
        AttributeCompression.octEncodeFloat(z),
        new Cartesian3()
      )
    );
  });

  it("pack throws without v1", function () {
    expect(function () {
      AttributeCompression.octPack(
        undefined,
        new Cartesian3(),
        new Cartesian3(),
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("pack throws without v2", function () {
    expect(function () {
      AttributeCompression.octPack(
        new Cartesian3(),
        undefined,
        new Cartesian3(),
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("pack throws without v3", function () {
    expect(function () {
      AttributeCompression.octPack(
        new Cartesian3(),
        new Cartesian3(),
        undefined,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("pack throws without result", function () {
    expect(function () {
      AttributeCompression.octPack(
        new Cartesian3(),
        new Cartesian3(),
        new Cartesian3(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("unpack throws without packed", function () {
    expect(function () {
      AttributeCompression.octUnpack(
        undefined,
        new Cartesian3(),
        new Cartesian3(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("unpack throws without v1", function () {
    expect(function () {
      AttributeCompression.octUnpack(
        new Cartesian2(),
        undefined,
        new Cartesian3(),
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("unpack throws without v2", function () {
    expect(function () {
      AttributeCompression.octUnpack(
        new Cartesian2(),
        new Cartesian3(),
        undefined,
        new Cartesian3()
      );
    }).toThrowDeveloperError();
  });

  it("unpack throws without v3", function () {
    expect(function () {
      AttributeCompression.octUnpack(
        new Cartesian2(),
        new Cartesian3(),
        new Cartesian3(),
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("compresses texture coordinates", function () {
    const coords = new Cartesian2(0.5, 0.5);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqualEpsilon(coords, 1.0 / 4096.0);
  });

  it("compress texture coordinates throws without texture coordinates", function () {
    expect(function () {
      AttributeCompression.compressTextureCoordinates(undefined);
    }).toThrowDeveloperError();
  });

  it("decompress texture coordinates throws without encoded texture coordinates", function () {
    expect(function () {
      AttributeCompression.decompressTextureCoordinates(
        undefined,
        new Cartesian2()
      );
    }).toThrowDeveloperError();
  });

  it("decompress texture coordinates throws without result", function () {
    expect(function () {
      AttributeCompression.decompressTextureCoordinates(0.0, undefined);
    }).toThrowDeveloperError();
  });

  it("compresses/decompresses 1.0", function () {
    const coords = new Cartesian2(1.0, 1.0);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqual(coords);
  });

  it("compresses/decompresses 0.0", function () {
    const coords = new Cartesian2(1.0, 1.0);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqual(coords);
  });

  it("compresses/decompresses 0.5 / 1.0", function () {
    const coords = new Cartesian2(0.5, 1.0);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqualEpsilon(coords, 1.0 / 4095.0);
  });

  it("compresses/decompresses 1.0 / 0.5", function () {
    const coords = new Cartesian2(1.0, 0.5);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqualEpsilon(coords, 1.0 / 4095.0);
  });

  it("compresses/decompresses values very close but not equal to 1.0", function () {
    const coords = new Cartesian2(0.99999999999999, 0.99999999999999);
    expect(
      AttributeCompression.decompressTextureCoordinates(
        AttributeCompression.compressTextureCoordinates(coords),
        new Cartesian2()
      )
    ).toEqualEpsilon(coords, 1.0 / 4095.0);
  });

  function zigZag(value) {
    return ((value << 1) ^ (value >> 15)) & 0xffff;
  }

  const maxShort = 32767;

  function deltaZigZagEncode(uBuffer, vBuffer, heightBuffer) {
    const length = uBuffer.length;
    const buffer = new Uint16Array(length * (defined(heightBuffer) ? 3 : 2));

    let lastU = 0;
    let lastV = 0;
    let lastHeight = 0;

    for (let i = 0; i < length; ++i) {
      const u = uBuffer[i];
      const v = vBuffer[i];

      buffer[i] = zigZag(u - lastU);
      buffer[i + length] = zigZag(v - lastV);

      lastU = u;
      lastV = v;

      if (defined(heightBuffer)) {
        const height = heightBuffer[i];

        buffer[i + length * 2] = zigZag(height - lastHeight);

        lastHeight = height;
      }
    }

    return buffer;
  }

  it("decodes delta and ZigZag encoded vertices without height", function () {
    const length = 10;
    const decodedUBuffer = new Array(length);
    const decodedVBuffer = new Array(length);
    for (let i = 0; i < length; ++i) {
      decodedUBuffer[i] = Math.floor(Math.random() * maxShort);
      decodedVBuffer[i] = Math.floor(Math.random() * maxShort);
    }

    const encoded = deltaZigZagEncode(decodedUBuffer, decodedVBuffer);
    const uBuffer = new Uint16Array(encoded.buffer, 0, length);
    const vBuffer = new Uint16Array(
      encoded.buffer,
      length * Uint16Array.BYTES_PER_ELEMENT,
      length
    );

    AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer);

    expect(uBuffer).toEqual(decodedUBuffer);
    expect(vBuffer).toEqual(decodedVBuffer);
  });

  it("decodes delta and ZigZag encoded vertices with height", function () {
    const length = 10;
    const decodedUBuffer = new Array(length);
    const decodedVBuffer = new Array(length);
    const decodedHeightBuffer = new Array(length);
    for (let i = 0; i < length; ++i) {
      decodedUBuffer[i] = Math.floor(Math.random() * maxShort);
      decodedVBuffer[i] = Math.floor(Math.random() * maxShort);
      decodedHeightBuffer[i] = Math.floor(Math.random() * maxShort);
    }

    const encoded = deltaZigZagEncode(
      decodedUBuffer,
      decodedVBuffer,
      decodedHeightBuffer
    );
    const uBuffer = new Uint16Array(encoded.buffer, 0, length);
    const vBuffer = new Uint16Array(
      encoded.buffer,
      length * Uint16Array.BYTES_PER_ELEMENT,
      length
    );
    const heightBuffer = new Uint16Array(
      encoded.buffer,
      2 * length * Uint16Array.BYTES_PER_ELEMENT,
      length
    );

    AttributeCompression.zigZagDeltaDecode(uBuffer, vBuffer, heightBuffer);

    expect(uBuffer).toEqual(decodedUBuffer);
    expect(vBuffer).toEqual(decodedVBuffer);
    expect(heightBuffer).toEqual(decodedHeightBuffer);
  });

  it("throws when zigZagDeltaDecode has an undefined uBuffer", function () {
    expect(function () {
      AttributeCompression.zigZagDeltaDecode(undefined, new Uint16Array(10));
    }).toThrowDeveloperError();
  });

  it("throws when zigZagDeltaDecode has an undefined vBuffer", function () {
    expect(function () {
      AttributeCompression.zigZagDeltaDecode(new Uint16Array(10), undefined);
    }).toThrowDeveloperError();
  });

  it("throws when zigZagDeltaDecode has unequal uBuffer and vBuffer length", function () {
    expect(function () {
      AttributeCompression.zigZagDeltaDecode(
        new Uint16Array(10),
        new Uint16Array(11)
      );
    }).toThrowDeveloperError();
  });

  it("throws when zigZagDeltaDecode has unequal uBuffer, vBuffer, and heightBuffer length", function () {
    expect(function () {
      AttributeCompression.zigZagDeltaDecode(
        new Uint16Array(10),
        new Uint16Array(10),
        new Uint16Array(11)
      );
    }).toThrowDeveloperError();
  });

  it("throws when dequantize has an undefined typedArray", function () {
    expect(function () {
      AttributeCompression.dequantize(
        undefined,
        ComponentDatatype.UNSIGNED_BYTE,
        AttributeType.VEC3,
        1
      );
    }).toThrowDeveloperError();
  });

  it("throws when dequantize has an undefined componentType", function () {
    expect(function () {
      AttributeCompression.dequantize(
        new Uint8Array([0, 0, 0, 0]),
        undefined,
        AttributeType.VEC3,
        1
      );
    }).toThrowDeveloperError();
  });

  it("throws when dequantize has an undefined type", function () {
    expect(function () {
      AttributeCompression.dequantize(
        new Uint8Array([0, 0, 0, 0]),
        ComponentDatatype.UNSIGNED_BYTE,
        undefined,
        1
      );
    }).toThrowDeveloperError();
  });

  it("throws when dequantize has an undefined count", function () {
    expect(function () {
      AttributeCompression.dequantize(
        new Uint8Array([0, 0, 0, 0]),
        ComponentDatatype.UNSIGNED_BYTE,
        AttributeType.VEC3,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("dequantize works with BYTE", function () {
    const input = [-127, -127, -127, 0, 0, 0, 127, 127, 127];
    const expected = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Int8Array(input),
      ComponentDatatype.BYTE,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqualEpsilon(expected[i], CesiumMath.EPSILON2);
    }
  });

  it("dequantize works with UNSIGNED_BYTE", function () {
    const input = [0, 0, 0, 127, 127, 127, 255, 255, 255];
    const expected = [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Uint8Array(input),
      ComponentDatatype.UNSIGNED_BYTE,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqualEpsilon(expected[i], CesiumMath.EPSILON2);
    }
  });

  it("dequantize works with SHORT", function () {
    const input = [-32767, -32767, -32767, 0, 0, 0, 32767, 32767, 32767];
    const expected = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Int16Array(input),
      ComponentDatatype.SHORT,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqualEpsilon(expected[i], CesiumMath.EPSILON5);
    }
  });

  it("dequantize works with UNSIGNED_SHORT", function () {
    const input = [0, 0, 0, 32767, 32767, 32767, 65535, 65535, 65535];
    const expected = [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Uint16Array(input),
      ComponentDatatype.UNSIGNED_SHORT,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqualEpsilon(expected[i], CesiumMath.EPSILON5);
    }
  });

  it("dequantize works with INT", function () {
    const input = [
      -2147483647,
      -2147483647,
      -2147483647,
      0,
      0,
      0,
      2147483647,
      2147483647,
      2147483647,
    ];
    const expected = [-1, -1, -1, 0, 0, 0, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Int32Array(input),
      ComponentDatatype.INT,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqual(expected[i]);
    }
  });

  it("dequantize works with UNSIGNED_INT", function () {
    const input = [
      0,
      0,
      0,
      2147483647,
      2147483647,
      2147483647,
      4294967295,
      4294967295,
      4294967295,
    ];
    const expected = [0, 0, 0, 0.5, 0.5, 0.5, 1, 1, 1];
    const result = AttributeCompression.dequantize(
      new Uint32Array(input),
      ComponentDatatype.UNSIGNED_INT,
      AttributeType.VEC3,
      3
    );
    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqual(expected[i]);
    }
  });

  it("decodeRGB565 throws without typedArray", function () {
    expect(function () {
      return AttributeCompression.decodeRGB565();
    }).toThrowDeveloperError();
  });

  it("decodeRGB565 throws if arrays are the wrong size", function () {
    expect(function () {
      return AttributeCompression.decodeRGB565(
        new Uint16Array([0]),
        new Float32Array(1)
      );
    }).toThrowDeveloperError();
  });

  it("decodeRGB565 works", function () {
    const input = new Uint16Array([
      0,
      //0b00001_000001_00001
      2881,
      //0b10000_100000_01000
      33800,
      //0b11111_111111_11111
      65535,
    ]);
    const expected = new Float32Array([
      0,
      0,
      0,
      1 / 31,
      1 / 63,
      1 / 31,
      16 / 31,
      32 / 63,
      8 / 31,
      31 / 31,
      63 / 63,
      31 / 31,
    ]);

    const result = new Float32Array(input.length * 3);
    AttributeCompression.decodeRGB565(input, result);

    for (let i = 0; i < input.length; i++) {
      expect(result[i]).toEqual(expected[i]);
    }
  });

  it("decodeRGB565 creates a result array if not defined", function () {
    const result = AttributeCompression.decodeRGB565(new Uint16Array([0]));
    expect(result).toEqual(new Float32Array([0, 0, 0]));
  });
});
