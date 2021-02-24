import { Light } from "../../Source/Cesium.js";

describe("Scene/Light", function () {
  it("throws", function () {
    var light = new Light();
    expect(function () {
      return light.color;
    }).toThrowDeveloperError();
    expect(function () {
      return light.intensity;
    }).toThrowDeveloperError();
  });
});
