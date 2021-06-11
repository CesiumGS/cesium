import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Intersect } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Plane } from "../../Source/Cesium.js";
import { S2Cell } from "../../Source/Cesium.js";
import { TileBoundingS2Cell } from "../../Source/Cesium.js";
import createFrameState from "../createFrameState.js";

describe("Scene/TileBoundingS2Cell", function () {
  var s2Cell = S2Cell.fromToken("1");
  var s2Options = {
    token: "1",
    minimumHeight: 0,
    maximumHeight: 100000,
  };

  var tileS2Cell = new TileBoundingS2Cell(s2Options);

  var frameState;
  var camera;

  beforeEach(function () {
    frameState = createFrameState();
    camera = frameState.camera;
  });

  it("throws when options.token is undefined", function () {
    expect(function () {
      return new TileBoundingS2Cell();
    }).toThrowDeveloperError();
  });

  it("can be instantiated with S2 cell", function () {
    var tS2Cell = new TileBoundingS2Cell({
      token: "1",
    });
    expect(tS2Cell).toBeDefined();
    expect(tS2Cell.boundingVolume).toBeDefined();
    expect(tS2Cell.boundingSphere).toBeDefined();
    expect(tS2Cell.s2Cell).toBeDefined();
    expect(tS2Cell.center).toBeDefined();
    expect(tS2Cell.minimumHeight).toBeDefined();
    expect(tS2Cell.maximumHeight).toBeDefined();
  });

  it("can be instantiated with S2 cell and heights", function () {
    var tS2Cell = new TileBoundingS2Cell(s2Options);
    expect(tS2Cell).toBeDefined();
    expect(tS2Cell.boundingVolume).toBeDefined();
    expect(tS2Cell.boundingSphere).toBeDefined();
    expect(tS2Cell.s2Cell).toBeDefined();
    expect(tS2Cell.center).toBeDefined();
    expect(tS2Cell.minimumHeight).toBeDefined();
    expect(tS2Cell.maximumHeight).toBeDefined();
  });

  it("distanceToCamera throws when frameState is undefined", function () {
    expect(function () {
      return tileS2Cell.distanceToCamera();
    }).toThrowDeveloperError();
  });

  it("distance to camera is 0 when camera is inside bounding volume", function () {
    camera.position = s2Cell.getCenter();
    expect(tileS2Cell.distanceToCamera(frameState)).toEqual(0.0);
  });

  var edgeOneScratch = new Cartesian3();
  var edgeTwoScratch = new Cartesian3();
  var faceCenterScratch = new Cartesian3();
  var topPlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0, 0.0);
  var sidePlane0Scratch = new Plane(Cartesian3.UNIT_X, 0.0, 0.0);
  // Testing for Case I
  it("distanceToCamera works when camera is facing only one plane", function () {
    var testDistance = 100;

    // Test against the top plane.
    var topPlane = Plane.clone(tileS2Cell._boundingPlanes[0], topPlaneScratch);
    topPlane.distance -= testDistance;
    camera.position = Plane.projectPointOntoPlane(topPlane, tileS2Cell.center);
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      testDistance,
      CesiumMath.EPSILON7
    );

    // Test against the first side plane.
    var sidePlane0 = Plane.clone(
      tileS2Cell._boundingPlanes[2],
      sidePlane0Scratch
    );
    var edgeOne = Cartesian3.midpoint(
      tileS2Cell._vertices[0],
      tileS2Cell._vertices[1],
      edgeOneScratch
    );

    var edgeTwo = Cartesian3.midpoint(
      tileS2Cell._vertices[4],
      tileS2Cell._vertices[5],
      edgeTwoScratch
    );

    var faceCenter = Cartesian3.midpoint(edgeOne, edgeTwo, faceCenterScratch);

    sidePlane0.distance -= testDistance;
    camera.position = Plane.projectPointOntoPlane(sidePlane0, faceCenter);
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      testDistance,
      CesiumMath.EPSILON7
    );
  });

  var edgeMidpointScratch = new Cartesian3();
  // Testing for Case II
  it("distanceToCamera works when camera is facing two planes", function () {
    var testDistance = 5;

    // Test with the top plane and the first side plane.
    camera.position = Cartesian3.midpoint(
      tileS2Cell._vertices[0],
      tileS2Cell._vertices[1],
      edgeMidpointScratch
    );
    camera.position.z -= testDistance;
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      testDistance,
      CesiumMath.EPSILON7
    );

    // Test with first and second side planes.
    camera.position = Cartesian3.midpoint(
      tileS2Cell._vertices[0],
      tileS2Cell._vertices[4],
      edgeMidpointScratch
    );
    camera.position.x -= 1;
    camera.position.z -= 1;
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      Math.SQRT2,
      CesiumMath.EPSILON7
    );

    // Test with bottom plane and second side plane. Handles the obtuse dihedral angle case.
    camera.position = Cartesian3.midpoint(
      tileS2Cell._vertices[5],
      tileS2Cell._vertices[6],
      edgeMidpointScratch
    );
    camera.position.x -= 10000;
    camera.position.y -= 1;
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      10000,
      CesiumMath.EPSILON7
    );
  });

  var vertex2Scratch = new Cartesian3();
  // Testing for Case III
  it("distanceToCamera works when camera is facing three planes", function () {
    camera.position = Cartesian3.clone(tileS2Cell._vertices[2], vertex2Scratch);
    camera.position.x += 1;
    camera.position.y += 1;
    camera.position.z += 1;
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      Math.sqrt(3),
      CesiumMath.EPSILON7
    );
  });

  // Testing for Case IV
  it("distanceToCamera works when camera is facing more than three planes", function () {
    camera.position = new Cartesian3(-Ellipsoid.WGS84.maximumRadius, 0, 0);
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      Ellipsoid.WGS84.maximumRadius + tileS2Cell._boundingPlanes[1].distance,
      CesiumMath.EPSILON7
    );
  });

  it("can create a debug volume", function () {
    var debugVolume = tileS2Cell.createDebugVolume(Color.BLUE);
    expect(debugVolume).toBeDefined();
  });

  it("createDebugVolume throws when color is undefined", function () {
    expect(function () {
      return tileS2Cell.createDebugVolume();
    }).toThrowDeveloperError();
  });

  it("intersectPlane throws when plane is undefined", function () {
    expect(function () {
      return tileS2Cell.intersectPlane();
    }).toThrowDeveloperError();
  });

  it("intersects plane", function () {
    expect(tileS2Cell.intersectPlane(Plane.ORIGIN_ZX_PLANE)).toEqual(
      Intersect.INTERSECTING
    );

    var outsidePlane = Plane.clone(Plane.ORIGIN_YZ_PLANE);
    outsidePlane.distance -= 2 * Ellipsoid.WGS84.maximumRadius;
    expect(tileS2Cell.intersectPlane(outsidePlane)).toEqual(Intersect.OUTSIDE);

    expect(tileS2Cell.intersectPlane(Plane.ORIGIN_YZ_PLANE)).toEqual(
      Intersect.INSIDE
    );
  });
});
