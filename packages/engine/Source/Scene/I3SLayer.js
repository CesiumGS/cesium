import defined from "../Core/defined.js";
import Rectangle from "../Core/Rectangle.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import Cesium3DTileset from "./Cesium3DTileset.js";
import I3SNode from "./I3SNode.js";

/**
 * This class implements an I3S layer. In CesiumJS each I3SLayer creates a Cesium3DTileset.
 * <p>
 * Do not construct this directly, instead access layers through {@link I3SDataProvider}.
 * </p>
 * @alias I3SLayer
 * @internalConstructor
 * @privateParam {I3SDataProvider} dataProvider The i3s data provider
 * @privateParam {object} layerData The layer data that is loaded from the scene layer
 * @privateParam {number} index The index of the layer to be reflected
 */
function I3SLayer(dataProvider, layerData, index) {
  this._dataProvider = dataProvider;

  if (!defined(layerData.href)) {
    // assign a default layer
    layerData.href = `./layers/${index}`;
  }

  const dataProviderUrl = this._dataProvider.resource.getUrlComponent();

  let tilesetUrl = "";
  if (dataProviderUrl.match(/layers\/\d/)) {
    tilesetUrl = `${dataProviderUrl}`.replace(/\/+$/, "");
  } else {
    // Add '/' to url if needed + `${layerData.href}` if tilesetUrl not already in ../layers/[id] format
    tilesetUrl = `${dataProviderUrl}`
      .replace(/\/?$/, "/")
      .concat(`${layerData.href}`);
  }

  this._version = layerData.store.version;
  const splitVersion = this._version.split(".");
  this._majorVersion = parseInt(splitVersion[0]);
  this._minorVersion = splitVersion.length > 1 ? parseInt(splitVersion[1]) : 0;

  this._resource = new Resource({ url: tilesetUrl });
  this._resource.setQueryParameters(
    this._dataProvider.resource.queryParameters
  );
  this._resource.appendForwardSlash();
  this._data = layerData;
  this._rootNode = undefined;
  this._nodePages = {};
  this._nodePageFetches = {};
  this._extent = undefined;
  this._tileset = undefined;
  this._geometryDefinitions = undefined;

  this._computeGeometryDefinitions(true);
  this._computeExtent();
}

Object.defineProperties(I3SLayer.prototype, {
  /**
   * Gets the resource for the layer.
   * @memberof I3SLayer.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },

  /**
   * Gets the root node of this layer.
   * @memberof I3SLayer.prototype
   * @type {I3SNode}
   * @readonly
   */
  rootNode: {
    get: function () {
      return this._rootNode;
    },
  },
  /**
   * Gets the Cesium3DTileset for this layer.
   * @memberof I3SLayer.prototype
   * @type {Cesium3DTileset|undefined}
   * @readonly
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SLayer.prototype
   * @type {object}
   * @readonly
   */
  data: {
    get: function () {
      return this._data;
    },
  },

  /**
   * The version string of the loaded I3S dataset
   * @memberof I3SLayer.prototype
   * @type {string}
   * @readonly
   */
  version: {
    get: function () {
      return this._version;
    },
  },

  /**
   * The major version number of the loaded I3S dataset
   * @memberof I3SLayer.prototype
   * @type {number}
   * @readonly
   */
  majorVersion: {
    get: function () {
      return this._majorVersion;
    },
  },

  /**
   * The minor version number of the loaded I3S dataset
   * @memberof I3SLayer.prototype
   * @type {number}
   * @readonly
   */
  minorVersion: {
    get: function () {
      return this._minorVersion;
    },
  },

  /**
   * When <code>true</code>, when the loaded I3S version is 1.6 or older
   * @memberof I3SLayer.prototype
   * @type {boolean}
   * @readonly
   */
  legacyVersion16: {
    get: function () {
      if (!defined(this.version)) {
        return undefined;
      }
      if (
        this.majorVersion < 1 ||
        (this.majorVersion === 1 && this.minorVersion <= 6)
      ) {
        return true;
      }
      return false;
    },
  },
});

/**
 * Loads the content, including the root node definition and its children
 * @returns {Promise} A promise that is resolved when the layer data is loaded
 * @private
 */
I3SLayer.prototype.load = async function () {
  if (this._data.spatialReference.wkid !== 4326) {
    throw new RuntimeError(
      `Unsupported spatial reference: ${this._data.spatialReference.wkid}`
    );
  }

  await this._dataProvider.loadGeoidData();
  await this._loadRootNode();
  await this._create3DTileset();

  this._rootNode._tile = this._tileset._root;
  this._tileset._root._i3sNode = this._rootNode;
  if (this.legacyVersion16) {
    return this._rootNode._loadChildren();
  }
};

/**
 * @private
 */
I3SLayer.prototype._computeGeometryDefinitions = function (useCompression) {
  // create a table of all geometry buffers based on
  // the number of attributes and whether they are
  // compressed or not, sort them by priority

  this._geometryDefinitions = [];

  if (defined(this._data.geometryDefinitions)) {
    for (
      let defIndex = 0;
      defIndex < this._data.geometryDefinitions.length;
      defIndex++
    ) {
      const geometryBuffersInfo = [];
      const geometryBuffers = this._data.geometryDefinitions[defIndex]
        .geometryBuffers;

      for (let bufIndex = 0; bufIndex < geometryBuffers.length; bufIndex++) {
        const geometryBuffer = geometryBuffers[bufIndex];
        const collectedAttributes = [];
        let compressed = false;

        if (defined(geometryBuffer.compressedAttributes) && useCompression) {
          // check if compressed
          compressed = true;
          const attributes = geometryBuffer.compressedAttributes.attributes;
          for (let i = 0; i < attributes.length; i++) {
            collectedAttributes.push(attributes[i]);
          }
        } else {
          // uncompressed attributes
          for (const attribute in geometryBuffer) {
            if (attribute !== "offset") {
              collectedAttributes.push(attribute);
            }
          }
        }

        geometryBuffersInfo.push({
          compressed: compressed,
          attributes: collectedAttributes,
          index: geometryBuffers.indexOf(geometryBuffer),
        });
      }

      // rank the buffer info
      geometryBuffersInfo.sort(function (a, b) {
        if (a.compressed && !b.compressed) {
          return -1;
        } else if (!a.compressed && b.compressed) {
          return 1;
        }
        return a.attributes.length - b.attributes.length;
      });
      this._geometryDefinitions.push(geometryBuffersInfo);
    }
  }
};

/**
 * @private
 */
I3SLayer.prototype._findBestGeometryBuffers = function (
  definition,
  attributes
) {
  // find the most appropriate geometry definition
  // based on the required attributes, and by favouring
  // compression to improve bandwidth requirements

  const geometryDefinition = this._geometryDefinitions[definition];

  if (defined(geometryDefinition)) {
    for (let index = 0; index < geometryDefinition.length; ++index) {
      const geometryBufferInfo = geometryDefinition[index];
      let missed = false;
      const geometryAttributes = geometryBufferInfo.attributes;
      for (let attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
        if (!geometryAttributes.includes(attributes[attrIndex])) {
          missed = true;
          break;
        }
      }
      if (!missed) {
        return {
          bufferIndex: geometryBufferInfo.index,
          definition: geometryDefinition,
          geometryBufferInfo: geometryBufferInfo,
        };
      }
    }
  }

  return 0;
};

/**
 * @private
 */
I3SLayer.prototype._loadRootNode = function () {
  if (defined(this._data.nodePages)) {
    let rootIndex = 0;
    if (defined(this._data.nodePages.rootIndex)) {
      rootIndex = this._data.nodePages.rootIndex;
    }
    this._rootNode = new I3SNode(this, rootIndex, true);
  } else {
    this._rootNode = new I3SNode(this, this._data.store.rootNode, true);
  }

  return this._rootNode.load();
};

/**
 * @private
 */
I3SLayer.prototype._getNodeInNodePages = function (nodeIndex) {
  const index = Math.floor(nodeIndex / this._data.nodePages.nodesPerPage);
  const offsetInPage = nodeIndex % this._data.nodePages.nodesPerPage;
  const that = this;
  return this._loadNodePage(index).then(function () {
    return that._nodePages[index][offsetInPage];
  });
};

/**
 * @private
 */
I3SLayer._fetchJson = function (resource) {
  return resource.fetchJson();
};

/**
 * @private
 */
I3SLayer.prototype._loadNodePage = function (page) {
  const that = this;

  // If node page was already requested return the same promise
  if (!defined(this._nodePageFetches[page])) {
    const nodePageResource = this.resource.getDerivedResource({
      url: `nodepages/${page}/`,
    });
    const fetchPromise = I3SLayer._fetchJson(nodePageResource).then(function (
      data
    ) {
      if (defined(data.error) && data.error.code !== 200) {
        return Promise.reject(data.error);
      }

      that._nodePages[page] = data.nodes;
      return data;
    });

    this._nodePageFetches[page] = fetchPromise;
  }

  return this._nodePageFetches[page];
};

/**
 * @private
 */
I3SLayer.prototype._computeExtent = function () {
  if (defined(this._data.fullExtent)) {
    this._extent = Rectangle.fromDegrees(
      this._data.fullExtent.xmin,
      this._data.fullExtent.ymin,
      this._data.fullExtent.xmax,
      this._data.fullExtent.ymax
    );
  } else if (defined(this._data.store.extent)) {
    this._extent = Rectangle.fromDegrees(
      this._data.store.extent[0],
      this._data.store.extent[1],
      this._data.store.extent[2],
      this._data.store.extent[3]
    );
  }
};

/**
 * @private
 */
I3SLayer.prototype._create3DTileset = async function () {
  const inPlaceTileset = {
    asset: {
      version: "1.0",
    },
    geometricError: Number.MAX_VALUE,
    root: this._rootNode._create3DTileDefinition(),
  };

  const tilesetBlob = new Blob([JSON.stringify(inPlaceTileset)], {
    type: "application/json",
  });

  const tilesetUrl = URL.createObjectURL(tilesetBlob);

  const tilesetOptions = {};
  if (defined(this._dataProvider._cesium3dTilesetOptions)) {
    for (const x in this._dataProvider._cesium3dTilesetOptions) {
      if (this._dataProvider._cesium3dTilesetOptions.hasOwnProperty(x)) {
        tilesetOptions[x] = this._dataProvider._cesium3dTilesetOptions[x];
      }
    }
  }

  this._tileset = await Cesium3DTileset.fromUrl(tilesetUrl, tilesetOptions);
  this._tileset.show = this._dataProvider.show;
  this._tileset._isI3STileSet = true;
  this._tileset.tileUnload.addEventListener(function (tile) {
    tile._i3sNode._clearGeometryData();
    URL.revokeObjectURL(tile._contentResource._url);
    tile._contentResource = tile._i3sNode.resource;
  });

  this._tileset.tileVisible.addEventListener(function (tile) {
    if (defined(tile._i3sNode)) {
      tile._i3sNode._loadChildren();
    }
  });
};

export default I3SLayer;
