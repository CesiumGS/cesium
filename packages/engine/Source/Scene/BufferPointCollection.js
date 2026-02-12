// @ts-check

import BufferFeatureCollection from "./BufferFeatureCollection.js";
import BufferPoint from "./BufferPoint.js";
import Cartesian3 from "../Core/Cartesian3.js";
import renderPoints from "./renderBufferPointCollection.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js" */

/**
 * @typedef {object} BufferPointOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Cartesian3} [position=Cartesian3.ZERO]
 * @experimental
 */

/**
 * @extends BufferFeatureCollection<BufferPoint>
 * @experimental
 */
class BufferPointCollection extends BufferFeatureCollection {
  /** @type {Record<string, unknown>} */
  _renderContext = null;

  _getFeatureClass() {
    return BufferPoint;
  }

  _getFeatureLayout() {
    return BufferPoint.Layout;
  }

  /**
   * @param {BufferPointOptions} options
   * @param {BufferPoint} result
   * @override
   */
  add(options, result = new BufferPoint()) {
    super.add(options, result);

    result._setUint32(
      BufferPoint.Layout.POSITION_OFFSET_U32,
      this._positionCount++,
    );
    result.setPosition(options.position ?? Cartesian3.ZERO);

    return result;
  }

  /** @param {FrameState} frameState */
  update(frameState) {
    super.update(frameState);

    this._renderContext = renderPoints(this, frameState, this._renderContext);
  }
}

export default BufferPointCollection;
