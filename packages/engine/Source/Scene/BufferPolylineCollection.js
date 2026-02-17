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

  /**
   * @param {BufferPolylineCollection} collection
   * @returns {BufferPolylineCollection}
   * @override
   */
  static _cloneEmpty(collection) {
    return new BufferPolylineCollection({
      primitiveCountMax: collection.primitiveCountMax,
      vertexCountMax: collection.vertexCountMax,
    });
  }

  /**
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

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    super.update(frameState);
  }
}

export default BufferPolylineCollection;
