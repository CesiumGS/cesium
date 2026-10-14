import { Check } from "@cesium/core";
import MetadataSemantic from "./MetadataSemantic.js";

/** @import GroupMetadata from "./GroupMetadata.js"; */

/**
 * A data layer of a {@link Cesium3DTileset}: a named part of the tileset as defined
 * by its data, not a rendering or styling layer. Currently backed by a 3D Tiles 1.1 group.
 * <p>
 * Do not construct this directly. Access layers through {@link Cesium3DTileset#dataLayers}.
 * </p>
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Cesium3DTilesetDataLayer {
  /**
   * @privateParam {object} options An object with the following properties:
   * @privateParam {GroupMetadata} options.metadata The group metadata backing this layer.
   * @privateParam {number} options.index The index of the group in its tileset JSON.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options.metadata", options.metadata);
    Check.typeOf.number("options.index", options.index);
    //>>includeEnd('debug');

    this._metadata = options.metadata;
    this._index = options.index;
    this._name = getDefaultName(options.metadata);
    this._show = true;
  }

  /**
   * Whether the layer is shown. Tiles in a hidden layer are not requested or rendered.
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
   * The layer name. Defaults to the group's property with the <code>NAME</code>
   * semantic, then its <code>name</code> property, otherwise <code>undefined</code>.
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
   * The group metadata backing this layer.
   *
   * @type {GroupMetadata}
   * @readonly
   * @private
   */
  get metadata() {
    return this._metadata;
  }

  /**
   * The index of the group in the tileset JSON that defines it.
   *
   * @type {number}
   * @readonly
   */
  get index() {
    return this._index;
  }
}

function getDefaultName(metadata) {
  if (metadata.hasPropertyBySemantic(MetadataSemantic.NAME)) {
    return metadata.getPropertyBySemantic(MetadataSemantic.NAME);
  }
  return metadata.hasProperty("name")
    ? metadata.getProperty("name")
    : undefined;
}

export default Cesium3DTilesetDataLayer;
