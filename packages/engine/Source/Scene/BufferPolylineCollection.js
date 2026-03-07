// @ts-check

import defined from "../Core/defined.js";
import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import BufferPolyline from "./BufferPolyline.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js" */

/**
 * @typedef {object} BufferPolylineOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {number} [width=1]
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Collection of polylines held in ArrayBuffer storage for performance and memory optimization.
 *
 * <p>Default buffer memory allocation is arbitrary, and collections cannot be resized,
 * so specific per-buffer capacities should be provided in the collection
 * constructor when available.</p>
 *
 * @example
 * const collection = new BufferPolylineCollection({
 *   primitiveCountMax: 1024,
 *   vertexCountMax: 4096,
 * });
 *
 * const polyline = new BufferPolyline();
 *
 * // Create a new polyline, temporarily bound to 'polyline' local variable.
 * collection.add({
 *   positions: new Float64Array([ ... ]),
 *   color: Color.WHITE,
 * }, polyline);
 *
 * // Iterate over all polylines in collection, temporarily binding 'polyline'
 * // local variable to each, and updating polyline color.
 * for (let i = 0; i < collection.primitiveCount; i++) {
 *   collection.get(i, polyline);
 *   polyline.setColor(Color.RED);
 * }
 *
 * @see BufferPolyline
 * @see BufferPrimitiveCollection
 * @extends BufferPrimitiveCollection<BufferPolyline>
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPolylineCollection extends BufferPrimitiveCollection {
  _getCollectionClass() {
    return BufferPolylineCollection;
  }

  _getPrimitiveClass() {
    return BufferPolyline;
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @param {BufferPolylineCollection} collection
   * @returns {BufferPolylineCollection}
   * @override
   * @ignore
   */
  static _cloneEmpty(collection) {
    return new BufferPolylineCollection({
      primitiveCountMax: collection.primitiveCountMax,
      vertexCountMax: collection.vertexCountMax,
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // PRIMITIVE LIFECYCLE

  /**
   * Adds a new polyline to the collection, with the specified options. A
   * {@link BufferPolyline} instance is linked to the new polyline, using
   * the 'result' argument if given, or a new instance if not. For repeated
   * calls, prefer to reuse a single BufferPolyline instance rather than
   * allocating a new instance on each call.
   *
   * @param {BufferPolylineOptions} options
   * @param {BufferPolyline} result
   * @returns {BufferPolyline}
   * @override
   */
  add(options, result = new BufferPolyline()) {
    super.add(options, result);

    const vertexOffset = this._positionCount;
    result._setUint32(BufferPolyline.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(BufferPolyline.Layout.POSITION_COUNT_U32, 0);

    result.width = options.width ?? 1;

    if (defined(options.positions)) {
      result.setPositions(options.positions);
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    super.update(frameState);
  }
}

export default BufferPolylineCollection;
