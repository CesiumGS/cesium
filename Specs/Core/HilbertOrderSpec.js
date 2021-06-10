import { FeatureDetection } from "../../Source/Cesium.js";
import { HilbertOrder } from "../../Source/Cesium.js";

describe("Core/HilbertOrder", function () {
  if (!FeatureDetection.supportsBigInt()) {
    return;
  }

  it("encode2D throws for undefined inputs", function () {
    expect(function () {
      return HilbertOrder.encode2D(undefined, 0, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.encode2D(0, undefined, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.encode2D(0, 0, undefined);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for invalid level", function () {
    expect(function () {
      return HilbertOrder.encode2D(-1, 0, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.encode2D(0, 0, 0);
    }).toThrowDeveloperError();
  });

  it("encode2D throws for invalid coordinates", function () {
    expect(function () {
      return HilbertOrder.encode2D(1, -1, 0);
    }).toThrowDeveloperError();

    expect(function () {
      return HilbertOrder.encode2D(0, -1, 0);
    }).toThrowDeveloperError();

    expect(function () {
      return HilbertOrder.encode2D(-1, -1, 0);
    }).toThrowDeveloperError();

    expect(function () {
      return HilbertOrder.encode2D(1, 2, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.encode2D(1, 0, 2);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.encode2D(1, 2, 2);
    }).toThrowDeveloperError();
  });

  it("encode2D works", function () {
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(1, 0, 0)).toEqual(BigInt(0));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(1, 0, 1)).toEqual(BigInt(1));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(1, 1, 1)).toEqual(BigInt(2));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(1, 1, 0)).toEqual(BigInt(3));

    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 0, 0)).toEqual(BigInt(0));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 1, 0)).toEqual(BigInt(1));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 1, 1)).toEqual(BigInt(2));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 0, 1)).toEqual(BigInt(3));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 0, 2)).toEqual(BigInt(4));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 0, 3)).toEqual(BigInt(5));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 1, 3)).toEqual(BigInt(6));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 1, 2)).toEqual(BigInt(7));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 2, 2)).toEqual(BigInt(8));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 2, 3)).toEqual(BigInt(9));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 3, 3)).toEqual(BigInt(10));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 3, 2)).toEqual(BigInt(11));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 3, 1)).toEqual(BigInt(12));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 2, 1)).toEqual(BigInt(13));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 2, 0)).toEqual(BigInt(14));
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.encode2D(2, 3, 0)).toEqual(BigInt(15));
  });

  it("decode2D throws for invalid level", function () {
    expect(function () {
      return HilbertOrder.decode2D(-1, 0, 0);
    }).toThrowDeveloperError();
    expect(function () {
      return HilbertOrder.decode2D(0, 0, 0);
    }).toThrowDeveloperError();
  });

  it("decode2D throws for invalid index", function () {
    expect(function () {
      return HilbertOrder.decode2D(1, 4);
    }).toThrowDeveloperError();
  });

  it("decode2D works", function () {
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(1, BigInt(0))).toEqual([0, 0]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(1, BigInt(1))).toEqual([0, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(1, BigInt(2))).toEqual([1, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(1, BigInt(3))).toEqual([1, 0]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(0))).toEqual([0, 0]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(1))).toEqual([1, 0]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(2))).toEqual([1, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(3))).toEqual([0, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(4))).toEqual([0, 2]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(5))).toEqual([0, 3]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(6))).toEqual([1, 3]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(7))).toEqual([1, 2]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(8))).toEqual([2, 2]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(9))).toEqual([2, 3]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(10))).toEqual([3, 3]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(11))).toEqual([3, 2]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(12))).toEqual([3, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(13))).toEqual([2, 1]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(14))).toEqual([2, 0]);
    // eslint-disable-next-line no-undef
    expect(HilbertOrder.decode2D(2, BigInt(15))).toEqual([3, 0]);
  });
});
