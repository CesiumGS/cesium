import { Cartesian3, Color, DirectionalLight } from "../../Source/Cesium.js";

describe("Scene/DirectionalLight", function () {
  it("constructs with default options", function () {
    const light = new DirectionalLight({
      direction: Cartesian3.UNIT_X,
    });

    expect(light.direction).toEqual(Cartesian3.UNIT_X);
    expect(light.direction).not.toBe(Cartesian3.UNIT_X);
    expect(light.color).toEqual(Color.WHITE);
    expect(light.intensity).toBe(1.0);
  });

  it("constructs with all options", function () {
    const light = new DirectionalLight({
      direction: Cartesian3.UNIT_X,
      color: Color.RED,
      intensity: 2.0,
    });
    expect(light.direction).toEqual(Cartesian3.UNIT_X);
    expect(light.color).toEqual(Color.RED);
    expect(light.color).not.toBe(Color.RED);
    expect(light.intensity).toBe(2.0);
  });

  it("throws if options is undefined", function () {
    expect(function () {
      return new DirectionalLight();
    }).toThrowDeveloperError();
  });

  it("throws if options.direction is undefined", function () {
    expect(function () {
      return new DirectionalLight({
        color: Color.RED,
      });
    }).toThrowDeveloperError();
  });

  it("throws if options.direction is zero-length", function () {
    expect(function () {
      return new DirectionalLight({
        direction: Cartesian3.ZERO,
      });
    }).toThrowDeveloperError();
  });
});
