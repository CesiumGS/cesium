import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import Cartographic from "../Core/Cartographic.js";
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

var scratchCartographic = new Cartographic();

/**
 * A tile bounding volume specified as an S2 cell token with minimum and maximum heights.
 * The bounding volume is a discrete oriented polytype.
 * @alias TileBoundingS2Cell
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {String} options.token The token of the S2 cell.
 * @param {Number} [options.minimumHeight=0.0] The minimum height of the bounding volume.
 * @param {Number} [options.maximumHeight=0.0] The maximum height of the bounding volume.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid.
 * @param {Boolean} [options.computeBoundingVolumes=true] True to compute the {@link TileBoundingS2Cell#boundingVolume} and
 *                  {@link TileBoundingS2Cell#boundingSphere}. If false, these properties will be undefined.
 *
 * @private
 */
function TileBoundingS2Cell(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.string("options.token", options.token);
  //>>includeEnd('debug');

  this.s2Cell = S2Cell.fromToken(options.token);
  this.minimumHeight = defaultValue(options.minimumHeight, 0.0);
  this.maximumHeight = defaultValue(options.maximumHeight, 0.0);

  var boundingPlanes = computeBoundingPlanes(
    this.s2Cell,
    this.minimumHeight,
    this.maximumHeight
  );

  this._topPlane = boundingPlanes[0];
  this._bottomPlane = boundingPlanes[1];
  this._sidePlanes = boundingPlanes[2];

  this._vertices = computeVertices(
    boundingPlanes[0],
    boundingPlanes[1],
    boundingPlanes[2]
  );

  var points = [];

  this.center = this.s2Cell.getCenter();

  // Add center of cell.
  points[0] = this.center;
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

/**
 * Computes bounding planes of the kDOP.
 * @private
 */
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
  var topPlane = Plane.fromPointNormal(topPoint, centerPointSurfaceNormal);

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
  bottomPlane.normal = Cartesian3.negate(
    bottomPlane.normal,
    bottomPlane.normal
  );
  bottomPlane.distance -= maxDistance;
  bottomPlane.distance = -bottomPlane.distance;

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
/**
 * Computes intersection of 3 planes.
 * @private
 */
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
/**
 * Wrapper for iterating through coincident planes of the kDOP.
 * @private
 */
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

TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  var point = frameState.camera.positionWC;

  var planes = [];
  var vertices = [];
  var dir = [];

  if (Plane.getPointDistance(this._topPlane, point) > 0) {
    planes.push(this._topPlane);
    vertices.push(this._vertices.slice(0, 4));
    dir.push(-1);
  } else if (Plane.getPointDistance(this._bottomPlane, point) > 0) {
    planes.push(this._bottomPlane);
    vertices.push(this._vertices.slice(4, 8));
    dir.push(1);
  }

  var i;
  for (i = 0; i < 4; i++) {
    if (Plane.getPointDistance(this._sidePlanes[(i + 1) % 4], point) < 0) {
      planes.push(this._sidePlanes[(i + 1) % 4]);
      vertices.push([
        this._vertices[i % 4],
        this._vertices[4 + i],
        this._vertices[4 + ((i + 1) % 4)],
        this._vertices[(i + 1) % 4],
      ]);
      dir.push(1);
    }
  }

  // Check if inside all planes.
  if (planes.length === 0) {
    return 0.0;
  }

  // Test all planes.
  var minDistance = Number.MAX_VALUE;
  var distance;
  var facePoint;
  for (i = 0; i < planes.length; i++) {
    facePoint = closestPointPolygon(
      Plane.projectPointOntoPlane(planes[i], point),
      vertices[i],
      planes[i],
      dir[i]
    );
    distance = Cartesian3.distanceSquared(facePoint, point);
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  return Math.sqrt(minDistance);
};

var dScratch = new Cartesian3();
var pL0Scratch = new Cartesian3();
/**
 * Finds point on a line segment closest to a given point.
 * @private
 */
function closestPointLineSegment(p, l0, l1) {
  var d = Cartesian3.subtract(l1, l0, dScratch);
  var pL0 = Cartesian3.subtract(p, l0, pL0Scratch);
  var t = Cartesian3.dot(d, pL0);

  if (t <= 0) {
    return l0;
  }

  var dMag = Cartesian3.dot(d, d);
  if (t >= dMag) {
    return l1;
  }

  t = t / dMag;
  return new Cartesian3(
    (1 - t) * l0.x + t * l1.x,
    (1 - t) * l0.y + t * l1.y,
    (1 - t) * l0.z + t * l1.z
  );
}

var edgeNormalScratch = new Cartesian3();
/**
 * Finds closes point on the polygon, created by the given vertices, from
 * a point. The test point and the polygon are all on the same plane.
 * @private
 */
function closestPointPolygon(p, vertices, plane, dir) {
  var minDistance = Number.MAX_VALUE;
  var distance;
  var closestPoint;
  var closestPointOnEdge;

  for (var i = 0; i < vertices.length; i++) {
    var edge = Cartesian3.subtract(
      vertices[i],
      vertices[(i + 1) % 4],
      new Cartesian3()
    );

    var edgeNormal = Cartesian3.cross(plane.normal, edge, edgeNormalScratch);
    Cartesian3.normalize(edgeNormal, edgeNormal);
    var edgePlane = Plane.fromPointNormal(vertices[i], edgeNormal);
    var edgePlaneDistance = Plane.getPointDistance(edgePlane, p);

    if (dir * edgePlaneDistance > 0) {
      continue;
    }

    closestPointOnEdge = closestPointLineSegment(
      p,
      vertices[i],
      vertices[(i + 1) % 4]
    );

    distance = Cartesian3.distance(p, closestPointOnEdge);
    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = closestPointOnEdge;
    }
  }

  if (!defined(closestPoint)) {
    return p;
  }
  return closestPoint;
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
