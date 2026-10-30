// @ts-check

import { Color } from "@cesium/core";
import VectorPrimitive from "./VectorPrimitive.js";
import BlendOption from "./BlendOption.js";
import renderBufferPointCollection from "./renderBufferPointCollection.js";

/** @import FrameState from "./FrameState.js"; */
/** @import BufferPoint from "./BufferPoint.js"; */
/** @import BufferPointCollection from "./BufferPointCollection.js"; */
/** @import { BufferPointStyleResult } from "./renderBufferPointCollection.js"; */

/**
 * @typedef {object} CircleLayerOptions
 * @property {BufferPointCollection} collection The points drawn by the layer.
 * @property {number|function(BufferPoint): number} [radius=5.0] Radius of each circle, in pixels.
 * @property {Color|function(BufferPoint): Color} [color=Color.WHITE] Fill color of each circle.
 * @property {Color|function(BufferPoint): Color} [outlineColor=Color.BLACK] Outline color of each circle.
 * @property {number|function(BufferPoint): number} [outlineWidth=0.0] Outline width of each circle, in pixels.
 * @property {function(BufferPoint): boolean} [filter] Whether each point is drawn. Points hidden with {@link BufferPrimitive#show} are never drawn.
 * @property {BlendOption} [blendOption=BlendOption.TRANSLUCENT] Determines how the circles are blended with the scene. Must be {@link BlendOption.OPAQUE} or {@link BlendOption.TRANSLUCENT}.
 * @property {boolean} [show=true] Whether the layer is drawn.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Draws the points of a {@link BufferPointCollection} as screen-space circles
 * with a fill and an outline.
 *
 * <p>Each visual property is either one value for every point, or a callback
 * returning the value for a given point. The point passed to a callback is
 * reused between calls and must not be retained. Callbacks are evaluated when
 * a point is added or changed, or when a property is assigned, and the results
 * are cached; call {@link VectorPrimitive#makeStyleDirty} after changing data that
 * a callback reads.</p>
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
 * @example
 * const properties = [{ population: 12000 }, { population: 450000 }];
 *
 * viewer.scene.vectorPrimitives.add(
 *   new Cesium.CircleLayer({
 *     collection,
 *     radius: (point) => Math.sqrt(properties[point.featureId].population) / 50,
 *     color: (point) =>
 *       properties[point.featureId].population > 100000
 *         ? Cesium.Color.RED
 *         : Cesium.Color.GRAY,
 *     filter: (point) => properties[point.featureId].population > 1000,
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

    this.radius = options.radius ?? 5.0;
    this.color = cloneColor(options.color ?? Color.WHITE);
    this.outlineColor = cloneColor(options.outlineColor ?? Color.BLACK);
    this.outlineWidth = options.outlineWidth ?? 0.0;
    this.filter = options.filter;

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
   * Radius of each circle, in pixels.
   * @type {number|function(BufferPoint): number}
   * @default 5.0
   */
  get radius() {
    return this._getStyle("radius");
  }

  set radius(value) {
    this._setStyle("radius", value);
  }

  /**
   * Fill color of each circle.
   * @type {Color|function(BufferPoint): Color}
   * @default Color.WHITE
   */
  get color() {
    return this._getStyle("color");
  }

  set color(value) {
    this._setStyle("color", value);
  }

  /**
   * Outline color of each circle.
   * @type {Color|function(BufferPoint): Color}
   * @default Color.BLACK
   */
  get outlineColor() {
    return this._getStyle("outlineColor");
  }

  set outlineColor(value) {
    this._setStyle("outlineColor", value);
  }

  /**
   * Outline width of each circle, in pixels.
   * @type {number|function(BufferPoint): number}
   * @default 0.0
   */
  get outlineWidth() {
    return this._getStyle("outlineWidth");
  }

  set outlineWidth(value) {
    this._setStyle("outlineWidth", value);
  }

  /**
   * Whether each point is drawn. When undefined, every point is drawn. Points
   * hidden with {@link BufferPrimitive#show} are never drawn.
   * @type {undefined|function(BufferPoint): boolean}
   */
  get filter() {
    return this._getStyle("filter");
  }

  set filter(value) {
    this._setStyle("filter", value);
  }

  /**
   * Writes the visual properties of a point into the result.
   *
   * @param {BufferPoint} point
   * @param {BufferPointStyleResult} result
   * @returns {BufferPointStyleResult}
   * @ignore
   */
  _evaluatePoint(point, result) {
    const filter = this.filter;
    result.show = point.show && (filter === undefined || filter(point));
    result.radius = VectorPrimitive._evaluate(this.radius, point);
    result.color = VectorPrimitive._evaluate(this.color, point);
    result.outlineColor = VectorPrimitive._evaluate(this.outlineColor, point);
    result.outlineWidth = VectorPrimitive._evaluate(this.outlineWidth, point);
    return result;
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

/**
 * @template T
 * @param {T} value
 * @returns {T}
 * @ignore
 */
function cloneColor(value) {
  return value instanceof Color ? /** @type {T} */ (Color.clone(value)) : value;
}

export default CircleLayer;
