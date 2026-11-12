// @ts-check

import { Check, defined } from "@cesium/core";
import MetadataSemantic from "./MetadataSemantic.js";

/** @import GroupMetadata from "./GroupMetadata.js"; */

/**
 * @typedef {object} FeatureLayerOptions
 * @property {string} [name]
 * @property {GroupMetadata} [metadata]
 * @property {number} [index]
 * @private
 */

/**
 * A named set of features defined by source data. It neither renders nor styles its
 * features. Created from 3D Tiles 1.1 groups or from GeoJSON.
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
   * @privateParam {string} [options.name] The layer name. Defaults to a name from <code>options.metadata</code>.
   * @privateParam {GroupMetadata} [options.metadata] Tileset layers only. The group metadata backing this layer.
   * @privateParam {number} [options.index] Tileset layers only. The index of the group in its tileset JSON.
   */
  constructor(/** @type {FeatureLayerOptions} */ options) {
    this._metadata = options.metadata;
    this._index = options.index;
    this._name = options.name ?? getDefaultName(options.metadata);
    this._show = true;
  }

  /**
   * Whether the layer is shown. In a {@link Cesium3DTileset}, tiles in a hidden
   * layer are not requested or rendered.
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

  /**
   * The group metadata backing this layer, if any.
   *
   * @type {GroupMetadata|undefined}
   * @readonly
   * @private
   */
  get metadata() {
    return this._metadata;
  }

  /**
   * The index of the group in the tileset JSON that defines it, if any.
   *
   * @type {number|undefined}
   * @readonly
   * @private
   */
  get index() {
    return this._index;
  }
}

/**
 * @param {*} metadata A {@link GroupMetadata}, typed loosely because its accessors are <code>@private</code>.
 * @returns {string|undefined}
 */
function getDefaultName(metadata) {
  if (!defined(metadata)) {
    return undefined;
  }
  if (metadata.hasPropertyBySemantic(MetadataSemantic.NAME)) {
    return metadata.getPropertyBySemantic(MetadataSemantic.NAME);
  }
  return metadata.hasProperty("name")
    ? metadata.getProperty("name")
    : undefined;
}

export default FeatureLayer;
