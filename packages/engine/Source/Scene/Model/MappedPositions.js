/**
 * TODO_DRAPING Comments
 *
 * Cartographic positions with a bounding rectangle
 */
class MappedPositions {
  constructor(
    cartographicPositions,
    numPositions,
    cartographicBoundingRectangle,
    ellipsoid,
  ) {
    // TODO_DRAPING Defined checks!
    this._cartographicPositions = cartographicPositions;
    this._numPositions = numPositions;
    this._cartographicBoundingRectangle = cartographicBoundingRectangle;
    this._ellipsoid = ellipsoid;
  }

  get ellipsoid() {
    return this._ellipsoid;
  }

  get numPositions() {
    return this._numPositions;
  }

  get cartographicPositions() {
    return this._cartographicPositions;
  }

  get cartographicBoundingRectangle() {
    return this._cartographicBoundingRectangle;
  }
}

export default MappedPositions;
