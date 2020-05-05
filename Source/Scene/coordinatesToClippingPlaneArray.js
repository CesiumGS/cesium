import defaultValue from "../Core/defaultValue.js";
import Matrix4 from "../Core/Matrix4.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import PolygonPipeline from "../Core/PolygonPipeline.js";
import WindingOrder from "../Core/WindingOrder.js";
import earcut from "../ThirdParty/earcut-2.2.1.js";
import Plane from "../Core/Plane.js";
import ClippingPlane from "../Scene/ClippingPlane.js";
import simplify from "../ThirdParty/Simplify.js";

function simplifyData(polygons, holes, tolerance) {
  var i, j;
  for (i = 0; i < polygons.length; ++i) {
    polygons[i] = simplify(polygons[i], tolerance, false);
  }

  if (holes.length === 0) {
    return;
  }

  for (i = 0; i < holes.length; ++i) {
    var hole = holes[i];
    for (j = 0; j < hole.length; ++j) {
      hole[j] = simplify(hole[j], tolerance, false);
    }
  }
}

/**
 * Converts an array of earth-centered, earth-fixed (ECEF) coordinates into
 * a collection of clipping planes that can be used for selectively
 * rendering geometry. Supports multiple clipping polygons and holes.
 * Concave clipping polygons are also supported.
 *
 * @param {Object} options Object with the following properties:
 * @param {Array.<Array.<Cartesian3>>} options.polygons An array of
 * coordinates in ECEF that form a clipping plane(s).
 * @param {Array.<Array.<Array.<Cartesian3>>>} options.holes A 3D array of
 * coordinates in ECEF that represent holes in the clipping planes. holes[i] should correspond to
 * polygons[i]. holes[i][...] may not overlap or self-intersect
 * @param {Matrix4} [options.toLocal-Matrix4.IDENTITY] Transformation matrix to convert each point
 * @param {Number} [options.tolerance] Simplification tolerance for combining adjacent lines.
 * @param {Boolean} [options.union-false] If the clipping plane should be
 * selected for union mode or not.
 */

function coordinatesToClippingPlaneArray(options) {
  var polygons = options.polygons;
  var union = defaultValue(options.union, false);
  var holes = defaultValue(options.holes, []);
  var toLocal = defaultValue(options.toLocal, Matrix4.IDENTITY);
  var tolerance = defaultValue(options.tolerance, 0);

  if (tolerance > 0) {
    simplifyData(polygons, holes, tolerance);
  }

  var groups = createGroupsFromPolygons(polygons, toLocal, holes);
  var groupsLength = groups.length;

  // Create center points for each clipping plane
  var clippingPlanes = [];
  for (var g = 0; g < groupsLength; ++g) {
    var points = groups[g];
    var pointsLength = points.length;
    for (var i = 0; i < pointsLength; ++i) {
      var nextIndex = (i + 1) % pointsLength;
      var up = Cartesian3.UNIT_Z;
      var right = Cartesian3.subtract(
        points[nextIndex],
        points[i],
        new Cartesian3()
      );
      right = Cartesian3.normalize(right, right);

      var normal = Cartesian3.cross(right, up, new Cartesian3());
      normal = Cartesian3.normalize(normal, normal);

      if (union) {
        Cartesian3.negate(normal, normal);
      }

      // Compute distance by pretending the plane is at the origin
      var originCenteredPlane = new Plane(normal, 0.0);
      var distance = -Plane.getPointDistance(originCenteredPlane, points[i]);

      clippingPlanes.push(new ClippingPlane(normal, distance, g));
    }
  }

  return clippingPlanes;
}

function createGroupsFromPolygons(polygons, toLocal, holes) {
  var groups = [];
  for (var i = 0; i < polygons.length; ++i) {
    var holesForCurrentPolygon = defaultValue(holes[i], []);
    var groupsFromPolygon = combinePolygonIntoGroups(
      polygons[i],
      toLocal,
      holesForCurrentPolygon
    );
    for (var j = 0; j < groupsFromPolygon.length; ++j) {
      groups.push(groupsFromPolygon[j]);
    }
  }
  return groups;
}

// 2D array of holes, where
function combinePolygonIntoGroups(polygon, toLocal, holesForCurrentPolygon) {
  var positions = polygon.map(function (position) {
    return Cartesian3.clone(position);
  });

  var i, j, hole;
  var holeCopies = [];
  for (i = 0; i < holesForCurrentPolygon.length; ++i) {
    hole = holesForCurrentPolygon[i];
    var arr = [];
    for (j = 0; j < hole.length; ++j) {
      arr.push(Cartesian3.clone(hole[j]));
    }
    holeCopies.push(arr);
  }

  var positionsLength = positions.length;
  for (i = 0; i < positionsLength; ++i) {
    var position = positions[i];
    Matrix4.multiplyByPoint(toLocal, position, position);
    position.z = 0.0;
  }

  for (i = 0; i < holeCopies.length; ++i) {
    hole = holeCopies[i];
    for (j = 0; j < hole.length; ++j) {
      var h = hole[j];
      Matrix4.multiplyByPoint(toLocal, h, h);
      h.z = 0.0;
    }
  }

  var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions);
  if (originalWindingOrder === WindingOrder.CLOCKWISE) {
    positions.reverse();
  }

  for (i = 0; i < holeCopies.length; ++i) {
    hole = holeCopies[i];
    var holeWindingOrder = PolygonPipeline.computeWindingOrder2D(hole);
    if (holeWindingOrder === WindingOrder.CLOCKWISE) {
      hole.reverse();
    }
  }

  var flattenedPositions = Cartesian2.packArray(positions);

  // amalgamate each hole to the polygons clipping coordinates for `earcut`
  var holeIndices = [];

  for (i = 0; i < holeCopies.length; ++i) {
    hole = holeCopies[i];
    var flattenedHole = Cartesian2.packArray(hole);
    holeIndices.push(positions.length);
    flattenedPositions = flattenedPositions.concat(flattenedHole);
    positions = positions.concat(hole);
  }

  var finalHoleIndices = holeIndices.length === 0 ? undefined : holeIndices;
  var indexes = earcut(flattenedPositions, finalHoleIndices, 2);
  var trianglesLength = indexes.length / 3;
  var groups = [];

  for (i = 0; i < trianglesLength; ++i) {
    var a = positions[indexes[i * 3]];
    var b = positions[indexes[i * 3 + 1]];
    var c = positions[indexes[i * 3 + 2]];
    groups.push([a, b, c]);
  }

  return groups;
}

export default coordinatesToClippingPlaneArray;
