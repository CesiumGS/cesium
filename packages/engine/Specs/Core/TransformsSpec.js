import {
  FixedFrameTransforms,
  JulianDate,
  Matrix3,
  TimeInterval,
} from "@cesium/core";
import {
  CelestialFrameTransforms,
  EarthOrientationParameters,
  Iau2006XysData,
  Transforms,
} from "../../index.js";

describe("Core/Transforms", function () {
  const deprecatedCelestialMembers = [
    "computeIcrfToCentralBodyFixedMatrix",
    "computeTemeToPseudoFixedMatrix",
    "preloadIcrfFixed",
    "computeIcrfToFixedMatrix",
    "computeMoonFixedToIcrfMatrix",
    "computeIcrfToMoonFixedMatrix",
    "computeFixedToIcrfMatrix",
    "earthOrientationParameters",
    "iau2006XysData",
  ];

  const originalValues = {};

  beforeEach(function () {
    for (const name of deprecatedCelestialMembers) {
      originalValues[name] = CelestialFrameTransforms[name];
    }
    spyOn(console, "warn");
  });

  afterEach(function () {
    for (const name of deprecatedCelestialMembers) {
      CelestialFrameTransforms[name] = originalValues[name];
    }
  });

  it("re-exports FixedFrameTransforms functions", function () {
    expect(Transforms.eastNorthUpToFixedFrame).toBe(
      FixedFrameTransforms.eastNorthUpToFixedFrame,
    );
    expect(Transforms.headingPitchRollToFixedFrame).toBe(
      FixedFrameTransforms.headingPitchRollToFixedFrame,
    );
  });

  it("gets deprecated celestial members from CelestialFrameTransforms", function () {
    for (const name of deprecatedCelestialMembers) {
      expect(Transforms[name]).toBe(CelestialFrameTransforms[name]);
    }
  });

  it("sets deprecated celestial members on CelestialFrameTransforms", function () {
    for (const name of deprecatedCelestialMembers) {
      const value = {};
      Transforms[name] = value;
      expect(CelestialFrameTransforms[name]).toBe(value);
      expect(Transforms[name]).toBe(value);
    }
  });

  it("gets values assigned to CelestialFrameTransforms after loading", function () {
    const eop = new EarthOrientationParameters();
    CelestialFrameTransforms.earthOrientationParameters = eop;
    expect(Transforms.earthOrientationParameters).toBe(eop);
  });

  it("uses earthOrientationParameters set on Transforms in computeIcrfToFixedMatrix", async function () {
    // 2011-07-03 00:00:00 UTC
    const time = new JulianDate(2455745, 43200);
    CelestialFrameTransforms.iau2006XysData = new Iau2006XysData();
    await CelestialFrameTransforms.preloadIcrfFixed(
      new TimeInterval({ start: time, stop: time }),
    );

    Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;
    const withoutEop = Transforms.computeIcrfToFixedMatrix(time);

    Transforms.earthOrientationParameters =
      await EarthOrientationParameters.fromUrl(
        "Data/EarthOrientationParameters/EOP-2011-July.json",
      );
    const withEop = Transforms.computeIcrfToFixedMatrix(time);

    expect(withoutEop).toBeDefined();
    expect(withEop).toBeDefined();
    expect(Matrix3.equals(withoutEop, withEop)).toBe(false);
  });

  it("uses computeIcrfToCentralBodyFixedMatrix set on Transforms", function () {
    const time = new JulianDate(2455745, 43200);
    Transforms.computeIcrfToCentralBodyFixedMatrix =
      Transforms.computeIcrfToMoonFixedMatrix;

    expect(
      CelestialFrameTransforms.computeIcrfToCentralBodyFixedMatrix(time),
    ).toEqual(CelestialFrameTransforms.computeIcrfToMoonFixedMatrix(time));
  });
});
