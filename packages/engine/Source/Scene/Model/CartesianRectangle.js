/**
 * Internal class for texture coordinate and index range computations.
 *
 * @private
 */
class CartesianRectangle {
  /**
   * Creates a new instance
   *
   * @param {number} [minX=0] The minimum x-coordinate
   * @param {number} [minY=0] The minimum y-coordinate
   * @param {number} [maxX=0] The maximum x-coordinate
   * @param {number} [maxY=0] The maximum y-coordinate
   */
  constructor(minX, minY, maxX, maxY) {
    this._minX = minX ?? 0.0;
    this._minY = minY ?? 0.0;
    this._maxX = maxX ?? 0.0;
    this._maxY = maxY ?? 0.0;
  }

  /**
   * Returns the minimum x-coordinate
   *
   * @returns {number} The coordinate
   */
  get minX() {
    return this._minX;
  }
  set minX(value) {
    this._minX = value;
  }

  /**
   * Returns the minimum y-coordinate
   *
   * @returns {number} The coordinate
   */
  get minY() {
    return this._minY;
  }
  set minY(value) {
    this._minY = value;
  }

  /**
   * Returns the maximum x-coordinate
   *
   * @returns {number} The coordinate
   */
  get maxX() {
    return this._maxX;
  }
  set maxX(value) {
    this._maxX = value;
  }

  /**
   * Returns the maximum y-coordinate
   *
   * @returns {number} The coordinate
   */
  get maxY() {
    return this._maxY;
  }
  set maxY(value) {
    this._maxY = value;
  }

  /**
   * Returns whether this rectangle contains the given coordinates,
   * using the default containment check, which includes the
   * minimum point, but excludes the maximum point
   *
   * @param {number} x The x-coordinate
   * @param {number} y The y-coordinate
   * @returns {boolean} The result
   */
  contains(x, y) {
    return x >= this.minX && x < this.maxX && y >= this.minY && y < this.maxY;
  }

  /**
   * Returns whether this rectangle contains the given coordinates,
   * excluding the border
   *
   * @param {number} x The x-coordinate
   * @param {number} y The y-coordinate
   * @returns {boolean} The result
   */
  containsExclusive(x, y) {
    return x > this.minX && x < this.maxX && y > this.minY && y < this.maxY;
  }

  /**
   * Returns whether this rectangle contains the given coordinates,
   * including the border
   *
   * @param {number} x The x-coordinate
   * @param {number} y The y-coordinate
   * @returns {boolean} The result
   */
  containsInclusive(x, y) {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }
}

export default CartesianRectangle;
