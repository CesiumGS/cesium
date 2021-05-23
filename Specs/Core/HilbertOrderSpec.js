import { HilbertOrder } from "../../Source/Cesium.js";

describe("Core/HilbertOrder", function () {
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
    expect(HilbertOrder.encode2D(1, 0, 0)).toEqual(0);
    expect(HilbertOrder.encode2D(1, 0, 1)).toEqual(1);
    expect(HilbertOrder.encode2D(1, 1, 1)).toEqual(2);
    expect(HilbertOrder.encode2D(1, 1, 0)).toEqual(3);
  });

  it("decode2D throws for invalid level", function () {
    expect(function () {
      return HilbertOrder.decode2D(-1, 0, 0);
    }).toThrowDeveloperError();
  });

  it("decode2D throws for invalid index", function () {
    expect(function () {
      return HilbertOrder.decode2D(1, 4);
    }).toThrowDeveloperError();
  });

  it("decode2D works", function () {
    expect(HilbertOrder.decode2D(1, 0)).toEqual([0, 0]);
    expect(HilbertOrder.decode2D(1, 1)).toEqual([0, 1]);
    expect(HilbertOrder.decode2D(1, 2)).toEqual([1, 1]);
    expect(HilbertOrder.decode2D(1, 3)).toEqual([1, 0]);
  });
});
