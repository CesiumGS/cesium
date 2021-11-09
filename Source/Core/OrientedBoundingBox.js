import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidTangentPlane from "./EllipsoidTangentPlane.js";
import Intersect from "./Intersect.js";
import Interval from "./Interval.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Plane from "./Plane.js";
import Rectangle from "./Rectangle.js";

/**
 * Creates an instance of an OrientedBoundingBox.
 * An OrientedBoundingBox of some object is a closed and convex cuboid. It can provide a tighter bounding volume than {@link BoundingSphere} or {@link AxisAlignedBoundingBox} in many cases.
 * @alias OrientedBoundingBox
 * @constructor
 *
 * @param {Cartesian3} [center=Cartesian3.ZERO] The center of the box.
 * @param {Matrix3} [halfAxes=Matrix3.ZERO] The three orthogonal half-axes of the bounding box.
 *                                          Equivalently, the transformation matrix, to rotate and scale a 0x0x0
 *                                          cube centered at the origin.
 *
 *
 * @example
 * // Create an OrientedBoundingBox using a transformation matrix, a position where the box will be translated, and a scale.
 * var center = new Cesium.Cartesian3(1.0, 0.0, 0.0);
 * var halfAxes = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(1.0, 3.0, 2.0), new Cesium.Matrix3());
 *
 * var obb = new Cesium.OrientedBoundingBox(center, halfAxes);
 *
 * @see BoundingSphere
 * @see BoundingRectangle
 */
function OrientedBoundingBox(center, halfAxes) {
  /**
   * The center of the box.
   * @type {Cartesian3}
   * @default {@link Cartesian3.ZERO}
   */
  this.center = Cartesian3.clone(defaultValue(center, Cartesian3.ZERO));
  /**
   * The transformation matrix, to rotate the box to the right position.
   * @type {Matrix3}
   * @default {@link Matrix3.ZERO}
   */
  this.halfAxes = Matrix3.clone(defaultValue(halfAxes, Matrix3.ZERO));
}

/**
 * The number of elements used to pack the object into an array.
 * @type {Number}
 */
OrientedBoundingBox.packedLength =
  Cartesian3.packedLength + Matrix3.packedLength;

/**
 * Stores the provided instance into the provided array.
 *
 * @param {OrientedBoundingBox} value The value to pack.
 * @param {Number[]} array The array to pack into.
 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
 *
 * @returns {Number[]} The array that was packed into
 */
OrientedBoundingBox.pack = function (value, array, startingIndex) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("value", value);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  Cartesian3.pack(value.center, array, startingIndex);
  Matrix3.pack(value.halfAxes, array, startingIndex + Cartesian3.packedLength);

  return array;
};

/**
 * Retrieves an instance from a packed array.
 *
 * @param {Number[]} array The packed array.
 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
 * @param {OrientedBoundingBox} [result] The object into which to store the result.
 * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
 */
OrientedBoundingBox.unpack = function (array, startingIndex, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("array", array);
  //>>includeEnd('debug');

  startingIndex = defaultValue(startingIndex, 0);

  if (!defined(result)) {
    result = new OrientedBoundingBox();
  }

  Cartesian3.unpack(array, startingIndex, result.center);
  Matrix3.unpack(
    array,
    startingIndex + Cartesian3.packedLength,
    result.halfAxes
  );
  return result;
};

var scratchCartesian1 = new Cartesian3();
var scratchCartesian2 = new Cartesian3();
var scratchCartesian3 = new Cartesian3();
var scratchCartesian4 = new Cartesian3();
var scratchCartesian5 = new Cartesian3();
var scratchCartesian6 = new Cartesian3();
var scratchCovarianceResult = new Matrix3();
var scratchEigenResult = {
  unitary: new Matrix3(),
  diagonal: new Matrix3(),
};

/**
 * Computes an instance of an OrientedBoundingBox of the given positions.
 * This is an implementation of Stefan Gottschalk's Collision Queries using Oriented Bounding Boxes solution (PHD thesis).
 * Reference: http://gamma.cs.unc.edu/users/gottschalk/main.pdf
 *
 * @param {Cartesian3[]} [positions] List of {@link Cartesian3} points that the bounding box will enclose.
 * @param {OrientedBoundingBox} [result] The object onto which to store the result.
 * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
 *
 * @example
 * // Compute an object oriented bounding box enclosing two points.
 * var box = Cesium.OrientedBoundingBox.fromPoints([new Cesium.Cartesian3(2, 0, 0), new Cesium.Cartesian3(-2, 0, 0)]);
 */
OrientedBoundingBox.fromPoints = function (positions, result) {
  if (!defined(result)) {
    result = new OrientedBoundingBox();
  }

  if (!defined(positions) || positions.length === 0) {
    result.halfAxes = Matrix3.ZERO;
    result.center = Cartesian3.ZERO;
    return result;
  }

  var i;
  var length = positions.length;

  var meanPoint = Cartesian3.clone(positions[0], scratchCartesian1);
  for (i = 1; i < length; i++) {
    Cartesian3.add(meanPoint, positions[i], meanPoint);
  }
  var invLength = 1.0 / length;
  Cartesian3.multiplyByScalar(meanPoint, invLength, meanPoint);

  var exx = 0.0;
  var exy = 0.0;
  var exz = 0.0;
  var eyy = 0.0;
  var eyz = 0.0;
  var ezz = 0.0;
  var p;

  for (i = 0; i < length; i++) {
    p = Cartesian3.subtract(positions[i], meanPoint, scratchCartesian2);
    exx += p.x * p.x;
    exy += p.x * p.y;
    exz += p.x * p.z;
    eyy += p.y * p.y;
    eyz += p.y * p.z;
    ezz += p.z * p.z;
  }

  exx *= invLength;
  exy *= invLength;
  exz *= invLength;
  eyy *= invLength;
  eyz *= invLength;
  ezz *= invLength;

  var covarianceMatrix = scratchCovarianceResult;
  covarianceMatrix[0] = exx;
  covarianceMatrix[1] = exy;
  covarianceMatrix[2] = exz;
  covarianceMatrix[3] = exy;
  covarianceMatrix[4] = eyy;
  covarianceMatrix[5] = eyz;
  covarianceMatrix[6] = exz;
  covarianceMatrix[7] = eyz;
  covarianceMatrix[8] = ezz;

  var eigenDecomposition = Matrix3.computeEigenDecomposition(
    covarianceMatrix,
    scratchEigenResult
  );
  var rotation = Matrix3.clone(eigenDecomposition.unitary, result.halfAxes);

  var v1 = Matrix3.getColumn(rotation, 0, scratchCartesian4);
  var v2 = Matrix3.getColumn(rotation, 1, scratchCartesian5);
  var v3 = Matrix3.getColumn(rotation, 2, scratchCartesian6);

  var u1 = -Number.MAX_VALUE;
  var u2 = -Number.MAX_VALUE;
  var u3 = -Number.MAX_VALUE;
  var l1 = Number.MAX_VALUE;
  var l2 = Number.MAX_VALUE;
  var l3 = Number.MAX_VALUE;

  for (i = 0; i < length; i++) {
    p = positions[i];
    u1 = Math.max(Cartesian3.dot(v1, p), u1);
    u2 = Math.max(Cartesian3.dot(v2, p), u2);
    u3 = Math.max(Cartesian3.dot(v3, p), u3);

    l1 = Math.min(Cartesian3.dot(v1, p), l1);
    l2 = Math.min(Cartesian3.dot(v2, p), l2);
    l3 = Math.min(Cartesian3.dot(v3, p), l3);
  }

  v1 = Cartesian3.multiplyByScalar(v1, 0.5 * (l1 + u1), v1);
  v2 = Cartesian3.multiplyByScalar(v2, 0.5 * (l2 + u2), v2);
  v3 = Cartesian3.multiplyByScalar(v3, 0.5 * (l3 + u3), v3);

  var center = Cartesian3.add(v1, v2, result.center);
  Cartesian3.add(center, v3, center);

  var scale = scratchCartesian3;
  scale.x = u1 - l1;
  scale.y = u2 - l2;
  scale.z = u3 - l3;
  Cartesian3.multiplyByScalar(scale, 0.5, scale);
  Matrix3.multiplyByScale(result.halfAxes, scale, result.halfAxes);

  return result;
};

var scratchOffset = new Cartesian3();
var scratchScale = new Cartesian3();
function fromPlaneExtents(
  planeOrigin,
  planeXAxis,
  planeYAxis,
  planeZAxis,
  minimumX,
  maximumX,
  minimumY,
  maximumY,
  minimumZ,
  maximumZ,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(minimumX) ||
    !defined(maximumX) ||
    !defined(minimumY) ||
    !defined(maximumY) ||
    !defined(minimumZ) ||
    !defined(maximumZ)
  ) {
    throw new DeveloperError(
      "all extents (minimum/maximum X/Y/Z) are required."
    );
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new OrientedBoundingBox();
  }

  var halfAxes = result.halfAxes;
  Matrix3.setColumn(halfAxes, 0, planeXAxis, halfAxes);
  Matrix3.setColumn(halfAxes, 1, planeYAxis, halfAxes);
  Matrix3.setColumn(halfAxes, 2, planeZAxis, halfAxes);

  var centerOffset = scratchOffset;
  centerOffset.x = (minimumX + maximumX) / 2.0;
  centerOffset.y = (minimumY + maximumY) / 2.0;
  centerOffset.z = (minimumZ + maximumZ) / 2.0;

  var scale = scratchScale;
  scale.x = (maximumX - minimumX) / 2.0;
  scale.y = (maximumY - minimumY) / 2.0;
  scale.z = (maximumZ - minimumZ) / 2.0;

  var center = result.center;
  centerOffset = Matrix3.multiplyByVector(halfAxes, centerOffset, centerOffset);
  Cartesian3.add(planeOrigin, centerOffset, center);
  Matrix3.multiplyByScale(halfAxes, scale, halfAxes);

  return result;
}

var scratchRectangleCenterCartographic = new Cartographic();
var scratchRectangleCenter = new Cartesian3();
var scratchPerimeterCartographicNC = new Cartographic();
var scratchPerimeterCartographicNW = new Cartographic();
var scratchPerimeterCartographicCW = new Cartographic();
var scratchPerimeterCartographicSW = new Cartographic();
var scratchPerimeterCartographicSC = new Cartographic();
var scratchPerimeterCartesianNC = new Cartesian3();
var scratchPerimeterCartesianNW = new Cartesian3();
var scratchPerimeterCartesianCW = new Cartesian3();
var scratchPerimeterCartesianSW = new Cartesian3();
var scratchPerimeterCartesianSC = new Cartesian3();
var scratchPerimeterProjectedNC = new Cartesian2();
var scratchPerimeterProjectedNW = new Cartesian2();
var scratchPerimeterProjectedCW = new Cartesian2();
var scratchPerimeterProjectedSW = new Cartesian2();
var scratchPerimeterProjectedSC = new Cartesian2();

var scratchPlaneOrigin = new Cartesian3();
var scratchPlaneNormal = new Cartesian3();
var scratchPlaneXAxis = new Cartesian3();
var scratchHorizonCartesian = new Cartesian3();
var scratchHorizonProjected = new Cartesian2();
var scratchMaxY = new Cartesian3();
var scratchMinY = new Cartesian3();
var scratchZ = new Cartesian3();
var scratchPlane = new Plane(Cartesian3.UNIT_X, 0.0);

/**
 * Computes an OrientedBoundingBox that bounds a {@link Rectangle} on the surface of an {@link Ellipsoid}.
 * There are no guarantees about the orientation of the bounding box.
 *
 * @param {Rectangle} rectangle The cartographic rectangle on the surface of the ellipsoid.
 * @param {Number} [minimumHeight=0.0] The minimum height (elevation) within the tile.
 * @param {Number} [maximumHeight=0.0] The maximum height (elevation) within the tile.
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the rectangle is defined.
 * @param {OrientedBoundingBox} [result] The object onto which to store the result.
 * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided.
 *
 * @exception {DeveloperError} rectangle.width must be between 0 and pi.
 * @exception {DeveloperError} rectangle.height must be between 0 and pi.
 * @exception {DeveloperError} ellipsoid must be an ellipsoid of revolution (<code>radii.x == radii.y</code>)
 */
OrientedBoundingBox.fromRectangle = function (
  rectangle,
  minimumHeight,
  maximumHeight,
  ellipsoid,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(rectangle)) {
    throw new DeveloperError("rectangle is required");
  }
  if (rectangle.width < 0.0 || rectangle.width > CesiumMath.TWO_PI) {
    throw new DeveloperError("Rectangle width must be between 0 and 2*pi");
  }
  if (rectangle.height < 0.0 || rectangle.height > CesiumMath.PI) {
    throw new DeveloperError("Rectangle height must be between 0 and pi");
  }
  if (
    defined(ellipsoid) &&
    !CesiumMath.equalsEpsilon(
      ellipsoid.radii.x,
      ellipsoid.radii.y,
      CesiumMath.EPSILON15
    )
  ) {
    throw new DeveloperError(
      "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
    );
  }
  //>>includeEnd('debug');

  minimumHeight = defaultValue(minimumHeight, 0.0);
  maximumHeight = defaultValue(maximumHeight, 0.0);
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  var minX, maxX, minY, maxY, minZ, maxZ, plane;

  if (rectangle.width <= CesiumMath.PI) {
    // The bounding box will be aligned with the tangent plane at the center of the rectangle.
    var tangentPointCartographic = Rectangle.center(
      rectangle,
      scratchRectangleCenterCartographic
    );
    var tangentPoint = ellipsoid.cartographicToCartesian(
      tangentPointCartographic,
      scratchRectangleCenter
    );
    var tangentPlane = new EllipsoidTangentPlane(tangentPoint, ellipsoid);
    plane = tangentPlane.plane;

    // If the rectangle spans the equator, CW is instead aligned with the equator (because it sticks out the farthest at the equator).
    var lonCenter = tangentPointCartographic.longitude;
    var latCenter =
      rectangle.south < 0.0 && rectangle.north > 0.0
        ? 0.0
        : tangentPointCartographic.latitude;

    // Compute XY extents using the rectangle at maximum height
    var perimeterCartographicNC = Cartographic.fromRadians(
      lonCenter,
      rectangle.north,
      maximumHeight,
      scratchPerimeterCartographicNC
    );
    var perimeterCartographicNW = Cartographic.fromRadians(
      rectangle.west,
      rectangle.north,
      maximumHeight,
      scratchPerimeterCartographicNW
    );
    var perimeterCartographicCW = Cartographic.fromRadians(
      rectangle.west,
      latCenter,
      maximumHeight,
      scratchPerimeterCartographicCW
    );
    var perimeterCartographicSW = Cartographic.fromRadians(
      rectangle.west,
      rectangle.south,
      maximumHeight,
      scratchPerimeterCartographicSW
    );
    var perimeterCartographicSC = Cartographic.fromRadians(
      lonCenter,
      rectangle.south,
      maximumHeight,
      scratchPerimeterCartographicSC
    );

    var perimeterCartesianNC = ellipsoid.cartographicToCartesian(
      perimeterCartographicNC,
      scratchPerimeterCartesianNC
    );
    var perimeterCartesianNW = ellipsoid.cartographicToCartesian(
      perimeterCartographicNW,
      scratchPerimeterCartesianNW
    );
    var perimeterCartesianCW = ellipsoid.cartographicToCartesian(
      perimeterCartographicCW,
      scratchPerimeterCartesianCW
    );
    var perimeterCartesianSW = ellipsoid.cartographicToCartesian(
      perimeterCartographicSW,
      scratchPerimeterCartesianSW
    );
    var perimeterCartesianSC = ellipsoid.cartographicToCartesian(
      perimeterCartographicSC,
      scratchPerimeterCartesianSC
    );

    var perimeterProjectedNC = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianNC,
      scratchPerimeterProjectedNC
    );
    var perimeterProjectedNW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianNW,
      scratchPerimeterProjectedNW
    );
    var perimeterProjectedCW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianCW,
      scratchPerimeterProjectedCW
    );
    var perimeterProjectedSW = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianSW,
      scratchPerimeterProjectedSW
    );
    var perimeterProjectedSC = tangentPlane.projectPointToNearestOnPlane(
      perimeterCartesianSC,
      scratchPerimeterProjectedSC
    );

    minX = Math.min(
      perimeterProjectedNW.x,
      perimeterProjectedCW.x,
      perimeterProjectedSW.x
    );
    maxX = -minX; // symmetrical

    maxY = Math.max(perimeterProjectedNW.y, perimeterProjectedNC.y);
    minY = Math.min(perimeterProjectedSW.y, perimeterProjectedSC.y);

    // Compute minimum Z using the rectangle at minimum height, since it will be deeper than the maximum height
    perimeterCartographicNW.height = perimeterCartographicSW.height = minimumHeight;
    perimeterCartesianNW = ellipsoid.cartographicToCartesian(
      perimeterCartographicNW,
      scratchPerimeterCartesianNW
    );
    perimeterCartesianSW = ellipsoid.cartographicToCartesian(
      perimeterCartographicSW,
      scratchPerimeterCartesianSW
    );

    minZ = Math.min(
      Plane.getPointDistance(plane, perimeterCartesianNW),
      Plane.getPointDistance(plane, perimeterCartesianSW)
    );
    maxZ = maximumHeight; // Since the tangent plane touches the surface at height = 0, this is okay

    return fromPlaneExtents(
      tangentPlane.origin,
      tangentPlane.xAxis,
      tangentPlane.yAxis,
      tangentPlane.zAxis,
      minX,
      maxX,
      minY,
      maxY,
      minZ,
      maxZ,
      result
    );
  }

  // Handle the case where rectangle width is greater than PI (wraps around more than half the ellipsoid).
  var fullyAboveEquator = rectangle.south > 0.0;
  var fullyBelowEquator = rectangle.north < 0.0;
  var latitudeNearestToEquator = fullyAboveEquator
    ? rectangle.south
    : fullyBelowEquator
    ? rectangle.north
    : 0.0;
  var centerLongitude = Rectangle.center(
    rectangle,
    scratchRectangleCenterCartographic
  ).longitude;

  // Plane is located at the rectangle's center longitude and the rectangle's latitude that is closest to the equator. It rotates around the Z axis.
  // This results in a better fit than the obb approach for smaller rectangles, which orients with the rectangle's center normal.
  var planeOrigin = Cartesian3.fromRadians(
    centerLongitude,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchPlaneOrigin
  );
  planeOrigin.z = 0.0; // center the plane on the equator to simpify plane normal calculation
  var isPole =
    Math.abs(planeOrigin.x) < CesiumMath.EPSILON10 &&
    Math.abs(planeOrigin.y) < CesiumMath.EPSILON10;
  var planeNormal = !isPole
    ? Cartesian3.normalize(planeOrigin, scratchPlaneNormal)
    : Cartesian3.UNIT_X;
  var planeYAxis = Cartesian3.UNIT_Z;
  var planeXAxis = Cartesian3.cross(planeNormal, planeYAxis, scratchPlaneXAxis);
  plane = Plane.fromPointNormal(planeOrigin, planeNormal, scratchPlane);

  // Get the horizon point relative to the center. This will be the farthest extent in the plane's X dimension.
  var horizonCartesian = Cartesian3.fromRadians(
    centerLongitude + CesiumMath.PI_OVER_TWO,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchHorizonCartesian
  );
  maxX = Cartesian3.dot(
    Plane.projectPointOntoPlane(
      plane,
      horizonCartesian,
      scratchHorizonProjected
    ),
    planeXAxis
  );
  minX = -maxX; // symmetrical

  // Get the min and max Y, using the height that will give the largest extent
  maxY = Cartesian3.fromRadians(
    0.0,
    rectangle.north,
    fullyBelowEquator ? minimumHeight : maximumHeight,
    ellipsoid,
    scratchMaxY
  ).z;
  minY = Cartesian3.fromRadians(
    0.0,
    rectangle.south,
    fullyAboveEquator ? minimumHeight : maximumHeight,
    ellipsoid,
    scratchMinY
  ).z;

  var farZ = Cartesian3.fromRadians(
    rectangle.east,
    latitudeNearestToEquator,
    maximumHeight,
    ellipsoid,
    scratchZ
  );
  minZ = Plane.getPointDistance(plane, farZ);
  maxZ = 0.0; // plane origin starts at maxZ already

  // min and max are local to the plane axes
  return fromPlaneExtents(
    planeOrigin,
    planeXAxis,
    planeYAxis,
    planeNormal,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
    result
  );
};

/**
 * Duplicates a OrientedBoundingBox instance.
 *
 * @param {OrientedBoundingBox} box The bounding box to duplicate.
 * @param {OrientedBoundingBox} [result] The object onto which to store the result.
 * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if none was provided. (Returns undefined if box is undefined)
 */
OrientedBoundingBox.clone = function (box, result) {
  if (!defined(box)) {
    return undefined;
  }

  if (!defined(result)) {
    return new OrientedBoundingBox(box.center, box.halfAxes);
  }

  Cartesian3.clone(box.center, result.center);
  Matrix3.clone(box.halfAxes, result.halfAxes);

  return result;
};

/**
 * Determines which side of a plane the oriented bounding box is located.
 *
 * @param {OrientedBoundingBox} box The oriented bounding box to test.
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
 *                      intersects the plane.
 */
OrientedBoundingBox.intersectPlane = function (box, plane) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(box)) {
    throw new DeveloperError("box is required.");
  }

  if (!defined(plane)) {
    throw new DeveloperError("plane is required.");
  }
  //>>includeEnd('debug');

  var center = box.center;
  var normal = plane.normal;
  var halfAxes = box.halfAxes;
  var normalX = normal.x,
    normalY = normal.y,
    normalZ = normal.z;
  // plane is used as if it is its normal; the first three components are assumed to be normalized
  var radEffective =
    Math.abs(
      normalX * halfAxes[Matrix3.COLUMN0ROW0] +
        normalY * halfAxes[Matrix3.COLUMN0ROW1] +
        normalZ * halfAxes[Matrix3.COLUMN0ROW2]
    ) +
    Math.abs(
      normalX * halfAxes[Matrix3.COLUMN1ROW0] +
        normalY * halfAxes[Matrix3.COLUMN1ROW1] +
        normalZ * halfAxes[Matrix3.COLUMN1ROW2]
    ) +
    Math.abs(
      normalX * halfAxes[Matrix3.COLUMN2ROW0] +
        normalY * halfAxes[Matrix3.COLUMN2ROW1] +
        normalZ * halfAxes[Matrix3.COLUMN2ROW2]
    );
  var distanceToPlane = Cartesian3.dot(normal, center) + plane.distance;

  if (distanceToPlane <= -radEffective) {
    // The entire box is on the negative side of the plane normal
    return Intersect.OUTSIDE;
  } else if (distanceToPlane >= radEffective) {
    // The entire box is on the positive side of the plane normal
    return Intersect.INSIDE;
  }
  return Intersect.INTERSECTING;
};

var scratchCartesianU = new Cartesian3();
var scratchCartesianV = new Cartesian3();
var scratchCartesianW = new Cartesian3();
var scratchValidAxis2 = new Cartesian3();
var scratchValidAxis3 = new Cartesian3();
var scratchPPrime = new Cartesian3();

/**
 * Computes the estimated distance squared from the closest point on a bounding box to a point.
 *
 * @param {OrientedBoundingBox} box The box.
 * @param {Cartesian3} cartesian The point
 * @returns {Number} The distance squared from the oriented bounding box to the point. Returns 0 if the point is inside the box.
 *
 * @example
 * // Sort bounding boxes from back to front
 * boxes.sort(function(a, b) {
 *     return Cesium.OrientedBoundingBox.distanceSquaredTo(b, camera.positionWC) - Cesium.OrientedBoundingBox.distanceSquaredTo(a, camera.positionWC);
 * });
 */
OrientedBoundingBox.distanceSquaredTo = function (box, cartesian) {
  // See Geometric Tools for Computer Graphics 10.4.2

  //>>includeStart('debug', pragmas.debug);
  if (!defined(box)) {
    throw new DeveloperError("box is required.");
  }
  if (!defined(cartesian)) {
    throw new DeveloperError("cartesian is required.");
  }
  //>>includeEnd('debug');

  var offset = Cartesian3.subtract(cartesian, box.center, scratchOffset);

  var halfAxes = box.halfAxes;
  var u = Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
  var v = Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
  var w = Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

  var uHalf = Cartesian3.magnitude(u);
  var vHalf = Cartesian3.magnitude(v);
  var wHalf = Cartesian3.magnitude(w);

  var uValid = true;
  var vValid = true;
  var wValid = true;

  if (uHalf > 0) {
    Cartesian3.divideByScalar(u, uHalf, u);
  } else {
    uValid = false;
  }

  if (vHalf > 0) {
    Cartesian3.divideByScalar(v, vHalf, v);
  } else {
    vValid = false;
  }

  if (wHalf > 0) {
    Cartesian3.divideByScalar(w, wHalf, w);
  } else {
    wValid = false;
  }

  var numberOfDegenerateAxes = !uValid + !vValid + !wValid;
  var validAxis1;
  var validAxis2;
  var validAxis3;

  if (numberOfDegenerateAxes === 1) {
    var degenerateAxis = u;
    validAxis1 = v;
    validAxis2 = w;
    if (!vValid) {
      degenerateAxis = v;
      validAxis1 = u;
    } else if (!wValid) {
      degenerateAxis = w;
      validAxis2 = u;
    }

    validAxis3 = Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3);

    if (degenerateAxis === u) {
      u = validAxis3;
    } else if (degenerateAxis === v) {
      v = validAxis3;
    } else if (degenerateAxis === w) {
      w = validAxis3;
    }
  } else if (numberOfDegenerateAxes === 2) {
    validAxis1 = u;
    if (vValid) {
      validAxis1 = v;
    } else if (wValid) {
      validAxis1 = w;
    }

    var crossVector = Cartesian3.UNIT_Y;
    if (crossVector.equalsEpsilon(validAxis1, CesiumMath.EPSILON3)) {
      crossVector = Cartesian3.UNIT_X;
    }

    validAxis2 = Cartesian3.cross(validAxis1, crossVector, scratchValidAxis2);
    Cartesian3.normalize(validAxis2, validAxis2);
    validAxis3 = Cartesian3.cross(validAxis1, validAxis2, scratchValidAxis3);
    Cartesian3.normalize(validAxis3, validAxis3);

    if (validAxis1 === u) {
      v = validAxis2;
      w = validAxis3;
    } else if (validAxis1 === v) {
      w = validAxis2;
      u = validAxis3;
    } else if (validAxis1 === w) {
      u = validAxis2;
      v = validAxis3;
    }
  } else if (numberOfDegenerateAxes === 3) {
    u = Cartesian3.UNIT_X;
    v = Cartesian3.UNIT_Y;
    w = Cartesian3.UNIT_Z;
  }

  var pPrime = scratchPPrime;
  pPrime.x = Cartesian3.dot(offset, u);
  pPrime.y = Cartesian3.dot(offset, v);
  pPrime.z = Cartesian3.dot(offset, w);

  var distanceSquared = 0.0;
  var d;

  if (pPrime.x < -uHalf) {
    d = pPrime.x + uHalf;
    distanceSquared += d * d;
  } else if (pPrime.x > uHalf) {
    d = pPrime.x - uHalf;
    distanceSquared += d * d;
  }

  if (pPrime.y < -vHalf) {
    d = pPrime.y + vHalf;
    distanceSquared += d * d;
  } else if (pPrime.y > vHalf) {
    d = pPrime.y - vHalf;
    distanceSquared += d * d;
  }

  if (pPrime.z < -wHalf) {
    d = pPrime.z + wHalf;
    distanceSquared += d * d;
  } else if (pPrime.z > wHalf) {
    d = pPrime.z - wHalf;
    distanceSquared += d * d;
  }

  return distanceSquared;
};

var scratchCorner = new Cartesian3();
var scratchToCenter = new Cartesian3();

/**
 * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
 * <br>
 * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
 * closest and farthest planes from position that intersect the bounding box.
 *
 * @param {OrientedBoundingBox} box The bounding box to calculate the distance to.
 * @param {Cartesian3} position The position to calculate the distance from.
 * @param {Cartesian3} direction The direction from position.
 * @param {Interval} [result] A Interval to store the nearest and farthest distances.
 * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
 */
OrientedBoundingBox.computePlaneDistances = function (
  box,
  position,
  direction,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(box)) {
    throw new DeveloperError("box is required.");
  }

  if (!defined(position)) {
    throw new DeveloperError("position is required.");
  }

  if (!defined(direction)) {
    throw new DeveloperError("direction is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Interval();
  }

  var minDist = Number.POSITIVE_INFINITY;
  var maxDist = Number.NEGATIVE_INFINITY;

  var center = box.center;
  var halfAxes = box.halfAxes;

  var u = Matrix3.getColumn(halfAxes, 0, scratchCartesianU);
  var v = Matrix3.getColumn(halfAxes, 1, scratchCartesianV);
  var w = Matrix3.getColumn(halfAxes, 2, scratchCartesianW);

  // project first corner
  var corner = Cartesian3.add(u, v, scratchCorner);
  Cartesian3.add(corner, w, corner);
  Cartesian3.add(corner, center, corner);

  var toCenter = Cartesian3.subtract(corner, position, scratchToCenter);
  var mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project second corner
  Cartesian3.add(center, u, corner);
  Cartesian3.add(corner, v, corner);
  Cartesian3.subtract(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project third corner
  Cartesian3.add(center, u, corner);
  Cartesian3.subtract(corner, v, corner);
  Cartesian3.add(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project fourth corner
  Cartesian3.add(center, u, corner);
  Cartesian3.subtract(corner, v, corner);
  Cartesian3.subtract(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project fifth corner
  Cartesian3.subtract(center, u, corner);
  Cartesian3.add(corner, v, corner);
  Cartesian3.add(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project sixth corner
  Cartesian3.subtract(center, u, corner);
  Cartesian3.add(corner, v, corner);
  Cartesian3.subtract(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project seventh corner
  Cartesian3.subtract(center, u, corner);
  Cartesian3.subtract(corner, v, corner);
  Cartesian3.add(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  // project eighth corner
  Cartesian3.subtract(center, u, corner);
  Cartesian3.subtract(corner, v, corner);
  Cartesian3.subtract(corner, w, corner);

  Cartesian3.subtract(corner, position, toCenter);
  mag = Cartesian3.dot(direction, toCenter);

  minDist = Math.min(mag, minDist);
  maxDist = Math.max(mag, maxDist);

  result.start = minDist;
  result.stop = maxDist;
  return result;
};

var scratchBoundingSphere = new BoundingSphere();

/**
 * Determines whether or not a bounding box is hidden from view by the occluder.
 *
 * @param {OrientedBoundingBox} box The bounding box surrounding the occludee object.
 * @param {Occluder} occluder The occluder.
 * @returns {Boolean} <code>true</code> if the box is not visible; otherwise <code>false</code>.
 */
OrientedBoundingBox.isOccluded = function (box, occluder) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(box)) {
    throw new DeveloperError("box is required.");
  }
  if (!defined(occluder)) {
    throw new DeveloperError("occluder is required.");
  }
  //>>includeEnd('debug');

  var sphere = BoundingSphere.fromOrientedBoundingBox(
    box,
    scratchBoundingSphere
  );

  return !occluder.isBoundingSphereVisible(sphere);
};

/**
 * Determines which side of a plane the oriented bounding box is located.
 *
 * @param {Plane} plane The plane to test against.
 * @returns {Intersect} {@link Intersect.INSIDE} if the entire box is on the side of the plane
 *                      the normal is pointing, {@link Intersect.OUTSIDE} if the entire box is
 *                      on the opposite side, and {@link Intersect.INTERSECTING} if the box
 *                      intersects the plane.
 */
OrientedBoundingBox.prototype.intersectPlane = function (plane) {
  return OrientedBoundingBox.intersectPlane(this, plane);
};

/**
 * Computes the estimated distance squared from the closest point on a bounding box to a point.
 *
 * @param {Cartesian3} cartesian The point
 * @returns {Number} The estimated distance squared from the bounding sphere to the point.
 *
 * @example
 * // Sort bounding boxes from back to front
 * boxes.sort(function(a, b) {
 *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
 * });
 */
OrientedBoundingBox.prototype.distanceSquaredTo = function (cartesian) {
  return OrientedBoundingBox.distanceSquaredTo(this, cartesian);
};

/**
 * The distances calculated by the vector from the center of the bounding box to position projected onto direction.
 * <br>
 * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
 * closest and farthest planes from position that intersect the bounding box.
 *
 * @param {Cartesian3} position The position to calculate the distance from.
 * @param {Cartesian3} direction The direction from position.
 * @param {Interval} [result] A Interval to store the nearest and farthest distances.
 * @returns {Interval} The nearest and farthest distances on the bounding box from position in direction.
 */
OrientedBoundingBox.prototype.computePlaneDistances = function (
  position,
  direction,
  result
) {
  return OrientedBoundingBox.computePlaneDistances(
    this,
    position,
    direction,
    result
  );
};

/**
 * Determines whether or not a bounding box is hidden from view by the occluder.
 *
 * @param {Occluder} occluder The occluder.
 * @returns {Boolean} <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
 */
OrientedBoundingBox.prototype.isOccluded = function (occluder) {
  return OrientedBoundingBox.isOccluded(this, occluder);
};

/**
 * Compares the provided OrientedBoundingBox componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {OrientedBoundingBox} left The first OrientedBoundingBox.
 * @param {OrientedBoundingBox} right The second OrientedBoundingBox.
 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
OrientedBoundingBox.equals = function (left, right) {
  return (
    left === right ||
    (defined(left) &&
      defined(right) &&
      Cartesian3.equals(left.center, right.center) &&
      Matrix3.equals(left.halfAxes, right.halfAxes))
  );
};

/**
 * Duplicates this OrientedBoundingBox instance.
 *
 * @param {OrientedBoundingBox} [result] The object onto which to store the result.
 * @returns {OrientedBoundingBox} The modified result parameter or a new OrientedBoundingBox instance if one was not provided.
 */
OrientedBoundingBox.prototype.clone = function (result) {
  return OrientedBoundingBox.clone(this, result);
};

/**
 * Compares this OrientedBoundingBox against the provided OrientedBoundingBox componentwise and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {OrientedBoundingBox} [right] The right hand side OrientedBoundingBox.
 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
 */
OrientedBoundingBox.prototype.equals = function (right) {
  return OrientedBoundingBox.equals(this, right);
};
export default OrientedBoundingBox;
