import {
  Cartesian3,
  Cartographic,
  Ellipsoid,
  EllipsoidGeodesic,
  EllipsoidRhumbLine,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

describe("Core/EllipsoidRhumbLine", function () {
  const oneDegree = CesiumMath.RADIANS_PER_DEGREE;
  const fifteenDegrees = Math.PI / 12;
  const thirtyDegrees = Math.PI / 6;
  const fortyfiveDegrees = Math.PI / 4;

  it("throws without start", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine();
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without end", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine(new Cartographic(Math.PI, Math.PI));
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without unique position", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine(
        new Cartographic(Math.PI, Math.PI),
        new Cartographic(0, Math.PI)
      );
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without start", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine();
      rhumb.setEndPoints();
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without end", function () {
    expect(function () {
      const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
      const rhumb = new EllipsoidRhumbLine();
      rhumb.setEndPoints(start);
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("can create using fromStartHeadingDistance function", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const heading = fifteenDegrees;
    const distance = fifteenDegrees * ellipsoid.maximumRadius;

    const rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
      start,
      heading,
      distance,
      ellipsoid
    );
    expect(start).toEqual(rhumb.start);
    expect(distance).toEqualEpsilon(rhumb.surfaceDistance, CesiumMath.EPSILON6);
    expect(heading).toEqualEpsilon(rhumb.heading, CesiumMath.EPSILON12);
  });

  it("can create using fromStartHeadingDistance function with result", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const scratch = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);

    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const heading = fifteenDegrees;
    const distance = fifteenDegrees * ellipsoid.maximumRadius;

    const rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
      start,
      heading,
      distance,
      ellipsoid,
      scratch
    );
    expect(rhumb).toBe(scratch);
    expect(rhumb.ellipsoid).toBe(ellipsoid);
    expect(start).toEqual(rhumb.start);
    expect(distance).toEqualEpsilon(rhumb.surfaceDistance, CesiumMath.EPSILON6);
    expect(heading).toEqualEpsilon(rhumb.heading, CesiumMath.EPSILON12);
  });

  it("getSurfaceDistance throws if start or end never defined", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine();
      return rhumb.surfaceDistance;
    }).toThrowDeveloperError();
  });

  it("getHeading throws if start or end never defined", function () {
    expect(function () {
      const rhumb = new EllipsoidRhumbLine();
      return rhumb.heading;
    }).toThrowDeveloperError();
  });

  it("works with two points", function () {
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);
    expect(start).toEqual(rhumb.start);
    expect(end).toEqual(rhumb.end);
  });

  it("sets end points", function () {
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_TWO
    );
    const rhumb = new EllipsoidRhumbLine();
    rhumb.setEndPoints(start, end);
    expect(start).toEqual(rhumb.start);
    expect(end).toEqual(rhumb.end);
  });

  it("gets heading", function () {
    const ellipsoid = new Ellipsoid(6, 6, 3);
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    const end = new Cartographic(Math.PI, 0);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );
  });

  it("computes heading not going over the pole", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const start = new Cartographic(0, 1.2);
    const end = new Cartographic(Math.PI, 1.5);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(0.0).not.toEqual(rhumb.heading);
  });

  it("computes heading going over the pole", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const start = new Cartographic(1.3, CesiumMath.PI_OVER_TWO);
    const end = new Cartographic(0.0, CesiumMath.PI / 2.4);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(0.0).not.toEqual(rhumb.heading);
  });

  it("heading works when going around the world at constant latitude", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    let start = new Cartographic(0.0, 0.3);
    let end = new Cartographic(CesiumMath.PI_OVER_TWO, 0.3);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );

    start = new Cartographic(3 * CesiumMath.PI_OVER_TWO, 0.3);
    end = new Cartographic(CesiumMath.PI, 0.3);
    const rhumb2 = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(-CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb2.heading,
      CesiumMath.EPSILON12
    );
  });

  it("computes heading for vertical lines", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const start = new Cartographic(0.0, 1.2);
    const end = new Cartographic(0.0, 1.5);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(0.0).toEqualEpsilon(rhumb.heading, CesiumMath.EPSILON12);

    const rhumb2 = new EllipsoidRhumbLine(end, start, ellipsoid);
    expect(CesiumMath.PI).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
  });

  it("computes distance at equator", function () {
    const ellipsoid = new Ellipsoid(6, 6, 3);
    const start = new Cartographic(-CesiumMath.PI_OVER_FOUR, 0.0);
    const end = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("computes distance at meridian", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    const start = new Cartographic(CesiumMath.PI_OVER_TWO, fifteenDegrees);
    const end = new Cartographic(CesiumMath.PI_OVER_TWO, fortyfiveDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(thirtyDegrees * 6).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("computes equal distance on sphere for 90 degrees arcs along meridian and equator", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    const fortyFiveSouth = new Cartographic(0.0, -CesiumMath.PI_OVER_FOUR);
    const fortyFiveNorth = new Cartographic(0.0, CesiumMath.PI_OVER_FOUR);
    const fortyFiveWest = new Cartographic(-CesiumMath.PI_OVER_FOUR, 0.0);
    const fortyFiveEast = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    const westEastRhumb = new EllipsoidRhumbLine(
      fortyFiveWest,
      fortyFiveEast,
      ellipsoid
    );
    const southNorthRhumb = new EllipsoidRhumbLine(
      fortyFiveSouth,
      fortyFiveNorth,
      ellipsoid
    );
    const eastWestRhumb = new EllipsoidRhumbLine(
      fortyFiveEast,
      fortyFiveWest,
      ellipsoid
    );
    const northSouthRhumb = new EllipsoidRhumbLine(
      fortyFiveNorth,
      fortyFiveSouth,
      ellipsoid
    );
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      westEastRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      southNorthRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
    expect(westEastRhumb.surfaceDistance).toEqualEpsilon(
      southNorthRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );

    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      eastWestRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      northSouthRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
    expect(eastWestRhumb.surfaceDistance).toEqualEpsilon(
      northSouthRhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("computes distance at same latitude", function () {
    const ellipsoid = new Ellipsoid(6, 6, 6);
    const start = new Cartographic(0, -fortyfiveDegrees);
    const end = new Cartographic(CesiumMath.PI_OVER_TWO, -fortyfiveDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    const distance = Math.cos(fortyfiveDegrees) * CesiumMath.PI_OVER_TWO * 6;
    expect(distance).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("throws when interpolating rhumb line of zero length", function () {
    const radius = 6378137.0;
    const ellipsoid = new Ellipsoid(radius, radius, radius);
    const initial = new Cartographic(fifteenDegrees, fifteenDegrees);

    expect(function () {
      const rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
        initial,
        fifteenDegrees,
        0.0,
        ellipsoid
      );
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("computes heading and distance given endpoints on sphere ", function () {
    const radius = 6378137.0;
    const ellipsoid = new Ellipsoid(radius, radius, radius);
    const initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    const distance = radius * fifteenDegrees;

    const rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      fifteenDegrees,
      distance,
      ellipsoid
    );
    const rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(fifteenDegrees).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(distance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("computes heading and distance given endpoints on sphereoid", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    const distance = ellipsoid.maximumRadius * fifteenDegrees;

    const rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      fifteenDegrees,
      distance,
      ellipsoid
    );
    const rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(fifteenDegrees).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(distance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("tests sphere close to 90 degrees", function () {
    const radius = 6378137.0;
    const ellipsoid = new Ellipsoid(radius, radius, radius);
    const initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    const distance = radius * fifteenDegrees;

    const eightyNineDegrees = 89 * oneDegree;
    const eightyNinePointNineDegrees = 89.9 * oneDegree;
    const ninetyDegrees = 90 * oneDegree;
    const ninetyPointOneDegrees = 90.1 * oneDegree;
    const ninetyPointZeroTwoDegrees = 90.02 * oneDegree;

    let rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNineDegrees,
      distance,
      ellipsoid
    );
    let rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNinePointNineDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyPointOneDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyPointZeroTwoDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("tests spheroid close to 90 degrees", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    const distance = ellipsoid.maximumRadius * fifteenDegrees;

    const eightyNineDegrees = 89 * oneDegree;
    const eightyNinePointNineDegrees = 89.9 * oneDegree;
    const ninetyDegrees = 90 * oneDegree;
    const ninetyPointOneDegrees = 90.1 * oneDegree;
    const ninetyPointZeroTwoDegrees = 90.02 * oneDegree;

    let rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNineDegrees,
      distance,
      ellipsoid
    );
    let rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNinePointNineDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyPointOneDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      ninetyPointZeroTwoDegrees,
      distance,
      ellipsoid
    );
    rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test sphereoid across meridian", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(-fifteenDegrees, 0.0);
    const final = new Cartographic(fifteenDegrees, 0.0);
    const distance = ellipsoid.maximumRadius * 2 * fifteenDegrees;

    const rhumb1 = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const rhumb2 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      CesiumMath.PI_OVER_TWO,
      distance,
      ellipsoid
    );

    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test across IDL with -PI to PI range of longitude", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(-CesiumMath.PI + fifteenDegrees, 0.0);
    const final = new Cartographic(CesiumMath.PI - fifteenDegrees, 0.0);

    const distance = ellipsoid.maximumRadius * 2 * fifteenDegrees;

    const rhumb1 = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const rhumb2 = new EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      3.0 * CesiumMath.PI_OVER_TWO,
      distance,
      ellipsoid
    );

    expect(-CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb1.heading,
      CesiumMath.EPSILON12
    );
    expect(distance).toEqualEpsilon(
      rhumb1.surfaceDistance,
      CesiumMath.EPSILON6
    );
    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );

    const rhumb3 = new EllipsoidRhumbLine(final, initial, ellipsoid);
    const rhumb4 = new EllipsoidRhumbLine.fromStartHeadingDistance(
      final,
      CesiumMath.PI_OVER_TWO,
      distance,
      ellipsoid
    );
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb3.heading,
      CesiumMath.EPSILON12
    );
    expect(distance).toEqualEpsilon(
      rhumb3.surfaceDistance,
      CesiumMath.EPSILON6
    );
    expect(rhumb3.heading).toEqualEpsilon(rhumb4.heading, CesiumMath.EPSILON12);
    expect(rhumb3.surfaceDistance).toEqualEpsilon(
      rhumb4.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test across equator", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(fifteenDegrees, -oneDegree);
    const final = new Cartographic(fifteenDegrees, oneDegree);

    //A rhumb line with heading = 0 should be almost the same as a geodesic
    const rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const geodesic = new EllipsoidGeodesic(initial, final, ellipsoid);
    expect(0.0).toEqualEpsilon(rhumb.heading, CesiumMath.EPSILON12);
    expect(geodesic.startHeading).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );
    expect(geodesic.surfaceDistance).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test on equator", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(0.0, 0.0);
    const final = new Cartographic(CesiumMath.PI - 1, 0.0);

    //A rhumb line on the equator should be the same as a geodesic
    const rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const geodesic = new EllipsoidGeodesic(initial, final, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );
    expect(geodesic.startHeading).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );
    expect(geodesic.surfaceDistance).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON4
    ); // Due to computational difference, slightly larger tolerance
  });

  it("test close to poles", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const fiveDegrees = CesiumMath.PI / 36.0;
    const eightyDegrees = 16 * fiveDegrees;

    const distance = fifteenDegrees * ellipsoid.maximumRadius;

    const initial = new Cartographic(0.0, eightyDegrees);

    const rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyDegrees,
      distance,
      ellipsoid
    );
    const rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test interpolate fraction", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(0.0, 0.0);
    const final = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0);
    const halfway = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    const rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const interpolatedPoint = rhumb.interpolateUsingFraction(0.5);

    expect(halfway.longitude).toEqualEpsilon(
      interpolatedPoint.longitude,
      CesiumMath.EPSILON12
    );
    expect(halfway.latitude).toEqualEpsilon(
      interpolatedPoint.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("test interpolate distance", function () {
    const ellipsoid = Ellipsoid.WGS84;
    const initial = new Cartographic(0.0, 0.0);
    const final = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0);
    const halfway = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    const distance = ellipsoid.maximumRadius * CesiumMath.PI_OVER_FOUR;

    const rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    const interpolatedPoint = rhumb.interpolateUsingSurfaceDistance(distance);

    expect(halfway.longitude).toEqualEpsilon(
      interpolatedPoint.longitude,
      CesiumMath.EPSILON12
    );
    expect(halfway.latitude).toEqualEpsilon(
      interpolatedPoint.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates start and end points", function () {
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);
    const distance = rhumb.surfaceDistance;

    const first = rhumb.interpolateUsingSurfaceDistance(0.0);
    const last = rhumb.interpolateUsingSurfaceDistance(distance);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON12
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON12);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON12);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON12);
  });

  it("interpolates midpoint", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);
    const expectedMid = new Cartographic(thirtyDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);
    const distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    const midpoint = rhumb.interpolateUsingSurfaceDistance(distance);

    expect(expectedMid.longitude).toEqualEpsilon(
      midpoint.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      midpoint.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates start and end points using fraction", function () {
    const start = new Cartographic(fifteenDegrees, fifteenDegrees);
    const end = new Cartographic(thirtyDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const first = rhumb.interpolateUsingFraction(0);
    const last = rhumb.interpolateUsingFraction(1);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON12
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON12);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON12);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON12);
  });

  it("interpolates midpoint using fraction", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);
    const expectedMid = new Cartographic(thirtyDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpoint = rhumb.interpolateUsingFraction(0.5);

    expect(expectedMid.longitude).toEqualEpsilon(
      midpoint.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      midpoint.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates midpoint fraction using result parameter", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);
    const expectedMid = new Cartographic(thirtyDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);
    const result = new Cartographic();
    const midpoint = rhumb.interpolateUsingFraction(0.5, result);
    expect(result).toBe(midpoint);

    expect(expectedMid.longitude).toEqualEpsilon(
      result.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      result.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("interpolates midpoint using result parameter", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);
    const expectedMid = new Cartographic(thirtyDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);
    const distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    const result = new Cartographic();
    const midpoint = rhumb.interpolateUsingSurfaceDistance(distance, result);

    expect(result).toBe(midpoint);

    expect(expectedMid.longitude).toEqualEpsilon(
      result.longitude,
      CesiumMath.EPSILON12
    );
    expect(expectedMid.latitude).toEqualEpsilon(
      result.latitude,
      CesiumMath.EPSILON12
    );
  });

  it("finds midpoint and other points using intersection with longitude", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      midpointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    let pointUsingInterpolation = rhumb.interpolateUsingFraction(0.1);
    let pointUsingIntersection = rhumb.findIntersectionWithLongitude(
      pointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    pointUsingInterpolation = rhumb.interpolateUsingFraction(0.75);
    pointUsingIntersection = rhumb.findIntersectionWithLongitude(
      pointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    pointUsingInterpolation = rhumb.interpolateUsingFraction(1.1);
    pointUsingIntersection = rhumb.findIntersectionWithLongitude(
      pointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
  });

  it("finds correct intersection with IDL", function () {
    const start = Cartographic.fromDegrees(170, 10);
    const end = Cartographic.fromDegrees(-170, 23);

    const rhumb = new EllipsoidRhumbLine(start, end);

    let idlIntersection1 = rhumb.findIntersectionWithLongitude(-Math.PI);
    let idlIntersection2 = rhumb.findIntersectionWithLongitude(Math.PI);

    expect(
      Cartographic.equalsEpsilon(
        idlIntersection1,
        idlIntersection2,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
    expect(idlIntersection1.longitude).toEqualEpsilon(
      Math.PI,
      CesiumMath.EPSILON14
    );
    expect(idlIntersection2.longitude).toEqualEpsilon(
      Math.PI,
      CesiumMath.EPSILON14
    );

    rhumb.setEndPoints(end, start);

    idlIntersection1 = rhumb.findIntersectionWithLongitude(-Math.PI);
    idlIntersection2 = rhumb.findIntersectionWithLongitude(Math.PI);

    expect(
      Cartographic.equalsEpsilon(
        idlIntersection1,
        idlIntersection2,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
    expect(idlIntersection1.longitude).toEqualEpsilon(
      -Math.PI,
      CesiumMath.EPSILON14
    );
    expect(idlIntersection2.longitude).toEqualEpsilon(
      -Math.PI,
      CesiumMath.EPSILON14
    );
  });

  it("intersection with longitude handles E-W lines", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      midpointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
  });

  it("intersection with longitude handles N-S lines", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fifteenDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      midpointUsingInterpolation.longitude
    );

    expect(midpointUsingIntersection).not.toBeDefined();
  });

  it("intersection with longitude handles N-S lines with different longitude", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fifteenDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      thirtyDegrees
    );

    expect(midpointUsingIntersection.latitude).toEqualEpsilon(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.EPSILON12
    );
  });

  it("finds midpoint and other points using intersection with latitude", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
      midpointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    let pointUsingInterpolation = rhumb.interpolateUsingFraction(0.1);
    let pointUsingIntersection = rhumb.findIntersectionWithLatitude(
      pointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    pointUsingInterpolation = rhumb.interpolateUsingFraction(0.75);
    pointUsingIntersection = rhumb.findIntersectionWithLatitude(
      pointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    pointUsingInterpolation = rhumb.interpolateUsingFraction(1.1);
    pointUsingIntersection = rhumb.findIntersectionWithLatitude(
      pointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        pointUsingInterpolation,
        pointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
  });

  it("intersection with latitude handles E-W lines", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fortyfiveDegrees, 0.0);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
      midpointUsingInterpolation.latitude
    );

    expect(midpointUsingIntersection).not.toBeDefined();
  });

  it("intersection with latitude handles N-S lines", function () {
    const start = new Cartographic(fifteenDegrees, 0.0);
    const end = new Cartographic(fifteenDegrees, thirtyDegrees);

    const rhumb = new EllipsoidRhumbLine(start, end);

    const midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    const midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
      midpointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);
  });

  it("returns the start point when interpolating at surface distance 0.0", function () {
    const p0 = new Cartesian3(
      899411.2767873341,
      -5079219.747324299,
      3738850.924729517
    );
    const p1 = new Cartesian3(
      899411.0994891181,
      -5079219.778719673,
      3738850.9247295167
    );

    const ellipsoid = Ellipsoid.WGS84;
    const c0 = ellipsoid.cartesianToCartographic(p0, new Cartographic());
    const c1 = ellipsoid.cartesianToCartographic(p1, new Cartographic());
    const rhumb = new EllipsoidRhumbLine(c0, c1, ellipsoid);

    const c = rhumb.interpolateUsingSurfaceDistance(0.0, new Cartographic());
    const p = ellipsoid.cartographicToCartesian(c, new Cartesian3());

    expect(p).toEqualEpsilon(p0, CesiumMath.EPSILON7);
  });
});
