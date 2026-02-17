// @ts-check

import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js";
import BufferPoint from "./BufferPoint.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Frozen from "../Core/Frozen.js";
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
 * Collection of points held in ArrayBuffer storage for performance and memory optimization.
 *
 * <p>Default buffer memory allocation is arbitrary, and collections cannot be resized,
 * so specific per-buffer capacities should be provided in the collection
 * constructor when available.</p>
 *
 * @example
 * const collection = new BufferPointCollection({primitiveCountMax: 1024});
 *
 * const point = new BufferPoint();
 *
 * // Create a new point, temporarily bound to 'point' local variable.
 * collection.add({
 *   position: new Cartesian3(0.0, 0.0, 0.0),
 *   color: Color.WHITE,
 * }, point);
 *
 * // Iterate over all points in collection, temporarily binding 'point'
 * // local variable to each, and updating point color.
 * for (let i = 0; i < collection.primitiveCount; i++) {
 *   collection.get(i, point);
 *   point.setColor(Color.RED);
 * }
 *
 * @see BufferPoint
 * @see BufferPrimitiveCollection
 * @extends BufferPrimitiveCollection<BufferPoint>
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class BufferPointCollection extends BufferPrimitiveCollection {
  /**
   * @param {object} options
   * @param {number} [options.primitiveCountMax=BufferPrimitiveCollection.DEFAULT_CAPACITY]
   * @param {boolean} [options.show=true]
   * @param {boolean} [options.debugShowBoundingVolume=false]
   */
  constructor(options = Frozen.EMPTY_OBJECT) {
    super({ ...options, vertexCountMax: options.primitiveCountMax });
  }

  _getCollectionClass() {
    return BufferPointCollection;
  }

  _getPrimitiveClass() {
    return BufferPoint;
  }

  /////////////////////////////////////////////////////////////////////////////
  // COLLECTION LIFECYCLE

  /**
   * @param {BufferPointCollection} collection
   * @returns {BufferPointCollection}
   * @override
   * @ignore
   */
  static _cloneEmpty(collection) {
    return new BufferPointCollection({
      primitiveCountMax: collection.primitiveCountMax,
    });
  }

  /////////////////////////////////////////////////////////////////////////////
  // PRIMITIVE LIFECYCLE

  /**
   * Adds a new point to the collection, with the specified options. A
   * {@link BufferPoint} instance is linked to the new point, using
   * the 'result' argument if given, or a new instance if not. For repeated
   * calls, prefer to reuse a single BufferPoint instance rather than
   * allocating a new instance on each call.
   *
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

  /////////////////////////////////////////////////////////////////////////////
  // RENDER

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
