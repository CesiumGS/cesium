define(['require', 'exports', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './Math-2dbd6b93', './Matrix2-13178034', './combine-ca22a614', './RuntimeError-06c93819'], (function (require, exports, Matrix3, Check, defaultValue, Math$1, Matrix2, combine, RuntimeError) { 'use strict';

	function _interopNamespace(e) {
		if (e && e.__esModule) return e;
		var n = Object.create(null);
		if (e) {
			Object.keys(e).forEach(function (k) {
				if (k !== 'default') {
					var d = Object.getOwnPropertyDescriptor(e, k);
					Object.defineProperty(n, k, d.get ? d : {
						enumerable: true,
						get: function () { return e[k]; }
					});
				}
			});
		}
		n["default"] = e;
		return Object.freeze(n);
	}

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	/**
	 * A simple map projection where longitude and latitude are linearly mapped to X and Y by multiplying
	 * them by the {@link Ellipsoid#maximumRadius}.  This projection
	 * is commonly known as geographic, equirectangular, equidistant cylindrical, or plate carrée.  It
	 * is also known as EPSG:4326.
	 *
	 * @alias GeographicProjection
	 * @constructor
	 *
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid.
	 *
	 * @see WebMercatorProjection
	 */
	function GeographicProjection(ellipsoid) {
	  this._ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);
	  this._semimajorAxis = this._ellipsoid.maximumRadius;
	  this._oneOverSemimajorAxis = 1.0 / this._semimajorAxis;
	}

	Object.defineProperties(GeographicProjection.prototype, {
	  /**
	   * Gets the {@link Ellipsoid}.
	   *
	   * @memberof GeographicProjection.prototype
	   *
	   * @type {Ellipsoid}
	   * @readonly
	   */
	  ellipsoid: {
	    get: function () {
	      return this._ellipsoid;
	    },
	  },
	});

	/**
	 * Projects a set of {@link Cartographic} coordinates, in radians, to map coordinates, in meters.
	 * X and Y are the longitude and latitude, respectively, multiplied by the maximum radius of the
	 * ellipsoid.  Z is the unmodified height.
	 *
	 * @param {Cartographic} cartographic The coordinates to project.
	 * @param {Cartesian3} [result] An instance into which to copy the result.  If this parameter is
	 *        undefined, a new instance is created and returned.
	 * @returns {Cartesian3} The projected coordinates.  If the result parameter is not undefined, the
	 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
	 *          created and returned.
	 */
	GeographicProjection.prototype.project = function (cartographic, result) {
	  // Actually this is the special case of equidistant cylindrical called the plate carree
	  const semimajorAxis = this._semimajorAxis;
	  const x = cartographic.longitude * semimajorAxis;
	  const y = cartographic.latitude * semimajorAxis;
	  const z = cartographic.height;

	  if (!defaultValue.defined(result)) {
	    return new Matrix3.Cartesian3(x, y, z);
	  }

	  result.x = x;
	  result.y = y;
	  result.z = z;
	  return result;
	};

	/**
	 * Unprojects a set of projected {@link Cartesian3} coordinates, in meters, to {@link Cartographic}
	 * coordinates, in radians.  Longitude and Latitude are the X and Y coordinates, respectively,
	 * divided by the maximum radius of the ellipsoid.  Height is the unmodified Z coordinate.
	 *
	 * @param {Cartesian3} cartesian The Cartesian position to unproject with height (z) in meters.
	 * @param {Cartographic} [result] An instance into which to copy the result.  If this parameter is
	 *        undefined, a new instance is created and returned.
	 * @returns {Cartographic} The unprojected coordinates.  If the result parameter is not undefined, the
	 *          coordinates are copied there and that instance is returned.  Otherwise, a new instance is
	 *          created and returned.
	 */
	GeographicProjection.prototype.unproject = function (cartesian, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(cartesian)) {
	    throw new Check.DeveloperError("cartesian is required");
	  }
	  //>>includeEnd('debug');

	  const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
	  const longitude = cartesian.x * oneOverEarthSemimajorAxis;
	  const latitude = cartesian.y * oneOverEarthSemimajorAxis;
	  const height = cartesian.z;

	  if (!defaultValue.defined(result)) {
	    return new Matrix3.Cartographic(longitude, latitude, height);
	  }

	  result.longitude = longitude;
	  result.latitude = latitude;
	  result.height = height;
	  return result;
	};

	/**
	 * This enumerated type is used in determining where, relative to the frustum, an
	 * object is located. The object can either be fully contained within the frustum (INSIDE),
	 * partially inside the frustum and partially outside (INTERSECTING), or somewhere entirely
	 * outside of the frustum's 6 planes (OUTSIDE).
	 *
	 * @enum {Number}
	 */
	const Intersect = {
	  /**
	   * Represents that an object is not contained within the frustum.
	   *
	   * @type {Number}
	   * @constant
	   */
	  OUTSIDE: -1,

	  /**
	   * Represents that an object intersects one of the frustum's planes.
	   *
	   * @type {Number}
	   * @constant
	   */
	  INTERSECTING: 0,

	  /**
	   * Represents that an object is fully within the frustum.
	   *
	   * @type {Number}
	   * @constant
	   */
	  INSIDE: 1,
	};
	var Intersect$1 = Object.freeze(Intersect);

	/**
	 * Represents the closed interval [start, stop].
	 * @alias Interval
	 * @constructor
	 *
	 * @param {Number} [start=0.0] The beginning of the interval.
	 * @param {Number} [stop=0.0] The end of the interval.
	 */
	function Interval(start, stop) {
	  /**
	   * The beginning of the interval.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.start = defaultValue.defaultValue(start, 0.0);
	  /**
	   * The end of the interval.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.stop = defaultValue.defaultValue(stop, 0.0);
	}

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
	  this.center = Matrix3.Cartesian3.clone(defaultValue.defaultValue(center, Matrix3.Cartesian3.ZERO));

	  /**
	   * The radius of the sphere.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.radius = defaultValue.defaultValue(radius, 0.0);
	}

	const fromPointsXMin = new Matrix3.Cartesian3();
	const fromPointsYMin = new Matrix3.Cartesian3();
	const fromPointsZMin = new Matrix3.Cartesian3();
	const fromPointsXMax = new Matrix3.Cartesian3();
	const fromPointsYMax = new Matrix3.Cartesian3();
	const fromPointsZMax = new Matrix3.Cartesian3();
	const fromPointsCurrentPos = new Matrix3.Cartesian3();
	const fromPointsScratch = new Matrix3.Cartesian3();
	const fromPointsRitterCenter = new Matrix3.Cartesian3();
	const fromPointsMinBoxPt = new Matrix3.Cartesian3();
	const fromPointsMaxBoxPt = new Matrix3.Cartesian3();
	const fromPointsNaiveCenterScratch = new Matrix3.Cartesian3();
	const volumeConstant = (4.0 / 3.0) * Math$1.CesiumMath.PI;

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
	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (!defaultValue.defined(positions) || positions.length === 0) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  const currentPos = Matrix3.Cartesian3.clone(positions[0], fromPointsCurrentPos);

	  const xMin = Matrix3.Cartesian3.clone(currentPos, fromPointsXMin);
	  const yMin = Matrix3.Cartesian3.clone(currentPos, fromPointsYMin);
	  const zMin = Matrix3.Cartesian3.clone(currentPos, fromPointsZMin);

	  const xMax = Matrix3.Cartesian3.clone(currentPos, fromPointsXMax);
	  const yMax = Matrix3.Cartesian3.clone(currentPos, fromPointsYMax);
	  const zMax = Matrix3.Cartesian3.clone(currentPos, fromPointsZMax);

	  const numPositions = positions.length;
	  let i;
	  for (i = 1; i < numPositions; i++) {
	    Matrix3.Cartesian3.clone(positions[i], currentPos);

	    const x = currentPos.x;
	    const y = currentPos.y;
	    const z = currentPos.z;

	    // Store points containing the the smallest and largest components
	    if (x < xMin.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMin);
	    }

	    if (x > xMax.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMax);
	    }

	    if (y < yMin.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMin);
	    }

	    if (y > yMax.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMax);
	    }

	    if (z < zMin.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMin);
	    }

	    if (z > zMax.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMax);
	    }
	  }

	  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
	  const xSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
	  );
	  const ySpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
	  );
	  const zSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
	  );

	  // Set the diameter endpoints to the largest span.
	  let diameter1 = xMin;
	  let diameter2 = xMax;
	  let maxSpan = xSpan;
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
	  const ritterCenter = fromPointsRitterCenter;
	  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
	  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
	  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

	  // Calculate the radius of the initial sphere found by Ritter's algorithm
	  let radiusSquared = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
	  );
	  let ritterRadius = Math.sqrt(radiusSquared);

	  // Find the center of the sphere found using the Naive method.
	  const minBoxPt = fromPointsMinBoxPt;
	  minBoxPt.x = xMin.x;
	  minBoxPt.y = yMin.y;
	  minBoxPt.z = zMin.z;

	  const maxBoxPt = fromPointsMaxBoxPt;
	  maxBoxPt.x = xMax.x;
	  maxBoxPt.y = yMax.y;
	  maxBoxPt.z = zMax.z;

	  const naiveCenter = Matrix3.Cartesian3.midpoint(
	    minBoxPt,
	    maxBoxPt,
	    fromPointsNaiveCenterScratch
	  );

	  // Begin 2nd pass to find naive radius and modify the ritter sphere.
	  let naiveRadius = 0;
	  for (i = 0; i < numPositions; i++) {
	    Matrix3.Cartesian3.clone(positions[i], currentPos);

	    // Find the furthest point from the naive center to calculate the naive radius.
	    const r = Matrix3.Cartesian3.magnitude(
	      Matrix3.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
	    );
	    if (r > naiveRadius) {
	      naiveRadius = r;
	    }

	    // Make adjustments to the Ritter Sphere to include all points.
	    const oldCenterToPointSquared = Matrix3.Cartesian3.magnitudeSquared(
	      Matrix3.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
	    );
	    if (oldCenterToPointSquared > radiusSquared) {
	      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
	      // Calculate new radius to include the point that lies outside
	      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
	      radiusSquared = ritterRadius * ritterRadius;
	      // Calculate center of new Ritter sphere
	      const oldToNew = oldCenterToPoint - ritterRadius;
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
	    Matrix3.Cartesian3.clone(ritterCenter, result.center);
	    result.radius = ritterRadius;
	  } else {
	    Matrix3.Cartesian3.clone(naiveCenter, result.center);
	    result.radius = naiveRadius;
	  }

	  return result;
	};

	const defaultProjection = new GeographicProjection();
	const fromRectangle2DLowerLeft = new Matrix3.Cartesian3();
	const fromRectangle2DUpperRight = new Matrix3.Cartesian3();
	const fromRectangle2DSouthwest = new Matrix3.Cartographic();
	const fromRectangle2DNortheast = new Matrix3.Cartographic();

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
	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (!defaultValue.defined(rectangle)) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  projection = defaultValue.defaultValue(projection, defaultProjection);

	  Matrix2.Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
	  fromRectangle2DSouthwest.height = minimumHeight;
	  Matrix2.Rectangle.northeast(rectangle, fromRectangle2DNortheast);
	  fromRectangle2DNortheast.height = maximumHeight;

	  const lowerLeft = projection.project(
	    fromRectangle2DSouthwest,
	    fromRectangle2DLowerLeft
	  );
	  const upperRight = projection.project(
	    fromRectangle2DNortheast,
	    fromRectangle2DUpperRight
	  );

	  const width = upperRight.x - lowerLeft.x;
	  const height = upperRight.y - lowerLeft.y;
	  const elevation = upperRight.z - lowerLeft.z;

	  result.radius =
	    Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
	  const center = result.center;
	  center.x = lowerLeft.x + width * 0.5;
	  center.y = lowerLeft.y + height * 0.5;
	  center.z = lowerLeft.z + elevation * 0.5;
	  return result;
	};

	const fromRectangle3DScratch = [];

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
	  ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);
	  surfaceHeight = defaultValue.defaultValue(surfaceHeight, 0.0);

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (!defaultValue.defined(rectangle)) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  const positions = Matrix2.Rectangle.subsample(
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
	 * const center = new Cesium.Cartesian3(1.0, 2.0, 3.0);
	 * const points = [1.0, 2.0, 3.0, 0.1, 0.2,
	 *               4.0, 5.0, 6.0, 0.1, 0.2,
	 *               7.0, 8.0, 9.0, 0.1, 0.2];
	 * const sphere = Cesium.BoundingSphere.fromVertices(points, center, 5);
	 *
	 * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
	 */
	BoundingSphere.fromVertices = function (positions, center, stride, result) {
	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (!defaultValue.defined(positions) || positions.length === 0) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  center = defaultValue.defaultValue(center, Matrix3.Cartesian3.ZERO);

	  stride = defaultValue.defaultValue(stride, 3);

	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.number.greaterThanOrEquals("stride", stride, 3);
	  //>>includeEnd('debug');

	  const currentPos = fromPointsCurrentPos;
	  currentPos.x = positions[0] + center.x;
	  currentPos.y = positions[1] + center.y;
	  currentPos.z = positions[2] + center.z;

	  const xMin = Matrix3.Cartesian3.clone(currentPos, fromPointsXMin);
	  const yMin = Matrix3.Cartesian3.clone(currentPos, fromPointsYMin);
	  const zMin = Matrix3.Cartesian3.clone(currentPos, fromPointsZMin);

	  const xMax = Matrix3.Cartesian3.clone(currentPos, fromPointsXMax);
	  const yMax = Matrix3.Cartesian3.clone(currentPos, fromPointsYMax);
	  const zMax = Matrix3.Cartesian3.clone(currentPos, fromPointsZMax);

	  const numElements = positions.length;
	  let i;
	  for (i = 0; i < numElements; i += stride) {
	    const x = positions[i] + center.x;
	    const y = positions[i + 1] + center.y;
	    const z = positions[i + 2] + center.z;

	    currentPos.x = x;
	    currentPos.y = y;
	    currentPos.z = z;

	    // Store points containing the the smallest and largest components
	    if (x < xMin.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMin);
	    }

	    if (x > xMax.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMax);
	    }

	    if (y < yMin.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMin);
	    }

	    if (y > yMax.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMax);
	    }

	    if (z < zMin.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMin);
	    }

	    if (z > zMax.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMax);
	    }
	  }

	  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
	  const xSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
	  );
	  const ySpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
	  );
	  const zSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
	  );

	  // Set the diameter endpoints to the largest span.
	  let diameter1 = xMin;
	  let diameter2 = xMax;
	  let maxSpan = xSpan;
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
	  const ritterCenter = fromPointsRitterCenter;
	  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
	  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
	  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

	  // Calculate the radius of the initial sphere found by Ritter's algorithm
	  let radiusSquared = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
	  );
	  let ritterRadius = Math.sqrt(radiusSquared);

	  // Find the center of the sphere found using the Naive method.
	  const minBoxPt = fromPointsMinBoxPt;
	  minBoxPt.x = xMin.x;
	  minBoxPt.y = yMin.y;
	  minBoxPt.z = zMin.z;

	  const maxBoxPt = fromPointsMaxBoxPt;
	  maxBoxPt.x = xMax.x;
	  maxBoxPt.y = yMax.y;
	  maxBoxPt.z = zMax.z;

	  const naiveCenter = Matrix3.Cartesian3.midpoint(
	    minBoxPt,
	    maxBoxPt,
	    fromPointsNaiveCenterScratch
	  );

	  // Begin 2nd pass to find naive radius and modify the ritter sphere.
	  let naiveRadius = 0;
	  for (i = 0; i < numElements; i += stride) {
	    currentPos.x = positions[i] + center.x;
	    currentPos.y = positions[i + 1] + center.y;
	    currentPos.z = positions[i + 2] + center.z;

	    // Find the furthest point from the naive center to calculate the naive radius.
	    const r = Matrix3.Cartesian3.magnitude(
	      Matrix3.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
	    );
	    if (r > naiveRadius) {
	      naiveRadius = r;
	    }

	    // Make adjustments to the Ritter Sphere to include all points.
	    const oldCenterToPointSquared = Matrix3.Cartesian3.magnitudeSquared(
	      Matrix3.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
	    );
	    if (oldCenterToPointSquared > radiusSquared) {
	      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
	      // Calculate new radius to include the point that lies outside
	      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
	      radiusSquared = ritterRadius * ritterRadius;
	      // Calculate center of new Ritter sphere
	      const oldToNew = oldCenterToPoint - ritterRadius;
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
	    Matrix3.Cartesian3.clone(ritterCenter, result.center);
	    result.radius = ritterRadius;
	  } else {
	    Matrix3.Cartesian3.clone(naiveCenter, result.center);
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
	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (
	    !defaultValue.defined(positionsHigh) ||
	    !defaultValue.defined(positionsLow) ||
	    positionsHigh.length !== positionsLow.length ||
	    positionsHigh.length === 0
	  ) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  const currentPos = fromPointsCurrentPos;
	  currentPos.x = positionsHigh[0] + positionsLow[0];
	  currentPos.y = positionsHigh[1] + positionsLow[1];
	  currentPos.z = positionsHigh[2] + positionsLow[2];

	  const xMin = Matrix3.Cartesian3.clone(currentPos, fromPointsXMin);
	  const yMin = Matrix3.Cartesian3.clone(currentPos, fromPointsYMin);
	  const zMin = Matrix3.Cartesian3.clone(currentPos, fromPointsZMin);

	  const xMax = Matrix3.Cartesian3.clone(currentPos, fromPointsXMax);
	  const yMax = Matrix3.Cartesian3.clone(currentPos, fromPointsYMax);
	  const zMax = Matrix3.Cartesian3.clone(currentPos, fromPointsZMax);

	  const numElements = positionsHigh.length;
	  let i;
	  for (i = 0; i < numElements; i += 3) {
	    const x = positionsHigh[i] + positionsLow[i];
	    const y = positionsHigh[i + 1] + positionsLow[i + 1];
	    const z = positionsHigh[i + 2] + positionsLow[i + 2];

	    currentPos.x = x;
	    currentPos.y = y;
	    currentPos.z = z;

	    // Store points containing the the smallest and largest components
	    if (x < xMin.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMin);
	    }

	    if (x > xMax.x) {
	      Matrix3.Cartesian3.clone(currentPos, xMax);
	    }

	    if (y < yMin.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMin);
	    }

	    if (y > yMax.y) {
	      Matrix3.Cartesian3.clone(currentPos, yMax);
	    }

	    if (z < zMin.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMin);
	    }

	    if (z > zMax.z) {
	      Matrix3.Cartesian3.clone(currentPos, zMax);
	    }
	  }

	  // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
	  const xSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(xMax, xMin, fromPointsScratch)
	  );
	  const ySpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(yMax, yMin, fromPointsScratch)
	  );
	  const zSpan = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(zMax, zMin, fromPointsScratch)
	  );

	  // Set the diameter endpoints to the largest span.
	  let diameter1 = xMin;
	  let diameter2 = xMax;
	  let maxSpan = xSpan;
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
	  const ritterCenter = fromPointsRitterCenter;
	  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
	  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
	  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

	  // Calculate the radius of the initial sphere found by Ritter's algorithm
	  let radiusSquared = Matrix3.Cartesian3.magnitudeSquared(
	    Matrix3.Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
	  );
	  let ritterRadius = Math.sqrt(radiusSquared);

	  // Find the center of the sphere found using the Naive method.
	  const minBoxPt = fromPointsMinBoxPt;
	  minBoxPt.x = xMin.x;
	  minBoxPt.y = yMin.y;
	  minBoxPt.z = zMin.z;

	  const maxBoxPt = fromPointsMaxBoxPt;
	  maxBoxPt.x = xMax.x;
	  maxBoxPt.y = yMax.y;
	  maxBoxPt.z = zMax.z;

	  const naiveCenter = Matrix3.Cartesian3.midpoint(
	    minBoxPt,
	    maxBoxPt,
	    fromPointsNaiveCenterScratch
	  );

	  // Begin 2nd pass to find naive radius and modify the ritter sphere.
	  let naiveRadius = 0;
	  for (i = 0; i < numElements; i += 3) {
	    currentPos.x = positionsHigh[i] + positionsLow[i];
	    currentPos.y = positionsHigh[i + 1] + positionsLow[i + 1];
	    currentPos.z = positionsHigh[i + 2] + positionsLow[i + 2];

	    // Find the furthest point from the naive center to calculate the naive radius.
	    const r = Matrix3.Cartesian3.magnitude(
	      Matrix3.Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
	    );
	    if (r > naiveRadius) {
	      naiveRadius = r;
	    }

	    // Make adjustments to the Ritter Sphere to include all points.
	    const oldCenterToPointSquared = Matrix3.Cartesian3.magnitudeSquared(
	      Matrix3.Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
	    );
	    if (oldCenterToPointSquared > radiusSquared) {
	      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
	      // Calculate new radius to include the point that lies outside
	      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
	      radiusSquared = ritterRadius * ritterRadius;
	      // Calculate center of new Ritter sphere
	      const oldToNew = oldCenterToPoint - ritterRadius;
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
	    Matrix3.Cartesian3.clone(ritterCenter, result.center);
	    result.radius = ritterRadius;
	  } else {
	    Matrix3.Cartesian3.clone(naiveCenter, result.center);
	    result.radius = naiveRadius;
	  }

	  return result;
	};

	/**
	 * Computes a bounding sphere from the corner points of an axis-aligned bounding box.  The sphere
	 * tightly and fully encompasses the box.
	 *
	 * @param {Cartesian3} [corner] The minimum height over the rectangle.
	 * @param {Cartesian3} [oppositeCorner] The maximum height over the rectangle.
	 * @param {BoundingSphere} [result] The object onto which to store the result.
	 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
	 *
	 * @example
	 * // Create a bounding sphere around the unit cube
	 * const sphere = Cesium.BoundingSphere.fromCornerPoints(new Cesium.Cartesian3(-0.5, -0.5, -0.5), new Cesium.Cartesian3(0.5, 0.5, 0.5));
	 */
	BoundingSphere.fromCornerPoints = function (corner, oppositeCorner, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("corner", corner);
	  Check.Check.typeOf.object("oppositeCorner", oppositeCorner);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  const center = Matrix3.Cartesian3.midpoint(corner, oppositeCorner, result.center);
	  result.radius = Matrix3.Cartesian3.distance(center, oppositeCorner);
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
	 * const boundingSphere = Cesium.BoundingSphere.fromEllipsoid(ellipsoid);
	 */
	BoundingSphere.fromEllipsoid = function (ellipsoid, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("ellipsoid", ellipsoid);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	  result.radius = ellipsoid.maximumRadius;
	  return result;
	};

	const fromBoundingSpheresScratch = new Matrix3.Cartesian3();

	/**
	 * Computes a tight-fitting bounding sphere enclosing the provided array of bounding spheres.
	 *
	 * @param {BoundingSphere[]} [boundingSpheres] The array of bounding spheres.
	 * @param {BoundingSphere} [result] The object onto which to store the result.
	 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
	 */
	BoundingSphere.fromBoundingSpheres = function (boundingSpheres, result) {
	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  if (!defaultValue.defined(boundingSpheres) || boundingSpheres.length === 0) {
	    result.center = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.ZERO, result.center);
	    result.radius = 0.0;
	    return result;
	  }

	  const length = boundingSpheres.length;
	  if (length === 1) {
	    return BoundingSphere.clone(boundingSpheres[0], result);
	  }

	  if (length === 2) {
	    return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
	  }

	  const positions = [];
	  let i;
	  for (i = 0; i < length; i++) {
	    positions.push(boundingSpheres[i].center);
	  }

	  result = BoundingSphere.fromPoints(positions, result);

	  const center = result.center;
	  let radius = result.radius;
	  for (i = 0; i < length; i++) {
	    const tmp = boundingSpheres[i];
	    radius = Math.max(
	      radius,
	      Matrix3.Cartesian3.distance(center, tmp.center, fromBoundingSpheresScratch) +
	        tmp.radius
	    );
	  }
	  result.radius = radius;

	  return result;
	};

	const fromOrientedBoundingBoxScratchU = new Matrix3.Cartesian3();
	const fromOrientedBoundingBoxScratchV = new Matrix3.Cartesian3();
	const fromOrientedBoundingBoxScratchW = new Matrix3.Cartesian3();

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
	  Check.Check.defined("orientedBoundingBox", orientedBoundingBox);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  const halfAxes = orientedBoundingBox.halfAxes;
	  const u = Matrix3.Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
	  const v = Matrix3.Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
	  const w = Matrix3.Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);

	  Matrix3.Cartesian3.add(u, v, u);
	  Matrix3.Cartesian3.add(u, w, u);

	  result.center = Matrix3.Cartesian3.clone(orientedBoundingBox.center, result.center);
	  result.radius = Matrix3.Cartesian3.magnitude(u);

	  return result;
	};

	const scratchFromTransformationCenter = new Matrix3.Cartesian3();
	const scratchFromTransformationScale = new Matrix3.Cartesian3();

	/**
	 * Computes a tight-fitting bounding sphere enclosing the provided affine transformation.
	 *
	 * @param {Matrix4} transformation The affine transformation.
	 * @param {BoundingSphere} [result] The object onto which to store the result.
	 * @returns {BoundingSphere} The modified result parameter or a new BoundingSphere instance if none was provided.
	 */
	BoundingSphere.fromTransformation = function (transformation, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("transformation", transformation);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  const center = Matrix2.Matrix4.getTranslation(
	    transformation,
	    scratchFromTransformationCenter
	  );
	  const scale = Matrix2.Matrix4.getScale(
	    transformation,
	    scratchFromTransformationScale
	  );
	  const radius = 0.5 * Matrix3.Cartesian3.magnitude(scale);
	  result.center = Matrix3.Cartesian3.clone(center, result.center);
	  result.radius = radius;

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
	  if (!defaultValue.defined(sphere)) {
	    return undefined;
	  }

	  if (!defaultValue.defined(result)) {
	    return new BoundingSphere(sphere.center, sphere.radius);
	  }

	  result.center = Matrix3.Cartesian3.clone(sphere.center, result.center);
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
	  Check.Check.typeOf.object("value", value);
	  Check.Check.defined("array", array);
	  //>>includeEnd('debug');

	  startingIndex = defaultValue.defaultValue(startingIndex, 0);

	  const center = value.center;
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
	  Check.Check.defined("array", array);
	  //>>includeEnd('debug');

	  startingIndex = defaultValue.defaultValue(startingIndex, 0);

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  const center = result.center;
	  center.x = array[startingIndex++];
	  center.y = array[startingIndex++];
	  center.z = array[startingIndex++];
	  result.radius = array[startingIndex];
	  return result;
	};

	const unionScratch = new Matrix3.Cartesian3();
	const unionScratchCenter = new Matrix3.Cartesian3();
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
	  Check.Check.typeOf.object("left", left);
	  Check.Check.typeOf.object("right", right);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  const leftCenter = left.center;
	  const leftRadius = left.radius;
	  const rightCenter = right.center;
	  const rightRadius = right.radius;

	  const toRightCenter = Matrix3.Cartesian3.subtract(
	    rightCenter,
	    leftCenter,
	    unionScratch
	  );
	  const centerSeparation = Matrix3.Cartesian3.magnitude(toRightCenter);

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
	  const halfDistanceBetweenTangentPoints =
	    (leftRadius + centerSeparation + rightRadius) * 0.5;

	  // Compute the center point halfway between the two tangent points.
	  const center = Matrix3.Cartesian3.multiplyByScalar(
	    toRightCenter,
	    (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
	    unionScratchCenter
	  );
	  Matrix3.Cartesian3.add(center, leftCenter, center);
	  Matrix3.Cartesian3.clone(center, result.center);
	  result.radius = halfDistanceBetweenTangentPoints;

	  return result;
	};

	const expandScratch = new Matrix3.Cartesian3();
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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("point", point);
	  //>>includeEnd('debug');

	  result = BoundingSphere.clone(sphere, result);

	  const radius = Matrix3.Cartesian3.magnitude(
	    Matrix3.Cartesian3.subtract(point, result.center, expandScratch)
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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("plane", plane);
	  //>>includeEnd('debug');

	  const center = sphere.center;
	  const radius = sphere.radius;
	  const normal = plane.normal;
	  const distanceToPlane = Matrix3.Cartesian3.dot(normal, center) + plane.distance;

	  if (distanceToPlane < -radius) {
	    // The center point is negative side of the plane normal
	    return Intersect$1.OUTSIDE;
	  } else if (distanceToPlane < radius) {
	    // The center point is positive side of the plane, but radius extends beyond it; partial overlap
	    return Intersect$1.INTERSECTING;
	  }
	  return Intersect$1.INSIDE;
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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("transform", transform);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  result.center = Matrix2.Matrix4.multiplyByPoint(
	    transform,
	    sphere.center,
	    result.center
	  );
	  result.radius = Matrix2.Matrix4.getMaximumScale(transform) * sphere.radius;

	  return result;
	};

	const distanceSquaredToScratch = new Matrix3.Cartesian3();

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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("cartesian", cartesian);
	  //>>includeEnd('debug');

	  const diff = Matrix3.Cartesian3.subtract(
	    sphere.center,
	    cartesian,
	    distanceSquaredToScratch
	  );

	  const distance = Matrix3.Cartesian3.magnitude(diff) - sphere.radius;
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
	 * const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
	 * const boundingSphere = new Cesium.BoundingSphere();
	 * const newBoundingSphere = Cesium.BoundingSphere.transformWithoutScale(boundingSphere, modelMatrix);
	 */
	BoundingSphere.transformWithoutScale = function (sphere, transform, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("transform", transform);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new BoundingSphere();
	  }

	  result.center = Matrix2.Matrix4.multiplyByPoint(
	    transform,
	    sphere.center,
	    result.center
	  );
	  result.radius = sphere.radius;

	  return result;
	};

	const scratchCartesian3 = new Matrix3.Cartesian3();
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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("position", position);
	  Check.Check.typeOf.object("direction", direction);
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new Interval();
	  }

	  const toCenter = Matrix3.Cartesian3.subtract(
	    sphere.center,
	    position,
	    scratchCartesian3
	  );
	  const mag = Matrix3.Cartesian3.dot(direction, toCenter);

	  result.start = mag - sphere.radius;
	  result.stop = mag + sphere.radius;
	  return result;
	};

	const projectTo2DNormalScratch = new Matrix3.Cartesian3();
	const projectTo2DEastScratch = new Matrix3.Cartesian3();
	const projectTo2DNorthScratch = new Matrix3.Cartesian3();
	const projectTo2DWestScratch = new Matrix3.Cartesian3();
	const projectTo2DSouthScratch = new Matrix3.Cartesian3();
	const projectTo2DCartographicScratch = new Matrix3.Cartographic();
	const projectTo2DPositionsScratch = new Array(8);
	for (let n = 0; n < 8; ++n) {
	  projectTo2DPositionsScratch[n] = new Matrix3.Cartesian3();
	}

	const projectTo2DProjection = new GeographicProjection();
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
	  Check.Check.typeOf.object("sphere", sphere);
	  //>>includeEnd('debug');

	  projection = defaultValue.defaultValue(projection, projectTo2DProjection);

	  const ellipsoid = projection.ellipsoid;
	  let center = sphere.center;
	  const radius = sphere.radius;

	  let normal;
	  if (Matrix3.Cartesian3.equals(center, Matrix3.Cartesian3.ZERO)) {
	    // Bounding sphere is at the center. The geodetic surface normal is not
	    // defined here so pick the x-axis as a fallback.
	    normal = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.UNIT_X, projectTo2DNormalScratch);
	  } else {
	    normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
	  }
	  const east = Matrix3.Cartesian3.cross(
	    Matrix3.Cartesian3.UNIT_Z,
	    normal,
	    projectTo2DEastScratch
	  );
	  Matrix3.Cartesian3.normalize(east, east);
	  const north = Matrix3.Cartesian3.cross(normal, east, projectTo2DNorthScratch);
	  Matrix3.Cartesian3.normalize(north, north);

	  Matrix3.Cartesian3.multiplyByScalar(normal, radius, normal);
	  Matrix3.Cartesian3.multiplyByScalar(north, radius, north);
	  Matrix3.Cartesian3.multiplyByScalar(east, radius, east);

	  const south = Matrix3.Cartesian3.negate(north, projectTo2DSouthScratch);
	  const west = Matrix3.Cartesian3.negate(east, projectTo2DWestScratch);

	  const positions = projectTo2DPositionsScratch;

	  // top NE corner
	  let corner = positions[0];
	  Matrix3.Cartesian3.add(normal, north, corner);
	  Matrix3.Cartesian3.add(corner, east, corner);

	  // top NW corner
	  corner = positions[1];
	  Matrix3.Cartesian3.add(normal, north, corner);
	  Matrix3.Cartesian3.add(corner, west, corner);

	  // top SW corner
	  corner = positions[2];
	  Matrix3.Cartesian3.add(normal, south, corner);
	  Matrix3.Cartesian3.add(corner, west, corner);

	  // top SE corner
	  corner = positions[3];
	  Matrix3.Cartesian3.add(normal, south, corner);
	  Matrix3.Cartesian3.add(corner, east, corner);

	  Matrix3.Cartesian3.negate(normal, normal);

	  // bottom NE corner
	  corner = positions[4];
	  Matrix3.Cartesian3.add(normal, north, corner);
	  Matrix3.Cartesian3.add(corner, east, corner);

	  // bottom NW corner
	  corner = positions[5];
	  Matrix3.Cartesian3.add(normal, north, corner);
	  Matrix3.Cartesian3.add(corner, west, corner);

	  // bottom SW corner
	  corner = positions[6];
	  Matrix3.Cartesian3.add(normal, south, corner);
	  Matrix3.Cartesian3.add(corner, west, corner);

	  // bottom SE corner
	  corner = positions[7];
	  Matrix3.Cartesian3.add(normal, south, corner);
	  Matrix3.Cartesian3.add(corner, east, corner);

	  const length = positions.length;
	  for (let i = 0; i < length; ++i) {
	    const position = positions[i];
	    Matrix3.Cartesian3.add(center, position, position);
	    const cartographic = ellipsoid.cartesianToCartographic(
	      position,
	      projectTo2DCartographicScratch
	    );
	    projection.project(cartographic, position);
	  }

	  result = BoundingSphere.fromPoints(positions, result);

	  // swizzle center components
	  center = result.center;
	  const x = center.x;
	  const y = center.y;
	  const z = center.z;
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
	  Check.Check.typeOf.object("sphere", sphere);
	  Check.Check.typeOf.object("occluder", occluder);
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
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      Matrix3.Cartesian3.equals(left.center, right.center) &&
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
	  const radius = this.radius;
	  return volumeConstant * radius * radius * radius;
	};

	let _supportsFullscreen;
	const _names = {
	  requestFullscreen: undefined,
	  exitFullscreen: undefined,
	  fullscreenEnabled: undefined,
	  fullscreenElement: undefined,
	  fullscreenchange: undefined,
	  fullscreenerror: undefined,
	};

	/**
	 * Browser-independent functions for working with the standard fullscreen API.
	 *
	 * @namespace Fullscreen
	 *
	 * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
	 */
	const Fullscreen = {};

	Object.defineProperties(Fullscreen, {
	  /**
	   * The element that is currently fullscreen, if any.  To simply check if the
	   * browser is in fullscreen mode or not, use {@link Fullscreen#fullscreen}.
	   * @memberof Fullscreen
	   * @type {Object}
	   * @readonly
	   */
	  element: {
	    get: function () {
	      if (!Fullscreen.supportsFullscreen()) {
	        return undefined;
	      }

	      return document[_names.fullscreenElement];
	    },
	  },

	  /**
	   * The name of the event on the document that is fired when fullscreen is
	   * entered or exited.  This event name is intended for use with addEventListener.
	   * In your event handler, to determine if the browser is in fullscreen mode or not,
	   * use {@link Fullscreen#fullscreen}.
	   * @memberof Fullscreen
	   * @type {String}
	   * @readonly
	   */
	  changeEventName: {
	    get: function () {
	      if (!Fullscreen.supportsFullscreen()) {
	        return undefined;
	      }

	      return _names.fullscreenchange;
	    },
	  },

	  /**
	   * The name of the event that is fired when a fullscreen error
	   * occurs.  This event name is intended for use with addEventListener.
	   * @memberof Fullscreen
	   * @type {String}
	   * @readonly
	   */
	  errorEventName: {
	    get: function () {
	      if (!Fullscreen.supportsFullscreen()) {
	        return undefined;
	      }

	      return _names.fullscreenerror;
	    },
	  },

	  /**
	   * Determine whether the browser will allow an element to be made fullscreen, or not.
	   * For example, by default, iframes cannot go fullscreen unless the containing page
	   * adds an "allowfullscreen" attribute (or prefixed equivalent).
	   * @memberof Fullscreen
	   * @type {Boolean}
	   * @readonly
	   */
	  enabled: {
	    get: function () {
	      if (!Fullscreen.supportsFullscreen()) {
	        return undefined;
	      }

	      return document[_names.fullscreenEnabled];
	    },
	  },

	  /**
	   * Determines if the browser is currently in fullscreen mode.
	   * @memberof Fullscreen
	   * @type {Boolean}
	   * @readonly
	   */
	  fullscreen: {
	    get: function () {
	      if (!Fullscreen.supportsFullscreen()) {
	        return undefined;
	      }

	      return Fullscreen.element !== null;
	    },
	  },
	});

	/**
	 * Detects whether the browser supports the standard fullscreen API.
	 *
	 * @returns {Boolean} <code>true</code> if the browser supports the standard fullscreen API,
	 * <code>false</code> otherwise.
	 */
	Fullscreen.supportsFullscreen = function () {
	  if (defaultValue.defined(_supportsFullscreen)) {
	    return _supportsFullscreen;
	  }

	  _supportsFullscreen = false;

	  const body = document.body;
	  if (typeof body.requestFullscreen === "function") {
	    // go with the unprefixed, standard set of names
	    _names.requestFullscreen = "requestFullscreen";
	    _names.exitFullscreen = "exitFullscreen";
	    _names.fullscreenEnabled = "fullscreenEnabled";
	    _names.fullscreenElement = "fullscreenElement";
	    _names.fullscreenchange = "fullscreenchange";
	    _names.fullscreenerror = "fullscreenerror";
	    _supportsFullscreen = true;
	    return _supportsFullscreen;
	  }

	  //check for the correct combination of prefix plus the various names that browsers use
	  const prefixes = ["webkit", "moz", "o", "ms", "khtml"];
	  let name;
	  for (let i = 0, len = prefixes.length; i < len; ++i) {
	    const prefix = prefixes[i];

	    // casing of Fullscreen differs across browsers
	    name = `${prefix}RequestFullscreen`;
	    if (typeof body[name] === "function") {
	      _names.requestFullscreen = name;
	      _supportsFullscreen = true;
	    } else {
	      name = `${prefix}RequestFullScreen`;
	      if (typeof body[name] === "function") {
	        _names.requestFullscreen = name;
	        _supportsFullscreen = true;
	      }
	    }

	    // disagreement about whether it's "exit" as per spec, or "cancel"
	    name = `${prefix}ExitFullscreen`;
	    if (typeof document[name] === "function") {
	      _names.exitFullscreen = name;
	    } else {
	      name = `${prefix}CancelFullScreen`;
	      if (typeof document[name] === "function") {
	        _names.exitFullscreen = name;
	      }
	    }

	    // casing of Fullscreen differs across browsers
	    name = `${prefix}FullscreenEnabled`;
	    if (document[name] !== undefined) {
	      _names.fullscreenEnabled = name;
	    } else {
	      name = `${prefix}FullScreenEnabled`;
	      if (document[name] !== undefined) {
	        _names.fullscreenEnabled = name;
	      }
	    }

	    // casing of Fullscreen differs across browsers
	    name = `${prefix}FullscreenElement`;
	    if (document[name] !== undefined) {
	      _names.fullscreenElement = name;
	    } else {
	      name = `${prefix}FullScreenElement`;
	      if (document[name] !== undefined) {
	        _names.fullscreenElement = name;
	      }
	    }

	    // thankfully, event names are all lowercase per spec
	    name = `${prefix}fullscreenchange`;
	    // event names do not have 'on' in the front, but the property on the document does
	    if (document[`on${name}`] !== undefined) {
	      //except on IE
	      if (prefix === "ms") {
	        name = "MSFullscreenChange";
	      }
	      _names.fullscreenchange = name;
	    }

	    name = `${prefix}fullscreenerror`;
	    if (document[`on${name}`] !== undefined) {
	      //except on IE
	      if (prefix === "ms") {
	        name = "MSFullscreenError";
	      }
	      _names.fullscreenerror = name;
	    }
	  }

	  return _supportsFullscreen;
	};

	/**
	 * Asynchronously requests the browser to enter fullscreen mode on the given element.
	 * If fullscreen mode is not supported by the browser, does nothing.
	 *
	 * @param {Object} element The HTML element which will be placed into fullscreen mode.
	 * @param {Object} [vrDevice] The HMDVRDevice device.
	 *
	 * @example
	 * // Put the entire page into fullscreen.
	 * Cesium.Fullscreen.requestFullscreen(document.body)
	 *
	 * // Place only the Cesium canvas into fullscreen.
	 * Cesium.Fullscreen.requestFullscreen(scene.canvas)
	 */
	Fullscreen.requestFullscreen = function (element, vrDevice) {
	  if (!Fullscreen.supportsFullscreen()) {
	    return;
	  }

	  element[_names.requestFullscreen]({ vrDisplay: vrDevice });
	};

	/**
	 * Asynchronously exits fullscreen mode.  If the browser is not currently
	 * in fullscreen, or if fullscreen mode is not supported by the browser, does nothing.
	 */
	Fullscreen.exitFullscreen = function () {
	  if (!Fullscreen.supportsFullscreen()) {
	    return;
	  }

	  document[_names.exitFullscreen]();
	};

	//For unit tests
	Fullscreen._names = _names;
	var Fullscreen$1 = Fullscreen;

	let theNavigator;
	if (typeof navigator !== "undefined") {
	  theNavigator = navigator;
	} else {
	  theNavigator = {};
	}

	function extractVersion(versionString) {
	  const parts = versionString.split(".");
	  for (let i = 0, len = parts.length; i < len; ++i) {
	    parts[i] = parseInt(parts[i], 10);
	  }
	  return parts;
	}

	let isChromeResult;
	let chromeVersionResult;
	function isChrome() {
	  if (!defaultValue.defined(isChromeResult)) {
	    isChromeResult = false;
	    // Edge contains Chrome in the user agent too
	    if (!isEdge()) {
	      const fields = / Chrome\/([\.0-9]+)/.exec(theNavigator.userAgent);
	      if (fields !== null) {
	        isChromeResult = true;
	        chromeVersionResult = extractVersion(fields[1]);
	      }
	    }
	  }

	  return isChromeResult;
	}

	function chromeVersion() {
	  return isChrome() && chromeVersionResult;
	}

	let isSafariResult;
	let safariVersionResult;
	function isSafari() {
	  if (!defaultValue.defined(isSafariResult)) {
	    isSafariResult = false;

	    // Chrome and Edge contain Safari in the user agent too
	    if (
	      !isChrome() &&
	      !isEdge() &&
	      / Safari\/[\.0-9]+/.test(theNavigator.userAgent)
	    ) {
	      const fields = / Version\/([\.0-9]+)/.exec(theNavigator.userAgent);
	      if (fields !== null) {
	        isSafariResult = true;
	        safariVersionResult = extractVersion(fields[1]);
	      }
	    }
	  }

	  return isSafariResult;
	}

	function safariVersion() {
	  return isSafari() && safariVersionResult;
	}

	let isWebkitResult;
	let webkitVersionResult;
	function isWebkit() {
	  if (!defaultValue.defined(isWebkitResult)) {
	    isWebkitResult = false;

	    const fields = / AppleWebKit\/([\.0-9]+)(\+?)/.exec(theNavigator.userAgent);
	    if (fields !== null) {
	      isWebkitResult = true;
	      webkitVersionResult = extractVersion(fields[1]);
	      webkitVersionResult.isNightly = !!fields[2];
	    }
	  }

	  return isWebkitResult;
	}

	function webkitVersion() {
	  return isWebkit() && webkitVersionResult;
	}

	let isInternetExplorerResult;
	let internetExplorerVersionResult;
	function isInternetExplorer() {
	  if (!defaultValue.defined(isInternetExplorerResult)) {
	    isInternetExplorerResult = false;

	    let fields;
	    if (theNavigator.appName === "Microsoft Internet Explorer") {
	      fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(theNavigator.userAgent);
	      if (fields !== null) {
	        isInternetExplorerResult = true;
	        internetExplorerVersionResult = extractVersion(fields[1]);
	      }
	    } else if (theNavigator.appName === "Netscape") {
	      fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(
	        theNavigator.userAgent
	      );
	      if (fields !== null) {
	        isInternetExplorerResult = true;
	        internetExplorerVersionResult = extractVersion(fields[1]);
	      }
	    }
	  }
	  return isInternetExplorerResult;
	}

	function internetExplorerVersion() {
	  return isInternetExplorer() && internetExplorerVersionResult;
	}

	let isEdgeResult;
	let edgeVersionResult;
	function isEdge() {
	  if (!defaultValue.defined(isEdgeResult)) {
	    isEdgeResult = false;
	    const fields = / Edg\/([\.0-9]+)/.exec(theNavigator.userAgent);
	    if (fields !== null) {
	      isEdgeResult = true;
	      edgeVersionResult = extractVersion(fields[1]);
	    }
	  }
	  return isEdgeResult;
	}

	function edgeVersion() {
	  return isEdge() && edgeVersionResult;
	}

	let isFirefoxResult;
	let firefoxVersionResult;
	function isFirefox() {
	  if (!defaultValue.defined(isFirefoxResult)) {
	    isFirefoxResult = false;

	    const fields = /Firefox\/([\.0-9]+)/.exec(theNavigator.userAgent);
	    if (fields !== null) {
	      isFirefoxResult = true;
	      firefoxVersionResult = extractVersion(fields[1]);
	    }
	  }
	  return isFirefoxResult;
	}

	let isWindowsResult;
	function isWindows() {
	  if (!defaultValue.defined(isWindowsResult)) {
	    isWindowsResult = /Windows/i.test(theNavigator.appVersion);
	  }
	  return isWindowsResult;
	}

	let isIPadOrIOSResult;
	function isIPadOrIOS() {
	  if (!defaultValue.defined(isIPadOrIOSResult)) {
	    isIPadOrIOSResult =
	      navigator.platform === "iPhone" ||
	      navigator.platform === "iPod" ||
	      navigator.platform === "iPad";
	  }

	  return isIPadOrIOSResult;
	}

	function firefoxVersion() {
	  return isFirefox() && firefoxVersionResult;
	}

	let hasPointerEvents;
	function supportsPointerEvents() {
	  if (!defaultValue.defined(hasPointerEvents)) {
	    //While navigator.pointerEnabled is deprecated in the W3C specification
	    //we still need to use it if it exists in order to support browsers
	    //that rely on it, such as the Windows WebBrowser control which defines
	    //PointerEvent but sets navigator.pointerEnabled to false.

	    //Firefox disabled because of https://github.com/CesiumGS/cesium/issues/6372
	    hasPointerEvents =
	      !isFirefox() &&
	      typeof PointerEvent !== "undefined" &&
	      (!defaultValue.defined(theNavigator.pointerEnabled) || theNavigator.pointerEnabled);
	  }
	  return hasPointerEvents;
	}

	let imageRenderingValueResult;
	let supportsImageRenderingPixelatedResult;
	function supportsImageRenderingPixelated() {
	  if (!defaultValue.defined(supportsImageRenderingPixelatedResult)) {
	    const canvas = document.createElement("canvas");
	    canvas.setAttribute(
	      "style",
	      "image-rendering: -moz-crisp-edges;" + "image-rendering: pixelated;"
	    );
	    //canvas.style.imageRendering will be undefined, null or an empty string on unsupported browsers.
	    const tmp = canvas.style.imageRendering;
	    supportsImageRenderingPixelatedResult = defaultValue.defined(tmp) && tmp !== "";
	    if (supportsImageRenderingPixelatedResult) {
	      imageRenderingValueResult = tmp;
	    }
	  }
	  return supportsImageRenderingPixelatedResult;
	}

	function imageRenderingValue() {
	  return supportsImageRenderingPixelated()
	    ? imageRenderingValueResult
	    : undefined;
	}

	function supportsWebP() {
	  //>>includeStart('debug', pragmas.debug);
	  if (!supportsWebP.initialized) {
	    throw new Check.DeveloperError(
	      "You must call FeatureDetection.supportsWebP.initialize and wait for the promise to resolve before calling FeatureDetection.supportsWebP"
	    );
	  }
	  //>>includeEnd('debug');
	  return supportsWebP._result;
	}
	supportsWebP._promise = undefined;
	supportsWebP._result = undefined;
	supportsWebP.initialize = function () {
	  // From https://developers.google.com/speed/webp/faq#how_can_i_detect_browser_support_for_webp
	  if (defaultValue.defined(supportsWebP._promise)) {
	    return supportsWebP._promise;
	  }

	  supportsWebP._promise = new Promise((resolve) => {
	    const image = new Image();
	    image.onload = function () {
	      supportsWebP._result = image.width > 0 && image.height > 0;
	      resolve(supportsWebP._result);
	    };

	    image.onerror = function () {
	      supportsWebP._result = false;
	      resolve(supportsWebP._result);
	    };
	    image.src =
	      "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
	  });

	  return supportsWebP._promise;
	};
	Object.defineProperties(supportsWebP, {
	  initialized: {
	    get: function () {
	      return defaultValue.defined(supportsWebP._result);
	    },
	  },
	});

	const typedArrayTypes = [];
	if (typeof ArrayBuffer !== "undefined") {
	  typedArrayTypes.push(
	    Int8Array,
	    Uint8Array,
	    Int16Array,
	    Uint16Array,
	    Int32Array,
	    Uint32Array,
	    Float32Array,
	    Float64Array
	  );

	  if (typeof Uint8ClampedArray !== "undefined") {
	    typedArrayTypes.push(Uint8ClampedArray);
	  }

	  if (typeof Uint8ClampedArray !== "undefined") {
	    typedArrayTypes.push(Uint8ClampedArray);
	  }

	  if (typeof BigInt64Array !== "undefined") {
	    // eslint-disable-next-line no-undef
	    typedArrayTypes.push(BigInt64Array);
	  }

	  if (typeof BigUint64Array !== "undefined") {
	    // eslint-disable-next-line no-undef
	    typedArrayTypes.push(BigUint64Array);
	  }
	}

	/**
	 * A set of functions to detect whether the current browser supports
	 * various features.
	 *
	 * @namespace FeatureDetection
	 */
	const FeatureDetection = {
	  isChrome: isChrome,
	  chromeVersion: chromeVersion,
	  isSafari: isSafari,
	  safariVersion: safariVersion,
	  isWebkit: isWebkit,
	  webkitVersion: webkitVersion,
	  isInternetExplorer: isInternetExplorer,
	  internetExplorerVersion: internetExplorerVersion,
	  isEdge: isEdge,
	  edgeVersion: edgeVersion,
	  isFirefox: isFirefox,
	  firefoxVersion: firefoxVersion,
	  isWindows: isWindows,
	  isIPadOrIOS: isIPadOrIOS,
	  hardwareConcurrency: defaultValue.defaultValue(theNavigator.hardwareConcurrency, 3),
	  supportsPointerEvents: supportsPointerEvents,
	  supportsImageRenderingPixelated: supportsImageRenderingPixelated,
	  supportsWebP: supportsWebP,
	  imageRenderingValue: imageRenderingValue,
	  typedArrayTypes: typedArrayTypes,
	};

	/**
	 * Detects whether the current browser supports Basis Universal textures and the web assembly modules needed to transcode them.
	 *
	 * @param {Scene} scene
	 * @returns {Boolean} true if the browser supports web assembly modules and the scene supports Basis Universal textures, false if not.
	 */
	FeatureDetection.supportsBasis = function (scene) {
	  return FeatureDetection.supportsWebAssembly() && scene.context.supportsBasis;
	};

	/**
	 * Detects whether the current browser supports the full screen standard.
	 *
	 * @returns {Boolean} true if the browser supports the full screen standard, false if not.
	 *
	 * @see Fullscreen
	 * @see {@link http://dvcs.w3.org/hg/fullscreen/raw-file/tip/Overview.html|W3C Fullscreen Living Specification}
	 */
	FeatureDetection.supportsFullscreen = function () {
	  return Fullscreen$1.supportsFullscreen();
	};

	/**
	 * Detects whether the current browser supports typed arrays.
	 *
	 * @returns {Boolean} true if the browser supports typed arrays, false if not.
	 *
	 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
	 */
	FeatureDetection.supportsTypedArrays = function () {
	  return typeof ArrayBuffer !== "undefined";
	};

	/**
	 * Detects whether the current browser supports BigInt64Array typed arrays.
	 *
	 * @returns {Boolean} true if the browser supports BigInt64Array typed arrays, false if not.
	 *
	 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
	 */
	FeatureDetection.supportsBigInt64Array = function () {
	  return typeof BigInt64Array !== "undefined";
	};

	/**
	 * Detects whether the current browser supports BigUint64Array typed arrays.
	 *
	 * @returns {Boolean} true if the browser supports BigUint64Array typed arrays, false if not.
	 *
	 * @see {@link https://tc39.es/ecma262/#sec-typedarray-objects|Typed Array Specification}
	 */
	FeatureDetection.supportsBigUint64Array = function () {
	  return typeof BigUint64Array !== "undefined";
	};

	/**
	 * Detects whether the current browser supports BigInt.
	 *
	 * @returns {Boolean} true if the browser supports BigInt, false if not.
	 *
	 * @see {@link https://tc39.es/ecma262/#sec-bigint-objects|BigInt Specification}
	 */
	FeatureDetection.supportsBigInt = function () {
	  return typeof BigInt !== "undefined";
	};

	/**
	 * Detects whether the current browser supports Web Workers.
	 *
	 * @returns {Boolean} true if the browsers supports Web Workers, false if not.
	 *
	 * @see {@link http://www.w3.org/TR/workers/}
	 */
	FeatureDetection.supportsWebWorkers = function () {
	  return typeof Worker !== "undefined";
	};

	/**
	 * Detects whether the current browser supports Web Assembly.
	 *
	 * @returns {Boolean} true if the browsers supports Web Assembly, false if not.
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/WebAssembly}
	 */
	FeatureDetection.supportsWebAssembly = function () {
	  return typeof WebAssembly !== "undefined";
	};
	var FeatureDetection$1 = FeatureDetection;

	/**
	 * A set of 4-dimensional coordinates used to represent rotation in 3-dimensional space.
	 * @alias Quaternion
	 * @constructor
	 *
	 * @param {Number} [x=0.0] The X component.
	 * @param {Number} [y=0.0] The Y component.
	 * @param {Number} [z=0.0] The Z component.
	 * @param {Number} [w=0.0] The W component.
	 *
	 * @see PackableForInterpolation
	 */
	function Quaternion(x, y, z, w) {
	  /**
	   * The X component.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.x = defaultValue.defaultValue(x, 0.0);

	  /**
	   * The Y component.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.y = defaultValue.defaultValue(y, 0.0);

	  /**
	   * The Z component.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.z = defaultValue.defaultValue(z, 0.0);

	  /**
	   * The W component.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.w = defaultValue.defaultValue(w, 0.0);
	}

	let fromAxisAngleScratch = new Matrix3.Cartesian3();

	/**
	 * Computes a quaternion representing a rotation around an axis.
	 *
	 * @param {Cartesian3} axis The axis of rotation.
	 * @param {Number} angle The angle in radians to rotate around the axis.
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
	 */
	Quaternion.fromAxisAngle = function (axis, angle, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("axis", axis);
	  Check.Check.typeOf.number("angle", angle);
	  //>>includeEnd('debug');

	  const halfAngle = angle / 2.0;
	  const s = Math.sin(halfAngle);
	  fromAxisAngleScratch = Matrix3.Cartesian3.normalize(axis, fromAxisAngleScratch);

	  const x = fromAxisAngleScratch.x * s;
	  const y = fromAxisAngleScratch.y * s;
	  const z = fromAxisAngleScratch.z * s;
	  const w = Math.cos(halfAngle);
	  if (!defaultValue.defined(result)) {
	    return new Quaternion(x, y, z, w);
	  }
	  result.x = x;
	  result.y = y;
	  result.z = z;
	  result.w = w;
	  return result;
	};

	const fromRotationMatrixNext = [1, 2, 0];
	const fromRotationMatrixQuat = new Array(3);
	/**
	 * Computes a Quaternion from the provided Matrix3 instance.
	 *
	 * @param {Matrix3} matrix The rotation matrix.
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
	 *
	 * @see Matrix3.fromQuaternion
	 */
	Quaternion.fromRotationMatrix = function (matrix, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("matrix", matrix);
	  //>>includeEnd('debug');

	  let root;
	  let x;
	  let y;
	  let z;
	  let w;

	  const m00 = matrix[Matrix3.Matrix3.COLUMN0ROW0];
	  const m11 = matrix[Matrix3.Matrix3.COLUMN1ROW1];
	  const m22 = matrix[Matrix3.Matrix3.COLUMN2ROW2];
	  const trace = m00 + m11 + m22;

	  if (trace > 0.0) {
	    // |w| > 1/2, may as well choose w > 1/2
	    root = Math.sqrt(trace + 1.0); // 2w
	    w = 0.5 * root;
	    root = 0.5 / root; // 1/(4w)

	    x = (matrix[Matrix3.Matrix3.COLUMN1ROW2] - matrix[Matrix3.Matrix3.COLUMN2ROW1]) * root;
	    y = (matrix[Matrix3.Matrix3.COLUMN2ROW0] - matrix[Matrix3.Matrix3.COLUMN0ROW2]) * root;
	    z = (matrix[Matrix3.Matrix3.COLUMN0ROW1] - matrix[Matrix3.Matrix3.COLUMN1ROW0]) * root;
	  } else {
	    // |w| <= 1/2
	    const next = fromRotationMatrixNext;

	    let i = 0;
	    if (m11 > m00) {
	      i = 1;
	    }
	    if (m22 > m00 && m22 > m11) {
	      i = 2;
	    }
	    const j = next[i];
	    const k = next[j];

	    root = Math.sqrt(
	      matrix[Matrix3.Matrix3.getElementIndex(i, i)] -
	        matrix[Matrix3.Matrix3.getElementIndex(j, j)] -
	        matrix[Matrix3.Matrix3.getElementIndex(k, k)] +
	        1.0
	    );

	    const quat = fromRotationMatrixQuat;
	    quat[i] = 0.5 * root;
	    root = 0.5 / root;
	    w =
	      (matrix[Matrix3.Matrix3.getElementIndex(k, j)] -
	        matrix[Matrix3.Matrix3.getElementIndex(j, k)]) *
	      root;
	    quat[j] =
	      (matrix[Matrix3.Matrix3.getElementIndex(j, i)] +
	        matrix[Matrix3.Matrix3.getElementIndex(i, j)]) *
	      root;
	    quat[k] =
	      (matrix[Matrix3.Matrix3.getElementIndex(k, i)] +
	        matrix[Matrix3.Matrix3.getElementIndex(i, k)]) *
	      root;

	    x = -quat[0];
	    y = -quat[1];
	    z = -quat[2];
	  }

	  if (!defaultValue.defined(result)) {
	    return new Quaternion(x, y, z, w);
	  }
	  result.x = x;
	  result.y = y;
	  result.z = z;
	  result.w = w;
	  return result;
	};

	const scratchHPRQuaternion$1 = new Quaternion();
	let scratchHeadingQuaternion = new Quaternion();
	let scratchPitchQuaternion = new Quaternion();
	let scratchRollQuaternion = new Quaternion();

	/**
	 * Computes a rotation from the given heading, pitch and roll angles. Heading is the rotation about the
	 * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
	 * the positive x axis.
	 *
	 * @param {HeadingPitchRoll} headingPitchRoll The rotation expressed as a heading, pitch and roll.
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
	 */
	Quaternion.fromHeadingPitchRoll = function (headingPitchRoll, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("headingPitchRoll", headingPitchRoll);
	  //>>includeEnd('debug');

	  scratchRollQuaternion = Quaternion.fromAxisAngle(
	    Matrix3.Cartesian3.UNIT_X,
	    headingPitchRoll.roll,
	    scratchHPRQuaternion$1
	  );
	  scratchPitchQuaternion = Quaternion.fromAxisAngle(
	    Matrix3.Cartesian3.UNIT_Y,
	    -headingPitchRoll.pitch,
	    result
	  );
	  result = Quaternion.multiply(
	    scratchPitchQuaternion,
	    scratchRollQuaternion,
	    scratchPitchQuaternion
	  );
	  scratchHeadingQuaternion = Quaternion.fromAxisAngle(
	    Matrix3.Cartesian3.UNIT_Z,
	    -headingPitchRoll.heading,
	    scratchHPRQuaternion$1
	  );
	  return Quaternion.multiply(scratchHeadingQuaternion, result, result);
	};

	const sampledQuaternionAxis = new Matrix3.Cartesian3();
	const sampledQuaternionRotation = new Matrix3.Cartesian3();
	const sampledQuaternionTempQuaternion = new Quaternion();
	const sampledQuaternionQuaternion0 = new Quaternion();
	const sampledQuaternionQuaternion0Conjugate = new Quaternion();

	/**
	 * The number of elements used to pack the object into an array.
	 * @type {Number}
	 */
	Quaternion.packedLength = 4;

	/**
	 * Stores the provided instance into the provided array.
	 *
	 * @param {Quaternion} value The value to pack.
	 * @param {Number[]} array The array to pack into.
	 * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
	 *
	 * @returns {Number[]} The array that was packed into
	 */
	Quaternion.pack = function (value, array, startingIndex) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("value", value);
	  Check.Check.defined("array", array);
	  //>>includeEnd('debug');

	  startingIndex = defaultValue.defaultValue(startingIndex, 0);

	  array[startingIndex++] = value.x;
	  array[startingIndex++] = value.y;
	  array[startingIndex++] = value.z;
	  array[startingIndex] = value.w;

	  return array;
	};

	/**
	 * Retrieves an instance from a packed array.
	 *
	 * @param {Number[]} array The packed array.
	 * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
	 * @param {Quaternion} [result] The object into which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
	 */
	Quaternion.unpack = function (array, startingIndex, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.defined("array", array);
	  //>>includeEnd('debug');

	  startingIndex = defaultValue.defaultValue(startingIndex, 0);

	  if (!defaultValue.defined(result)) {
	    result = new Quaternion();
	  }
	  result.x = array[startingIndex];
	  result.y = array[startingIndex + 1];
	  result.z = array[startingIndex + 2];
	  result.w = array[startingIndex + 3];
	  return result;
	};

	/**
	 * The number of elements used to store the object into an array in its interpolatable form.
	 * @type {Number}
	 */
	Quaternion.packedInterpolationLength = 3;

	/**
	 * Converts a packed array into a form suitable for interpolation.
	 *
	 * @param {Number[]} packedArray The packed array.
	 * @param {Number} [startingIndex=0] The index of the first element to be converted.
	 * @param {Number} [lastIndex=packedArray.length] The index of the last element to be converted.
	 * @param {Number[]} [result] The object into which to store the result.
	 */
	Quaternion.convertPackedArrayForInterpolation = function (
	  packedArray,
	  startingIndex,
	  lastIndex,
	  result
	) {
	  Quaternion.unpack(
	    packedArray,
	    lastIndex * 4,
	    sampledQuaternionQuaternion0Conjugate
	  );
	  Quaternion.conjugate(
	    sampledQuaternionQuaternion0Conjugate,
	    sampledQuaternionQuaternion0Conjugate
	  );

	  for (let i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
	    const offset = i * 3;
	    Quaternion.unpack(
	      packedArray,
	      (startingIndex + i) * 4,
	      sampledQuaternionTempQuaternion
	    );

	    Quaternion.multiply(
	      sampledQuaternionTempQuaternion,
	      sampledQuaternionQuaternion0Conjugate,
	      sampledQuaternionTempQuaternion
	    );

	    if (sampledQuaternionTempQuaternion.w < 0) {
	      Quaternion.negate(
	        sampledQuaternionTempQuaternion,
	        sampledQuaternionTempQuaternion
	      );
	    }

	    Quaternion.computeAxis(
	      sampledQuaternionTempQuaternion,
	      sampledQuaternionAxis
	    );
	    const angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion);
	    if (!defaultValue.defined(result)) {
	      result = [];
	    }
	    result[offset] = sampledQuaternionAxis.x * angle;
	    result[offset + 1] = sampledQuaternionAxis.y * angle;
	    result[offset + 2] = sampledQuaternionAxis.z * angle;
	  }
	};

	/**
	 * Retrieves an instance from a packed array converted with {@link convertPackedArrayForInterpolation}.
	 *
	 * @param {Number[]} array The array previously packed for interpolation.
	 * @param {Number[]} sourceArray The original packed array.
	 * @param {Number} [firstIndex=0] The firstIndex used to convert the array.
	 * @param {Number} [lastIndex=packedArray.length] The lastIndex used to convert the array.
	 * @param {Quaternion} [result] The object into which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
	 */
	Quaternion.unpackInterpolationResult = function (
	  array,
	  sourceArray,
	  firstIndex,
	  lastIndex,
	  result
	) {
	  if (!defaultValue.defined(result)) {
	    result = new Quaternion();
	  }
	  Matrix3.Cartesian3.fromArray(array, 0, sampledQuaternionRotation);
	  const magnitude = Matrix3.Cartesian3.magnitude(sampledQuaternionRotation);

	  Quaternion.unpack(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0);

	  if (magnitude === 0) {
	    Quaternion.clone(Quaternion.IDENTITY, sampledQuaternionTempQuaternion);
	  } else {
	    Quaternion.fromAxisAngle(
	      sampledQuaternionRotation,
	      magnitude,
	      sampledQuaternionTempQuaternion
	    );
	  }

	  return Quaternion.multiply(
	    sampledQuaternionTempQuaternion,
	    sampledQuaternionQuaternion0,
	    result
	  );
	};

	/**
	 * Duplicates a Quaternion instance.
	 *
	 * @param {Quaternion} quaternion The quaternion to duplicate.
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided. (Returns undefined if quaternion is undefined)
	 */
	Quaternion.clone = function (quaternion, result) {
	  if (!defaultValue.defined(quaternion)) {
	    return undefined;
	  }

	  if (!defaultValue.defined(result)) {
	    return new Quaternion(
	      quaternion.x,
	      quaternion.y,
	      quaternion.z,
	      quaternion.w
	    );
	  }

	  result.x = quaternion.x;
	  result.y = quaternion.y;
	  result.z = quaternion.z;
	  result.w = quaternion.w;
	  return result;
	};

	/**
	 * Computes the conjugate of the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to conjugate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.conjugate = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = -quaternion.x;
	  result.y = -quaternion.y;
	  result.z = -quaternion.z;
	  result.w = quaternion.w;
	  return result;
	};

	/**
	 * Computes magnitude squared for the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to conjugate.
	 * @returns {Number} The magnitude squared.
	 */
	Quaternion.magnitudeSquared = function (quaternion) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  //>>includeEnd('debug');

	  return (
	    quaternion.x * quaternion.x +
	    quaternion.y * quaternion.y +
	    quaternion.z * quaternion.z +
	    quaternion.w * quaternion.w
	  );
	};

	/**
	 * Computes magnitude for the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to conjugate.
	 * @returns {Number} The magnitude.
	 */
	Quaternion.magnitude = function (quaternion) {
	  return Math.sqrt(Quaternion.magnitudeSquared(quaternion));
	};

	/**
	 * Computes the normalized form of the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to normalize.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.normalize = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const inverseMagnitude = 1.0 / Quaternion.magnitude(quaternion);
	  const x = quaternion.x * inverseMagnitude;
	  const y = quaternion.y * inverseMagnitude;
	  const z = quaternion.z * inverseMagnitude;
	  const w = quaternion.w * inverseMagnitude;

	  result.x = x;
	  result.y = y;
	  result.z = z;
	  result.w = w;
	  return result;
	};

	/**
	 * Computes the inverse of the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to normalize.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.inverse = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
	  result = Quaternion.conjugate(quaternion, result);
	  return Quaternion.multiplyByScalar(result, 1.0 / magnitudeSquared, result);
	};

	/**
	 * Computes the componentwise sum of two quaternions.
	 *
	 * @param {Quaternion} left The first quaternion.
	 * @param {Quaternion} right The second quaternion.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.add = function (left, right, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("left", left);
	  Check.Check.typeOf.object("right", right);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = left.x + right.x;
	  result.y = left.y + right.y;
	  result.z = left.z + right.z;
	  result.w = left.w + right.w;
	  return result;
	};

	/**
	 * Computes the componentwise difference of two quaternions.
	 *
	 * @param {Quaternion} left The first quaternion.
	 * @param {Quaternion} right The second quaternion.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.subtract = function (left, right, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("left", left);
	  Check.Check.typeOf.object("right", right);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = left.x - right.x;
	  result.y = left.y - right.y;
	  result.z = left.z - right.z;
	  result.w = left.w - right.w;
	  return result;
	};

	/**
	 * Negates the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to be negated.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.negate = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = -quaternion.x;
	  result.y = -quaternion.y;
	  result.z = -quaternion.z;
	  result.w = -quaternion.w;
	  return result;
	};

	/**
	 * Computes the dot (scalar) product of two quaternions.
	 *
	 * @param {Quaternion} left The first quaternion.
	 * @param {Quaternion} right The second quaternion.
	 * @returns {Number} The dot product.
	 */
	Quaternion.dot = function (left, right) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("left", left);
	  Check.Check.typeOf.object("right", right);
	  //>>includeEnd('debug');

	  return (
	    left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
	  );
	};

	/**
	 * Computes the product of two quaternions.
	 *
	 * @param {Quaternion} left The first quaternion.
	 * @param {Quaternion} right The second quaternion.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.multiply = function (left, right, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("left", left);
	  Check.Check.typeOf.object("right", right);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const leftX = left.x;
	  const leftY = left.y;
	  const leftZ = left.z;
	  const leftW = left.w;

	  const rightX = right.x;
	  const rightY = right.y;
	  const rightZ = right.z;
	  const rightW = right.w;

	  const x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
	  const y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
	  const z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
	  const w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;

	  result.x = x;
	  result.y = y;
	  result.z = z;
	  result.w = w;
	  return result;
	};

	/**
	 * Multiplies the provided quaternion componentwise by the provided scalar.
	 *
	 * @param {Quaternion} quaternion The quaternion to be scaled.
	 * @param {Number} scalar The scalar to multiply with.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.multiplyByScalar = function (quaternion, scalar, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.number("scalar", scalar);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = quaternion.x * scalar;
	  result.y = quaternion.y * scalar;
	  result.z = quaternion.z * scalar;
	  result.w = quaternion.w * scalar;
	  return result;
	};

	/**
	 * Divides the provided quaternion componentwise by the provided scalar.
	 *
	 * @param {Quaternion} quaternion The quaternion to be divided.
	 * @param {Number} scalar The scalar to divide by.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.divideByScalar = function (quaternion, scalar, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.number("scalar", scalar);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  result.x = quaternion.x / scalar;
	  result.y = quaternion.y / scalar;
	  result.z = quaternion.z / scalar;
	  result.w = quaternion.w / scalar;
	  return result;
	};

	/**
	 * Computes the axis of rotation of the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to use.
	 * @param {Cartesian3} result The object onto which to store the result.
	 * @returns {Cartesian3} The modified result parameter.
	 */
	Quaternion.computeAxis = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const w = quaternion.w;
	  if (Math.abs(w - 1.0) < Math$1.CesiumMath.EPSILON6) {
	    result.x = result.y = result.z = 0;
	    return result;
	  }

	  const scalar = 1.0 / Math.sqrt(1.0 - w * w);

	  result.x = quaternion.x * scalar;
	  result.y = quaternion.y * scalar;
	  result.z = quaternion.z * scalar;
	  return result;
	};

	/**
	 * Computes the angle of rotation of the provided quaternion.
	 *
	 * @param {Quaternion} quaternion The quaternion to use.
	 * @returns {Number} The angle of rotation.
	 */
	Quaternion.computeAngle = function (quaternion) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  //>>includeEnd('debug');

	  if (Math.abs(quaternion.w - 1.0) < Math$1.CesiumMath.EPSILON6) {
	    return 0.0;
	  }
	  return 2.0 * Math.acos(quaternion.w);
	};

	let lerpScratch = new Quaternion();
	/**
	 * Computes the linear interpolation or extrapolation at t using the provided quaternions.
	 *
	 * @param {Quaternion} start The value corresponding to t at 0.0.
	 * @param {Quaternion} end The value corresponding to t at 1.0.
	 * @param {Number} t The point along t at which to interpolate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.lerp = function (start, end, t, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("start", start);
	  Check.Check.typeOf.object("end", end);
	  Check.Check.typeOf.number("t", t);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
	  result = Quaternion.multiplyByScalar(start, 1.0 - t, result);
	  return Quaternion.add(lerpScratch, result, result);
	};

	let slerpEndNegated = new Quaternion();
	let slerpScaledP = new Quaternion();
	let slerpScaledR = new Quaternion();
	/**
	 * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
	 *
	 * @param {Quaternion} start The value corresponding to t at 0.0.
	 * @param {Quaternion} end The value corresponding to t at 1.0.
	 * @param {Number} t The point along t at which to interpolate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 *
	 * @see Quaternion#fastSlerp
	 */
	Quaternion.slerp = function (start, end, t, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("start", start);
	  Check.Check.typeOf.object("end", end);
	  Check.Check.typeOf.number("t", t);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  let dot = Quaternion.dot(start, end);

	  // The angle between start must be acute. Since q and -q represent
	  // the same rotation, negate q to get the acute angle.
	  let r = end;
	  if (dot < 0.0) {
	    dot = -dot;
	    r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
	  }

	  // dot > 0, as the dot product approaches 1, the angle between the
	  // quaternions vanishes. use linear interpolation.
	  if (1.0 - dot < Math$1.CesiumMath.EPSILON6) {
	    return Quaternion.lerp(start, r, t, result);
	  }

	  const theta = Math.acos(dot);
	  slerpScaledP = Quaternion.multiplyByScalar(
	    start,
	    Math.sin((1 - t) * theta),
	    slerpScaledP
	  );
	  slerpScaledR = Quaternion.multiplyByScalar(
	    r,
	    Math.sin(t * theta),
	    slerpScaledR
	  );
	  result = Quaternion.add(slerpScaledP, slerpScaledR, result);
	  return Quaternion.multiplyByScalar(result, 1.0 / Math.sin(theta), result);
	};

	/**
	 * The logarithmic quaternion function.
	 *
	 * @param {Quaternion} quaternion The unit quaternion.
	 * @param {Cartesian3} result The object onto which to store the result.
	 * @returns {Cartesian3} The modified result parameter.
	 */
	Quaternion.log = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("quaternion", quaternion);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const theta = Math$1.CesiumMath.acosClamped(quaternion.w);
	  let thetaOverSinTheta = 0.0;

	  if (theta !== 0.0) {
	    thetaOverSinTheta = theta / Math.sin(theta);
	  }

	  return Matrix3.Cartesian3.multiplyByScalar(quaternion, thetaOverSinTheta, result);
	};

	/**
	 * The exponential quaternion function.
	 *
	 * @param {Cartesian3} cartesian The cartesian.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 */
	Quaternion.exp = function (cartesian, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("cartesian", cartesian);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const theta = Matrix3.Cartesian3.magnitude(cartesian);
	  let sinThetaOverTheta = 0.0;

	  if (theta !== 0.0) {
	    sinThetaOverTheta = Math.sin(theta) / theta;
	  }

	  result.x = cartesian.x * sinThetaOverTheta;
	  result.y = cartesian.y * sinThetaOverTheta;
	  result.z = cartesian.z * sinThetaOverTheta;
	  result.w = Math.cos(theta);

	  return result;
	};

	const squadScratchCartesian0 = new Matrix3.Cartesian3();
	const squadScratchCartesian1 = new Matrix3.Cartesian3();
	const squadScratchQuaternion0 = new Quaternion();
	const squadScratchQuaternion1 = new Quaternion();

	/**
	 * Computes an inner quadrangle point.
	 * <p>This will compute quaternions that ensure a squad curve is C<sup>1</sup>.</p>
	 *
	 * @param {Quaternion} q0 The first quaternion.
	 * @param {Quaternion} q1 The second quaternion.
	 * @param {Quaternion} q2 The third quaternion.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 *
	 * @see Quaternion#squad
	 */
	Quaternion.computeInnerQuadrangle = function (q0, q1, q2, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("q0", q0);
	  Check.Check.typeOf.object("q1", q1);
	  Check.Check.typeOf.object("q2", q2);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const qInv = Quaternion.conjugate(q1, squadScratchQuaternion0);
	  Quaternion.multiply(qInv, q2, squadScratchQuaternion1);
	  const cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0);

	  Quaternion.multiply(qInv, q0, squadScratchQuaternion1);
	  const cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1);

	  Matrix3.Cartesian3.add(cart0, cart1, cart0);
	  Matrix3.Cartesian3.multiplyByScalar(cart0, 0.25, cart0);
	  Matrix3.Cartesian3.negate(cart0, cart0);
	  Quaternion.exp(cart0, squadScratchQuaternion0);

	  return Quaternion.multiply(q1, squadScratchQuaternion0, result);
	};

	/**
	 * Computes the spherical quadrangle interpolation between quaternions.
	 *
	 * @param {Quaternion} q0 The first quaternion.
	 * @param {Quaternion} q1 The second quaternion.
	 * @param {Quaternion} s0 The first inner quadrangle.
	 * @param {Quaternion} s1 The second inner quadrangle.
	 * @param {Number} t The time in [0,1] used to interpolate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 *
	 *
	 * @example
	 * // 1. compute the squad interpolation between two quaternions on a curve
	 * const s0 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i - 1], quaternions[i], quaternions[i + 1], new Cesium.Quaternion());
	 * const s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[i], quaternions[i + 1], quaternions[i + 2], new Cesium.Quaternion());
	 * const q = Cesium.Quaternion.squad(quaternions[i], quaternions[i + 1], s0, s1, t, new Cesium.Quaternion());
	 *
	 * // 2. compute the squad interpolation as above but where the first quaternion is a end point.
	 * const s1 = Cesium.Quaternion.computeInnerQuadrangle(quaternions[0], quaternions[1], quaternions[2], new Cesium.Quaternion());
	 * const q = Cesium.Quaternion.squad(quaternions[0], quaternions[1], quaternions[0], s1, t, new Cesium.Quaternion());
	 *
	 * @see Quaternion#computeInnerQuadrangle
	 */
	Quaternion.squad = function (q0, q1, s0, s1, t, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("q0", q0);
	  Check.Check.typeOf.object("q1", q1);
	  Check.Check.typeOf.object("s0", s0);
	  Check.Check.typeOf.object("s1", s1);
	  Check.Check.typeOf.number("t", t);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0);
	  const slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1);
	  return Quaternion.slerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
	};

	const fastSlerpScratchQuaternion = new Quaternion();
	// eslint-disable-next-line no-loss-of-precision
	const opmu = 1.90110745351730037;
	const u = FeatureDetection$1.supportsTypedArrays() ? new Float32Array(8) : [];
	const v = FeatureDetection$1.supportsTypedArrays() ? new Float32Array(8) : [];
	const bT = FeatureDetection$1.supportsTypedArrays() ? new Float32Array(8) : [];
	const bD = FeatureDetection$1.supportsTypedArrays() ? new Float32Array(8) : [];

	for (let i = 0; i < 7; ++i) {
	  const s = i + 1.0;
	  const t = 2.0 * s + 1.0;
	  u[i] = 1.0 / (s * t);
	  v[i] = s / t;
	}

	u[7] = opmu / (8.0 * 17.0);
	v[7] = (opmu * 8.0) / 17.0;

	/**
	 * Computes the spherical linear interpolation or extrapolation at t using the provided quaternions.
	 * This implementation is faster than {@link Quaternion#slerp}, but is only accurate up to 10<sup>-6</sup>.
	 *
	 * @param {Quaternion} start The value corresponding to t at 0.0.
	 * @param {Quaternion} end The value corresponding to t at 1.0.
	 * @param {Number} t The point along t at which to interpolate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter.
	 *
	 * @see Quaternion#slerp
	 */
	Quaternion.fastSlerp = function (start, end, t, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("start", start);
	  Check.Check.typeOf.object("end", end);
	  Check.Check.typeOf.number("t", t);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  let x = Quaternion.dot(start, end);

	  let sign;
	  if (x >= 0) {
	    sign = 1.0;
	  } else {
	    sign = -1.0;
	    x = -x;
	  }

	  const xm1 = x - 1.0;
	  const d = 1.0 - t;
	  const sqrT = t * t;
	  const sqrD = d * d;

	  for (let i = 7; i >= 0; --i) {
	    bT[i] = (u[i] * sqrT - v[i]) * xm1;
	    bD[i] = (u[i] * sqrD - v[i]) * xm1;
	  }

	  const cT =
	    sign *
	    t *
	    (1.0 +
	      bT[0] *
	        (1.0 +
	          bT[1] *
	            (1.0 +
	              bT[2] *
	                (1.0 +
	                  bT[3] *
	                    (1.0 +
	                      bT[4] *
	                        (1.0 + bT[5] * (1.0 + bT[6] * (1.0 + bT[7]))))))));
	  const cD =
	    d *
	    (1.0 +
	      bD[0] *
	        (1.0 +
	          bD[1] *
	            (1.0 +
	              bD[2] *
	                (1.0 +
	                  bD[3] *
	                    (1.0 +
	                      bD[4] *
	                        (1.0 + bD[5] * (1.0 + bD[6] * (1.0 + bD[7]))))))));

	  const temp = Quaternion.multiplyByScalar(
	    start,
	    cD,
	    fastSlerpScratchQuaternion
	  );
	  Quaternion.multiplyByScalar(end, cT, result);
	  return Quaternion.add(temp, result, result);
	};

	/**
	 * Computes the spherical quadrangle interpolation between quaternions.
	 * An implementation that is faster than {@link Quaternion#squad}, but less accurate.
	 *
	 * @param {Quaternion} q0 The first quaternion.
	 * @param {Quaternion} q1 The second quaternion.
	 * @param {Quaternion} s0 The first inner quadrangle.
	 * @param {Quaternion} s1 The second inner quadrangle.
	 * @param {Number} t The time in [0,1] used to interpolate.
	 * @param {Quaternion} result The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new instance if none was provided.
	 *
	 * @see Quaternion#squad
	 */
	Quaternion.fastSquad = function (q0, q1, s0, s1, t, result) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("q0", q0);
	  Check.Check.typeOf.object("q1", q1);
	  Check.Check.typeOf.object("s0", s0);
	  Check.Check.typeOf.object("s1", s1);
	  Check.Check.typeOf.number("t", t);
	  Check.Check.typeOf.object("result", result);
	  //>>includeEnd('debug');

	  const slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0);
	  const slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1);
	  return Quaternion.fastSlerp(slerp0, slerp1, 2.0 * t * (1.0 - t), result);
	};

	/**
	 * Compares the provided quaternions componentwise and returns
	 * <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {Quaternion} [left] The first quaternion.
	 * @param {Quaternion} [right] The second quaternion.
	 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
	 */
	Quaternion.equals = function (left, right) {
	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      left.x === right.x &&
	      left.y === right.y &&
	      left.z === right.z &&
	      left.w === right.w)
	  );
	};

	/**
	 * Compares the provided quaternions componentwise and returns
	 * <code>true</code> if they are within the provided epsilon,
	 * <code>false</code> otherwise.
	 *
	 * @param {Quaternion} [left] The first quaternion.
	 * @param {Quaternion} [right] The second quaternion.
	 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
	 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
	 */
	Quaternion.equalsEpsilon = function (left, right, epsilon) {
	  epsilon = defaultValue.defaultValue(epsilon, 0);

	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      Math.abs(left.x - right.x) <= epsilon &&
	      Math.abs(left.y - right.y) <= epsilon &&
	      Math.abs(left.z - right.z) <= epsilon &&
	      Math.abs(left.w - right.w) <= epsilon)
	  );
	};

	/**
	 * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 0.0).
	 *
	 * @type {Quaternion}
	 * @constant
	 */
	Quaternion.ZERO = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 0.0));

	/**
	 * An immutable Quaternion instance initialized to (0.0, 0.0, 0.0, 1.0).
	 *
	 * @type {Quaternion}
	 * @constant
	 */
	Quaternion.IDENTITY = Object.freeze(new Quaternion(0.0, 0.0, 0.0, 1.0));

	/**
	 * Duplicates this Quaternion instance.
	 *
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if one was not provided.
	 */
	Quaternion.prototype.clone = function (result) {
	  return Quaternion.clone(this, result);
	};

	/**
	 * Compares this and the provided quaternion componentwise and returns
	 * <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {Quaternion} [right] The right hand side quaternion.
	 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
	 */
	Quaternion.prototype.equals = function (right) {
	  return Quaternion.equals(this, right);
	};

	/**
	 * Compares this and the provided quaternion componentwise and returns
	 * <code>true</code> if they are within the provided epsilon,
	 * <code>false</code> otherwise.
	 *
	 * @param {Quaternion} [right] The right hand side quaternion.
	 * @param {Number} [epsilon=0] The epsilon to use for equality testing.
	 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
	 */
	Quaternion.prototype.equalsEpsilon = function (right, epsilon) {
	  return Quaternion.equalsEpsilon(this, right, epsilon);
	};

	/**
	 * Returns a string representing this quaternion in the format (x, y, z, w).
	 *
	 * @returns {String} A string representing this Quaternion.
	 */
	Quaternion.prototype.toString = function () {
	  return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
	};

	/**
	 * Finds an item in a sorted array.
	 *
	 * @function
	 * @param {Array} array The sorted array to search.
	 * @param {*} itemToFind The item to find in the array.
	 * @param {binarySearchComparator} comparator The function to use to compare the item to
	 *        elements in the array.
	 * @returns {Number} The index of <code>itemToFind</code> in the array, if it exists.  If <code>itemToFind</code>
	 *        does not exist, the return value is a negative number which is the bitwise complement (~)
	 *        of the index before which the itemToFind should be inserted in order to maintain the
	 *        sorted order of the array.
	 *
	 * @example
	 * // Create a comparator function to search through an array of numbers.
	 * function comparator(a, b) {
	 *     return a - b;
	 * };
	 * const numbers = [0, 2, 4, 6, 8];
	 * const index = Cesium.binarySearch(numbers, 6, comparator); // 3
	 */
	function binarySearch(array, itemToFind, comparator) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.defined("array", array);
	  Check.Check.defined("itemToFind", itemToFind);
	  Check.Check.defined("comparator", comparator);
	  //>>includeEnd('debug');

	  let low = 0;
	  let high = array.length - 1;
	  let i;
	  let comparison;

	  while (low <= high) {
	    i = ~~((low + high) / 2);
	    comparison = comparator(array[i], itemToFind);
	    if (comparison < 0) {
	      low = i + 1;
	      continue;
	    }
	    if (comparison > 0) {
	      high = i - 1;
	      continue;
	    }
	    return i;
	  }
	  return ~(high + 1);
	}

	/**
	 * A set of Earth Orientation Parameters (EOP) sampled at a time.
	 *
	 * @alias EarthOrientationParametersSample
	 * @constructor
	 *
	 * @param {Number} xPoleWander The pole wander about the X axis, in radians.
	 * @param {Number} yPoleWander The pole wander about the Y axis, in radians.
	 * @param {Number} xPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
	 * @param {Number} yPoleOffset The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
	 * @param {Number} ut1MinusUtc The difference in time standards, UT1 - UTC, in seconds.
	 *
	 * @private
	 */
	function EarthOrientationParametersSample(
	  xPoleWander,
	  yPoleWander,
	  xPoleOffset,
	  yPoleOffset,
	  ut1MinusUtc
	) {
	  /**
	   * The pole wander about the X axis, in radians.
	   * @type {Number}
	   */
	  this.xPoleWander = xPoleWander;

	  /**
	   * The pole wander about the Y axis, in radians.
	   * @type {Number}
	   */
	  this.yPoleWander = yPoleWander;

	  /**
	   * The offset to the Celestial Intermediate Pole (CIP) about the X axis, in radians.
	   * @type {Number}
	   */
	  this.xPoleOffset = xPoleOffset;

	  /**
	   * The offset to the Celestial Intermediate Pole (CIP) about the Y axis, in radians.
	   * @type {Number}
	   */
	  this.yPoleOffset = yPoleOffset;

	  /**
	   * The difference in time standards, UT1 - UTC, in seconds.
	   * @type {Number}
	   */
	  this.ut1MinusUtc = ut1MinusUtc;
	}

	/**
	 * Represents a Gregorian date in a more precise format than the JavaScript Date object.
	 * In addition to submillisecond precision, this object can also represent leap seconds.
	 * @alias GregorianDate
	 * @constructor
	 *
	 * @param {Number} [year] The year as a whole number.
	 * @param {Number} [month] The month as a whole number with range [1, 12].
	 * @param {Number} [day] The day of the month as a whole number starting at 1.
	 * @param {Number} [hour] The hour as a whole number with range [0, 23].
	 * @param {Number} [minute] The minute of the hour as a whole number with range [0, 59].
	 * @param {Number} [second] The second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
	 * @param {Number} [millisecond] The millisecond of the second as a floating point number with range [0.0, 1000.0).
	 * @param {Boolean} [isLeapSecond] Whether this time is during a leap second.
	 *
	 * @see JulianDate#toGregorianDate
	 */
	function GregorianDate(
	  year,
	  month,
	  day,
	  hour,
	  minute,
	  second,
	  millisecond,
	  isLeapSecond
	) {
	  /**
	   * Gets or sets the year as a whole number.
	   * @type {Number}
	   */
	  this.year = year;
	  /**
	   * Gets or sets the month as a whole number with range [1, 12].
	   * @type {Number}
	   */
	  this.month = month;
	  /**
	   * Gets or sets the day of the month as a whole number starting at 1.
	   * @type {Number}
	   */
	  this.day = day;
	  /**
	   * Gets or sets the hour as a whole number with range [0, 23].
	   * @type {Number}
	   */
	  this.hour = hour;
	  /**
	   * Gets or sets the minute of the hour as a whole number with range [0, 59].
	   * @type {Number}
	   */
	  this.minute = minute;
	  /**
	   * Gets or sets the second of the minute as a whole number with range [0, 60], with 60 representing a leap second.
	   * @type {Number}
	   */
	  this.second = second;
	  /**
	   * Gets or sets the millisecond of the second as a floating point number with range [0.0, 1000.0).
	   * @type {Number}
	   */
	  this.millisecond = millisecond;
	  /**
	   * Gets or sets whether this time is during a leap second.
	   * @type {Boolean}
	   */
	  this.isLeapSecond = isLeapSecond;
	}

	/**
	 * Determines if a given date is a leap year.
	 *
	 * @function isLeapYear
	 *
	 * @param {Number} year The year to be tested.
	 * @returns {Boolean} True if <code>year</code> is a leap year.
	 *
	 * @example
	 * const leapYear = Cesium.isLeapYear(2000); // true
	 */
	function isLeapYear(year) {
	  //>>includeStart('debug', pragmas.debug);
	  if (year === null || isNaN(year)) {
	    throw new Check.DeveloperError("year is required and must be a number.");
	  }
	  //>>includeEnd('debug');

	  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	/**
	 * Describes a single leap second, which is constructed from a {@link JulianDate} and a
	 * numerical offset representing the number of seconds TAI is ahead of the UTC time standard.
	 * @alias LeapSecond
	 * @constructor
	 *
	 * @param {JulianDate} [date] A Julian date representing the time of the leap second.
	 * @param {Number} [offset] The cumulative number of seconds that TAI is ahead of UTC at the provided date.
	 */
	function LeapSecond(date, offset) {
	  /**
	   * Gets or sets the date at which this leap second occurs.
	   * @type {JulianDate}
	   */
	  this.julianDate = date;

	  /**
	   * Gets or sets the cumulative number of seconds between the UTC and TAI time standards at the time
	   * of this leap second.
	   * @type {Number}
	   */
	  this.offset = offset;
	}

	/**
	 * Constants for time conversions like those done by {@link JulianDate}.
	 *
	 * @namespace TimeConstants
	 *
	 * @see JulianDate
	 *
	 * @private
	 */
	const TimeConstants = {
	  /**
	   * The number of seconds in one millisecond: <code>0.001</code>
	   * @type {Number}
	   * @constant
	   */
	  SECONDS_PER_MILLISECOND: 0.001,

	  /**
	   * The number of seconds in one minute: <code>60</code>.
	   * @type {Number}
	   * @constant
	   */
	  SECONDS_PER_MINUTE: 60.0,

	  /**
	   * The number of minutes in one hour: <code>60</code>.
	   * @type {Number}
	   * @constant
	   */
	  MINUTES_PER_HOUR: 60.0,

	  /**
	   * The number of hours in one day: <code>24</code>.
	   * @type {Number}
	   * @constant
	   */
	  HOURS_PER_DAY: 24.0,

	  /**
	   * The number of seconds in one hour: <code>3600</code>.
	   * @type {Number}
	   * @constant
	   */
	  SECONDS_PER_HOUR: 3600.0,

	  /**
	   * The number of minutes in one day: <code>1440</code>.
	   * @type {Number}
	   * @constant
	   */
	  MINUTES_PER_DAY: 1440.0,

	  /**
	   * The number of seconds in one day, ignoring leap seconds: <code>86400</code>.
	   * @type {Number}
	   * @constant
	   */
	  SECONDS_PER_DAY: 86400.0,

	  /**
	   * The number of days in one Julian century: <code>36525</code>.
	   * @type {Number}
	   * @constant
	   */
	  DAYS_PER_JULIAN_CENTURY: 36525.0,

	  /**
	   * One trillionth of a second.
	   * @type {Number}
	   * @constant
	   */
	  PICOSECOND: 0.000000001,

	  /**
	   * The number of days to subtract from a Julian date to determine the
	   * modified Julian date, which gives the number of days since midnight
	   * on November 17, 1858.
	   * @type {Number}
	   * @constant
	   */
	  MODIFIED_JULIAN_DATE_DIFFERENCE: 2400000.5,
	};
	var TimeConstants$1 = Object.freeze(TimeConstants);

	/**
	 * Provides the type of time standards which JulianDate can take as input.
	 *
	 * @enum {Number}
	 *
	 * @see JulianDate
	 */
	const TimeStandard = {
	  /**
	   * Represents the coordinated Universal Time (UTC) time standard.
	   *
	   * UTC is related to TAI according to the relationship
	   * <code>UTC = TAI - deltaT</code> where <code>deltaT</code> is the number of leap
	   * seconds which have been introduced as of the time in TAI.
	   *
	   * @type {Number}
	   * @constant
	   */
	  UTC: 0,

	  /**
	   * Represents the International Atomic Time (TAI) time standard.
	   * TAI is the principal time standard to which the other time standards are related.
	   *
	   * @type {Number}
	   * @constant
	   */
	  TAI: 1,
	};
	var TimeStandard$1 = Object.freeze(TimeStandard);

	const gregorianDateScratch = new GregorianDate();
	const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	const daysInLeapFeburary = 29;

	function compareLeapSecondDates$1(leapSecond, dateToFind) {
	  return JulianDate.compare(leapSecond.julianDate, dateToFind.julianDate);
	}

	// we don't really need a leap second instance, anything with a julianDate property will do
	const binarySearchScratchLeapSecond = new LeapSecond();

	function convertUtcToTai(julianDate) {
	  //Even though julianDate is in UTC, we'll treat it as TAI and
	  //search the leap second table for it.
	  binarySearchScratchLeapSecond.julianDate = julianDate;
	  const leapSeconds = JulianDate.leapSeconds;
	  let index = binarySearch(
	    leapSeconds,
	    binarySearchScratchLeapSecond,
	    compareLeapSecondDates$1
	  );

	  if (index < 0) {
	    index = ~index;
	  }

	  if (index >= leapSeconds.length) {
	    index = leapSeconds.length - 1;
	  }

	  let offset = leapSeconds[index].offset;
	  if (index > 0) {
	    //Now we have the index of the closest leap second that comes on or after our UTC time.
	    //However, if the difference between the UTC date being converted and the TAI
	    //defined leap second is greater than the offset, we are off by one and need to use
	    //the previous leap second.
	    const difference = JulianDate.secondsDifference(
	      leapSeconds[index].julianDate,
	      julianDate
	    );
	    if (difference > offset) {
	      index--;
	      offset = leapSeconds[index].offset;
	    }
	  }

	  JulianDate.addSeconds(julianDate, offset, julianDate);
	}

	function convertTaiToUtc(julianDate, result) {
	  binarySearchScratchLeapSecond.julianDate = julianDate;
	  const leapSeconds = JulianDate.leapSeconds;
	  let index = binarySearch(
	    leapSeconds,
	    binarySearchScratchLeapSecond,
	    compareLeapSecondDates$1
	  );
	  if (index < 0) {
	    index = ~index;
	  }

	  //All times before our first leap second get the first offset.
	  if (index === 0) {
	    return JulianDate.addSeconds(julianDate, -leapSeconds[0].offset, result);
	  }

	  //All times after our leap second get the last offset.
	  if (index >= leapSeconds.length) {
	    return JulianDate.addSeconds(
	      julianDate,
	      -leapSeconds[index - 1].offset,
	      result
	    );
	  }

	  //Compute the difference between the found leap second and the time we are converting.
	  const difference = JulianDate.secondsDifference(
	    leapSeconds[index].julianDate,
	    julianDate
	  );

	  if (difference === 0) {
	    //The date is in our leap second table.
	    return JulianDate.addSeconds(
	      julianDate,
	      -leapSeconds[index].offset,
	      result
	    );
	  }

	  if (difference <= 1.0) {
	    //The requested date is during the moment of a leap second, then we cannot convert to UTC
	    return undefined;
	  }

	  //The time is in between two leap seconds, index is the leap second after the date
	  //we're converting, so we subtract one to get the correct LeapSecond instance.
	  return JulianDate.addSeconds(
	    julianDate,
	    -leapSeconds[--index].offset,
	    result
	  );
	}

	function setComponents(wholeDays, secondsOfDay, julianDate) {
	  const extraDays = (secondsOfDay / TimeConstants$1.SECONDS_PER_DAY) | 0;
	  wholeDays += extraDays;
	  secondsOfDay -= TimeConstants$1.SECONDS_PER_DAY * extraDays;

	  if (secondsOfDay < 0) {
	    wholeDays--;
	    secondsOfDay += TimeConstants$1.SECONDS_PER_DAY;
	  }

	  julianDate.dayNumber = wholeDays;
	  julianDate.secondsOfDay = secondsOfDay;
	  return julianDate;
	}

	function computeJulianDateComponents(
	  year,
	  month,
	  day,
	  hour,
	  minute,
	  second,
	  millisecond
	) {
	  // Algorithm from page 604 of the Explanatory Supplement to the
	  // Astronomical Almanac (Seidelmann 1992).

	  const a = ((month - 14) / 12) | 0;
	  const b = year + 4800 + a;
	  let dayNumber =
	    (((1461 * b) / 4) | 0) +
	    (((367 * (month - 2 - 12 * a)) / 12) | 0) -
	    (((3 * (((b + 100) / 100) | 0)) / 4) | 0) +
	    day -
	    32075;

	  // JulianDates are noon-based
	  hour = hour - 12;
	  if (hour < 0) {
	    hour += 24;
	  }

	  const secondsOfDay =
	    second +
	    (hour * TimeConstants$1.SECONDS_PER_HOUR +
	      minute * TimeConstants$1.SECONDS_PER_MINUTE +
	      millisecond * TimeConstants$1.SECONDS_PER_MILLISECOND);

	  if (secondsOfDay >= 43200.0) {
	    dayNumber -= 1;
	  }

	  return [dayNumber, secondsOfDay];
	}

	//Regular expressions used for ISO8601 date parsing.
	//YYYY
	const matchCalendarYear = /^(\d{4})$/;
	//YYYY-MM (YYYYMM is invalid)
	const matchCalendarMonth = /^(\d{4})-(\d{2})$/;
	//YYYY-DDD or YYYYDDD
	const matchOrdinalDate = /^(\d{4})-?(\d{3})$/;
	//YYYY-Www or YYYYWww or YYYY-Www-D or YYYYWwwD
	const matchWeekDate = /^(\d{4})-?W(\d{2})-?(\d{1})?$/;
	//YYYY-MM-DD or YYYYMMDD
	const matchCalendarDate = /^(\d{4})-?(\d{2})-?(\d{2})$/;
	// Match utc offset
	const utcOffset = /([Z+\-])?(\d{2})?:?(\d{2})?$/;
	// Match hours HH or HH.xxxxx
	const matchHours = /^(\d{2})(\.\d+)?/.source + utcOffset.source;
	// Match hours/minutes HH:MM HHMM.xxxxx
	const matchHoursMinutes = /^(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;
	// Match hours/minutes HH:MM:SS HHMMSS.xxxxx
	const matchHoursMinutesSeconds =
	  /^(\d{2}):?(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;

	const iso8601ErrorMessage = "Invalid ISO 8601 date.";

	/**
	 * Represents an astronomical Julian date, which is the number of days since noon on January 1, -4712 (4713 BC).
	 * For increased precision, this class stores the whole number part of the date and the seconds
	 * part of the date in separate components.  In order to be safe for arithmetic and represent
	 * leap seconds, the date is always stored in the International Atomic Time standard
	 * {@link TimeStandard.TAI}.
	 * @alias JulianDate
	 * @constructor
	 *
	 * @param {Number} [julianDayNumber=0.0] The Julian Day Number representing the number of whole days.  Fractional days will also be handled correctly.
	 * @param {Number} [secondsOfDay=0.0] The number of seconds into the current Julian Day Number.  Fractional seconds, negative seconds and seconds greater than a day will be handled correctly.
	 * @param {TimeStandard} [timeStandard=TimeStandard.UTC] The time standard in which the first two parameters are defined.
	 */
	function JulianDate(julianDayNumber, secondsOfDay, timeStandard) {
	  /**
	   * Gets or sets the number of whole days.
	   * @type {Number}
	   */
	  this.dayNumber = undefined;

	  /**
	   * Gets or sets the number of seconds into the current day.
	   * @type {Number}
	   */
	  this.secondsOfDay = undefined;

	  julianDayNumber = defaultValue.defaultValue(julianDayNumber, 0.0);
	  secondsOfDay = defaultValue.defaultValue(secondsOfDay, 0.0);
	  timeStandard = defaultValue.defaultValue(timeStandard, TimeStandard$1.UTC);

	  //If julianDayNumber is fractional, make it an integer and add the number of seconds the fraction represented.
	  const wholeDays = julianDayNumber | 0;
	  secondsOfDay =
	    secondsOfDay +
	    (julianDayNumber - wholeDays) * TimeConstants$1.SECONDS_PER_DAY;

	  setComponents(wholeDays, secondsOfDay, this);

	  if (timeStandard === TimeStandard$1.UTC) {
	    convertUtcToTai(this);
	  }
	}

	/**
	 * Creates a new instance from a GregorianDate.
	 *
	 * @param {GregorianDate} date A GregorianDate.
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
	 *
	 * @exception {DeveloperError} date must be a valid GregorianDate.
	 */
	JulianDate.fromGregorianDate = function (date, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!(date instanceof GregorianDate)) {
	    throw new Check.DeveloperError("date must be a valid GregorianDate.");
	  }
	  //>>includeEnd('debug');

	  const components = computeJulianDateComponents(
	    date.year,
	    date.month,
	    date.day,
	    date.hour,
	    date.minute,
	    date.second,
	    date.millisecond
	  );
	  if (!defaultValue.defined(result)) {
	    return new JulianDate(components[0], components[1], TimeStandard$1.UTC);
	  }
	  setComponents(components[0], components[1], result);
	  convertUtcToTai(result);
	  return result;
	};

	/**
	 * Creates a new instance from a JavaScript Date.
	 *
	 * @param {Date} date A JavaScript Date.
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
	 *
	 * @exception {DeveloperError} date must be a valid JavaScript Date.
	 */
	JulianDate.fromDate = function (date, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!(date instanceof Date) || isNaN(date.getTime())) {
	    throw new Check.DeveloperError("date must be a valid JavaScript Date.");
	  }
	  //>>includeEnd('debug');

	  const components = computeJulianDateComponents(
	    date.getUTCFullYear(),
	    date.getUTCMonth() + 1,
	    date.getUTCDate(),
	    date.getUTCHours(),
	    date.getUTCMinutes(),
	    date.getUTCSeconds(),
	    date.getUTCMilliseconds()
	  );
	  if (!defaultValue.defined(result)) {
	    return new JulianDate(components[0], components[1], TimeStandard$1.UTC);
	  }
	  setComponents(components[0], components[1], result);
	  convertUtcToTai(result);
	  return result;
	};

	/**
	 * Creates a new instance from a from an {@link http://en.wikipedia.org/wiki/ISO_8601|ISO 8601} date.
	 * This method is superior to <code>Date.parse</code> because it will handle all valid formats defined by the ISO 8601
	 * specification, including leap seconds and sub-millisecond times, which discarded by most JavaScript implementations.
	 *
	 * @param {String} iso8601String An ISO 8601 date.
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
	 *
	 * @exception {DeveloperError} Invalid ISO 8601 date.
	 */
	JulianDate.fromIso8601 = function (iso8601String, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (typeof iso8601String !== "string") {
	    throw new Check.DeveloperError(iso8601ErrorMessage);
	  }
	  //>>includeEnd('debug');

	  //Comma and decimal point both indicate a fractional number according to ISO 8601,
	  //start out by blanket replacing , with . which is the only valid such symbol in JS.
	  iso8601String = iso8601String.replace(",", ".");

	  //Split the string into its date and time components, denoted by a mandatory T
	  let tokens = iso8601String.split("T");
	  let year;
	  let month = 1;
	  let day = 1;
	  let hour = 0;
	  let minute = 0;
	  let second = 0;
	  let millisecond = 0;

	  //Lacking a time is okay, but a missing date is illegal.
	  const date = tokens[0];
	  const time = tokens[1];
	  let tmp;
	  let inLeapYear;
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(date)) {
	    throw new Check.DeveloperError(iso8601ErrorMessage);
	  }

	  let dashCount;
	  //>>includeEnd('debug');

	  //First match the date against possible regular expressions.
	  tokens = date.match(matchCalendarDate);
	  if (tokens !== null) {
	    //>>includeStart('debug', pragmas.debug);
	    dashCount = date.split("-").length - 1;
	    if (dashCount > 0 && dashCount !== 2) {
	      throw new Check.DeveloperError(iso8601ErrorMessage);
	    }
	    //>>includeEnd('debug');
	    year = +tokens[1];
	    month = +tokens[2];
	    day = +tokens[3];
	  } else {
	    tokens = date.match(matchCalendarMonth);
	    if (tokens !== null) {
	      year = +tokens[1];
	      month = +tokens[2];
	    } else {
	      tokens = date.match(matchCalendarYear);
	      if (tokens !== null) {
	        year = +tokens[1];
	      } else {
	        //Not a year/month/day so it must be an ordinal date.
	        let dayOfYear;
	        tokens = date.match(matchOrdinalDate);
	        if (tokens !== null) {
	          year = +tokens[1];
	          dayOfYear = +tokens[2];
	          inLeapYear = isLeapYear(year);

	          //This validation is only applicable for this format.
	          //>>includeStart('debug', pragmas.debug);
	          if (
	            dayOfYear < 1 ||
	            (inLeapYear && dayOfYear > 366) ||
	            (!inLeapYear && dayOfYear > 365)
	          ) {
	            throw new Check.DeveloperError(iso8601ErrorMessage);
	          }
	          //>>includeEnd('debug')
	        } else {
	          tokens = date.match(matchWeekDate);
	          if (tokens !== null) {
	            //ISO week date to ordinal date from
	            //http://en.wikipedia.org/w/index.php?title=ISO_week_date&oldid=474176775
	            year = +tokens[1];
	            const weekNumber = +tokens[2];
	            const dayOfWeek = +tokens[3] || 0;

	            //>>includeStart('debug', pragmas.debug);
	            dashCount = date.split("-").length - 1;
	            if (
	              dashCount > 0 &&
	              ((!defaultValue.defined(tokens[3]) && dashCount !== 1) ||
	                (defaultValue.defined(tokens[3]) && dashCount !== 2))
	            ) {
	              throw new Check.DeveloperError(iso8601ErrorMessage);
	            }
	            //>>includeEnd('debug')

	            const january4 = new Date(Date.UTC(year, 0, 4));
	            dayOfYear = weekNumber * 7 + dayOfWeek - january4.getUTCDay() - 3;
	          } else {
	            //None of our regular expressions succeeded in parsing the date properly.
	            //>>includeStart('debug', pragmas.debug);
	            throw new Check.DeveloperError(iso8601ErrorMessage);
	            //>>includeEnd('debug')
	          }
	        }
	        //Split an ordinal date into month/day.
	        tmp = new Date(Date.UTC(year, 0, 1));
	        tmp.setUTCDate(dayOfYear);
	        month = tmp.getUTCMonth() + 1;
	        day = tmp.getUTCDate();
	      }
	    }
	  }

	  //Now that we have all of the date components, validate them to make sure nothing is out of range.
	  inLeapYear = isLeapYear(year);
	  //>>includeStart('debug', pragmas.debug);
	  if (
	    month < 1 ||
	    month > 12 ||
	    day < 1 ||
	    ((month !== 2 || !inLeapYear) && day > daysInMonth[month - 1]) ||
	    (inLeapYear && month === 2 && day > daysInLeapFeburary)
	  ) {
	    throw new Check.DeveloperError(iso8601ErrorMessage);
	  }
	  //>>includeEnd('debug')

	  //Now move onto the time string, which is much simpler.
	  //If no time is specified, it is considered the beginning of the day, UTC to match Javascript's implementation.
	  let offsetIndex;
	  if (defaultValue.defined(time)) {
	    tokens = time.match(matchHoursMinutesSeconds);
	    if (tokens !== null) {
	      //>>includeStart('debug', pragmas.debug);
	      dashCount = time.split(":").length - 1;
	      if (dashCount > 0 && dashCount !== 2 && dashCount !== 3) {
	        throw new Check.DeveloperError(iso8601ErrorMessage);
	      }
	      //>>includeEnd('debug')

	      hour = +tokens[1];
	      minute = +tokens[2];
	      second = +tokens[3];
	      millisecond = +(tokens[4] || 0) * 1000.0;
	      offsetIndex = 5;
	    } else {
	      tokens = time.match(matchHoursMinutes);
	      if (tokens !== null) {
	        //>>includeStart('debug', pragmas.debug);
	        dashCount = time.split(":").length - 1;
	        if (dashCount > 2) {
	          throw new Check.DeveloperError(iso8601ErrorMessage);
	        }
	        //>>includeEnd('debug')

	        hour = +tokens[1];
	        minute = +tokens[2];
	        second = +(tokens[3] || 0) * 60.0;
	        offsetIndex = 4;
	      } else {
	        tokens = time.match(matchHours);
	        if (tokens !== null) {
	          hour = +tokens[1];
	          minute = +(tokens[2] || 0) * 60.0;
	          offsetIndex = 3;
	        } else {
	          //>>includeStart('debug', pragmas.debug);
	          throw new Check.DeveloperError(iso8601ErrorMessage);
	          //>>includeEnd('debug')
	        }
	      }
	    }

	    //Validate that all values are in proper range.  Minutes and hours have special cases at 60 and 24.
	    //>>includeStart('debug', pragmas.debug);
	    if (
	      minute >= 60 ||
	      second >= 61 ||
	      hour > 24 ||
	      (hour === 24 && (minute > 0 || second > 0 || millisecond > 0))
	    ) {
	      throw new Check.DeveloperError(iso8601ErrorMessage);
	    }
	    //>>includeEnd('debug');

	    //Check the UTC offset value, if no value exists, use local time
	    //a Z indicates UTC, + or - are offsets.
	    const offset = tokens[offsetIndex];
	    const offsetHours = +tokens[offsetIndex + 1];
	    const offsetMinutes = +(tokens[offsetIndex + 2] || 0);
	    switch (offset) {
	      case "+":
	        hour = hour - offsetHours;
	        minute = minute - offsetMinutes;
	        break;
	      case "-":
	        hour = hour + offsetHours;
	        minute = minute + offsetMinutes;
	        break;
	      case "Z":
	        break;
	      default:
	        minute =
	          minute +
	          new Date(
	            Date.UTC(year, month - 1, day, hour, minute)
	          ).getTimezoneOffset();
	        break;
	    }
	  }

	  //ISO8601 denotes a leap second by any time having a seconds component of 60 seconds.
	  //If that's the case, we need to temporarily subtract a second in order to build a UTC date.
	  //Then we add it back in after converting to TAI.
	  const isLeapSecond = second === 60;
	  if (isLeapSecond) {
	    second--;
	  }

	  //Even if we successfully parsed the string into its components, after applying UTC offset or
	  //special cases like 24:00:00 denoting midnight, we need to normalize the data appropriately.

	  //milliseconds can never be greater than 1000, and seconds can't be above 60, so we start with minutes
	  while (minute >= 60) {
	    minute -= 60;
	    hour++;
	  }

	  while (hour >= 24) {
	    hour -= 24;
	    day++;
	  }

	  tmp = inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
	  while (day > tmp) {
	    day -= tmp;
	    month++;

	    if (month > 12) {
	      month -= 12;
	      year++;
	    }

	    tmp =
	      inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
	  }

	  //If UTC offset is at the beginning/end of the day, minutes can be negative.
	  while (minute < 0) {
	    minute += 60;
	    hour--;
	  }

	  while (hour < 0) {
	    hour += 24;
	    day--;
	  }

	  while (day < 1) {
	    month--;
	    if (month < 1) {
	      month += 12;
	      year--;
	    }

	    tmp =
	      inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
	    day += tmp;
	  }

	  //Now create the JulianDate components from the Gregorian date and actually create our instance.
	  const components = computeJulianDateComponents(
	    year,
	    month,
	    day,
	    hour,
	    minute,
	    second,
	    millisecond
	  );

	  if (!defaultValue.defined(result)) {
	    result = new JulianDate(components[0], components[1], TimeStandard$1.UTC);
	  } else {
	    setComponents(components[0], components[1], result);
	    convertUtcToTai(result);
	  }

	  //If we were on a leap second, add it back.
	  if (isLeapSecond) {
	    JulianDate.addSeconds(result, 1, result);
	  }

	  return result;
	};

	/**
	 * Creates a new instance that represents the current system time.
	 * This is equivalent to calling <code>JulianDate.fromDate(new Date());</code>.
	 *
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
	 */
	JulianDate.now = function (result) {
	  return JulianDate.fromDate(new Date(), result);
	};

	const toGregorianDateScratch = new JulianDate(0, 0, TimeStandard$1.TAI);

	/**
	 * Creates a {@link GregorianDate} from the provided instance.
	 *
	 * @param {JulianDate} julianDate The date to be converted.
	 * @param {GregorianDate} [result] An existing instance to use for the result.
	 * @returns {GregorianDate} The modified result parameter or a new instance if none was provided.
	 */
	JulianDate.toGregorianDate = function (julianDate, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  //>>includeEnd('debug');

	  let isLeapSecond = false;
	  let thisUtc = convertTaiToUtc(julianDate, toGregorianDateScratch);
	  if (!defaultValue.defined(thisUtc)) {
	    //Conversion to UTC will fail if we are during a leap second.
	    //If that's the case, subtract a second and convert again.
	    //JavaScript doesn't support leap seconds, so this results in second 59 being repeated twice.
	    JulianDate.addSeconds(julianDate, -1, toGregorianDateScratch);
	    thisUtc = convertTaiToUtc(toGregorianDateScratch, toGregorianDateScratch);
	    isLeapSecond = true;
	  }

	  let julianDayNumber = thisUtc.dayNumber;
	  const secondsOfDay = thisUtc.secondsOfDay;

	  if (secondsOfDay >= 43200.0) {
	    julianDayNumber += 1;
	  }

	  // Algorithm from page 604 of the Explanatory Supplement to the
	  // Astronomical Almanac (Seidelmann 1992).
	  let L = (julianDayNumber + 68569) | 0;
	  const N = ((4 * L) / 146097) | 0;
	  L = (L - (((146097 * N + 3) / 4) | 0)) | 0;
	  const I = ((4000 * (L + 1)) / 1461001) | 0;
	  L = (L - (((1461 * I) / 4) | 0) + 31) | 0;
	  const J = ((80 * L) / 2447) | 0;
	  const day = (L - (((2447 * J) / 80) | 0)) | 0;
	  L = (J / 11) | 0;
	  const month = (J + 2 - 12 * L) | 0;
	  const year = (100 * (N - 49) + I + L) | 0;

	  let hour = (secondsOfDay / TimeConstants$1.SECONDS_PER_HOUR) | 0;
	  let remainingSeconds = secondsOfDay - hour * TimeConstants$1.SECONDS_PER_HOUR;
	  const minute = (remainingSeconds / TimeConstants$1.SECONDS_PER_MINUTE) | 0;
	  remainingSeconds =
	    remainingSeconds - minute * TimeConstants$1.SECONDS_PER_MINUTE;
	  let second = remainingSeconds | 0;
	  const millisecond =
	    (remainingSeconds - second) / TimeConstants$1.SECONDS_PER_MILLISECOND;

	  // JulianDates are noon-based
	  hour += 12;
	  if (hour > 23) {
	    hour -= 24;
	  }

	  //If we were on a leap second, add it back.
	  if (isLeapSecond) {
	    second += 1;
	  }

	  if (!defaultValue.defined(result)) {
	    return new GregorianDate(
	      year,
	      month,
	      day,
	      hour,
	      minute,
	      second,
	      millisecond,
	      isLeapSecond
	    );
	  }

	  result.year = year;
	  result.month = month;
	  result.day = day;
	  result.hour = hour;
	  result.minute = minute;
	  result.second = second;
	  result.millisecond = millisecond;
	  result.isLeapSecond = isLeapSecond;
	  return result;
	};

	/**
	 * Creates a JavaScript Date from the provided instance.
	 * Since JavaScript dates are only accurate to the nearest millisecond and
	 * cannot represent a leap second, consider using {@link JulianDate.toGregorianDate} instead.
	 * If the provided JulianDate is during a leap second, the previous second is used.
	 *
	 * @param {JulianDate} julianDate The date to be converted.
	 * @returns {Date} A new instance representing the provided date.
	 */
	JulianDate.toDate = function (julianDate) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  //>>includeEnd('debug');

	  const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
	  let second = gDate.second;
	  if (gDate.isLeapSecond) {
	    second -= 1;
	  }
	  return new Date(
	    Date.UTC(
	      gDate.year,
	      gDate.month - 1,
	      gDate.day,
	      gDate.hour,
	      gDate.minute,
	      second,
	      gDate.millisecond
	    )
	  );
	};

	/**
	 * Creates an ISO8601 representation of the provided date.
	 *
	 * @param {JulianDate} julianDate The date to be converted.
	 * @param {Number} [precision] The number of fractional digits used to represent the seconds component.  By default, the most precise representation is used.
	 * @returns {String} The ISO8601 representation of the provided date.
	 */
	JulianDate.toIso8601 = function (julianDate, precision) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  //>>includeEnd('debug');

	  const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
	  let year = gDate.year;
	  let month = gDate.month;
	  let day = gDate.day;
	  let hour = gDate.hour;
	  const minute = gDate.minute;
	  const second = gDate.second;
	  const millisecond = gDate.millisecond;

	  // special case - Iso8601.MAXIMUM_VALUE produces a string which we can't parse unless we adjust.
	  // 10000-01-01T00:00:00 is the same instant as 9999-12-31T24:00:00
	  if (
	    year === 10000 &&
	    month === 1 &&
	    day === 1 &&
	    hour === 0 &&
	    minute === 0 &&
	    second === 0 &&
	    millisecond === 0
	  ) {
	    year = 9999;
	    month = 12;
	    day = 31;
	    hour = 24;
	  }

	  let millisecondStr;

	  if (!defaultValue.defined(precision) && millisecond !== 0) {
	    //Forces milliseconds into a number with at least 3 digits to whatever the default toString() precision is.
	    millisecondStr = (millisecond * 0.01).toString().replace(".", "");
	    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}T${hour
      .toString()
      .padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}:${second
      .toString()
      .padStart(2, "0")}.${millisecondStr}Z`;
	  }

	  //Precision is either 0 or milliseconds is 0 with undefined precision, in either case, leave off milliseconds entirely
	  if (!defaultValue.defined(precision) || precision === 0) {
	    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}T${hour
      .toString()
      .padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}:${second.toString().padStart(2, "0")}Z`;
	  }

	  //Forces milliseconds into a number with at least 3 digits to whatever the specified precision is.
	  millisecondStr = (millisecond * 0.01)
	    .toFixed(precision)
	    .replace(".", "")
	    .slice(0, precision);
	  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}T${hour
    .toString()
    .padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:${second
    .toString()
    .padStart(2, "0")}.${millisecondStr}Z`;
	};

	/**
	 * Duplicates a JulianDate instance.
	 *
	 * @param {JulianDate} julianDate The date to duplicate.
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided. Returns undefined if julianDate is undefined.
	 */
	JulianDate.clone = function (julianDate, result) {
	  if (!defaultValue.defined(julianDate)) {
	    return undefined;
	  }
	  if (!defaultValue.defined(result)) {
	    return new JulianDate(
	      julianDate.dayNumber,
	      julianDate.secondsOfDay,
	      TimeStandard$1.TAI
	    );
	  }
	  result.dayNumber = julianDate.dayNumber;
	  result.secondsOfDay = julianDate.secondsOfDay;
	  return result;
	};

	/**
	 * Compares two instances.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Number} A negative value if left is less than right, a positive value if left is greater than right, or zero if left and right are equal.
	 */
	JulianDate.compare = function (left, right) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(left)) {
	    throw new Check.DeveloperError("left is required.");
	  }
	  if (!defaultValue.defined(right)) {
	    throw new Check.DeveloperError("right is required.");
	  }
	  //>>includeEnd('debug');

	  const julianDayNumberDifference = left.dayNumber - right.dayNumber;
	  if (julianDayNumberDifference !== 0) {
	    return julianDayNumberDifference;
	  }
	  return left.secondsOfDay - right.secondsOfDay;
	};

	/**
	 * Compares two instances and returns <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} [left] The first instance.
	 * @param {JulianDate} [right] The second instance.
	 * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
	 */
	JulianDate.equals = function (left, right) {
	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      left.dayNumber === right.dayNumber &&
	      left.secondsOfDay === right.secondsOfDay)
	  );
	};

	/**
	 * Compares two instances and returns <code>true</code> if they are within <code>epsilon</code> seconds of
	 * each other.  That is, in order for the dates to be considered equal (and for
	 * this function to return <code>true</code>), the absolute value of the difference between them, in
	 * seconds, must be less than <code>epsilon</code>.
	 *
	 * @param {JulianDate} [left] The first instance.
	 * @param {JulianDate} [right] The second instance.
	 * @param {Number} [epsilon=0] The maximum number of seconds that should separate the two instances.
	 * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
	 */
	JulianDate.equalsEpsilon = function (left, right, epsilon) {
	  epsilon = defaultValue.defaultValue(epsilon, 0);

	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      Math.abs(JulianDate.secondsDifference(left, right)) <= epsilon)
	  );
	};

	/**
	 * Computes the total number of whole and fractional days represented by the provided instance.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @returns {Number} The Julian date as single floating point number.
	 */
	JulianDate.totalDays = function (julianDate) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  //>>includeEnd('debug');
	  return (
	    julianDate.dayNumber +
	    julianDate.secondsOfDay / TimeConstants$1.SECONDS_PER_DAY
	  );
	};

	/**
	 * Computes the difference in seconds between the provided instance.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Number} The difference, in seconds, when subtracting <code>right</code> from <code>left</code>.
	 */
	JulianDate.secondsDifference = function (left, right) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(left)) {
	    throw new Check.DeveloperError("left is required.");
	  }
	  if (!defaultValue.defined(right)) {
	    throw new Check.DeveloperError("right is required.");
	  }
	  //>>includeEnd('debug');

	  const dayDifference =
	    (left.dayNumber - right.dayNumber) * TimeConstants$1.SECONDS_PER_DAY;
	  return dayDifference + (left.secondsOfDay - right.secondsOfDay);
	};

	/**
	 * Computes the difference in days between the provided instance.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Number} The difference, in days, when subtracting <code>right</code> from <code>left</code>.
	 */
	JulianDate.daysDifference = function (left, right) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(left)) {
	    throw new Check.DeveloperError("left is required.");
	  }
	  if (!defaultValue.defined(right)) {
	    throw new Check.DeveloperError("right is required.");
	  }
	  //>>includeEnd('debug');

	  const dayDifference = left.dayNumber - right.dayNumber;
	  const secondDifference =
	    (left.secondsOfDay - right.secondsOfDay) / TimeConstants$1.SECONDS_PER_DAY;
	  return dayDifference + secondDifference;
	};

	/**
	 * Computes the number of seconds the provided instance is ahead of UTC.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @returns {Number} The number of seconds the provided instance is ahead of UTC
	 */
	JulianDate.computeTaiMinusUtc = function (julianDate) {
	  binarySearchScratchLeapSecond.julianDate = julianDate;
	  const leapSeconds = JulianDate.leapSeconds;
	  let index = binarySearch(
	    leapSeconds,
	    binarySearchScratchLeapSecond,
	    compareLeapSecondDates$1
	  );
	  if (index < 0) {
	    index = ~index;
	    --index;
	    if (index < 0) {
	      index = 0;
	    }
	  }
	  return leapSeconds[index].offset;
	};

	/**
	 * Adds the provided number of seconds to the provided date instance.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @param {Number} seconds The number of seconds to add or subtract.
	 * @param {JulianDate} result An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter.
	 */
	JulianDate.addSeconds = function (julianDate, seconds, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  if (!defaultValue.defined(seconds)) {
	    throw new Check.DeveloperError("seconds is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  return setComponents(
	    julianDate.dayNumber,
	    julianDate.secondsOfDay + seconds,
	    result
	  );
	};

	/**
	 * Adds the provided number of minutes to the provided date instance.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @param {Number} minutes The number of minutes to add or subtract.
	 * @param {JulianDate} result An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter.
	 */
	JulianDate.addMinutes = function (julianDate, minutes, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  if (!defaultValue.defined(minutes)) {
	    throw new Check.DeveloperError("minutes is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  const newSecondsOfDay =
	    julianDate.secondsOfDay + minutes * TimeConstants$1.SECONDS_PER_MINUTE;
	  return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
	};

	/**
	 * Adds the provided number of hours to the provided date instance.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @param {Number} hours The number of hours to add or subtract.
	 * @param {JulianDate} result An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter.
	 */
	JulianDate.addHours = function (julianDate, hours, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  if (!defaultValue.defined(hours)) {
	    throw new Check.DeveloperError("hours is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  const newSecondsOfDay =
	    julianDate.secondsOfDay + hours * TimeConstants$1.SECONDS_PER_HOUR;
	  return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
	};

	/**
	 * Adds the provided number of days to the provided date instance.
	 *
	 * @param {JulianDate} julianDate The date.
	 * @param {Number} days The number of days to add or subtract.
	 * @param {JulianDate} result An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter.
	 */
	JulianDate.addDays = function (julianDate, days, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(julianDate)) {
	    throw new Check.DeveloperError("julianDate is required.");
	  }
	  if (!defaultValue.defined(days)) {
	    throw new Check.DeveloperError("days is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  const newJulianDayNumber = julianDate.dayNumber + days;
	  return setComponents(newJulianDayNumber, julianDate.secondsOfDay, result);
	};

	/**
	 * Compares the provided instances and returns <code>true</code> if <code>left</code> is earlier than <code>right</code>, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Boolean} <code>true</code> if <code>left</code> is earlier than <code>right</code>, <code>false</code> otherwise.
	 */
	JulianDate.lessThan = function (left, right) {
	  return JulianDate.compare(left, right) < 0;
	};

	/**
	 * Compares the provided instances and returns <code>true</code> if <code>left</code> is earlier than or equal to <code>right</code>, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Boolean} <code>true</code> if <code>left</code> is earlier than or equal to <code>right</code>, <code>false</code> otherwise.
	 */
	JulianDate.lessThanOrEquals = function (left, right) {
	  return JulianDate.compare(left, right) <= 0;
	};

	/**
	 * Compares the provided instances and returns <code>true</code> if <code>left</code> is later than <code>right</code>, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Boolean} <code>true</code> if <code>left</code> is later than <code>right</code>, <code>false</code> otherwise.
	 */
	JulianDate.greaterThan = function (left, right) {
	  return JulianDate.compare(left, right) > 0;
	};

	/**
	 * Compares the provided instances and returns <code>true</code> if <code>left</code> is later than or equal to <code>right</code>, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} left The first instance.
	 * @param {JulianDate} right The second instance.
	 * @returns {Boolean} <code>true</code> if <code>left</code> is later than or equal to <code>right</code>, <code>false</code> otherwise.
	 */
	JulianDate.greaterThanOrEquals = function (left, right) {
	  return JulianDate.compare(left, right) >= 0;
	};

	/**
	 * Duplicates this instance.
	 *
	 * @param {JulianDate} [result] An existing instance to use for the result.
	 * @returns {JulianDate} The modified result parameter or a new instance if none was provided.
	 */
	JulianDate.prototype.clone = function (result) {
	  return JulianDate.clone(this, result);
	};

	/**
	 * Compares this and the provided instance and returns <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {JulianDate} [right] The second instance.
	 * @returns {Boolean} <code>true</code> if the dates are equal; otherwise, <code>false</code>.
	 */
	JulianDate.prototype.equals = function (right) {
	  return JulianDate.equals(this, right);
	};

	/**
	 * Compares this and the provided instance and returns <code>true</code> if they are within <code>epsilon</code> seconds of
	 * each other.  That is, in order for the dates to be considered equal (and for
	 * this function to return <code>true</code>), the absolute value of the difference between them, in
	 * seconds, must be less than <code>epsilon</code>.
	 *
	 * @param {JulianDate} [right] The second instance.
	 * @param {Number} [epsilon=0] The maximum number of seconds that should separate the two instances.
	 * @returns {Boolean} <code>true</code> if the two dates are within <code>epsilon</code> seconds of each other; otherwise <code>false</code>.
	 */
	JulianDate.prototype.equalsEpsilon = function (right, epsilon) {
	  return JulianDate.equalsEpsilon(this, right, epsilon);
	};

	/**
	 * Creates a string representing this date in ISO8601 format.
	 *
	 * @returns {String} A string representing this date in ISO8601 format.
	 */
	JulianDate.prototype.toString = function () {
	  return JulianDate.toIso8601(this);
	};

	/**
	 * Gets or sets the list of leap seconds used throughout Cesium.
	 * @memberof JulianDate
	 * @type {LeapSecond[]}
	 */
	JulianDate.leapSeconds = [
	  new LeapSecond(new JulianDate(2441317, 43210.0, TimeStandard$1.TAI), 10), // January 1, 1972 00:00:00 UTC
	  new LeapSecond(new JulianDate(2441499, 43211.0, TimeStandard$1.TAI), 11), // July 1, 1972 00:00:00 UTC
	  new LeapSecond(new JulianDate(2441683, 43212.0, TimeStandard$1.TAI), 12), // January 1, 1973 00:00:00 UTC
	  new LeapSecond(new JulianDate(2442048, 43213.0, TimeStandard$1.TAI), 13), // January 1, 1974 00:00:00 UTC
	  new LeapSecond(new JulianDate(2442413, 43214.0, TimeStandard$1.TAI), 14), // January 1, 1975 00:00:00 UTC
	  new LeapSecond(new JulianDate(2442778, 43215.0, TimeStandard$1.TAI), 15), // January 1, 1976 00:00:00 UTC
	  new LeapSecond(new JulianDate(2443144, 43216.0, TimeStandard$1.TAI), 16), // January 1, 1977 00:00:00 UTC
	  new LeapSecond(new JulianDate(2443509, 43217.0, TimeStandard$1.TAI), 17), // January 1, 1978 00:00:00 UTC
	  new LeapSecond(new JulianDate(2443874, 43218.0, TimeStandard$1.TAI), 18), // January 1, 1979 00:00:00 UTC
	  new LeapSecond(new JulianDate(2444239, 43219.0, TimeStandard$1.TAI), 19), // January 1, 1980 00:00:00 UTC
	  new LeapSecond(new JulianDate(2444786, 43220.0, TimeStandard$1.TAI), 20), // July 1, 1981 00:00:00 UTC
	  new LeapSecond(new JulianDate(2445151, 43221.0, TimeStandard$1.TAI), 21), // July 1, 1982 00:00:00 UTC
	  new LeapSecond(new JulianDate(2445516, 43222.0, TimeStandard$1.TAI), 22), // July 1, 1983 00:00:00 UTC
	  new LeapSecond(new JulianDate(2446247, 43223.0, TimeStandard$1.TAI), 23), // July 1, 1985 00:00:00 UTC
	  new LeapSecond(new JulianDate(2447161, 43224.0, TimeStandard$1.TAI), 24), // January 1, 1988 00:00:00 UTC
	  new LeapSecond(new JulianDate(2447892, 43225.0, TimeStandard$1.TAI), 25), // January 1, 1990 00:00:00 UTC
	  new LeapSecond(new JulianDate(2448257, 43226.0, TimeStandard$1.TAI), 26), // January 1, 1991 00:00:00 UTC
	  new LeapSecond(new JulianDate(2448804, 43227.0, TimeStandard$1.TAI), 27), // July 1, 1992 00:00:00 UTC
	  new LeapSecond(new JulianDate(2449169, 43228.0, TimeStandard$1.TAI), 28), // July 1, 1993 00:00:00 UTC
	  new LeapSecond(new JulianDate(2449534, 43229.0, TimeStandard$1.TAI), 29), // July 1, 1994 00:00:00 UTC
	  new LeapSecond(new JulianDate(2450083, 43230.0, TimeStandard$1.TAI), 30), // January 1, 1996 00:00:00 UTC
	  new LeapSecond(new JulianDate(2450630, 43231.0, TimeStandard$1.TAI), 31), // July 1, 1997 00:00:00 UTC
	  new LeapSecond(new JulianDate(2451179, 43232.0, TimeStandard$1.TAI), 32), // January 1, 1999 00:00:00 UTC
	  new LeapSecond(new JulianDate(2453736, 43233.0, TimeStandard$1.TAI), 33), // January 1, 2006 00:00:00 UTC
	  new LeapSecond(new JulianDate(2454832, 43234.0, TimeStandard$1.TAI), 34), // January 1, 2009 00:00:00 UTC
	  new LeapSecond(new JulianDate(2456109, 43235.0, TimeStandard$1.TAI), 35), // July 1, 2012 00:00:00 UTC
	  new LeapSecond(new JulianDate(2457204, 43236.0, TimeStandard$1.TAI), 36), // July 1, 2015 00:00:00 UTC
	  new LeapSecond(new JulianDate(2457754, 43237.0, TimeStandard$1.TAI), 37), // January 1, 2017 00:00:00 UTC
	];

	var URIExports = {};
	var URI = {
	  get exports(){ return URIExports; },
	  set exports(v){ URIExports = v; },
	};

	var punycodeExports = {};
	var punycode = {
	  get exports(){ return punycodeExports; },
	  set exports(v){ punycodeExports = v; },
	};

	/*! https://mths.be/punycode v1.4.0 by @mathias */

	var hasRequiredPunycode;

	function requirePunycode () {
		if (hasRequiredPunycode) return punycodeExports;
		hasRequiredPunycode = 1;
		(function (module, exports) {
	(function(root) {

				/** Detect free variables */
				var freeExports = exports &&
					!exports.nodeType && exports;
				var freeModule = module &&
					!module.nodeType && module;
				var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal;
				if (
					freeGlobal.global === freeGlobal ||
					freeGlobal.window === freeGlobal ||
					freeGlobal.self === freeGlobal
				) {
					root = freeGlobal;
				}

				/**
				 * The `punycode` object.
				 * @name punycode
				 * @type Object
				 */
				var punycode,

				/** Highest positive signed 32-bit float value */
				maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

				/** Bootstring parameters */
				base = 36,
				tMin = 1,
				tMax = 26,
				skew = 38,
				damp = 700,
				initialBias = 72,
				initialN = 128, // 0x80
				delimiter = '-', // '\x2D'

				/** Regular expressions */
				regexPunycode = /^xn--/,
				regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
				regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

				/** Error messages */
				errors = {
					'overflow': 'Overflow: input needs wider integers to process',
					'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
					'invalid-input': 'Invalid input'
				},

				/** Convenience shortcuts */
				baseMinusTMin = base - tMin,
				floor = Math.floor,
				stringFromCharCode = String.fromCharCode,

				/** Temporary variable */
				key;

				/*--------------------------------------------------------------------------*/

				/**
				 * A generic error utility function.
				 * @private
				 * @param {String} type The error type.
				 * @returns {Error} Throws a `RangeError` with the applicable error message.
				 */
				function error(type) {
					throw new RangeError(errors[type]);
				}

				/**
				 * A generic `Array#map` utility function.
				 * @private
				 * @param {Array} array The array to iterate over.
				 * @param {Function} callback The function that gets called for every array
				 * item.
				 * @returns {Array} A new array of values returned by the callback function.
				 */
				function map(array, fn) {
					var length = array.length;
					var result = [];
					while (length--) {
						result[length] = fn(array[length]);
					}
					return result;
				}

				/**
				 * A simple `Array#map`-like wrapper to work with domain name strings or email
				 * addresses.
				 * @private
				 * @param {String} domain The domain name or email address.
				 * @param {Function} callback The function that gets called for every
				 * character.
				 * @returns {Array} A new string of characters returned by the callback
				 * function.
				 */
				function mapDomain(string, fn) {
					var parts = string.split('@');
					var result = '';
					if (parts.length > 1) {
						// In email addresses, only the domain name should be punycoded. Leave
						// the local part (i.e. everything up to `@`) intact.
						result = parts[0] + '@';
						string = parts[1];
					}
					// Avoid `split(regex)` for IE8 compatibility. See #17.
					string = string.replace(regexSeparators, '\x2E');
					var labels = string.split('.');
					var encoded = map(labels, fn).join('.');
					return result + encoded;
				}

				/**
				 * Creates an array containing the numeric code points of each Unicode
				 * character in the string. While JavaScript uses UCS-2 internally,
				 * this function will convert a pair of surrogate halves (each of which
				 * UCS-2 exposes as separate characters) into a single code point,
				 * matching UTF-16.
				 * @see `punycode.ucs2.encode`
				 * @see <https://mathiasbynens.be/notes/javascript-encoding>
				 * @memberOf punycode.ucs2
				 * @name decode
				 * @param {String} string The Unicode input string (UCS-2).
				 * @returns {Array} The new array of code points.
				 */
				function ucs2decode(string) {
					var output = [],
					    counter = 0,
					    length = string.length,
					    value,
					    extra;
					while (counter < length) {
						value = string.charCodeAt(counter++);
						if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
							// high surrogate, and there is a next character
							extra = string.charCodeAt(counter++);
							if ((extra & 0xFC00) == 0xDC00) { // low surrogate
								output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
							} else {
								// unmatched surrogate; only append this code unit, in case the next
								// code unit is the high surrogate of a surrogate pair
								output.push(value);
								counter--;
							}
						} else {
							output.push(value);
						}
					}
					return output;
				}

				/**
				 * Creates a string based on an array of numeric code points.
				 * @see `punycode.ucs2.decode`
				 * @memberOf punycode.ucs2
				 * @name encode
				 * @param {Array} codePoints The array of numeric code points.
				 * @returns {String} The new Unicode string (UCS-2).
				 */
				function ucs2encode(array) {
					return map(array, function(value) {
						var output = '';
						if (value > 0xFFFF) {
							value -= 0x10000;
							output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
							value = 0xDC00 | value & 0x3FF;
						}
						output += stringFromCharCode(value);
						return output;
					}).join('');
				}

				/**
				 * Converts a basic code point into a digit/integer.
				 * @see `digitToBasic()`
				 * @private
				 * @param {Number} codePoint The basic numeric code point value.
				 * @returns {Number} The numeric value of a basic code point (for use in
				 * representing integers) in the range `0` to `base - 1`, or `base` if
				 * the code point does not represent a value.
				 */
				function basicToDigit(codePoint) {
					if (codePoint - 48 < 10) {
						return codePoint - 22;
					}
					if (codePoint - 65 < 26) {
						return codePoint - 65;
					}
					if (codePoint - 97 < 26) {
						return codePoint - 97;
					}
					return base;
				}

				/**
				 * Converts a digit/integer into a basic code point.
				 * @see `basicToDigit()`
				 * @private
				 * @param {Number} digit The numeric value of a basic code point.
				 * @returns {Number} The basic code point whose value (when used for
				 * representing integers) is `digit`, which needs to be in the range
				 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
				 * used; else, the lowercase form is used. The behavior is undefined
				 * if `flag` is non-zero and `digit` has no uppercase form.
				 */
				function digitToBasic(digit, flag) {
					//  0..25 map to ASCII a..z or A..Z
					// 26..35 map to ASCII 0..9
					return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
				}

				/**
				 * Bias adaptation function as per section 3.4 of RFC 3492.
				 * https://tools.ietf.org/html/rfc3492#section-3.4
				 * @private
				 */
				function adapt(delta, numPoints, firstTime) {
					var k = 0;
					delta = firstTime ? floor(delta / damp) : delta >> 1;
					delta += floor(delta / numPoints);
					for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
						delta = floor(delta / baseMinusTMin);
					}
					return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
				}

				/**
				 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
				 * symbols.
				 * @memberOf punycode
				 * @param {String} input The Punycode string of ASCII-only symbols.
				 * @returns {String} The resulting string of Unicode symbols.
				 */
				function decode(input) {
					// Don't use UCS-2
					var output = [],
					    inputLength = input.length,
					    out,
					    i = 0,
					    n = initialN,
					    bias = initialBias,
					    basic,
					    j,
					    index,
					    oldi,
					    w,
					    k,
					    digit,
					    t,
					    /** Cached calculation results */
					    baseMinusT;

					// Handle the basic code points: let `basic` be the number of input code
					// points before the last delimiter, or `0` if there is none, then copy
					// the first basic code points to the output.

					basic = input.lastIndexOf(delimiter);
					if (basic < 0) {
						basic = 0;
					}

					for (j = 0; j < basic; ++j) {
						// if it's not a basic code point
						if (input.charCodeAt(j) >= 0x80) {
							error('not-basic');
						}
						output.push(input.charCodeAt(j));
					}

					// Main decoding loop: start just after the last delimiter if any basic code
					// points were copied; start at the beginning otherwise.

					for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

						// `index` is the index of the next character to be consumed.
						// Decode a generalized variable-length integer into `delta`,
						// which gets added to `i`. The overflow checking is easier
						// if we increase `i` as we go, then subtract off its starting
						// value at the end to obtain `delta`.
						for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

							if (index >= inputLength) {
								error('invalid-input');
							}

							digit = basicToDigit(input.charCodeAt(index++));

							if (digit >= base || digit > floor((maxInt - i) / w)) {
								error('overflow');
							}

							i += digit * w;
							t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

							if (digit < t) {
								break;
							}

							baseMinusT = base - t;
							if (w > floor(maxInt / baseMinusT)) {
								error('overflow');
							}

							w *= baseMinusT;

						}

						out = output.length + 1;
						bias = adapt(i - oldi, out, oldi == 0);

						// `i` was supposed to wrap around from `out` to `0`,
						// incrementing `n` each time, so we'll fix that now:
						if (floor(i / out) > maxInt - n) {
							error('overflow');
						}

						n += floor(i / out);
						i %= out;

						// Insert `n` at position `i` of the output
						output.splice(i++, 0, n);

					}

					return ucs2encode(output);
				}

				/**
				 * Converts a string of Unicode symbols (e.g. a domain name label) to a
				 * Punycode string of ASCII-only symbols.
				 * @memberOf punycode
				 * @param {String} input The string of Unicode symbols.
				 * @returns {String} The resulting Punycode string of ASCII-only symbols.
				 */
				function encode(input) {
					var n,
					    delta,
					    handledCPCount,
					    basicLength,
					    bias,
					    j,
					    m,
					    q,
					    k,
					    t,
					    currentValue,
					    output = [],
					    /** `inputLength` will hold the number of code points in `input`. */
					    inputLength,
					    /** Cached calculation results */
					    handledCPCountPlusOne,
					    baseMinusT,
					    qMinusT;

					// Convert the input in UCS-2 to Unicode
					input = ucs2decode(input);

					// Cache the length
					inputLength = input.length;

					// Initialize the state
					n = initialN;
					delta = 0;
					bias = initialBias;

					// Handle the basic code points
					for (j = 0; j < inputLength; ++j) {
						currentValue = input[j];
						if (currentValue < 0x80) {
							output.push(stringFromCharCode(currentValue));
						}
					}

					handledCPCount = basicLength = output.length;

					// `handledCPCount` is the number of code points that have been handled;
					// `basicLength` is the number of basic code points.

					// Finish the basic string - if it is not empty - with a delimiter
					if (basicLength) {
						output.push(delimiter);
					}

					// Main encoding loop:
					while (handledCPCount < inputLength) {

						// All non-basic code points < n have been handled already. Find the next
						// larger one:
						for (m = maxInt, j = 0; j < inputLength; ++j) {
							currentValue = input[j];
							if (currentValue >= n && currentValue < m) {
								m = currentValue;
							}
						}

						// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
						// but guard against overflow
						handledCPCountPlusOne = handledCPCount + 1;
						if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
							error('overflow');
						}

						delta += (m - n) * handledCPCountPlusOne;
						n = m;

						for (j = 0; j < inputLength; ++j) {
							currentValue = input[j];

							if (currentValue < n && ++delta > maxInt) {
								error('overflow');
							}

							if (currentValue == n) {
								// Represent delta as a generalized variable-length integer
								for (q = delta, k = base; /* no condition */; k += base) {
									t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
									if (q < t) {
										break;
									}
									qMinusT = q - t;
									baseMinusT = base - t;
									output.push(
										stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
									);
									q = floor(qMinusT / baseMinusT);
								}

								output.push(stringFromCharCode(digitToBasic(q, 0)));
								bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
								delta = 0;
								++handledCPCount;
							}
						}

						++delta;
						++n;

					}
					return output.join('');
				}

				/**
				 * Converts a Punycode string representing a domain name or an email address
				 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
				 * it doesn't matter if you call it on a string that has already been
				 * converted to Unicode.
				 * @memberOf punycode
				 * @param {String} input The Punycoded domain name or email address to
				 * convert to Unicode.
				 * @returns {String} The Unicode representation of the given Punycode
				 * string.
				 */
				function toUnicode(input) {
					return mapDomain(input, function(string) {
						return regexPunycode.test(string)
							? decode(string.slice(4).toLowerCase())
							: string;
					});
				}

				/**
				 * Converts a Unicode string representing a domain name or an email address to
				 * Punycode. Only the non-ASCII parts of the domain name will be converted,
				 * i.e. it doesn't matter if you call it with a domain that's already in
				 * ASCII.
				 * @memberOf punycode
				 * @param {String} input The domain name or email address to convert, as a
				 * Unicode string.
				 * @returns {String} The Punycode representation of the given domain name or
				 * email address.
				 */
				function toASCII(input) {
					return mapDomain(input, function(string) {
						return regexNonASCII.test(string)
							? 'xn--' + encode(string)
							: string;
					});
				}

				/*--------------------------------------------------------------------------*/

				/** Define the public API */
				punycode = {
					/**
					 * A string representing the current Punycode.js version number.
					 * @memberOf punycode
					 * @type String
					 */
					'version': '1.3.2',
					/**
					 * An object of methods to convert from JavaScript's internal character
					 * representation (UCS-2) to Unicode code points, and back.
					 * @see <https://mathiasbynens.be/notes/javascript-encoding>
					 * @memberOf punycode
					 * @type Object
					 */
					'ucs2': {
						'decode': ucs2decode,
						'encode': ucs2encode
					},
					'decode': decode,
					'encode': encode,
					'toASCII': toASCII,
					'toUnicode': toUnicode
				};

				/** Expose `punycode` */
				// Some AMD build optimizers, like r.js, check for specific condition patterns
				// like the following:
				if (freeExports && freeModule) {
					if (module.exports == freeExports) {
						// in Node.js, io.js, or RingoJS v0.8.0+
						freeModule.exports = punycode;
					} else {
						// in Narwhal or RingoJS v0.7.0-
						for (key in punycode) {
							punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
						}
					}
				} else {
					// in Rhino or a web browser
					root.punycode = punycode;
				}

			}(commonjsGlobal));
	} (punycode, punycodeExports));
		return punycodeExports;
	}

	var IPv6Exports = {};
	var IPv6 = {
	  get exports(){ return IPv6Exports; },
	  set exports(v){ IPv6Exports = v; },
	};

	/*!
	 * URI.js - Mutating URLs
	 * IPv6 Support
	 *
	 * Version: 1.19.11
	 *
	 * Author: Rodney Rehm
	 * Web: http://medialize.github.io/URI.js/
	 *
	 * Licensed under
	 *   MIT License http://www.opensource.org/licenses/mit-license
	 *
	 */

	var hasRequiredIPv6;

	function requireIPv6 () {
		if (hasRequiredIPv6) return IPv6Exports;
		hasRequiredIPv6 = 1;
		(function (module) {
			(function (root, factory) {
			  // https://github.com/umdjs/umd/blob/master/returnExports.js
			  if (module.exports) {
			    // Node
			    module.exports = factory();
			  } else {
			    // Browser globals (root is window)
			    root.IPv6 = factory(root);
			  }
			}(commonjsGlobal, function (root) {

			  /*
			  var _in = "fe80:0000:0000:0000:0204:61ff:fe9d:f156";
			  var _out = IPv6.best(_in);
			  var _expected = "fe80::204:61ff:fe9d:f156";

			  console.log(_in, _out, _expected, _out === _expected);
			  */

			  // save current IPv6 variable, if any
			  var _IPv6 = root && root.IPv6;

			  function bestPresentation(address) {
			    // based on:
			    // Javascript to test an IPv6 address for proper format, and to
			    // present the "best text representation" according to IETF Draft RFC at
			    // http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04
			    // 8 Feb 2010 Rich Brown, Dartware, LLC
			    // Please feel free to use this code as long as you provide a link to
			    // http://www.intermapper.com
			    // http://intermapper.com/support/tools/IPV6-Validator.aspx
			    // http://download.dartware.com/thirdparty/ipv6validator.js

			    var _address = address.toLowerCase();
			    var segments = _address.split(':');
			    var length = segments.length;
			    var total = 8;

			    // trim colons (:: or ::a:b:c… or …a:b:c::)
			    if (segments[0] === '' && segments[1] === '' && segments[2] === '') {
			      // must have been ::
			      // remove first two items
			      segments.shift();
			      segments.shift();
			    } else if (segments[0] === '' && segments[1] === '') {
			      // must have been ::xxxx
			      // remove the first item
			      segments.shift();
			    } else if (segments[length - 1] === '' && segments[length - 2] === '') {
			      // must have been xxxx::
			      segments.pop();
			    }

			    length = segments.length;

			    // adjust total segments for IPv4 trailer
			    if (segments[length - 1].indexOf('.') !== -1) {
			      // found a "." which means IPv4
			      total = 7;
			    }

			    // fill empty segments them with "0000"
			    var pos;
			    for (pos = 0; pos < length; pos++) {
			      if (segments[pos] === '') {
			        break;
			      }
			    }

			    if (pos < total) {
			      segments.splice(pos, 1, '0000');
			      while (segments.length < total) {
			        segments.splice(pos, 0, '0000');
			      }
			    }

			    // strip leading zeros
			    var _segments;
			    for (var i = 0; i < total; i++) {
			      _segments = segments[i].split('');
			      for (var j = 0; j < 3 ; j++) {
			        if (_segments[0] === '0' && _segments.length > 1) {
			          _segments.splice(0,1);
			        } else {
			          break;
			        }
			      }

			      segments[i] = _segments.join('');
			    }

			    // find longest sequence of zeroes and coalesce them into one segment
			    var best = -1;
			    var _best = 0;
			    var _current = 0;
			    var current = -1;
			    var inzeroes = false;
			    // i; already declared

			    for (i = 0; i < total; i++) {
			      if (inzeroes) {
			        if (segments[i] === '0') {
			          _current += 1;
			        } else {
			          inzeroes = false;
			          if (_current > _best) {
			            best = current;
			            _best = _current;
			          }
			        }
			      } else {
			        if (segments[i] === '0') {
			          inzeroes = true;
			          current = i;
			          _current = 1;
			        }
			      }
			    }

			    if (_current > _best) {
			      best = current;
			      _best = _current;
			    }

			    if (_best > 1) {
			      segments.splice(best, _best, '');
			    }

			    length = segments.length;

			    // assemble remaining segments
			    var result = '';
			    if (segments[0] === '')  {
			      result = ':';
			    }

			    for (i = 0; i < length; i++) {
			      result += segments[i];
			      if (i === length - 1) {
			        break;
			      }

			      result += ':';
			    }

			    if (segments[length - 1] === '') {
			      result += ':';
			    }

			    return result;
			  }

			  function noConflict() {
			    /*jshint validthis: true */
			    if (root.IPv6 === this) {
			      root.IPv6 = _IPv6;
			    }

			    return this;
			  }

			  return {
			    best: bestPresentation,
			    noConflict: noConflict
			  };
			}));
	} (IPv6));
		return IPv6Exports;
	}

	var SecondLevelDomainsExports = {};
	var SecondLevelDomains = {
	  get exports(){ return SecondLevelDomainsExports; },
	  set exports(v){ SecondLevelDomainsExports = v; },
	};

	/*!
	 * URI.js - Mutating URLs
	 * Second Level Domain (SLD) Support
	 *
	 * Version: 1.19.11
	 *
	 * Author: Rodney Rehm
	 * Web: http://medialize.github.io/URI.js/
	 *
	 * Licensed under
	 *   MIT License http://www.opensource.org/licenses/mit-license
	 *
	 */

	var hasRequiredSecondLevelDomains;

	function requireSecondLevelDomains () {
		if (hasRequiredSecondLevelDomains) return SecondLevelDomainsExports;
		hasRequiredSecondLevelDomains = 1;
		(function (module) {
			(function (root, factory) {
			  // https://github.com/umdjs/umd/blob/master/returnExports.js
			  if (module.exports) {
			    // Node
			    module.exports = factory();
			  } else {
			    // Browser globals (root is window)
			    root.SecondLevelDomains = factory(root);
			  }
			}(commonjsGlobal, function (root) {

			  // save current SecondLevelDomains variable, if any
			  var _SecondLevelDomains = root && root.SecondLevelDomains;

			  var SLD = {
			    // list of known Second Level Domains
			    // converted list of SLDs from https://github.com/gavingmiller/second-level-domains
			    // ----
			    // publicsuffix.org is more current and actually used by a couple of browsers internally.
			    // downside is it also contains domains like "dyndns.org" - which is fine for the security
			    // issues browser have to deal with (SOP for cookies, etc) - but is way overboard for URI.js
			    // ----
			    list: {
			      'ac':' com gov mil net org ',
			      'ae':' ac co gov mil name net org pro sch ',
			      'af':' com edu gov net org ',
			      'al':' com edu gov mil net org ',
			      'ao':' co ed gv it og pb ',
			      'ar':' com edu gob gov int mil net org tur ',
			      'at':' ac co gv or ',
			      'au':' asn com csiro edu gov id net org ',
			      'ba':' co com edu gov mil net org rs unbi unmo unsa untz unze ',
			      'bb':' biz co com edu gov info net org store tv ',
			      'bh':' biz cc com edu gov info net org ',
			      'bn':' com edu gov net org ',
			      'bo':' com edu gob gov int mil net org tv ',
			      'br':' adm adv agr am arq art ato b bio blog bmd cim cng cnt com coop ecn edu eng esp etc eti far flog fm fnd fot fst g12 ggf gov imb ind inf jor jus lel mat med mil mus net nom not ntr odo org ppg pro psc psi qsl rec slg srv tmp trd tur tv vet vlog wiki zlg ',
			      'bs':' com edu gov net org ',
			      'bz':' du et om ov rg ',
			      'ca':' ab bc mb nb nf nl ns nt nu on pe qc sk yk ',
			      'ck':' biz co edu gen gov info net org ',
			      'cn':' ac ah bj com cq edu fj gd gov gs gx gz ha hb he hi hl hn jl js jx ln mil net nm nx org qh sc sd sh sn sx tj tw xj xz yn zj ',
			      'co':' com edu gov mil net nom org ',
			      'cr':' ac c co ed fi go or sa ',
			      'cy':' ac biz com ekloges gov ltd name net org parliament press pro tm ',
			      'do':' art com edu gob gov mil net org sld web ',
			      'dz':' art asso com edu gov net org pol ',
			      'ec':' com edu fin gov info med mil net org pro ',
			      'eg':' com edu eun gov mil name net org sci ',
			      'er':' com edu gov ind mil net org rochest w ',
			      'es':' com edu gob nom org ',
			      'et':' biz com edu gov info name net org ',
			      'fj':' ac biz com info mil name net org pro ',
			      'fk':' ac co gov net nom org ',
			      'fr':' asso com f gouv nom prd presse tm ',
			      'gg':' co net org ',
			      'gh':' com edu gov mil org ',
			      'gn':' ac com gov net org ',
			      'gr':' com edu gov mil net org ',
			      'gt':' com edu gob ind mil net org ',
			      'gu':' com edu gov net org ',
			      'hk':' com edu gov idv net org ',
			      'hu':' 2000 agrar bolt casino city co erotica erotika film forum games hotel info ingatlan jogasz konyvelo lakas media news org priv reklam sex shop sport suli szex tm tozsde utazas video ',
			      'id':' ac co go mil net or sch web ',
			      'il':' ac co gov idf k12 muni net org ',
			      'in':' ac co edu ernet firm gen gov i ind mil net nic org res ',
			      'iq':' com edu gov i mil net org ',
			      'ir':' ac co dnssec gov i id net org sch ',
			      'it':' edu gov ',
			      'je':' co net org ',
			      'jo':' com edu gov mil name net org sch ',
			      'jp':' ac ad co ed go gr lg ne or ',
			      'ke':' ac co go info me mobi ne or sc ',
			      'kh':' com edu gov mil net org per ',
			      'ki':' biz com de edu gov info mob net org tel ',
			      'km':' asso com coop edu gouv k medecin mil nom notaires pharmaciens presse tm veterinaire ',
			      'kn':' edu gov net org ',
			      'kr':' ac busan chungbuk chungnam co daegu daejeon es gangwon go gwangju gyeongbuk gyeonggi gyeongnam hs incheon jeju jeonbuk jeonnam k kg mil ms ne or pe re sc seoul ulsan ',
			      'kw':' com edu gov net org ',
			      'ky':' com edu gov net org ',
			      'kz':' com edu gov mil net org ',
			      'lb':' com edu gov net org ',
			      'lk':' assn com edu gov grp hotel int ltd net ngo org sch soc web ',
			      'lr':' com edu gov net org ',
			      'lv':' asn com conf edu gov id mil net org ',
			      'ly':' com edu gov id med net org plc sch ',
			      'ma':' ac co gov m net org press ',
			      'mc':' asso tm ',
			      'me':' ac co edu gov its net org priv ',
			      'mg':' com edu gov mil nom org prd tm ',
			      'mk':' com edu gov inf name net org pro ',
			      'ml':' com edu gov net org presse ',
			      'mn':' edu gov org ',
			      'mo':' com edu gov net org ',
			      'mt':' com edu gov net org ',
			      'mv':' aero biz com coop edu gov info int mil museum name net org pro ',
			      'mw':' ac co com coop edu gov int museum net org ',
			      'mx':' com edu gob net org ',
			      'my':' com edu gov mil name net org sch ',
			      'nf':' arts com firm info net other per rec store web ',
			      'ng':' biz com edu gov mil mobi name net org sch ',
			      'ni':' ac co com edu gob mil net nom org ',
			      'np':' com edu gov mil net org ',
			      'nr':' biz com edu gov info net org ',
			      'om':' ac biz co com edu gov med mil museum net org pro sch ',
			      'pe':' com edu gob mil net nom org sld ',
			      'ph':' com edu gov i mil net ngo org ',
			      'pk':' biz com edu fam gob gok gon gop gos gov net org web ',
			      'pl':' art bialystok biz com edu gda gdansk gorzow gov info katowice krakow lodz lublin mil net ngo olsztyn org poznan pwr radom slupsk szczecin torun warszawa waw wroc wroclaw zgora ',
			      'pr':' ac biz com edu est gov info isla name net org pro prof ',
			      'ps':' com edu gov net org plo sec ',
			      'pw':' belau co ed go ne or ',
			      'ro':' arts com firm info nom nt org rec store tm www ',
			      'rs':' ac co edu gov in org ',
			      'sb':' com edu gov net org ',
			      'sc':' com edu gov net org ',
			      'sh':' co com edu gov net nom org ',
			      'sl':' com edu gov net org ',
			      'st':' co com consulado edu embaixada gov mil net org principe saotome store ',
			      'sv':' com edu gob org red ',
			      'sz':' ac co org ',
			      'tr':' av bbs bel biz com dr edu gen gov info k12 name net org pol tel tsk tv web ',
			      'tt':' aero biz cat co com coop edu gov info int jobs mil mobi museum name net org pro tel travel ',
			      'tw':' club com ebiz edu game gov idv mil net org ',
			      'mu':' ac co com gov net or org ',
			      'mz':' ac co edu gov org ',
			      'na':' co com ',
			      'nz':' ac co cri geek gen govt health iwi maori mil net org parliament school ',
			      'pa':' abo ac com edu gob ing med net nom org sld ',
			      'pt':' com edu gov int net nome org publ ',
			      'py':' com edu gov mil net org ',
			      'qa':' com edu gov mil net org ',
			      're':' asso com nom ',
			      'ru':' ac adygeya altai amur arkhangelsk astrakhan bashkiria belgorod bir bryansk buryatia cbg chel chelyabinsk chita chukotka chuvashia com dagestan e-burg edu gov grozny int irkutsk ivanovo izhevsk jar joshkar-ola kalmykia kaluga kamchatka karelia kazan kchr kemerovo khabarovsk khakassia khv kirov koenig komi kostroma kranoyarsk kuban kurgan kursk lipetsk magadan mari mari-el marine mil mordovia mosreg msk murmansk nalchik net nnov nov novosibirsk nsk omsk orenburg org oryol penza perm pp pskov ptz rnd ryazan sakhalin samara saratov simbirsk smolensk spb stavropol stv surgut tambov tatarstan tom tomsk tsaritsyn tsk tula tuva tver tyumen udm udmurtia ulan-ude vladikavkaz vladimir vladivostok volgograd vologda voronezh vrn vyatka yakutia yamal yekaterinburg yuzhno-sakhalinsk ',
			      'rw':' ac co com edu gouv gov int mil net ',
			      'sa':' com edu gov med net org pub sch ',
			      'sd':' com edu gov info med net org tv ',
			      'se':' a ac b bd c d e f g h i k l m n o org p parti pp press r s t tm u w x y z ',
			      'sg':' com edu gov idn net org per ',
			      'sn':' art com edu gouv org perso univ ',
			      'sy':' com edu gov mil net news org ',
			      'th':' ac co go in mi net or ',
			      'tj':' ac biz co com edu go gov info int mil name net nic org test web ',
			      'tn':' agrinet com defense edunet ens fin gov ind info intl mincom nat net org perso rnrt rns rnu tourism ',
			      'tz':' ac co go ne or ',
			      'ua':' biz cherkassy chernigov chernovtsy ck cn co com crimea cv dn dnepropetrovsk donetsk dp edu gov if in ivano-frankivsk kh kharkov kherson khmelnitskiy kiev kirovograd km kr ks kv lg lugansk lutsk lviv me mk net nikolaev od odessa org pl poltava pp rovno rv sebastopol sumy te ternopil uzhgorod vinnica vn zaporizhzhe zhitomir zp zt ',
			      'ug':' ac co go ne or org sc ',
			      'uk':' ac bl british-library co cym gov govt icnet jet lea ltd me mil mod national-library-scotland nel net nhs nic nls org orgn parliament plc police sch scot soc ',
			      'us':' dni fed isa kids nsn ',
			      'uy':' com edu gub mil net org ',
			      've':' co com edu gob info mil net org web ',
			      'vi':' co com k12 net org ',
			      'vn':' ac biz com edu gov health info int name net org pro ',
			      'ye':' co com gov ltd me net org plc ',
			      'yu':' ac co edu gov org ',
			      'za':' ac agric alt bourse city co cybernet db edu gov grondar iaccess imt inca landesign law mil net ngo nis nom olivetti org pix school tm web ',
			      'zm':' ac co com edu gov net org sch ',
			      // https://en.wikipedia.org/wiki/CentralNic#Second-level_domains
			      'com': 'ar br cn de eu gb gr hu jpn kr no qc ru sa se uk us uy za ',
			      'net': 'gb jp se uk ',
			      'org': 'ae',
			      'de': 'com '
			    },
			    // gorhill 2013-10-25: Using indexOf() instead Regexp(). Significant boost
			    // in both performance and memory footprint. No initialization required.
			    // http://jsperf.com/uri-js-sld-regex-vs-binary-search/4
			    // Following methods use lastIndexOf() rather than array.split() in order
			    // to avoid any memory allocations.
			    has: function(domain) {
			      var tldOffset = domain.lastIndexOf('.');
			      if (tldOffset <= 0 || tldOffset >= (domain.length-1)) {
			        return false;
			      }
			      var sldOffset = domain.lastIndexOf('.', tldOffset-1);
			      if (sldOffset <= 0 || sldOffset >= (tldOffset-1)) {
			        return false;
			      }
			      var sldList = SLD.list[domain.slice(tldOffset+1)];
			      if (!sldList) {
			        return false;
			      }
			      return sldList.indexOf(' ' + domain.slice(sldOffset+1, tldOffset) + ' ') >= 0;
			    },
			    is: function(domain) {
			      var tldOffset = domain.lastIndexOf('.');
			      if (tldOffset <= 0 || tldOffset >= (domain.length-1)) {
			        return false;
			      }
			      var sldOffset = domain.lastIndexOf('.', tldOffset-1);
			      if (sldOffset >= 0) {
			        return false;
			      }
			      var sldList = SLD.list[domain.slice(tldOffset+1)];
			      if (!sldList) {
			        return false;
			      }
			      return sldList.indexOf(' ' + domain.slice(0, tldOffset) + ' ') >= 0;
			    },
			    get: function(domain) {
			      var tldOffset = domain.lastIndexOf('.');
			      if (tldOffset <= 0 || tldOffset >= (domain.length-1)) {
			        return null;
			      }
			      var sldOffset = domain.lastIndexOf('.', tldOffset-1);
			      if (sldOffset <= 0 || sldOffset >= (tldOffset-1)) {
			        return null;
			      }
			      var sldList = SLD.list[domain.slice(tldOffset+1)];
			      if (!sldList) {
			        return null;
			      }
			      if (sldList.indexOf(' ' + domain.slice(sldOffset+1, tldOffset) + ' ') < 0) {
			        return null;
			      }
			      return domain.slice(sldOffset+1);
			    },
			    noConflict: function(){
			      if (root.SecondLevelDomains === this) {
			        root.SecondLevelDomains = _SecondLevelDomains;
			      }
			      return this;
			    }
			  };

			  return SLD;
			}));
	} (SecondLevelDomains));
		return SecondLevelDomainsExports;
	}

	/*!
	 * URI.js - Mutating URLs
	 *
	 * Version: 1.19.11
	 *
	 * Author: Rodney Rehm
	 * Web: http://medialize.github.io/URI.js/
	 *
	 * Licensed under
	 *   MIT License http://www.opensource.org/licenses/mit-license
	 *
	 */

	(function (module) {
		(function (root, factory) {
		  // https://github.com/umdjs/umd/blob/master/returnExports.js
		  if (module.exports) {
		    // Node
		    module.exports = factory(requirePunycode(), requireIPv6(), requireSecondLevelDomains());
		  } else {
		    // Browser globals (root is window)
		    root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
		  }
		}(commonjsGlobal, function (punycode, IPv6, SLD, root) {
		  /*global location, escape, unescape */
		  // FIXME: v2.0.0 renamce non-camelCase properties to uppercase
		  /*jshint camelcase: false */

		  // save current URI variable, if any
		  var _URI = root && root.URI;

		  function URI(url, base) {
		    var _urlSupplied = arguments.length >= 1;
		    var _baseSupplied = arguments.length >= 2;

		    // Allow instantiation without the 'new' keyword
		    if (!(this instanceof URI)) {
		      if (_urlSupplied) {
		        if (_baseSupplied) {
		          return new URI(url, base);
		        }

		        return new URI(url);
		      }

		      return new URI();
		    }

		    if (url === undefined) {
		      if (_urlSupplied) {
		        throw new TypeError('undefined is not a valid argument for URI');
		      }

		      if (typeof location !== 'undefined') {
		        url = location.href + '';
		      } else {
		        url = '';
		      }
		    }

		    if (url === null) {
		      if (_urlSupplied) {
		        throw new TypeError('null is not a valid argument for URI');
		      }
		    }

		    this.href(url);

		    // resolve to base according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#constructor
		    if (base !== undefined) {
		      return this.absoluteTo(base);
		    }

		    return this;
		  }

		  function isInteger(value) {
		    return /^[0-9]+$/.test(value);
		  }

		  URI.version = '1.19.11';

		  var p = URI.prototype;
		  var hasOwn = Object.prototype.hasOwnProperty;

		  function escapeRegEx(string) {
		    // https://github.com/medialize/URI.js/commit/85ac21783c11f8ccab06106dba9735a31a86924d#commitcomment-821963
		    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
		  }

		  function getType(value) {
		    // IE8 doesn't return [Object Undefined] but [Object Object] for undefined value
		    if (value === undefined) {
		      return 'Undefined';
		    }

		    return String(Object.prototype.toString.call(value)).slice(8, -1);
		  }

		  function isArray(obj) {
		    return getType(obj) === 'Array';
		  }

		  function filterArrayValues(data, value) {
		    var lookup = {};
		    var i, length;

		    if (getType(value) === 'RegExp') {
		      lookup = null;
		    } else if (isArray(value)) {
		      for (i = 0, length = value.length; i < length; i++) {
		        lookup[value[i]] = true;
		      }
		    } else {
		      lookup[value] = true;
		    }

		    for (i = 0, length = data.length; i < length; i++) {
		      /*jshint laxbreak: true */
		      var _match = lookup && lookup[data[i]] !== undefined
		        || !lookup && value.test(data[i]);
		      /*jshint laxbreak: false */
		      if (_match) {
		        data.splice(i, 1);
		        length--;
		        i--;
		      }
		    }

		    return data;
		  }

		  function arrayContains(list, value) {
		    var i, length;

		    // value may be string, number, array, regexp
		    if (isArray(value)) {
		      // Note: this can be optimized to O(n) (instead of current O(m * n))
		      for (i = 0, length = value.length; i < length; i++) {
		        if (!arrayContains(list, value[i])) {
		          return false;
		        }
		      }

		      return true;
		    }

		    var _type = getType(value);
		    for (i = 0, length = list.length; i < length; i++) {
		      if (_type === 'RegExp') {
		        if (typeof list[i] === 'string' && list[i].match(value)) {
		          return true;
		        }
		      } else if (list[i] === value) {
		        return true;
		      }
		    }

		    return false;
		  }

		  function arraysEqual(one, two) {
		    if (!isArray(one) || !isArray(two)) {
		      return false;
		    }

		    // arrays can't be equal if they have different amount of content
		    if (one.length !== two.length) {
		      return false;
		    }

		    one.sort();
		    two.sort();

		    for (var i = 0, l = one.length; i < l; i++) {
		      if (one[i] !== two[i]) {
		        return false;
		      }
		    }

		    return true;
		  }

		  function trimSlashes(text) {
		    var trim_expression = /^\/+|\/+$/g;
		    return text.replace(trim_expression, '');
		  }

		  URI._parts = function() {
		    return {
		      protocol: null,
		      username: null,
		      password: null,
		      hostname: null,
		      urn: null,
		      port: null,
		      path: null,
		      query: null,
		      fragment: null,
		      // state
		      preventInvalidHostname: URI.preventInvalidHostname,
		      duplicateQueryParameters: URI.duplicateQueryParameters,
		      escapeQuerySpace: URI.escapeQuerySpace
		    };
		  };
		  // state: throw on invalid hostname
		  // see https://github.com/medialize/URI.js/pull/345
		  // and https://github.com/medialize/URI.js/issues/354
		  URI.preventInvalidHostname = false;
		  // state: allow duplicate query parameters (a=1&a=1)
		  URI.duplicateQueryParameters = false;
		  // state: replaces + with %20 (space in query strings)
		  URI.escapeQuerySpace = true;
		  // static properties
		  URI.protocol_expression = /^[a-z][a-z0-9.+-]*$/i;
		  URI.idn_expression = /[^a-z0-9\._-]/i;
		  URI.punycode_expression = /(xn--)/i;
		  // well, 333.444.555.666 matches, but it sure ain't no IPv4 - do we care?
		  URI.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
		  // credits to Rich Brown
		  // source: http://forums.intermapper.com/viewtopic.php?p=1096#1096
		  // specification: http://www.ietf.org/rfc/rfc4291.txt
		  URI.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
		  // expression used is "gruber revised" (@gruber v2) determined to be the
		  // best solution in a regex-golf we did a couple of ages ago at
		  // * http://mathiasbynens.be/demo/url-regex
		  // * http://rodneyrehm.de/t/url-regex.html
		  URI.find_uri_expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig;
		  URI.findUri = {
		    // valid "scheme://" or "www."
		    start: /\b(?:([a-z][a-z0-9.+-]*:\/\/)|www\.)/gi,
		    // everything up to the next whitespace
		    end: /[\s\r\n]|$/,
		    // trim trailing punctuation captured by end RegExp
		    trim: /[`!()\[\]{};:'".,<>?«»“”„‘’]+$/,
		    // balanced parens inclusion (), [], {}, <>
		    parens: /(\([^\)]*\)|\[[^\]]*\]|\{[^}]*\}|<[^>]*>)/g,
		  };
		  URI.leading_whitespace_expression = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/;
		  // https://infra.spec.whatwg.org/#ascii-tab-or-newline
		  URI.ascii_tab_whitespace = /[\u0009\u000A\u000D]+/g;
		  // http://www.iana.org/assignments/uri-schemes.html
		  // http://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers#Well-known_ports
		  URI.defaultPorts = {
		    http: '80',
		    https: '443',
		    ftp: '21',
		    gopher: '70',
		    ws: '80',
		    wss: '443'
		  };
		  // list of protocols which always require a hostname
		  URI.hostProtocols = [
		    'http',
		    'https'
		  ];

		  // allowed hostname characters according to RFC 3986
		  // ALPHA DIGIT "-" "." "_" "~" "!" "$" "&" "'" "(" ")" "*" "+" "," ";" "=" %encoded
		  // I've never seen a (non-IDN) hostname other than: ALPHA DIGIT . - _
		  URI.invalid_hostname_characters = /[^a-zA-Z0-9\.\-:_]/;
		  // map DOM Elements to their URI attribute
		  URI.domAttributes = {
		    'a': 'href',
		    'blockquote': 'cite',
		    'link': 'href',
		    'base': 'href',
		    'script': 'src',
		    'form': 'action',
		    'img': 'src',
		    'area': 'href',
		    'iframe': 'src',
		    'embed': 'src',
		    'source': 'src',
		    'track': 'src',
		    'input': 'src', // but only if type="image"
		    'audio': 'src',
		    'video': 'src'
		  };
		  URI.getDomAttribute = function(node) {
		    if (!node || !node.nodeName) {
		      return undefined;
		    }

		    var nodeName = node.nodeName.toLowerCase();
		    // <input> should only expose src for type="image"
		    if (nodeName === 'input' && node.type !== 'image') {
		      return undefined;
		    }

		    return URI.domAttributes[nodeName];
		  };

		  function escapeForDumbFirefox36(value) {
		    // https://github.com/medialize/URI.js/issues/91
		    return escape(value);
		  }

		  // encoding / decoding according to RFC3986
		  function strictEncodeURIComponent(string) {
		    // see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/encodeURIComponent
		    return encodeURIComponent(string)
		      .replace(/[!'()*]/g, escapeForDumbFirefox36)
		      .replace(/\*/g, '%2A');
		  }
		  URI.encode = strictEncodeURIComponent;
		  URI.decode = decodeURIComponent;
		  URI.iso8859 = function() {
		    URI.encode = escape;
		    URI.decode = unescape;
		  };
		  URI.unicode = function() {
		    URI.encode = strictEncodeURIComponent;
		    URI.decode = decodeURIComponent;
		  };
		  URI.characters = {
		    pathname: {
		      encode: {
		        // RFC3986 2.1: For consistency, URI producers and normalizers should
		        // use uppercase hexadecimal digits for all percent-encodings.
		        expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
		        map: {
		          // -._~!'()*
		          '%24': '$',
		          '%26': '&',
		          '%2B': '+',
		          '%2C': ',',
		          '%3B': ';',
		          '%3D': '=',
		          '%3A': ':',
		          '%40': '@'
		        }
		      },
		      decode: {
		        expression: /[\/\?#]/g,
		        map: {
		          '/': '%2F',
		          '?': '%3F',
		          '#': '%23'
		        }
		      }
		    },
		    reserved: {
		      encode: {
		        // RFC3986 2.1: For consistency, URI producers and normalizers should
		        // use uppercase hexadecimal digits for all percent-encodings.
		        expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
		        map: {
		          // gen-delims
		          '%3A': ':',
		          '%2F': '/',
		          '%3F': '?',
		          '%23': '#',
		          '%5B': '[',
		          '%5D': ']',
		          '%40': '@',
		          // sub-delims
		          '%21': '!',
		          '%24': '$',
		          '%26': '&',
		          '%27': '\'',
		          '%28': '(',
		          '%29': ')',
		          '%2A': '*',
		          '%2B': '+',
		          '%2C': ',',
		          '%3B': ';',
		          '%3D': '='
		        }
		      }
		    },
		    urnpath: {
		      // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
		      // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
		      // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
		      // note that the colon character is not featured in the encoding map; this is because URI.js
		      // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
		      // should not appear unencoded in a segment itself.
		      // See also the note above about RFC3986 and capitalalized hex digits.
		      encode: {
		        expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
		        map: {
		          '%21': '!',
		          '%24': '$',
		          '%27': '\'',
		          '%28': '(',
		          '%29': ')',
		          '%2A': '*',
		          '%2B': '+',
		          '%2C': ',',
		          '%3B': ';',
		          '%3D': '=',
		          '%40': '@'
		        }
		      },
		      // These characters are the characters called out by RFC2141 as "reserved" characters that
		      // should never appear in a URN, plus the colon character (see note above).
		      decode: {
		        expression: /[\/\?#:]/g,
		        map: {
		          '/': '%2F',
		          '?': '%3F',
		          '#': '%23',
		          ':': '%3A'
		        }
		      }
		    }
		  };
		  URI.encodeQuery = function(string, escapeQuerySpace) {
		    var escaped = URI.encode(string + '');
		    if (escapeQuerySpace === undefined) {
		      escapeQuerySpace = URI.escapeQuerySpace;
		    }

		    return escapeQuerySpace ? escaped.replace(/%20/g, '+') : escaped;
		  };
		  URI.decodeQuery = function(string, escapeQuerySpace) {
		    string += '';
		    if (escapeQuerySpace === undefined) {
		      escapeQuerySpace = URI.escapeQuerySpace;
		    }

		    try {
		      return URI.decode(escapeQuerySpace ? string.replace(/\+/g, '%20') : string);
		    } catch(e) {
		      // we're not going to mess with weird encodings,
		      // give up and return the undecoded original string
		      // see https://github.com/medialize/URI.js/issues/87
		      // see https://github.com/medialize/URI.js/issues/92
		      return string;
		    }
		  };
		  // generate encode/decode path functions
		  var _parts = {'encode':'encode', 'decode':'decode'};
		  var _part;
		  var generateAccessor = function(_group, _part) {
		    return function(string) {
		      try {
		        return URI[_part](string + '').replace(URI.characters[_group][_part].expression, function(c) {
		          return URI.characters[_group][_part].map[c];
		        });
		      } catch (e) {
		        // we're not going to mess with weird encodings,
		        // give up and return the undecoded original string
		        // see https://github.com/medialize/URI.js/issues/87
		        // see https://github.com/medialize/URI.js/issues/92
		        return string;
		      }
		    };
		  };

		  for (_part in _parts) {
		    URI[_part + 'PathSegment'] = generateAccessor('pathname', _parts[_part]);
		    URI[_part + 'UrnPathSegment'] = generateAccessor('urnpath', _parts[_part]);
		  }

		  var generateSegmentedPathFunction = function(_sep, _codingFuncName, _innerCodingFuncName) {
		    return function(string) {
		      // Why pass in names of functions, rather than the function objects themselves? The
		      // definitions of some functions (but in particular, URI.decode) will occasionally change due
		      // to URI.js having ISO8859 and Unicode modes. Passing in the name and getting it will ensure
		      // that the functions we use here are "fresh".
		      var actualCodingFunc;
		      if (!_innerCodingFuncName) {
		        actualCodingFunc = URI[_codingFuncName];
		      } else {
		        actualCodingFunc = function(string) {
		          return URI[_codingFuncName](URI[_innerCodingFuncName](string));
		        };
		      }

		      var segments = (string + '').split(_sep);

		      for (var i = 0, length = segments.length; i < length; i++) {
		        segments[i] = actualCodingFunc(segments[i]);
		      }

		      return segments.join(_sep);
		    };
		  };

		  // This takes place outside the above loop because we don't want, e.g., encodeUrnPath functions.
		  URI.decodePath = generateSegmentedPathFunction('/', 'decodePathSegment');
		  URI.decodeUrnPath = generateSegmentedPathFunction(':', 'decodeUrnPathSegment');
		  URI.recodePath = generateSegmentedPathFunction('/', 'encodePathSegment', 'decode');
		  URI.recodeUrnPath = generateSegmentedPathFunction(':', 'encodeUrnPathSegment', 'decode');

		  URI.encodeReserved = generateAccessor('reserved', 'encode');

		  URI.parse = function(string, parts) {
		    var pos;
		    if (!parts) {
		      parts = {
		        preventInvalidHostname: URI.preventInvalidHostname
		      };
		    }

		    string = string.replace(URI.leading_whitespace_expression, '');
		    // https://infra.spec.whatwg.org/#ascii-tab-or-newline
		    string = string.replace(URI.ascii_tab_whitespace, '');

		    // [protocol"://"[username[":"password]"@"]hostname[":"port]"/"?][path]["?"querystring]["#"fragment]

		    // extract fragment
		    pos = string.indexOf('#');
		    if (pos > -1) {
		      // escaping?
		      parts.fragment = string.substring(pos + 1) || null;
		      string = string.substring(0, pos);
		    }

		    // extract query
		    pos = string.indexOf('?');
		    if (pos > -1) {
		      // escaping?
		      parts.query = string.substring(pos + 1) || null;
		      string = string.substring(0, pos);
		    }

		    // slashes and backslashes have lost all meaning for the web protocols (https, http, wss, ws)
		    string = string.replace(/^(https?|ftp|wss?)?:+[/\\]*/i, '$1://');
		    // slashes and backslashes have lost all meaning for scheme relative URLs
		    string = string.replace(/^[/\\]{2,}/i, '//');

		    // extract protocol
		    if (string.substring(0, 2) === '//') {
		      // relative-scheme
		      parts.protocol = null;
		      string = string.substring(2);
		      // extract "user:pass@host:port"
		      string = URI.parseAuthority(string, parts);
		    } else {
		      pos = string.indexOf(':');
		      if (pos > -1) {
		        parts.protocol = string.substring(0, pos) || null;
		        if (parts.protocol && !parts.protocol.match(URI.protocol_expression)) {
		          // : may be within the path
		          parts.protocol = undefined;
		        } else if (string.substring(pos + 1, pos + 3).replace(/\\/g, '/') === '//') {
		          string = string.substring(pos + 3);

		          // extract "user:pass@host:port"
		          string = URI.parseAuthority(string, parts);
		        } else {
		          string = string.substring(pos + 1);
		          parts.urn = true;
		        }
		      }
		    }

		    // what's left must be the path
		    parts.path = string;

		    // and we're done
		    return parts;
		  };
		  URI.parseHost = function(string, parts) {
		    if (!string) {
		      string = '';
		    }

		    // Copy chrome, IE, opera backslash-handling behavior.
		    // Back slashes before the query string get converted to forward slashes
		    // See: https://github.com/joyent/node/blob/386fd24f49b0e9d1a8a076592a404168faeecc34/lib/url.js#L115-L124
		    // See: https://code.google.com/p/chromium/issues/detail?id=25916
		    // https://github.com/medialize/URI.js/pull/233
		    string = string.replace(/\\/g, '/');

		    // extract host:port
		    var pos = string.indexOf('/');
		    var bracketPos;
		    var t;

		    if (pos === -1) {
		      pos = string.length;
		    }

		    if (string.charAt(0) === '[') {
		      // IPv6 host - http://tools.ietf.org/html/draft-ietf-6man-text-addr-representation-04#section-6
		      // I claim most client software breaks on IPv6 anyways. To simplify things, URI only accepts
		      // IPv6+port in the format [2001:db8::1]:80 (for the time being)
		      bracketPos = string.indexOf(']');
		      parts.hostname = string.substring(1, bracketPos) || null;
		      parts.port = string.substring(bracketPos + 2, pos) || null;
		      if (parts.port === '/') {
		        parts.port = null;
		      }
		    } else {
		      var firstColon = string.indexOf(':');
		      var firstSlash = string.indexOf('/');
		      var nextColon = string.indexOf(':', firstColon + 1);
		      if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
		        // IPv6 host contains multiple colons - but no port
		        // this notation is actually not allowed by RFC 3986, but we're a liberal parser
		        parts.hostname = string.substring(0, pos) || null;
		        parts.port = null;
		      } else {
		        t = string.substring(0, pos).split(':');
		        parts.hostname = t[0] || null;
		        parts.port = t[1] || null;
		      }
		    }

		    if (parts.hostname && string.substring(pos).charAt(0) !== '/') {
		      pos++;
		      string = '/' + string;
		    }

		    if (parts.preventInvalidHostname) {
		      URI.ensureValidHostname(parts.hostname, parts.protocol);
		    }

		    if (parts.port) {
		      URI.ensureValidPort(parts.port);
		    }

		    return string.substring(pos) || '/';
		  };
		  URI.parseAuthority = function(string, parts) {
		    string = URI.parseUserinfo(string, parts);
		    return URI.parseHost(string, parts);
		  };
		  URI.parseUserinfo = function(string, parts) {
		    // extract username:password
		    var _string = string;
		    var firstBackSlash = string.indexOf('\\');
		    if (firstBackSlash !== -1) {
		      string = string.replace(/\\/g, '/');
		    }
		    var firstSlash = string.indexOf('/');
		    var pos = string.lastIndexOf('@', firstSlash > -1 ? firstSlash : string.length - 1);
		    var t;

		    // authority@ must come before /path or \path
		    if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
		      t = string.substring(0, pos).split(':');
		      parts.username = t[0] ? URI.decode(t[0]) : null;
		      t.shift();
		      parts.password = t[0] ? URI.decode(t.join(':')) : null;
		      string = _string.substring(pos + 1);
		    } else {
		      parts.username = null;
		      parts.password = null;
		    }

		    return string;
		  };
		  URI.parseQuery = function(string, escapeQuerySpace) {
		    if (!string) {
		      return {};
		    }

		    // throw out the funky business - "?"[name"="value"&"]+
		    string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');

		    if (!string) {
		      return {};
		    }

		    var items = {};
		    var splits = string.split('&');
		    var length = splits.length;
		    var v, name, value;

		    for (var i = 0; i < length; i++) {
		      v = splits[i].split('=');
		      name = URI.decodeQuery(v.shift(), escapeQuerySpace);
		      // no "=" is null according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#collect-url-parameters
		      value = v.length ? URI.decodeQuery(v.join('='), escapeQuerySpace) : null;

		      if (name === '__proto__') {
		        // ignore attempt at exploiting JavaScript internals
		        continue;
		      } else if (hasOwn.call(items, name)) {
		        if (typeof items[name] === 'string' || items[name] === null) {
		          items[name] = [items[name]];
		        }

		        items[name].push(value);
		      } else {
		        items[name] = value;
		      }
		    }

		    return items;
		  };

		  URI.build = function(parts) {
		    var t = '';
		    var requireAbsolutePath = false;

		    if (parts.protocol) {
		      t += parts.protocol + ':';
		    }

		    if (!parts.urn && (t || parts.hostname)) {
		      t += '//';
		      requireAbsolutePath = true;
		    }

		    t += (URI.buildAuthority(parts) || '');

		    if (typeof parts.path === 'string') {
		      if (parts.path.charAt(0) !== '/' && requireAbsolutePath) {
		        t += '/';
		      }

		      t += parts.path;
		    }

		    if (typeof parts.query === 'string' && parts.query) {
		      t += '?' + parts.query;
		    }

		    if (typeof parts.fragment === 'string' && parts.fragment) {
		      t += '#' + parts.fragment;
		    }
		    return t;
		  };
		  URI.buildHost = function(parts) {
		    var t = '';

		    if (!parts.hostname) {
		      return '';
		    } else if (URI.ip6_expression.test(parts.hostname)) {
		      t += '[' + parts.hostname + ']';
		    } else {
		      t += parts.hostname;
		    }

		    if (parts.port) {
		      t += ':' + parts.port;
		    }

		    return t;
		  };
		  URI.buildAuthority = function(parts) {
		    return URI.buildUserinfo(parts) + URI.buildHost(parts);
		  };
		  URI.buildUserinfo = function(parts) {
		    var t = '';

		    if (parts.username) {
		      t += URI.encode(parts.username);
		    }

		    if (parts.password) {
		      t += ':' + URI.encode(parts.password);
		    }

		    if (t) {
		      t += '@';
		    }

		    return t;
		  };
		  URI.buildQuery = function(data, duplicateQueryParameters, escapeQuerySpace) {
		    // according to http://tools.ietf.org/html/rfc3986 or http://labs.apache.org/webarch/uri/rfc/rfc3986.html
		    // being »-._~!$&'()*+,;=:@/?« %HEX and alnum are allowed
		    // the RFC explicitly states ?/foo being a valid use case, no mention of parameter syntax!
		    // URI.js treats the query string as being application/x-www-form-urlencoded
		    // see http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type

		    var t = '';
		    var unique, key, i, length;
		    for (key in data) {
		      if (key === '__proto__') {
		        // ignore attempt at exploiting JavaScript internals
		        continue;
		      } else if (hasOwn.call(data, key)) {
		        if (isArray(data[key])) {
		          unique = {};
		          for (i = 0, length = data[key].length; i < length; i++) {
		            if (data[key][i] !== undefined && unique[data[key][i] + ''] === undefined) {
		              t += '&' + URI.buildQueryParameter(key, data[key][i], escapeQuerySpace);
		              if (duplicateQueryParameters !== true) {
		                unique[data[key][i] + ''] = true;
		              }
		            }
		          }
		        } else if (data[key] !== undefined) {
		          t += '&' + URI.buildQueryParameter(key, data[key], escapeQuerySpace);
		        }
		      }
		    }

		    return t.substring(1);
		  };
		  URI.buildQueryParameter = function(name, value, escapeQuerySpace) {
		    // http://www.w3.org/TR/REC-html40/interact/forms.html#form-content-type -- application/x-www-form-urlencoded
		    // don't append "=" for null values, according to http://dvcs.w3.org/hg/url/raw-file/tip/Overview.html#url-parameter-serialization
		    return URI.encodeQuery(name, escapeQuerySpace) + (value !== null ? '=' + URI.encodeQuery(value, escapeQuerySpace) : '');
		  };

		  URI.addQuery = function(data, name, value) {
		    if (typeof name === 'object') {
		      for (var key in name) {
		        if (hasOwn.call(name, key)) {
		          URI.addQuery(data, key, name[key]);
		        }
		      }
		    } else if (typeof name === 'string') {
		      if (data[name] === undefined) {
		        data[name] = value;
		        return;
		      } else if (typeof data[name] === 'string') {
		        data[name] = [data[name]];
		      }

		      if (!isArray(value)) {
		        value = [value];
		      }

		      data[name] = (data[name] || []).concat(value);
		    } else {
		      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
		    }
		  };

		  URI.setQuery = function(data, name, value) {
		    if (typeof name === 'object') {
		      for (var key in name) {
		        if (hasOwn.call(name, key)) {
		          URI.setQuery(data, key, name[key]);
		        }
		      }
		    } else if (typeof name === 'string') {
		      data[name] = value === undefined ? null : value;
		    } else {
		      throw new TypeError('URI.setQuery() accepts an object, string as the name parameter');
		    }
		  };

		  URI.removeQuery = function(data, name, value) {
		    var i, length, key;

		    if (isArray(name)) {
		      for (i = 0, length = name.length; i < length; i++) {
		        data[name[i]] = undefined;
		      }
		    } else if (getType(name) === 'RegExp') {
		      for (key in data) {
		        if (name.test(key)) {
		          data[key] = undefined;
		        }
		      }
		    } else if (typeof name === 'object') {
		      for (key in name) {
		        if (hasOwn.call(name, key)) {
		          URI.removeQuery(data, key, name[key]);
		        }
		      }
		    } else if (typeof name === 'string') {
		      if (value !== undefined) {
		        if (getType(value) === 'RegExp') {
		          if (!isArray(data[name]) && value.test(data[name])) {
		            data[name] = undefined;
		          } else {
		            data[name] = filterArrayValues(data[name], value);
		          }
		        } else if (data[name] === String(value) && (!isArray(value) || value.length === 1)) {
		          data[name] = undefined;
		        } else if (isArray(data[name])) {
		          data[name] = filterArrayValues(data[name], value);
		        }
		      } else {
		        data[name] = undefined;
		      }
		    } else {
		      throw new TypeError('URI.removeQuery() accepts an object, string, RegExp as the first parameter');
		    }
		  };
		  URI.hasQuery = function(data, name, value, withinArray) {
		    switch (getType(name)) {
		      case 'String':
		        // Nothing to do here
		        break;

		      case 'RegExp':
		        for (var key in data) {
		          if (hasOwn.call(data, key)) {
		            if (name.test(key) && (value === undefined || URI.hasQuery(data, key, value))) {
		              return true;
		            }
		          }
		        }

		        return false;

		      case 'Object':
		        for (var _key in name) {
		          if (hasOwn.call(name, _key)) {
		            if (!URI.hasQuery(data, _key, name[_key])) {
		              return false;
		            }
		          }
		        }

		        return true;

		      default:
		        throw new TypeError('URI.hasQuery() accepts a string, regular expression or object as the name parameter');
		    }

		    switch (getType(value)) {
		      case 'Undefined':
		        // true if exists (but may be empty)
		        return name in data; // data[name] !== undefined;

		      case 'Boolean':
		        // true if exists and non-empty
		        var _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
		        return value === _booly;

		      case 'Function':
		        // allow complex comparison
		        return !!value(data[name], name, data);

		      case 'Array':
		        if (!isArray(data[name])) {
		          return false;
		        }

		        var op = withinArray ? arrayContains : arraysEqual;
		        return op(data[name], value);

		      case 'RegExp':
		        if (!isArray(data[name])) {
		          return Boolean(data[name] && data[name].match(value));
		        }

		        if (!withinArray) {
		          return false;
		        }

		        return arrayContains(data[name], value);

		      case 'Number':
		        value = String(value);
		        /* falls through */
		      case 'String':
		        if (!isArray(data[name])) {
		          return data[name] === value;
		        }

		        if (!withinArray) {
		          return false;
		        }

		        return arrayContains(data[name], value);

		      default:
		        throw new TypeError('URI.hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter');
		    }
		  };


		  URI.joinPaths = function() {
		    var input = [];
		    var segments = [];
		    var nonEmptySegments = 0;

		    for (var i = 0; i < arguments.length; i++) {
		      var url = new URI(arguments[i]);
		      input.push(url);
		      var _segments = url.segment();
		      for (var s = 0; s < _segments.length; s++) {
		        if (typeof _segments[s] === 'string') {
		          segments.push(_segments[s]);
		        }

		        if (_segments[s]) {
		          nonEmptySegments++;
		        }
		      }
		    }

		    if (!segments.length || !nonEmptySegments) {
		      return new URI('');
		    }

		    var uri = new URI('').segment(segments);

		    if (input[0].path() === '' || input[0].path().slice(0, 1) === '/') {
		      uri.path('/' + uri.path());
		    }

		    return uri.normalize();
		  };

		  URI.commonPath = function(one, two) {
		    var length = Math.min(one.length, two.length);
		    var pos;

		    // find first non-matching character
		    for (pos = 0; pos < length; pos++) {
		      if (one.charAt(pos) !== two.charAt(pos)) {
		        pos--;
		        break;
		      }
		    }

		    if (pos < 1) {
		      return one.charAt(0) === two.charAt(0) && one.charAt(0) === '/' ? '/' : '';
		    }

		    // revert to last /
		    if (one.charAt(pos) !== '/' || two.charAt(pos) !== '/') {
		      pos = one.substring(0, pos).lastIndexOf('/');
		    }

		    return one.substring(0, pos + 1);
		  };

		  URI.withinString = function(string, callback, options) {
		    options || (options = {});
		    var _start = options.start || URI.findUri.start;
		    var _end = options.end || URI.findUri.end;
		    var _trim = options.trim || URI.findUri.trim;
		    var _parens = options.parens || URI.findUri.parens;
		    var _attributeOpen = /[a-z0-9-]=["']?$/i;

		    _start.lastIndex = 0;
		    while (true) {
		      var match = _start.exec(string);
		      if (!match) {
		        break;
		      }

		      var start = match.index;
		      if (options.ignoreHtml) {
		        // attribut(e=["']?$)
		        var attributeOpen = string.slice(Math.max(start - 3, 0), start);
		        if (attributeOpen && _attributeOpen.test(attributeOpen)) {
		          continue;
		        }
		      }

		      var end = start + string.slice(start).search(_end);
		      var slice = string.slice(start, end);
		      // make sure we include well balanced parens
		      var parensEnd = -1;
		      while (true) {
		        var parensMatch = _parens.exec(slice);
		        if (!parensMatch) {
		          break;
		        }

		        var parensMatchEnd = parensMatch.index + parensMatch[0].length;
		        parensEnd = Math.max(parensEnd, parensMatchEnd);
		      }

		      if (parensEnd > -1) {
		        slice = slice.slice(0, parensEnd) + slice.slice(parensEnd).replace(_trim, '');
		      } else {
		        slice = slice.replace(_trim, '');
		      }

		      if (slice.length <= match[0].length) {
		        // the extract only contains the starting marker of a URI,
		        // e.g. "www" or "http://"
		        continue;
		      }

		      if (options.ignore && options.ignore.test(slice)) {
		        continue;
		      }

		      end = start + slice.length;
		      var result = callback(slice, start, end, string);
		      if (result === undefined) {
		        _start.lastIndex = end;
		        continue;
		      }

		      result = String(result);
		      string = string.slice(0, start) + result + string.slice(end);
		      _start.lastIndex = start + result.length;
		    }

		    _start.lastIndex = 0;
		    return string;
		  };

		  URI.ensureValidHostname = function(v, protocol) {
		    // Theoretically URIs allow percent-encoding in Hostnames (according to RFC 3986)
		    // they are not part of DNS and therefore ignored by URI.js

		    var hasHostname = !!v; // not null and not an empty string
		    var hasProtocol = !!protocol;
		    var rejectEmptyHostname = false;

		    if (hasProtocol) {
		      rejectEmptyHostname = arrayContains(URI.hostProtocols, protocol);
		    }

		    if (rejectEmptyHostname && !hasHostname) {
		      throw new TypeError('Hostname cannot be empty, if protocol is ' + protocol);
		    } else if (v && v.match(URI.invalid_hostname_characters)) {
		      // test punycode
		      if (!punycode) {
		        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-:_] and Punycode.js is not available');
		      }
		      if (punycode.toASCII(v).match(URI.invalid_hostname_characters)) {
		        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-:_]');
		      }
		    }
		  };

		  URI.ensureValidPort = function (v) {
		    if (!v) {
		      return;
		    }

		    var port = Number(v);
		    if (isInteger(port) && (port > 0) && (port < 65536)) {
		      return;
		    }

		    throw new TypeError('Port "' + v + '" is not a valid port');
		  };

		  // noConflict
		  URI.noConflict = function(removeAll) {
		    if (removeAll) {
		      var unconflicted = {
		        URI: this.noConflict()
		      };

		      if (root.URITemplate && typeof root.URITemplate.noConflict === 'function') {
		        unconflicted.URITemplate = root.URITemplate.noConflict();
		      }

		      if (root.IPv6 && typeof root.IPv6.noConflict === 'function') {
		        unconflicted.IPv6 = root.IPv6.noConflict();
		      }

		      if (root.SecondLevelDomains && typeof root.SecondLevelDomains.noConflict === 'function') {
		        unconflicted.SecondLevelDomains = root.SecondLevelDomains.noConflict();
		      }

		      return unconflicted;
		    } else if (root.URI === this) {
		      root.URI = _URI;
		    }

		    return this;
		  };

		  p.build = function(deferBuild) {
		    if (deferBuild === true) {
		      this._deferred_build = true;
		    } else if (deferBuild === undefined || this._deferred_build) {
		      this._string = URI.build(this._parts);
		      this._deferred_build = false;
		    }

		    return this;
		  };

		  p.clone = function() {
		    return new URI(this);
		  };

		  p.valueOf = p.toString = function() {
		    return this.build(false)._string;
		  };


		  function generateSimpleAccessor(_part){
		    return function(v, build) {
		      if (v === undefined) {
		        return this._parts[_part] || '';
		      } else {
		        this._parts[_part] = v || null;
		        this.build(!build);
		        return this;
		      }
		    };
		  }

		  function generatePrefixAccessor(_part, _key){
		    return function(v, build) {
		      if (v === undefined) {
		        return this._parts[_part] || '';
		      } else {
		        if (v !== null) {
		          v = v + '';
		          if (v.charAt(0) === _key) {
		            v = v.substring(1);
		          }
		        }

		        this._parts[_part] = v;
		        this.build(!build);
		        return this;
		      }
		    };
		  }

		  p.protocol = generateSimpleAccessor('protocol');
		  p.username = generateSimpleAccessor('username');
		  p.password = generateSimpleAccessor('password');
		  p.hostname = generateSimpleAccessor('hostname');
		  p.port = generateSimpleAccessor('port');
		  p.query = generatePrefixAccessor('query', '?');
		  p.fragment = generatePrefixAccessor('fragment', '#');

		  p.search = function(v, build) {
		    var t = this.query(v, build);
		    return typeof t === 'string' && t.length ? ('?' + t) : t;
		  };
		  p.hash = function(v, build) {
		    var t = this.fragment(v, build);
		    return typeof t === 'string' && t.length ? ('#' + t) : t;
		  };

		  p.pathname = function(v, build) {
		    if (v === undefined || v === true) {
		      var res = this._parts.path || (this._parts.hostname ? '/' : '');
		      return v ? (this._parts.urn ? URI.decodeUrnPath : URI.decodePath)(res) : res;
		    } else {
		      if (this._parts.urn) {
		        this._parts.path = v ? URI.recodeUrnPath(v) : '';
		      } else {
		        this._parts.path = v ? URI.recodePath(v) : '/';
		      }
		      this.build(!build);
		      return this;
		    }
		  };
		  p.path = p.pathname;
		  p.href = function(href, build) {
		    var key;

		    if (href === undefined) {
		      return this.toString();
		    }

		    this._string = '';
		    this._parts = URI._parts();

		    var _URI = href instanceof URI;
		    var _object = typeof href === 'object' && (href.hostname || href.path || href.pathname);
		    if (href.nodeName) {
		      var attribute = URI.getDomAttribute(href);
		      href = href[attribute] || '';
		      _object = false;
		    }

		    // window.location is reported to be an object, but it's not the sort
		    // of object we're looking for:
		    // * location.protocol ends with a colon
		    // * location.query != object.search
		    // * location.hash != object.fragment
		    // simply serializing the unknown object should do the trick
		    // (for location, not for everything...)
		    if (!_URI && _object && href.pathname !== undefined) {
		      href = href.toString();
		    }

		    if (typeof href === 'string' || href instanceof String) {
		      this._parts = URI.parse(String(href), this._parts);
		    } else if (_URI || _object) {
		      var src = _URI ? href._parts : href;
		      for (key in src) {
		        if (key === 'query') { continue; }
		        if (hasOwn.call(this._parts, key)) {
		          this._parts[key] = src[key];
		        }
		      }
		      if (src.query) {
		        this.query(src.query, false);
		      }
		    } else {
		      throw new TypeError('invalid input');
		    }

		    this.build(!build);
		    return this;
		  };

		  // identification accessors
		  p.is = function(what) {
		    var ip = false;
		    var ip4 = false;
		    var ip6 = false;
		    var name = false;
		    var sld = false;
		    var idn = false;
		    var punycode = false;
		    var relative = !this._parts.urn;

		    if (this._parts.hostname) {
		      relative = false;
		      ip4 = URI.ip4_expression.test(this._parts.hostname);
		      ip6 = URI.ip6_expression.test(this._parts.hostname);
		      ip = ip4 || ip6;
		      name = !ip;
		      sld = name && SLD && SLD.has(this._parts.hostname);
		      idn = name && URI.idn_expression.test(this._parts.hostname);
		      punycode = name && URI.punycode_expression.test(this._parts.hostname);
		    }

		    switch (what.toLowerCase()) {
		      case 'relative':
		        return relative;

		      case 'absolute':
		        return !relative;

		      // hostname identification
		      case 'domain':
		      case 'name':
		        return name;

		      case 'sld':
		        return sld;

		      case 'ip':
		        return ip;

		      case 'ip4':
		      case 'ipv4':
		      case 'inet4':
		        return ip4;

		      case 'ip6':
		      case 'ipv6':
		      case 'inet6':
		        return ip6;

		      case 'idn':
		        return idn;

		      case 'url':
		        return !this._parts.urn;

		      case 'urn':
		        return !!this._parts.urn;

		      case 'punycode':
		        return punycode;
		    }

		    return null;
		  };

		  // component specific input validation
		  var _protocol = p.protocol;
		  var _port = p.port;
		  var _hostname = p.hostname;

		  p.protocol = function(v, build) {
		    if (v) {
		      // accept trailing ://
		      v = v.replace(/:(\/\/)?$/, '');

		      if (!v.match(URI.protocol_expression)) {
		        throw new TypeError('Protocol "' + v + '" contains characters other than [A-Z0-9.+-] or doesn\'t start with [A-Z]');
		      }
		    }

		    return _protocol.call(this, v, build);
		  };
		  p.scheme = p.protocol;
		  p.port = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v !== undefined) {
		      if (v === 0) {
		        v = null;
		      }

		      if (v) {
		        v += '';
		        if (v.charAt(0) === ':') {
		          v = v.substring(1);
		        }

		        URI.ensureValidPort(v);
		      }
		    }
		    return _port.call(this, v, build);
		  };
		  p.hostname = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v !== undefined) {
		      var x = { preventInvalidHostname: this._parts.preventInvalidHostname };
		      var res = URI.parseHost(v, x);
		      if (res !== '/') {
		        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
		      }

		      v = x.hostname;
		      if (this._parts.preventInvalidHostname) {
		        URI.ensureValidHostname(v, this._parts.protocol);
		      }
		    }

		    return _hostname.call(this, v, build);
		  };

		  // compound accessors
		  p.origin = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined) {
		      var protocol = this.protocol();
		      var authority = this.authority();
		      if (!authority) {
		        return '';
		      }

		      return (protocol ? protocol + '://' : '') + this.authority();
		    } else {
		      var origin = URI(v);
		      this
		        .protocol(origin.protocol())
		        .authority(origin.authority())
		        .build(!build);
		      return this;
		    }
		  };
		  p.host = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined) {
		      return this._parts.hostname ? URI.buildHost(this._parts) : '';
		    } else {
		      var res = URI.parseHost(v, this._parts);
		      if (res !== '/') {
		        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
		      }

		      this.build(!build);
		      return this;
		    }
		  };
		  p.authority = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined) {
		      return this._parts.hostname ? URI.buildAuthority(this._parts) : '';
		    } else {
		      var res = URI.parseAuthority(v, this._parts);
		      if (res !== '/') {
		        throw new TypeError('Hostname "' + v + '" contains characters other than [A-Z0-9.-]');
		      }

		      this.build(!build);
		      return this;
		    }
		  };
		  p.userinfo = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined) {
		      var t = URI.buildUserinfo(this._parts);
		      return t ? t.substring(0, t.length -1) : t;
		    } else {
		      if (v[v.length-1] !== '@') {
		        v += '@';
		      }

		      URI.parseUserinfo(v, this._parts);
		      this.build(!build);
		      return this;
		    }
		  };
		  p.resource = function(v, build) {
		    var parts;

		    if (v === undefined) {
		      return this.path() + this.search() + this.hash();
		    }

		    parts = URI.parse(v);
		    this._parts.path = parts.path;
		    this._parts.query = parts.query;
		    this._parts.fragment = parts.fragment;
		    this.build(!build);
		    return this;
		  };

		  // fraction accessors
		  p.subdomain = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    // convenience, return "www" from "www.example.org"
		    if (v === undefined) {
		      if (!this._parts.hostname || this.is('IP')) {
		        return '';
		      }

		      // grab domain and add another segment
		      var end = this._parts.hostname.length - this.domain().length - 1;
		      return this._parts.hostname.substring(0, end) || '';
		    } else {
		      var e = this._parts.hostname.length - this.domain().length;
		      var sub = this._parts.hostname.substring(0, e);
		      var replace = new RegExp('^' + escapeRegEx(sub));

		      if (v && v.charAt(v.length - 1) !== '.') {
		        v += '.';
		      }

		      if (v.indexOf(':') !== -1) {
		        throw new TypeError('Domains cannot contain colons');
		      }

		      if (v) {
		        URI.ensureValidHostname(v, this._parts.protocol);
		      }

		      this._parts.hostname = this._parts.hostname.replace(replace, v);
		      this.build(!build);
		      return this;
		    }
		  };
		  p.domain = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (typeof v === 'boolean') {
		      build = v;
		      v = undefined;
		    }

		    // convenience, return "example.org" from "www.example.org"
		    if (v === undefined) {
		      if (!this._parts.hostname || this.is('IP')) {
		        return '';
		      }

		      // if hostname consists of 1 or 2 segments, it must be the domain
		      var t = this._parts.hostname.match(/\./g);
		      if (t && t.length < 2) {
		        return this._parts.hostname;
		      }

		      // grab tld and add another segment
		      var end = this._parts.hostname.length - this.tld(build).length - 1;
		      end = this._parts.hostname.lastIndexOf('.', end -1) + 1;
		      return this._parts.hostname.substring(end) || '';
		    } else {
		      if (!v) {
		        throw new TypeError('cannot set domain empty');
		      }

		      if (v.indexOf(':') !== -1) {
		        throw new TypeError('Domains cannot contain colons');
		      }

		      URI.ensureValidHostname(v, this._parts.protocol);

		      if (!this._parts.hostname || this.is('IP')) {
		        this._parts.hostname = v;
		      } else {
		        var replace = new RegExp(escapeRegEx(this.domain()) + '$');
		        this._parts.hostname = this._parts.hostname.replace(replace, v);
		      }

		      this.build(!build);
		      return this;
		    }
		  };
		  p.tld = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (typeof v === 'boolean') {
		      build = v;
		      v = undefined;
		    }

		    // return "org" from "www.example.org"
		    if (v === undefined) {
		      if (!this._parts.hostname || this.is('IP')) {
		        return '';
		      }

		      var pos = this._parts.hostname.lastIndexOf('.');
		      var tld = this._parts.hostname.substring(pos + 1);

		      if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
		        return SLD.get(this._parts.hostname) || tld;
		      }

		      return tld;
		    } else {
		      var replace;

		      if (!v) {
		        throw new TypeError('cannot set TLD empty');
		      } else if (v.match(/[^a-zA-Z0-9-]/)) {
		        if (SLD && SLD.is(v)) {
		          replace = new RegExp(escapeRegEx(this.tld()) + '$');
		          this._parts.hostname = this._parts.hostname.replace(replace, v);
		        } else {
		          throw new TypeError('TLD "' + v + '" contains characters other than [A-Z0-9]');
		        }
		      } else if (!this._parts.hostname || this.is('IP')) {
		        throw new ReferenceError('cannot set TLD on non-domain host');
		      } else {
		        replace = new RegExp(escapeRegEx(this.tld()) + '$');
		        this._parts.hostname = this._parts.hostname.replace(replace, v);
		      }

		      this.build(!build);
		      return this;
		    }
		  };
		  p.directory = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined || v === true) {
		      if (!this._parts.path && !this._parts.hostname) {
		        return '';
		      }

		      if (this._parts.path === '/') {
		        return '/';
		      }

		      var end = this._parts.path.length - this.filename().length - 1;
		      var res = this._parts.path.substring(0, end) || (this._parts.hostname ? '/' : '');

		      return v ? URI.decodePath(res) : res;

		    } else {
		      var e = this._parts.path.length - this.filename().length;
		      var directory = this._parts.path.substring(0, e);
		      var replace = new RegExp('^' + escapeRegEx(directory));

		      // fully qualifier directories begin with a slash
		      if (!this.is('relative')) {
		        if (!v) {
		          v = '/';
		        }

		        if (v.charAt(0) !== '/') {
		          v = '/' + v;
		        }
		      }

		      // directories always end with a slash
		      if (v && v.charAt(v.length - 1) !== '/') {
		        v += '/';
		      }

		      v = URI.recodePath(v);
		      this._parts.path = this._parts.path.replace(replace, v);
		      this.build(!build);
		      return this;
		    }
		  };
		  p.filename = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (typeof v !== 'string') {
		      if (!this._parts.path || this._parts.path === '/') {
		        return '';
		      }

		      var pos = this._parts.path.lastIndexOf('/');
		      var res = this._parts.path.substring(pos+1);

		      return v ? URI.decodePathSegment(res) : res;
		    } else {
		      var mutatedDirectory = false;

		      if (v.charAt(0) === '/') {
		        v = v.substring(1);
		      }

		      if (v.match(/\.?\//)) {
		        mutatedDirectory = true;
		      }

		      var replace = new RegExp(escapeRegEx(this.filename()) + '$');
		      v = URI.recodePath(v);
		      this._parts.path = this._parts.path.replace(replace, v);

		      if (mutatedDirectory) {
		        this.normalizePath(build);
		      } else {
		        this.build(!build);
		      }

		      return this;
		    }
		  };
		  p.suffix = function(v, build) {
		    if (this._parts.urn) {
		      return v === undefined ? '' : this;
		    }

		    if (v === undefined || v === true) {
		      if (!this._parts.path || this._parts.path === '/') {
		        return '';
		      }

		      var filename = this.filename();
		      var pos = filename.lastIndexOf('.');
		      var s, res;

		      if (pos === -1) {
		        return '';
		      }

		      // suffix may only contain alnum characters (yup, I made this up.)
		      s = filename.substring(pos+1);
		      res = (/^[a-z0-9%]+$/i).test(s) ? s : '';
		      return v ? URI.decodePathSegment(res) : res;
		    } else {
		      if (v.charAt(0) === '.') {
		        v = v.substring(1);
		      }

		      var suffix = this.suffix();
		      var replace;

		      if (!suffix) {
		        if (!v) {
		          return this;
		        }

		        this._parts.path += '.' + URI.recodePath(v);
		      } else if (!v) {
		        replace = new RegExp(escapeRegEx('.' + suffix) + '$');
		      } else {
		        replace = new RegExp(escapeRegEx(suffix) + '$');
		      }

		      if (replace) {
		        v = URI.recodePath(v);
		        this._parts.path = this._parts.path.replace(replace, v);
		      }

		      this.build(!build);
		      return this;
		    }
		  };
		  p.segment = function(segment, v, build) {
		    var separator = this._parts.urn ? ':' : '/';
		    var path = this.path();
		    var absolute = path.substring(0, 1) === '/';
		    var segments = path.split(separator);

		    if (segment !== undefined && typeof segment !== 'number') {
		      build = v;
		      v = segment;
		      segment = undefined;
		    }

		    if (segment !== undefined && typeof segment !== 'number') {
		      throw new Error('Bad segment "' + segment + '", must be 0-based integer');
		    }

		    if (absolute) {
		      segments.shift();
		    }

		    if (segment < 0) {
		      // allow negative indexes to address from the end
		      segment = Math.max(segments.length + segment, 0);
		    }

		    if (v === undefined) {
		      /*jshint laxbreak: true */
		      return segment === undefined
		        ? segments
		        : segments[segment];
		      /*jshint laxbreak: false */
		    } else if (segment === null || segments[segment] === undefined) {
		      if (isArray(v)) {
		        segments = [];
		        // collapse empty elements within array
		        for (var i=0, l=v.length; i < l; i++) {
		          if (!v[i].length && (!segments.length || !segments[segments.length -1].length)) {
		            continue;
		          }

		          if (segments.length && !segments[segments.length -1].length) {
		            segments.pop();
		          }

		          segments.push(trimSlashes(v[i]));
		        }
		      } else if (v || typeof v === 'string') {
		        v = trimSlashes(v);
		        if (segments[segments.length -1] === '') {
		          // empty trailing elements have to be overwritten
		          // to prevent results such as /foo//bar
		          segments[segments.length -1] = v;
		        } else {
		          segments.push(v);
		        }
		      }
		    } else {
		      if (v) {
		        segments[segment] = trimSlashes(v);
		      } else {
		        segments.splice(segment, 1);
		      }
		    }

		    if (absolute) {
		      segments.unshift('');
		    }

		    return this.path(segments.join(separator), build);
		  };
		  p.segmentCoded = function(segment, v, build) {
		    var segments, i, l;

		    if (typeof segment !== 'number') {
		      build = v;
		      v = segment;
		      segment = undefined;
		    }

		    if (v === undefined) {
		      segments = this.segment(segment, v, build);
		      if (!isArray(segments)) {
		        segments = segments !== undefined ? URI.decode(segments) : undefined;
		      } else {
		        for (i = 0, l = segments.length; i < l; i++) {
		          segments[i] = URI.decode(segments[i]);
		        }
		      }

		      return segments;
		    }

		    if (!isArray(v)) {
		      v = (typeof v === 'string' || v instanceof String) ? URI.encode(v) : v;
		    } else {
		      for (i = 0, l = v.length; i < l; i++) {
		        v[i] = URI.encode(v[i]);
		      }
		    }

		    return this.segment(segment, v, build);
		  };

		  // mutating query string
		  var q = p.query;
		  p.query = function(v, build) {
		    if (v === true) {
		      return URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
		    } else if (typeof v === 'function') {
		      var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
		      var result = v.call(this, data);
		      this._parts.query = URI.buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
		      this.build(!build);
		      return this;
		    } else if (v !== undefined && typeof v !== 'string') {
		      this._parts.query = URI.buildQuery(v, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
		      this.build(!build);
		      return this;
		    } else {
		      return q.call(this, v, build);
		    }
		  };
		  p.setQuery = function(name, value, build) {
		    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);

		    if (typeof name === 'string' || name instanceof String) {
		      data[name] = value !== undefined ? value : null;
		    } else if (typeof name === 'object') {
		      for (var key in name) {
		        if (hasOwn.call(name, key)) {
		          data[key] = name[key];
		        }
		      }
		    } else {
		      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
		    }

		    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
		    if (typeof name !== 'string') {
		      build = value;
		    }

		    this.build(!build);
		    return this;
		  };
		  p.addQuery = function(name, value, build) {
		    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
		    URI.addQuery(data, name, value === undefined ? null : value);
		    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
		    if (typeof name !== 'string') {
		      build = value;
		    }

		    this.build(!build);
		    return this;
		  };
		  p.removeQuery = function(name, value, build) {
		    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
		    URI.removeQuery(data, name, value);
		    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
		    if (typeof name !== 'string') {
		      build = value;
		    }

		    this.build(!build);
		    return this;
		  };
		  p.hasQuery = function(name, value, withinArray) {
		    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
		    return URI.hasQuery(data, name, value, withinArray);
		  };
		  p.setSearch = p.setQuery;
		  p.addSearch = p.addQuery;
		  p.removeSearch = p.removeQuery;
		  p.hasSearch = p.hasQuery;

		  // sanitizing URLs
		  p.normalize = function() {
		    if (this._parts.urn) {
		      return this
		        .normalizeProtocol(false)
		        .normalizePath(false)
		        .normalizeQuery(false)
		        .normalizeFragment(false)
		        .build();
		    }

		    return this
		      .normalizeProtocol(false)
		      .normalizeHostname(false)
		      .normalizePort(false)
		      .normalizePath(false)
		      .normalizeQuery(false)
		      .normalizeFragment(false)
		      .build();
		  };
		  p.normalizeProtocol = function(build) {
		    if (typeof this._parts.protocol === 'string') {
		      this._parts.protocol = this._parts.protocol.toLowerCase();
		      this.build(!build);
		    }

		    return this;
		  };
		  p.normalizeHostname = function(build) {
		    if (this._parts.hostname) {
		      if (this.is('IDN') && punycode) {
		        this._parts.hostname = punycode.toASCII(this._parts.hostname);
		      } else if (this.is('IPv6') && IPv6) {
		        this._parts.hostname = IPv6.best(this._parts.hostname);
		      }

		      this._parts.hostname = this._parts.hostname.toLowerCase();
		      this.build(!build);
		    }

		    return this;
		  };
		  p.normalizePort = function(build) {
		    // remove port of it's the protocol's default
		    if (typeof this._parts.protocol === 'string' && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
		      this._parts.port = null;
		      this.build(!build);
		    }

		    return this;
		  };
		  p.normalizePath = function(build) {
		    var _path = this._parts.path;
		    if (!_path) {
		      return this;
		    }

		    if (this._parts.urn) {
		      this._parts.path = URI.recodeUrnPath(this._parts.path);
		      this.build(!build);
		      return this;
		    }

		    if (this._parts.path === '/') {
		      return this;
		    }

		    _path = URI.recodePath(_path);

		    var _was_relative;
		    var _leadingParents = '';
		    var _parent, _pos;

		    // handle relative paths
		    if (_path.charAt(0) !== '/') {
		      _was_relative = true;
		      _path = '/' + _path;
		    }

		    // handle relative files (as opposed to directories)
		    if (_path.slice(-3) === '/..' || _path.slice(-2) === '/.') {
		      _path += '/';
		    }

		    // resolve simples
		    _path = _path
		      .replace(/(\/(\.\/)+)|(\/\.$)/g, '/')
		      .replace(/\/{2,}/g, '/');

		    // remember leading parents
		    if (_was_relative) {
		      _leadingParents = _path.substring(1).match(/^(\.\.\/)+/) || '';
		      if (_leadingParents) {
		        _leadingParents = _leadingParents[0];
		      }
		    }

		    // resolve parents
		    while (true) {
		      _parent = _path.search(/\/\.\.(\/|$)/);
		      if (_parent === -1) {
		        // no more ../ to resolve
		        break;
		      } else if (_parent === 0) {
		        // top level cannot be relative, skip it
		        _path = _path.substring(3);
		        continue;
		      }

		      _pos = _path.substring(0, _parent).lastIndexOf('/');
		      if (_pos === -1) {
		        _pos = _parent;
		      }
		      _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
		    }

		    // revert to relative
		    if (_was_relative && this.is('relative')) {
		      _path = _leadingParents + _path.substring(1);
		    }

		    this._parts.path = _path;
		    this.build(!build);
		    return this;
		  };
		  p.normalizePathname = p.normalizePath;
		  p.normalizeQuery = function(build) {
		    if (typeof this._parts.query === 'string') {
		      if (!this._parts.query.length) {
		        this._parts.query = null;
		      } else {
		        this.query(URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace));
		      }

		      this.build(!build);
		    }

		    return this;
		  };
		  p.normalizeFragment = function(build) {
		    if (!this._parts.fragment) {
		      this._parts.fragment = null;
		      this.build(!build);
		    }

		    return this;
		  };
		  p.normalizeSearch = p.normalizeQuery;
		  p.normalizeHash = p.normalizeFragment;

		  p.iso8859 = function() {
		    // expect unicode input, iso8859 output
		    var e = URI.encode;
		    var d = URI.decode;

		    URI.encode = escape;
		    URI.decode = decodeURIComponent;
		    try {
		      this.normalize();
		    } finally {
		      URI.encode = e;
		      URI.decode = d;
		    }
		    return this;
		  };

		  p.unicode = function() {
		    // expect iso8859 input, unicode output
		    var e = URI.encode;
		    var d = URI.decode;

		    URI.encode = strictEncodeURIComponent;
		    URI.decode = unescape;
		    try {
		      this.normalize();
		    } finally {
		      URI.encode = e;
		      URI.decode = d;
		    }
		    return this;
		  };

		  p.readable = function() {
		    var uri = this.clone();
		    // removing username, password, because they shouldn't be displayed according to RFC 3986
		    uri.username('').password('').normalize();
		    var t = '';
		    if (uri._parts.protocol) {
		      t += uri._parts.protocol + '://';
		    }

		    if (uri._parts.hostname) {
		      if (uri.is('punycode') && punycode) {
		        t += punycode.toUnicode(uri._parts.hostname);
		        if (uri._parts.port) {
		          t += ':' + uri._parts.port;
		        }
		      } else {
		        t += uri.host();
		      }
		    }

		    if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== '/') {
		      t += '/';
		    }

		    t += uri.path(true);
		    if (uri._parts.query) {
		      var q = '';
		      for (var i = 0, qp = uri._parts.query.split('&'), l = qp.length; i < l; i++) {
		        var kv = (qp[i] || '').split('=');
		        q += '&' + URI.decodeQuery(kv[0], this._parts.escapeQuerySpace)
		          .replace(/&/g, '%26');

		        if (kv[1] !== undefined) {
		          q += '=' + URI.decodeQuery(kv[1], this._parts.escapeQuerySpace)
		            .replace(/&/g, '%26');
		        }
		      }
		      t += '?' + q.substring(1);
		    }

		    t += URI.decodeQuery(uri.hash(), true);
		    return t;
		  };

		  // resolving relative and absolute URLs
		  p.absoluteTo = function(base) {
		    var resolved = this.clone();
		    var properties = ['protocol', 'username', 'password', 'hostname', 'port'];
		    var basedir, i, p;

		    if (this._parts.urn) {
		      throw new Error('URNs do not have any generally defined hierarchical components');
		    }

		    if (!(base instanceof URI)) {
		      base = new URI(base);
		    }

		    if (resolved._parts.protocol) {
		      // Directly returns even if this._parts.hostname is empty.
		      return resolved;
		    } else {
		      resolved._parts.protocol = base._parts.protocol;
		    }

		    if (this._parts.hostname) {
		      return resolved;
		    }

		    for (i = 0; (p = properties[i]); i++) {
		      resolved._parts[p] = base._parts[p];
		    }

		    if (!resolved._parts.path) {
		      resolved._parts.path = base._parts.path;
		      if (!resolved._parts.query) {
		        resolved._parts.query = base._parts.query;
		      }
		    } else {
		      if (resolved._parts.path.substring(-2) === '..') {
		        resolved._parts.path += '/';
		      }

		      if (resolved.path().charAt(0) !== '/') {
		        basedir = base.directory();
		        basedir = basedir ? basedir : base.path().indexOf('/') === 0 ? '/' : '';
		        resolved._parts.path = (basedir ? (basedir + '/') : '') + resolved._parts.path;
		        resolved.normalizePath();
		      }
		    }

		    resolved.build();
		    return resolved;
		  };
		  p.relativeTo = function(base) {
		    var relative = this.clone().normalize();
		    var relativeParts, baseParts, common, relativePath, basePath;

		    if (relative._parts.urn) {
		      throw new Error('URNs do not have any generally defined hierarchical components');
		    }

		    base = new URI(base).normalize();
		    relativeParts = relative._parts;
		    baseParts = base._parts;
		    relativePath = relative.path();
		    basePath = base.path();

		    if (relativePath.charAt(0) !== '/') {
		      throw new Error('URI is already relative');
		    }

		    if (basePath.charAt(0) !== '/') {
		      throw new Error('Cannot calculate a URI relative to another relative URI');
		    }

		    if (relativeParts.protocol === baseParts.protocol) {
		      relativeParts.protocol = null;
		    }

		    if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
		      return relative.build();
		    }

		    if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
		      return relative.build();
		    }

		    if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
		      relativeParts.hostname = null;
		      relativeParts.port = null;
		    } else {
		      return relative.build();
		    }

		    if (relativePath === basePath) {
		      relativeParts.path = '';
		      return relative.build();
		    }

		    // determine common sub path
		    common = URI.commonPath(relativePath, basePath);

		    // If the paths have nothing in common, return a relative URL with the absolute path.
		    if (!common) {
		      return relative.build();
		    }

		    var parents = baseParts.path
		      .substring(common.length)
		      .replace(/[^\/]*$/, '')
		      .replace(/.*?\//g, '../');

		    relativeParts.path = (parents + relativeParts.path.substring(common.length)) || './';

		    return relative.build();
		  };

		  // comparing URIs
		  p.equals = function(uri) {
		    var one = this.clone();
		    var two = new URI(uri);
		    var one_map = {};
		    var two_map = {};
		    var checked = {};
		    var one_query, two_query, key;

		    one.normalize();
		    two.normalize();

		    // exact match
		    if (one.toString() === two.toString()) {
		      return true;
		    }

		    // extract query string
		    one_query = one.query();
		    two_query = two.query();
		    one.query('');
		    two.query('');

		    // definitely not equal if not even non-query parts match
		    if (one.toString() !== two.toString()) {
		      return false;
		    }

		    // query parameters have the same length, even if they're permuted
		    if (one_query.length !== two_query.length) {
		      return false;
		    }

		    one_map = URI.parseQuery(one_query, this._parts.escapeQuerySpace);
		    two_map = URI.parseQuery(two_query, this._parts.escapeQuerySpace);

		    for (key in one_map) {
		      if (hasOwn.call(one_map, key)) {
		        if (!isArray(one_map[key])) {
		          if (one_map[key] !== two_map[key]) {
		            return false;
		          }
		        } else if (!arraysEqual(one_map[key], two_map[key])) {
		          return false;
		        }

		        checked[key] = true;
		      }
		    }

		    for (key in two_map) {
		      if (hasOwn.call(two_map, key)) {
		        if (!checked[key]) {
		          // two contains a parameter not present in one
		          return false;
		        }
		      }
		    }

		    return true;
		  };

		  // state
		  p.preventInvalidHostname = function(v) {
		    this._parts.preventInvalidHostname = !!v;
		    return this;
		  };

		  p.duplicateQueryParameters = function(v) {
		    this._parts.duplicateQueryParameters = !!v;
		    return this;
		  };

		  p.escapeQuerySpace = function(v) {
		    this._parts.escapeQuerySpace = !!v;
		    return this;
		  };

		  return URI;
		}));
	} (URI));

	var Uri = URIExports;

	/**
	 * @private
	 */
	function appendForwardSlash(url) {
	  if (url.length === 0 || url[url.length - 1] !== "/") {
	    url = `${url}/`;
	  }
	  return url;
	}

	/**
	 * Clones an object, returning a new object containing the same properties.
	 *
	 * @function
	 *
	 * @param {Object} object The object to clone.
	 * @param {Boolean} [deep=false] If true, all properties will be deep cloned recursively.
	 * @returns {Object} The cloned object.
	 */
	function clone(object, deep) {
	  if (object === null || typeof object !== "object") {
	    return object;
	  }

	  deep = defaultValue.defaultValue(deep, false);

	  const result = new object.constructor();
	  for (const propertyName in object) {
	    if (object.hasOwnProperty(propertyName)) {
	      let value = object[propertyName];
	      if (deep) {
	        value = clone(value, deep);
	      }
	      result[propertyName] = value;
	    }
	  }

	  return result;
	}

	/**
	 * A function used to resolve a promise upon completion .
	 * @callback defer.resolve
	 *
	 * @param {*} value The resulting value.
	 */

	/**
	 * A function used to reject a promise upon failure.
	 * @callback defer.reject
	 *
	 * @param {*} error The error.
	 */

	/**
	 * An object which contains a promise object, and functions to resolve or reject the promise.
	 *
	 * @typedef {Object} defer.deferred
	 * @property {defer.resolve} resolve Resolves the promise when called.
	 * @property {defer.reject} reject Rejects the promise when called.
	 * @property {Promise} promise Promise object.
	 */

	/**
	 * Creates a deferred object, containing a promise object, and functions to resolve or reject the promise.
	 * @returns {defer.deferred}
	 * @private
	 */
	function defer() {
	  let resolve;
	  let reject;
	  const promise = new Promise(function (res, rej) {
	    resolve = res;
	    reject = rej;
	  });

	  return {
	    resolve: resolve,
	    reject: reject,
	    promise: promise,
	  };
	}

	/**
	 * Given a relative Uri and a base Uri, returns the absolute Uri of the relative Uri.
	 * @function
	 *
	 * @param {String} relative The relative Uri.
	 * @param {String} [base] The base Uri.
	 * @returns {String} The absolute Uri of the given relative Uri.
	 *
	 * @example
	 * //absolute Uri will be "https://test.com/awesome.png";
	 * const absoluteUri = Cesium.getAbsoluteUri('awesome.png', 'https://test.com');
	 */
	function getAbsoluteUri(relative, base) {
	  let documentObject;
	  if (typeof document !== "undefined") {
	    documentObject = document;
	  }

	  return getAbsoluteUri._implementation(relative, base, documentObject);
	}

	getAbsoluteUri._implementation = function (relative, base, documentObject) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(relative)) {
	    throw new Check.DeveloperError("relative uri is required.");
	  }
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(base)) {
	    if (typeof documentObject === "undefined") {
	      return relative;
	    }
	    base = defaultValue.defaultValue(documentObject.baseURI, documentObject.location.href);
	  }

	  const relativeUri = new Uri(relative);
	  if (relativeUri.scheme() !== "") {
	    return relativeUri.toString();
	  }
	  return relativeUri.absoluteTo(base).toString();
	};

	/**
	 * Given a URI, returns the base path of the URI.
	 * @function
	 *
	 * @param {String} uri The Uri.
	 * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
	 * @returns {String} The base path of the Uri.
	 *
	 * @example
	 * // basePath will be "/Gallery/";
	 * const basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false');
	 *
	 * // basePath will be "/Gallery/?value=true&example=false";
	 * const basePath = Cesium.getBaseUri('/Gallery/simple.czml?value=true&example=false', true);
	 */
	function getBaseUri(uri, includeQuery) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(uri)) {
	    throw new Check.DeveloperError("uri is required.");
	  }
	  //>>includeEnd('debug');

	  let basePath = "";
	  const i = uri.lastIndexOf("/");
	  if (i !== -1) {
	    basePath = uri.substring(0, i + 1);
	  }

	  if (!includeQuery) {
	    return basePath;
	  }

	  uri = new Uri(uri);
	  if (uri.query().length !== 0) {
	    basePath += `?${uri.query()}`;
	  }
	  if (uri.fragment().length !== 0) {
	    basePath += `#${uri.fragment()}`;
	  }

	  return basePath;
	}

	/**
	 * Given a URI, returns the extension of the URI.
	 * @function getExtensionFromUri
	 *
	 * @param {String} uri The Uri.
	 * @returns {String} The extension of the Uri.
	 *
	 * @example
	 * //extension will be "czml";
	 * const extension = Cesium.getExtensionFromUri('/Gallery/simple.czml?value=true&example=false');
	 */
	function getExtensionFromUri(uri) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(uri)) {
	    throw new Check.DeveloperError("uri is required.");
	  }
	  //>>includeEnd('debug');

	  const uriObject = new Uri(uri);
	  uriObject.normalize();
	  let path = uriObject.path();
	  let index = path.lastIndexOf("/");
	  if (index !== -1) {
	    path = path.substr(index + 1);
	  }
	  index = path.lastIndexOf(".");
	  if (index === -1) {
	    path = "";
	  } else {
	    path = path.substr(index + 1);
	  }
	  return path;
	}

	const context2DsByWidthAndHeight = {};

	/**
	 * Extract a pixel array from a loaded image.  Draws the image
	 * into a canvas so it can read the pixels back.
	 *
	 * @function getImagePixels
	 *
	 * @param {HTMLImageElement|ImageBitmap} image The image to extract pixels from.
	 * @param {Number} width The width of the image. If not defined, then image.width is assigned.
	 * @param {Number} height The height of the image. If not defined, then image.height is assigned.
	 * @returns {ImageData} The pixels of the image.
	 */
	function getImagePixels(image, width, height) {
	  if (!defaultValue.defined(width)) {
	    width = image.width;
	  }
	  if (!defaultValue.defined(height)) {
	    height = image.height;
	  }

	  let context2DsByHeight = context2DsByWidthAndHeight[width];
	  if (!defaultValue.defined(context2DsByHeight)) {
	    context2DsByHeight = {};
	    context2DsByWidthAndHeight[width] = context2DsByHeight;
	  }

	  let context2d = context2DsByHeight[height];
	  if (!defaultValue.defined(context2d)) {
	    const canvas = document.createElement("canvas");
	    canvas.width = width;
	    canvas.height = height;
	    context2d = canvas.getContext("2d");
	    context2d.globalCompositeOperation = "copy";
	    context2DsByHeight[height] = context2d;
	  }

	  context2d.drawImage(image, 0, 0, width, height);
	  return context2d.getImageData(0, 0, width, height).data;
	}

	const blobUriRegex = /^blob:/i;

	/**
	 * Determines if the specified uri is a blob uri.
	 *
	 * @function isBlobUri
	 *
	 * @param {String} uri The uri to test.
	 * @returns {Boolean} true when the uri is a blob uri; otherwise, false.
	 *
	 * @private
	 */
	function isBlobUri(uri) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.string("uri", uri);
	  //>>includeEnd('debug');

	  return blobUriRegex.test(uri);
	}

	let a$1;

	/**
	 * Given a URL, determine whether that URL is considered cross-origin to the current page.
	 *
	 * @private
	 */
	function isCrossOriginUrl(url) {
	  if (!defaultValue.defined(a$1)) {
	    a$1 = document.createElement("a");
	  }

	  // copy window location into the anchor to get consistent results
	  // when the port is default for the protocol (e.g. 80 for HTTP)
	  a$1.href = window.location.href;

	  // host includes both hostname and port if the port is not standard
	  const host = a$1.host;
	  const protocol = a$1.protocol;

	  a$1.href = url;
	  // IE only absolutizes href on get, not set
	  // eslint-disable-next-line no-self-assign
	  a$1.href = a$1.href;

	  return protocol !== a$1.protocol || host !== a$1.host;
	}

	const dataUriRegex$1 = /^data:/i;

	/**
	 * Determines if the specified uri is a data uri.
	 *
	 * @function isDataUri
	 *
	 * @param {String} uri The uri to test.
	 * @returns {Boolean} true when the uri is a data uri; otherwise, false.
	 *
	 * @private
	 */
	function isDataUri(uri) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.string("uri", uri);
	  //>>includeEnd('debug');

	  return dataUriRegex$1.test(uri);
	}

	/**
	 * @private
	 */
	function loadAndExecuteScript(url) {
	  const script = document.createElement("script");
	  script.async = true;
	  script.src = url;

	  return new Promise((resolve, reject) => {
	    if (window.crossOriginIsolated) {
	      script.setAttribute("crossorigin", "anonymous");
	    }

	    const head = document.getElementsByTagName("head")[0];
	    script.onload = function () {
	      script.onload = undefined;
	      head.removeChild(script);
	      resolve();
	    };
	    script.onerror = function (e) {
	      reject(e);
	    };

	    head.appendChild(script);
	  });
	}

	/**
	 * Converts an object representing a set of name/value pairs into a query string,
	 * with names and values encoded properly for use in a URL.  Values that are arrays
	 * will produce multiple values with the same name.
	 * @function objectToQuery
	 *
	 * @param {Object} obj The object containing data to encode.
	 * @returns {String} An encoded query string.
	 *
	 *
	 * @example
	 * const str = Cesium.objectToQuery({
	 *     key1 : 'some value',
	 *     key2 : 'a/b',
	 *     key3 : ['x', 'y']
	 * });
	 *
	 * @see queryToObject
	 * // str will be:
	 * // 'key1=some%20value&key2=a%2Fb&key3=x&key3=y'
	 */
	function objectToQuery(obj) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(obj)) {
	    throw new Check.DeveloperError("obj is required.");
	  }
	  //>>includeEnd('debug');

	  let result = "";
	  for (const propName in obj) {
	    if (obj.hasOwnProperty(propName)) {
	      const value = obj[propName];

	      const part = `${encodeURIComponent(propName)}=`;
	      if (Array.isArray(value)) {
	        for (let i = 0, len = value.length; i < len; ++i) {
	          result += `${part + encodeURIComponent(value[i])}&`;
	        }
	      } else {
	        result += `${part + encodeURIComponent(value)}&`;
	      }
	    }
	  }

	  // trim last &
	  result = result.slice(0, -1);

	  // This function used to replace %20 with + which is more compact and readable.
	  // However, some servers didn't properly handle + as a space.
	  // https://github.com/CesiumGS/cesium/issues/2192

	  return result;
	}

	/**
	 * Parses a query string into an object, where the keys and values of the object are the
	 * name/value pairs from the query string, decoded. If a name appears multiple times,
	 * the value in the object will be an array of values.
	 * @function queryToObject
	 *
	 * @param {String} queryString The query string.
	 * @returns {Object} An object containing the parameters parsed from the query string.
	 *
	 *
	 * @example
	 * const obj = Cesium.queryToObject('key1=some%20value&key2=a%2Fb&key3=x&key3=y');
	 * // obj will be:
	 * // {
	 * //   key1 : 'some value',
	 * //   key2 : 'a/b',
	 * //   key3 : ['x', 'y']
	 * // }
	 *
	 * @see objectToQuery
	 */
	function queryToObject(queryString) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(queryString)) {
	    throw new Check.DeveloperError("queryString is required.");
	  }
	  //>>includeEnd('debug');

	  const result = {};
	  if (queryString === "") {
	    return result;
	  }
	  const parts = queryString.replace(/\+/g, "%20").split(/[&;]/);
	  for (let i = 0, len = parts.length; i < len; ++i) {
	    const subparts = parts[i].split("=");

	    const name = decodeURIComponent(subparts[0]);
	    let value = subparts[1];
	    if (defaultValue.defined(value)) {
	      value = decodeURIComponent(value);
	    } else {
	      value = "";
	    }

	    const resultValue = result[name];
	    if (typeof resultValue === "string") {
	      // expand the single value to an array
	      result[name] = [resultValue, value];
	    } else if (Array.isArray(resultValue)) {
	      resultValue.push(value);
	    } else {
	      result[name] = value;
	    }
	  }
	  return result;
	}

	/**
	 * State of the request.
	 *
	 * @enum {Number}
	 */
	const RequestState = {
	  /**
	   * Initial unissued state.
	   *
	   * @type Number
	   * @constant
	   */
	  UNISSUED: 0,

	  /**
	   * Issued but not yet active. Will become active when open slots are available.
	   *
	   * @type Number
	   * @constant
	   */
	  ISSUED: 1,

	  /**
	   * Actual http request has been sent.
	   *
	   * @type Number
	   * @constant
	   */
	  ACTIVE: 2,

	  /**
	   * Request completed successfully.
	   *
	   * @type Number
	   * @constant
	   */
	  RECEIVED: 3,

	  /**
	   * Request was cancelled, either explicitly or automatically because of low priority.
	   *
	   * @type Number
	   * @constant
	   */
	  CANCELLED: 4,

	  /**
	   * Request failed.
	   *
	   * @type Number
	   * @constant
	   */
	  FAILED: 5,
	};
	var RequestState$1 = Object.freeze(RequestState);

	/**
	 * An enum identifying the type of request. Used for finer grained logging and priority sorting.
	 *
	 * @enum {Number}
	 */
	const RequestType = {
	  /**
	   * Terrain request.
	   *
	   * @type Number
	   * @constant
	   */
	  TERRAIN: 0,

	  /**
	   * Imagery request.
	   *
	   * @type Number
	   * @constant
	   */
	  IMAGERY: 1,

	  /**
	   * 3D Tiles request.
	   *
	   * @type Number
	   * @constant
	   */
	  TILES3D: 2,

	  /**
	   * Other request.
	   *
	   * @type Number
	   * @constant
	   */
	  OTHER: 3,
	};
	var RequestType$1 = Object.freeze(RequestType);

	/**
	 * Stores information for making a request. In general this does not need to be constructed directly.
	 *
	 * @alias Request
	 * @constructor

	 * @param {Object} [options] An object with the following properties:
	 * @param {String} [options.url] The url to request.
	 * @param {Request.RequestCallback} [options.requestFunction] The function that makes the actual data request.
	 * @param {Request.CancelCallback} [options.cancelFunction] The function that is called when the request is cancelled.
	 * @param {Request.PriorityCallback} [options.priorityFunction] The function that is called to update the request's priority, which occurs once per frame.
	 * @param {Number} [options.priority=0.0] The initial priority of the request.
	 * @param {Boolean} [options.throttle=false] Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the request will be throttled and sent based on priority.
	 * @param {Boolean} [options.throttleByServer=false] Whether to throttle the request by server.
	 * @param {RequestType} [options.type=RequestType.OTHER] The type of request.
	 */
	function Request(options) {
	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

	  const throttleByServer = defaultValue.defaultValue(options.throttleByServer, false);
	  const throttle = defaultValue.defaultValue(options.throttle, false);

	  /**
	   * The URL to request.
	   *
	   * @type {String}
	   */
	  this.url = options.url;

	  /**
	   * The function that makes the actual data request.
	   *
	   * @type {Request.RequestCallback}
	   */
	  this.requestFunction = options.requestFunction;

	  /**
	   * The function that is called when the request is cancelled.
	   *
	   * @type {Request.CancelCallback}
	   */
	  this.cancelFunction = options.cancelFunction;

	  /**
	   * The function that is called to update the request's priority, which occurs once per frame.
	   *
	   * @type {Request.PriorityCallback}
	   */
	  this.priorityFunction = options.priorityFunction;

	  /**
	   * Priority is a unit-less value where lower values represent higher priority.
	   * For world-based objects, this is usually the distance from the camera.
	   * A request that does not have a priority function defaults to a priority of 0.
	   *
	   * If priorityFunction is defined, this value is updated every frame with the result of that call.
	   *
	   * @type {Number}
	   * @default 0.0
	   */
	  this.priority = defaultValue.defaultValue(options.priority, 0.0);

	  /**
	   * Whether to throttle and prioritize the request. If false, the request will be sent immediately. If true, the
	   * request will be throttled and sent based on priority.
	   *
	   * @type {Boolean}
	   * @readonly
	   *
	   * @default false
	   */
	  this.throttle = throttle;

	  /**
	   * Whether to throttle the request by server. Browsers typically support about 6-8 parallel connections
	   * for HTTP/1 servers, and an unlimited amount of connections for HTTP/2 servers. Setting this value
	   * to <code>true</code> is preferable for requests going through HTTP/1 servers.
	   *
	   * @type {Boolean}
	   * @readonly
	   *
	   * @default false
	   */
	  this.throttleByServer = throttleByServer;

	  /**
	   * Type of request.
	   *
	   * @type {RequestType}
	   * @readonly
	   *
	   * @default RequestType.OTHER
	   */
	  this.type = defaultValue.defaultValue(options.type, RequestType$1.OTHER);

	  /**
	   * A key used to identify the server that a request is going to. It is derived from the url's authority and scheme.
	   *
	   * @type {String}
	   *
	   * @private
	   */
	  this.serverKey = undefined;

	  /**
	   * The current state of the request.
	   *
	   * @type {RequestState}
	   * @readonly
	   */
	  this.state = RequestState$1.UNISSUED;

	  /**
	   * The requests's deferred promise.
	   *
	   * @type {Object}
	   *
	   * @private
	   */
	  this.deferred = undefined;

	  /**
	   * Whether the request was explicitly cancelled.
	   *
	   * @type {Boolean}
	   *
	   * @private
	   */
	  this.cancelled = false;
	}

	/**
	 * Mark the request as cancelled.
	 *
	 * @private
	 */
	Request.prototype.cancel = function () {
	  this.cancelled = true;
	};

	/**
	 * Duplicates a Request instance.
	 *
	 * @param {Request} [result] The object onto which to store the result.
	 *
	 * @returns {Request} The modified result parameter or a new Resource instance if one was not provided.
	 */
	Request.prototype.clone = function (result) {
	  if (!defaultValue.defined(result)) {
	    return new Request(this);
	  }

	  result.url = this.url;
	  result.requestFunction = this.requestFunction;
	  result.cancelFunction = this.cancelFunction;
	  result.priorityFunction = this.priorityFunction;
	  result.priority = this.priority;
	  result.throttle = this.throttle;
	  result.throttleByServer = this.throttleByServer;
	  result.type = this.type;
	  result.serverKey = this.serverKey;

	  // These get defaulted because the cloned request hasn't been issued
	  result.state = this.RequestState.UNISSUED;
	  result.deferred = undefined;
	  result.cancelled = false;

	  return result;
	};

	/**
	 * Parses the result of XMLHttpRequest's getAllResponseHeaders() method into
	 * a dictionary.
	 *
	 * @function parseResponseHeaders
	 *
	 * @param {String} headerString The header string returned by getAllResponseHeaders().  The format is
	 *                 described here: http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders()-method
	 * @returns {Object} A dictionary of key/value pairs, where each key is the name of a header and the corresponding value
	 *                   is that header's value.
	 *
	 * @private
	 */
	function parseResponseHeaders(headerString) {
	  const headers = {};

	  if (!headerString) {
	    return headers;
	  }

	  const headerPairs = headerString.split("\u000d\u000a");

	  for (let i = 0; i < headerPairs.length; ++i) {
	    const headerPair = headerPairs[i];
	    // Can't use split() here because it does the wrong thing
	    // if the header value has the string ": " in it.
	    const index = headerPair.indexOf("\u003a\u0020");
	    if (index > 0) {
	      const key = headerPair.substring(0, index);
	      const val = headerPair.substring(index + 2);
	      headers[key] = val;
	    }
	  }

	  return headers;
	}

	/**
	 * An event that is raised when a request encounters an error.
	 *
	 * @constructor
	 * @alias RequestErrorEvent
	 *
	 * @param {Number} [statusCode] The HTTP error status code, such as 404.
	 * @param {Object} [response] The response included along with the error.
	 * @param {String|Object} [responseHeaders] The response headers, represented either as an object literal or as a
	 *                        string in the format returned by XMLHttpRequest's getAllResponseHeaders() function.
	 */
	function RequestErrorEvent(statusCode, response, responseHeaders) {
	  /**
	   * The HTTP error status code, such as 404.  If the error does not have a particular
	   * HTTP code, this property will be undefined.
	   *
	   * @type {Number}
	   */
	  this.statusCode = statusCode;

	  /**
	   * The response included along with the error.  If the error does not include a response,
	   * this property will be undefined.
	   *
	   * @type {Object}
	   */
	  this.response = response;

	  /**
	   * The headers included in the response, represented as an object literal of key/value pairs.
	   * If the error does not include any headers, this property will be undefined.
	   *
	   * @type {Object}
	   */
	  this.responseHeaders = responseHeaders;

	  if (typeof this.responseHeaders === "string") {
	    this.responseHeaders = parseResponseHeaders(this.responseHeaders);
	  }
	}

	/**
	 * Creates a string representing this RequestErrorEvent.
	 * @memberof RequestErrorEvent
	 *
	 * @returns {String} A string representing the provided RequestErrorEvent.
	 */
	RequestErrorEvent.prototype.toString = function () {
	  let str = "Request has failed.";
	  if (defaultValue.defined(this.statusCode)) {
	    str += ` Status Code: ${this.statusCode}`;
	  }
	  return str;
	};

	/**
	 * A generic utility class for managing subscribers for a particular event.
	 * This class is usually instantiated inside of a container class and
	 * exposed as a property for others to subscribe to.
	 *
	 * @alias Event
	 * @template Listener extends (...args: any[]) => void = (...args: any[]) => void
	 * @constructor
	 * @example
	 * MyObject.prototype.myListener = function(arg1, arg2) {
	 *     this.myArg1Copy = arg1;
	 *     this.myArg2Copy = arg2;
	 * }
	 *
	 * const myObjectInstance = new MyObject();
	 * const evt = new Cesium.Event();
	 * evt.addEventListener(MyObject.prototype.myListener, myObjectInstance);
	 * evt.raiseEvent('1', '2');
	 * evt.removeEventListener(MyObject.prototype.myListener);
	 */
	function Event() {
	  this._listeners = [];
	  this._scopes = [];
	  this._toRemove = [];
	  this._insideRaiseEvent = false;
	}

	Object.defineProperties(Event.prototype, {
	  /**
	   * The number of listeners currently subscribed to the event.
	   * @memberof Event.prototype
	   * @type {Number}
	   * @readonly
	   */
	  numberOfListeners: {
	    get: function () {
	      return this._listeners.length - this._toRemove.length;
	    },
	  },
	});

	/**
	 * Registers a callback function to be executed whenever the event is raised.
	 * An optional scope can be provided to serve as the <code>this</code> pointer
	 * in which the function will execute.
	 *
	 * @param {Listener} listener The function to be executed when the event is raised.
	 * @param {Object} [scope] An optional object scope to serve as the <code>this</code>
	 *        pointer in which the listener function will execute.
	 * @returns {Event.RemoveCallback} A function that will remove this event listener when invoked.
	 *
	 * @see Event#raiseEvent
	 * @see Event#removeEventListener
	 */
	Event.prototype.addEventListener = function (listener, scope) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.func("listener", listener);
	  //>>includeEnd('debug');

	  this._listeners.push(listener);
	  this._scopes.push(scope);

	  const event = this;
	  return function () {
	    event.removeEventListener(listener, scope);
	  };
	};

	/**
	 * Unregisters a previously registered callback.
	 *
	 * @param {Listener} listener The function to be unregistered.
	 * @param {Object} [scope] The scope that was originally passed to addEventListener.
	 * @returns {Boolean} <code>true</code> if the listener was removed; <code>false</code> if the listener and scope are not registered with the event.
	 *
	 * @see Event#addEventListener
	 * @see Event#raiseEvent
	 */
	Event.prototype.removeEventListener = function (listener, scope) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.func("listener", listener);
	  //>>includeEnd('debug');

	  const listeners = this._listeners;
	  const scopes = this._scopes;

	  let index = -1;
	  for (let i = 0; i < listeners.length; i++) {
	    if (listeners[i] === listener && scopes[i] === scope) {
	      index = i;
	      break;
	    }
	  }

	  if (index !== -1) {
	    if (this._insideRaiseEvent) {
	      //In order to allow removing an event subscription from within
	      //a callback, we don't actually remove the items here.  Instead
	      //remember the index they are at and undefined their value.
	      this._toRemove.push(index);
	      listeners[index] = undefined;
	      scopes[index] = undefined;
	    } else {
	      listeners.splice(index, 1);
	      scopes.splice(index, 1);
	    }
	    return true;
	  }

	  return false;
	};

	function compareNumber(a, b) {
	  return b - a;
	}

	/**
	 * Raises the event by calling each registered listener with all supplied arguments.
	 *
	 * @param {...Parameters<Listener>} arguments This method takes any number of parameters and passes them through to the listener functions.
	 *
	 * @see Event#addEventListener
	 * @see Event#removeEventListener
	 */
	Event.prototype.raiseEvent = function () {
	  this._insideRaiseEvent = true;

	  let i;
	  const listeners = this._listeners;
	  const scopes = this._scopes;
	  let length = listeners.length;

	  for (i = 0; i < length; i++) {
	    const listener = listeners[i];
	    if (defaultValue.defined(listener)) {
	      listeners[i].apply(scopes[i], arguments);
	    }
	  }

	  //Actually remove items removed in removeEventListener.
	  const toRemove = this._toRemove;
	  length = toRemove.length;
	  if (length > 0) {
	    toRemove.sort(compareNumber);
	    for (i = 0; i < length; i++) {
	      const index = toRemove[i];
	      listeners.splice(index, 1);
	      scopes.splice(index, 1);
	    }
	    toRemove.length = 0;
	  }

	  this._insideRaiseEvent = false;
	};

	/**
	 * Array implementation of a heap.
	 *
	 * @alias Heap
	 * @constructor
	 * @private
	 *
	 * @param {Object} options Object with the following properties:
	 * @param {Heap.ComparatorCallback} options.comparator The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
	 */
	function Heap(options) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("options", options);
	  Check.Check.defined("options.comparator", options.comparator);
	  //>>includeEnd('debug');

	  this._comparator = options.comparator;
	  this._array = [];
	  this._length = 0;
	  this._maximumLength = undefined;
	}

	Object.defineProperties(Heap.prototype, {
	  /**
	   * Gets the length of the heap.
	   *
	   * @memberof Heap.prototype
	   *
	   * @type {Number}
	   * @readonly
	   */
	  length: {
	    get: function () {
	      return this._length;
	    },
	  },

	  /**
	   * Gets the internal array.
	   *
	   * @memberof Heap.prototype
	   *
	   * @type {Array}
	   * @readonly
	   */
	  internalArray: {
	    get: function () {
	      return this._array;
	    },
	  },

	  /**
	   * Gets and sets the maximum length of the heap.
	   *
	   * @memberof Heap.prototype
	   *
	   * @type {Number}
	   */
	  maximumLength: {
	    get: function () {
	      return this._maximumLength;
	    },
	    set: function (value) {
	      //>>includeStart('debug', pragmas.debug);
	      Check.Check.typeOf.number.greaterThanOrEquals("maximumLength", value, 0);
	      //>>includeEnd('debug');
	      const originalLength = this._length;
	      if (value < originalLength) {
	        const array = this._array;
	        // Remove trailing references
	        for (let i = value; i < originalLength; ++i) {
	          array[i] = undefined;
	        }
	        this._length = value;
	        array.length = value;
	      }
	      this._maximumLength = value;
	    },
	  },

	  /**
	   * The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
	   *
	   * @memberof Heap.prototype
	   *
	   * @type {Heap.ComparatorCallback}
	   */
	  comparator: {
	    get: function () {
	      return this._comparator;
	    },
	  },
	});

	function swap(array, a, b) {
	  const temp = array[a];
	  array[a] = array[b];
	  array[b] = temp;
	}

	/**
	 * Resizes the internal array of the heap.
	 *
	 * @param {Number} [length] The length to resize internal array to. Defaults to the current length of the heap.
	 */
	Heap.prototype.reserve = function (length) {
	  length = defaultValue.defaultValue(length, this._length);
	  this._array.length = length;
	};

	/**
	 * Update the heap so that index and all descendants satisfy the heap property.
	 *
	 * @param {Number} [index=0] The starting index to heapify from.
	 */
	Heap.prototype.heapify = function (index) {
	  index = defaultValue.defaultValue(index, 0);
	  const length = this._length;
	  const comparator = this._comparator;
	  const array = this._array;
	  let candidate = -1;
	  let inserting = true;

	  while (inserting) {
	    const right = 2 * (index + 1);
	    const left = right - 1;

	    if (left < length && comparator(array[left], array[index]) < 0) {
	      candidate = left;
	    } else {
	      candidate = index;
	    }

	    if (right < length && comparator(array[right], array[candidate]) < 0) {
	      candidate = right;
	    }
	    if (candidate !== index) {
	      swap(array, candidate, index);
	      index = candidate;
	    } else {
	      inserting = false;
	    }
	  }
	};

	/**
	 * Resort the heap.
	 */
	Heap.prototype.resort = function () {
	  const length = this._length;
	  for (let i = Math.ceil(length / 2); i >= 0; --i) {
	    this.heapify(i);
	  }
	};

	/**
	 * Insert an element into the heap. If the length would grow greater than maximumLength
	 * of the heap, extra elements are removed.
	 *
	 * @param {*} element The element to insert
	 *
	 * @return {*} The element that was removed from the heap if the heap is at full capacity.
	 */
	Heap.prototype.insert = function (element) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.defined("element", element);
	  //>>includeEnd('debug');

	  const array = this._array;
	  const comparator = this._comparator;
	  const maximumLength = this._maximumLength;

	  let index = this._length++;
	  if (index < array.length) {
	    array[index] = element;
	  } else {
	    array.push(element);
	  }

	  while (index !== 0) {
	    const parent = Math.floor((index - 1) / 2);
	    if (comparator(array[index], array[parent]) < 0) {
	      swap(array, index, parent);
	      index = parent;
	    } else {
	      break;
	    }
	  }

	  let removedElement;

	  if (defaultValue.defined(maximumLength) && this._length > maximumLength) {
	    removedElement = array[maximumLength];
	    this._length = maximumLength;
	  }

	  return removedElement;
	};

	/**
	 * Remove the element specified by index from the heap and return it.
	 *
	 * @param {Number} [index=0] The index to remove.
	 * @returns {*} The specified element of the heap.
	 */
	Heap.prototype.pop = function (index) {
	  index = defaultValue.defaultValue(index, 0);
	  if (this._length === 0) {
	    return undefined;
	  }
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.number.lessThan("index", index, this._length);
	  //>>includeEnd('debug');

	  const array = this._array;
	  const root = array[index];
	  swap(array, index, --this._length);
	  this.heapify(index);
	  array[this._length] = undefined; // Remove trailing reference
	  return root;
	};

	function sortRequests(a, b) {
	  return a.priority - b.priority;
	}

	const statistics = {
	  numberOfAttemptedRequests: 0,
	  numberOfActiveRequests: 0,
	  numberOfCancelledRequests: 0,
	  numberOfCancelledActiveRequests: 0,
	  numberOfFailedRequests: 0,
	  numberOfActiveRequestsEver: 0,
	  lastNumberOfActiveRequests: 0,
	};

	let priorityHeapLength = 20;
	const requestHeap = new Heap({
	  comparator: sortRequests,
	});
	requestHeap.maximumLength = priorityHeapLength;
	requestHeap.reserve(priorityHeapLength);

	const activeRequests = [];
	let numberOfActiveRequestsByServer = {};

	const pageUri =
	  typeof document !== "undefined" ? new Uri(document.location.href) : new Uri();

	const requestCompletedEvent = new Event();

	/**
	 * The request scheduler is used to track and constrain the number of active requests in order to prioritize incoming requests. The ability
	 * to retain control over the number of requests in CesiumJS is important because due to events such as changes in the camera position,
	 * a lot of new requests may be generated and a lot of in-flight requests may become redundant. The request scheduler manually constrains the
	 * number of requests so that newer requests wait in a shorter queue and don't have to compete for bandwidth with requests that have expired.
	 *
	 * @namespace RequestScheduler
	 *
	 */
	function RequestScheduler() {}

	/**
	 * The maximum number of simultaneous active requests. Un-throttled requests do not observe this limit.
	 * @type {Number}
	 * @default 50
	 */
	RequestScheduler.maximumRequests = 50;

	/**
	 * The maximum number of simultaneous active requests per server. Un-throttled requests or servers specifically
	 * listed in {@link requestsByServer} do not observe this limit.
	 * @type {Number}
	 * @default 6
	 */
	RequestScheduler.maximumRequestsPerServer = 6;

	/**
	 * A per server key list of overrides to use for throttling instead of <code>maximumRequestsPerServer</code>
	 * @type {Object}
	 *
	 * @example
	 * RequestScheduler.requestsByServer = {
	 *   'api.cesium.com:443': 18,
	 *   'assets.cesium.com:443': 18
	 * };
	 */
	RequestScheduler.requestsByServer = {
	  "api.cesium.com:443": 18,
	  "assets.cesium.com:443": 18,
	};

	/**
	 * Specifies if the request scheduler should throttle incoming requests, or let the browser queue requests under its control.
	 * @type {Boolean}
	 * @default true
	 */
	RequestScheduler.throttleRequests = true;

	/**
	 * When true, log statistics to the console every frame
	 * @type {Boolean}
	 * @default false
	 * @private
	 */
	RequestScheduler.debugShowStatistics = false;

	/**
	 * An event that's raised when a request is completed.  Event handlers are passed
	 * the error object if the request fails.
	 *
	 * @type {Event}
	 * @default Event()
	 * @private
	 */
	RequestScheduler.requestCompletedEvent = requestCompletedEvent;

	Object.defineProperties(RequestScheduler, {
	  /**
	   * Returns the statistics used by the request scheduler.
	   *
	   * @memberof RequestScheduler
	   *
	   * @type Object
	   * @readonly
	   * @private
	   */
	  statistics: {
	    get: function () {
	      return statistics;
	    },
	  },

	  /**
	   * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
	   *
	   * @memberof RequestScheduler
	   *
	   * @type {Number}
	   * @default 20
	   * @private
	   */
	  priorityHeapLength: {
	    get: function () {
	      return priorityHeapLength;
	    },
	    set: function (value) {
	      // If the new length shrinks the heap, need to cancel some of the requests.
	      // Since this value is not intended to be tweaked regularly it is fine to just cancel the high priority requests.
	      if (value < priorityHeapLength) {
	        while (requestHeap.length > value) {
	          const request = requestHeap.pop();
	          cancelRequest(request);
	        }
	      }
	      priorityHeapLength = value;
	      requestHeap.maximumLength = value;
	      requestHeap.reserve(value);
	    },
	  },
	});

	function updatePriority(request) {
	  if (defaultValue.defined(request.priorityFunction)) {
	    request.priority = request.priorityFunction();
	  }
	}

	/**
	 * Check if there are open slots for a particular server key. If desiredRequests is greater than 1, this checks if the queue has room for scheduling multiple requests.
	 * @param {String} serverKey The server key returned by {@link RequestScheduler.getServerKey}.
	 * @param {Number} [desiredRequests=1] How many requests the caller plans to request
	 * @return {Boolean} True if there are enough open slots for <code>desiredRequests</code> more requests.
	 * @private
	 */
	RequestScheduler.serverHasOpenSlots = function (serverKey, desiredRequests) {
	  desiredRequests = defaultValue.defaultValue(desiredRequests, 1);

	  const maxRequests = defaultValue.defaultValue(
	    RequestScheduler.requestsByServer[serverKey],
	    RequestScheduler.maximumRequestsPerServer
	  );
	  const hasOpenSlotsServer =
	    numberOfActiveRequestsByServer[serverKey] + desiredRequests <= maxRequests;

	  return hasOpenSlotsServer;
	};

	/**
	 * Check if the priority heap has open slots, regardless of which server they
	 * are from. This is used in {@link Multiple3DTileContent} for determining when
	 * all requests can be scheduled
	 * @param {Number} desiredRequests The number of requests the caller intends to make
	 * @return {Boolean} <code>true</code> if the heap has enough available slots to meet the desiredRequests. <code>false</code> otherwise.
	 *
	 * @private
	 */
	RequestScheduler.heapHasOpenSlots = function (desiredRequests) {
	  const hasOpenSlotsHeap =
	    requestHeap.length + desiredRequests <= priorityHeapLength;
	  return hasOpenSlotsHeap;
	};

	function issueRequest(request) {
	  if (request.state === RequestState$1.UNISSUED) {
	    request.state = RequestState$1.ISSUED;
	    request.deferred = defer();
	  }
	  return request.deferred.promise;
	}

	function getRequestReceivedFunction(request) {
	  return function (results) {
	    if (request.state === RequestState$1.CANCELLED) {
	      // If the data request comes back but the request is cancelled, ignore it.
	      return;
	    }
	    // explicitly set to undefined to ensure GC of request response data. See #8843
	    const deferred = request.deferred;

	    --statistics.numberOfActiveRequests;
	    --numberOfActiveRequestsByServer[request.serverKey];
	    requestCompletedEvent.raiseEvent();
	    request.state = RequestState$1.RECEIVED;
	    request.deferred = undefined;

	    deferred.resolve(results);
	  };
	}

	function getRequestFailedFunction(request) {
	  return function (error) {
	    if (request.state === RequestState$1.CANCELLED) {
	      // If the data request comes back but the request is cancelled, ignore it.
	      return;
	    }
	    ++statistics.numberOfFailedRequests;
	    --statistics.numberOfActiveRequests;
	    --numberOfActiveRequestsByServer[request.serverKey];
	    requestCompletedEvent.raiseEvent(error);
	    request.state = RequestState$1.FAILED;
	    request.deferred.reject(error);
	  };
	}

	function startRequest(request) {
	  const promise = issueRequest(request);
	  request.state = RequestState$1.ACTIVE;
	  activeRequests.push(request);
	  ++statistics.numberOfActiveRequests;
	  ++statistics.numberOfActiveRequestsEver;
	  ++numberOfActiveRequestsByServer[request.serverKey];
	  request
	    .requestFunction()
	    .then(getRequestReceivedFunction(request))
	    .catch(getRequestFailedFunction(request));
	  return promise;
	}

	function cancelRequest(request) {
	  const active = request.state === RequestState$1.ACTIVE;
	  request.state = RequestState$1.CANCELLED;
	  ++statistics.numberOfCancelledRequests;
	  // check that deferred has not been cleared since cancelRequest can be called
	  // on a finished request, e.g. by clearForSpecs during tests
	  if (defaultValue.defined(request.deferred)) {
	    const deferred = request.deferred;
	    request.deferred = undefined;
	    deferred.reject();
	  }

	  if (active) {
	    --statistics.numberOfActiveRequests;
	    --numberOfActiveRequestsByServer[request.serverKey];
	    ++statistics.numberOfCancelledActiveRequests;
	  }

	  if (defaultValue.defined(request.cancelFunction)) {
	    request.cancelFunction();
	  }
	}

	/**
	 * Sort requests by priority and start requests.
	 * @private
	 */
	RequestScheduler.update = function () {
	  let i;
	  let request;

	  // Loop over all active requests. Cancelled, failed, or received requests are removed from the array to make room for new requests.
	  let removeCount = 0;
	  const activeLength = activeRequests.length;
	  for (i = 0; i < activeLength; ++i) {
	    request = activeRequests[i];
	    if (request.cancelled) {
	      // Request was explicitly cancelled
	      cancelRequest(request);
	    }
	    if (request.state !== RequestState$1.ACTIVE) {
	      // Request is no longer active, remove from array
	      ++removeCount;
	      continue;
	    }
	    if (removeCount > 0) {
	      // Shift back to fill in vacated slots from completed requests
	      activeRequests[i - removeCount] = request;
	    }
	  }
	  activeRequests.length -= removeCount;

	  // Update priority of issued requests and resort the heap
	  const issuedRequests = requestHeap.internalArray;
	  const issuedLength = requestHeap.length;
	  for (i = 0; i < issuedLength; ++i) {
	    updatePriority(issuedRequests[i]);
	  }
	  requestHeap.resort();

	  // Get the number of open slots and fill with the highest priority requests.
	  // Un-throttled requests are automatically added to activeRequests, so activeRequests.length may exceed maximumRequests
	  const openSlots = Math.max(
	    RequestScheduler.maximumRequests - activeRequests.length,
	    0
	  );
	  let filledSlots = 0;
	  while (filledSlots < openSlots && requestHeap.length > 0) {
	    // Loop until all open slots are filled or the heap becomes empty
	    request = requestHeap.pop();
	    if (request.cancelled) {
	      // Request was explicitly cancelled
	      cancelRequest(request);
	      continue;
	    }

	    if (
	      request.throttleByServer &&
	      !RequestScheduler.serverHasOpenSlots(request.serverKey)
	    ) {
	      // Open slots are available, but the request is throttled by its server. Cancel and try again later.
	      cancelRequest(request);
	      continue;
	    }

	    startRequest(request);
	    ++filledSlots;
	  }

	  updateStatistics();
	};

	/**
	 * Get the server key from a given url.
	 *
	 * @param {String} url The url.
	 * @returns {String} The server key.
	 * @private
	 */
	RequestScheduler.getServerKey = function (url) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.string("url", url);
	  //>>includeEnd('debug');

	  let uri = new Uri(url);
	  if (uri.scheme() === "") {
	    uri = new Uri(url).absoluteTo(pageUri);
	    uri.normalize();
	  }

	  let serverKey = uri.authority();
	  if (!/:/.test(serverKey)) {
	    // If the authority does not contain a port number, add port 443 for https or port 80 for http
	    serverKey = `${serverKey}:${uri.scheme() === "https" ? "443" : "80"}`;
	  }

	  const length = numberOfActiveRequestsByServer[serverKey];
	  if (!defaultValue.defined(length)) {
	    numberOfActiveRequestsByServer[serverKey] = 0;
	  }

	  return serverKey;
	};

	/**
	 * Issue a request. If request.throttle is false, the request is sent immediately. Otherwise the request will be
	 * queued and sorted by priority before being sent.
	 *
	 * @param {Request} request The request object.
	 *
	 * @returns {Promise|undefined} A Promise for the requested data, or undefined if this request does not have high enough priority to be issued.
	 *
	 * @private
	 */
	RequestScheduler.request = function (request) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("request", request);
	  Check.Check.typeOf.string("request.url", request.url);
	  Check.Check.typeOf.func("request.requestFunction", request.requestFunction);
	  //>>includeEnd('debug');

	  if (isDataUri(request.url) || isBlobUri(request.url)) {
	    requestCompletedEvent.raiseEvent();
	    request.state = RequestState$1.RECEIVED;
	    return request.requestFunction();
	  }

	  ++statistics.numberOfAttemptedRequests;

	  if (!defaultValue.defined(request.serverKey)) {
	    request.serverKey = RequestScheduler.getServerKey(request.url);
	  }

	  if (
	    RequestScheduler.throttleRequests &&
	    request.throttleByServer &&
	    !RequestScheduler.serverHasOpenSlots(request.serverKey)
	  ) {
	    // Server is saturated. Try again later.
	    return undefined;
	  }

	  if (!RequestScheduler.throttleRequests || !request.throttle) {
	    return startRequest(request);
	  }

	  if (activeRequests.length >= RequestScheduler.maximumRequests) {
	    // Active requests are saturated. Try again later.
	    return undefined;
	  }

	  // Insert into the priority heap and see if a request was bumped off. If this request is the lowest
	  // priority it will be returned.
	  updatePriority(request);
	  const removedRequest = requestHeap.insert(request);

	  if (defaultValue.defined(removedRequest)) {
	    if (removedRequest === request) {
	      // Request does not have high enough priority to be issued
	      return undefined;
	    }
	    // A previously issued request has been bumped off the priority heap, so cancel it
	    cancelRequest(removedRequest);
	  }

	  return issueRequest(request);
	};

	function updateStatistics() {
	  if (!RequestScheduler.debugShowStatistics) {
	    return;
	  }

	  if (
	    statistics.numberOfActiveRequests === 0 &&
	    statistics.lastNumberOfActiveRequests > 0
	  ) {
	    if (statistics.numberOfAttemptedRequests > 0) {
	      console.log(
	        `Number of attempted requests: ${statistics.numberOfAttemptedRequests}`
	      );
	      statistics.numberOfAttemptedRequests = 0;
	    }

	    if (statistics.numberOfCancelledRequests > 0) {
	      console.log(
	        `Number of cancelled requests: ${statistics.numberOfCancelledRequests}`
	      );
	      statistics.numberOfCancelledRequests = 0;
	    }

	    if (statistics.numberOfCancelledActiveRequests > 0) {
	      console.log(
	        `Number of cancelled active requests: ${statistics.numberOfCancelledActiveRequests}`
	      );
	      statistics.numberOfCancelledActiveRequests = 0;
	    }

	    if (statistics.numberOfFailedRequests > 0) {
	      console.log(
	        `Number of failed requests: ${statistics.numberOfFailedRequests}`
	      );
	      statistics.numberOfFailedRequests = 0;
	    }
	  }

	  statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests;
	}

	/**
	 * For testing only. Clears any requests that may not have completed from previous tests.
	 *
	 * @private
	 */
	RequestScheduler.clearForSpecs = function () {
	  while (requestHeap.length > 0) {
	    const request = requestHeap.pop();
	    cancelRequest(request);
	  }
	  const length = activeRequests.length;
	  for (let i = 0; i < length; ++i) {
	    cancelRequest(activeRequests[i]);
	  }
	  activeRequests.length = 0;
	  numberOfActiveRequestsByServer = {};

	  // Clear stats
	  statistics.numberOfAttemptedRequests = 0;
	  statistics.numberOfActiveRequests = 0;
	  statistics.numberOfCancelledRequests = 0;
	  statistics.numberOfCancelledActiveRequests = 0;
	  statistics.numberOfFailedRequests = 0;
	  statistics.numberOfActiveRequestsEver = 0;
	  statistics.lastNumberOfActiveRequests = 0;
	};

	/**
	 * For testing only.
	 *
	 * @private
	 */
	RequestScheduler.numberOfActiveRequestsByServer = function (serverKey) {
	  return numberOfActiveRequestsByServer[serverKey];
	};

	/**
	 * For testing only.
	 *
	 * @private
	 */
	RequestScheduler.requestHeap = requestHeap;

	/**
	 * A singleton that contains all of the servers that are trusted. Credentials will be sent with
	 * any requests to these servers.
	 *
	 * @namespace TrustedServers
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 */
	const TrustedServers = {};
	let _servers = {};

	/**
	 * Adds a trusted server to the registry
	 *
	 * @param {String} host The host to be added.
	 * @param {Number} port The port used to access the host.
	 *
	 * @example
	 * // Add a trusted server
	 * TrustedServers.add('my.server.com', 80);
	 */
	TrustedServers.add = function (host, port) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(host)) {
	    throw new Check.DeveloperError("host is required.");
	  }
	  if (!defaultValue.defined(port) || port <= 0) {
	    throw new Check.DeveloperError("port is required to be greater than 0.");
	  }
	  //>>includeEnd('debug');

	  const authority = `${host.toLowerCase()}:${port}`;
	  if (!defaultValue.defined(_servers[authority])) {
	    _servers[authority] = true;
	  }
	};

	/**
	 * Removes a trusted server from the registry
	 *
	 * @param {String} host The host to be removed.
	 * @param {Number} port The port used to access the host.
	 *
	 * @example
	 * // Remove a trusted server
	 * TrustedServers.remove('my.server.com', 80);
	 */
	TrustedServers.remove = function (host, port) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(host)) {
	    throw new Check.DeveloperError("host is required.");
	  }
	  if (!defaultValue.defined(port) || port <= 0) {
	    throw new Check.DeveloperError("port is required to be greater than 0.");
	  }
	  //>>includeEnd('debug');

	  const authority = `${host.toLowerCase()}:${port}`;
	  if (defaultValue.defined(_servers[authority])) {
	    delete _servers[authority];
	  }
	};

	function getAuthority(url) {
	  const uri = new Uri(url);
	  uri.normalize();

	  // Removes username:password@ so we just have host[:port]
	  let authority = uri.authority();
	  if (authority.length === 0) {
	    return undefined; // Relative URL
	  }
	  uri.authority(authority);

	  if (authority.indexOf("@") !== -1) {
	    const parts = authority.split("@");
	    authority = parts[1];
	  }

	  // If the port is missing add one based on the scheme
	  if (authority.indexOf(":") === -1) {
	    let scheme = uri.scheme();
	    if (scheme.length === 0) {
	      scheme = window.location.protocol;
	      scheme = scheme.substring(0, scheme.length - 1);
	    }
	    if (scheme === "http") {
	      authority += ":80";
	    } else if (scheme === "https") {
	      authority += ":443";
	    } else {
	      return undefined;
	    }
	  }

	  return authority;
	}

	/**
	 * Tests whether a server is trusted or not. The server must have been added with the port if it is included in the url.
	 *
	 * @param {String} url The url to be tested against the trusted list
	 *
	 * @returns {boolean} Returns true if url is trusted, false otherwise.
	 *
	 * @example
	 * // Add server
	 * TrustedServers.add('my.server.com', 81);
	 *
	 * // Check if server is trusted
	 * if (TrustedServers.contains('https://my.server.com:81/path/to/file.png')) {
	 *     // my.server.com:81 is trusted
	 * }
	 * if (TrustedServers.contains('https://my.server.com/path/to/file.png')) {
	 *     // my.server.com isn't trusted
	 * }
	 */
	TrustedServers.contains = function (url) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(url)) {
	    throw new Check.DeveloperError("url is required.");
	  }
	  //>>includeEnd('debug');
	  const authority = getAuthority(url);
	  if (defaultValue.defined(authority) && defaultValue.defined(_servers[authority])) {
	    return true;
	  }

	  return false;
	};

	/**
	 * Clears the registry
	 *
	 * @example
	 * // Remove a trusted server
	 * TrustedServers.clear();
	 */
	TrustedServers.clear = function () {
	  _servers = {};
	};
	var TrustedServers$1 = TrustedServers;

	const xhrBlobSupported = (function () {
	  try {
	    const xhr = new XMLHttpRequest();
	    xhr.open("GET", "#", true);
	    xhr.responseType = "blob";
	    return xhr.responseType === "blob";
	  } catch (e) {
	    return false;
	  }
	})();

	/**
	 * Parses a query string and returns the object equivalent.
	 *
	 * @param {Uri} uri The Uri with a query object.
	 * @param {Resource} resource The Resource that will be assigned queryParameters.
	 * @param {Boolean} merge If true, we'll merge with the resource's existing queryParameters. Otherwise they will be replaced.
	 * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in uri will take precedence.
	 *
	 * @private
	 */
	function parseQuery(uri, resource, merge, preserveQueryParameters) {
	  const queryString = uri.query();
	  if (queryString.length === 0) {
	    return {};
	  }

	  let query;
	  // Special case we run into where the querystring is just a string, not key/value pairs
	  if (queryString.indexOf("=") === -1) {
	    const result = {};
	    result[queryString] = undefined;
	    query = result;
	  } else {
	    query = queryToObject(queryString);
	  }

	  if (merge) {
	    resource._queryParameters = combineQueryParameters(
	      query,
	      resource._queryParameters,
	      preserveQueryParameters
	    );
	  } else {
	    resource._queryParameters = query;
	  }
	  uri.search("");
	}

	/**
	 * Converts a query object into a string.
	 *
	 * @param {Uri} uri The Uri object that will have the query object set.
	 * @param {Resource} resource The resource that has queryParameters
	 *
	 * @private
	 */
	function stringifyQuery(uri, resource) {
	  const queryObject = resource._queryParameters;

	  const keys = Object.keys(queryObject);

	  // We have 1 key with an undefined value, so this is just a string, not key/value pairs
	  if (keys.length === 1 && !defaultValue.defined(queryObject[keys[0]])) {
	    uri.search(keys[0]);
	  } else {
	    uri.search(objectToQuery(queryObject));
	  }
	}

	/**
	 * Clones a value if it is defined, otherwise returns the default value
	 *
	 * @param {*} [val] The value to clone.
	 * @param {*} [defaultVal] The default value.
	 *
	 * @returns {*} A clone of val or the defaultVal.
	 *
	 * @private
	 */
	function defaultClone(val, defaultVal) {
	  if (!defaultValue.defined(val)) {
	    return defaultVal;
	  }

	  return defaultValue.defined(val.clone) ? val.clone() : clone(val);
	}

	/**
	 * Checks to make sure the Resource isn't already being requested.
	 *
	 * @param {Request} request The request to check.
	 *
	 * @private
	 */
	function checkAndResetRequest(request) {
	  if (
	    request.state === RequestState$1.ISSUED ||
	    request.state === RequestState$1.ACTIVE
	  ) {
	    throw new RuntimeError.RuntimeError("The Resource is already being fetched.");
	  }

	  request.state = RequestState$1.UNISSUED;
	  request.deferred = undefined;
	}

	/**
	 * This combines a map of query parameters.
	 *
	 * @param {Object} q1 The first map of query parameters. Values in this map will take precedence if preserveQueryParameters is false.
	 * @param {Object} q2 The second map of query parameters.
	 * @param {Boolean} preserveQueryParameters If true duplicate parameters will be concatenated into an array. If false, keys in q1 will take precedence.
	 *
	 * @returns {Object} The combined map of query parameters.
	 *
	 * @example
	 * const q1 = {
	 *   a: 1,
	 *   b: 2
	 * };
	 * const q2 = {
	 *   a: 3,
	 *   c: 4
	 * };
	 * const q3 = {
	 *   b: [5, 6],
	 *   d: 7
	 * }
	 *
	 * // Returns
	 * // {
	 * //   a: [1, 3],
	 * //   b: 2,
	 * //   c: 4
	 * // };
	 * combineQueryParameters(q1, q2, true);
	 *
	 * // Returns
	 * // {
	 * //   a: 1,
	 * //   b: 2,
	 * //   c: 4
	 * // };
	 * combineQueryParameters(q1, q2, false);
	 *
	 * // Returns
	 * // {
	 * //   a: 1,
	 * //   b: [2, 5, 6],
	 * //   d: 7
	 * // };
	 * combineQueryParameters(q1, q3, true);
	 *
	 * // Returns
	 * // {
	 * //   a: 1,
	 * //   b: 2,
	 * //   d: 7
	 * // };
	 * combineQueryParameters(q1, q3, false);
	 *
	 * @private
	 */
	function combineQueryParameters(q1, q2, preserveQueryParameters) {
	  if (!preserveQueryParameters) {
	    return combine.combine(q1, q2);
	  }

	  const result = clone(q1, true);
	  for (const param in q2) {
	    if (q2.hasOwnProperty(param)) {
	      let value = result[param];
	      const q2Value = q2[param];
	      if (defaultValue.defined(value)) {
	        if (!Array.isArray(value)) {
	          value = result[param] = [value];
	        }

	        result[param] = value.concat(q2Value);
	      } else {
	        result[param] = Array.isArray(q2Value) ? q2Value.slice() : q2Value;
	      }
	    }
	  }

	  return result;
	}

	/**
	 * @typedef {Object} Resource.ConstructorOptions
	 *
	 * Initialization options for the Resource constructor
	 *
	 * @property {String} url The url of the resource.
	 * @property {Object} [queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @property {Object} [templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @property {Object} [headers={}] Additional HTTP headers that will be sent.
	 * @property {Proxy} [proxy] A proxy to be used when loading the resource.
	 * @property {Resource.RetryCallback} [retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @property {Number} [retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @property {Request} [request] A Request object that will be used. Intended for internal use only.
	 */

	/**
	 * A resource that includes the location and any other parameters we need to retrieve it or create derived resources. It also provides the ability to retry requests.
	 *
	 * @alias Resource
	 * @constructor
	 *
	 * @param {String|Resource.ConstructorOptions} options A url or an object describing initialization options
	 *
	 * @example
	 * function refreshTokenRetryCallback(resource, error) {
	 *   if (error.statusCode === 403) {
	 *     // 403 status code means a new token should be generated
	 *     return getNewAccessToken()
	 *       .then(function(token) {
	 *         resource.queryParameters.access_token = token;
	 *         return true;
	 *       })
	 *       .catch(function() {
	 *         return false;
	 *       });
	 *   }
	 *
	 *   return false;
	 * }
	 *
	 * const resource = new Resource({
	 *    url: 'http://server.com/path/to/resource.json',
	 *    proxy: new DefaultProxy('/proxy/'),
	 *    headers: {
	 *      'X-My-Header': 'valueOfHeader'
	 *    },
	 *    queryParameters: {
	 *      'access_token': '123-435-456-000'
	 *    },
	 *    retryCallback: refreshTokenRetryCallback,
	 *    retryAttempts: 1
	 * });
	 */
	function Resource(options) {
	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
	  if (typeof options === "string") {
	    options = {
	      url: options,
	    };
	  }

	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.string("options.url", options.url);
	  //>>includeEnd('debug');

	  this._url = undefined;
	  this._templateValues = defaultClone(options.templateValues, {});
	  this._queryParameters = defaultClone(options.queryParameters, {});

	  /**
	   * Additional HTTP headers that will be sent with the request.
	   *
	   * @type {Object}
	   */
	  this.headers = defaultClone(options.headers, {});

	  /**
	   * A Request object that will be used. Intended for internal use only.
	   *
	   * @type {Request}
	   */
	  this.request = defaultValue.defaultValue(options.request, new Request());

	  /**
	   * A proxy to be used when loading the resource.
	   *
	   * @type {Proxy}
	   */
	  this.proxy = options.proxy;

	  /**
	   * Function to call when a request for this resource fails. If it returns true or a Promise that resolves to true, the request will be retried.
	   *
	   * @type {Function}
	   */
	  this.retryCallback = options.retryCallback;

	  /**
	   * The number of times the retryCallback should be called before giving up.
	   *
	   * @type {Number}
	   */
	  this.retryAttempts = defaultValue.defaultValue(options.retryAttempts, 0);
	  this._retryCount = 0;

	  const uri = new Uri(options.url);
	  parseQuery(uri, this, true, true);

	  // Remove the fragment as it's not sent with a request
	  uri.fragment("");

	  this._url = uri.toString();
	}

	/**
	 * A helper function to create a resource depending on whether we have a String or a Resource
	 *
	 * @param {Resource|String} resource A Resource or a String to use when creating a new Resource.
	 *
	 * @returns {Resource} If resource is a String, a Resource constructed with the url and options. Otherwise the resource parameter is returned.
	 *
	 * @private
	 */
	Resource.createIfNeeded = function (resource) {
	  if (resource instanceof Resource) {
	    // Keep existing request object. This function is used internally to duplicate a Resource, so that it can't
	    //  be modified outside of a class that holds it (eg. an imagery or terrain provider). Since the Request objects
	    //  are managed outside of the providers, by the tile loading code, we want to keep the request property the same so if it is changed
	    //  in the underlying tiling code the requests for this resource will use it.
	    return resource.getDerivedResource({
	      request: resource.request,
	    });
	  }

	  if (typeof resource !== "string") {
	    return resource;
	  }

	  return new Resource({
	    url: resource,
	  });
	};

	let supportsImageBitmapOptionsPromise;
	/**
	 * A helper function to check whether createImageBitmap supports passing ImageBitmapOptions.
	 *
	 * @returns {Promise<Boolean>} A promise that resolves to true if this browser supports creating an ImageBitmap with options.
	 *
	 * @private
	 */
	Resource.supportsImageBitmapOptions = function () {
	  // Until the HTML folks figure out what to do about this, we need to actually try loading an image to
	  // know if this browser supports passing options to the createImageBitmap function.
	  // https://github.com/whatwg/html/pull/4248
	  //
	  // We also need to check whether the colorSpaceConversion option is supported.
	  // We do this by loading a PNG with an embedded color profile, first with
	  // colorSpaceConversion: "none" and then with colorSpaceConversion: "default".
	  // If the pixel color is different then we know the option is working.
	  // As of Webkit 17612.3.6.1.6 the createImageBitmap promise resolves but the
	  // option is not actually supported.
	  if (defaultValue.defined(supportsImageBitmapOptionsPromise)) {
	    return supportsImageBitmapOptionsPromise;
	  }

	  if (typeof createImageBitmap !== "function") {
	    supportsImageBitmapOptionsPromise = Promise.resolve(false);
	    return supportsImageBitmapOptionsPromise;
	  }

	  const imageDataUri =
	    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABGdBTUEAAE4g3rEiDgAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAADElEQVQI12Ng6GAAAAEUAIngE3ZiAAAAAElFTkSuQmCC";

	  supportsImageBitmapOptionsPromise = Resource.fetchBlob({
	    url: imageDataUri,
	  })
	    .then(function (blob) {
	      const imageBitmapOptions = {
	        imageOrientation: "flipY", // default is "none"
	        premultiplyAlpha: "none", // default is "default"
	        colorSpaceConversion: "none", // default is "default"
	      };
	      return Promise.all([
	        createImageBitmap(blob, imageBitmapOptions),
	        createImageBitmap(blob),
	      ]);
	    })
	    .then(function (imageBitmaps) {
	      // Check whether the colorSpaceConversion option had any effect on the green channel
	      const colorWithOptions = getImagePixels(imageBitmaps[0]);
	      const colorWithDefaults = getImagePixels(imageBitmaps[1]);
	      return colorWithOptions[1] !== colorWithDefaults[1];
	    })
	    .catch(function () {
	      return false;
	    });

	  return supportsImageBitmapOptionsPromise;
	};

	Object.defineProperties(Resource, {
	  /**
	   * Returns true if blobs are supported.
	   *
	   * @memberof Resource
	   * @type {Boolean}
	   *
	   * @readonly
	   */
	  isBlobSupported: {
	    get: function () {
	      return xhrBlobSupported;
	    },
	  },
	});

	Object.defineProperties(Resource.prototype, {
	  /**
	   * Query parameters appended to the url.
	   *
	   * @memberof Resource.prototype
	   * @type {Object}
	   *
	   * @readonly
	   */
	  queryParameters: {
	    get: function () {
	      return this._queryParameters;
	    },
	  },

	  /**
	   * The key/value pairs used to replace template parameters in the url.
	   *
	   * @memberof Resource.prototype
	   * @type {Object}
	   *
	   * @readonly
	   */
	  templateValues: {
	    get: function () {
	      return this._templateValues;
	    },
	  },

	  /**
	   * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
	   *
	   * @memberof Resource.prototype
	   * @type {String}
	   */
	  url: {
	    get: function () {
	      return this.getUrlComponent(true, true);
	    },
	    set: function (value) {
	      const uri = new Uri(value);

	      parseQuery(uri, this, false);

	      // Remove the fragment as it's not sent with a request
	      uri.fragment("");

	      this._url = uri.toString();
	    },
	  },

	  /**
	   * The file extension of the resource.
	   *
	   * @memberof Resource.prototype
	   * @type {String}
	   *
	   * @readonly
	   */
	  extension: {
	    get: function () {
	      return getExtensionFromUri(this._url);
	    },
	  },

	  /**
	   * True if the Resource refers to a data URI.
	   *
	   * @memberof Resource.prototype
	   * @type {Boolean}
	   */
	  isDataUri: {
	    get: function () {
	      return isDataUri(this._url);
	    },
	  },

	  /**
	   * True if the Resource refers to a blob URI.
	   *
	   * @memberof Resource.prototype
	   * @type {Boolean}
	   */
	  isBlobUri: {
	    get: function () {
	      return isBlobUri(this._url);
	    },
	  },

	  /**
	   * True if the Resource refers to a cross origin URL.
	   *
	   * @memberof Resource.prototype
	   * @type {Boolean}
	   */
	  isCrossOriginUrl: {
	    get: function () {
	      return isCrossOriginUrl(this._url);
	    },
	  },

	  /**
	   * True if the Resource has request headers. This is equivalent to checking if the headers property has any keys.
	   *
	   * @memberof Resource.prototype
	   * @type {Boolean}
	   */
	  hasHeaders: {
	    get: function () {
	      return Object.keys(this.headers).length > 0;
	    },
	  },
	});

	/**
	 * Override Object#toString so that implicit string conversion gives the
	 * complete URL represented by this Resource.
	 *
	 * @returns {String} The URL represented by this Resource
	 */
	Resource.prototype.toString = function () {
	  return this.getUrlComponent(true, true);
	};

	/**
	 * Returns the url, optional with the query string and processed by a proxy.
	 *
	 * @param {Boolean} [query=false] If true, the query string is included.
	 * @param {Boolean} [proxy=false] If true, the url is processed by the proxy object, if defined.
	 *
	 * @returns {String} The url with all the requested components.
	 */
	Resource.prototype.getUrlComponent = function (query, proxy) {
	  if (this.isDataUri) {
	    return this._url;
	  }

	  const uri = new Uri(this._url);

	  if (query) {
	    stringifyQuery(uri, this);
	  }

	  // objectToQuery escapes the placeholders.  Undo that.
	  let url = uri.toString().replace(/%7B/g, "{").replace(/%7D/g, "}");

	  const templateValues = this._templateValues;
	  url = url.replace(/{(.*?)}/g, function (match, key) {
	    const replacement = templateValues[key];
	    if (defaultValue.defined(replacement)) {
	      // use the replacement value from templateValues if there is one...
	      return encodeURIComponent(replacement);
	    }
	    // otherwise leave it unchanged
	    return match;
	  });

	  if (proxy && defaultValue.defined(this.proxy)) {
	    url = this.proxy.getURL(url);
	  }
	  return url;
	};

	/**
	 * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
	 *  as opposed to adding them one at a time to the queryParameters property. If a value is already set, it will be replaced with the new value.
	 *
	 * @param {Object} params The query parameters
	 * @param {Boolean} [useAsDefault=false] If true the params will be used as the default values, so they will only be set if they are undefined.
	 */
	Resource.prototype.setQueryParameters = function (params, useAsDefault) {
	  if (useAsDefault) {
	    this._queryParameters = combineQueryParameters(
	      this._queryParameters,
	      params,
	      false
	    );
	  } else {
	    this._queryParameters = combineQueryParameters(
	      params,
	      this._queryParameters,
	      false
	    );
	  }
	};

	/**
	 * Combines the specified object and the existing query parameters. This allows you to add many parameters at once,
	 *  as opposed to adding them one at a time to the queryParameters property.
	 *
	 * @param {Object} params The query parameters
	 */
	Resource.prototype.appendQueryParameters = function (params) {
	  this._queryParameters = combineQueryParameters(
	    params,
	    this._queryParameters,
	    true
	  );
	};

	/**
	 * Combines the specified object and the existing template values. This allows you to add many values at once,
	 *  as opposed to adding them one at a time to the templateValues property. If a value is already set, it will become an array and the new value will be appended.
	 *
	 * @param {Object} template The template values
	 * @param {Boolean} [useAsDefault=false] If true the values will be used as the default values, so they will only be set if they are undefined.
	 */
	Resource.prototype.setTemplateValues = function (template, useAsDefault) {
	  if (useAsDefault) {
	    this._templateValues = combine.combine(this._templateValues, template);
	  } else {
	    this._templateValues = combine.combine(template, this._templateValues);
	  }
	};

	/**
	 * Returns a resource relative to the current instance. All properties remain the same as the current instance unless overridden in options.
	 *
	 * @param {Object} options An object with the following properties
	 * @param {String} [options.url]  The url that will be resolved relative to the url of the current instance.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be combined with those of the current instance.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}). These will be combined with those of the current instance.
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The function to call when loading the resource fails.
	 * @param {Number} [options.retryAttempts] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {Boolean} [options.preserveQueryParameters=false] If true, this will keep all query parameters from the current resource and derived resource. If false, derived parameters will replace those of the current resource.
	 *
	 * @returns {Resource} The resource derived from the current one.
	 */
	Resource.prototype.getDerivedResource = function (options) {
	  const resource = this.clone();
	  resource._retryCount = 0;

	  if (defaultValue.defined(options.url)) {
	    const uri = new Uri(options.url);

	    const preserveQueryParameters = defaultValue.defaultValue(
	      options.preserveQueryParameters,
	      false
	    );
	    parseQuery(uri, resource, true, preserveQueryParameters);

	    // Remove the fragment as it's not sent with a request
	    uri.fragment("");

	    if (uri.scheme() !== "") {
	      resource._url = uri.toString();
	    } else {
	      resource._url = uri
	        .absoluteTo(new Uri(getAbsoluteUri(this._url)))
	        .toString();
	    }
	  }

	  if (defaultValue.defined(options.queryParameters)) {
	    resource._queryParameters = combine.combine(
	      options.queryParameters,
	      resource._queryParameters
	    );
	  }
	  if (defaultValue.defined(options.templateValues)) {
	    resource._templateValues = combine.combine(
	      options.templateValues,
	      resource.templateValues
	    );
	  }
	  if (defaultValue.defined(options.headers)) {
	    resource.headers = combine.combine(options.headers, resource.headers);
	  }
	  if (defaultValue.defined(options.proxy)) {
	    resource.proxy = options.proxy;
	  }
	  if (defaultValue.defined(options.request)) {
	    resource.request = options.request;
	  }
	  if (defaultValue.defined(options.retryCallback)) {
	    resource.retryCallback = options.retryCallback;
	  }
	  if (defaultValue.defined(options.retryAttempts)) {
	    resource.retryAttempts = options.retryAttempts;
	  }

	  return resource;
	};

	/**
	 * Called when a resource fails to load. This will call the retryCallback function if defined until retryAttempts is reached.
	 *
	 * @param {Error} [error] The error that was encountered.
	 *
	 * @returns {Promise<Boolean>} A promise to a boolean, that if true will cause the resource request to be retried.
	 *
	 * @private
	 */
	Resource.prototype.retryOnError = function (error) {
	  const retryCallback = this.retryCallback;
	  if (
	    typeof retryCallback !== "function" ||
	    this._retryCount >= this.retryAttempts
	  ) {
	    return Promise.resolve(false);
	  }

	  const that = this;
	  return Promise.resolve(retryCallback(this, error)).then(function (result) {
	    ++that._retryCount;

	    return result;
	  });
	};

	/**
	 * Duplicates a Resource instance.
	 *
	 * @param {Resource} [result] The object onto which to store the result.
	 *
	 * @returns {Resource} The modified result parameter or a new Resource instance if one was not provided.
	 */
	Resource.prototype.clone = function (result) {
	  if (!defaultValue.defined(result)) {
	    result = new Resource({
	      url: this._url,
	    });
	  }

	  result._url = this._url;
	  result._queryParameters = clone(this._queryParameters);
	  result._templateValues = clone(this._templateValues);
	  result.headers = clone(this.headers);
	  result.proxy = this.proxy;
	  result.retryCallback = this.retryCallback;
	  result.retryAttempts = this.retryAttempts;
	  result._retryCount = 0;
	  result.request = this.request.clone();

	  return result;
	};

	/**
	 * Returns the base path of the Resource.
	 *
	 * @param {Boolean} [includeQuery = false] Whether or not to include the query string and fragment form the uri
	 *
	 * @returns {String} The base URI of the resource
	 */
	Resource.prototype.getBaseUri = function (includeQuery) {
	  return getBaseUri(this.getUrlComponent(includeQuery), includeQuery);
	};

	/**
	 * Appends a forward slash to the URL.
	 */
	Resource.prototype.appendForwardSlash = function () {
	  this._url = appendForwardSlash(this._url);
	};

	/**
	 * Asynchronously loads the resource as raw binary data.  Returns a promise that will resolve to
	 * an ArrayBuffer once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 * @example
	 * // load a single URL asynchronously
	 * resource.fetchArrayBuffer().then(function(arrayBuffer) {
	 *     // use the data
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchArrayBuffer = function () {
	  return this.fetch({
	    responseType: "arraybuffer",
	  });
	};

	/**
	 * Creates a Resource and calls fetchArrayBuffer() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @returns {Promise.<ArrayBuffer>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchArrayBuffer = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchArrayBuffer();
	};

	/**
	 * Asynchronously loads the given resource as a blob.  Returns a promise that will resolve to
	 * a Blob once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 * @example
	 * // load a single URL asynchronously
	 * resource.fetchBlob().then(function(blob) {
	 *     // use the data
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchBlob = function () {
	  return this.fetch({
	    responseType: "blob",
	  });
	};

	/**
	 * Creates a Resource and calls fetchBlob() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @returns {Promise.<Blob>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchBlob = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchBlob();
	};

	/**
	 * Asynchronously loads the given image resource.  Returns a promise that will resolve to
	 * an {@link https://developer.mozilla.org/en-US/docs/Web/API/ImageBitmap|ImageBitmap} if <code>preferImageBitmap</code> is true and the browser supports <code>createImageBitmap</code> or otherwise an
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement|Image} once loaded, or reject if the image failed to load.
	 *
	 * @param {Object} [options] An object with the following properties.
	 * @param {Boolean} [options.preferBlob=false] If true, we will load the image via a blob.
	 * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
	 * @param {Boolean} [options.flipY=false] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
	 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies if the browser supports <code>createImageBitmap</code>.
	 * @returns {Promise.<ImageBitmap|HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * // load a single image asynchronously
	 * resource.fetchImage().then(function(image) {
	 *     // use the loaded image
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * // load several images in parallel
	 * Promise.all([resource1.fetchImage(), resource2.fetchImage()]).then(function(images) {
	 *     // images is an array containing all the loaded images
	 * });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchImage = function (options) {
	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);
	  const preferImageBitmap = defaultValue.defaultValue(options.preferImageBitmap, false);
	  const preferBlob = defaultValue.defaultValue(options.preferBlob, false);
	  const flipY = defaultValue.defaultValue(options.flipY, false);
	  const skipColorSpaceConversion = defaultValue.defaultValue(
	    options.skipColorSpaceConversion,
	    false
	  );

	  checkAndResetRequest(this.request);
	  // We try to load the image normally if
	  // 1. Blobs aren't supported
	  // 2. It's a data URI
	  // 3. It's a blob URI
	  // 4. It doesn't have request headers and we preferBlob is false
	  if (
	    !xhrBlobSupported ||
	    this.isDataUri ||
	    this.isBlobUri ||
	    (!this.hasHeaders && !preferBlob)
	  ) {
	    return fetchImage({
	      resource: this,
	      flipY: flipY,
	      skipColorSpaceConversion: skipColorSpaceConversion,
	      preferImageBitmap: preferImageBitmap,
	    });
	  }

	  const blobPromise = this.fetchBlob();
	  if (!defaultValue.defined(blobPromise)) {
	    return;
	  }

	  let supportsImageBitmap;
	  let useImageBitmap;
	  let generatedBlobResource;
	  let generatedBlob;
	  return Resource.supportsImageBitmapOptions()
	    .then(function (result) {
	      supportsImageBitmap = result;
	      useImageBitmap = supportsImageBitmap && preferImageBitmap;
	      return blobPromise;
	    })
	    .then(function (blob) {
	      if (!defaultValue.defined(blob)) {
	        return;
	      }
	      generatedBlob = blob;
	      if (useImageBitmap) {
	        return Resource.createImageBitmapFromBlob(blob, {
	          flipY: flipY,
	          premultiplyAlpha: false,
	          skipColorSpaceConversion: skipColorSpaceConversion,
	        });
	      }
	      const blobUrl = window.URL.createObjectURL(blob);
	      generatedBlobResource = new Resource({
	        url: blobUrl,
	      });

	      return fetchImage({
	        resource: generatedBlobResource,
	        flipY: flipY,
	        skipColorSpaceConversion: skipColorSpaceConversion,
	        preferImageBitmap: false,
	      });
	    })
	    .then(function (image) {
	      if (!defaultValue.defined(image)) {
	        return;
	      }

	      // The blob object may be needed for use by a TileDiscardPolicy,
	      // so attach it to the image.
	      image.blob = generatedBlob;

	      if (useImageBitmap) {
	        return image;
	      }

	      window.URL.revokeObjectURL(generatedBlobResource.url);
	      return image;
	    })
	    .catch(function (error) {
	      if (defaultValue.defined(generatedBlobResource)) {
	        window.URL.revokeObjectURL(generatedBlobResource.url);
	      }

	      // If the blob load succeeded but the image decode failed, attach the blob
	      // to the error object for use by a TileDiscardPolicy.
	      // In particular, BingMapsImageryProvider uses this to detect the
	      // zero-length response that is returned when a tile is not available.
	      error.blob = generatedBlob;

	      return Promise.reject(error);
	    });
	};

	/**
	 * Fetches an image and returns a promise to it.
	 *
	 * @param {Object} [options] An object with the following properties.
	 * @param {Resource} [options.resource] Resource object that points to an image to fetch.
	 * @param {Boolean} [options.preferImageBitmap] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
	 * @param {Boolean} [options.flipY] If true, image will be vertically flipped during decode. Only applies if the browser supports <code>createImageBitmap</code>.
	 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies if the browser supports <code>createImageBitmap</code>.
	 * @private
	 */
	function fetchImage(options) {
	  const resource = options.resource;
	  const flipY = options.flipY;
	  const skipColorSpaceConversion = options.skipColorSpaceConversion;
	  const preferImageBitmap = options.preferImageBitmap;

	  const request = resource.request;
	  request.url = resource.url;
	  request.requestFunction = function () {
	    let crossOrigin = false;

	    // data URIs can't have crossorigin set.
	    if (!resource.isDataUri && !resource.isBlobUri) {
	      crossOrigin = resource.isCrossOriginUrl;
	    }

	    const deferred = defer();
	    Resource._Implementations.createImage(
	      request,
	      crossOrigin,
	      deferred,
	      flipY,
	      skipColorSpaceConversion,
	      preferImageBitmap
	    );

	    return deferred.promise;
	  };

	  const promise = RequestScheduler.request(request);
	  if (!defaultValue.defined(promise)) {
	    return;
	  }

	  return promise.catch(function (e) {
	    // Don't retry cancelled or otherwise aborted requests
	    if (request.state !== RequestState$1.FAILED) {
	      return Promise.reject(e);
	    }
	    return resource.retryOnError(e).then(function (retry) {
	      if (retry) {
	        // Reset request so it can try again
	        request.state = RequestState$1.UNISSUED;
	        request.deferred = undefined;

	        return fetchImage({
	          resource: resource,
	          flipY: flipY,
	          skipColorSpaceConversion: skipColorSpaceConversion,
	          preferImageBitmap: preferImageBitmap,
	        });
	      }
	      return Promise.reject(e);
	    });
	  });
	}

	/**
	 * Creates a Resource and calls fetchImage() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Boolean} [options.flipY=false] Whether to vertically flip the image during fetch and decode. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {Boolean} [options.preferBlob=false]  If true, we will load the image via a blob.
	 * @param {Boolean} [options.preferImageBitmap=false] If true, image will be decoded during fetch and an <code>ImageBitmap</code> is returned.
	 * @param {Boolean} [options.skipColorSpaceConversion=false] If true, any custom gamma or color profiles in the image will be ignored. Only applies when requesting an image and the browser supports <code>createImageBitmap</code>.
	 * @returns {Promise.<ImageBitmap|HTMLImageElement>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchImage = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchImage({
	    flipY: options.flipY,
	    skipColorSpaceConversion: options.skipColorSpaceConversion,
	    preferBlob: options.preferBlob,
	    preferImageBitmap: options.preferImageBitmap,
	  });
	};

	/**
	 * Asynchronously loads the given resource as text.  Returns a promise that will resolve to
	 * a String once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 * @example
	 * // load text from a URL, setting a custom header
	 * const resource = new Resource({
	 *   url: 'http://someUrl.com/someJson.txt',
	 *   headers: {
	 *     'X-Custom-Header' : 'some value'
	 *   }
	 * });
	 * resource.fetchText().then(function(text) {
	 *     // Do something with the text
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchText = function () {
	  return this.fetch({
	    responseType: "text",
	  });
	};

	/**
	 * Creates a Resource and calls fetchText() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @returns {Promise.<String>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchText = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchText();
	};

	// note: &#42;&#47;&#42; below is */* but that ends the comment block early
	/**
	 * Asynchronously loads the given resource as JSON.  Returns a promise that will resolve to
	 * a JSON object once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. This function
	 * adds 'Accept: application/json,&#42;&#47;&#42;;q=0.01' to the request headers, if not
	 * already specified.
	 *
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.fetchJson().then(function(jsonData) {
	 *     // Do something with the JSON object
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchJson = function () {
	  const promise = this.fetch({
	    responseType: "text",
	    headers: {
	      Accept: "application/json,*/*;q=0.01",
	    },
	  });

	  if (!defaultValue.defined(promise)) {
	    return undefined;
	  }

	  return promise.then(function (value) {
	    if (!defaultValue.defined(value)) {
	      return;
	    }
	    return JSON.parse(value);
	  });
	};

	/**
	 * Creates a Resource and calls fetchJson() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchJson = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchJson();
	};

	/**
	 * Asynchronously loads the given resource as XML.  Returns a promise that will resolve to
	 * an XML Document once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * // load XML from a URL, setting a custom header
	 * Cesium.loadXML('http://someUrl.com/someXML.xml', {
	 *   'X-Custom-Header' : 'some value'
	 * }).then(function(document) {
	 *     // Do something with the document
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest|XMLHttpRequest}
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchXML = function () {
	  return this.fetch({
	    responseType: "document",
	    overrideMimeType: "text/xml",
	  });
	};

	/**
	 * Creates a Resource and calls fetchXML() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @returns {Promise.<XMLDocument>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchXML = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchXML();
	};

	/**
	 * Requests a resource using JSONP.
	 *
	 * @param {String} [callbackParameterName='callback'] The callback parameter name that the server expects.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * // load a data asynchronously
	 * resource.fetchJsonp().then(function(data) {
	 *     // use the loaded data
	 * }).catch(function(error) {
	 *     // an error occurred
	 * });
	 *
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetchJsonp = function (callbackParameterName) {
	  callbackParameterName = defaultValue.defaultValue(callbackParameterName, "callback");

	  checkAndResetRequest(this.request);

	  //generate a unique function name
	  let functionName;
	  do {
	    functionName = `loadJsonp${Math$1.CesiumMath.nextRandomNumber()
      .toString()
      .substring(2, 8)}`;
	  } while (defaultValue.defined(window[functionName]));

	  return fetchJsonp(this, callbackParameterName, functionName);
	};

	function fetchJsonp(resource, callbackParameterName, functionName) {
	  const callbackQuery = {};
	  callbackQuery[callbackParameterName] = functionName;
	  resource.setQueryParameters(callbackQuery);

	  const request = resource.request;
	  request.url = resource.url;
	  request.requestFunction = function () {
	    const deferred = defer();

	    //assign a function with that name in the global scope
	    window[functionName] = function (data) {
	      deferred.resolve(data);

	      try {
	        delete window[functionName];
	      } catch (e) {
	        window[functionName] = undefined;
	      }
	    };

	    Resource._Implementations.loadAndExecuteScript(
	      resource.url,
	      functionName,
	      deferred
	    );
	    return deferred.promise;
	  };

	  const promise = RequestScheduler.request(request);
	  if (!defaultValue.defined(promise)) {
	    return;
	  }

	  return promise.catch(function (e) {
	    if (request.state !== RequestState$1.FAILED) {
	      return Promise.reject(e);
	    }

	    return resource.retryOnError(e).then(function (retry) {
	      if (retry) {
	        // Reset request so it can try again
	        request.state = RequestState$1.UNISSUED;
	        request.deferred = undefined;

	        return fetchJsonp(resource, callbackParameterName, functionName);
	      }

	      return Promise.reject(e);
	    });
	  });
	}

	/**
	 * Creates a Resource from a URL and calls fetchJsonp() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.callbackParameterName='callback'] The callback parameter name that the server expects.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetchJsonp = function (options) {
	  const resource = new Resource(options);
	  return resource.fetchJsonp(options.callbackParameterName);
	};

	/**
	 * @private
	 */
	Resource.prototype._makeRequest = function (options) {
	  const resource = this;
	  checkAndResetRequest(resource.request);

	  const request = resource.request;
	  request.url = resource.url;

	  request.requestFunction = function () {
	    const responseType = options.responseType;
	    const headers = combine.combine(options.headers, resource.headers);
	    const overrideMimeType = options.overrideMimeType;
	    const method = options.method;
	    const data = options.data;
	    const deferred = defer();
	    const xhr = Resource._Implementations.loadWithXhr(
	      resource.url,
	      responseType,
	      method,
	      data,
	      headers,
	      deferred,
	      overrideMimeType
	    );
	    if (defaultValue.defined(xhr) && defaultValue.defined(xhr.abort)) {
	      request.cancelFunction = function () {
	        xhr.abort();
	      };
	    }
	    return deferred.promise;
	  };

	  const promise = RequestScheduler.request(request);
	  if (!defaultValue.defined(promise)) {
	    return;
	  }

	  return promise
	    .then(function (data) {
	      // explicitly set to undefined to ensure GC of request response data. See #8843
	      request.cancelFunction = undefined;
	      return data;
	    })
	    .catch(function (e) {
	      request.cancelFunction = undefined;
	      if (request.state !== RequestState$1.FAILED) {
	        return Promise.reject(e);
	      }

	      return resource.retryOnError(e).then(function (retry) {
	        if (retry) {
	          // Reset request so it can try again
	          request.state = RequestState$1.UNISSUED;
	          request.deferred = undefined;

	          return resource.fetch(options);
	        }

	        return Promise.reject(e);
	      });
	    });
	};

	const dataUriRegex = /^data:(.*?)(;base64)?,(.*)$/;

	function decodeDataUriText(isBase64, data) {
	  const result = decodeURIComponent(data);
	  if (isBase64) {
	    return atob(result);
	  }
	  return result;
	}

	function decodeDataUriArrayBuffer(isBase64, data) {
	  const byteString = decodeDataUriText(isBase64, data);
	  const buffer = new ArrayBuffer(byteString.length);
	  const view = new Uint8Array(buffer);
	  for (let i = 0; i < byteString.length; i++) {
	    view[i] = byteString.charCodeAt(i);
	  }
	  return buffer;
	}

	function decodeDataUri(dataUriRegexResult, responseType) {
	  responseType = defaultValue.defaultValue(responseType, "");
	  const mimeType = dataUriRegexResult[1];
	  const isBase64 = !!dataUriRegexResult[2];
	  const data = dataUriRegexResult[3];
	  let buffer;
	  let parser;

	  switch (responseType) {
	    case "":
	    case "text":
	      return decodeDataUriText(isBase64, data);
	    case "arraybuffer":
	      return decodeDataUriArrayBuffer(isBase64, data);
	    case "blob":
	      buffer = decodeDataUriArrayBuffer(isBase64, data);
	      return new Blob([buffer], {
	        type: mimeType,
	      });
	    case "document":
	      parser = new DOMParser();
	      return parser.parseFromString(
	        decodeDataUriText(isBase64, data),
	        mimeType
	      );
	    case "json":
	      return JSON.parse(decodeDataUriText(isBase64, data));
	    default:
	      //>>includeStart('debug', pragmas.debug);
	      throw new Check.DeveloperError(`Unhandled responseType: ${responseType}`);
	    //>>includeEnd('debug');
	  }
	}

	/**
	 * Asynchronously loads the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled. It's recommended that you use
	 * the more specific functions eg. fetchJson, fetchBlob, etc.
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.fetch()
	 *   .then(function(body) {
	 *       // use the data
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.fetch = function (options) {
	  options = defaultClone(options, {});
	  options.method = "GET";

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls fetch() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.fetch = function (options) {
	  const resource = new Resource(options);
	  return resource.fetch({
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Asynchronously deletes the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.delete()
	 *   .then(function(body) {
	 *       // use the data
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.delete = function (options) {
	  options = defaultClone(options, {});
	  options.method = "DELETE";

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls delete() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.data] Data that is posted with the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.delete = function (options) {
	  const resource = new Resource(options);
	  return resource.delete({
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	    data: options.data,
	  });
	};

	/**
	 * Asynchronously gets headers the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.head()
	 *   .then(function(headers) {
	 *       // use the data
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.head = function (options) {
	  options = defaultClone(options, {});
	  options.method = "HEAD";

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls head() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.head = function (options) {
	  const resource = new Resource(options);
	  return resource.head({
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Asynchronously gets options the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.options()
	 *   .then(function(headers) {
	 *       // use the data
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.options = function (options) {
	  options = defaultClone(options, {});
	  options.method = "OPTIONS";

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls options() on it.
	 *
	 * @param {String|Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.options = function (options) {
	  const resource = new Resource(options);
	  return resource.options({
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Asynchronously posts data to the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} data Data that is posted with the resource.
	 * @param {Object} [options] Object with the following properties:
	 * @param {Object} [options.data] Data that is posted with the resource.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.post(data)
	 *   .then(function(result) {
	 *       // use the result
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.post = function (data, options) {
	  Check.Check.defined("data", data);

	  options = defaultClone(options, {});
	  options.method = "POST";
	  options.data = data;

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls post() on it.
	 *
	 * @param {Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} options.data Data that is posted with the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.post = function (options) {
	  const resource = new Resource(options);
	  return resource.post(options.data, {
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Asynchronously puts data to the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} data Data that is posted with the resource.
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.put(data)
	 *   .then(function(result) {
	 *       // use the result
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.put = function (data, options) {
	  Check.Check.defined("data", data);

	  options = defaultClone(options, {});
	  options.method = "PUT";
	  options.data = data;

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls put() on it.
	 *
	 * @param {Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} options.data Data that is posted with the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.put = function (options) {
	  const resource = new Resource(options);
	  return resource.put(options.data, {
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Asynchronously patches data to the given resource.  Returns a promise that will resolve to
	 * the result once loaded, or reject if the resource failed to load.  The data is loaded
	 * using XMLHttpRequest, which means that in order to make requests to another origin,
	 * the server must have Cross-Origin Resource Sharing (CORS) headers enabled.
	 *
	 * @param {Object} data Data that is posted with the resource.
	 * @param {Object} [options] Object with the following properties:
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {Object} [options.headers] Additional HTTP headers to send with the request, if any.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 *
	 *
	 * @example
	 * resource.patch(data)
	 *   .then(function(result) {
	 *       // use the result
	 *   }).catch(function(error) {
	 *       // an error occurred
	 *   });
	 *
	 * @see {@link http://www.w3.org/TR/cors/|Cross-Origin Resource Sharing}
	 * @see {@link http://wiki.commonjs.org/wiki/Promises/A|CommonJS Promises/A}
	 */
	Resource.prototype.patch = function (data, options) {
	  Check.Check.defined("data", data);

	  options = defaultClone(options, {});
	  options.method = "PATCH";
	  options.data = data;

	  return this._makeRequest(options);
	};

	/**
	 * Creates a Resource from a URL and calls patch() on it.
	 *
	 * @param {Object} options A url or an object with the following properties
	 * @param {String} options.url The url of the resource.
	 * @param {Object} options.data Data that is posted with the resource.
	 * @param {Object} [options.queryParameters] An object containing query parameters that will be sent when retrieving the resource.
	 * @param {Object} [options.templateValues] Key/Value pairs that are used to replace template values (eg. {x}).
	 * @param {Object} [options.headers={}] Additional HTTP headers that will be sent.
	 * @param {Proxy} [options.proxy] A proxy to be used when loading the resource.
	 * @param {Resource.RetryCallback} [options.retryCallback] The Function to call when a request for this resource fails. If it returns true, the request will be retried.
	 * @param {Number} [options.retryAttempts=0] The number of times the retryCallback should be called before giving up.
	 * @param {Request} [options.request] A Request object that will be used. Intended for internal use only.
	 * @param {String} [options.responseType] The type of response.  This controls the type of item returned.
	 * @param {String} [options.overrideMimeType] Overrides the MIME type returned by the server.
	 * @returns {Promise.<*>|undefined} a promise that will resolve to the requested data when loaded. Returns undefined if <code>request.throttle</code> is true and the request does not have high enough priority.
	 */
	Resource.patch = function (options) {
	  const resource = new Resource(options);
	  return resource.patch(options.data, {
	    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
	    responseType: options.responseType,
	    overrideMimeType: options.overrideMimeType,
	  });
	};

	/**
	 * Contains implementations of functions that can be replaced for testing
	 *
	 * @private
	 */
	Resource._Implementations = {};

	Resource._Implementations.loadImageElement = function (
	  url,
	  crossOrigin,
	  deferred
	) {
	  const image = new Image();

	  image.onload = function () {
	    // work-around a known issue with Firefox and dimensionless SVG, see:
	    //   - https://github.com/whatwg/html/issues/3510
	    //   - https://bugzilla.mozilla.org/show_bug.cgi?id=700533
	    if (
	      image.naturalWidth === 0 &&
	      image.naturalHeight === 0 &&
	      image.width === 0 &&
	      image.height === 0
	    ) {
	      // these values affect rasterization and will likely mar the content
	      // until Firefox takes a stance on the issue, marred content is better than no content
	      // Chromium uses a more refined heuristic about its choice given nil viewBox, and a better stance and solution is
	      // proposed later in the original issue thread:
	      //   - Chromium behavior: https://github.com/CesiumGS/cesium/issues/9188#issuecomment-704400825
	      //   - Cesium's stance/solve: https://github.com/CesiumGS/cesium/issues/9188#issuecomment-720645777
	      image.width = 300;
	      image.height = 150;
	    }
	    deferred.resolve(image);
	  };

	  image.onerror = function (e) {
	    deferred.reject(e);
	  };

	  if (crossOrigin) {
	    if (TrustedServers$1.contains(url)) {
	      image.crossOrigin = "use-credentials";
	    } else {
	      image.crossOrigin = "";
	    }
	  }

	  image.src = url;
	};

	Resource._Implementations.createImage = function (
	  request,
	  crossOrigin,
	  deferred,
	  flipY,
	  skipColorSpaceConversion,
	  preferImageBitmap
	) {
	  const url = request.url;
	  // Passing an Image to createImageBitmap will force it to run on the main thread
	  // since DOM elements don't exist on workers. We convert it to a blob so it's non-blocking.
	  // See:
	  //    https://bugzilla.mozilla.org/show_bug.cgi?id=1044102#c38
	  //    https://bugs.chromium.org/p/chromium/issues/detail?id=580202#c10
	  Resource.supportsImageBitmapOptions()
	    .then(function (supportsImageBitmap) {
	      // We can only use ImageBitmap if we can flip on decode.
	      // See: https://github.com/CesiumGS/cesium/pull/7579#issuecomment-466146898
	      if (!(supportsImageBitmap && preferImageBitmap)) {
	        Resource._Implementations.loadImageElement(url, crossOrigin, deferred);
	        return;
	      }
	      const responseType = "blob";
	      const method = "GET";
	      const xhrDeferred = defer();
	      const xhr = Resource._Implementations.loadWithXhr(
	        url,
	        responseType,
	        method,
	        undefined,
	        undefined,
	        xhrDeferred,
	        undefined,
	        undefined,
	        undefined
	      );

	      if (defaultValue.defined(xhr) && defaultValue.defined(xhr.abort)) {
	        request.cancelFunction = function () {
	          xhr.abort();
	        };
	      }
	      return xhrDeferred.promise
	        .then(function (blob) {
	          if (!defaultValue.defined(blob)) {
	            deferred.reject(
	              new RuntimeError.RuntimeError(
	                `Successfully retrieved ${url} but it contained no content.`
	              )
	            );
	            return;
	          }

	          return Resource.createImageBitmapFromBlob(blob, {
	            flipY: flipY,
	            premultiplyAlpha: false,
	            skipColorSpaceConversion: skipColorSpaceConversion,
	          });
	        })
	        .then(function (image) {
	          deferred.resolve(image);
	        });
	    })
	    .catch(function (e) {
	      deferred.reject(e);
	    });
	};

	/**
	 * Wrapper for createImageBitmap
	 *
	 * @private
	 */
	Resource.createImageBitmapFromBlob = function (blob, options) {
	  Check.Check.defined("options", options);
	  Check.Check.typeOf.bool("options.flipY", options.flipY);
	  Check.Check.typeOf.bool("options.premultiplyAlpha", options.premultiplyAlpha);
	  Check.Check.typeOf.bool(
	    "options.skipColorSpaceConversion",
	    options.skipColorSpaceConversion
	  );

	  return createImageBitmap(blob, {
	    imageOrientation: options.flipY ? "flipY" : "none",
	    premultiplyAlpha: options.premultiplyAlpha ? "premultiply" : "none",
	    colorSpaceConversion: options.skipColorSpaceConversion ? "none" : "default",
	  });
	};

	function decodeResponse(loadWithHttpResponse, responseType) {
	  switch (responseType) {
	    case "text":
	      return loadWithHttpResponse.toString("utf8");
	    case "json":
	      return JSON.parse(loadWithHttpResponse.toString("utf8"));
	    default:
	      return new Uint8Array(loadWithHttpResponse).buffer;
	  }
	}

	function loadWithHttpRequest(
	  url,
	  responseType,
	  method,
	  data,
	  headers,
	  deferred,
	  overrideMimeType
	) {
	  // Note: only the 'json' and 'text' responseTypes transforms the loaded buffer
	  let URL;
	  let zlib;
	  Promise.all([new Promise(function (resolve, reject) { require(['url'], function (m) { resolve(/*#__PURE__*/_interopNamespace(m)); }, reject); }), new Promise(function (resolve, reject) { require(['zlib'], function (m) { resolve(/*#__PURE__*/_interopNamespace(m)); }, reject); })])
	    .then(([urlImport, zlibImport]) => {
	      URL = urlImport.parse(url);
	      zlib = zlibImport;

	      return URL.protocol === "https:" ? new Promise(function (resolve, reject) { require(['https'], function (m) { resolve(/*#__PURE__*/_interopNamespace(m)); }, reject); }) : new Promise(function (resolve, reject) { require(['http'], function (m) { resolve(/*#__PURE__*/_interopNamespace(m)); }, reject); });
	    })
	    .then((http) => {
	      const options = {
	        protocol: URL.protocol,
	        hostname: URL.hostname,
	        port: URL.port,
	        path: URL.path,
	        query: URL.query,
	        method: method,
	        headers: headers,
	      };
	      http
	        .request(options)
	        .on("response", function (res) {
	          if (res.statusCode < 200 || res.statusCode >= 300) {
	            deferred.reject(
	              new RequestErrorEvent(res.statusCode, res, res.headers)
	            );
	            return;
	          }

	          const chunkArray = [];
	          res.on("data", function (chunk) {
	            chunkArray.push(chunk);
	          });

	          res.on("end", function () {
	            // eslint-disable-next-line no-undef
	            const result = Buffer.concat(chunkArray);
	            if (res.headers["content-encoding"] === "gzip") {
	              zlib.gunzip(result, function (error, resultUnzipped) {
	                if (error) {
	                  deferred.reject(
	                    new RuntimeError.RuntimeError("Error decompressing response.")
	                  );
	                } else {
	                  deferred.resolve(
	                    decodeResponse(resultUnzipped, responseType)
	                  );
	                }
	              });
	            } else {
	              deferred.resolve(decodeResponse(result, responseType));
	            }
	          });
	        })
	        .on("error", function (e) {
	          deferred.reject(new RequestErrorEvent());
	        })
	        .end();
	    });
	}

	const noXMLHttpRequest = typeof XMLHttpRequest === "undefined";
	Resource._Implementations.loadWithXhr = function (
	  url,
	  responseType,
	  method,
	  data,
	  headers,
	  deferred,
	  overrideMimeType
	) {
	  const dataUriRegexResult = dataUriRegex.exec(url);
	  if (dataUriRegexResult !== null) {
	    deferred.resolve(decodeDataUri(dataUriRegexResult, responseType));
	    return;
	  }

	  if (noXMLHttpRequest) {
	    loadWithHttpRequest(
	      url,
	      responseType,
	      method,
	      data,
	      headers,
	      deferred);
	    return;
	  }

	  const xhr = new XMLHttpRequest();

	  if (TrustedServers$1.contains(url)) {
	    xhr.withCredentials = true;
	  }

	  xhr.open(method, url, true);

	  if (defaultValue.defined(overrideMimeType) && defaultValue.defined(xhr.overrideMimeType)) {
	    xhr.overrideMimeType(overrideMimeType);
	  }

	  if (defaultValue.defined(headers)) {
	    for (const key in headers) {
	      if (headers.hasOwnProperty(key)) {
	        xhr.setRequestHeader(key, headers[key]);
	      }
	    }
	  }

	  if (defaultValue.defined(responseType)) {
	    xhr.responseType = responseType;
	  }

	  // While non-standard, file protocol always returns a status of 0 on success
	  let localFile = false;
	  if (typeof url === "string") {
	    localFile =
	      url.indexOf("file://") === 0 ||
	      (typeof window !== "undefined" && window.location.origin === "file://");
	  }

	  xhr.onload = function () {
	    if (
	      (xhr.status < 200 || xhr.status >= 300) &&
	      !(localFile && xhr.status === 0)
	    ) {
	      deferred.reject(
	        new RequestErrorEvent(
	          xhr.status,
	          xhr.response,
	          xhr.getAllResponseHeaders()
	        )
	      );
	      return;
	    }

	    const response = xhr.response;
	    const browserResponseType = xhr.responseType;

	    if (method === "HEAD" || method === "OPTIONS") {
	      const responseHeaderString = xhr.getAllResponseHeaders();
	      const splitHeaders = responseHeaderString.trim().split(/[\r\n]+/);

	      const responseHeaders = {};
	      splitHeaders.forEach(function (line) {
	        const parts = line.split(": ");
	        const header = parts.shift();
	        responseHeaders[header] = parts.join(": ");
	      });

	      deferred.resolve(responseHeaders);
	      return;
	    }

	    //All modern browsers will go into either the first or second if block or last else block.
	    //Other code paths support older browsers that either do not support the supplied responseType
	    //or do not support the xhr.response property.
	    if (xhr.status === 204) {
	      // accept no content
	      deferred.resolve();
	    } else if (
	      defaultValue.defined(response) &&
	      (!defaultValue.defined(responseType) || browserResponseType === responseType)
	    ) {
	      deferred.resolve(response);
	    } else if (responseType === "json" && typeof response === "string") {
	      try {
	        deferred.resolve(JSON.parse(response));
	      } catch (e) {
	        deferred.reject(e);
	      }
	    } else if (
	      (browserResponseType === "" || browserResponseType === "document") &&
	      defaultValue.defined(xhr.responseXML) &&
	      xhr.responseXML.hasChildNodes()
	    ) {
	      deferred.resolve(xhr.responseXML);
	    } else if (
	      (browserResponseType === "" || browserResponseType === "text") &&
	      defaultValue.defined(xhr.responseText)
	    ) {
	      deferred.resolve(xhr.responseText);
	    } else {
	      deferred.reject(
	        new RuntimeError.RuntimeError("Invalid XMLHttpRequest response type.")
	      );
	    }
	  };

	  xhr.onerror = function (e) {
	    deferred.reject(new RequestErrorEvent());
	  };

	  xhr.send(data);

	  return xhr;
	};

	Resource._Implementations.loadAndExecuteScript = function (
	  url,
	  functionName,
	  deferred
	) {
	  return loadAndExecuteScript(url).catch(function (e) {
	    deferred.reject(e);
	  });
	};

	/**
	 * The default implementations
	 *
	 * @private
	 */
	Resource._DefaultImplementations = {};
	Resource._DefaultImplementations.createImage =
	  Resource._Implementations.createImage;
	Resource._DefaultImplementations.loadWithXhr =
	  Resource._Implementations.loadWithXhr;
	Resource._DefaultImplementations.loadAndExecuteScript =
	  Resource._Implementations.loadAndExecuteScript;

	/**
	 * A resource instance initialized to the current browser location
	 *
	 * @type {Resource}
	 * @constant
	 */
	Resource.DEFAULT = Object.freeze(
	  new Resource({
	    url:
	      typeof document === "undefined"
	        ? ""
	        : document.location.href.split("?")[0],
	  })
	);

	/**
	 * Specifies Earth polar motion coordinates and the difference between UT1 and UTC.
	 * These Earth Orientation Parameters (EOP) are primarily used in the transformation from
	 * the International Celestial Reference Frame (ICRF) to the International Terrestrial
	 * Reference Frame (ITRF).
	 * This object is normally not instantiated directly, use {@link EarthOrientationParameters.fromUrl}.
	 *
	 * @alias EarthOrientationParameters
	 * @constructor
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {Object} [options.data] The actual EOP data.  If neither this
	 *                 parameter nor options.data is specified, all EOP values are assumed
	 *                 to be 0.0.
	 * @param {Boolean} [options.addNewLeapSeconds=true] True if leap seconds that
	 *                  are specified in the EOP data but not in {@link JulianDate.leapSeconds}
	 *                  should be added to {@link JulianDate.leapSeconds}.  False if
	 *                  new leap seconds should be handled correctly in the context
	 *                  of the EOP data but otherwise ignored.
	 *
	 * @private
	 */
	function EarthOrientationParameters(options) {
	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

	  this._dates = undefined;
	  this._samples = undefined;

	  this._dateColumn = -1;
	  this._xPoleWanderRadiansColumn = -1;
	  this._yPoleWanderRadiansColumn = -1;
	  this._ut1MinusUtcSecondsColumn = -1;
	  this._xCelestialPoleOffsetRadiansColumn = -1;
	  this._yCelestialPoleOffsetRadiansColumn = -1;
	  this._taiMinusUtcSecondsColumn = -1;

	  this._columnCount = 0;
	  this._lastIndex = -1;

	  this._addNewLeapSeconds = defaultValue.defaultValue(options.addNewLeapSeconds, true);

	  if (defaultValue.defined(options.data)) {
	    // Use supplied EOP data.
	    onDataReady(this, options.data);
	  } else {
	    // Use all zeros for EOP data.
	    onDataReady(this, {
	      columnNames: [
	        "dateIso8601",
	        "modifiedJulianDateUtc",
	        "xPoleWanderRadians",
	        "yPoleWanderRadians",
	        "ut1MinusUtcSeconds",
	        "lengthOfDayCorrectionSeconds",
	        "xCelestialPoleOffsetRadians",
	        "yCelestialPoleOffsetRadians",
	        "taiMinusUtcSeconds",
	      ],
	      samples: [],
	    });
	  }
	}

	/**
	 *
	 * @param {Resource|String} [url] The URL from which to obtain EOP data.  If neither this
	 *                 parameter nor options.data is specified, all EOP values are assumed
	 *                 to be 0.0.  If options.data is specified, this parameter is
	 *                 ignored.
	 * @param {Object} [options] Object with the following properties:
	 * @param {Boolean} [options.addNewLeapSeconds=true] True if leap seconds that
	 *                  are specified in the EOP data but not in {@link JulianDate.leapSeconds}
	 *                  should be added to {@link JulianDate.leapSeconds}.  False if
	 *                  new leap seconds should be handled correctly in the context
	 *                  of the EOP data but otherwise ignored.
	 *
	 * @example
	 * // An example EOP data file, EOP.json:
	 * {
	 *   "columnNames" : ["dateIso8601","modifiedJulianDateUtc","xPoleWanderRadians","yPoleWanderRadians","ut1MinusUtcSeconds","lengthOfDayCorrectionSeconds","xCelestialPoleOffsetRadians","yCelestialPoleOffsetRadians","taiMinusUtcSeconds"],
	 *   "samples" : [
	 *      "2011-07-01T00:00:00Z",55743.0,2.117957047295119e-7,2.111518721609984e-6,-0.2908948,-2.956e-4,3.393695767766752e-11,3.3452143996557983e-10,34.0,
	 *      "2011-07-02T00:00:00Z",55744.0,2.193297093339541e-7,2.115460256837405e-6,-0.29065,-1.824e-4,-8.241832578862112e-11,5.623838700870617e-10,34.0,
	 *      "2011-07-03T00:00:00Z",55745.0,2.262286080161428e-7,2.1191157519929706e-6,-0.2905572,1.9e-6,-3.490658503988659e-10,6.981317007977318e-10,34.0
	 *   ]
	 * }
	 *
	 * @example
	 * // Loading the EOP data
	 * const eop = await Cesium.EarthOrientationParameters.fromUrl('Data/EOP.json');
	 * Cesium.Transforms.earthOrientationParameters = eop;
	 */
	EarthOrientationParameters.fromUrl = async function (url, options) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.defined("url", url);
	  //>>includeEnd('debug');

	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

	  const resource = Resource.createIfNeeded(url);

	  // Download EOP data.
	  let eopData;
	  try {
	    eopData = await resource.fetchJson();
	  } catch (e) {
	    throw new RuntimeError.RuntimeError(
	      `An error occurred while retrieving the EOP data from the URL ${resource.url}.`
	    );
	  }

	  return new EarthOrientationParameters({
	    addNewLeapSeconds: options.addNewLeapSeconds,
	    data: eopData,
	  });
	};

	/**
	 * A default {@link EarthOrientationParameters} instance that returns zero for all EOP values.
	 */
	EarthOrientationParameters.NONE = Object.freeze({
	  compute: function (date, result) {
	    if (!defaultValue.defined(result)) {
	      result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
	    } else {
	      result.xPoleWander = 0.0;
	      result.yPoleWander = 0.0;
	      result.xPoleOffset = 0.0;
	      result.yPoleOffset = 0.0;
	      result.ut1MinusUtc = 0.0;
	    }
	    return result;
	  },
	});

	/**
	 * Computes the Earth Orientation Parameters (EOP) for a given date by interpolating.
	 * If the EOP data has not yet been download, this method returns undefined.
	 *
	 * @param {JulianDate} date The date for each to evaluate the EOP.
	 * @param {EarthOrientationParametersSample} [result] The instance to which to copy the result.
	 *        If this parameter is undefined, a new instance is created and returned.
	 * @returns {EarthOrientationParametersSample} The EOP evaluated at the given date, or
	 *          undefined if the data necessary to evaluate EOP at the date has not yet been
	 *          downloaded.
	 *
	 * @exception {RuntimeError} The loaded EOP data has an error and cannot be used.
	 *
	 * @see EarthOrientationParameters#fromUrl
	 */
	EarthOrientationParameters.prototype.compute = function (date, result) {
	  // We cannot compute until the samples are available.
	  if (!defaultValue.defined(this._samples)) {
	    return undefined;
	  }

	  if (!defaultValue.defined(result)) {
	    result = new EarthOrientationParametersSample(0.0, 0.0, 0.0, 0.0, 0.0);
	  }

	  if (this._samples.length === 0) {
	    result.xPoleWander = 0.0;
	    result.yPoleWander = 0.0;
	    result.xPoleOffset = 0.0;
	    result.yPoleOffset = 0.0;
	    result.ut1MinusUtc = 0.0;
	    return result;
	  }

	  const dates = this._dates;
	  const lastIndex = this._lastIndex;

	  let before = 0;
	  let after = 0;
	  if (defaultValue.defined(lastIndex)) {
	    const previousIndexDate = dates[lastIndex];
	    const nextIndexDate = dates[lastIndex + 1];
	    const isAfterPrevious = JulianDate.lessThanOrEquals(
	      previousIndexDate,
	      date
	    );
	    const isAfterLastSample = !defaultValue.defined(nextIndexDate);
	    const isBeforeNext =
	      isAfterLastSample || JulianDate.greaterThanOrEquals(nextIndexDate, date);

	    if (isAfterPrevious && isBeforeNext) {
	      before = lastIndex;

	      if (!isAfterLastSample && nextIndexDate.equals(date)) {
	        ++before;
	      }
	      after = before + 1;

	      interpolate(this, dates, this._samples, date, before, after, result);
	      return result;
	    }
	  }

	  let index = binarySearch(dates, date, JulianDate.compare, this._dateColumn);
	  if (index >= 0) {
	    // If the next entry is the same date, use the later entry.  This way, if two entries
	    // describe the same moment, one before a leap second and the other after, then we will use
	    // the post-leap second data.
	    if (index < dates.length - 1 && dates[index + 1].equals(date)) {
	      ++index;
	    }
	    before = index;
	    after = index;
	  } else {
	    after = ~index;
	    before = after - 1;

	    // Use the first entry if the date requested is before the beginning of the data.
	    if (before < 0) {
	      before = 0;
	    }
	  }

	  this._lastIndex = before;

	  interpolate(this, dates, this._samples, date, before, after, result);
	  return result;
	};

	function compareLeapSecondDates(leapSecond, dateToFind) {
	  return JulianDate.compare(leapSecond.julianDate, dateToFind);
	}

	function onDataReady(eop, eopData) {
	  if (!defaultValue.defined(eopData.columnNames)) {
	    throw new RuntimeError.RuntimeError(
	      "Error in loaded EOP data: The columnNames property is required."
	    );
	  }

	  if (!defaultValue.defined(eopData.samples)) {
	    throw new RuntimeError.RuntimeError(
	      "Error in loaded EOP data: The samples property is required."
	    );
	  }

	  const dateColumn = eopData.columnNames.indexOf("modifiedJulianDateUtc");
	  const xPoleWanderRadiansColumn = eopData.columnNames.indexOf(
	    "xPoleWanderRadians"
	  );
	  const yPoleWanderRadiansColumn = eopData.columnNames.indexOf(
	    "yPoleWanderRadians"
	  );
	  const ut1MinusUtcSecondsColumn = eopData.columnNames.indexOf(
	    "ut1MinusUtcSeconds"
	  );
	  const xCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
	    "xCelestialPoleOffsetRadians"
	  );
	  const yCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
	    "yCelestialPoleOffsetRadians"
	  );
	  const taiMinusUtcSecondsColumn = eopData.columnNames.indexOf(
	    "taiMinusUtcSeconds"
	  );

	  if (
	    dateColumn < 0 ||
	    xPoleWanderRadiansColumn < 0 ||
	    yPoleWanderRadiansColumn < 0 ||
	    ut1MinusUtcSecondsColumn < 0 ||
	    xCelestialPoleOffsetRadiansColumn < 0 ||
	    yCelestialPoleOffsetRadiansColumn < 0 ||
	    taiMinusUtcSecondsColumn < 0
	  ) {
	    throw new RuntimeError.RuntimeError(
	      "Error in loaded EOP data: The columnNames property must include modifiedJulianDateUtc, xPoleWanderRadians, yPoleWanderRadians, ut1MinusUtcSeconds, xCelestialPoleOffsetRadians, yCelestialPoleOffsetRadians, and taiMinusUtcSeconds columns"
	    );
	  }

	  const samples = (eop._samples = eopData.samples);
	  const dates = (eop._dates = []);

	  eop._dateColumn = dateColumn;
	  eop._xPoleWanderRadiansColumn = xPoleWanderRadiansColumn;
	  eop._yPoleWanderRadiansColumn = yPoleWanderRadiansColumn;
	  eop._ut1MinusUtcSecondsColumn = ut1MinusUtcSecondsColumn;
	  eop._xCelestialPoleOffsetRadiansColumn = xCelestialPoleOffsetRadiansColumn;
	  eop._yCelestialPoleOffsetRadiansColumn = yCelestialPoleOffsetRadiansColumn;
	  eop._taiMinusUtcSecondsColumn = taiMinusUtcSecondsColumn;

	  eop._columnCount = eopData.columnNames.length;
	  eop._lastIndex = undefined;

	  let lastTaiMinusUtc;

	  const addNewLeapSeconds = eop._addNewLeapSeconds;

	  // Convert the ISO8601 dates to JulianDates.
	  for (let i = 0, len = samples.length; i < len; i += eop._columnCount) {
	    const mjd = samples[i + dateColumn];
	    const taiMinusUtc = samples[i + taiMinusUtcSecondsColumn];
	    const day = mjd + TimeConstants$1.MODIFIED_JULIAN_DATE_DIFFERENCE;
	    const date = new JulianDate(day, taiMinusUtc, TimeStandard$1.TAI);
	    dates.push(date);

	    if (addNewLeapSeconds) {
	      if (taiMinusUtc !== lastTaiMinusUtc && defaultValue.defined(lastTaiMinusUtc)) {
	        // We crossed a leap second boundary, so add the leap second
	        // if it does not already exist.
	        const leapSeconds = JulianDate.leapSeconds;
	        const leapSecondIndex = binarySearch(
	          leapSeconds,
	          date,
	          compareLeapSecondDates
	        );
	        if (leapSecondIndex < 0) {
	          const leapSecond = new LeapSecond(date, taiMinusUtc);
	          leapSeconds.splice(~leapSecondIndex, 0, leapSecond);
	        }
	      }
	      lastTaiMinusUtc = taiMinusUtc;
	    }
	  }
	}

	function fillResultFromIndex(eop, samples, index, columnCount, result) {
	  const start = index * columnCount;
	  result.xPoleWander = samples[start + eop._xPoleWanderRadiansColumn];
	  result.yPoleWander = samples[start + eop._yPoleWanderRadiansColumn];
	  result.xPoleOffset = samples[start + eop._xCelestialPoleOffsetRadiansColumn];
	  result.yPoleOffset = samples[start + eop._yCelestialPoleOffsetRadiansColumn];
	  result.ut1MinusUtc = samples[start + eop._ut1MinusUtcSecondsColumn];
	}

	function linearInterp(dx, y1, y2) {
	  return y1 + dx * (y2 - y1);
	}

	function interpolate(eop, dates, samples, date, before, after, result) {
	  const columnCount = eop._columnCount;

	  // First check the bounds on the EOP data
	  // If we are after the bounds of the data, return zeros.
	  // The 'before' index should never be less than zero.
	  if (after > dates.length - 1) {
	    result.xPoleWander = 0;
	    result.yPoleWander = 0;
	    result.xPoleOffset = 0;
	    result.yPoleOffset = 0;
	    result.ut1MinusUtc = 0;
	    return result;
	  }

	  const beforeDate = dates[before];
	  const afterDate = dates[after];
	  if (beforeDate.equals(afterDate) || date.equals(beforeDate)) {
	    fillResultFromIndex(eop, samples, before, columnCount, result);
	    return result;
	  } else if (date.equals(afterDate)) {
	    fillResultFromIndex(eop, samples, after, columnCount, result);
	    return result;
	  }

	  const factor =
	    JulianDate.secondsDifference(date, beforeDate) /
	    JulianDate.secondsDifference(afterDate, beforeDate);

	  const startBefore = before * columnCount;
	  const startAfter = after * columnCount;

	  // Handle UT1 leap second edge case
	  let beforeUt1MinusUtc = samples[startBefore + eop._ut1MinusUtcSecondsColumn];
	  let afterUt1MinusUtc = samples[startAfter + eop._ut1MinusUtcSecondsColumn];

	  const offsetDifference = afterUt1MinusUtc - beforeUt1MinusUtc;
	  if (offsetDifference > 0.5 || offsetDifference < -0.5) {
	    // The absolute difference between the values is more than 0.5, so we may have
	    // crossed a leap second.  Check if this is the case and, if so, adjust the
	    // afterValue to account for the leap second.  This way, our interpolation will
	    // produce reasonable results.
	    const beforeTaiMinusUtc =
	      samples[startBefore + eop._taiMinusUtcSecondsColumn];
	    const afterTaiMinusUtc =
	      samples[startAfter + eop._taiMinusUtcSecondsColumn];
	    if (beforeTaiMinusUtc !== afterTaiMinusUtc) {
	      if (afterDate.equals(date)) {
	        // If we are at the end of the leap second interval, take the second value
	        // Otherwise, the interpolation below will yield the wrong side of the
	        // discontinuity
	        // At the end of the leap second, we need to start accounting for the jump
	        beforeUt1MinusUtc = afterUt1MinusUtc;
	      } else {
	        // Otherwise, remove the leap second so that the interpolation is correct
	        afterUt1MinusUtc -= afterTaiMinusUtc - beforeTaiMinusUtc;
	      }
	    }
	  }

	  result.xPoleWander = linearInterp(
	    factor,
	    samples[startBefore + eop._xPoleWanderRadiansColumn],
	    samples[startAfter + eop._xPoleWanderRadiansColumn]
	  );
	  result.yPoleWander = linearInterp(
	    factor,
	    samples[startBefore + eop._yPoleWanderRadiansColumn],
	    samples[startAfter + eop._yPoleWanderRadiansColumn]
	  );
	  result.xPoleOffset = linearInterp(
	    factor,
	    samples[startBefore + eop._xCelestialPoleOffsetRadiansColumn],
	    samples[startAfter + eop._xCelestialPoleOffsetRadiansColumn]
	  );
	  result.yPoleOffset = linearInterp(
	    factor,
	    samples[startBefore + eop._yCelestialPoleOffsetRadiansColumn],
	    samples[startAfter + eop._yCelestialPoleOffsetRadiansColumn]
	  );
	  result.ut1MinusUtc = linearInterp(
	    factor,
	    beforeUt1MinusUtc,
	    afterUt1MinusUtc
	  );
	  return result;
	}

	/**
	 * A rotation expressed as a heading, pitch, and roll. Heading is the rotation about the
	 * negative z axis. Pitch is the rotation about the negative y axis. Roll is the rotation about
	 * the positive x axis.
	 * @alias HeadingPitchRoll
	 * @constructor
	 *
	 * @param {Number} [heading=0.0] The heading component in radians.
	 * @param {Number} [pitch=0.0] The pitch component in radians.
	 * @param {Number} [roll=0.0] The roll component in radians.
	 */
	function HeadingPitchRoll(heading, pitch, roll) {
	  /**
	   * Gets or sets the heading.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.heading = defaultValue.defaultValue(heading, 0.0);
	  /**
	   * Gets or sets the pitch.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.pitch = defaultValue.defaultValue(pitch, 0.0);
	  /**
	   * Gets or sets the roll.
	   * @type {Number}
	   * @default 0.0
	   */
	  this.roll = defaultValue.defaultValue(roll, 0.0);
	}

	/**
	 * Computes the heading, pitch and roll from a quaternion (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
	 *
	 * @param {Quaternion} quaternion The quaternion from which to retrieve heading, pitch, and roll, all expressed in radians.
	 * @param {HeadingPitchRoll} [result] The object in which to store the result. If not provided, a new instance is created and returned.
	 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided.
	 */
	HeadingPitchRoll.fromQuaternion = function (quaternion, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(quaternion)) {
	    throw new Check.DeveloperError("quaternion is required");
	  }
	  //>>includeEnd('debug');
	  if (!defaultValue.defined(result)) {
	    result = new HeadingPitchRoll();
	  }
	  const test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
	  const denominatorRoll =
	    1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
	  const numeratorRoll =
	    2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
	  const denominatorHeading =
	    1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
	  const numeratorHeading =
	    2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);
	  result.heading = -Math.atan2(numeratorHeading, denominatorHeading);
	  result.roll = Math.atan2(numeratorRoll, denominatorRoll);
	  result.pitch = -Math$1.CesiumMath.asinClamped(test);
	  return result;
	};

	/**
	 * Returns a new HeadingPitchRoll instance from angles given in degrees.
	 *
	 * @param {Number} heading the heading in degrees
	 * @param {Number} pitch the pitch in degrees
	 * @param {Number} roll the heading in degrees
	 * @param {HeadingPitchRoll} [result] The object in which to store the result. If not provided, a new instance is created and returned.
	 * @returns {HeadingPitchRoll} A new HeadingPitchRoll instance
	 */
	HeadingPitchRoll.fromDegrees = function (heading, pitch, roll, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(heading)) {
	    throw new Check.DeveloperError("heading is required");
	  }
	  if (!defaultValue.defined(pitch)) {
	    throw new Check.DeveloperError("pitch is required");
	  }
	  if (!defaultValue.defined(roll)) {
	    throw new Check.DeveloperError("roll is required");
	  }
	  //>>includeEnd('debug');
	  if (!defaultValue.defined(result)) {
	    result = new HeadingPitchRoll();
	  }
	  result.heading = heading * Math$1.CesiumMath.RADIANS_PER_DEGREE;
	  result.pitch = pitch * Math$1.CesiumMath.RADIANS_PER_DEGREE;
	  result.roll = roll * Math$1.CesiumMath.RADIANS_PER_DEGREE;
	  return result;
	};

	/**
	 * Duplicates a HeadingPitchRoll instance.
	 *
	 * @param {HeadingPitchRoll} headingPitchRoll The HeadingPitchRoll to duplicate.
	 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
	 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided. (Returns undefined if headingPitchRoll is undefined)
	 */
	HeadingPitchRoll.clone = function (headingPitchRoll, result) {
	  if (!defaultValue.defined(headingPitchRoll)) {
	    return undefined;
	  }
	  if (!defaultValue.defined(result)) {
	    return new HeadingPitchRoll(
	      headingPitchRoll.heading,
	      headingPitchRoll.pitch,
	      headingPitchRoll.roll
	    );
	  }
	  result.heading = headingPitchRoll.heading;
	  result.pitch = headingPitchRoll.pitch;
	  result.roll = headingPitchRoll.roll;
	  return result;
	};

	/**
	 * Compares the provided HeadingPitchRolls componentwise and returns
	 * <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {HeadingPitchRoll} [left] The first HeadingPitchRoll.
	 * @param {HeadingPitchRoll} [right] The second HeadingPitchRoll.
	 * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
	 */
	HeadingPitchRoll.equals = function (left, right) {
	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      left.heading === right.heading &&
	      left.pitch === right.pitch &&
	      left.roll === right.roll)
	  );
	};

	/**
	 * Compares the provided HeadingPitchRolls componentwise and returns
	 * <code>true</code> if they pass an absolute or relative tolerance test,
	 * <code>false</code> otherwise.
	 *
	 * @param {HeadingPitchRoll} [left] The first HeadingPitchRoll.
	 * @param {HeadingPitchRoll} [right] The second HeadingPitchRoll.
	 * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
	 * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
	 * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
	 */
	HeadingPitchRoll.equalsEpsilon = function (
	  left,
	  right,
	  relativeEpsilon,
	  absoluteEpsilon
	) {
	  return (
	    left === right ||
	    (defaultValue.defined(left) &&
	      defaultValue.defined(right) &&
	      Math$1.CesiumMath.equalsEpsilon(
	        left.heading,
	        right.heading,
	        relativeEpsilon,
	        absoluteEpsilon
	      ) &&
	      Math$1.CesiumMath.equalsEpsilon(
	        left.pitch,
	        right.pitch,
	        relativeEpsilon,
	        absoluteEpsilon
	      ) &&
	      Math$1.CesiumMath.equalsEpsilon(
	        left.roll,
	        right.roll,
	        relativeEpsilon,
	        absoluteEpsilon
	      ))
	  );
	};

	/**
	 * Duplicates this HeadingPitchRoll instance.
	 *
	 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
	 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if one was not provided.
	 */
	HeadingPitchRoll.prototype.clone = function (result) {
	  return HeadingPitchRoll.clone(this, result);
	};

	/**
	 * Compares this HeadingPitchRoll against the provided HeadingPitchRoll componentwise and returns
	 * <code>true</code> if they are equal, <code>false</code> otherwise.
	 *
	 * @param {HeadingPitchRoll} [right] The right hand side HeadingPitchRoll.
	 * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
	 */
	HeadingPitchRoll.prototype.equals = function (right) {
	  return HeadingPitchRoll.equals(this, right);
	};

	/**
	 * Compares this HeadingPitchRoll against the provided HeadingPitchRoll componentwise and returns
	 * <code>true</code> if they pass an absolute or relative tolerance test,
	 * <code>false</code> otherwise.
	 *
	 * @param {HeadingPitchRoll} [right] The right hand side HeadingPitchRoll.
	 * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
	 * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
	 * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
	 */
	HeadingPitchRoll.prototype.equalsEpsilon = function (
	  right,
	  relativeEpsilon,
	  absoluteEpsilon
	) {
	  return HeadingPitchRoll.equalsEpsilon(
	    this,
	    right,
	    relativeEpsilon,
	    absoluteEpsilon
	  );
	};

	/**
	 * Creates a string representing this HeadingPitchRoll in the format '(heading, pitch, roll)' in radians.
	 *
	 * @returns {String} A string representing the provided HeadingPitchRoll in the format '(heading, pitch, roll)'.
	 */
	HeadingPitchRoll.prototype.toString = function () {
	  return `(${this.heading}, ${this.pitch}, ${this.roll})`;
	};

	/*global CESIUM_BASE_URL,define,require*/

	const cesiumScriptRegex = /((?:.*\/)|^)Cesium\.js(?:\?|\#|$)/;
	function getBaseUrlFromCesiumScript() {
	  const scripts = document.getElementsByTagName("script");
	  for (let i = 0, len = scripts.length; i < len; ++i) {
	    const src = scripts[i].getAttribute("src");
	    const result = cesiumScriptRegex.exec(src);
	    if (result !== null) {
	      return result[1];
	    }
	  }
	  return undefined;
	}

	let a;
	function tryMakeAbsolute(url) {
	  if (typeof document === "undefined") {
	    //Node.js and Web Workers. In both cases, the URL will already be absolute.
	    return url;
	  }

	  if (!defaultValue.defined(a)) {
	    a = document.createElement("a");
	  }
	  a.href = url;

	  // IE only absolutizes href on get, not set
	  // eslint-disable-next-line no-self-assign
	  a.href = a.href;
	  return a.href;
	}

	let baseResource;
	function getCesiumBaseUrl() {
	  if (defaultValue.defined(baseResource)) {
	    return baseResource;
	  }

	  let baseUrlString;
	  if (typeof CESIUM_BASE_URL !== "undefined") {
	    baseUrlString = CESIUM_BASE_URL;
	  } else if (
	    typeof define === "object" &&
	    defaultValue.defined(define.amd) &&
	    !define.amd.toUrlUndefined &&
	    defaultValue.defined(require.toUrl)
	  ) {
	    baseUrlString = getAbsoluteUri(
	      "..",
	      buildModuleUrl("Core/buildModuleUrl.js")
	    );
	  } else {
	    baseUrlString = getBaseUrlFromCesiumScript();
	  }

	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(baseUrlString)) {
	    throw new Check.DeveloperError(
	      "Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL."
	    );
	  }
	  //>>includeEnd('debug');

	  baseResource = new Resource({
	    url: tryMakeAbsolute(baseUrlString),
	  });
	  baseResource.appendForwardSlash();

	  return baseResource;
	}

	function buildModuleUrlFromRequireToUrl(moduleID) {
	  //moduleID will be non-relative, so require it relative to this module, in Core.
	  return tryMakeAbsolute(require.toUrl(`../${moduleID}`));
	}

	function buildModuleUrlFromBaseUrl(moduleID) {
	  const resource = getCesiumBaseUrl().getDerivedResource({
	    url: moduleID,
	  });
	  return resource.url;
	}

	let implementation;

	/**
	 * Given a relative URL under the Cesium base URL, returns an absolute URL.
	 * @function
	 *
	 * @param {String} relativeUrl The relative path.
	 * @returns {String} The absolutely URL representation of the provided path.
	 *
	 * @example
	 * const viewer = new Cesium.Viewer("cesiumContainer", {
	 *   imageryProvider: new Cesium.TileMapServiceImageryProvider({
	 *   url: Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
	 *   }),
	 *   baseLayerPicker: false,
	 * });
	 */
	function buildModuleUrl(relativeUrl) {
	  if (!defaultValue.defined(implementation)) {
	    //select implementation
	    if (
	      typeof define === "object" &&
	      defaultValue.defined(define.amd) &&
	      !define.amd.toUrlUndefined &&
	      defaultValue.defined(require.toUrl)
	    ) {
	      implementation = buildModuleUrlFromRequireToUrl;
	    } else {
	      implementation = buildModuleUrlFromBaseUrl;
	    }
	  }

	  const url = implementation(relativeUrl);
	  return url;
	}

	// exposed for testing
	buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
	buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
	buildModuleUrl._clearBaseResource = function () {
	  baseResource = undefined;
	};

	/**
	 * Sets the base URL for resolving modules.
	 * @param {String} value The new base URL.
	 */
	buildModuleUrl.setBaseUrl = function (value) {
	  baseResource = Resource.DEFAULT.getDerivedResource({
	    url: value,
	  });
	};

	/**
	 * Gets the base URL for resolving modules.
	 *
	 * @function
	 * @returns {String} The configured base URL
	 */
	buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;

	/**
	 * An IAU 2006 XYS value sampled at a particular time.
	 *
	 * @alias Iau2006XysSample
	 * @constructor
	 *
	 * @param {Number} x The X value.
	 * @param {Number} y The Y value.
	 * @param {Number} s The S value.
	 *
	 * @private
	 */
	function Iau2006XysSample(x, y, s) {
	  /**
	   * The X value.
	   * @type {Number}
	   */
	  this.x = x;

	  /**
	   * The Y value.
	   * @type {Number}
	   */
	  this.y = y;

	  /**
	   * The S value.
	   * @type {Number}
	   */
	  this.s = s;
	}

	/**
	 * A set of IAU2006 XYS data that is used to evaluate the transformation between the International
	 * Celestial Reference Frame (ICRF) and the International Terrestrial Reference Frame (ITRF).
	 *
	 * @alias Iau2006XysData
	 * @constructor
	 *
	 * @param {Object} [options] Object with the following properties:
	 * @param {Resource|String} [options.xysFileUrlTemplate='Assets/IAU2006_XYS/IAU2006_XYS_{0}.json'] A template URL for obtaining the XYS data.  In the template,
	 *                 `{0}` will be replaced with the file index.
	 * @param {Number} [options.interpolationOrder=9] The order of interpolation to perform on the XYS data.
	 * @param {Number} [options.sampleZeroJulianEphemerisDate=2442396.5] The Julian ephemeris date (JED) of the
	 *                 first XYS sample.
	 * @param {Number} [options.stepSizeDays=1.0] The step size, in days, between successive XYS samples.
	 * @param {Number} [options.samplesPerXysFile=1000] The number of samples in each XYS file.
	 * @param {Number} [options.totalSamples=27426] The total number of samples in all XYS files.
	 *
	 * @private
	 */
	function Iau2006XysData(options) {
	  options = defaultValue.defaultValue(options, defaultValue.defaultValue.EMPTY_OBJECT);

	  this._xysFileUrlTemplate = Resource.createIfNeeded(
	    options.xysFileUrlTemplate
	  );
	  this._interpolationOrder = defaultValue.defaultValue(options.interpolationOrder, 9);
	  this._sampleZeroJulianEphemerisDate = defaultValue.defaultValue(
	    options.sampleZeroJulianEphemerisDate,
	    2442396.5
	  );
	  this._sampleZeroDateTT = new JulianDate(
	    this._sampleZeroJulianEphemerisDate,
	    0.0,
	    TimeStandard$1.TAI
	  );
	  this._stepSizeDays = defaultValue.defaultValue(options.stepSizeDays, 1.0);
	  this._samplesPerXysFile = defaultValue.defaultValue(options.samplesPerXysFile, 1000);
	  this._totalSamples = defaultValue.defaultValue(options.totalSamples, 27426);
	  this._samples = new Array(this._totalSamples * 3);
	  this._chunkDownloadsInProgress = [];

	  const order = this._interpolationOrder;

	  // Compute denominators and X values for interpolation.
	  const denom = (this._denominators = new Array(order + 1));
	  const xTable = (this._xTable = new Array(order + 1));

	  const stepN = Math.pow(this._stepSizeDays, order);

	  for (let i = 0; i <= order; ++i) {
	    denom[i] = stepN;
	    xTable[i] = i * this._stepSizeDays;

	    for (let j = 0; j <= order; ++j) {
	      if (j !== i) {
	        denom[i] *= i - j;
	      }
	    }

	    denom[i] = 1.0 / denom[i];
	  }

	  // Allocate scratch arrays for interpolation.
	  this._work = new Array(order + 1);
	  this._coef = new Array(order + 1);
	}

	const julianDateScratch = new JulianDate(0, 0.0, TimeStandard$1.TAI);

	function getDaysSinceEpoch(xys, dayTT, secondTT) {
	  const dateTT = julianDateScratch;
	  dateTT.dayNumber = dayTT;
	  dateTT.secondsOfDay = secondTT;
	  return JulianDate.daysDifference(dateTT, xys._sampleZeroDateTT);
	}

	/**
	 * Preloads XYS data for a specified date range.
	 *
	 * @param {Number} startDayTT The Julian day number of the beginning of the interval to preload, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @param {Number} startSecondTT The seconds past noon of the beginning of the interval to preload, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @param {Number} stopDayTT The Julian day number of the end of the interval to preload, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @param {Number} stopSecondTT The seconds past noon of the end of the interval to preload, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @returns {Promise<void>} A promise that, when resolved, indicates that the requested interval has been
	 *                    preloaded.
	 */
	Iau2006XysData.prototype.preload = function (
	  startDayTT,
	  startSecondTT,
	  stopDayTT,
	  stopSecondTT
	) {
	  const startDaysSinceEpoch = getDaysSinceEpoch(
	    this,
	    startDayTT,
	    startSecondTT
	  );
	  const stopDaysSinceEpoch = getDaysSinceEpoch(this, stopDayTT, stopSecondTT);

	  let startIndex =
	    (startDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
	    0;
	  if (startIndex < 0) {
	    startIndex = 0;
	  }

	  let stopIndex =
	    (stopDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2) |
	    (0 + this._interpolationOrder);
	  if (stopIndex >= this._totalSamples) {
	    stopIndex = this._totalSamples - 1;
	  }

	  const startChunk = (startIndex / this._samplesPerXysFile) | 0;
	  const stopChunk = (stopIndex / this._samplesPerXysFile) | 0;

	  const promises = [];
	  for (let i = startChunk; i <= stopChunk; ++i) {
	    promises.push(requestXysChunk(this, i));
	  }

	  return Promise.all(promises);
	};

	/**
	 * Computes the XYS values for a given date by interpolating.  If the required data is not yet downloaded,
	 * this method will return undefined.
	 *
	 * @param {Number} dayTT The Julian day number for which to compute the XYS value, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @param {Number} secondTT The seconds past noon of the date for which to compute the XYS value, expressed in
	 *                 the Terrestrial Time (TT) time standard.
	 * @param {Iau2006XysSample} [result] The instance to which to copy the interpolated result.  If this parameter
	 *                           is undefined, a new instance is allocated and returned.
	 * @returns {Iau2006XysSample} The interpolated XYS values, or undefined if the required data for this
	 *                             computation has not yet been downloaded.
	 *
	 * @see Iau2006XysData#preload
	 */
	Iau2006XysData.prototype.computeXysRadians = function (
	  dayTT,
	  secondTT,
	  result
	) {
	  const daysSinceEpoch = getDaysSinceEpoch(this, dayTT, secondTT);
	  if (daysSinceEpoch < 0.0) {
	    // Can't evaluate prior to the epoch of the data.
	    return undefined;
	  }

	  const centerIndex = (daysSinceEpoch / this._stepSizeDays) | 0;
	  if (centerIndex >= this._totalSamples) {
	    // Can't evaluate after the last sample in the data.
	    return undefined;
	  }

	  const degree = this._interpolationOrder;

	  let firstIndex = centerIndex - ((degree / 2) | 0);
	  if (firstIndex < 0) {
	    firstIndex = 0;
	  }
	  let lastIndex = firstIndex + degree;
	  if (lastIndex >= this._totalSamples) {
	    lastIndex = this._totalSamples - 1;
	    firstIndex = lastIndex - degree;
	    if (firstIndex < 0) {
	      firstIndex = 0;
	    }
	  }

	  // Are all the samples we need present?
	  // We can assume so if the first and last are present
	  let isDataMissing = false;
	  const samples = this._samples;
	  if (!defaultValue.defined(samples[firstIndex * 3])) {
	    requestXysChunk(this, (firstIndex / this._samplesPerXysFile) | 0);
	    isDataMissing = true;
	  }

	  if (!defaultValue.defined(samples[lastIndex * 3])) {
	    requestXysChunk(this, (lastIndex / this._samplesPerXysFile) | 0);
	    isDataMissing = true;
	  }

	  if (isDataMissing) {
	    return undefined;
	  }

	  if (!defaultValue.defined(result)) {
	    result = new Iau2006XysSample(0.0, 0.0, 0.0);
	  } else {
	    result.x = 0.0;
	    result.y = 0.0;
	    result.s = 0.0;
	  }

	  const x = daysSinceEpoch - firstIndex * this._stepSizeDays;

	  const work = this._work;
	  const denom = this._denominators;
	  const coef = this._coef;
	  const xTable = this._xTable;

	  let i, j;
	  for (i = 0; i <= degree; ++i) {
	    work[i] = x - xTable[i];
	  }

	  for (i = 0; i <= degree; ++i) {
	    coef[i] = 1.0;

	    for (j = 0; j <= degree; ++j) {
	      if (j !== i) {
	        coef[i] *= work[j];
	      }
	    }

	    coef[i] *= denom[i];

	    let sampleIndex = (firstIndex + i) * 3;
	    result.x += coef[i] * samples[sampleIndex++];
	    result.y += coef[i] * samples[sampleIndex++];
	    result.s += coef[i] * samples[sampleIndex];
	  }

	  return result;
	};

	function requestXysChunk(xysData, chunkIndex) {
	  if (xysData._chunkDownloadsInProgress[chunkIndex]) {
	    // Chunk has already been requested.
	    return xysData._chunkDownloadsInProgress[chunkIndex];
	  }

	  let chunkUrl;
	  const xysFileUrlTemplate = xysData._xysFileUrlTemplate;
	  if (defaultValue.defined(xysFileUrlTemplate)) {
	    chunkUrl = xysFileUrlTemplate.getDerivedResource({
	      templateValues: {
	        0: chunkIndex,
	      },
	    });
	  } else {
	    chunkUrl = new Resource({
	      url: buildModuleUrl(`Assets/IAU2006_XYS/IAU2006_XYS_${chunkIndex}.json`),
	    });
	  }

	  const promise = chunkUrl.fetchJson().then(function (chunk) {
	    xysData._chunkDownloadsInProgress[chunkIndex] = false;

	    const samples = xysData._samples;
	    const newSamples = chunk.samples;
	    const startIndex = chunkIndex * xysData._samplesPerXysFile * 3;

	    for (let i = 0, len = newSamples.length; i < len; ++i) {
	      samples[startIndex + i] = newSamples[i];
	    }
	  });
	  xysData._chunkDownloadsInProgress[chunkIndex] = promise;

	  return promise;
	}

	/**
	 * Contains functions for transforming positions to various reference frames.
	 *
	 * @namespace Transforms
	 */
	const Transforms = {};

	const vectorProductLocalFrame = {
	  up: {
	    south: "east",
	    north: "west",
	    west: "south",
	    east: "north",
	  },
	  down: {
	    south: "west",
	    north: "east",
	    west: "north",
	    east: "south",
	  },
	  south: {
	    up: "west",
	    down: "east",
	    west: "down",
	    east: "up",
	  },
	  north: {
	    up: "east",
	    down: "west",
	    west: "up",
	    east: "down",
	  },
	  west: {
	    up: "north",
	    down: "south",
	    north: "down",
	    south: "up",
	  },
	  east: {
	    up: "south",
	    down: "north",
	    north: "up",
	    south: "down",
	  },
	};

	const degeneratePositionLocalFrame = {
	  north: [-1, 0, 0],
	  east: [0, 1, 0],
	  up: [0, 0, 1],
	  south: [1, 0, 0],
	  west: [0, -1, 0],
	  down: [0, 0, -1],
	};

	const localFrameToFixedFrameCache = {};

	const scratchCalculateCartesian = {
	  east: new Matrix3.Cartesian3(),
	  north: new Matrix3.Cartesian3(),
	  up: new Matrix3.Cartesian3(),
	  west: new Matrix3.Cartesian3(),
	  south: new Matrix3.Cartesian3(),
	  down: new Matrix3.Cartesian3(),
	};
	let scratchFirstCartesian = new Matrix3.Cartesian3();
	let scratchSecondCartesian = new Matrix3.Cartesian3();
	let scratchThirdCartesian = new Matrix3.Cartesian3();
	/**
	 * Generates a function that computes a 4x4 transformation matrix from a reference frame
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	 * @param  {String} firstAxis  name of the first axis of the local reference frame. Must be
	 *  'east', 'north', 'up', 'west', 'south' or 'down'.
	 * @param  {String} secondAxis  name of the second axis of the local reference frame. Must be
	 *  'east', 'north', 'up', 'west', 'south' or 'down'.
	 * @return {Transforms.LocalFrameToFixedFrame} The function that will computes a
	 * 4x4 transformation matrix from a reference frame, with first axis and second axis compliant with the parameters,
	 */
	Transforms.localFrameToFixedFrameGenerator = function (firstAxis, secondAxis) {
	  if (
	    !vectorProductLocalFrame.hasOwnProperty(firstAxis) ||
	    !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)
	  ) {
	    throw new Check.DeveloperError(
	      "firstAxis and secondAxis must be east, north, up, west, south or down."
	    );
	  }
	  const thirdAxis = vectorProductLocalFrame[firstAxis][secondAxis];

	  /**
	   * Computes a 4x4 transformation matrix from a reference frame
	   * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	   * @callback Transforms.LocalFrameToFixedFrame
	   * @param {Cartesian3} origin The center point of the local reference frame.
	   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	   * @param {Matrix4} [result] The object onto which to store the result.
	   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	   */
	  let resultat;
	  const hashAxis = firstAxis + secondAxis;
	  if (defaultValue.defined(localFrameToFixedFrameCache[hashAxis])) {
	    resultat = localFrameToFixedFrameCache[hashAxis];
	  } else {
	    resultat = function (origin, ellipsoid, result) {
	      //>>includeStart('debug', pragmas.debug);
	      if (!defaultValue.defined(origin)) {
	        throw new Check.DeveloperError("origin is required.");
	      }
	      //>>includeEnd('debug');
	      if (!defaultValue.defined(result)) {
	        result = new Matrix2.Matrix4();
	      }
	      if (
	        Matrix3.Cartesian3.equalsEpsilon(origin, Matrix3.Cartesian3.ZERO, Math$1.CesiumMath.EPSILON14)
	      ) {
	        // If x, y, and z are zero, use the degenerate local frame, which is a special case
	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[firstAxis],
	          0,
	          scratchFirstCartesian
	        );
	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[secondAxis],
	          0,
	          scratchSecondCartesian
	        );
	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[thirdAxis],
	          0,
	          scratchThirdCartesian
	        );
	      } else if (
	        Math$1.CesiumMath.equalsEpsilon(origin.x, 0.0, Math$1.CesiumMath.EPSILON14) &&
	        Math$1.CesiumMath.equalsEpsilon(origin.y, 0.0, Math$1.CesiumMath.EPSILON14)
	      ) {
	        // If x and y are zero, assume origin is at a pole, which is a special case.
	        const sign = Math$1.CesiumMath.sign(origin.z);

	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[firstAxis],
	          0,
	          scratchFirstCartesian
	        );
	        if (firstAxis !== "east" && firstAxis !== "west") {
	          Matrix3.Cartesian3.multiplyByScalar(
	            scratchFirstCartesian,
	            sign,
	            scratchFirstCartesian
	          );
	        }

	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[secondAxis],
	          0,
	          scratchSecondCartesian
	        );
	        if (secondAxis !== "east" && secondAxis !== "west") {
	          Matrix3.Cartesian3.multiplyByScalar(
	            scratchSecondCartesian,
	            sign,
	            scratchSecondCartesian
	          );
	        }

	        Matrix3.Cartesian3.unpack(
	          degeneratePositionLocalFrame[thirdAxis],
	          0,
	          scratchThirdCartesian
	        );
	        if (thirdAxis !== "east" && thirdAxis !== "west") {
	          Matrix3.Cartesian3.multiplyByScalar(
	            scratchThirdCartesian,
	            sign,
	            scratchThirdCartesian
	          );
	        }
	      } else {
	        ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);
	        ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);

	        const up = scratchCalculateCartesian.up;
	        const east = scratchCalculateCartesian.east;
	        east.x = -origin.y;
	        east.y = origin.x;
	        east.z = 0.0;
	        Matrix3.Cartesian3.normalize(east, scratchCalculateCartesian.east);
	        Matrix3.Cartesian3.cross(up, east, scratchCalculateCartesian.north);

	        Matrix3.Cartesian3.multiplyByScalar(
	          scratchCalculateCartesian.up,
	          -1,
	          scratchCalculateCartesian.down
	        );
	        Matrix3.Cartesian3.multiplyByScalar(
	          scratchCalculateCartesian.east,
	          -1,
	          scratchCalculateCartesian.west
	        );
	        Matrix3.Cartesian3.multiplyByScalar(
	          scratchCalculateCartesian.north,
	          -1,
	          scratchCalculateCartesian.south
	        );

	        scratchFirstCartesian = scratchCalculateCartesian[firstAxis];
	        scratchSecondCartesian = scratchCalculateCartesian[secondAxis];
	        scratchThirdCartesian = scratchCalculateCartesian[thirdAxis];
	      }
	      result[0] = scratchFirstCartesian.x;
	      result[1] = scratchFirstCartesian.y;
	      result[2] = scratchFirstCartesian.z;
	      result[3] = 0.0;
	      result[4] = scratchSecondCartesian.x;
	      result[5] = scratchSecondCartesian.y;
	      result[6] = scratchSecondCartesian.z;
	      result[7] = 0.0;
	      result[8] = scratchThirdCartesian.x;
	      result[9] = scratchThirdCartesian.y;
	      result[10] = scratchThirdCartesian.z;
	      result[11] = 0.0;
	      result[12] = origin.x;
	      result[13] = origin.y;
	      result[14] = origin.z;
	      result[15] = 1.0;
	      return result;
	    };
	    localFrameToFixedFrameCache[hashAxis] = resultat;
	  }
	  return resultat;
	};

	/**
	 * Computes a 4x4 transformation matrix from a reference frame with an east-north-up axes
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	 * The local axes are defined as:
	 * <ul>
	 * <li>The <code>x</code> axis points in the local east direction.</li>
	 * <li>The <code>y</code> axis points in the local north direction.</li>
	 * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
	 * </ul>
	 *
	 * @function
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Matrix4} [result] The object onto which to store the result.
	 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	 *
	 * @example
	 * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
	 */
	Transforms.eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
	  "east",
	  "north"
	);

	/**
	 * Computes a 4x4 transformation matrix from a reference frame with an north-east-down axes
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	 * The local axes are defined as:
	 * <ul>
	 * <li>The <code>x</code> axis points in the local north direction.</li>
	 * <li>The <code>y</code> axis points in the local east direction.</li>
	 * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
	 * </ul>
	 *
	 * @function
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Matrix4} [result] The object onto which to store the result.
	 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	 *
	 * @example
	 * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const transform = Cesium.Transforms.northEastDownToFixedFrame(center);
	 */
	Transforms.northEastDownToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
	  "north",
	  "east"
	);

	/**
	 * Computes a 4x4 transformation matrix from a reference frame with an north-up-east axes
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	 * The local axes are defined as:
	 * <ul>
	 * <li>The <code>x</code> axis points in the local north direction.</li>
	 * <li>The <code>y</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
	 * <li>The <code>z</code> axis points in the local east direction.</li>
	 * </ul>
	 *
	 * @function
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Matrix4} [result] The object onto which to store the result.
	 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	 *
	 * @example
	 * // Get the transform from local north-up-east at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const transform = Cesium.Transforms.northUpEastToFixedFrame(center);
	 */
	Transforms.northUpEastToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
	  "north",
	  "up"
	);

	/**
	 * Computes a 4x4 transformation matrix from a reference frame with an north-west-up axes
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame.
	 * The local axes are defined as:
	 * <ul>
	 * <li>The <code>x</code> axis points in the local north direction.</li>
	 * <li>The <code>y</code> axis points in the local west direction.</li>
	 * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
	 * </ul>
	 *
	 * @function
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Matrix4} [result] The object onto which to store the result.
	 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	 *
	 * @example
	 * // Get the transform from local north-West-Up at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const transform = Cesium.Transforms.northWestUpToFixedFrame(center);
	 */
	Transforms.northWestUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
	  "north",
	  "west"
	);

	const scratchHPRQuaternion = new Quaternion();
	const scratchScale = new Matrix3.Cartesian3(1.0, 1.0, 1.0);
	const scratchHPRMatrix4 = new Matrix2.Matrix4();

	/**
	 * Computes a 4x4 transformation matrix from a reference frame with axes computed from the heading-pitch-roll angles
	 * centered at the provided origin to the provided ellipsoid's fixed reference frame. Heading is the rotation from the local north
	 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
	 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
	 *
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
	 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
	 * @param {Matrix4} [result] The object onto which to store the result.
	 * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if none was provided.
	 *
	 * @example
	 * // Get the transform from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const heading = -Cesium.Math.PI_OVER_TWO;
	 * const pitch = Cesium.Math.PI_OVER_FOUR;
	 * const roll = 0.0;
	 * const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
	 * const transform = Cesium.Transforms.headingPitchRollToFixedFrame(center, hpr);
	 */
	Transforms.headingPitchRollToFixedFrame = function (
	  origin,
	  headingPitchRoll,
	  ellipsoid,
	  fixedFrameTransform,
	  result
	) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
	  //>>includeEnd('debug');

	  fixedFrameTransform = defaultValue.defaultValue(
	    fixedFrameTransform,
	    Transforms.eastNorthUpToFixedFrame
	  );
	  const hprQuaternion = Quaternion.fromHeadingPitchRoll(
	    headingPitchRoll,
	    scratchHPRQuaternion
	  );
	  const hprMatrix = Matrix2.Matrix4.fromTranslationQuaternionRotationScale(
	    Matrix3.Cartesian3.ZERO,
	    hprQuaternion,
	    scratchScale,
	    scratchHPRMatrix4
	  );
	  result = fixedFrameTransform(origin, ellipsoid, result);
	  return Matrix2.Matrix4.multiply(result, hprMatrix, result);
	};

	const scratchENUMatrix4 = new Matrix2.Matrix4();
	const scratchHPRMatrix3 = new Matrix3.Matrix3();

	/**
	 * Computes a quaternion from a reference frame with axes computed from the heading-pitch-roll angles
	 * centered at the provided origin. Heading is the rotation from the local north
	 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
	 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
	 *
	 * @param {Cartesian3} origin The center point of the local reference frame.
	 * @param {HeadingPitchRoll} headingPitchRoll The heading, pitch, and roll.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
	 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
	 * @param {Quaternion} [result] The object onto which to store the result.
	 * @returns {Quaternion} The modified result parameter or a new Quaternion instance if none was provided.
	 *
	 * @example
	 * // Get the quaternion from local heading-pitch-roll at cartographic (0.0, 0.0) to Earth's fixed frame.
	 * const center = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const heading = -Cesium.Math.PI_OVER_TWO;
	 * const pitch = Cesium.Math.PI_OVER_FOUR;
	 * const roll = 0.0;
	 * const hpr = new HeadingPitchRoll(heading, pitch, roll);
	 * const quaternion = Cesium.Transforms.headingPitchRollQuaternion(center, hpr);
	 */
	Transforms.headingPitchRollQuaternion = function (
	  origin,
	  headingPitchRoll,
	  ellipsoid,
	  fixedFrameTransform,
	  result
	) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.typeOf.object("HeadingPitchRoll", headingPitchRoll);
	  //>>includeEnd('debug');

	  const transform = Transforms.headingPitchRollToFixedFrame(
	    origin,
	    headingPitchRoll,
	    ellipsoid,
	    fixedFrameTransform,
	    scratchENUMatrix4
	  );
	  const rotation = Matrix2.Matrix4.getMatrix3(transform, scratchHPRMatrix3);
	  return Quaternion.fromRotationMatrix(rotation, result);
	};

	const noScale = new Matrix3.Cartesian3(1.0, 1.0, 1.0);
	const hprCenterScratch = new Matrix3.Cartesian3();
	const ffScratch = new Matrix2.Matrix4();
	const hprTransformScratch = new Matrix2.Matrix4();
	const hprRotationScratch = new Matrix3.Matrix3();
	const hprQuaternionScratch = new Quaternion();
	/**
	 * Computes heading-pitch-roll angles from a transform in a particular reference frame. Heading is the rotation from the local north
	 * direction where a positive angle is increasing eastward. Pitch is the rotation from the local east-north plane. Positive pitch angles
	 * are above the plane. Negative pitch angles are below the plane. Roll is the first rotation applied about the local east axis.
	 *
	 * @param {Matrix4} transform The transform
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Transforms.LocalFrameToFixedFrame} [fixedFrameTransform=Transforms.eastNorthUpToFixedFrame] A 4x4 transformation
	 *  matrix from a reference frame to the provided ellipsoid's fixed reference frame
	 * @param {HeadingPitchRoll} [result] The object onto which to store the result.
	 * @returns {HeadingPitchRoll} The modified result parameter or a new HeadingPitchRoll instance if none was provided.
	 */
	Transforms.fixedFrameToHeadingPitchRoll = function (
	  transform,
	  ellipsoid,
	  fixedFrameTransform,
	  result
	) {
	  //>>includeStart('debug', pragmas.debug);
	  Check.Check.defined("transform", transform);
	  //>>includeEnd('debug');

	  ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);
	  fixedFrameTransform = defaultValue.defaultValue(
	    fixedFrameTransform,
	    Transforms.eastNorthUpToFixedFrame
	  );
	  if (!defaultValue.defined(result)) {
	    result = new HeadingPitchRoll();
	  }

	  const center = Matrix2.Matrix4.getTranslation(transform, hprCenterScratch);
	  if (Matrix3.Cartesian3.equals(center, Matrix3.Cartesian3.ZERO)) {
	    result.heading = 0;
	    result.pitch = 0;
	    result.roll = 0;
	    return result;
	  }
	  let toFixedFrame = Matrix2.Matrix4.inverseTransformation(
	    fixedFrameTransform(center, ellipsoid, ffScratch),
	    ffScratch
	  );
	  let transformCopy = Matrix2.Matrix4.setScale(transform, noScale, hprTransformScratch);
	  transformCopy = Matrix2.Matrix4.setTranslation(
	    transformCopy,
	    Matrix3.Cartesian3.ZERO,
	    transformCopy
	  );

	  toFixedFrame = Matrix2.Matrix4.multiply(toFixedFrame, transformCopy, toFixedFrame);
	  let quaternionRotation = Quaternion.fromRotationMatrix(
	    Matrix2.Matrix4.getMatrix3(toFixedFrame, hprRotationScratch),
	    hprQuaternionScratch
	  );
	  quaternionRotation = Quaternion.normalize(
	    quaternionRotation,
	    quaternionRotation
	  );

	  return HeadingPitchRoll.fromQuaternion(quaternionRotation, result);
	};

	const gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
	const gmstConstant1 = 8640184.812866;
	const gmstConstant2 = 0.093104;
	const gmstConstant3 = -6.2e-6;
	const rateCoef = 1.1772758384668e-19;
	const wgs84WRPrecessing = 7.2921158553e-5;
	const twoPiOverSecondsInDay = Math$1.CesiumMath.TWO_PI / 86400.0;
	let dateInUtc = new JulianDate();

	/**
	 * Computes a rotation matrix to transform a point or vector from True Equator Mean Equinox (TEME) axes to the
	 * pseudo-fixed axes at a given time.  This method treats the UT1 time standard as equivalent to UTC.
	 *
	 * @param {JulianDate} date The time at which to compute the rotation matrix.
	 * @param {Matrix3} [result] The object onto which to store the result.
	 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
	 *
	 * @example
	 * //Set the view to the inertial frame.
	 * scene.postUpdate.addEventListener(function(scene, time) {
	 *    const now = Cesium.JulianDate.now();
	 *    const offset = Cesium.Matrix4.multiplyByPoint(camera.transform, camera.position, new Cesium.Cartesian3());
	 *    const transform = Cesium.Matrix4.fromRotationTranslation(Cesium.Transforms.computeTemeToPseudoFixedMatrix(now));
	 *    const inverseTransform = Cesium.Matrix4.inverseTransformation(transform, new Cesium.Matrix4());
	 *    Cesium.Matrix4.multiplyByPoint(inverseTransform, offset, offset);
	 *    camera.lookAtTransform(transform, offset);
	 * });
	 */
	Transforms.computeTemeToPseudoFixedMatrix = function (date, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(date)) {
	    throw new Check.DeveloperError("date is required.");
	  }
	  //>>includeEnd('debug');

	  // GMST is actually computed using UT1.  We're using UTC as an approximation of UT1.
	  // We do not want to use the function like convertTaiToUtc in JulianDate because
	  // we explicitly do not want to fail when inside the leap second.

	  dateInUtc = JulianDate.addSeconds(
	    date,
	    -JulianDate.computeTaiMinusUtc(date),
	    dateInUtc
	  );
	  const utcDayNumber = dateInUtc.dayNumber;
	  const utcSecondsIntoDay = dateInUtc.secondsOfDay;

	  let t;
	  const diffDays = utcDayNumber - 2451545;
	  if (utcSecondsIntoDay >= 43200.0) {
	    t = (diffDays + 0.5) / TimeConstants$1.DAYS_PER_JULIAN_CENTURY;
	  } else {
	    t = (diffDays - 0.5) / TimeConstants$1.DAYS_PER_JULIAN_CENTURY;
	  }

	  const gmst0 =
	    gmstConstant0 +
	    t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
	  const angle = (gmst0 * twoPiOverSecondsInDay) % Math$1.CesiumMath.TWO_PI;
	  const ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 2451545.5);
	  const secondsSinceMidnight =
	    (utcSecondsIntoDay + TimeConstants$1.SECONDS_PER_DAY * 0.5) %
	    TimeConstants$1.SECONDS_PER_DAY;
	  const gha = angle + ratio * secondsSinceMidnight;
	  const cosGha = Math.cos(gha);
	  const sinGha = Math.sin(gha);

	  if (!defaultValue.defined(result)) {
	    return new Matrix3.Matrix3(
	      cosGha,
	      sinGha,
	      0.0,
	      -sinGha,
	      cosGha,
	      0.0,
	      0.0,
	      0.0,
	      1.0
	    );
	  }
	  result[0] = cosGha;
	  result[1] = -sinGha;
	  result[2] = 0.0;
	  result[3] = sinGha;
	  result[4] = cosGha;
	  result[5] = 0.0;
	  result[6] = 0.0;
	  result[7] = 0.0;
	  result[8] = 1.0;
	  return result;
	};

	/**
	 * The source of IAU 2006 XYS data, used for computing the transformation between the
	 * Fixed and ICRF axes.
	 * @type {Iau2006XysData}
	 *
	 * @see Transforms.computeIcrfToFixedMatrix
	 * @see Transforms.computeFixedToIcrfMatrix
	 *
	 * @private
	 */
	Transforms.iau2006XysData = new Iau2006XysData();

	/**
	 * The source of Earth Orientation Parameters (EOP) data, used for computing the transformation
	 * between the Fixed and ICRF axes.  By default, zero values are used for all EOP values,
	 * yielding a reasonable but not completely accurate representation of the ICRF axes.
	 * @type {EarthOrientationParameters}
	 *
	 * @see Transforms.computeIcrfToFixedMatrix
	 * @see Transforms.computeFixedToIcrfMatrix
	 *
	 * @private
	 */
	Transforms.earthOrientationParameters = EarthOrientationParameters.NONE;

	const ttMinusTai = 32.184;
	const j2000ttDays = 2451545.0;

	/**
	 * Preloads the data necessary to transform between the ICRF and Fixed axes, in either
	 * direction, over a given interval.  This function returns a promise that, when resolved,
	 * indicates that the preload has completed.
	 *
	 * @param {TimeInterval} timeInterval The interval to preload.
	 * @returns {Promise<void>} A promise that, when resolved, indicates that the preload has completed
	 *          and evaluation of the transformation between the fixed and ICRF axes will
	 *          no longer return undefined for a time inside the interval.
	 *
	 *
	 * @example
	 * const interval = new Cesium.TimeInterval(...);
	 * await Cesium.Transforms.preloadIcrfFixed(interval));
	 * // the data is now loaded
	 *
	 * @see Transforms.computeIcrfToFixedMatrix
	 * @see Transforms.computeFixedToIcrfMatrix
	 */
	Transforms.preloadIcrfFixed = function (timeInterval) {
	  const startDayTT = timeInterval.start.dayNumber;
	  const startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
	  const stopDayTT = timeInterval.stop.dayNumber;
	  const stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;

	  return Transforms.iau2006XysData.preload(
	    startDayTT,
	    startSecondTT,
	    stopDayTT,
	    stopSecondTT
	  );
	};

	/**
	 * Computes a rotation matrix to transform a point or vector from the International Celestial
	 * Reference Frame (GCRF/ICRF) inertial frame axes to the Earth-Fixed frame axes (ITRF)
	 * at a given time.  This function may return undefined if the data necessary to
	 * do the transformation is not yet loaded.
	 *
	 * @param {JulianDate} date The time at which to compute the rotation matrix.
	 * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
	 *                  not specified, a new instance is created and returned.
	 * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
	 *                   transformation is not yet loaded.
	 *
	 *
	 * @example
	 * scene.postUpdate.addEventListener(function(scene, time) {
	 *   // View in ICRF.
	 *   const icrfToFixed = Cesium.Transforms.computeIcrfToFixedMatrix(time);
	 *   if (Cesium.defined(icrfToFixed)) {
	 *     const offset = Cesium.Cartesian3.clone(camera.position);
	 *     const transform = Cesium.Matrix4.fromRotationTranslation(icrfToFixed);
	 *     camera.lookAtTransform(transform, offset);
	 *   }
	 * });
	 *
	 * @see Transforms.preloadIcrfFixed
	 */
	Transforms.computeIcrfToFixedMatrix = function (date, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(date)) {
	    throw new Check.DeveloperError("date is required.");
	  }
	  //>>includeEnd('debug');
	  if (!defaultValue.defined(result)) {
	    result = new Matrix3.Matrix3();
	  }

	  const fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
	  if (!defaultValue.defined(fixedToIcrfMtx)) {
	    return undefined;
	  }

	  return Matrix3.Matrix3.transpose(fixedToIcrfMtx, result);
	};

	const xysScratch = new Iau2006XysSample(0.0, 0.0, 0.0);
	const eopScratch = new EarthOrientationParametersSample(
	  0.0,
	  0.0,
	  0.0,
	  0.0,
	  0.0);
	const rotation1Scratch = new Matrix3.Matrix3();
	const rotation2Scratch = new Matrix3.Matrix3();

	/**
	 * Computes a rotation matrix to transform a point or vector from the Earth-Fixed frame axes (ITRF)
	 * to the International Celestial Reference Frame (GCRF/ICRF) inertial frame axes
	 * at a given time.  This function may return undefined if the data necessary to
	 * do the transformation is not yet loaded.
	 *
	 * @param {JulianDate} date The time at which to compute the rotation matrix.
	 * @param {Matrix3} [result] The object onto which to store the result.  If this parameter is
	 *                  not specified, a new instance is created and returned.
	 * @returns {Matrix3} The rotation matrix, or undefined if the data necessary to do the
	 *                   transformation is not yet loaded.
	 *
	 *
	 * @example
	 * // Transform a point from the ICRF axes to the Fixed axes.
	 * const now = Cesium.JulianDate.now();
	 * const pointInFixed = Cesium.Cartesian3.fromDegrees(0.0, 0.0);
	 * const fixedToIcrf = Cesium.Transforms.computeIcrfToFixedMatrix(now);
	 * let pointInInertial = new Cesium.Cartesian3();
	 * if (Cesium.defined(fixedToIcrf)) {
	 *     pointInInertial = Cesium.Matrix3.multiplyByVector(fixedToIcrf, pointInFixed, pointInInertial);
	 * }
	 *
	 * @see Transforms.preloadIcrfFixed
	 */
	Transforms.computeFixedToIcrfMatrix = function (date, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(date)) {
	    throw new Check.DeveloperError("date is required.");
	  }
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new Matrix3.Matrix3();
	  }

	  // Compute pole wander
	  const eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
	  if (!defaultValue.defined(eop)) {
	    return undefined;
	  }

	  // There is no external conversion to Terrestrial Time (TT).
	  // So use International Atomic Time (TAI) and convert using offsets.
	  // Here we are assuming that dayTT and secondTT are positive
	  const dayTT = date.dayNumber;
	  // It's possible here that secondTT could roll over 86400
	  // This does not seem to affect the precision (unit tests check for this)
	  const secondTT = date.secondsOfDay + ttMinusTai;

	  const xys = Transforms.iau2006XysData.computeXysRadians(
	    dayTT,
	    secondTT,
	    xysScratch
	  );
	  if (!defaultValue.defined(xys)) {
	    return undefined;
	  }

	  const x = xys.x + eop.xPoleOffset;
	  const y = xys.y + eop.yPoleOffset;

	  // Compute XYS rotation
	  const a = 1.0 / (1.0 + Math.sqrt(1.0 - x * x - y * y));

	  const rotation1 = rotation1Scratch;
	  rotation1[0] = 1.0 - a * x * x;
	  rotation1[3] = -a * x * y;
	  rotation1[6] = x;
	  rotation1[1] = -a * x * y;
	  rotation1[4] = 1 - a * y * y;
	  rotation1[7] = y;
	  rotation1[2] = -x;
	  rotation1[5] = -y;
	  rotation1[8] = 1 - a * (x * x + y * y);

	  const rotation2 = Matrix3.Matrix3.fromRotationZ(-xys.s, rotation2Scratch);
	  const matrixQ = Matrix3.Matrix3.multiply(rotation1, rotation2, rotation1Scratch);

	  // Similar to TT conversions above
	  // It's possible here that secondTT could roll over 86400
	  // This does not seem to affect the precision (unit tests check for this)
	  const dateUt1day = date.dayNumber;
	  const dateUt1sec =
	    date.secondsOfDay - JulianDate.computeTaiMinusUtc(date) + eop.ut1MinusUtc;

	  // Compute Earth rotation angle
	  // The IERS standard for era is
	  //    era = 0.7790572732640 + 1.00273781191135448 * Tu
	  // where
	  //    Tu = JulianDateInUt1 - 2451545.0
	  // However, you get much more precision if you make the following simplification
	  //    era = a + (1 + b) * (JulianDayNumber + FractionOfDay - 2451545)
	  //    era = a + (JulianDayNumber - 2451545) + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
	  //    era = a + FractionOfDay + b (JulianDayNumber - 2451545 + FractionOfDay)
	  // since (JulianDayNumber - 2451545) represents an integer number of revolutions which will be discarded anyway.
	  const daysSinceJ2000 = dateUt1day - 2451545;
	  const fractionOfDay = dateUt1sec / TimeConstants$1.SECONDS_PER_DAY;
	  let era =
	    0.779057273264 +
	    fractionOfDay +
	    0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
	  era = (era % 1.0) * Math$1.CesiumMath.TWO_PI;

	  const earthRotation = Matrix3.Matrix3.fromRotationZ(era, rotation2Scratch);

	  // pseudoFixed to ICRF
	  const pfToIcrf = Matrix3.Matrix3.multiply(matrixQ, earthRotation, rotation1Scratch);

	  // Compute pole wander matrix
	  const cosxp = Math.cos(eop.xPoleWander);
	  const cosyp = Math.cos(eop.yPoleWander);
	  const sinxp = Math.sin(eop.xPoleWander);
	  const sinyp = Math.sin(eop.yPoleWander);

	  let ttt = dayTT - j2000ttDays + secondTT / TimeConstants$1.SECONDS_PER_DAY;
	  ttt /= 36525.0;

	  // approximate sp value in rad
	  const sp = (-47.0e-6 * ttt * Math$1.CesiumMath.RADIANS_PER_DEGREE) / 3600.0;
	  const cossp = Math.cos(sp);
	  const sinsp = Math.sin(sp);

	  const fToPfMtx = rotation2Scratch;
	  fToPfMtx[0] = cosxp * cossp;
	  fToPfMtx[1] = cosxp * sinsp;
	  fToPfMtx[2] = sinxp;
	  fToPfMtx[3] = -cosyp * sinsp + sinyp * sinxp * cossp;
	  fToPfMtx[4] = cosyp * cossp + sinyp * sinxp * sinsp;
	  fToPfMtx[5] = -sinyp * cosxp;
	  fToPfMtx[6] = -sinyp * sinsp - cosyp * sinxp * cossp;
	  fToPfMtx[7] = sinyp * cossp - cosyp * sinxp * sinsp;
	  fToPfMtx[8] = cosyp * cosxp;

	  return Matrix3.Matrix3.multiply(pfToIcrf, fToPfMtx, result);
	};

	const pointToWindowCoordinatesTemp = new Matrix2.Cartesian4();

	/**
	 * Transform a point from model coordinates to window coordinates.
	 *
	 * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
	 * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
	 * @param {Cartesian3} point The point to transform.
	 * @param {Cartesian2} [result] The object onto which to store the result.
	 * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if none was provided.
	 */
	Transforms.pointToWindowCoordinates = function (
	  modelViewProjectionMatrix,
	  viewportTransformation,
	  point,
	  result
	) {
	  result = Transforms.pointToGLWindowCoordinates(
	    modelViewProjectionMatrix,
	    viewportTransformation,
	    point,
	    result
	  );
	  result.y = 2.0 * viewportTransformation[5] - result.y;
	  return result;
	};

	/**
	 * @private
	 */
	Transforms.pointToGLWindowCoordinates = function (
	  modelViewProjectionMatrix,
	  viewportTransformation,
	  point,
	  result
	) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(modelViewProjectionMatrix)) {
	    throw new Check.DeveloperError("modelViewProjectionMatrix is required.");
	  }

	  if (!defaultValue.defined(viewportTransformation)) {
	    throw new Check.DeveloperError("viewportTransformation is required.");
	  }

	  if (!defaultValue.defined(point)) {
	    throw new Check.DeveloperError("point is required.");
	  }
	  //>>includeEnd('debug');

	  if (!defaultValue.defined(result)) {
	    result = new Matrix2.Cartesian2();
	  }

	  const tmp = pointToWindowCoordinatesTemp;

	  Matrix2.Matrix4.multiplyByVector(
	    modelViewProjectionMatrix,
	    Matrix2.Cartesian4.fromElements(point.x, point.y, point.z, 1, tmp),
	    tmp
	  );
	  Matrix2.Cartesian4.multiplyByScalar(tmp, 1.0 / tmp.w, tmp);
	  Matrix2.Matrix4.multiplyByVector(viewportTransformation, tmp, tmp);
	  return Matrix2.Cartesian2.fromCartesian4(tmp, result);
	};

	const normalScratch = new Matrix3.Cartesian3();
	const rightScratch = new Matrix3.Cartesian3();
	const upScratch = new Matrix3.Cartesian3();

	/**
	 * Transform a position and velocity to a rotation matrix.
	 *
	 * @param {Cartesian3} position The position to transform.
	 * @param {Cartesian3} velocity The velocity vector to transform.
	 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid whose fixed frame is used in the transformation.
	 * @param {Matrix3} [result] The object onto which to store the result.
	 * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if none was provided.
	 */
	Transforms.rotationMatrixFromPositionVelocity = function (
	  position,
	  velocity,
	  ellipsoid,
	  result
	) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(position)) {
	    throw new Check.DeveloperError("position is required.");
	  }

	  if (!defaultValue.defined(velocity)) {
	    throw new Check.DeveloperError("velocity is required.");
	  }
	  //>>includeEnd('debug');

	  const normal = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84).geodeticSurfaceNormal(
	    position,
	    normalScratch
	  );
	  let right = Matrix3.Cartesian3.cross(velocity, normal, rightScratch);

	  if (Matrix3.Cartesian3.equalsEpsilon(right, Matrix3.Cartesian3.ZERO, Math$1.CesiumMath.EPSILON6)) {
	    right = Matrix3.Cartesian3.clone(Matrix3.Cartesian3.UNIT_X, right);
	  }

	  const up = Matrix3.Cartesian3.cross(right, velocity, upScratch);
	  Matrix3.Cartesian3.normalize(up, up);
	  Matrix3.Cartesian3.cross(velocity, up, right);
	  Matrix3.Cartesian3.negate(right, right);
	  Matrix3.Cartesian3.normalize(right, right);

	  if (!defaultValue.defined(result)) {
	    result = new Matrix3.Matrix3();
	  }

	  result[0] = velocity.x;
	  result[1] = velocity.y;
	  result[2] = velocity.z;
	  result[3] = right.x;
	  result[4] = right.y;
	  result[5] = right.z;
	  result[6] = up.x;
	  result[7] = up.y;
	  result[8] = up.z;

	  return result;
	};

	const swizzleMatrix = new Matrix2.Matrix4(
	  0.0,
	  0.0,
	  1.0,
	  0.0,
	  1.0,
	  0.0,
	  0.0,
	  0.0,
	  0.0,
	  1.0,
	  0.0,
	  0.0,
	  0.0,
	  0.0,
	  0.0,
	  1.0
	);

	const scratchCartographic = new Matrix3.Cartographic();
	const scratchCartesian3Projection = new Matrix3.Cartesian3();
	const scratchCenter = new Matrix3.Cartesian3();
	const scratchRotation = new Matrix3.Matrix3();
	const scratchFromENU = new Matrix2.Matrix4();
	const scratchToENU = new Matrix2.Matrix4();

	/**
	 * @private
	 */
	Transforms.basisTo2D = function (projection, matrix, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(projection)) {
	    throw new Check.DeveloperError("projection is required.");
	  }
	  if (!defaultValue.defined(matrix)) {
	    throw new Check.DeveloperError("matrix is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  const rtcCenter = Matrix2.Matrix4.getTranslation(matrix, scratchCenter);
	  const ellipsoid = projection.ellipsoid;

	  // Get the 2D Center
	  const cartographic = ellipsoid.cartesianToCartographic(
	    rtcCenter,
	    scratchCartographic
	  );
	  const projectedPosition = projection.project(
	    cartographic,
	    scratchCartesian3Projection
	  );
	  Matrix3.Cartesian3.fromElements(
	    projectedPosition.z,
	    projectedPosition.x,
	    projectedPosition.y,
	    projectedPosition
	  );

	  // Assuming the instance are positioned in WGS84, invert the WGS84 transform to get the local transform and then convert to 2D
	  const fromENU = Transforms.eastNorthUpToFixedFrame(
	    rtcCenter,
	    ellipsoid,
	    scratchFromENU
	  );
	  const toENU = Matrix2.Matrix4.inverseTransformation(fromENU, scratchToENU);
	  const rotation = Matrix2.Matrix4.getMatrix3(matrix, scratchRotation);
	  const local = Matrix2.Matrix4.multiplyByMatrix3(toENU, rotation, result);
	  Matrix2.Matrix4.multiply(swizzleMatrix, local, result); // Swap x, y, z for 2D
	  Matrix2.Matrix4.setTranslation(result, projectedPosition, result); // Use the projected center

	  return result;
	};

	/**
	 * @private
	 */
	Transforms.wgs84To2DModelMatrix = function (projection, center, result) {
	  //>>includeStart('debug', pragmas.debug);
	  if (!defaultValue.defined(projection)) {
	    throw new Check.DeveloperError("projection is required.");
	  }
	  if (!defaultValue.defined(center)) {
	    throw new Check.DeveloperError("center is required.");
	  }
	  if (!defaultValue.defined(result)) {
	    throw new Check.DeveloperError("result is required.");
	  }
	  //>>includeEnd('debug');

	  const ellipsoid = projection.ellipsoid;

	  const fromENU = Transforms.eastNorthUpToFixedFrame(
	    center,
	    ellipsoid,
	    scratchFromENU
	  );
	  const toENU = Matrix2.Matrix4.inverseTransformation(fromENU, scratchToENU);

	  const cartographic = ellipsoid.cartesianToCartographic(
	    center,
	    scratchCartographic
	  );
	  const projectedPosition = projection.project(
	    cartographic,
	    scratchCartesian3Projection
	  );
	  Matrix3.Cartesian3.fromElements(
	    projectedPosition.z,
	    projectedPosition.x,
	    projectedPosition.y,
	    projectedPosition
	  );

	  const translation = Matrix2.Matrix4.fromTranslation(
	    projectedPosition,
	    scratchFromENU
	  );
	  Matrix2.Matrix4.multiply(swizzleMatrix, toENU, result);
	  Matrix2.Matrix4.multiply(translation, result, result);

	  return result;
	};
	var Transforms$1 = Transforms;

	exports.BoundingSphere = BoundingSphere;
	exports.FeatureDetection = FeatureDetection$1;
	exports.GeographicProjection = GeographicProjection;
	exports.Intersect = Intersect$1;
	exports.Interval = Interval;
	exports.Quaternion = Quaternion;
	exports.Resource = Resource;
	exports.Transforms = Transforms$1;
	exports.buildModuleUrl = buildModuleUrl;

}));
