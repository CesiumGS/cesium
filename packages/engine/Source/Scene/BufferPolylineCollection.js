// @ts-check

import defined from "../Core/defined.js";
import BufferFeatureCollection from "./BufferFeatureCollection.js";
import BufferPolyline from "./BufferPolyline.js";
import renderPolylines from "./renderBufferPolylineCollection.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js" */

/**
 * @typedef {object} BufferPolylineOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {number} [width=1]
 * @experimental
 */

/**
 * @extends BufferFeatureCollection<BufferPolyline>
 * @experimental
 */
class BufferPolylineCollection extends BufferFeatureCollection {
  /** @type {Record<string, unknown>} */
  _renderContext = null;

  _getFeatureClass() {
    return BufferPolyline;
  }

  _getFeatureLayout() {
    return BufferPolyline.Layout;
  }

  /**
   * @param {BufferPolylineCollection} collection
   * @returns {BufferPolylineCollection}
   * @override
   */
  static _cloneEmpty(collection) {
    return new BufferPolylineCollection({
      maxFeatureCount: collection.featureCountMax,
      maxVertexCount: collection.vertexCountMax,
    });
  }

  /**
   * @param {BufferPolylineOptions} options
   * @param {BufferPolyline} result
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

  /** @param {FrameState} frameState */
  update(frameState) {
    super.update(frameState);

    this._renderContext = renderPolylines(
      this,
      frameState,
      this._renderContext,
    );
  }
}

export default BufferPolylineCollection;
