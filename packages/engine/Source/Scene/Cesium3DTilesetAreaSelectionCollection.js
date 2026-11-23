// @ts-check

/** @import Cesium3DTilesetAreaSelection from "./Cesium3DTilesetAreaSelection.js"; */

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
   */
  add(area) {
    area._collection = this;
    this._areas.push(area);
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
  }
}

export default Cesium3DTilesetAreaSelectionCollection;
