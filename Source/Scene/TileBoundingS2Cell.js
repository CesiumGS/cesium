import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import CesiumMath from "../Core/Math.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidGeodesic from "../Core/EllipsoidGeodesic.js";
import Intersect from "../Core/Intersect.js";
import Matrix3 from "../Core/Matrix3.js";
import Plane from "../Core/Plane.js";
import CoplanarPolygonOutlineGeometry from "../Core/CoplanarPolygonOutlineGeometry.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defaultValue from "../Core/defaultValue.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Matrix4 from "../Core/Matrix4.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import S2Cell from "../Core/S2Cell.js";

var scratchCartographic;

/**
 * A tile bounding volume specified as an S2 cell token with minimum and maximum heights.
 * @alias TileBoundingS2Cell
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.token The token of the S2 cell.
 * @param {Number} [options.minimumHeight=0.0] The minimum height of the bounding volume.
 * @param {Number} [options.maximumHeight=0.0] The maximum height of the bounding volume.
 * @param {Ellipsoid} [options.ellipsoid=Cesium.Ellipsoid.WGS84] The ellipsoid.
 * @param {Boolean} [options.computeBoundingVolumes=true] True to compute the {@link TileBoundingS2Cell#boundingVolume} and
 *                  {@link TileBoundingS2Cell#boundingSphere}. If false, these properties will be undefined.
 *
 * @private
 */
function TileBoundingS2Cell(options) {
  this.s2Cell = S2Cell.fromToken(options.token);
  this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
  this.maximumHeight = defaultValue(options.maximumHeight, 0.0);

  var boundingPlanes = computeBoundingPlanes(
    this.s2Cell,
    this.minimumHeight,
    this.maximumHeight
  );

  this.center = this.s2Cell.getCenter();

  this._topPlane = boundingPlanes[0];
  this._bottomPlane = boundingPlanes[1];
  this._sidePlanes = boundingPlanes[2];

  this._vertices = computeVertices(
    boundingPlanes[0],
    boundingPlanes[1],
    boundingPlanes[2]
  );

  var points = [];

  // Add center of cell.
  points[0] = this.s2Cell.getCenter();
  scratchCartographic = Cartographic.fromCartesian(points[0]);
  scratchCartographic.height = this.maximumHeight;
  points[0] = Cartographic.toCartesian(scratchCartographic);
  scratchCartographic.height = this.minimumHeight;
  points[1] = Cartographic.toCartesian(scratchCartographic);
  for (var i = 0; i <= 3; i++) {
    scratchCartographic = Cartographic.fromCartesian(this.s2Cell.getVertex(i));
    scratchCartographic.height = this.maximumHeight;
    points[2 + i] = Cartographic.toCartesian(scratchCartographic);
    scratchCartographic.height = this.minimumHeight;
    points[2 + i + 1] = Cartographic.toCartesian(scratchCartographic);
  }
  this._orientedBoundingBox = OrientedBoundingBox.fromPoints(points);
  this._boundingSphere = BoundingSphere.fromOrientedBoundingBox(
    this._orientedBoundingBox
  );
}

function computeBoundingPlanes(s2Cell, minimumHeight, maximumHeight) {
  // Get cell center.
  var centerPoint = s2Cell.getCenter();

  // Compute top plane.
  // - Get geodetic surface normal.
  // - Get center point at maximum height of bounding volume. (top point)
  // - Create top plane from surface normal and top point.
  var centerPointSurfaceNormal = Ellipsoid.WGS84.geodeticSurfaceNormal(
    centerPoint
  );
  var topPointCartographic = Cartographic.fromCartesian(
    centerPointSurfaceNormal
  );
  topPointCartographic.height = maximumHeight;
  var topPoint = Cartographic.toCartesian(topPointCartographic);
  var topPlane = Plane.fromPointNormal(
    topPoint,
    Cartesian3.negate(centerPointSurfaceNormal, centerPointSurfaceNormal)
  );

  // Compute bottom plane.
  // - Iterate through bottom vertices
  //   - Get distance from vertex to top plane
  // - Find longest distance from vertex to top plane
  // - Translate top plane by the distance
  var maxDistance = 0;
  var vertexScratch;
  var vertexCartographicScratch;
  var distanceScratch;
  var i;
  for (i = 0; i < 4; i++) {
    vertexScratch = s2Cell.getVertex(i);
    vertexCartographicScratch = Cartographic.fromCartesian(vertexScratch);
    vertexCartographicScratch.height = minimumHeight;
    distanceScratch = Plane.getPointDistance(
      topPlane,
      Cartographic.toCartesian(vertexCartographicScratch)
    );
    if (Math.abs(distanceScratch) > maxDistance) {
      maxDistance = distanceScratch;
    }
  }
  var bottomPlane = Plane.clone(topPlane);
  bottomPlane.distance = -topPlane.distance + maxDistance;
  Cartesian3.negate(bottomPlane.normal, bottomPlane.normal);

  // Compute side planes.
  // - Iterate through vertices
  //   - Get a vertex and another vertex adjacent to it.
  //   - Compute midpoint of geodesic between two vertices.
  //   - Compute geodetic surface normal at center point.
  //   - Compute vector between vertices.
  //   - Compute normal of side plane. (cross product of top dir and side dir)
  var adjacentVertexScratch = new Cartesian3();
  var sideGeodesicScratch = new Cartesian3();
  var sideMidpointScratch = new Cartesian3();
  var topVectorScratch = new Cartesian3();
  var sideVectorScratch = new Cartesian3();
  var sideNormalScratch = new Cartesian3();
  var sidePlanes = [];
  for (i = 0; i < 4; i++) {
    vertexScratch = s2Cell.getVertex(i);
    adjacentVertexScratch = s2Cell.getVertex([i + 1] % 4);
    sideGeodesicScratch = new EllipsoidGeodesic(
      Cartographic.fromCartesian(vertexScratch),
      Cartographic.fromCartesian(adjacentVertexScratch)
    );
    sideMidpointScratch = Cartographic.toCartesian(
      sideGeodesicScratch.interpolateUsingFraction(0.5)
    );
    topVectorScratch = Ellipsoid.WGS84.geodeticSurfaceNormal(
      sideMidpointScratch
    );
    Cartesian3.normalize(
      Cartesian3.subtract(
        adjacentVertexScratch,
        vertexScratch,
        new Cartesian3()
      ),
      sideVectorScratch
    );
    Cartesian3.normalize(
      Cartesian3.cross(topVectorScratch, sideVectorScratch, new Cartesian3()),
      sideNormalScratch
    );

    sidePlanes[i] = Plane.fromPointNormal(
      sideMidpointScratch,
      sideNormalScratch
    );
  }

  return [topPlane, bottomPlane, sidePlanes];
}

var n0 = new Cartesian3();
var n1 = new Cartesian3();
var n2 = new Cartesian3();
var x0 = new Cartesian3();
var x1 = new Cartesian3();
var x2 = new Cartesian3();
var t0 = new Cartesian3();
var t1 = new Cartesian3();
var t2 = new Cartesian3();
var f0 = new Cartesian3();
var f1 = new Cartesian3();
var f2 = new Cartesian3();
var s = new Cartesian3();
function computeIntersection(p0, p1, p2) {
  n0 = p0.normal;
  n1 = p1.normal;
  n2 = p2.normal;

  Cartesian3.multiplyByScalar(p0.normal, -p0.distance, x0);

  Cartesian3.multiplyByScalar(p1.normal, -p1.distance, x1);

  Cartesian3.multiplyByScalar(p2.normal, -p2.distance, x2);

  Cartesian3.multiplyByScalar(
    Cartesian3.cross(n1, n2, t0),
    Cartesian3.dot(x0, n0),
    f0
  );

  Cartesian3.multiplyByScalar(
    Cartesian3.cross(n2, n0, t1),
    Cartesian3.dot(x1, n1),
    f1
  );

  Cartesian3.multiplyByScalar(
    Cartesian3.cross(n0, n1, t2),
    Cartesian3.dot(x2, n2),
    f2
  );

  var matrix = new Matrix3(
    n0.x,
    n0.y,
    n0.z,
    n1.x,
    n1.y,
    n1.z,
    n2.x,
    n2.y,
    n2.z
  );

  var determinant = Matrix3.determinant(matrix);
  Cartesian3.add(Cartesian3.add(f0, f1, s), f2, s);

  return new Cartesian3(
    s.x / determinant,
    s.y / determinant,
    s.z / determinant
  );
}

function computeVertices(topPlane, bottomPlane, sidePlanes) {
  var vertices = [];
  for (var i = 0; i < 8; i++) {
    vertices[i] = computeIntersection(
      i >= 4 ? bottomPlane : topPlane,
      sidePlanes[i % 4],
      sidePlanes[(i + 1) % 4]
    );
  }
  return vertices;
}

Object.defineProperties(TileBoundingS2Cell.prototype, {
  /**
   * The underlying bounding volume.
   *
   * @memberof TileOrientedBoundingBox.prototype
   *
   * @type {Object}
   * @readonly
   */
  boundingVolume: {
    get: function () {
      return this;
    },
  },
  /**
   * The underlying bounding sphere.
   *
   * @memberof TileOrientedBoundingBox.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      return this._boundingSphere;
    },
  },
});

TileBoundingS2Cell.prototype.closestToCamera = function (point) {
  var planesToTestVertices = [];
  var planesToTest = [];

  var topDistance = Plane.getPointDistance(this._topPlane, point);
  if (topDistance < 0) {
    planesToTest.push(this._topPlane);
    planesToTestVertices.push(this._vertices.slice(0, 4));
  }

  var bottomDistance = Plane.getPointDistance(this._bottomPlane, point);
  if (bottomDistance < 0) {
    planesToTest.push(this._bottomPlane);
    planesToTestVertices.push(this._vertices.slice(4));
  }

  var i;
  for (i = 0; i < 4; i++) {
    if (Plane.getPointDistance(this._sidePlanes[i], point) < 0) {
      planesToTestVertices.push([
        this._vertices[i % 4],
        this._vertices[4 + i],
        this._vertices[4 + ((i + 1) % 4)],
        this._vertices[(i + 1) % 4],
      ]);
      planesToTest.push(this._sidePlanes[i]);
    }
  }

  // Check if inside all planes.
  if (planesToTest.length === 0) {
    return 0.0;
  }

  var minDistance = Number.MAX_VALUE;
  var minPoint;
  for (i = 0; i < planesToTest.length; i++) {
    var distance = distanceSquaredToConvexPolygon3D(
      point,
      planesToTestVertices[i],
      planesToTest[i]
    );
    if (distance[0] < minDistance) {
      minDistance = distance[0];
      minPoint = distance[1];
    }
  }

  return minPoint;
};

TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  var point = frameState.camera.positionWC;
  var planesToTestVertices = [];
  var planesToTest = [];

  var topDistance = Plane.getPointDistance(this._topPlane, point);
  if (topDistance < 0) {
    planesToTest.push(this._topPlane);
    planesToTestVertices.push(this._vertices.slice(0, 4));
  }

  var bottomDistance = Plane.getPointDistance(this._bottomPlane, point);
  if (bottomDistance < 0) {
    planesToTest.push(this._bottomPlane);
    planesToTestVertices.push(this._vertices.slice(4));
  }

  var i;
  for (i = 0; i < 4; i++) {
    if (Plane.getPointDistance(this._sidePlanes[i], point) < 0) {
      planesToTestVertices.push([
        this._vertices[i % 4],
        this._vertices[4 + i],
        this._vertices[4 + ((i + 1) % 4)],
        this._vertices[(i + 1) % 4],
      ]);
      planesToTest.push(this._sidePlanes[i]);
    }
  }

  // Check if inside all planes.
  if (planesToTest.length === 0) {
    return 0.0;
  }

  var minDistance = Number.MAX_VALUE;
  for (i = 0; i < planesToTest.length; i++) {
    var distance = distanceSquaredToConvexPolygon3D(
      point,
      planesToTestVertices[i],
      planesToTest[i]
    );
    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return Math.sqrt(minDistance);
};

/*
/**
 * Calculates the distance between the tile and the camera.
 *
 * @param {FrameState} frameState The frame state.
 * @return {Number} The distance between the tile and the camera, in meters.
 *                  Returns 0.0 if the camera is inside the tile.
 
TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  var distances = [];
  // Check top plane
  distances.push(
    Math.abs(
      Cartesian3.distance(
        closestPointOnPlane(
          this._topPlane,
          this._vertices.slice(0, 4),
          frameState.camera.positionWC
        ),
        frameState.camera.positionWC
      )
    )
  );
  // Check bottom plane
  distances.push(
    Math.abs(
      Cartesian3.distance(
        closestPointOnPlane(
          this._bottomPlane,
          this._vertices.slice(4, 7),
          frameState.camera.positionWC
        ),
        frameState.camera.positionWC
      )
    )
  );
  // Check side planes.
  for (var i = 0; i < 4; i++) {
    distances.push(
      Math.abs(
        Cartesian3.distance(
          closestPointOnPlane(
            this._sidePlanes[i],
            [
              this._vertices[i % 4],
              this._vertices[4 + i],
              this._vertices[4 + ((i + 1) % 4)],
              this._vertices[(i + 1) % 4],
            ],
            frameState.camera.positionWC
          ),
          frameState.camera.positionWC
        )
      )
    );
  }

  var minDistance = Math.min(distances);
  return minDistance;
};

*/
function closestPointOnPlane(plane, vertices, point) {
  var projectedPoint = Plane.projectPointOntoPlane(plane, point);
  var vertexDistances = [];
  for (var i = 0; i < vertices.length; i++) {
    vertexDistances[i] = {
      v: vertices[i],
      d: Cartesian3.distance(projectedPoint, vertices[i]),
    };
  }
  vertexDistances.sort(function (a, b) {
    return a.d < b.d;
  });

  // Check if inside face.
  if (isInsideFace(vertices, projectedPoint)) {
    return projectedPoint;
  }

  // Create edge.
  return closestPointOnLine(
    projectedPoint,
    vertexDistances[0].v,
    vertexDistances[1].v
  );
}

function isInsideFace(vertices, point) {
  var m1, m2;
  var p1, p2;

  for (var i = 0; i < vertices.length; i++) {
    p1 = Cartesian3.subtract(point, vertices[i], new Cartesian3());
    p2 = Cartesian3.subtract(
      point,
      vertices[(i + 1) % vertices.length],
      new Cartesian3()
    );

    m1 = Cartesian3.magnitude(p1);
    m2 = Cartesian3.magnitude(p2);

    if (m1 * m2 <= CesiumMath.EPSILON8) {
      // Compute plane of polygon.
      var ba = Cartesian3.subtract(vertices[1], vertices[0], new Cartesian3());
      var ca = Cartesian3.subtract(vertices[3], vertices[0], new Cartesian3());
      var normal = Cartesian3.cross(ba, ca, new Cartesian3());
      Cartesian3.normalize(normal, normal);
      var distance =
        -normal.x * vertices[0].x -
        normal.y * vertices[0].y -
        normal.z * vertices[0].z;
      var plane = new Plane(normal, distance);
      var projectedPoint = Plane.projectPointOntoPlane(plane, point);
      return [
        Cartesian3.distanceSquared(point, projectedPoint),
        projectedPoint,
      ];
    }
  }
  return [-1];
}

function closestPointOnLine(point, lineSegment0, lineSegment1) {
  var line = Cartesian3.subtract(lineSegment0, lineSegment1, new Cartesian3());
  var t = Cartesian3.dot(
    Cartesian3.subtract(point, lineSegment0, new Cartesian3()),
    line
  );
  if (t <= 0.0) {
    t = 0.0;
    return lineSegment0;
  }
  var denominator = Cartesian3.dot(line, line);
  if (t >= denominator) {
    t = 1.0;
    return lineSegment1;
  }
  t = t / denominator;
  return Cartesian3.add(
    lineSegment0,
    Cartesian3.multiplyByScalar(line, t, new Cartesian3()),
    new Cartesian3()
  );
}

var projectedPointScratch = new Cartesian3();
var projectedPointPrimeScratch = new Cartesian3();
var projectedPolygonVertex = new Cartesian3();
var distanceScratch = new Cartesian3();
function distanceSquaredToConvexPolygon3D(p, vertices, polygonPlane) {
  // Project point on plane of polygon.
  var projectedPoint = Plane.projectPointOntoPlane(
    polygonPlane,
    p,
    projectedPointScratch
  );
  var projectedPointPrime = projectedPoint.clone(projectedPointPrimeScratch);
  var n = polygonPlane.normal;
  var d = polygonPlane.distance;

  // Determine plane to project polygon onto.
  var projectionPlane;
  var maxDim = Math.max(n.x, Math.max(n.y, n.z));
  if (maxDim === n.x) {
    projectionPlane = Plane.ORIGIN_YZ_PLANE;
    projectedPointPrime.x = 0;
  } else if (maxDim === n.y) {
    projectionPlane = Plane.ORIGIN_ZX_PLANE;
    projectedPointPrime.y = 0;
  } else {
    projectionPlane = Plane.ORIGIN_XY_PLANE;
    projectedPointPrime.z = 0;
  }

  // Project all vertices of polygon onto selected plane.
  var projectedPolygonVertices = [];
  for (var i = 0; i < vertices.length; i++) {
    projectedPolygonVertices[i] = vertices[i].clone(projectedPolygonVertex);
    if (projectionPlane === Plane.ORIGIN_YZ_PLANE) {
      projectedPolygonVertices[i].x = 0;
    } else if (projectionPlane === Plane.ORIGIN_ZX_PLANE) {
      projectedPolygonVertices[i].y = 0;
    } else {
      projectedPolygonVertices[i].z = 0;
    }
  }

  // Find closest point on polygon in 2D.
  var qPrime = distanceSquaredToConvexPolygon2D(
    projectedPointPrime,
    projectedPolygonVertices
  )[1];

  if (projectionPlane === Plane.ORIGIN_YZ_PLANE) {
    qPrime.x = (-n.y * qPrime.y - n.z * qPrime.z - d) / n.x;
  } else if (projectionPlane === Plane.ORIGIN_ZX_PLANE) {
    qPrime.x = (-n.x * qPrime.x - n.z * qPrime.z - d) / n.y;
  } else {
    qPrime.x = (-n.x * qPrime.x - n.y * qPrime.y - d) / n.z;
  }

  var distanceVector = Cartesian3.subtract(p, qPrime, distanceScratch);
  return [Cartesian3.dot(distanceVector, distanceVector), qPrime];
}

function distanceSquaredToConvexPolygon2D(p, vertices) {
  var minDistance = Number.MAX_VALUE;
  var minPoint;
  var result;

  result = isInsideFace(vertices, p);
  if (result.length > 1) {
    return result;
  }

  for (var i = 0; i < vertices.length; i++) {
    result = distanceSquaredToLineSegment(
      p,
      vertices[i],
      vertices[(i + 1) % vertices.length]
    );
    if (result[0] < minDistance) {
      minDistance = result[0];
      minPoint = result[1];
    }
  }

  return [minDistance, minPoint];
}

var dScratch = new Cartesian3();
var pPrimeScratch = new Cartesian3();
var p1Scratch = new Cartesian3();
var rScratch = new Cartesian3();
function distanceSquaredToLineSegment(p, l0, l1) {
  var d = Cartesian3.subtract(l1, l0, dScratch);
  var pPrime = Cartesian3.subtract(p, l0, pPrimeScratch);
  var t = Cartesian3.dot(d, pPrime);

  if (t <= 0) {
    return [Cartesian3.dot(pPrime, pPrime), l0];
  }

  var dPrime = Cartesian3.dot(d, d);
  if (t >= dPrime) {
    var p1 = Cartesian3.subtract(p, l1, p1Scratch);
    return [Cartesian3.dot(p1, p1), l1];
  }

  return [
    Cartesian3.dot(pPrime, pPrime) - (t * t) / dPrime,
    Cartesian3.add(l0, Cartesian3.multiplyByScalar(d, t, rScratch), rScratch),
  ];
}

/**
 * Determines which side of a plane this volume is located.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire volume is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire volume is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the volume
 *                      intersects the plane.
 */
TileBoundingS2Cell.prototype.intersectPlane = function (plane) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("plane", plane);
  //>>includeEnd('debug');

  var plusCount = 0;
  var negCount = 0;
  for (var i = 0; i < this._vertices.length; i++) {
    var distanceToPlane =
      Cartesian3.dot(plane.normal, this._vertices[i]) + plane.distance;
    if (distanceToPlane < 0) {
      negCount++;
    } else {
      plusCount++;
    }
  }

  if (plusCount === this._vertices.length) {
    return Intersect.INSIDE;
  } else if (negCount === this._vertices.length) {
    return Intersect.OUTSIDE;
  }
  return Intersect.INTERSECTING;
};

/**
 * Creates a debug primitive that shows the outline of the tile bounding
 * volume.
 *
 * @param {Color} color The desired color of the primitive's mesh
 * @return {Primitive}
 */
TileBoundingS2Cell.prototype.createDebugVolume = function (color) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("color", color);
  //>>includeEnd('debug');

  var modelMatrix = new Matrix4.clone(Matrix4.IDENTITY);
  var topPlanePolygon = new CoplanarPolygonOutlineGeometry({
    polygonHierarchy: {
      positions: this._vertices.slice(0, 4),
    },
  });
  var topPlaneGeometry = CoplanarPolygonOutlineGeometry.createGeometry(
    topPlanePolygon
  );
  var topPlaneInstance = new GeometryInstance({
    geometry: topPlaneGeometry,
    id: "topPlane",
    modelMatrix: modelMatrix,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(color),
    },
  });

  var bottomPlanePolygon = new CoplanarPolygonOutlineGeometry({
    polygonHierarchy: {
      positions: this._vertices.slice(4),
    },
  });
  var bottomPlaneGeometry = CoplanarPolygonOutlineGeometry.createGeometry(
    bottomPlanePolygon
  );
  var bottomPlaneInstance = new GeometryInstance({
    geometry: bottomPlaneGeometry,
    id: "outline",
    modelMatrix: modelMatrix,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(color),
    },
  });

  var sideInstances = [];
  for (var i = 0; i < 4; i++) {
    var sidePlanePolygon = new CoplanarPolygonOutlineGeometry({
      polygonHierarchy: {
        positions: [
          this._vertices[i % 4],
          this._vertices[4 + i],
          this._vertices[4 + ((i + 1) % 4)],
          this._vertices[(i + 1) % 4],
        ],
      },
    });
    var sidePlaneGeometry = CoplanarPolygonOutlineGeometry.createGeometry(
      sidePlanePolygon
    );
    sideInstances[i] = new GeometryInstance({
      geometry: sidePlaneGeometry,
      id: "outline",
      modelMatrix: modelMatrix,
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(color),
      },
    });
  }

  return new Primitive({
    geometryInstances: [
      sideInstances[0],
      sideInstances[1],
      sideInstances[2],
      sideInstances[3],
      bottomPlaneInstance,
      topPlaneInstance,
    ],
    appearance: new PerInstanceColorAppearance({
      translucent: false,
      flat: true,
    }),
    asynchronous: false,
  });
};
export default TileBoundingS2Cell;
