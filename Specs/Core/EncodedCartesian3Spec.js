import { Cartesian3 } from "../../Source/Cesium.js";
import { EncodedCartesian3 } from "../../Source/Cesium.js";

describe("Core/EncodedCartesian3", function () {
  it("construct with default values", function () {
    const encoded = new EncodedCartesian3();
    expect(encoded.high).toEqual(Cartesian3.ZERO);
    expect(encoded.low).toEqual(Cartesian3.ZERO);
  });

  it("endcode encodes a positive value", function () {
    const encoded = EncodedCartesian3.encode(-10000000.0);
    expect(encoded.high + encoded.low).toEqual(-10000000.0);
  });

  it("endcode encodes a negative value", function () {
    const encoded = EncodedCartesian3.encode(10000000.0);
    expect(encoded.high + encoded.low).toEqual(10000000.0);
  });

  it("endcode encodes with a result parameter", function () {
    const result = {
      high: 0.0,
      low: 0.0,
    };
    const returnedResult = EncodedCartesian3.encode(0.0, result);
    expect(result).toBe(returnedResult);
    expect(returnedResult.high + returnedResult.low).toEqual(0.0);
  });

  it("fromCartesian encodes a cartesian", function () {
    const c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
    const encoded = EncodedCartesian3.fromCartesian(c);

    // Look mom, no epsilon check.
    expect(encoded.high.x + encoded.low.x).toEqual(-10000000.0);
    expect(encoded.high.y + encoded.low.y).toEqual(0.0);
    expect(encoded.high.z + encoded.low.z).toEqual(10000000.0);
  });

  it("fromCartesian encodes a cartesian with a result parameter", function () {
    const p = new Cartesian3(-10000000.0, 0.0, 10000000.0);
    const encoded = EncodedCartesian3.fromCartesian(p);

    const positions = new Float32Array(6);
    EncodedCartesian3.writeElements(p, positions, 0);

    expect(encoded.high.x).toEqual(positions[0]);
    expect(encoded.high.y).toEqual(positions[1]);
    expect(encoded.high.z).toEqual(positions[2]);
    expect(encoded.low.x).toEqual(positions[3]);
    expect(encoded.low.y).toEqual(positions[4]);
    expect(encoded.low.z).toEqual(positions[5]);
  });

  it("writeElements encodes a cartesian", function () {
    const c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
    const encoded = new EncodedCartesian3();
    const encoded2 = EncodedCartesian3.fromCartesian(c, encoded);

    expect(encoded2).toBe(encoded);
    expect(encoded.high.x + encoded.low.x).toEqual(-10000000.0);
    expect(encoded.high.y + encoded.low.y).toEqual(0.0);
    expect(encoded.high.z + encoded.low.z).toEqual(10000000.0);
  });

  it("encode throws without a value", function () {
    expect(function () {
      EncodedCartesian3.encode();
    }).toThrowDeveloperError();
  });

  it("fromCartesian throws without a cartesian", function () {
    expect(function () {
      EncodedCartesian3.fromCartesian();
    }).toThrowDeveloperError();
  });

  it("writeElements throws without a cartesian", function () {
    expect(function () {
      EncodedCartesian3.writeElements();
    }).toThrowDeveloperError();
  });

  it("writeElements throws without a cartesianArray", function () {
    expect(function () {
      EncodedCartesian3.writeElements(new Cartesian3());
    }).toThrowDeveloperError();
  });

  it("writeElements throws without an index", function () {
    expect(function () {
      EncodedCartesian3.writeElements(new Cartesian3(), new Float32Array(6));
    }).toThrowDeveloperError();
  });

  it("writeElements throws with a negative index", function () {
    expect(function () {
      EncodedCartesian3.writeElements(
        new Cartesian3(),
        new Float32Array(6),
        -1
      );
    }).toThrowDeveloperError();
  });
});
