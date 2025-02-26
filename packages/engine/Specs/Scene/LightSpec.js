import { Light } from "../../index.js";

describe("Scene/Light", function () {
  it("throws", function () {
    const light = new Light();
    expect(function () {
      return light.color;
    }).toThrowDeveloperError();
    expect(function () {
      return light.intensity;
    }).toThrowDeveloperError();
  });
});
