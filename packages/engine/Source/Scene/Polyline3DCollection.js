// @ts-check

import defined from "../Core/defined.js";
import Feature3DCollection from "./Feature3DCollection.js";
import Polyline3D from "./Polyline3D.js";
import renderPolylines from "./renderPolyline3DCollection.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "../Scene/FrameState.js" */

/**
 * @typedef {object} Polyline3DOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {number} [width=1]
 * @experimental
 */

/**
 * @extends Feature3DCollection<Polyline3D>
 * @experimental
 */
class Polyline3DCollection extends Feature3DCollection {
  /** @type {Record<string, unknown>} */
  _renderContext = null;

  _getFeatureClass() {
    return Polyline3D;
  }

  _getFeatureLayout() {
    return Polyline3D.Layout;
  }

  /**
   * @param {Polyline3DOptions} options
   * @param {Polyline3D} result
   * @override
   */
  add(options, result = new Polyline3D()) {
    super.add(options, result);

    const vertexOffset = this._positionCount;
    result._setUint32(Polyline3D.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(Polyline3D.Layout.POSITION_COUNT_U32, 0);

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

export default Polyline3DCollection;
