import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import Cartographic from "../Core/Cartographic.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Intersect from "../Core/Intersect.js";
import Matrix3 from "../Core/Matrix3.js";
import Plane from "../Core/Plane.js";
import CoplanarPolygonOutlineGeometry from "../Core/CoplanarPolygonOutlineGeometry.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defaultValue from "../Core/defaultValue.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Matrix4 from "../Core/Matrix4.js";
import PerInstanceColorAppearance from "./PerInstanceColorAppearance.js";
import Primitive from "./Primitive.js";
import Color from "../Core/Color.js";
import S2Cell from "../Core/S2Cell.js";

var centerCartographicScratch = new Cartographic();
/**
 * A tile bounding volume specified as an S2 cell token with minimum and maximum heights.
 * The bounding volume is a k DOP. A k-DOP is the Boolean intersection of extents along k directions.
 *
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

  var s2Cell = S2Cell.fromToken(options.token);
  var minimumHeight = defaultValue(options.minimumHeight, 0.0);
  var maximumHeight = defaultValue(options.maximumHeight, 0.0);
  var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  this.s2Cell = s2Cell;
  this.minimumHeight = minimumHeight;
  this.maximumHeight = maximumHeight;
  this.ellipsoid = ellipsoid;

  var boundingPlanes = computeBoundingPlanes(
    s2Cell,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );
  this._boundingPlanes = boundingPlanes;

  // Pre-compute vertices to speed up the plane intersection test.
  var vertices = computeVertices(boundingPlanes);
  this._vertices = vertices;

  // Pre-compute edge normals to speed up the point-polygon distance check in distanceToCamera.
  this._edgeNormals = new Array(6);

  this._edgeNormals[0] = computeEdgeNormals(
    boundingPlanes[0],
    vertices.slice(0, 4)
  );
  var i;
  // Based on the way the edge normals are computed, the edge normals all point away from the "face"
  // of the polyhedron they surround, except the plane for the top plane. Therefore, we negate the normals
  // for the top plane.
  for (i = 0; i < 4; i++) {
    this._edgeNormals[0][i] = Cartesian3.negate(
      this._edgeNormals[0][i],
      this._edgeNormals[0][i]
    );
  }

  this._edgeNormals[1] = computeEdgeNormals(
    boundingPlanes[1],
    vertices.slice(4, 8)
  );
  for (i = 0; i < 4; i++) {
    // For each plane, iterate through the vertices in CCW order.
    this._edgeNormals[2 + i] = computeEdgeNormals(boundingPlanes[2 + i], [
      vertices[i % 4],
      vertices[(i + 1) % 4],
      vertices[4 + ((i + 1) % 4)],
      vertices[4 + i],
    ]);
  }

  this._planeVertices = [
    this._vertices.slice(0, 4),
    this._vertices.slice(4, 8),
  ];
  for (i = 0; i < 4; i++) {
    this._planeVertices.push([
      this._vertices[i % 4],
      this._vertices[(i + 1) % 4],
      this._vertices[4 + ((i + 1) % 4)],
      this._vertices[4 + i],
    ]);
  }

  var center = s2Cell.getCenter();
  centerCartographicScratch = ellipsoid.cartesianToCartographic(
    center,
    centerCartographicScratch
  );
  centerCartographicScratch.height = (maximumHeight + minimumHeight) / 2;
  this.center = ellipsoid.cartographicToCartesian(
    centerCartographicScratch,
    center
  );

  this._boundingSphere = BoundingSphere.fromPoints(vertices);

  this._debugText = "";
}

var centerGeodeticNormalScratch = new Cartesian3();
var topCartographicScratch = new Cartographic();
var topScratch = new Cartesian3();
var vertexCartographicScratch = new Cartographic();
var vertexScratch = new Cartesian3();
var vertexGeodeticNormalScratch = new Cartesian3();
var sideNormalScratch = new Cartesian3();
var sideScratch = new Cartesian3();
var topPlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0);
var bottomPlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0);
/**
 * Computes bounding planes of the kDOP.
 * @private
 */
function computeBoundingPlanes(
  s2Cell,
  minimumHeight,
  maximumHeight,
  ellipsoid
) {
  var planes = new Array(6);
  var centerPoint = s2Cell.getCenter();

  // Compute top plane.
  // - Get geodetic surface normal at the center of the S2 cell.
  // - Get center point at maximum height of bounding volume.
  // - Create top plane from surface normal and top point.
  var centerSurfaceNormal = ellipsoid.geodeticSurfaceNormal(
    centerPoint,
    centerGeodeticNormalScratch
  );
  var topCartographic = ellipsoid.cartesianToCartographic(
    centerPoint,
    topCartographicScratch
  );
  topCartographic.height = maximumHeight;
  var top = ellipsoid.cartographicToCartesian(topCartographic, topScratch);
  var topPlane = Plane.fromPointNormal(
    top,
    centerSurfaceNormal,
    topPlaneScratch
  );
  planes[0] = topPlane;

  // Compute bottom plane.
  // - Iterate through bottom vertices
  //   - Get distance from vertex to top plane
  // - Find longest distance from vertex to top plane
  // - Translate top plane by the distance
  var maxDistance = 0;
  var i;
  var vertices = [];
  var vertex, vertexCartographic;
  for (i = 0; i < 4; i++) {
    vertex = s2Cell.getVertex(i);
    vertices[i] = vertex;
    vertexCartographic = ellipsoid.cartesianToCartographic(
      vertex,
      vertexCartographicScratch
    );
    vertexCartographic.height = minimumHeight;
    var distance = Plane.getPointDistance(
      topPlane,
      ellipsoid.cartographicToCartesian(vertexCartographic, vertexScratch)
    );
    if (distance < maxDistance) {
      maxDistance = distance;
    }
  }
  var bottomPlane = Plane.clone(topPlane, bottomPlaneScratch);
  // Negate the normal of the bottom plane since we want all normals to point "outwards".
  bottomPlane.normal = Cartesian3.negate(
    bottomPlane.normal,
    bottomPlane.normal
  );
  bottomPlane.distance = bottomPlane.distance * -1 + maxDistance;
  planes[1] = bottomPlane;

  // Compute side planes.
  // - Iterate through vertices (in CCW order, by default)
  //   - Get a vertex and another vertex adjacent to it.
  //   - Compute geodetic surface normal at one vertex.
  //   - Compute vector between vertices.
  //   - Compute normal of side plane. (cross product of top dir and side dir)
  for (i = 0; i < 4; i++) {
    vertex = vertices[i];
    var adjacentVertex = vertices[(i + 1) % 4];
    var geodeticNormal = ellipsoid.geodeticSurfaceNormal(
      vertex,
      vertexGeodeticNormalScratch
    );
    var side = Cartesian3.subtract(adjacentVertex, vertex, sideScratch);
    var sideNormal = Cartesian3.cross(side, geodeticNormal, sideNormalScratch);
    sideNormal = Cartesian3.normalize(sideNormal, sideNormal);
    planes[2 + i] = Plane.fromPointNormal(vertex, sideNormal);
  }

  return planes;
}

var n0Scratch = new Cartesian3();
var n1Scratch = new Cartesian3();
var n2Scratch = new Cartesian3();
var x0Scratch = new Cartesian3();
var x1Scratch = new Cartesian3();
var x2Scratch = new Cartesian3();
var t0Scratch = new Cartesian3();
var t1Scratch = new Cartesian3();
var t2Scratch = new Cartesian3();
var f0Scratch = new Cartesian3();
var f1Scratch = new Cartesian3();
var f2Scratch = new Cartesian3();
var sScratch = new Cartesian3();
var matrixScratch = new Matrix3();
/**
 * Computes intersection of 3 planes.
 * @private
 */
function computeIntersection(p0, p1, p2) {
  n0Scratch = p0.normal;
  n1Scratch = p1.normal;
  n2Scratch = p2.normal;

  x0Scratch = Cartesian3.multiplyByScalar(p0.normal, -p0.distance, x0Scratch);
  x1Scratch = Cartesian3.multiplyByScalar(p1.normal, -p1.distance, x1Scratch);
  x2Scratch = Cartesian3.multiplyByScalar(p2.normal, -p2.distance, x2Scratch);

  f0Scratch = Cartesian3.multiplyByScalar(
    Cartesian3.cross(n1Scratch, n2Scratch, t0Scratch),
    Cartesian3.dot(x0Scratch, n0Scratch),
    f0Scratch
  );
  f1Scratch = Cartesian3.multiplyByScalar(
    Cartesian3.cross(n2Scratch, n0Scratch, t1Scratch),
    Cartesian3.dot(x1Scratch, n1Scratch),
    f1Scratch
  );
  f2Scratch = Cartesian3.multiplyByScalar(
    Cartesian3.cross(n0Scratch, n1Scratch, t2Scratch),
    Cartesian3.dot(x2Scratch, n2Scratch),
    f2Scratch
  );

  matrixScratch[0] = n0Scratch.x;
  matrixScratch[1] = n1Scratch.x;
  matrixScratch[2] = n2Scratch.x;
  matrixScratch[3] = n0Scratch.y;
  matrixScratch[4] = n1Scratch.y;
  matrixScratch[5] = n2Scratch.y;
  matrixScratch[6] = n0Scratch.z;
  matrixScratch[7] = n1Scratch.z;
  matrixScratch[8] = n2Scratch.z;
  var determinant = Matrix3.determinant(matrixScratch);
  sScratch = Cartesian3.add(f0Scratch, f1Scratch, sScratch);
  sScratch = Cartesian3.add(sScratch, f2Scratch, sScratch);
  return new Cartesian3(
    sScratch.x / determinant,
    sScratch.y / determinant,
    sScratch.z / determinant
  );
}
/**
 * Compute the vertices of the kDOP.
 * @private
 */
function computeVertices(boundingPlanes) {
  var vertices = new Array(8);
  for (var i = 0; i < 4; i++) {
    // Vertices on the top plane.
    vertices[i] = computeIntersection(
      boundingPlanes[0],
      boundingPlanes[2 + ((i + 3) % 4)],
      boundingPlanes[2 + (i % 4)]
    );
    // Vertices on the bottom plane.
    vertices[i + 4] = computeIntersection(
      boundingPlanes[1],
      boundingPlanes[2 + ((i + 3) % 4)],
      boundingPlanes[2 + (i % 4)]
    );
  }
  return vertices;
}

var edgeScratch = new Cartesian3();
var edgeNormalScratch = new Cartesian3();
/**
 * Compute edge normals on a plane.
 * @private
 */
function computeEdgeNormals(plane, vertices) {
  var edgeNormals = [];
  for (var i = 0; i < 4; i++) {
    edgeScratch = Cartesian3.subtract(
      vertices[(i + 1) % 4],
      vertices[i],
      edgeScratch
    );
    edgeNormalScratch = Cartesian3.cross(
      plane.normal,
      edgeScratch,
      edgeNormalScratch
    );
    edgeNormalScratch = Cartesian3.normalize(
      edgeNormalScratch,
      edgeNormalScratch
    );
    edgeNormals[i] = Cartesian3.clone(edgeNormalScratch);
  }
  return edgeNormals;
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

var facePointScratch = new Cartesian3();
/**
 * The distance to point check for this kDOP involves checking the signed distance of the point to each bounding
 * plane. A plane qualifies for a distance check if the point being tested against is in the half-space in the direction
 * of the normal i.e. if the signed distance of the point from the plane is greater than 0.
 *
 * There are 4 possible cases for a point if it is outside the polyhedron:
 *
 *   \     X     /     X \           /       \           /       \           /
 * ---\---------/---   ---\---------/---   ---X---------/---   ---\---------/---
 *     \       /           \       /           \       /           \       /
 *   ---\-----/---       ---\-----/---       ---\-----/---       ---\-----/---
 *       \   /               \   /               \   /               \   /
 *                                                                    \ /
 *                                                                     \
 *                                                                    / \
 *                                                                   / X \
 *
 *         I                  II                  III                 IV
 *
 * Case I: There is only one plane selected.
 * In this case, we project the point onto the plane and do a point polygon distance check to find the closest point on the polygon.
 * The point may lie inside the "face" of the polygon or outside. If it is outside, we need to determine which edges to test against.
 *
 * Case II: There are two planes selected.
 * In this case, the point will lie somewhere on the line created at the intersection of the selected planes or one of the planes.
 *
 * Case III: There are three planes selected.
 * In this case, the point will lie on the vertex, at the intersection of the selected planes.
 *
 * Case IV: There are more than three planes selected.
 * Since we are on an ellipsoid, this will only happen in the bottom plane, which is what we will use for the distance test.
 */
TileBoundingS2Cell.prototype.distanceToCamera = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("frameState", frameState);
  //>>includeEnd('debug');

  var point = frameState.camera.positionWC;

  var selectedPlaneIndices = [];
  var vertices = [];
  var edgeNormals;

  if (Plane.getPointDistance(this._boundingPlanes[0], point) > 0) {
    selectedPlaneIndices.push(0);
    vertices.push(this._planeVertices[0]);
    edgeNormals = this._edgeNormals[0];
  } else if (Plane.getPointDistance(this._boundingPlanes[1], point) > 0) {
    selectedPlaneIndices.push(1);
    vertices.push(this._planeVertices[1]);
    edgeNormals = this._edgeNormals[1];
  }

  var i;
  var sidePlaneIndex;
  for (i = 0; i < 4; i++) {
    sidePlaneIndex = 2 + i;
    if (
      Plane.getPointDistance(this._boundingPlanes[sidePlaneIndex], point) > 0
    ) {
      selectedPlaneIndices.push(sidePlaneIndex);
      // Store vertices in CCW order.
      vertices.push(this._planeVertices[sidePlaneIndex]);
      edgeNormals = this._edgeNormals[sidePlaneIndex];
    }
  }

  // Check if inside all planes.
  if (selectedPlaneIndices.length === 0) {
    return 0.0;
  }

  // We use the skip variable when the side plane indices are non-consecutive.
  var skip;
  var facePoint;
  var selectedPlane;
  if (selectedPlaneIndices.length === 1) {
    // Handles Case I
    selectedPlane = this._boundingPlanes[selectedPlaneIndices[0]];
    facePoint = closestPointPolygon(
      Plane.projectPointOntoPlane(selectedPlane, point, facePointScratch),
      vertices[0],
      selectedPlane,
      edgeNormals
    );

    if (selectedPlaneIndices[0] === 0) {
      this._debugText = "Top Plane";
    } else if (selectedPlaneIndices[0] === 1) {
      this._debugText = "Bottom Plane";
    } else {
      this._debugText = "Side Plane";
    }

    return Cartesian3.distance(facePoint, point);
  } else if (selectedPlaneIndices.length === 2) {
    // Handles Case II
    // Since we are on the ellipsoid, the dihedral angle between a top plane and a side plane
    // will always be acute, so we can do a faster check there.
    if (selectedPlaneIndices[0] === 0) {
      var edge = [
        this._vertices[
          4 * selectedPlaneIndices[0] + (selectedPlaneIndices[1] - 2)
        ],
        this._vertices[
          4 * selectedPlaneIndices[0] + ((selectedPlaneIndices[1] - 2 + 1) % 4)
        ],
      ];
      facePoint = closestPointLineSegment(point, edge[0], edge[1]);
      this._debugText = "Edge of Top Plane";
      return Cartesian3.distance(facePoint, point);
    }
    var minimumDistance = Number.MAX_VALUE;
    var distance;
    for (i = 0; i < 2; i++) {
      selectedPlane = this._boundingPlanes[selectedPlaneIndices[i]];
      facePoint = closestPointPolygon(
        Plane.projectPointOntoPlane(selectedPlane, point, facePointScratch),
        vertices[i],
        selectedPlane,
        this._edgeNormals[selectedPlaneIndices[i]]
      );

      distance = Cartesian3.distanceSquared(facePoint, point);
      if (distance < minimumDistance) {
        minimumDistance = distance;
      }
    }
    this._debugText = "Side or Bottom Plane";
    return Math.sqrt(minimumDistance);
  } else if (selectedPlaneIndices.length > 3) {
    // Handles Case IV
    facePoint = closestPointPolygon(
      Plane.projectPointOntoPlane(
        this._boundingPlanes[1],
        point,
        facePointScratch
      ),
      this._planeVertices[1],
      this._boundingPlanes[1],
      this._edgeNormals[1]
    );
    this._color = Color.RED;
    this._debugText = "Bottom Plane (Degenerate)";
    return Cartesian3.distance(facePoint, point);
  }

  // Handles Case III
  skip = selectedPlaneIndices[1] === 2 && selectedPlaneIndices[2] === 5 ? 0 : 1;
  this._color = Color.YELLOW;

  // Vertex is on top plane.
  if (selectedPlaneIndices[0] === 0) {
    this._debugText = "Vertex on Top Plane";
    return Cartesian3.distance(
      point,
      this._vertices[(selectedPlaneIndices[1] - 2 + skip) % 4]
    );
  }

  this._debugText = "Vertex on Bottom Plane";
  // Vertex is on bottom plane.
  return Cartesian3.distance(
    point,
    this._vertices[4 + ((selectedPlaneIndices[1] - 2 + skip) % 4)]
  );
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

var edgePlaneScratch = new Plane(Cartesian3.UNIT_X, 0.0);
/**
 * Finds closes point on the polygon, created by the given vertices, from
 * a point. The test point and the polygon are all on the same plane.
 * @private
 */
function closestPointPolygon(p, vertices, plane, edgeNormals) {
  var minDistance = Number.MAX_VALUE;
  var distance;
  var closestPoint;
  var closestPointOnEdge;

  for (var i = 0; i < vertices.length; i++) {
    var edgePlane = Plane.fromPointNormal(
      vertices[i],
      edgeNormals[i],
      edgePlaneScratch
    );
    var edgePlaneDistance = Plane.getPointDistance(edgePlane, p);

    // Skip checking against the edge if the point is not in the half-space that the
    // edgePlane's normal points towards i.e. if the edgePlane is facing away from the point.
    if (edgePlaneDistance < 0) {
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
      positions: this._planeVertices[0],
    },
  });
  var topPlaneGeometry = CoplanarPolygonOutlineGeometry.createGeometry(
    topPlanePolygon
  );
  var topPlaneInstance = new GeometryInstance({
    geometry: topPlaneGeometry,
    id: "outline",
    modelMatrix: modelMatrix,
    attributes: {
      color: ColorGeometryInstanceAttribute.fromColor(color),
    },
  });

  var bottomPlanePolygon = new CoplanarPolygonOutlineGeometry({
    polygonHierarchy: {
      positions: this._planeVertices[1],
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
        positions: this._planeVertices[2 + i],
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
