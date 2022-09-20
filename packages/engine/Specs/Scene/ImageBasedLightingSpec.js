import {
  Cartesian2,
  Cartesian3,
  ImageBasedLighting,
} from "../../Source/Cesium.js";

describe("Scene/ImageBasedLighting", function () {
  // These are dummy values, not meant to represent valid spherical harmonic coefficients.
  const testCoefficients = [
    new Cartesian3(1, 1, 1),
    new Cartesian3(2, 2, 2),
    new Cartesian3(3, 3, 3),
    new Cartesian3(4, 4, 4),
    new Cartesian3(5, 5, 5),
    new Cartesian3(6, 6, 6),
    new Cartesian3(7, 7, 7),
    new Cartesian3(8, 8, 8),
    new Cartesian3(9, 9, 9),
  ];

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

  it("imageBasedLightingFactor saves previous value", function () {
    const imageBasedLighting = new ImageBasedLighting({
      imageBasedLightingFactor: Cartesian2.ZERO,
    });
    imageBasedLighting.imageBasedLightingFactor = new Cartesian2(1.0, 1.0);
    expect(
      Cartesian2.equals(
        imageBasedLighting.imageBasedLightingFactor,
        new Cartesian2(1.0, 1.0)
      )
    ).toBe(true);
    expect(
      Cartesian2.equals(
        imageBasedLighting._previousImageBasedLightingFactor,
        Cartesian2.ZERO
      )
    ).toBe(true);
  });

  it("luminanceAtZenith saves previous value", function () {
    const imageBasedLighting = new ImageBasedLighting({
      luminanceAtZenith: 0.0,
    });
    imageBasedLighting.luminanceAtZenith = 0.5;
    expect(imageBasedLighting.luminanceAtZenith).toBe(0.5);
    expect(imageBasedLighting._previousLuminanceAtZenith).toBe(0.0);
  });

  it("sphericalHarmonicCoefficients saves previous value", function () {
    const imageBasedLighting = new ImageBasedLighting({
      sphericalHarmonicCoefficients: testCoefficients,
    });

    imageBasedLighting.sphericalHarmonicCoefficients = undefined;
    expect(imageBasedLighting.sphericalHarmonicCoefficients).toBeUndefined();
    expect(imageBasedLighting._previousSphericalHarmonicCoefficients).toBe(
      testCoefficients
    );
  });

  it("enabled returns correct values", function () {
    const imageBasedLighting = new ImageBasedLighting();
    expect(imageBasedLighting.enabled).toBe(true);

    imageBasedLighting.imageBasedLightingFactor = Cartesian2.ZERO;
    expect(imageBasedLighting.enabled).toBe(false);

    imageBasedLighting.imageBasedLightingFactor = new Cartesian2(0.5, 0.0);
    expect(imageBasedLighting.enabled).toBe(true);
  });

  it("useSphericalHarmonicCoefficients returns correct values", function () {
    const imageBasedLighting = new ImageBasedLighting();
    expect(imageBasedLighting.useSphericalHarmonicCoefficients).toBe(false);

    imageBasedLighting.sphericalHarmonicCoefficients = testCoefficients;
    expect(imageBasedLighting.useSphericalHarmonicCoefficients).toBe(true);

    imageBasedLighting.sphericalHarmonicCoefficients = undefined;
    expect(imageBasedLighting.useSphericalHarmonicCoefficients).toBe(false);
  });
});
