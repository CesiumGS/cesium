// @ts-check

import { Color } from "@cesium/core";
import BufferPointCollection from "./BufferPointCollection.js";
import CircleVectorPrimitive from "./CircleVectorPrimitive.js";
import Expression from "./Expression.js";

/** @import BlendOption from "./BlendOption.js"; */
/** @import BufferPoint from "./BufferPoint.js"; */
/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */

/**
 * @typedef {object} CircleSymbolizerOptions
 * @property {number|string} [radius=5.0] Radius of each circle, in pixels.
 * @property {Color|string} [color=Color.WHITE] Fill color of each circle.
 * @property {Color|string} [outlineColor=Color.BLACK] Outline color of each circle.
 * @property {number|string} [outlineWidth=0.0] Outline width of each circle, in pixels.
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */

/**
 * Draws point features as screen-space circles with a fill and an outline.
 * Each visual property is either one value for every feature, or an
 * expression in the {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/Styling|3D Tiles Styling language}
 * evaluated for each feature.
 *
 * @example
 * const symbolizer = new Cesium.CircleSymbolizer({
 *   radius: "${population} / 100000",
 *   color: "color('red')",
 *   outlineColor: Cesium.Color.WHITE,
 *   outlineWidth: 1,
 * });
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see VectorStyleRule
 * @see CircleVectorPrimitive
 */
class CircleSymbolizer {
  /**
   * @param {CircleSymbolizerOptions} [options]
   */
  constructor(options = {}) {
    /**
     * @type {number|string}
     * @private
     */
    this._radius = options.radius ?? 5.0;

    /**
     * @type {Color|string}
     * @private
     */
    this._color = cloneColor(options.color ?? Color.WHITE);

    /**
     * @type {Color|string}
     * @private
     */
    this._outlineColor = cloneColor(options.outlineColor ?? Color.BLACK);

    /**
     * @type {number|string}
     * @private
     */
    this._outlineWidth = options.outlineWidth ?? 0.0;

    /**
     * Shared by every primitive the symbolizer creates, so expressions are parsed once.
     * @private
     */
    this._primitiveOptions = {
      radius: createNumberStyle(this._radius),
      color: createColorStyle(this._color),
      outlineColor: createColorStyle(this._outlineColor),
      outlineWidth: createNumberStyle(this._outlineWidth),
    };
  }

  /**
   * Radius of each circle, in pixels.
   * @type {number|string}
   * @readonly
   */
  get radius() {
    return this._radius;
  }

  /**
   * Fill color of each circle.
   * @type {Color|string}
   * @readonly
   */
  get color() {
    return this._color;
  }

  /**
   * Outline color of each circle.
   * @type {Color|string}
   * @readonly
   */
  get outlineColor() {
    return this._outlineColor;
  }

  /**
   * Outline width of each circle, in pixels.
   * @type {number|string}
   * @readonly
   */
  get outlineWidth() {
    return this._outlineWidth;
  }

  /**
   * Creates a vector primitive that draws the collection, or returns undefined
   * if the collection does not hold points.
   *
   * @param {BufferPrimitiveCollection<BufferPrimitive>} collection
   * @param {function(BufferPrimitive): boolean|undefined} filter
   * @param {BlendOption} blendOption
   * @returns {CircleVectorPrimitive|undefined}
   * @ignore
   */
  _createPrimitive(collection, filter, blendOption) {
    if (!(collection instanceof BufferPointCollection)) {
      return undefined;
    }

    return new CircleVectorPrimitive({
      ...this._primitiveOptions,
      collection,
      filter,
      blendOption,
    });
  }
}

/**
 * @param {Color|string} value
 * @returns {Color|string}
 * @ignore
 */
function cloneColor(value) {
  return value instanceof Color ? Color.clone(value) : value;
}

/**
 * @param {number|string} value
 * @returns {number|function(BufferPoint): number}
 * @ignore
 */
function createNumberStyle(value) {
  if (typeof value !== "string") {
    return value;
  }

  const expression = new Expression(value);
  return (point) =>
    /** @type {number} */ (expression.evaluate(point.pickObject));
}

/**
 * @param {Color|string} value
 * @returns {Color|function(BufferPoint): Color}
 * @ignore
 */
function createColorStyle(value) {
  if (typeof value !== "string") {
    return value;
  }

  const expression = new Expression(value);
  const result = new Color();
  return (point) => expression.evaluateColor(point.pickObject, result);
}

export default CircleSymbolizer;
