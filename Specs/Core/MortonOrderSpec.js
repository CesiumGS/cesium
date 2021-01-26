import { MortonOrder } from "../../Source/Cesium.js";

describe("Core/MortonOrder", function () {
  it("encode2D throws for undefined inputs", function () {
    expect(function () {
      return MortonOrder.encode2D(undefined, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode2D(0, undefined);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for out of range inputs", function () {
    expect(function () {
      return MortonOrder.encode2D(-1, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode2D(0, -1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode2D(65536, 0); // 2^16
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode2D(0, 65536); // 2^16
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

    // largest 16-bit unsigned integer inputs ((2^16)-1) result in largest 32-bit unsigned integer output ((2^32)-1)
    expect(MortonOrder.encode2D(65535, 65535)).toEqual(4294967295); // binary: 11111111111111111111111111111111
    expect(MortonOrder.encode2D(65535, 0)).toEqual(1431655765); ////// binary:  1010101010101010101010101010101
    expect(MortonOrder.encode2D(0, 65535)).toEqual(2863311530); ////// binary: 10101010101010101010101010101010
  });

  it("decode2D throws for undefined input", function () {
    expect(function () {
      return MortonOrder.decode2D(undefined);
    }).toThrowDeveloperError();
  });

  it("decode2D throws for out of range input", function () {
    expect(function () {
      return MortonOrder.decode2D(-1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.decode2D(4294967296); // 2^32
    }).toThrowDeveloperError();
  });

  it("decode2D uses result parameter", function () {
    var array = new Array(2);
    var result = MortonOrder.decode2D(0, array);
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

    // largest 32-bit unsigned integer input ((2^32)-1) results in largest 16-bit unsigned integer outputs ((2^16)-1)
    expect(MortonOrder.decode2D(4294967295)).toEqual([65535, 65535]); // binary: 11111111111111111111111111111111
    expect(MortonOrder.decode2D(1431655765)).toEqual([65535, 0]); ////// binary:  1010101010101010101010101010101
    expect(MortonOrder.decode2D(2863311530)).toEqual([0, 65535]); ////// binary: 10101010101010101010101010101010
  });

  it("encode3D throws for undefined inputs", function () {
    expect(function () {
      return MortonOrder.encode3D(undefined, 0, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, undefined, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, 0, undefined);
    }).toThrowDeveloperError();
  });

  it("encode3D throws for out of range inputs", function () {
    expect(function () {
      return MortonOrder.encode3D(-1, 0, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, -1, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, 0, -1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(1024, 0, 0); // 2^10
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, 1024, 0); // 2^10
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.encode3D(0, 0, 1024); // 2^10
    }).toThrowDeveloperError();
  });

  it("encode3D works", function () {
    expect(MortonOrder.encode3D(0, 0, 0)).toEqual(0); // binary: 000
    expect(MortonOrder.encode3D(1, 0, 0)).toEqual(1); // binary: 001
    expect(MortonOrder.encode3D(0, 1, 0)).toEqual(2); // binary: 010
    expect(MortonOrder.encode3D(1, 1, 0)).toEqual(3); // binary: 011
    expect(MortonOrder.encode3D(0, 0, 1)).toEqual(4); // binary: 100
    expect(MortonOrder.encode3D(1, 0, 1)).toEqual(5); // binary: 101
    expect(MortonOrder.encode3D(0, 1, 1)).toEqual(6); // binary: 110
    expect(MortonOrder.encode3D(1, 1, 1)).toEqual(7); // binary: 111

    expect(MortonOrder.encode3D(1, 3, 3)).toEqual(55); // binary: 110111

    // largest 10-bit unsigned integer inputs ((2^10)-1) result in largest 30-bit unsigned integer output ((2^30)-1)
    expect(MortonOrder.encode3D(1023, 1023, 1023)).toEqual(1073741823); // binary: 111111111111111111111111111111
    expect(MortonOrder.encode3D(1023, 0, 0)).toEqual(153391689); ///////// binary:   1001001001001001001001001001
    expect(MortonOrder.encode3D(0, 1023, 0)).toEqual(306783378); ///////// binary:  10010010010010010010010010010
    expect(MortonOrder.encode3D(0, 0, 1023)).toEqual(613566756); ///////// binary: 100100100100100100100100100100
  });

  it("decode3D throws for undefined input", function () {
    expect(function () {
      return MortonOrder.decode3D(undefined);
    }).toThrowDeveloperError();
  });

  it("decode3D throws for out of range input", function () {
    expect(function () {
      return MortonOrder.decode3D(-1);
    }).toThrowDeveloperError();
    expect(function () {
      return MortonOrder.decode3D(1073741824); // 2^30
    }).toThrowDeveloperError();
  });

  it("decode3D uses result parameter", function () {
    var array = new Array(3);
    var result = MortonOrder.decode3D(0, array);
    expect(result).toBe(array);
  });

  it("decode3D works", function () {
    expect(MortonOrder.decode3D(0)).toEqual([0, 0, 0]); // binary: 000
    expect(MortonOrder.decode3D(1)).toEqual([1, 0, 0]); // binary: 001
    expect(MortonOrder.decode3D(2)).toEqual([0, 1, 0]); // binary: 010
    expect(MortonOrder.decode3D(3)).toEqual([1, 1, 0]); // binary: 011
    expect(MortonOrder.decode3D(4)).toEqual([0, 0, 1]); // binary: 100
    expect(MortonOrder.decode3D(5)).toEqual([1, 0, 1]); // binary: 101
    expect(MortonOrder.decode3D(6)).toEqual([0, 1, 1]); // binary: 110
    expect(MortonOrder.decode3D(7)).toEqual([1, 1, 1]); // binary: 111

    expect(MortonOrder.decode3D(55)).toEqual([1, 3, 3]); // binary: 110111

    // largest 30-bit unsigned integer input ((2^30)-1) results in largest 10-bit unsigned integer outputs ((2^10)-1)
    expect(MortonOrder.decode3D(1073741823)).toEqual([1023, 1023, 1023]); // binary: 111111111111111111111111111111
    expect(MortonOrder.decode3D(153391689)).toEqual([1023, 0, 0]); ///////// binary:   1001001001001001001001001001
    expect(MortonOrder.decode3D(306783378)).toEqual([0, 1023, 0]); ///////// binary:  10010010010010010010010010010
    expect(MortonOrder.decode3D(613566756)).toEqual([0, 0, 1023]); ///////// binary: 100100100100100100100100100100
  });
});
