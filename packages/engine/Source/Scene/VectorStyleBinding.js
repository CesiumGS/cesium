import { Check, destroyObject } from "@cesium/core";

/**
 * PROTOTYPE. Draws the vector features of a {@link FeatureLayer} with a
 * {@link VectorStyle}. For tileset layers, the style is applied to each tile as
 * it loads and released when the tile unloads. Collections that no symbolizer
 * of the style can draw keep their default appearance.
 *
 * @example
 * const vectors = new Cesium.VectorStyleBinding({
 *   featureLayer: tileset.featureLayers.getByName("Trees")[0],
 *   style: vectorStyle,
 * });
 * vectors.show = false;
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class VectorStyleBinding {
  /**
   * @param {object} options
   * @param {FeatureLayer} options.featureLayer The layer to draw.
   * @param {VectorStyle} options.style The style to draw it with.
   * @param {boolean} [options.show=true] Whether the styled primitives are drawn.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.object("options.featureLayer", options.featureLayer);
    Check.typeOf.object("options.style", options.style);
    //>>includeEnd('debug');

    this._featureLayer = options.featureLayer;
    this._style = options.style;
    // Tile content compares this to know when to recreate its primitives.
    this._version = 0;

    /**
     * Whether the styled primitives are drawn.
     * @type {boolean}
     * @default true
     */
    this.show = options.show ?? true;

    this._featureLayer._vectorStyleBinding = this;
  }

  /**
   * @type {FeatureLayer}
   * @readonly
   */
  get featureLayer() {
    return this._featureLayer;
  }

  /**
   * The style. Assigning a style, or calling {@link VectorStyleBinding#refresh}
   * after changing its rules, recreates the primitives of loaded tiles.
   * @type {VectorStyle}
   */
  get style() {
    return this._style;
  }

  set style(value) {
    this._style = value;
    this._version++;
  }

  refresh() {
    this._version++;
  }

  isDestroyed() {
    return false;
  }

  /**
   * Restores the layer's default appearance.
   */
  destroy() {
    if (this._featureLayer._vectorStyleBinding === this) {
      this._featureLayer._vectorStyleBinding = undefined;
    }
    return destroyObject(this);
  }
}

export default VectorStyleBinding;
