// @ts-check

import { DeveloperError, Intersect, defined } from "@cesium/core";
/** @import Cesium3DTilesetAreaSelection from "./Cesium3DTilesetAreaSelection.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */

/**
 * The maximum number of areas, because each area takes one bit of a 32-bit
 * signed integer mask.
 *
 * @private
 */
const MAXIMUM_AREAS = 31;

/**
 * A collection of {@link Cesium3DTilesetAreaSelection} instances for a {@link Cesium3DTileset}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Cesium3DTilesetAreaSelectionCollection {
  constructor() {
    /** @type {Cesium3DTilesetAreaSelection[]} */
    this._areas = [];
    this._relaxation = 1.0;
    this._version = 0;
    this._activeMask = 0;
  }

  /**
   * The number of areas in the collection.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._areas.length;
  }

  /**
   * Returns the area at the given index.
   *
   * @param {number} index The zero-based index of the area.
   * @returns {Cesium3DTilesetAreaSelection} The area at the index.
   */
  get(index) {
    return this._areas[index];
  }

  /**
   * Returns whether the collection contains the given area.
   *
   * @param {Cesium3DTilesetAreaSelection} area The area to check.
   * @returns {boolean} Whether the collection contains the area.
   */
  contains(area) {
    return this._areas.includes(area);
  }

  /**
   * Adds an area to the collection.
   *
   * @param {Cesium3DTilesetAreaSelection} area The area to add.
   * @returns {Cesium3DTilesetAreaSelection} The added area.
   * @exception {DeveloperError} area is required.
   * @exception {DeveloperError} area is already in a collection.
   * @exception {DeveloperError} A collection can hold at most 31 areas.
   */
  add(area) {
    if (!defined(area)) {
      throw new DeveloperError("area is required.");
    }
    if (defined(area._collection)) {
      throw new DeveloperError("area is already in a collection.");
    }
    if (this._areas.length >= MAXIMUM_AREAS) {
      throw new DeveloperError(
        `A collection can hold at most ${MAXIMUM_AREAS} areas.`,
      );
    }

    area._collection = this;
    this._areas.push(area);
    this._markDirty();
    return area;
  }

  /**
   * Removes an area from the collection.
   *
   * @param {Cesium3DTilesetAreaSelection} area The area to remove.
   * @returns {boolean} Whether the area was removed.
   */
  remove(area) {
    const index = this._areas.indexOf(area);
    if (index === -1) {
      return false;
    }
    this._areas.splice(index, 1);
    area._collection = undefined;
    this._markDirty();
    return true;
  }

  /**
   * Removes all areas from the collection.
   */
  removeAll() {
    for (const area of this._areas) {
      area._collection = undefined;
    }
    this._areas.length = 0;
    this._markDirty();
  }

  /**
   * Computes which areas a tile overlaps. Only the areas whose bits are set in
   * the parent mask are tested, since a tile lies inside its parent.
   *
   * @param {Cesium3DTile} tile The tile to test.
   * @param {number} parentMask The mask of the tile's parent, or the collection's active mask for the root tile.
   * @returns {number} The parent mask with the bits of the areas the tile is outside of cleared.
   * @private
   */
  computeMask(tile, parentMask) {
    let mask = parentMask;
    for (let i = 0; i < this._areas.length; ++i) {
      const bit = 1 << i;
      if ((mask & bit) !== 0) {
        const visibility = this._areas[i]._cullingVolume.computeVisibility(
          tile._boundingVolume,
        );
        if (visibility === Intersect.OUTSIDE) {
          mask &= ~bit;
        }
      }
    }
    return mask;
  }

  /**
   * Increments the version and recomputes the mask of shown areas. Called
   * whenever an area is added, removed, or changes.
   *
   * @private
   */
  _markDirty() {
    this._version++;

    let mask = 0;
    for (let i = 0; i < this._areas.length; ++i) {
      if (this._areas[i].show) {
        mask |= 1 << i;
      }
    }
    this._activeMask = mask;
  }
}

export default Cesium3DTilesetAreaSelectionCollection;
