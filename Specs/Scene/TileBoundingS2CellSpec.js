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

  it("distance to camera for top and bottom planes", function () {
    var testDistance = 1;
    var plane = Plane.clone(tileS2Cell._boundingPlanes[0]);
    plane.distance -= testDistance;
    camera.position = Plane.projectPointOntoPlane(plane, tileS2Cell.center);
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      testDistance,
      CesiumMath.EPSILON6
    );

    plane = Plane.clone(tileS2Cell._boundingPlanes[1]);
    plane.distance -= testDistance;
    camera.position = Plane.projectPointOntoPlane(plane, tileS2Cell.center);
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      testDistance,
      CesiumMath.EPSILON6
    );
  });

  var edgeOneScratch = new Cartesian3();
  var edgeTwoScratch = new Cartesian3();
  var planeCenterScratch = new Cartesian3();
  it("distance to camera for side planes", function () {
    var testDistance = 100000;
    for (var i = 0; i < 4; i++) {
      var plane = Plane.clone(tileS2Cell._boundingPlanes[2 + i]);

      var edgeOne = Cartesian3.midpoint(
        tileS2Cell._vertices[i % 4],
        tileS2Cell._vertices[4 + i],
        edgeOneScratch
      );

      var edgeTwo = Cartesian3.midpoint(
        tileS2Cell._vertices[4 + ((i + 1) % 4)],
        tileS2Cell._vertices[(i + 1) % 4],
        edgeTwoScratch
      );

      var planeCenter = Cartesian3.midpoint(
        edgeOne,
        edgeTwo,
        planeCenterScratch
      );

      plane.distance -= testDistance;
      camera.position = Plane.projectPointOntoPlane(plane, planeCenter);
      expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
        testDistance,
        CesiumMath.EPSILON6
      );
    }
  });

  it("distanceToCamera", function () {
    // On top "edge"
    camera.position = Plane.projectPointOntoPlane(
      tileS2Cell._boundingPlanes[0],
      new Cartesian3(0, 0, Ellipsoid.WGS84.maximumRadius * 2)
    );
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      Ellipsoid.WGS84.maximumRadius * 2 - tileS2Cell._vertices[2].z,
      CesiumMath.EPSILON6
    );

    // On top left vertex
    camera.position = tileS2Cell._vertices[1];
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      0,
      CesiumMath.EPSILON6
    );

    // On top right vertex
    camera.position = tileS2Cell._vertices[2];
    expect(tileS2Cell.distanceToCamera(frameState)).toEqualEpsilon(
      0,
      CesiumMath.EPSILON6
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

  it("can create a debug volume", function () {
    var debugVolume = tileS2Cell.createDebugVolume(Color.BLUE);
    expect(debugVolume).toBeDefined();
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
