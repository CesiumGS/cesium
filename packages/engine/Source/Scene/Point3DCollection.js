// @ts-check

import Feature3DCollection from "./Feature3DCollection.js";
import Point3D from "./Point3D.js";
import Cartesian3 from "../Core/Cartesian3.js";
import renderPoints from "./renderPoint3DCollection.js";

/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "../Scene/FrameState.js" */

/**
 * @typedef {object} Point3DOptions
 * @property {boolean} [show=true]
 * @property {Color} [color=Color.WHITE]
 * @property {Cartesian3} [position=Cartesian3.ZERO]
 */

/**
 * @extends Feature3DCollection<Point3D>
 */
class Point3DCollection extends Feature3DCollection {
  /** @type {Record<string, unknown>} */
  _renderContext = null;

  _getFeatureClass() {
    return Point3D;
  }

  _getFeatureLayout() {
    return Point3D.Layout;
  }

  /**
   * @param {Point3DOptions} options
   * @param {Point3D} result
   * @override
   */
  add(options, result = new Point3D()) {
    super.add(options, result);

    result._setUint32(
      Point3D.Layout.POSITION_OFFSET_U32,
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

export default Point3DCollection;
