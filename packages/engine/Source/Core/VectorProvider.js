// @ts-check

import BoundingSphere from "./BoundingSphere.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Color from "./Color.js";
import Rectangle from "./Rectangle.js";

/** @import BufferPolygonCollection from "../Scene/BufferPolygonCollection.js"; */
/** @import BufferPolylineCollection from "../Scene/BufferPolylineCollection.js"; */
/** @import BufferPrimitive from "../Scene/BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "../Scene/BufferPrimitiveCollection.js"; */
/** @import Ellipsoid from "./Ellipsoid.js"; */
/** @import TilingScheme from "./TilingScheme.js"; */

// const tileRectangleScratch = new Rectangle();
// const collectionRectangleScratch = new Rectangle();
// const intersectionRectangleScratch = new Rectangle();
// const collectionBoundsScratch = new BoundingSphere();

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
 * @property {Color} color
 */

/**
 * TODO(donmccurdy): How to to ensure we recompute data for each surface tile, when new vector tiles come and go?
 * TODO(donmccurdy): Hit test is missing some tiles, for unknown reasons.
 *
 * @ignore
 */
class VectorProvider {
  /** @param {VectorProviderOptions} [options] */
  constructor(options) {
    /** @private */
    this._tilingScheme = options.tilingScheme;

    /**
     * @type {Set<BufferPrimitiveCollection<BufferPrimitive>>}
     * @private
     */
    this._collections = new Set();
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
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  add(collection) {
    this._collections.add(collection);
  }

  /**
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   */
  remove(collection) {
    this._collections.delete(collection);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} level
   * @returns {VectorData}
   */
  getTileData(x, y, level) {
    const tilingScheme = this._tilingScheme;
    for (const collection of this._collections) {
      const hit = tileIntersectsCollection(
        x,
        y,
        level,
        tilingScheme,
        collection,
      );

      if (hit) {
        return { color: Color.CRIMSON };
      }
    }

    return { color: Color.WHITE };
  }

  update() {
    // TODO
  }
}

export default VectorProvider;

/**
 * @param {number} x
 * @param {number} y
 * @param {number} level
 * @param {TilingScheme} tilingScheme
 * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
 * @returns {boolean}
 */
function tileIntersectsCollection(x, y, level, tilingScheme, collection) {
  // TODO(donmccurdy): use scratch vars.

  const { projection, ellipsoid } = tilingScheme;
  const tileRect = tilingScheme.tileXYToRectangle(x, y, level);

  const collectionBounds = BoundingSphere.projectTo2D(
    collection.boundingVolume,
    projection,
  );

  const collectionRect = Rectangle.fromBoundingSphere(
    collectionBounds,
    ellipsoid,
  );

  const intersectionRect = Rectangle.simpleIntersection(
    tileRect,
    collectionRect,
  );

  if (!intersectionRect) {
    return false;
  }

  const cartesian = new Cartesian3();
  const cartographic = new Cartographic();

  const positionCount = collection._positionCount;
  const positionView = collection._positionView;

  for (let i = 0; i < positionCount; i++) {
    // @ts-expect-error TODO.
    Cartesian3.fromArray(positionView, i * 3, cartesian);
    ellipsoid.cartesianToCartographic(cartesian, cartographic);
    if (Rectangle.contains(tileRect, cartographic)) {
      return true;
    }
  }

  return false;
}
