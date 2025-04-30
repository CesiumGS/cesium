// TODO_DRAPING Preliminary, internal class for texture
// coordinate and index range computations. This could
// be emulated with a "BoundingRectangle", but min/max
// is often more convenient than min/size, and the
// "BoundingRectangle" does not offer containment checks
class CartesianRectangle {
  constructor(minX, minY, maxX, maxY) {
    this._minX = minX ?? 0.0;
    this._minY = minY ?? 0.0;
    this._maxX = maxX ?? 0.0;
    this._maxY = maxY ?? 0.0;
  }

  get minX() {
    return this._minX;
  }
  set minX(value) {
    this._minX = value;
  }

  get minY() {
    return this._minY;
  }
  set minY(value) {
    this._minY = value;
  }

  get maxX() {
    return this._maxX;
  }
  set maxX(value) {
    this._maxX = value;
  }

  get maxY() {
    return this._maxY;
  }
  set maxY(value) {
    this._maxY = value;
  }

  containsExclusive(x, y) {
    return x > this.minX && x < this.maxX && y > this.minY && y < this.maxY;
  }
  containsInclusive(x, y) {
    return x >= this.minX && x <= this.maxX && y >= this.minY && y <= this.maxY;
  }
}

export default CartesianRectangle;
