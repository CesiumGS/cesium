import { Cartesian2, ImageBasedLighting } from "../../Source/Cesium.js";

describe("Scene/ImageBasedLighting", function () {
  it("constructs with default values", function () {
    const imageBasedLighting = new ImageBasedLighting();
    expect(
      Cartesian2.equals(
        imageBasedLighting.imageBasedLightingFactor,
        new Cartesian2(1.0, 1.0)
      )
    ).toBe(true);
    expect(imageBasedLighting.luminanceAtZenith).toEqual(0.2);
    expect(imageBasedLighting.sphericalHarmonicCoefficients).toBeUndefined();
    expect(imageBasedLighting.specularEnvironmentMaps).toBeUndefined();
  });

  it("throws when constructing with an invalid value for imageBasedLightingFactor", function () {
    expect(function () {
      return new ImageBasedLighting({
        imageBasedLightingFactor: new Cartesian2(-1.0, 0.0),
      });
    }).toThrowDeveloperError();
  });

  it("throws when constructing with an invalid value for imageBasedLightingFactor", function () {
    expect(function () {
      return new ImageBasedLighting({
        imageBasedLightingFactor: new Cartesian2(-1.0, 0.0),
      });
    }).toThrowDeveloperError();
  });

  it("throws when constructing with an invalid value for sphericalHarmonicCoefficients", function () {
    expect(function () {
      return new ImageBasedLighting({
        sphericalHarmonicCoefficients: [],
      });
    }).toThrowDeveloperError();
  });

  it("throws when setting an invalid value for imageBasedLightingFactor", function () {
    expect(function () {
      const imageBasedLighting = new ImageBasedLighting();
      imageBasedLighting.imageBasedLightingFactor = new Cartesian2(-1.0, 0.0);
    }).toThrowDeveloperError();
  });

  it("throws when setting an invalid value for imageBasedLightingFactor", function () {
    expect(function () {
      const imageBasedLighting = new ImageBasedLighting();
      imageBasedLighting.sphericalHarmonicCoefficients = [];
    }).toThrowDeveloperError();
  });

  it("enabled works", function () {
    const imageBasedLighting = new ImageBasedLighting();
    expect(imageBasedLighting.enabled).toBe(true);

    imageBasedLighting.imageBasedLightingFactor = Cartesian2.ZERO;
    expect(imageBasedLighting.enabled).toBe(false);

    imageBasedLighting.imageBasedLightingFactor = new Cartesian2(0.5, 0.0);
    expect(imageBasedLighting.enabled).toBe(true);
  });
});
