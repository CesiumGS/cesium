import Cesium3DTileset from "../Scene/Cesium3DTileset.js";
import defined from "../Core/defined.js";
import I3SNode from "../Scene/I3SNode.js";
import Resource from "../Core/Resource.js";

/**
 * This class implements an I3S layer. Each I3SLayer creates a Cesium3DTileset.
 * <p>
 * Do not construct this directly, instead access layers through {@link I3SDataProvider}.
 * </p>
 * @alias I3SLayer
 * @constructor
 * @param {I3SSceneLayer} sceneLayer The scene layer
 * @param {Object} layerData The layer data that is loaded from the scene layer
 * @param {Number} index The index of the layer to be reflected
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

  this._resource = new Resource({ url: tilesetUrl });
  this._resource.setQueryParameters(
    this._dataProvider.resource.queryParameters
  );
  this._resource.appendForwardSlash();
  this._data = layerData;
  this._rootNode = undefined;
  this._nodePages = {};
  this._nodePageFetches = {};

  this._computeGeometryDefinitions(true);
  this._computeExtent();
}

Object.defineProperties(I3SLayer.prototype, {
  /**
   * Gets the resource for the layer
   * @memberof I3SLayer.prototype
   * @type {Resource}
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
   */
  rootNode: {
    get: function () {
      return this._rootNode;
    },
  },
  /**
   * Gets the Cesium3DTileSet for this layer.
   * @memberof I3SLayer.prototype
   * @type {I3SNode}
   */
  tileset: {
    get: function () {
      return this._tileset;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SLayer.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the content, including the root node definition and its children
 * @returns {Promise<void>} a promise that is resolved when the layer data is loaded
 */
I3SLayer.prototype.load = function () {
  const that = this;
  return new Promise(function (resolve, reject) {
    if (that._data.spatialReference.wkid !== 4326) {
      console.log(
        `Unsupported spatial reference: ${that._data.spatialReference.wkid}`
      );
      reject();
      return;
    }

    that._dataProvider.geoidDataIsReadyPromise.then(function () {
      that._loadRootNode().then(function () {
        that._create3DTileSet();
        that._tileset.readyPromise.then(function () {
          that._rootNode._tile = that._tileset._root;
          that._tileset._root._i3sNode = that._rootNode;
          if (that._data.store.version === "1.6") {
            that._rootNode._loadChildren().then(function () {
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    });
  });
};

/**
 * @private
 */
I3SLayer.prototype._computeGeometryDefinitions = function (useCompression) {
  // create a table of all geometry buffers based on
  // the number of attributes and whether they are
  // compressed or not, sort them by priority

  this._geometryDefinitions = [];

  if (this._data.geometryDefinitions) {
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

        if (geometryBuffer.compressedAttributes && useCompression) {
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

  if (geometryDefinition) {
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
  if (this._data.nodePages) {
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
  const Index = Math.floor(nodeIndex / this._data.nodePages.nodesPerPage);
  const offsetInPage = nodeIndex % this._data.nodePages.nodesPerPage;
  const that = this;
  return new Promise(function (resolve, reject) {
    that._loadNodePage(Index).then(function () {
      resolve(that._nodePages[Index][offsetInPage]);
    });
  });
};

/**
 * @private
 */
I3SLayer.prototype._loadNodePage = function (page) {
  const that = this;
  return new Promise(function (resolve, reject) {
    //If node page was already requested return the same promise
    if (!defined(that._nodePageFetches[page])) {
      const nodePageResource = that.resource.getDerivedResource({
        url: `nodepages/${page}/`,
      });
      const fetchPromise = Resource.fetchJson(nodePageResource).then(function (
        data
      ) {
        if (data.error && data.error.code !== 200) {
          return Promise.reject(data.error);
        }

        that._nodePages[page] = data.nodes;
        return Promise.resolve(data);
      });

      that._nodePageFetches[page] = { _promise: fetchPromise };
    }

    resolve(that._nodePageFetches[page]._promise);
  });
};

/**
 * @private
 */
I3SLayer.prototype._computeExtent = function () {
  if (this._data.fullExtent) {
    this._extent = {
      minLongitude: this._data.fullExtent.xmin,
      minLatitude: this._data.fullExtent.ymin,
      maxLongitude: this._data.fullExtent.xmax,
      maxLatitude: this._data.fullExtent.ymax,
    };
  } else if (this._data.store.extent) {
    this._extent = {
      minLongitude: this._data.store.extent[0],
      minLatitude: this._data.store.extent[1],
      maxLongitude: this._data.store.extent[2],
      maxLatitude: this._data.store.extent[3],
    };
  }
};

/**
 * @private
 */
I3SLayer.prototype._create3DTileSet = function () {
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

  const inPlaceTilesetURL = URL.createObjectURL(tilesetBlob);

  const tilesetOptions = {};
  if (defined(this._dataProvider._cesium3dTilesetOptions)) {
    for (const x in this._dataProvider._cesium3dTilesetOptions) {
      if (this._dataProvider._cesium3dTilesetOptions.hasOwnProperty(x)) {
        tilesetOptions[x] = this._dataProvider._cesium3dTilesetOptions[x];
      }
    }
  }
  tilesetOptions.url = inPlaceTilesetURL;
  tilesetOptions.show = this._dataProvider.show;

  this._tileset = new Cesium3DTileset(tilesetOptions);

  this._tileset._isI3STileSet = true;

  const that = this;
  this._tileset.readyPromise.then(function () {
    that._tileset.tileLoad.addEventListener(function (tile) {});

    that._tileset.tileUnload.addEventListener(function (tile) {
      tile._i3sNode._clearGeometryData();
      URL.revokeObjectURL(tile._contentResource._url);
      tile._contentResource = tile._i3sNode.resource;
    });

    that._tileset.tileVisible.addEventListener(function (tile) {
      if (tile._i3sNode) {
        tile._i3sNode._loadChildren();
      }
    });
  });
};

export default I3SLayer;
