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
 * What one area wants for a tile.
 *
 * @private
 */
const AreaDecision = Object.freeze({
  REFINE: 0,
  STOP: 1,
  DEFER: 2,
});

/**
 * A collection of {@link Cesium3DTilesetAreaSelection} instances for a {@link Cesium3DTileset}.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Cesium3DTilesetAreaSelectionCollection {
  /**
   * The decisions returned by classify. Exposed for testing.
   *
   * @ignore
   */
  static AreaDecision = AreaDecision;

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
   * Classifies a tile for one area by comparing the tile's measure to the
   * area's range. A tile coarser than the range refines, a tile at or finer
   * than the fine bound stops, and a tile inside the range is left to the
   * screen space error. NaN and negative measures are invalid and are left to
   * the screen space error, in every pass.
   *
   * @param {Cesium3DTilesetAreaSelection} area The area to classify against.
   * @param {number} m The tile's measure for this area.
   * @param {boolean} isAreaPass Whether this is the area pass, where tiles inside the range refine.
   * @returns {number} An {@link AreaDecision} value.
   * @private
   */
  classify(area, m, isAreaPass) {
    if (Number.isNaN(m) || m < 0.0) {
      return AreaDecision.DEFER;
    }
    if (m > area.maximumMeasure) {
      return AreaDecision.REFINE;
    }
    if (m <= area.effectiveMinimumMeasure) {
      return AreaDecision.STOP;
    }

    return isAreaPass ? AreaDecision.REFINE : AreaDecision.DEFER;
  }

  /**
   * Combines the decisions of the areas in a mask into one decision for a
   * tile. Each area classifies the tile with its own measure. The finer
   * decision wins: any REFINE refines, all STOP stops, and anything else is
   * left to the screen space error. When the mask holds no area of the
   * collection, nothing stops the tile, so it is left to the screen space
   * error too.
   *
   * @param {number} mask The mask of the areas to combine.
   * @param {Cesium3DTile} measuredTile The tile to measure: the tile itself, or its parent.
   * @param {boolean} isAreaPass Whether this is the area pass.
   * @returns {number} An {@link AreaDecision} value.
   * @private
   */
  combine(mask, measuredTile, isAreaPass) {
    let classified = false;
    let allStop = true;
    for (let i = 0; i < this._areas.length; ++i) {
      const bit = 1 << i;
      if ((mask & bit) === 0) {
        continue;
      }
      classified = true;
      const area = this._areas[i];
      const m = area._measure(measuredTile, measuredTile._areaSelectionDepth);
      const decision = this.classify(area, m, isAreaPass);
      if (decision === AreaDecision.REFINE) {
        return AreaDecision.REFINE;
      }
      if (decision !== AreaDecision.STOP) {
        allStop = false;
      }
    }
    return classified && allStop ? AreaDecision.STOP : AreaDecision.DEFER;
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
