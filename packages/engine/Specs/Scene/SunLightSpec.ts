import { Color, SunLight } from "../../index.js";

describe("Scene/SunLight", function () {
  it("constructs with default options", function () {
    const light = new SunLight();

    expect(light.color).toEqual(Color.WHITE);
    expect(light.intensity).toBe(2.0);
  });

  it("constructs with all options", function () {
    const light = new SunLight({
      color: Color.RED,
      intensity: 2.0,
    });
    expect(light.color).toEqual(Color.RED);
    expect(light.color).not.toBe(Color.RED);
    expect(light.intensity).toBe(2.0);
  });
});
