// @ts-check

/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */

/**
 * @typedef {object} VectorProviderOptions
 * @property {TilingScheme} tilingScheme
 * @property {Ellipsoid} [ellipsoid]
 */

/**
 * TODO(donmccurdy): Placeholder for (later) returning an actual view of
 * vector geometry intersecting a tile.
 *
 * @typedef {object} VectorData
 * @property {number} count
 */

class VectorProvider {
  /** @param {VectorProviderOptions} [options] */
  constructor(options) {
    /** @private */
    this._tilingScheme = options.tilingScheme;
  }

  /** @type {TilingScheme} */
  get tilingScheme() {
    return this._tilingScheme;
  }

  /** @type {Ellipsoid} */
  get ellipsoid() {
    return this._tilingScheme.ellipsoid;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @returns {VectorData}
   */
  getTileData(x, y, level) {
    console.log(`VectorProvider::getTileData::${x}::${y}::${level}`);
    return { count: Math.random() > 0.5 ? 12345 : 0 };
  }
}

export default VectorProvider;
