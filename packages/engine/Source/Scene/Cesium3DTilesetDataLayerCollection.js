import { Check, defined, Event } from "@cesium/core";
import Cesium3DTilesetDataLayer from "./Cesium3DTilesetDataLayer.js";

/** @import Cesium3DTilesetMetadata from "./Cesium3DTilesetMetadata.js"; */
/** @import GroupMetadata from "./GroupMetadata.js"; */

/**
 * The data layers of a {@link Cesium3DTileset}. Currently created from 3D Tiles 1.1 groups.
 * Read-only: layers come from the tileset's data.
 * <p>
 * Layers from external tilesets are added as those tilesets load. Listen to
 * {@link Cesium3DTilesetDataLayerCollection#layerAdded} to configure them before
 * their tiles are requested.
 * </p>
 *
 * @internalConstructor
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
class Cesium3DTilesetDataLayerCollection {
  constructor() {
    this._layers = [];
    this._layerByGroup = new Map();

    /**
     * Raised synchronously when a layer is added, before any of its tiles are requested.
     *
     * @type {Event<function(Cesium3DTilesetDataLayer)>}
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
   * @returns {Cesium3DTilesetDataLayer} The layer.
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
   * @param {Cesium3DTilesetDataLayer} [layer] The layer to check for.
   * @returns {boolean} <code>true</code> if the collection contains the layer, <code>false</code> otherwise.
   */
  contains(layer) {
    return this._layers.includes(layer);
  }

  /**
   * Gets all layers with the given name. Names are not required to be unique.
   *
   * @param {string} name The layer name.
   * @returns {Cesium3DTilesetDataLayer[]} The matching layers.
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
    const groups = metadataExtension.groups;
    for (let i = 0; i < groups.length; i++) {
      const layer = new Cesium3DTilesetDataLayer({
        metadata: groups[i],
        index: i,
      });
      this._layers.push(layer);
      this._layerByGroup.set(groups[i], layer);
      this.layerAdded.raiseEvent(layer);
    }
  }

  /**
   * Gets the layer backed by the given group metadata.
   *
   * @param {GroupMetadata} [groupMetadata] The group metadata.
   * @returns {Cesium3DTilesetDataLayer|undefined} The layer, if any.
   * @private
   */
  _getByGroup(groupMetadata) {
    return defined(groupMetadata)
      ? this._layerByGroup.get(groupMetadata)
      : undefined;
  }
}

export default Cesium3DTilesetDataLayerCollection;
