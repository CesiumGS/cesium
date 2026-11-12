// @ts-check

import { Check, defined, Event } from "@cesium/core";
import FeatureLayer from "./FeatureLayer.js";

/** @import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js"; */
/** @import GroupMetadata from "./GroupMetadata.js"; */

/**
 * The feature layers of a {@link Cesium3DTileset} or a {@link FeatureLayerProvider}.
 * Read-only: layers come from the provider's data.
 * <p>
 * A tileset's layers are currently created from the root tileset JSON's 3D Tiles 1.1
 * groups, and exist once {@link Cesium3DTileset.fromUrl} resolves. Groups in external
 * tilesets are not yet supported.
 * </p>
 *
 * @example
 * const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
 * // Layers from the root tileset exist once fromUrl resolves.
 * tileset.featureLayers.getByName("Roads")[0].show = false;
 * // Layers discovered later are added as they load.
 * tileset.featureLayers.layerAdded.addEventListener((layer) => {
 *   layer.show = layer.name !== "Vegetation";
 * });
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class FeatureLayerCollection {
  constructor() {
    /**
     * @type {FeatureLayer[]}
     * @private
     */
    this._layers = [];
    /**
     * @type {Map<GroupMetadata, FeatureLayer>}
     * @private
     */
    this._layerByGroup = new Map();

    /**
     * Raised synchronously when a layer is added, before any of its tiles are requested.
     * Not raised yet: all current layers exist before listeners can be attached.
     *
     * @type {Event<function(FeatureLayer):void>}
     */
    this.layerAdded = new Event();
  }

  /**
   * The number of layers.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._layers.length;
  }

  /**
   * Gets the layer at the given index.
   *
   * @param {number} index The index.
   * @returns {FeatureLayer} The layer.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("index", index);
    //>>includeEnd('debug');
    return this._layers[index];
  }

  /**
   * Checks whether this collection contains the given layer.
   *
   * @param {FeatureLayer} [layer] The layer to check for.
   * @returns {boolean} <code>true</code> if the collection contains the layer, <code>false</code> otherwise.
   */
  contains(layer) {
    return this._layers.includes(layer);
  }

  /**
   * Gets all layers with the given name. Names are not required to be unique.
   *
   * @param {string} name The layer name.
   * @returns {FeatureLayer[]} The matching layers.
   */
  getByName(name) {
    return this._layers.filter((layer) => layer.name === name);
  }

  /**
   * Adds a layer for each group in a tileset JSON's metadata.
   *
   * @param {Cesium3DTilesetMetadata} metadataExtension The parsed tileset JSON metadata.
   * @private
   */
  _addGroups(metadataExtension) {
    if (!defined(metadataExtension)) {
      return;
    }
    // @ts-expect-error Cesium3DTilesetMetadata defines groups with Object.defineProperties.
    const groups = metadataExtension.groups;
    for (let i = 0; i < groups.length; i++) {
      const layer = new FeatureLayer({
        metadata: groups[i],
        index: i,
      });
      this._layerByGroup.set(groups[i], layer);
      this._add(layer);
    }
  }

  /**
   * Adds a layer.
   *
   * @param {FeatureLayer} layer The layer to add.
   * @ignore
   */
  _add(layer) {
    this._layers.push(layer);
    this.layerAdded.raiseEvent(layer);
  }

  /**
   * Gets the layer backed by the given group metadata.
   *
   * @param {GroupMetadata} [groupMetadata] The group metadata.
   * @returns {FeatureLayer|undefined} The layer, if any.
   * @private
   */
  _getByGroup(groupMetadata) {
    return defined(groupMetadata)
      ? this._layerByGroup.get(groupMetadata)
      : undefined;
  }
}

export default FeatureLayerCollection;
