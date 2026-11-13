import { DynamicAtmosphereLightingType } from "../../index.js";

describe("Scene/DynamicAtmosphereLightingType", function () {
  function mockGlobe() {
    return {
      enableLighting: false,
      dynamicAtmosphereLighting: false,
      dynamicAtmosphereLightingFromSun: false,
    };
  }

  it("returns OFF when lighting is disabled", function () {
    const globe = mockGlobe();

    expect(DynamicAtmosphereLightingType.fromGlobeFlags(globe)).toBe(
      DynamicAtmosphereLightingType.NONE,
    );

    globe.enableLighting = true;

    expect(DynamicAtmosphereLightingType.fromGlobeFlags(globe)).toBe(
      DynamicAtmosphereLightingType.NONE,
    );

    globe.enableLighting = false;
    globe.dynamicAtmosphereLighting = true;
    expect(DynamicAtmosphereLightingType.fromGlobeFlags(globe)).toBe(
      DynamicAtmosphereLightingType.NONE,
    );
  });

  it("selects a light type depending on globe.dynamicAtmosphereLightingFromSun", function () {
    const globe = mockGlobe();
    globe.enableLighting = true;
    globe.dynamicAtmosphereLighting = true;

    globe.dynamicAtmosphereLightingFromSun = true;
    expect(DynamicAtmosphereLightingType.fromGlobeFlags(globe)).toBe(
      DynamicAtmosphereLightingType.SUNLIGHT,
    );

    globe.dynamicAtmosphereLightingFromSun = false;
    expect(DynamicAtmosphereLightingType.fromGlobeFlags(globe)).toBe(
      DynamicAtmosphereLightingType.SCENE_LIGHT,
    );
  });
});
