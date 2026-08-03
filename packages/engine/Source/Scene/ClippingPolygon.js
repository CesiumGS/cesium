import Check from "../Core/Check.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import PolygonGeometry from "../Core/PolygonGeometry.js";
import Rectangle from "../Core/Rectangle.js";

/**
 * A geodesic polygon to be used with {@link ClippingPlaneCollection} for selectively hiding regions in a model, a 3D tileset, or the globe.
 * @alias ClippingPolygon
 * @constructor
 *
 * @param {object} options Object with the following properties:
 * @param {Cartesian3[]} options.positions A list of three or more Cartesian coordinates defining the outer ring of the clipping polygon.
 * @param {Cartesian3[][]} [options.holes] An array of interior rings (holes), each a list of three or more Cartesian coordinates. Regions inside a hole are excluded from the polygon.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.default]
 *
 * @example
 * const positions = Cesium.Cartesian3.fromRadiansArray([
 *     -1.3194369277314022,
 *     0.6988062530900625,
 *     -1.31941,
 *     0.69879,
 *     -1.3193955980204217,
 *     0.6988091578771254,
 *     -1.3193931220959367,
 *     0.698743632490865,
 *     -1.3194358224045408,
 *     0.6987471965556998,
 * ]);
 *
 * const polygon = new Cesium.ClippingPolygon({
 *     positions: positions
 * });
 */
function ClippingPolygon(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options", options);
  Check.typeOf.object("options.positions", options.positions);
  Check.typeOf.number.greaterThanOrEquals(
    "options.positions.length",
    options.positions.length,
    3,
  );
  //>>includeEnd('debug');

  this._ellipsoid = options.ellipsoid ?? Ellipsoid.default;
  this._positions = copyArrayCartesian3(options.positions);
  this._holes = defined(options.holes)
    ? options.holes.map(copyArrayCartesian3)
    : [];

  /**
   * A copy of the input positions.
   *
   * This is used to detect modifications of the positions in
   * <code>coputeRectangle</code>: The rectangle only has
   * to be re-computed when these positions have changed.
   *
   * @type {Cartesian3[]|undefined}
   * @private
   */
  this._cachedPositions = undefined;

  /**
   * A cached version of the rectangle that is computed in
   * <code>computeRectangle</code>.
   *
   * This is only re-computed when the positions have changed, as
   * determined  by comparing the <code>_positions</code> to the
   * <code>_cachedPositions</code>
   *
   * @type {Rectangle|undefined}
   * @private
   */
  this._cachedRectangle = undefined;
}

/**
 * Returns a deep copy of the given array.
 *
 * If the input is undefined, then <code>undefined</code> is returned.
 *
 * Otherwise, the result will be a copy of the given array, where
 * each element is copied with <code>Cartesian3.clone</code>.
 *
 * @param {Cartesian3[]|undefined} input The input array
 * @returns {Cartesian3[]|undefined} The copy
 * @ignore
 */
function copyArrayCartesian3(input) {
  if (!defined(input)) {
    return undefined;
  }
  const n = input.length;
  const output = Array(n);
  for (let i = 0; i < n; i++) {
    output[i] = Cartesian3.clone(input[i]);
  }
  return output;
}

/**
 * Returns whether the given arrays are component-wise equal.
 *
 * When both arrays are undefined, then <code>true</code> is returned.
 * When only one array is defined, or they are both defined but have
 * different lengths, then <code>false</code> is returned.
 *
 * Otherwise, returns whether the corresponding elements of the arrays
 * are equal, as of <code>Cartesian3.equals</code>.
 *
 * @param {Cartesian3[]|undefined} a The first array
 * @param {Cartesian3[]|undefined} b The second array
 * @returns {boolean} Whether the arrays are equal
 * @ignore
 */
function equalsArrayCartesian3(a, b) {
  if (!defined(a) && !defined(b)) {
    return true;
  }
  if (defined(a) !== defined(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const ca = a[i];
    const cb = b[i];
    if (!Cartesian3.equals(ca, cb)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns whether two arrays of rings are component-wise equal.
 *
 * @param {Cartesian3[][]} a The first array of rings
 * @param {Cartesian3[][]} b The second array of rings
 * @returns {boolean} Whether the ring arrays are equal
 * @ignore
 */
function equalsHoles(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!equalsArrayCartesian3(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

Object.defineProperties(ClippingPolygon.prototype, {
  /**
   * Returns the total number of positions in the polygon, include any holes.
   *
   * @memberof ClippingPolygon.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      let count = this._positions.length;
      const holes = this._holes;
      for (let i = 0; i < holes.length; i++) {
        count += holes[i].length;
      }
      return count;
    },
  },
  /**
   * Returns the outer ring of positions.
   *
   * @memberof ClippingPolygon.prototype
   * @type {Cartesian3[]}
   * @readonly
   */
  positions: {
    get: function () {
      return this._positions;
    },
  },
  /**
   * Returns the interior rings (holes) of the polygon, each a list of positions.
   *
   * @memberof ClippingPolygon.prototype
   * @type {Cartesian3[][]}
   * @readonly
   */
  holes: {
    get: function () {
      return this._holes;
    },
  },
  /**
   * Returns the ellipsoid used to project the polygon onto surfaces when clipping.
   *
   * @memberof ClippingPolygon.prototype
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
 * Clones the ClippingPolygon without setting its ownership.
 * @param {ClippingPolygon} polygon The ClippingPolygon to be cloned
 * @param {ClippingPolygon} [result] The object on which to store the cloned parameters.
 * @returns {ClippingPolygon} a clone of the input ClippingPolygon
 */
ClippingPolygon.clone = function (polygon, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("polygon", polygon);
  //>>includeEnd('debug');

  if (!defined(result)) {
    return new ClippingPolygon({
      positions: polygon.positions,
      holes: polygon.holes,
      ellipsoid: polygon.ellipsoid,
    });
  }

  result._ellipsoid = polygon.ellipsoid;
  result._positions.length = 0;
  result._positions.push(...polygon.positions);
  result._holes = polygon.holes.map(copyArrayCartesian3);
  return result;
};

/**
 * Compares the provided ClippingPolygons and returns
 * <code>true</code> if they are equal, <code>false</code> otherwise.
 *
 * @param {ClippingPolygon} left The first polygon.
 * @param {ClippingPolygon} right The second polygon.
 * @returns {boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
 */
ClippingPolygon.equals = function (left, right) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("left", left);
  Check.typeOf.object("right", right);
  //>>includeEnd('debug');

  return (
    left.ellipsoid.equals(right.ellipsoid) &&
    left.positions === right.positions &&
    equalsHoles(left.holes, right.holes)
  );
};

/**
 * Computes a cartographic rectangle which encloses the polygon defined by the list of positions, including cases over the international date line and the poles.
 *
 * @param {Rectangle} [result] An object in which to store the result.
 * @returns {Rectangle} The result rectangle
 */
ClippingPolygon.prototype.computeRectangle = function (result) {
  if (equalsArrayCartesian3(this._positions, this._cachedPositions)) {
    return Rectangle.clone(this._cachedRectangle, result);
  }
  const rectangle = PolygonGeometry.computeRectangleFromPositions(
    this.positions,
    this.ellipsoid,
    undefined,
    result,
  );
  this._cachedPositions = copyArrayCartesian3(this._positions);
  this._cachedRectangle = Rectangle.clone(rectangle);
  return rectangle;
};

export default ClippingPolygon;
