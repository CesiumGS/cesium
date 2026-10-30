// @ts-check

import { Color } from "@cesium/core";
import VectorPrimitive from "./VectorPrimitive.js";
import BlendOption from "./BlendOption.js";
import renderBufferPointCollection from "./renderBufferPointCollection.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */

/**
 * @typedef {object} CircleLayerOptions
 * @property {BufferPointCollection} collection The points drawn by the layer.
 * @property {number} [radius=5.0] Radius of every circle, in pixels.
 * @property {Color} [color=Color.WHITE] Fill color of every circle.
 * @property {Color} [outlineColor=Color.BLACK] Outline color of every circle.
 * @property {number} [outlineWidth=0.0] Outline width of every circle, in pixels.
 * @property {BlendOption} [blendOption=BlendOption.TRANSLUCENT] Determines how the circles are blended with the scene. Must be {@link BlendOption.OPAQUE} or {@link BlendOption.TRANSLUCENT}.
 * @property {boolean} [show=true] Whether the layer is drawn.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Draws the points of a {@link BufferPointCollection} as screen-space circles
 * with a fill and an outline.
 *
 * @example
 * const collection = new Cesium.BufferPointCollection();
 * collection.add({ position: Cesium.Cartesian3.fromDegrees(-75.16, 39.95) });
 *
 * viewer.scene.vectorPrimitives.add(
 *   new Cesium.CircleLayer({
 *     collection,
 *     radius: 8,
 *     color: Cesium.Color.ORANGE,
 *     outlineColor: Cesium.Color.WHITE,
 *     outlineWidth: 2,
 *   }),
 * );
 *
 * @extends VectorPrimitive
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class CircleLayer extends VectorPrimitive {
  /**
   * @param {CircleLayerOptions} options
   */
  constructor(options) {
    super(options);

    /**
     * Radius of every circle, in pixels.
     * @type {number}
     * @default 5.0
     */
    this.radius = options.radius ?? 5.0;

    /**
     * Fill color of every circle.
     * @type {Color}
     * @default Color.WHITE
     */
    this.color = Color.clone(options.color ?? Color.WHITE);

    /**
     * Outline color of every circle.
     * @type {Color}
     * @default Color.BLACK
     */
    this.outlineColor = Color.clone(options.outlineColor ?? Color.BLACK);

    /**
     * Outline width of every circle, in pixels.
     * @type {number}
     * @default 0.0
     */
    this.outlineWidth = options.outlineWidth ?? 0.0;

    /**
     * Determines how the circles are blended with the scene. Must be
     * {@link BlendOption.OPAQUE} or {@link BlendOption.TRANSLUCENT}.
     * @type {BlendOption}
     * @default BlendOption.TRANSLUCENT
     */
    this.blendOption = options.blendOption ?? BlendOption.TRANSLUCENT;
  }

  /**
   * The points drawn by the layer. The layer does not own the collection;
   * destroying the layer leaves the collection intact.
   *
   * @type {BufferPointCollection}
   * @readonly
   * @override
   */
  get collection() {
    return /** @type {BufferPointCollection} */ (this._collection);
  }

  /**
   * @param {FrameState} frameState
   * @param {*} renderContext
   * @returns {*}
   * @protected
   * @override
   * @ignore
   */
  _render(frameState, renderContext) {
    return renderBufferPointCollection(
      this.collection,
      frameState,
      renderContext,
      this,
    );
  }
}

export default CircleLayer;
