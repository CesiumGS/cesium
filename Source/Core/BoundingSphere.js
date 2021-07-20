import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicProjection from "./GeographicProjection.js";
import Intersect from "./Intersect.js";
import Interval from "./Interval.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import Rectangle from "./Rectangle.js";

/**
 * A bounding sphere with a center and a radius.
 * @alias BoundingSphere
 * @constructor
 *
 * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the bounding sphere.
 * @param {Number} [radius=0.0] The radius of the bounding sphere.
 *
 * @see AxisAlignedBoundingBox
 * @see BoundingRectangle
 * @see Packable
 */
function BoundingSphere(center, radius) {
  /**
   * The center point of the sphere.
   * @type {Cartesian3}
   * @default {@link Cartesian3.ZERO}
   */
  this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));

  /**
   * The radius of the sphere.
   * @type {Number}
   * @default 0.0
   */
  this.radius = defaultValue(radius, 0.0);
}

var fromPointsXMin = new Cartesian3();
var fromPointsYMin = new Cartesian3();
var fromPointsZMin = new Cartesian3();
var fromPointsXMax = new Cartesian3();
var fromPointsYMax = new Cartesian3();
var fromPointsZMax = new Cartesian3();
var fromPointsCurrentPos = new Cartesian3();
var fromPointsScratch = new Cartesian3();
var fromPointsRitterCenter = new Cartesian3();
var fromPointsMinBoxPt = new Cartesian3();
var fromPointsMaxBoxPt = new Cartesian3();
var fromPointsNaiveCenterScratch = new Cartesian3();
var volumeConstant = (4.0 / 3.0) * CesiumMath.PI;

/**
 * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
 * The bounding sphere is computed by running two algorithms, a naive algorithm and
 * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
 *
 * @param {Cartesian3[]} [positions] An array of points that the bounding sphere will enclose.  Each point must have <code>x</code>, <code>y</code>, and <code>z</code> properties.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
 *
 * @see {@link http://help.agi.com/AGIComponents/html/BlogBoundingSphere.htm|Bounding Sphere computation article}
 */
BoundingSphere.fromPoints = function (positions, result) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (!defined(positions) || positions.length === 0) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  var currentPos = Cartesian3.clone(positions[0], fromPointsCurrentPos);

  var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
  var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
  var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

  var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
  var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
  var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

  var numPositions = positions.length;
  var i;
  for (i = 1; i < numPositions; i++) {
    Cartesian3.clone(positions[i], currentPos);

    var x = currentPos.x;
    var y = currentPos.y;
    var z = currentPos.z;

    // Store points containing the the smallest and largest components
    if (x < xMin.x) {
      Cartesian3.clone(currentPos, xMin);
    }

    if (x > xMax.x) {
      Cartesian3.clone(currentPos, xMax);
    }

    if (y < yMin.y) {
      Cartesian3.clone(currentPos, yMin);
    }

    if (y > yMax.y) {
      Cartesian3.clone(currentPos, yMax);
    }

    if (z < zMin.z) {
      Cartesian3.clone(currentPos, zMin);
    }

    if (z > zMax.z) {
      Cartesian3.clone(currentPos, zMax);
    }
  }

  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
  var xSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(xMax, xMin, fromPointsScratch)
  );
  var ySpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(yMax, yMin, fromPointsScratch)
  );
  var zSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(zMax, zMin, fromPointsScratch)
  );

  // Set the diameter endpoints to the largest span.
  var diameter1 = xMin;
  var diameter2 = xMax;
  var maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }

  // Calculate the center of the initial sphere found by Ritter's algorithm
  var ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

  // Calculate the radius of the initial sphere found by Ritter's algorithm
  var radiusSquared = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  var ritterRadius = Math.sqrt(radiusSquared);

  // Find the center of the sphere found using the Naive method.
  var minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;

  var maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;

  var naiveCenter = Cartesian3.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );

  // Begin 2nd pass to find naive radius and modify the ritter sphere.
  var naiveRadius = 0;
  for (i = 0; i < numPositions; i++) {
    Cartesian3.clone(positions[i], currentPos);

    // Find the furthest point from the naive center to calculate the naive radius.
    var r = Cartesian3.magnitude(
      Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }

    // Make adjustments to the Ritter Sphere to include all points.
    var oldCenterToPointSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      // Calculate new radius to include the point that lies outside
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      // Calculate center of new Ritter sphere
      var oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x =
        (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
        oldCenterToPoint;
      ritterCenter.y =
        (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
        oldCenterToPoint;
      ritterCenter.z =
        (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
        oldCenterToPoint;
    }
  }

  if (ritterRadius < naiveRadius) {
    Cartesian3.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }

  return result;
};

var defaultProjection = new GeographicProjection();
var fromRectangle2DLowerLeft = new Cartesian3();
var fromRectangle2DUpperRight = new Cartesian3();
var fromRectangle2DSouthwest = new Cartographic();
var fromRectangle2DNortheast = new Cartographic();

/**
 * Computes a bounding sphere from a rectangle projected in 2D.
 *
 * @param {Rectangle} [rectangle] The rectangle around which to create a bounding sphere.
 * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.fromRectangle2D = function (rectangle, projection, result) {
  return BoundingSphere.fromRectangleWithHeights2D(
    rectangle,
    projection,
    0.0,
    0.0,
    result
  );
};

/**
 * Computes a bounding sphere from a rectangle projected in 2D.  The bounding sphere accounts for the
 * object's minimum and maximum heights over the rectangle.
 *
 * @param {Rectangle} [rectangle] The rectangle around which to create a bounding sphere.
 * @param {Object} [projection=GeographicProjection] The projection used to project the rectangle into 2D.
 * @param {Number} [minimumHeight=0.0] The minimum height over the rectangle.
 * @param {Number} [maximumHeight=0.0] The maximum height over the rectangle.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.fromRectangleWithHeights2D = function (
  rectangle,
  projection,
  minimumHeight,
  maximumHeight,
  result
) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (!defined(rectangle)) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  projection = defaultValue(projection, defaultProjection);

  Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
  fromRectangle2DSouthwest.height = minimumHeight;
  Rectangle.northeast(rectangle, fromRectangle2DNortheast);
  fromRectangle2DNortheast.height = maximumHeight;

  var lowerLeft = projection.project(
    fromRectangle2DSouthwest,
    fromRectangle2DLowerLeft
  );
  var upperRight = projection.project(
    fromRectangle2DNortheast,
    fromRectangle2DUpperRight
  );

  var width = upperRight.x - lowerLeft.x;
  var height = upperRight.y - lowerLeft.y;
  var elevation = upperRight.z - lowerLeft.z;

  result.radius =
    Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
  var center = result.center;
  center.x = lowerLeft.x + width * 0.5;
  center.y = lowerLeft.y + height * 0.5;
  center.z = lowerLeft.z + elevation * 0.5;
  return result;
};

var fromRectangle3DScratch = [];

/**
 * Computes a bounding sphere from a rectangle in 3D. The bounding sphere is created using a subsample of points
 * on the ellipsoid and contained in the rectangle. It may not be accurate for all rectangles on all types of ellipsoids.
 *
 * @param {Rectangle} [rectangle] The valid rectangle used to create a bounding sphere.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the rectangle.
 * @param {Number} [surfaceHeight=0.0] The height above the surface of the ellipsoid.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.fromRectangle3D = function (
  rectangle,
  ellipsoid,
  surfaceHeight,
  result
) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
  surfaceHeight = defaultValue(surfaceHeight, 0.0);

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (!defined(rectangle)) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  var positions = Rectangle.subsample(
    rectangle,
    ellipsoid,
    surfaceHeight,
    fromRectangle3DScratch
  );
  return BoundingSphere.fromPoints(positions, result);
};

/**
 * Computes a tight-fitting bounding sphere enclosing a list of 3D points, where the points are
 * stored in a flat array in X, Y, Z, order.  The bounding sphere is computed by running two
 * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
 * ensure a tight fit.
 *
 * @param {Number[]} [positions] An array of points that the bounding sphere will enclose.  Each point
 *        is formed from three elements in the array in the order X, Y, Z.
 * @param {Cartesian3} [center=Cartesian3.ZERO] The position to which the positions are relative, which need not be the
 *        origin of the coordinate system.  This is useful when the positions are to be used for
 *        relative-to-center (RTC) rendering.
 * @param {Number} [stride=3] The number of array elements per vertex.  It must be at least 3, but it may
 *        be higher.  Regardless of the value of this parameter, the X coordinate of the first position
 *        is at array index 0, the Y coordinate is at array index 1, and the Z coordinate is at array index
 *        2.  When stride is 3, the X coordinate of the next position then begins at array index 3.  If
 *        the stride is 5, however, two array elements are skipped and the next position begins at array
 *        index 5.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
 *
 * @example
 * // Compute the bounding sphere from 3 positions, each specified relative to a center.
 * // In addition to the X, Y, and Z coordinates, the points array contains two additional
 * // elements per point which are ignored for the purpose of computing the bounding sphere.
 * var center = new Cesium.Cartesian3(1.0, 2.0, 3.0);
 * var points = [1.0, 2.0, 3.0, 0.1, 0.2,
 *               4.0, 5.0, 6.0, 0.1, 0.2,
 *               7.0, 8.0, 9.0, 0.1, 0.2];
 * var sphere = Cesium.BoundingSphere.fromVertices(points, center, 5);
 *
 * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
 */
BoundingSphere.fromVertices = function (positions, center, stride, result) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (!defined(positions) || positions.length === 0) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  center = defaultValue(center, Cartesian3.ZERO);

  stride = defaultValue(stride, 3);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThanOrEquals("stride", stride, 3);
  //>>includeEnd('debug');

  var currentPos = fromPointsCurrentPos;
  currentPos.x = positions[0] + center.x;
  currentPos.y = positions[1] + center.y;
  currentPos.z = positions[2] + center.z;

  var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
  var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
  var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

  var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
  var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
  var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

  var numElements = positions.length;
  var i;
  for (i = 0; i < numElements; i += stride) {
    var x = positions[i] + center.x;
    var y = positions[i + 1] + center.y;
    var z = positions[i + 2] + center.z;

    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;

    // Store points containing the the smallest and largest components
    if (x < xMin.x) {
      Cartesian3.clone(currentPos, xMin);
    }

    if (x > xMax.x) {
      Cartesian3.clone(currentPos, xMax);
    }

    if (y < yMin.y) {
      Cartesian3.clone(currentPos, yMin);
    }

    if (y > yMax.y) {
      Cartesian3.clone(currentPos, yMax);
    }

    if (z < zMin.z) {
      Cartesian3.clone(currentPos, zMin);
    }

    if (z > zMax.z) {
      Cartesian3.clone(currentPos, zMax);
    }
  }

  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
  var xSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(xMax, xMin, fromPointsScratch)
  );
  var ySpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(yMax, yMin, fromPointsScratch)
  );
  var zSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(zMax, zMin, fromPointsScratch)
  );

  // Set the diameter endpoints to the largest span.
  var diameter1 = xMin;
  var diameter2 = xMax;
  var maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }

  // Calculate the center of the initial sphere found by Ritter's algorithm
  var ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

  // Calculate the radius of the initial sphere found by Ritter's algorithm
  var radiusSquared = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  var ritterRadius = Math.sqrt(radiusSquared);

  // Find the center of the sphere found using the Naive method.
  var minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;

  var maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;

  var naiveCenter = Cartesian3.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );

  // Begin 2nd pass to find naive radius and modify the ritter sphere.
  var naiveRadius = 0;
  for (i = 0; i < numElements; i += stride) {
    currentPos.x = positions[i] + center.x;
    currentPos.y = positions[i + 1] + center.y;
    currentPos.z = positions[i + 2] + center.z;

    // Find the furthest point from the naive center to calculate the naive radius.
    var r = Cartesian3.magnitude(
      Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }

    // Make adjustments to the Ritter Sphere to include all points.
    var oldCenterToPointSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      // Calculate new radius to include the point that lies outside
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      // Calculate center of new Ritter sphere
      var oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x =
        (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
        oldCenterToPoint;
      ritterCenter.y =
        (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
        oldCenterToPoint;
      ritterCenter.z =
        (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
        oldCenterToPoint;
    }
  }

  if (ritterRadius < naiveRadius) {
    Cartesian3.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }

  return result;
};

/**
 * Computes a tight-fitting bounding sphere enclosing a list of EncodedCartesian3s, where the points are
 * stored in parallel flat arrays in X, Y, Z, order.  The bounding sphere is computed by running two
 * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
 * ensure a tight fit.
 *
 * @param {Number[]} [positionsHigh] An array of high bits of the encoded cartesians that the bounding sphere will enclose.  Each point
 *        is formed from three elements in the array in the order X, Y, Z.
 * @param {Number[]} [positionsLow] An array of low bits of the encoded cartesians that the bounding sphere will enclose.  Each point
 *        is formed from three elements in the array in the order X, Y, Z.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
 *
 * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
 */
BoundingSphere.fromEncodedCartesianVertices = function (
  positionsHigh,
  positionsLow,
  result
) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (
    !defined(positionsHigh) ||
    !defined(positionsLow) ||
    positionsHigh.length !== positionsLow.length ||
    positionsHigh.length === 0
  ) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  var currentPos = fromPointsCurrentPos;
  currentPos.x = positionsHigh[0] + positionsLow[0];
  currentPos.y = positionsHigh[1] + positionsLow[1];
  currentPos.z = positionsHigh[2] + positionsLow[2];

  var xMin = Cartesian3.clone(currentPos, fromPointsXMin);
  var yMin = Cartesian3.clone(currentPos, fromPointsYMin);
  var zMin = Cartesian3.clone(currentPos, fromPointsZMin);

  var xMax = Cartesian3.clone(currentPos, fromPointsXMax);
  var yMax = Cartesian3.clone(currentPos, fromPointsYMax);
  var zMax = Cartesian3.clone(currentPos, fromPointsZMax);

  var numElements = positionsHigh.length;
  var i;
  for (i = 0; i < numElements; i += 3) {
    var x = positionsHigh[i] + positionsLow[i];
    var y = positionsHigh[i + 1] + positionsLow[i + 1];
    var z = positionsHigh[i + 2] + positionsLow[i + 2];

    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;

    // Store points containing the the smallest and largest components
    if (x < xMin.x) {
      Cartesian3.clone(currentPos, xMin);
    }

    if (x > xMax.x) {
      Cartesian3.clone(currentPos, xMax);
    }

    if (y < yMin.y) {
      Cartesian3.clone(currentPos, yMin);
    }

    if (y > yMax.y) {
      Cartesian3.clone(currentPos, yMax);
    }

    if (z < zMin.z) {
      Cartesian3.clone(currentPos, zMin);
    }

    if (z > zMax.z) {
      Cartesian3.clone(currentPos, zMax);
    }
  }

  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
  var xSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(xMax, xMin, fromPointsScratch)
  );
  var ySpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(yMax, yMin, fromPointsScratch)
  );
  var zSpan = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(zMax, zMin, fromPointsScratch)
  );

  // Set the diameter endpoints to the largest span.
  var diameter1 = xMin;
  var diameter2 = xMax;
  var maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }

  // Calculate the center of the initial sphere found by Ritter's algorithm
  var ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

  // Calculate the radius of the initial sphere found by Ritter's algorithm
  var radiusSquared = Cartesian3.magnitudeSquared(
    Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  var ritterRadius = Math.sqrt(radiusSquared);

  // Find the center of the sphere found using the Naive method.
  var minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;

  var maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;

  var naiveCenter = Cartesian3.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );

  // Begin 2nd pass to find naive radius and modify the ritter sphere.
  var naiveRadius = 0;
  for (i = 0; i < numElements; i += 3) {
    currentPos.x = positionsHigh[i] + positionsLow[i];
    currentPos.y = positionsHigh[i + 1] + positionsLow[i + 1];
    currentPos.z = positionsHigh[i + 2] + positionsLow[i + 2];

    // Find the furthest point from the naive center to calculate the naive radius.
    var r = Cartesian3.magnitude(
      Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }

    // Make adjustments to the Ritter Sphere to include all points.
    var oldCenterToPointSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      var oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      // Calculate new radius to include the point that lies outside
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      // Calculate center of new Ritter sphere
      var oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x =
        (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
        oldCenterToPoint;
      ritterCenter.y =
        (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
        oldCenterToPoint;
      ritterCenter.z =
        (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
        oldCenterToPoint;
    }
  }

  if (ritterRadius < naiveRadius) {
    Cartesian3.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }

  return result;
};

/**
 * Computes a bounding sphere from the corner points of an axis-aligned bounding box.  The sphere
 * tighly and fully encompases the box.
 *
 * @param {Cartesian3} [corner] The minimum height over the rectangle.
 * @param {Cartesian3} [oppositeCorner] The maximum height over the rectangle.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 *
 * @example
 * // Create a bounding sphere around the unit cube
 * var sphere = Cesium.BoundingSphere.fromCornerPoints(new Cesium.Cartesian3(-0.5, -0.5, -0.5), new Cesium.Cartesian3(0.5, 0.5, 0.5));
 */
BoundingSphere.fromCornerPoints = function (corner, oppositeCorner, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("corner", corner);
  Check.typeOf.object("oppositeCorner", oppositeCorner);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  var center = Cartesian3.midpoint(corner, oppositeCorner, result.center);
  result.radius = Cartesian3.distance(center, oppositeCorner);
  return result;
};

/**
 * Creates a bounding sphere encompassing an ellipsoid.
 *
 * @param {Ellipsoid} ellipsoid The ellipsoid around which to create a bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 *
 * @example
 * var boundingSphere = Cesium.BoundingSphere.fromEllipsoid(ellipsoid);
 */
BoundingSphere.fromEllipsoid = function (ellipsoid, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ellipsoid", ellipsoid);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  Cartesian3.clone(Cartesian3.ZERO, result.center);
  result.radius = ellipsoid.maximumRadius;
  return result;
};

var fromBoundingSpheresScratch = new Cartesian3();

/**
 * Computes a tight-fitting bounding sphere enclosing the provided array of bounding spheres.
 *
 * @param {BoundingSphere[]} [boundingSpheres] The array of bounding spheres.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.fromBoundingSpheres = function (boundingSpheres, result) {
  if (!defined(result)) {
    result = new BoundingSphere();
  }

  if (!defined(boundingSpheres) || boundingSpheres.length === 0) {
    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = 0.0;
    return result;
  }

  var length = boundingSpheres.length;
  if (length === 1) {
    return BoundingSphere.clone(boundingSpheres[0], result);
  }

  if (length === 2) {
    return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
  }

  var positions = [];
  var i;
  for (i = 0; i < length; i++) {
    positions.push(boundingSpheres[i].center);
  }

  result = BoundingSphere.fromPoints(positions, result);

  var center = result.center;
  var radius = result.radius;
  for (i = 0; i < length; i++) {
    var tmp = boundingSpheres[i];
    radius = Math.max(
      radius,
      Cartesian3.distance(center, tmp.center, fromBoundingSpheresScratch) +
        tmp.radius
    );
  }
  result.radius = radius;

  return result;
};

var fromOrientedBoundingBoxScratchU = new Cartesian3();
var fromOrientedBoundingBoxScratchV = new Cartesian3();
var fromOrientedBoundingBoxScratchW = new Cartesian3();

/**
 * Computes a tight-fitting bounding sphere enclosing the provided oriented bounding box.
 *
 * @param {OrientedBoundingBox} orientedBoundingBox The oriented bounding box.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.fromOrientedBoundingBox = function (
  orientedBoundingBox,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("orientedBoundingBox", orientedBoundingBox);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  var halfAxes = orientedBoundingBox.halfAxes;
  var u = Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
  var v = Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
  var w = Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);

  Cartesian3.add(u, v, u);
  Cartesian3.add(u, w, u);

  result.center = Cartesian3.clone(orientedBoundingBox.center, result.center);
  result.radius = Cartesian3.magnitude(u);

  return result;
};

/**
 * Duplicates a BoundingSphere instance.
 *
 * @param {BoundingSphere} sphere The bounding sphere to duplicate.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided. (Returns undefined if sphere is undefined)
 */
BoundingSphere.clone = function (sphere, result) {
  if (!defined(sphere)) {
    return undefined;
  }

  if (!defined(result)) {
    return new BoundingSphere(sphere.center, sphere.radius);
  }

  result.center = Cartesian3.clone(sphere.center, result.center);
  result.radius = sphere.radius;
  return result;
};

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
BoundingSphere.packedLength = 4;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {BoundingSphere} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
BoundingSphere.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  var center = value.center;
  array[startingIndex++] = center.x;
  array[startingIndex++] = center.y;
  array[startingIndex++] = center.z;
  array[startingIndex] = value.radius;

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {BoundingSphere} [result] The object into which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if one was not provided.
 */
BoundingSphere.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  var center = result.center;
  center.x = array[startingIndex++];
  center.y = array[startingIndex++];
  center.z = array[startingIndex++];
  result.radius = array[startingIndex];
  return result;
};

var unionScratch = new Cartesian3();
var unionScratchCenter = new Cartesian3();
/**
 * Computes a bounding sphere that contains both the left and right bounding spheres.
 *
 * @param {BoundingSphere} left A sphere to enclose in a bounding sphere.
 * @param {BoundingSphere} right A sphere to enclose in a bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.union = function (left, right, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  var leftCenter = left.center;
  var leftRadius = left.radius;
  var rightCenter = right.center;
  var rightRadius = right.radius;

  var toRightCenter = Cartesian3.subtract(
    rightCenter,
    leftCenter,
    unionScratch
  );
  var centerSeparation = Cartesian3.magnitude(toRightCenter);

  if (leftRadius >= centerSeparation + rightRadius) {
    // Left sphere wins.
    left.clone(result);
    return result;
  }

  if (rightRadius >= centerSeparation + leftRadius) {
    // Right sphere wins.
    right.clone(result);
    return result;
  }

  // There are two tangent points, one on far side of each sphere.
  var halfDistanceBetweenTangentPoints =
    (leftRadius + centerSeparation + rightRadius) * 0.5;

  // Compute the center point halfway between the two tangent points.
  var center = Cartesian3.multiplyByScalar(
    toRightCenter,
    (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
    unionScratchCenter
  );
  Cartesian3.add(center, leftCenter, center);
  Cartesian3.clone(center, result.center);
  result.radius = halfDistanceBetweenTangentPoints;

  return result;
};

var expandScratch = new Cartesian3();
/**
 * Computes a bounding sphere by enlarging the provided sphere to contain the provided point.
 *
 * @param {BoundingSphere} sphere A sphere to expand.
 * @param {Cartesian3} point A point to enclose in a bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.expand = function (sphere, point, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("point", point);
  //>>includeEnd('debug');

  result = BoundingSphere.clone(sphere, result);

  var radius = Cartesian3.magnitude(
    Cartesian3.subtract(point, result.center, expandScratch)
  );
  if (radius > result.radius) {
    result.radius = radius;
  }

  return result;
};

/**
 * Determines which side of a plane a sphere is located.
 *
 * @param {BoundingSphere} sphere The bounding sphere to test.
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
 *                      intersects the plane.
 */
BoundingSphere.intersectPlane = function (sphere, plane) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("plane", plane);
  //>>includeEnd('debug');

  var center = sphere.center;
  var radius = sphere.radius;
  var normal = plane.normal;
  var distanceToPlane = Cartesian3.dot(normal, center) + plane.distance;

  if (distanceToPlane < -radius) {
    // The center point is negative side of the plane normal
    return Intersect.OUTSIDE;
  } else if (distanceToPlane < radius) {
    // The center point is positive side of the plane, but radius extends beyond it; partial overlap
    return Intersect.INTERSECTING;
  }
  return Intersect.INSIDE;
};

/**
 * Applies a 4x4 affine transformation matrix to a bounding sphere.
 *
 * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
 * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.transform = function (sphere, transform, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("transform", transform);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  result.center = Matrix4.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = Matrix4.getMaximumScale(transform) * sphere.radius;

  return result;
};

var distanceSquaredToScratch = new Cartesian3();

/**
 * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
 *
 * @param {BoundingSphere} sphere The sphere.
 * @param {Cartesian3} cartesian The point
 * @returns {Number} The distance squared from the bounding sphere to the point. Returns 0 if the point is inside the sphere.
 *
 * @example
 * // Sort bounding spheres from back to front
 * spheres.sort(function(a, b) {
 *     return Cesium.BoundingSphere.distanceSquaredTo(b, camera.positionWC) - Cesium.BoundingSphere.distanceSquaredTo(a, camera.positionWC);
 * });
 */
BoundingSphere.distanceSquaredTo = function (sphere, cartesian) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("cartesian", cartesian);
  //>>includeEnd('debug');

  var diff = Cartesian3.subtract(
    sphere.center,
    cartesian,
    distanceSquaredToScratch
  );

  var distance = Cartesian3.magnitude(diff) - sphere.radius;
  if (distance <= 0.0) {
    return 0.0;
  }

  return distance * distance;
};

/**
 * Applies a 4x4 affine transformation matrix to a bounding sphere where there is no scale
 * The transformation matrix is not verified to have a uniform scale of 1.
 * This method is faster than computing the general bounding sphere transform using {@link BoundingSphere.transform}.
 *
 * @param {BoundingSphere} sphere The bounding sphere to apply the transformation to.
 * @param {Matrix4} transform The transformation matrix to apply to the bounding sphere.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 *
 * @example
 * var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
 * var boundingSphere = new Cesium.BoundingSphere();
 * var newBoundingSphere = Cesium.BoundingSphere.transformWithoutScale(boundingSphere, modelMatrix);
 */
BoundingSphere.transformWithoutScale = function (sphere, transform, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("transform", transform);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new BoundingSphere();
  }

  result.center = Matrix4.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = sphere.radius;

  return result;
};

var scratchCartesian3 = new Cartesian3();
/**
 * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
 * plus/minus the radius of the bounding sphere.
 * <br>
 * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
 * closest and farthest planes from position that intersect the bounding sphere.
 *
 * @param {BoundingSphere} sphere The bounding sphere to calculate the distance to.
 * @param {Cartesian3} position The position to calculate the distance from.
 * @param {Cartesian3} direction The direction from position.
 * @param {Interval} [result] A Interval to store the nearest and farthest distances.
 * @returns {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
 */
BoundingSphere.computePlaneDistances = function (
  sphere,
  position,
  direction,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("position", position);
  Check.typeOf.object("direction", direction);
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Interval();
  }

  var toCenter = Cartesian3.subtract(
    sphere.center,
    position,
    scratchCartesian3
  );
  var mag = Cartesian3.dot(direction, toCenter);

  result.start = mag - sphere.radius;
  result.stop = mag + sphere.radius;
  return result;
};

var projectTo2DNormalScratch = new Cartesian3();
var projectTo2DEastScratch = new Cartesian3();
var projectTo2DNorthScratch = new Cartesian3();
var projectTo2DWestScratch = new Cartesian3();
var projectTo2DSouthScratch = new Cartesian3();
var projectTo2DCartographicScratch = new Cartographic();
var projectTo2DPositionsScratch = new Array(8);
for (var n = 0; n < 8; ++n) {
  projectTo2DPositionsScratch[n] = new Cartesian3();
}

var projectTo2DProjection = new GeographicProjection();
/**
 * Creates a bounding sphere in 2D from a bounding sphere in 3D world coordinates.
 *
 * @param {BoundingSphere} sphere The bounding sphere to transform to 2D.
 * @param {Object} [projection=GeographicProjection] The projection to 2D.
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.projectTo2D = function (sphere, projection, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  //>>includeEnd('debug');

  projection = defaultValue(projection, projectTo2DProjection);

  var ellipsoid = projection.ellipsoid;
  var center = sphere.center;
  var radius = sphere.radius;

  var normal;
  if (Cartesian3.equals(center, Cartesian3.ZERO)) {
    // Bounding sphere is at the center. The geodetic surface normal is not
    // defined here so pick the x-axis as a fallback.
    normal = Cartesian3.clone(Cartesian3.UNIT_X, projectTo2DNormalScratch);
  } else {
    normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
  }
  var east = Cartesian3.cross(
    Cartesian3.UNIT_Z,
    normal,
    projectTo2DEastScratch
  );
  Cartesian3.normalize(east, east);
  var north = Cartesian3.cross(normal, east, projectTo2DNorthScratch);
  Cartesian3.normalize(north, north);

  Cartesian3.multiplyByScalar(normal, radius, normal);
  Cartesian3.multiplyByScalar(north, radius, north);
  Cartesian3.multiplyByScalar(east, radius, east);

  var south = Cartesian3.negate(north, projectTo2DSouthScratch);
  var west = Cartesian3.negate(east, projectTo2DWestScratch);

  var positions = projectTo2DPositionsScratch;

  // top NE corner
  var corner = positions[0];
  Cartesian3.add(normal, north, corner);
  Cartesian3.add(corner, east, corner);

  // top NW corner
  corner = positions[1];
  Cartesian3.add(normal, north, corner);
  Cartesian3.add(corner, west, corner);

  // top SW corner
  corner = positions[2];
  Cartesian3.add(normal, south, corner);
  Cartesian3.add(corner, west, corner);

  // top SE corner
  corner = positions[3];
  Cartesian3.add(normal, south, corner);
  Cartesian3.add(corner, east, corner);

  Cartesian3.negate(normal, normal);

  // bottom NE corner
  corner = positions[4];
  Cartesian3.add(normal, north, corner);
  Cartesian3.add(corner, east, corner);

  // bottom NW corner
  corner = positions[5];
  Cartesian3.add(normal, north, corner);
  Cartesian3.add(corner, west, corner);

  // bottom SW corner
  corner = positions[6];
  Cartesian3.add(normal, south, corner);
  Cartesian3.add(corner, west, corner);

  // bottom SE corner
  corner = positions[7];
  Cartesian3.add(normal, south, corner);
  Cartesian3.add(corner, east, corner);

  var length = positions.length;
  for (var i = 0; i < length; ++i) {
    var position = positions[i];
    Cartesian3.add(center, position, position);
    var cartographic = ellipsoid.cartesianToCartographic(
      position,
      projectTo2DCartographicScratch
    );
    projection.project(cartographic, position);
  }

  result = BoundingSphere.fromPoints(positions, result);

  // swizzle center components
  center = result.center;
  var x = center.x;
  var y = center.y;
  var z = center.z;
  center.x = z;
  center.y = x;
  center.z = y;

  return result;
};

/**
 * Determines whether or not a sphere is hidden from view by the occluder.
 *
 * @param {BoundingSphere} sphere The bounding sphere surrounding the occludee object.
 * @param {Occluder} occluder The occluder.
 * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
 */
BoundingSphere.isOccluded = function (sphere, occluder) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("sphere", sphere);
  Check.typeOf.object("occluder", occluder);
  //>>includeEnd('debug');
  return !occluder.isBoundingSphereVisible(sphere);
};

/**
 * Compares the provided BoundingSphere componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {BoundingSphere} [left] The first BoundingSphere.
 * @param {BoundingSphere} [right] The second BoundingSphere.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
BoundingSphere.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Cartesian3.equals(left.center, right.center) &&
      left.radius === right.radius)
  );
};

/**
 * Determines which side of a plane the sphere is located.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
 *                      intersects the plane.
 */
BoundingSphere.prototype.intersectPlane = function (plane) {
  return BoundingSphere.intersectPlane(this, plane);
};

/**
 * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
 *
 * @param {Cartesian3} cartesian The point
 * @returns {Number} The estimated distance squared from the bounding sphere to the point.
 *
 * @example
 * // Sort bounding spheres from back to front
 * spheres.sort(function(a, b) {
 *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
 * });
 */
BoundingSphere.prototype.distanceSquaredTo = function (cartesian) {
  return BoundingSphere.distanceSquaredTo(this, cartesian);
};

/**
 * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
 * plus/minus the radius of the bounding sphere.
 * <br>
 * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
 * closest and farthest planes from position that intersect the bounding sphere.
 *
 * @param {Cartesian3} position The position to calculate the distance from.
 * @param {Cartesian3} direction The direction from position.
 * @param {Interval} [result] A Interval to store the nearest and farthest distances.
 * @returns {Interval} The nearest and farthest distances on the bounding sphere from position in direction.
 */
BoundingSphere.prototype.computePlaneDistances = function (
  position,
  direction,
  result
) {
  return BoundingSphere.computePlaneDistances(
    this,
    position,
    direction,
    result
  );
};

/**
 * Determines whether or not a sphere is hidden from view by the occluder.
 *
 * @param {Occluder} occluder The occluder.
 * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
 */
BoundingSphere.prototype.isOccluded = function (occluder) {
  return BoundingSphere.isOccluded(this, occluder);
};

/**
 * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {BoundingSphere} [right] The right hand side BoundingSphere.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
BoundingSphere.prototype.equals = function (right) {
  return BoundingSphere.equals(this, right);
};

/**
 * Duplicates this BoundingSphere instance.
 *
 * @param {BoundingSphere} [result] The object onto which to store the result.
 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
 */
BoundingSphere.prototype.clone = function (result) {
  return BoundingSphere.clone(this, result);
};

/**
 * Computes the radius of the BoundingSphere.
 * @returns {Number} The radius of the BoundingSphere.
 */
BoundingSphere.prototype.volume = function () {
  var radius = this.radius;
  return volumeConstant * radius * radius * radius;
};
export default BoundingSphere;
