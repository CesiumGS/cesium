/**
 * A structure containing information about a piece of imagery.
 *
 * This represents the result of computing the imagery tiles that
 * are covered by a given <code>Rectangle</code> (and which part
 * of that imagery is covered, in terms of texture coordinates).
 *
 * It is used by the <code>ModelPrimitiveImagery</code>, to
 * represent the imagery tiles that are covered by the cartographic
 * bounding rectangle of the primitive positions.
 *
 * TODO_DRAPING: Implementation note for ImageryCoverage:
 * This roughly corresponds to the <code>TileImagery</code> that is
 * created in my favorite draping-related time sink, namely in
 * <code>ImageryLayer._createTileImagerySkeletons</code>.
 * But in contrast to the <code>TileImagery</code>, this describes
 * <i>which</i> imagery tile is used, does not store the ("loading"
 * and "ready"...) imagery <i>itself</i>.
 */
class ImageryCoverage {
  /**
   * Creates a new instance
   *
   * @param {number} x x-coordinate of the imagery tile
   * @param {number} y y-coordinate of the imagery tile
   * @param {number} level level of the imagery tile
   * @param {Cartesian4} textureCoordinateRectangle The texture coordinate
   * rectangle from the imagery tile that is covered, i.e. the
   * (minU, minV, maxU, maxV) coordinate range.
   */
  constructor(x, y, level, textureCoordinateRectangle) {
    /**
     * The x-coordinate of the imagery tile, typically correlated with longitude
     *
     * @type {number}
     * @readonly
     */
    this.x = x;

    /**
     * The y-coordinate of the imagery tile, typically correlated with latitude
     *
     * @type {number}
     * @readonly
     */
    this.y = y;

    /**
     * The level of the imagery tile
     *
     * @type {number}
     * @readonly
     */
    this.level = level;

    /**
     * The texture coordinate range that is covered from the
     * imagery tile.
     *
     * This is a <code>Cartesian4</code> that contains the
     * (minU, minV, maxU, maxV) coordinate range.
     *
     * @type {Cartesian4}
     * @readonly
     */
    this.textureCoordinateRectangle = textureCoordinateRectangle;
  }
}

export default ImageryCoverage;
