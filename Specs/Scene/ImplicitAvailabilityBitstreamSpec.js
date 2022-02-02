import { ImplicitAvailabilityBitstream } from "../../Source/Cesium.js";

describe("Scene/ImplicitAvailabilityBitstream", function () {
  it("throws on missing lengthBits", function () {
    expect(function () {
      return new ImplicitAvailabilityBitstream({});
    }).toThrowDeveloperError();
  });

  it("throws on mismatched bitLength and bitstream.length", function () {
    expect(function () {
      return new ImplicitAvailabilityBitstream({
        lengthBits: 17,
        bitstream: new Uint8Array([0xff, 0x02]),
      });
    }).toThrowRuntimeError();
  });

  it("reads bits from constant", function () {
    const length = 21;
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: length,
      constant: true,
    });

    for (let i = 0; i < length; i++) {
      expect(bitstream.getBit(i)).toEqual(true);
    }
  });

  it("reads bits from bitstream", function () {
    // This is the packed representation of
    // 0b0101 1111  1xxx xxxx
    // where the xs are unused bits.
    const bitstreamU8 = new Uint8Array([0xfa, 0x01]);
    const expected = [false, true, false, true, true, true, true, true, true];
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: expected.length,
      bitstream: bitstreamU8,
    });

    for (let i = 0; i < expected.length; i++) {
      expect(bitstream.getBit(i)).toEqual(expected[i]);
    }
  });

  it("throws on out of bounds", function () {
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: 10,
      bitstream: new Uint8Array([0xff, 0x02]),
    });
    expect(function () {
      bitstream.getBit(-1);
    }).toThrowDeveloperError();

    expect(function () {
      bitstream.getBit(10);
    }).toThrowDeveloperError();
  });

  it("stores availableCount", function () {
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: 10,
      availableCount: 3,
      bitstream: new Uint8Array([0x07, 0x00]),
    });
    expect(bitstream.availableCount).toEqual(3);
  });

  it("computes availableCount if enabled and availableCount is undefined", function () {
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: 10,
      bitstream: new Uint8Array([0xff, 0x02]),
      computeAvailableCountEnabled: true,
    });
    expect(bitstream.availableCount).toBe(9);
  });

  it("does not compute availableCount if disabled and availableCount is undefined", function () {
    const bitstream = new ImplicitAvailabilityBitstream({
      lengthBits: 10,
      bitstream: new Uint8Array([0xff, 0x02]),
    });
    expect(bitstream.availableCount).not.toBeDefined();
  });
});
