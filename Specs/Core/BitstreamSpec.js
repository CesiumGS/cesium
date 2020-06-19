import { Bitstream } from "../../Source/Cesium.js";

describe("Core/Bitstream", function () {
  it("constructor has expected default values", function () {
    var bitstream = new Bitstream();
    expect(bitstream.byteLength).toEqual(0);
    expect(bitstream.elementSize).toEqual(1);
  });

  it("constructor works well with arguments", function () {
    var bitstream = new Bitstream(new Uint8Array([2, 4, 8]), 2);
    expect(bitstream.byteLength).toEqual(3);
    expect(bitstream.elementSize).toEqual(2);
  });

  it("get fails with invalid index", function () {
    var bitstream = new Bitstream(new Uint8Array([27, 123, 34, 23]), 2);
    expect(bitstream.get(-1)).toEqual(-1);
    expect(bitstream.get(1023)).toEqual(-1);
  });

  it("get works with 1 bit element size", function () {
    var bitstream = new Bitstream(new Uint8Array([27]), 1);
    //  0 1 2 3 4 5 6 7
    //  0 0 0 1 1 0 1 1
    expect(bitstream.get(0)).toEqual(0);
    expect(bitstream.get(3)).toEqual(1);
    expect(bitstream.get(5)).toEqual(0);
    expect(bitstream.get(7)).toEqual(1);
  });

  it("get works with 2 bit element size", function () {
    var bitstream = new Bitstream(new Uint8Array([2, 4, 11]), 2);
    //  0  1  2  3   4  5  6  7   8  9 10 11
    // 00 00 00 10  00 00 01 00  00 00 10 11
    expect(bitstream.get(0)).toEqual(0);
    expect(bitstream.get(3)).toEqual(2);
    expect(bitstream.get(6)).toEqual(1);
    expect(bitstream.get(11)).toEqual(3);
  });
});
