import Check from "../../Core/Check.js";

/**
 * A collection of cartographic positions (and their bounding rectangle) that
 * have been computed from cartesian positions, for a specific ellipsoid.
 *
 * This is used in the <code>ModelPrimitiveImagery</code> class, and stores
 * the positions of the primitive, mapped to an ellipsoid that was used
 * on one of the imagery layers. This avoids recomputing the transform
 * of the primitive POSITION attribute values into ECEF, and the subsequent
 * conversion of these positions into cartographic positions.
 *
 * @private
 */
class MappedPositions {
  /**
   * Creates a new instance
   *
   * @param {Iterable<Cartographic>} cartographicPositions The positions
   * @param {number} numPositions The number of positions
   * @param {Rectangle} cartographicBoundingRectangle The bounding
   * rectangle of the positions
   * @param {Ellipsoid} ellipsoid The ellipsoid
   */
  constructor(
    cartographicPositions,
    numPositions,
    cartographicBoundingRectangle,
    ellipsoid,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartographicPositions", cartographicPositions);
    Check.typeOf.number.greaterThanOrEquals("numPositions", numPositions, 0);
    Check.defined(
      "cartographicBoundingRectangle",
      cartographicBoundingRectangle,
    );
    Check.defined("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    this._cartographicPositions = cartographicPositions;
    this._numPositions = numPositions;
    this._cartographicBoundingRectangle = cartographicBoundingRectangle;
    this._ellipsoid = ellipsoid;
  }

  /**
   * Returns the cartographic positions
   *
   * @returns {Iterable<Cartographic>} The positions
   */
  get cartographicPositions() {
    return this._cartographicPositions;
  }

  /**
   * Returns the number of positions
   *
   * @returns {number} The number of positions
   */
  get numPositions() {
    return this._numPositions;
  }

  /**
   * Returns the cartographic bounding rectangle
   *
   * @returns {Rectangle} The rectangle
   */
  get cartographicBoundingRectangle() {
    return this._cartographicBoundingRectangle;
  }

  /**
   * Returns the ellipsoid for which these positions have been created
   *
   * @returns {Ellipsoid} The ellipsoid
   */
  get ellipsoid() {
    return this._ellipsoid;
  }
}

export default MappedPositions;
