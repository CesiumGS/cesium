// @ts-check

import { Check } from "@cesium/core";

/**
 * @typedef {object} FeatureLayerOptions
 * @property {string} [name]
 * @private
 */

/**
 * A named set of features defined by source data. It neither renders nor styles its
 * features. The source format does not matter to the layer. Currently, layers are
 * created from 3D Tiles 1.1 groups or from GeoJSON.
 * <p>
 * Do not construct this directly. Access layers through a
 * {@link Cesium3DTileset#featureLayers} or a {@link FeatureLayerProvider}, such as
 * {@link GeoJsonFeatureLayerProvider#featureLayers}.
 * </p>
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class FeatureLayer {
  /**
   * @privateParam {object} options An object with the following properties:
   * @privateParam {string} [options.name] The layer name.
   */
  constructor(/** @type {FeatureLayerOptions} */ options) {
    this._name = options.name;
    this._show = true;
  }

  /**
   * Whether the layer is shown. In a {@link Cesium3DTileset}, tiles in a hidden
   * layer are not requested or rendered. Tiles with multiple contents are not yet affected.
   * In an {@link MVTDataProvider}, each tile holds every layer, so tiles are still
   * requested and only the hidden layer's features are not rendered.
   *
   * @type {boolean}
   * @default true
   */
  get show() {
    return this._show;
  }

  set show(value) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.bool("value", value);
    //>>includeEnd('debug');
    this._show = value;
  }

  /**
   * The layer name. For a 3D Tiles group, defaults to its property with the
   * <code>NAME</code> semantic, then its <code>name</code> property, otherwise
   * <code>undefined</code>.
   *
   * @type {string|undefined}
   */
  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }
}

export default FeatureLayer;
