import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartographic } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { EllipsoidGeodesic } from "../../Source/Cesium.js";
import { EllipsoidRhumbLine } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";

describe("Core/EllipsoidRhumbLine", function () {
  var oneDegree = CesiumMath.RADIANS_PER_DEGREE;
  var fifteenDegrees = Math.PI / 12;
  var thirtyDegrees = Math.PI / 6;
  var fortyfiveDegrees = Math.PI / 4;

  it("throws without start", function () {
    expect(function () {
      var rhumb = new EllipsoidRhumbLine();
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without end", function () {
    expect(function () {
      var rhumb = new EllipsoidRhumbLine(new Cartographic(Math.PI, Math.PI));
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("throws without unique position", function () {
    expect(function () {
      var rhumb = new EllipsoidRhumbLine(
        new Cartographic(Math.PI, Math.PI),
        new Cartographic(0, Math.PI)
      );
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without start", function () {
    expect(function () {
      var rhumb = new EllipsoidRhumbLine();
      rhumb.setEndPoints();
    }).toThrowDeveloperError();
  });

  it("setEndPoints throws without end", function () {
    expect(function () {
      var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
      var rhumb = new EllipsoidRhumbLine();
      rhumb.setEndPoints(start);
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("can create using fromStartHeadingDistance function", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var start = new Cartographic(fifteenDegrees, fifteenDegrees);
    var heading = fifteenDegrees;
    var distance = fifteenDegrees * ellipsoid.maximumRadius;

    var rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
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
    var ellipsoid = Ellipsoid.WGS84;
    var scratch = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);

    var start = new Cartographic(fifteenDegrees, fifteenDegrees);
    var heading = fifteenDegrees;
    var distance = fifteenDegrees * ellipsoid.maximumRadius;

    var rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
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
      var rhumb = new EllipsoidRhumbLine();
      return rhumb.surfaceDistance;
    }).toThrowDeveloperError();
  });

  it("getHeading throws if start or end never defined", function () {
    expect(function () {
      var rhumb = new EllipsoidRhumbLine();
      return rhumb.heading;
    }).toThrowDeveloperError();
  });

  it("works with two points", function () {
    var start = new Cartographic(fifteenDegrees, fifteenDegrees);
    var end = new Cartographic(thirtyDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);
    expect(start).toEqual(rhumb.start);
    expect(end).toEqual(rhumb.end);
  });

  it("sets end points", function () {
    var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    var end = new Cartographic(CesiumMath.PI_OVER_TWO, CesiumMath.PI_OVER_TWO);
    var rhumb = new EllipsoidRhumbLine();
    rhumb.setEndPoints(start, end);
    expect(start).toEqual(rhumb.start);
    expect(end).toEqual(rhumb.end);
  });

  it("gets heading", function () {
    var ellipsoid = new Ellipsoid(6, 6, 3);
    var start = new Cartographic(CesiumMath.PI_OVER_TWO, 0);
    var end = new Cartographic(Math.PI, 0);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );
  });

  it("computes heading not going over the pole", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var start = new Cartographic(0, 1.2);
    var end = new Cartographic(Math.PI, 1.5);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(0.0).not.toEqual(rhumb.heading);
  });

  it("computes heading going over the pole", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var start = new Cartographic(1.3, CesiumMath.PI_OVER_TWO);
    var end = new Cartographic(0.0, CesiumMath.PI / 2.4);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(0.0).not.toEqual(rhumb.heading);
  });

  it("heading works when going around the world at constant latitude", function () {
    var ellipsoid = new Ellipsoid(6, 6, 6);
    var start = new Cartographic(0.0, 0.3);
    var end = new Cartographic(CesiumMath.PI_OVER_TWO, 0.3);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);

    expect(CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb.heading,
      CesiumMath.EPSILON12
    );

    start = new Cartographic(3 * CesiumMath.PI_OVER_TWO, 0.3);
    end = new Cartographic(CesiumMath.PI, 0.3);
    var rhumb2 = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(-CesiumMath.PI_OVER_TWO).toEqualEpsilon(
      rhumb2.heading,
      CesiumMath.EPSILON12
    );
  });

  it("computes heading for vertical lines", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var start = new Cartographic(0.0, 1.2);
    var end = new Cartographic(0.0, 1.5);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(0.0).toEqualEpsilon(rhumb.heading, CesiumMath.EPSILON12);

    var rhumb2 = new EllipsoidRhumbLine(end, start, ellipsoid);
    expect(CesiumMath.PI).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
  });

  it("computes distance at equator", function () {
    var ellipsoid = new Ellipsoid(6, 6, 3);
    var start = new Cartographic(-CesiumMath.PI_OVER_FOUR, 0.0);
    var end = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(CesiumMath.PI_OVER_TWO * 6).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("computes distance at meridian", function () {
    var ellipsoid = new Ellipsoid(6, 6, 6);
    var start = new Cartographic(CesiumMath.PI_OVER_TWO, fifteenDegrees);
    var end = new Cartographic(CesiumMath.PI_OVER_TWO, fortyfiveDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    expect(thirtyDegrees * 6).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("computes equal distance on sphere for 90 degrees arcs along meridian and equator", function () {
    var ellipsoid = new Ellipsoid(6, 6, 6);
    var fortyFiveSouth = new Cartographic(0.0, -CesiumMath.PI_OVER_FOUR);
    var fortyFiveNorth = new Cartographic(0.0, CesiumMath.PI_OVER_FOUR);
    var fortyFiveWest = new Cartographic(-CesiumMath.PI_OVER_FOUR, 0.0);
    var fortyFiveEast = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    var westEastRhumb = new EllipsoidRhumbLine(
      fortyFiveWest,
      fortyFiveEast,
      ellipsoid
    );
    var southNorthRhumb = new EllipsoidRhumbLine(
      fortyFiveSouth,
      fortyFiveNorth,
      ellipsoid
    );
    var eastWestRhumb = new EllipsoidRhumbLine(
      fortyFiveEast,
      fortyFiveWest,
      ellipsoid
    );
    var northSouthRhumb = new EllipsoidRhumbLine(
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
    var ellipsoid = new Ellipsoid(6, 6, 6);
    var start = new Cartographic(0, -fortyfiveDegrees);
    var end = new Cartographic(CesiumMath.PI_OVER_TWO, -fortyfiveDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end, ellipsoid);
    var distance = Math.cos(fortyfiveDegrees) * CesiumMath.PI_OVER_TWO * 6;
    expect(distance).toEqualEpsilon(
      rhumb.surfaceDistance,
      CesiumMath.EPSILON12
    );
  });

  it("throws when interpolating rhumb line of zero length", function () {
    var radius = 6378137.0;
    var ellipsoid = new Ellipsoid(radius, radius, radius);
    var initial = new Cartographic(fifteenDegrees, fifteenDegrees);

    expect(function () {
      var rhumb = EllipsoidRhumbLine.fromStartHeadingDistance(
        initial,
        fifteenDegrees,
        0.0,
        ellipsoid
      );
      return rhumb.interpolateUsingSurfaceDistance(0);
    }).toThrowDeveloperError();
  });

  it("computes heading and distance given endpoints on sphere ", function () {
    var radius = 6378137.0;
    var ellipsoid = new Ellipsoid(radius, radius, radius);
    var initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    var distance = radius * fifteenDegrees;

    var rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      fifteenDegrees,
      distance,
      ellipsoid
    );
    var rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(fifteenDegrees).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(distance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("computes heading and distance given endpoints on sphereoid", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    var distance = ellipsoid.maximumRadius * fifteenDegrees;

    var rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      fifteenDegrees,
      distance,
      ellipsoid
    );
    var rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(fifteenDegrees).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(distance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("tests sphere close to 90 degrees", function () {
    var radius = 6378137.0;
    var ellipsoid = new Ellipsoid(radius, radius, radius);
    var initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    var distance = radius * fifteenDegrees;

    var eightyNineDegrees = 89 * oneDegree;
    var eightyNinePointNineDegrees = 89.9 * oneDegree;
    var ninetyDegrees = 90 * oneDegree;
    var ninetyPointOneDegrees = 90.1 * oneDegree;
    var ninetyPointZeroTwoDegrees = 90.02 * oneDegree;

    var rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNineDegrees,
      distance,
      ellipsoid
    );
    var rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(fifteenDegrees, fifteenDegrees);
    var distance = ellipsoid.maximumRadius * fifteenDegrees;

    var eightyNineDegrees = 89 * oneDegree;
    var eightyNinePointNineDegrees = 89.9 * oneDegree;
    var ninetyDegrees = 90 * oneDegree;
    var ninetyPointOneDegrees = 90.1 * oneDegree;
    var ninetyPointZeroTwoDegrees = 90.02 * oneDegree;

    var rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyNineDegrees,
      distance,
      ellipsoid
    );
    var rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);
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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(-fifteenDegrees, 0.0);
    var final = new Cartographic(fifteenDegrees, 0.0);
    var distance = ellipsoid.maximumRadius * 2 * fifteenDegrees;

    var rhumb1 = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var rhumb2 = EllipsoidRhumbLine.fromStartHeadingDistance(
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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(-CesiumMath.PI + fifteenDegrees, 0.0);
    var final = new Cartographic(CesiumMath.PI - fifteenDegrees, 0.0);

    var distance = ellipsoid.maximumRadius * 2 * fifteenDegrees;

    var rhumb1 = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var rhumb2 = new EllipsoidRhumbLine.fromStartHeadingDistance(
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

    var rhumb3 = new EllipsoidRhumbLine(final, initial, ellipsoid);
    var rhumb4 = new EllipsoidRhumbLine.fromStartHeadingDistance(
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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(fifteenDegrees, -oneDegree);
    var final = new Cartographic(fifteenDegrees, oneDegree);

    //A rhumb line with heading = 0 should be almost the same as a geodesic
    var rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var geodesic = new EllipsoidGeodesic(initial, final, ellipsoid);
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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(0.0, 0.0);
    var final = new Cartographic(CesiumMath.PI - 1, 0.0);

    //A rhumb line on the equator should be the same as a geodesic
    var rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var geodesic = new EllipsoidGeodesic(initial, final, ellipsoid);
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
    var ellipsoid = Ellipsoid.WGS84;
    var fiveDegrees = CesiumMath.PI / 36.0;
    var eightyDegrees = 16 * fiveDegrees;

    var distance = fifteenDegrees * ellipsoid.maximumRadius;

    var initial = new Cartographic(0.0, eightyDegrees);

    var rhumb1 = EllipsoidRhumbLine.fromStartHeadingDistance(
      initial,
      eightyDegrees,
      distance,
      ellipsoid
    );
    var rhumb2 = new EllipsoidRhumbLine(initial, rhumb1.end, ellipsoid);

    expect(rhumb1.heading).toEqualEpsilon(rhumb2.heading, CesiumMath.EPSILON12);
    expect(rhumb1.surfaceDistance).toEqualEpsilon(
      rhumb2.surfaceDistance,
      CesiumMath.EPSILON6
    );
  });

  it("test interpolate fraction", function () {
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(0.0, 0.0);
    var final = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0);
    var halfway = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    var rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var interpolatedPoint = rhumb.interpolateUsingFraction(0.5);

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
    var ellipsoid = Ellipsoid.WGS84;
    var initial = new Cartographic(0.0, 0.0);
    var final = new Cartographic(CesiumMath.PI_OVER_TWO, 0.0);
    var halfway = new Cartographic(CesiumMath.PI_OVER_FOUR, 0.0);

    var distance = ellipsoid.maximumRadius * CesiumMath.PI_OVER_FOUR;

    var rhumb = new EllipsoidRhumbLine(initial, final, ellipsoid);
    var interpolatedPoint = rhumb.interpolateUsingSurfaceDistance(distance);

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
    var start = new Cartographic(fifteenDegrees, fifteenDegrees);
    var end = new Cartographic(thirtyDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);
    var distance = rhumb.surfaceDistance;

    var first = rhumb.interpolateUsingSurfaceDistance(0.0);
    var last = rhumb.interpolateUsingSurfaceDistance(distance);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON12
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON12);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON12);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON12);
  });

  it("interpolates midpoint", function () {
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);
    var expectedMid = new Cartographic(thirtyDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);
    var distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    var midpoint = rhumb.interpolateUsingSurfaceDistance(distance);

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
    var start = new Cartographic(fifteenDegrees, fifteenDegrees);
    var end = new Cartographic(thirtyDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var first = rhumb.interpolateUsingFraction(0);
    var last = rhumb.interpolateUsingFraction(1);

    expect(start.longitude).toEqualEpsilon(
      first.longitude,
      CesiumMath.EPSILON12
    );
    expect(start.latitude).toEqualEpsilon(first.latitude, CesiumMath.EPSILON12);
    expect(end.longitude).toEqualEpsilon(last.longitude, CesiumMath.EPSILON12);
    expect(end.latitude).toEqualEpsilon(last.latitude, CesiumMath.EPSILON12);
  });

  it("interpolates midpoint using fraction", function () {
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);
    var expectedMid = new Cartographic(thirtyDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpoint = rhumb.interpolateUsingFraction(0.5);

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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);
    var expectedMid = new Cartographic(thirtyDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);
    var result = new Cartographic();
    var midpoint = rhumb.interpolateUsingFraction(0.5, result);
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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);
    var expectedMid = new Cartographic(thirtyDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);
    var distance = Ellipsoid.WGS84.radii.x * fifteenDegrees;

    var result = new Cartographic();
    var midpoint = rhumb.interpolateUsingSurfaceDistance(distance, result);

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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      midpointUsingInterpolation.longitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    var pointUsingInterpolation = rhumb.interpolateUsingFraction(0.1);
    var pointUsingIntersection = rhumb.findIntersectionWithLongitude(
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
    var start = Cartographic.fromDegrees(170, 10);
    var end = Cartographic.fromDegrees(-170, 23);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var idlIntersection1 = rhumb.findIntersectionWithLongitude(-Math.PI);
    var idlIntersection2 = rhumb.findIntersectionWithLongitude(Math.PI);

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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fifteenDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      midpointUsingInterpolation.longitude
    );

    expect(midpointUsingIntersection).not.toBeDefined();
  });

  it("intersection with longitude handles N-S lines with different longitude", function () {
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fifteenDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingIntersection = rhumb.findIntersectionWithLongitude(
      thirtyDegrees
    );

    expect(midpointUsingIntersection.latitude).toEqualEpsilon(
      CesiumMath.PI_OVER_TWO,
      CesiumMath.EPSILON12
    );
  });

  it("finds midpoint and other points using intersection with latitude", function () {
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
      midpointUsingInterpolation.latitude
    );
    expect(
      Cartographic.equalsEpsilon(
        midpointUsingInterpolation,
        midpointUsingIntersection,
        CesiumMath.EPSILON12
      )
    ).toBe(true);

    var pointUsingInterpolation = rhumb.interpolateUsingFraction(0.1);
    var pointUsingIntersection = rhumb.findIntersectionWithLatitude(
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
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fortyfiveDegrees, 0.0);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
      midpointUsingInterpolation.latitude
    );

    expect(midpointUsingIntersection).not.toBeDefined();
  });

  it("intersection with latitude handles N-S lines", function () {
    var start = new Cartographic(fifteenDegrees, 0.0);
    var end = new Cartographic(fifteenDegrees, thirtyDegrees);

    var rhumb = new EllipsoidRhumbLine(start, end);

    var midpointUsingInterpolation = rhumb.interpolateUsingFraction(0.5);
    var midpointUsingIntersection = rhumb.findIntersectionWithLatitude(
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
    var p0 = new Cartesian3(
      899411.2767873341,
      -5079219.747324299,
      3738850.924729517
    );
    var p1 = new Cartesian3(
      899411.0994891181,
      -5079219.778719673,
      3738850.9247295167
    );

    var ellipsoid = Ellipsoid.WGS84;
    var c0 = ellipsoid.cartesianToCartographic(p0, new Cartographic());
    var c1 = ellipsoid.cartesianToCartographic(p1, new Cartographic());
    var rhumb = new EllipsoidRhumbLine(c0, c1, ellipsoid);

    var c = rhumb.interpolateUsingSurfaceDistance(0.0, new Cartographic());
    var p = ellipsoid.cartographicToCartesian(c, new Cartesian3());

    expect(p).toEqualEpsilon(p0, CesiumMath.EPSILON7);
  });
});
