import { Cartesian3 } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PolylinePipeline } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";

describe("Core/PolylinePipeline", function () {
  it("wrapLongitude", function () {
    var positions = Cartesian3.fromDegreesArray([
      -75.163789,
      39.952335,
      -80.2264393,
      25.7889689,
    ]);
    var segments = PolylinePipeline.wrapLongitude(positions);
    expect(segments.lengths.length).toEqual(1);
    expect(segments.lengths[0]).toEqual(2);
  });

  it("wrapLongitude works with empty array", function () {
    var segments = PolylinePipeline.wrapLongitude([]);
    expect(segments.lengths.length).toEqual(0);
  });

  it("wrapLongitude breaks polyline into segments", function () {
    var positions = Cartesian3.fromDegreesArray([-179.0, 39.0, 2.0, 25.0]);
    var segments = PolylinePipeline.wrapLongitude(positions);
    expect(segments.lengths.length).toEqual(2);
    expect(segments.lengths[0]).toEqual(2);
    expect(segments.lengths[1]).toEqual(2);
  });

  it("wrapLongitude breaks polyline into segments with model matrix", function () {
    var center = Cartesian3.fromDegrees(-179.0, 39.0);
    var matrix = Transforms.eastNorthUpToFixedFrame(center, Ellipsoid.WGS84);

    var positions = [
      new Cartesian3(0.0, 0.0, 0.0),
      new Cartesian3(0.0, 100000000.0, 0.0),
    ];
    var segments = PolylinePipeline.wrapLongitude(positions, matrix);
    expect(segments.lengths.length).toEqual(2);
    expect(segments.lengths[0]).toEqual(2);
    expect(segments.lengths[1]).toEqual(2);
  });

  it("generateArc throws without positions", function () {
    expect(function () {
      PolylinePipeline.generateArc();
    }).toThrowDeveloperError();
  });

  it("generateArc accepts a height array for single value", function () {
    var positions = [Cartesian3.fromDegrees(0, 0)];
    var height = [30];

    var newPositions = PolylinePipeline.generateArc({
      positions: positions,
      height: height,
    });

    expect(newPositions.length).toEqual(3);
    expect(Cartesian3.fromArray(newPositions, 0)).toEqualEpsilon(
      Cartesian3.fromDegrees(0, 0, 30),
      CesiumMath.EPSILON6
    );
  });

  it("generateArc subdivides in half", function () {
    var p1 = Cartesian3.fromDegrees(0, 0);
    var p2 = Cartesian3.fromDegrees(90, 0);
    var p3 = Cartesian3.fromDegrees(45, 0);
    var positions = [p1, p2];

    var newPositions = PolylinePipeline.generateArc({
      positions: positions,
      granularity: CesiumMath.PI_OVER_TWO / 2,
      ellipsoid: Ellipsoid.WGS84,
    });

    expect(newPositions.length).toEqual(3 * 3);
    var p1n = Cartesian3.fromArray(newPositions, 0);
    var p3n = Cartesian3.fromArray(newPositions, 3);
    var p2n = Cartesian3.fromArray(newPositions, 6);
    expect(Cartesian3.equalsEpsilon(p1, p1n, CesiumMath.EPSILON4)).toEqual(
      true
    );
    expect(Cartesian3.equalsEpsilon(p2, p2n, CesiumMath.EPSILON4)).toEqual(
      true
    );
    expect(Cartesian3.equalsEpsilon(p3, p3n, CesiumMath.EPSILON4)).toEqual(
      true
    );
  });

  it("generateArc works with empty array", function () {
    var newPositions = PolylinePipeline.generateArc({
      positions: [],
    });

    expect(newPositions.length).toEqual(0);
  });

  it("generateArc works one position", function () {
    var newPositions = PolylinePipeline.generateArc({
      positions: [Cartesian3.UNIT_Z],
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });

    expect(newPositions.length).toEqual(3);
    expect(newPositions).toEqual([0, 0, 1]);
  });

  it("generateRhumbArc throws without positions", function () {
    expect(function () {
      PolylinePipeline.generateRhumbArc();
    }).toThrowDeveloperError();
  });

  it("generateRhumbArc accepts a height array for single value", function () {
    var positions = [Cartesian3.fromDegrees(0, 0)];
    var height = [30];

    var newPositions = PolylinePipeline.generateRhumbArc({
      positions: positions,
      height: height,
    });

    expect(newPositions.length).toEqual(3);
    expect(Cartesian3.fromArray(newPositions, 0)).toEqualEpsilon(
      Cartesian3.fromDegrees(0, 0, 30),
      CesiumMath.EPSILON6
    );
  });

  it("generateRhumbArc subdivides in half", function () {
    var p1 = Cartesian3.fromDegrees(0, 30);
    var p2 = Cartesian3.fromDegrees(90, 30);
    var p3 = Cartesian3.fromDegrees(45, 30);
    var positions = [p1, p2];

    var newPositions = PolylinePipeline.generateRhumbArc({
      positions: positions,
      granularity: CesiumMath.PI_OVER_FOUR,
      ellipsoid: Ellipsoid.WGS84,
    });

    expect(newPositions.length).toEqual(3 * 3);
    var p1n = Cartesian3.fromArray(newPositions, 0);
    var p3n = Cartesian3.fromArray(newPositions, 3);
    var p2n = Cartesian3.fromArray(newPositions, 6);
    expect(Cartesian3.equalsEpsilon(p1, p1n, CesiumMath.EPSILON4)).toEqual(
      true
    );
    expect(Cartesian3.equalsEpsilon(p2, p2n, CesiumMath.EPSILON4)).toEqual(
      true
    );
    expect(Cartesian3.equalsEpsilon(p3, p3n, CesiumMath.EPSILON4)).toEqual(
      true
    );
  });

  it("generateRhumbArc works with empty array", function () {
    var newPositions = PolylinePipeline.generateRhumbArc({
      positions: [],
    });

    expect(newPositions.length).toEqual(0);
  });

  it("generateRhumbArc works one position", function () {
    var newPositions = PolylinePipeline.generateRhumbArc({
      positions: [Cartesian3.UNIT_Z],
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });

    expect(newPositions.length).toEqual(3);
    expect(newPositions).toEqual([0, 0, 1]);
  });

  it("generateRhumbArc return values for each position", function () {
    var newPositions = PolylinePipeline.generateRhumbArc({
      positions: Cartesian3.fromDegreesArray([0, 0, 10, 0, 10, 5]),
    });
    for (var i = 0; i < newPositions.length; i++) {
      expect(newPositions[i]).toBeDefined();
    }
  });
});
