import { MortonOrder } from "../../Source/Cesium.js";

describe("Core/MortonOrder", function () {
  it("encode2D throws for undefined x", function () {
    expect(function () {
      return MortonOrder.encode2D(undefined, 0);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for undefined y", function () {
    expect(function () {
      return MortonOrder.encode2D(0, undefined);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for out of range inputs", function () {
    expect(function () {
      return MortonOrder.encode2D(-1, -1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode2D(65536, 65536); // 2^16
    }).toThrowDeveloperError();
  });

  it("encode2D works", function () {
    expect(MortonOrder.encode2D(0, 0)).toEqual(0); // binary: 000
    expect(MortonOrder.encode2D(1, 0)).toEqual(1); // binary: 001
    expect(MortonOrder.encode2D(0, 1)).toEqual(2); // binary: 010
    expect(MortonOrder.encode2D(1, 1)).toEqual(3); // binary: 011
    expect(MortonOrder.encode2D(2, 0)).toEqual(4); // binary: 100
    expect(MortonOrder.encode2D(3, 0)).toEqual(5); // binary: 101
    expect(MortonOrder.encode2D(2, 1)).toEqual(6); // binary: 110
    expect(MortonOrder.encode2D(3, 1)).toEqual(7); // binary: 111
    expect(MortonOrder.encode2D(7, 5)).toEqual(55); // binary: 110111

    // largest input ((2^16)-1) results in largest 32-bit unsigned int ((2^32)-1)
    expect(MortonOrder.encode2D(65535, 65535)).toEqual(4294967295);
  });

  it("decode2D throws for undefined mortonIndex", function () {
    expect(function () {
      return MortonOrder.decode2D(undefined);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for out of range inputs", function () {
    expect(function () {
      return MortonOrder.decode2D(-1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.decode2D(4294967296); // 2^32
    }).toThrowDeveloperError();
  });

  it("decode2D uses result parameter", function () {
    var array = new Array(2);
    var result = MortonOrder.decode2D(3, array);
    expect(result).toBe(array);
  });

  it("decode2D works", function () {
    expect(MortonOrder.decode2D(0)).toEqual([0, 0]); // binary: 000
    expect(MortonOrder.decode2D(1)).toEqual([1, 0]); // binary: 001
    expect(MortonOrder.decode2D(2)).toEqual([0, 1]); // binary: 010
    expect(MortonOrder.decode2D(3)).toEqual([1, 1]); // binary: 011
    expect(MortonOrder.decode2D(4)).toEqual([2, 0]); // binary: 100
    expect(MortonOrder.decode2D(5)).toEqual([3, 0]); // binary: 101
    expect(MortonOrder.decode2D(6)).toEqual([2, 1]); // binary: 110
    expect(MortonOrder.decode2D(7)).toEqual([3, 1]); // binary: 111
    expect(MortonOrder.decode2D(55)).toEqual([7, 5]); // binary: 110111

    // largest input ((2^32)-1) results in largest 16-bit unsigned int ((2^16)-1)
    expect(MortonOrder.decode2D(4294967295)).toEqual([65535, 65535]);
  });
});
