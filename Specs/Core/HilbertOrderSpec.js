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
});
