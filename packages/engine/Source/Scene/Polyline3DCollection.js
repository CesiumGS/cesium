// @ts-check

import defined from "../Core/defined.js";
import Feature3DCollection from "./Feature3DCollection.js";
import Polyline3D from "./Polyline3D.js";

/**
 * @typedef {object} Polyline3DOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Float64Array} [positions]
 * @property {number} [width=1]
 */

/**
 * @extends Feature3DCollection<Polyline3D>
 */
class Polyline3DCollection extends Feature3DCollection {
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

    const vertexOffset = this._positionCount * 3;
    result._setUint32(Polyline3D.Layout.POSITION_OFFSET_U32, vertexOffset);
    result._setUint32(Polyline3D.Layout.POSITION_COUNT_U32, 0);

    result.width = options.width ?? 1;

    if (defined(options.positions)) {
      result.setPositions(options.positions);
    }

    return result;
  }
}

export default Polyline3DCollection;
