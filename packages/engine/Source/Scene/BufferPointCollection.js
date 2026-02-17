// @ts-check

import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
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
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * @extends BufferPrimitiveCollection<BufferPoint>
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPointCollection extends BufferPrimitiveCollection {
  _getCollectionClass() {
    return BufferPointCollection;
  }

  _getPrimitiveClass() {
    return BufferPoint;
  }

  _getPrimitiveLayout() {
    return BufferPoint.Layout;
  }

  /**
   * @param {BufferPointCollection} collection
   * @returns {BufferPointCollection}
   * @override
   */
  static _cloneEmpty(collection) {
    return new BufferPointCollection({
      primitiveCountMax: collection.primitiveCountMax,
      vertexCountMax: collection.vertexCountMax,
    });
  }

  /**
   * @param {BufferPointOptions} options
   * @param {BufferPoint} result
   * @returns {BufferPoint}
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

  /**
   * @param {FrameState} frameState
   * @ignore
   */
  update(frameState) {
    super.update(frameState);

    this._renderContext = renderPoints(this, frameState, this._renderContext);
  }
}

export default BufferPointCollection;
