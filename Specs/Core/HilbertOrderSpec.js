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
    expect(HilbertOrder.encode2D(1, 0, 0)).toEqual(0);
    expect(HilbertOrder.encode2D(1, 0, 1)).toEqual(1);
    expect(HilbertOrder.encode2D(1, 1, 1)).toEqual(2);
    expect(HilbertOrder.encode2D(1, 1, 0)).toEqual(3);

    expect(HilbertOrder.encode2D(2, 0, 0)).toEqual(0);
    expect(HilbertOrder.encode2D(2, 1, 0)).toEqual(1);
    expect(HilbertOrder.encode2D(2, 1, 1)).toEqual(2);
    expect(HilbertOrder.encode2D(2, 0, 1)).toEqual(3);
    expect(HilbertOrder.encode2D(2, 0, 2)).toEqual(4);
    expect(HilbertOrder.encode2D(2, 0, 3)).toEqual(5);
    expect(HilbertOrder.encode2D(2, 1, 3)).toEqual(6);
    expect(HilbertOrder.encode2D(2, 1, 2)).toEqual(7);
    expect(HilbertOrder.encode2D(2, 2, 2)).toEqual(8);
    expect(HilbertOrder.encode2D(2, 2, 3)).toEqual(9);
    expect(HilbertOrder.encode2D(2, 3, 3)).toEqual(10);
    expect(HilbertOrder.encode2D(2, 3, 2)).toEqual(11);
    expect(HilbertOrder.encode2D(2, 3, 1)).toEqual(12);
    expect(HilbertOrder.encode2D(2, 2, 1)).toEqual(13);
    expect(HilbertOrder.encode2D(2, 2, 0)).toEqual(14);
    expect(HilbertOrder.encode2D(2, 3, 0)).toEqual(15);
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
    expect(HilbertOrder.decode2D(1, 0)).toEqual([0, 0]);
    expect(HilbertOrder.decode2D(1, 1)).toEqual([0, 1]);
    expect(HilbertOrder.decode2D(1, 2)).toEqual([1, 1]);
    expect(HilbertOrder.decode2D(1, 3)).toEqual([1, 0]);

    expect(HilbertOrder.decode2D(2, 0)).toEqual([0, 0]);
    expect(HilbertOrder.decode2D(2, 1)).toEqual([1, 0]);
    expect(HilbertOrder.decode2D(2, 2)).toEqual([1, 1]);
    expect(HilbertOrder.decode2D(2, 3)).toEqual([0, 1]);
    expect(HilbertOrder.decode2D(2, 4)).toEqual([0, 2]);
    expect(HilbertOrder.decode2D(2, 5)).toEqual([0, 3]);
    expect(HilbertOrder.decode2D(2, 6)).toEqual([1, 3]);
    expect(HilbertOrder.decode2D(2, 7)).toEqual([1, 2]);
    expect(HilbertOrder.decode2D(2, 8)).toEqual([2, 2]);
    expect(HilbertOrder.decode2D(2, 9)).toEqual([2, 3]);
    expect(HilbertOrder.decode2D(2, 10)).toEqual([3, 3]);
    expect(HilbertOrder.decode2D(2, 11)).toEqual([3, 2]);
    expect(HilbertOrder.decode2D(2, 12)).toEqual([3, 1]);
    expect(HilbertOrder.decode2D(2, 13)).toEqual([2, 1]);
    expect(HilbertOrder.decode2D(2, 14)).toEqual([2, 0]);
    expect(HilbertOrder.decode2D(2, 15)).toEqual([3, 0]);
  });
});
