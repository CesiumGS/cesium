/*
 * Esri Contribution: This code implements support for I3S (Indexed 3D Scene Layers), an OGC Community Standard.
 * Co-authored-by: Alexandre Jean-Claude ajeanclaude@spiria.com
 * Co-authored-by: Anthony Mirabeau anthony.mirabeau@presagis.com
 * Co-authored-by: Elizabeth Rudkin elizabeth.rudkin@presagis.com
 * Co-authored-by: Tamrat Belayneh tbelayneh@esri.com
 *
 * The I3S format has been developed by Esri and is shared under an Apache 2.0 license and is maintained @ https://github.com/Esri/i3s-spec.
 * This implementation supports loading, displaying, and querying an I3S layer (supported versions include Esri github I3S versions 1.6, 1.7/1.8 -
 * whose OGC equivalent are I3S Community Standard Version 1.1 & 1.2) in the CesiumJS viewer.
 * It enables the user to access an I3S layer via its URL and load it inside of the CesiumJS viewer.
 *
 * When a scene layer is initialized, and the I3SDataProvider.loadUrl function is invoked, it accomplishes the following:
 *
 * It processes the 3D Scene Layer resource (https://github.com/Esri/i3s-spec/blob/master/docs/1.8/3DSceneLayer.cmn.md) of an I3S dataset
 * and loads the layers data. It does so by creating a Cesium 3D Tileset for the given i3s layer and loads the root node.
 * When the root node is imported, it creates a Cesium 3D Tile that is parented to the Cesium 3D Tileset
 * and loads all children of the root node:
 *  for each children
 *   Create a place holder 3D tile so that the LOD display can use the nodes' selection criteria (maximumScreenSpaceError) to select the appropriate node
 *   based on the current LOD display & evaluation. If the Cesium 3D tile is visible, it invokes requestContent on it.
 *   At that moment, we intercept the call to requestContent, and we load the geometry in I3S format
 *   That geometry is transcoded on the fly to glTF format and ingested by CesiumJS
 *   When the geometry is loaded, we then load all children of this node as placeholders so that the LOD
 *   can know about them too.
 *
 * About transcoding:
 *
 * We use web workers to transcode I3S geometries into glTF
 * The steps are:
 *
 * Decode geometry attributes (positions, normals, etc..) either from DRACO or Binary format.
 * If requested, when creating an I3SDataProvider the user has the option to specify a tiled elevation terrain provider
 * (geoidTiledTerrainProvider) such as the one shown in the sandcastle example based on ArcGISTiledElevationTerrainProvider, that allows
 * conversion of heights for all vertices & bounding boxes of an I3S layer from (typically) gravity related (Orthometric) heights to Ellipsoidal.
 * This step is essential when fusing data with varying height sources (as is the case when fusing the I3S dataset (gravity related) in the sandcastle examples with the cesium world terrain (ellipsoidal)).
 * We then transform vertex coordinates from LONG/LAT/HEIGHT to Cartesian in local space and
 * scale appropriately if specified in the attribute metadata
 * Crop UVs if UV regions are defined in the attribute metadata
 * Create a glTF document in memory that will be ingested as part of a glb payload
 *
 * About GEOID data:
 *
 * We provide the ability to use GEOID data to convert heights from gravity related (orthometric) height systems to ellipsoidal.
 * We employ a service architecture to get the conversion factor for a given long lat values, leveraging existing implementation based on ArcGISTiledElevationTerrainProvider
 * to avoid requiring bloated look up files. The source Data used in this transcoding service was compiled from https://earth-info.nga.mil/#tab_wgs84-data and is based on
 * EGM2008 Gravity Model. The sandcastle examples show how to set the terrain provider service if required.
 */
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTile from "../Scene/Cesium3DTile.js";
import Cesium3DTileset from "../Scene/Cesium3DTileset.js";
import CesiumMath from "../Core/Math.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import HeightmapEncoding from "../Core/HeightmapEncoding.js";
import I3SNode from "../Scene/I3SNode.js";
import Lerc from "lerc";
import Resource from "../Core/Resource.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";

/**
 * This class implements an I3S Scene Layer. The URL
 * that is used for loadUrl should return a scene object. Currently supported I3S
 * versions are 1.6 and 1.7/1.8 (OGC I3S 1.2). An I3SDataProvider is the main public class for I3S support.
 * I3SFeature and I3SNode classes implement the Object Model for I3S entities, with public interfaces

 * @alias I3SDataProvider
 * @constructor
 *
 * @param {String} [name] The name of this data source.  If undefined, a name will be derived from the url.
 * @param {Scene} [scene] The scene to populate with the tileset
 *
 * @example
 * let i3sData = new I3SDataProvider();
 * i3sData.loadUrl('https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/Frankfurt2017_vi3s_18/SceneServer/layers/0');
 * viewer.scene.primitives.add(i3sData);
 *
 * @example
 * let geoidService = new Cesium.ArcGISTiledElevationTerrainProvider({
 *   url: "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer",
 * });
 * let dataProvider = new I3SDataProvider("", viewer.scene, {
 *   geoidTiledTerrainProvider: geoidService,  // pass the geoid service
 * });
 * i3sData.loadUrl('https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/Frankfurt2017_vi3s_18/SceneServer/layers/0');
 * viewer.scene.primitives.add(i3sData);
 */
function I3SDataProvider(name, scene, options, cesium3dTilesetOptions) {
  // All public configuration is defined as ES5 properties
  // These are just the "private" variables and their defaults.
  this._name = name;
  this._changed = new Event();
  this._error = new Event();
  this._isLoading = false;
  this._loading = new Event();
  this._scene = scene;
  this._traceFetches = false;
  this._autoCenterCameraOnStart = false;
  this._cesium3dTilesetOptions = defaultValue(
    cesium3dTilesetOptions,
    defaultValue.EMPTY_OBJECT
  );

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._traceFetches = options.traceFetches;
  this._autoCenterCameraOnStart = options.autoCenterCameraOnStart;
  this._geoidTiledTerrainProvider = options.geoidTiledTerrainProvider;
}

Object.defineProperties(I3SDataProvider.prototype, {
  /**
   * Gets a human-readable name for this instance.
   * @memberof I3SDataProvider.prototype
   * @type {String}
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * Gets a value indicating if the data source is currently loading data.
   * @memberof I3SDataProvider.prototype
   * @type {Boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof I3SDataProvider.prototype
   * @type {Event}
   */
  changedEvent: {
    get: function () {
      return this._changed;
    },
  },
  /**
   * Gets an event that will be raised if an error is encountered during
   * processing.
   * @memberof I3SDataProvider.prototype
   * @type {Event}
   */
  errorEvent: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Gets an event that will be raised when the data source either starts or
   * stops loading.
   * @memberof I3SDataProvider.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },

  /**
   * Gets or sets debugging and tracing of I3S fetches.
   * @memberof I3SDataProvider.prototype
   * @type {Boolean}
   */
  traceFetches: {
    get: function () {
      return this._traceFetches;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("value", value);
      //>>includeEnd('debug');

      this._traceFetches = value;
    },
  },
  /**
   * Gets or sets auto centering of the camera on the data set.
   * @memberof I3SDataProvider.prototype
   * @type {Boolean}
   */
  autoCenterCameraOnStart: {
    get: function () {
      return this._autoCenterCameraOnStart;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("value", value);
      //>>includeEnd('debug');

      this._autoCenterCameraOnStart = value;
    },
  },
});

/**
 * Asynchronously loads the I3S scene at the provided url, replacing any existing data.
 * @param {Object} url The url to be processed.
 * @returns {Promise<void>} a promise that will resolve when the I3S scene is loaded.
 */
I3SDataProvider.prototype.loadUrl = function (url) {
  const parts = url.split("?");
  this._url = parts[0];
  this._query = parts[1];
  this._completeUrl = url;

  this._sceneLayer = new I3SSceneLayer(this);
  return this._sceneLayer.load(this._completeUrl);
};

/**
 * Loads the provided data, replacing any existing data.
 * @param {Array} [data] The object to be processed.
 */
I3SDataProvider.prototype.load = function (data) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("data", data);
  //>>includeEnd('debug');

  // Clear out any data that might already exist.
  this._setLoading(true);
  const entities = this._entityCollection;

  // It's a good idea to suspend events when making changes to a
  // large amount of entities.  This will cause events to be batched up
  // into the minimal amount of function calls and all take place at the
  // end of processing (when resumeEvents is called).
  entities.suspendEvents();
  entities.removeAll();

  // Once all data is processed, call resumeEvents and raise the changed event.
  entities.resumeEvents();
  this._changed.raiseEvent(this);
  this._setLoading(false);
};

/**
 * Destroys the WebGL resources held by this object. Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception. Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see I3SDataProvider#isDestroyed
 */
I3SDataProvider.prototype.destroy = function () {
  for (let i = 0; i < this._sceneLayer._layerCollection.length; i++) {
    this._sceneLayer._layerCollection[i]._tileset.destroy();
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see I3SDataProvider#destroy
 */
I3SDataProvider.prototype.isDestroyed = function () {
  if (this._sceneLayer._layerCollection.length !== 0) {
    return this._sceneLayer._layerCollection[0]._tileset.isDestroyed();
  }

  return false;
};

/**
 * @private
 */
I3SDataProvider.prototype.update = function (frameState) {
  for (let i = 0; i < this._sceneLayer._layerCollection.length; i++) {
    if (defined(this._sceneLayer._layerCollection[i]._tileset)) {
      this._sceneLayer._layerCollection[i]._tileset.update(frameState);
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.prePassesUpdate = function (frameState) {
  for (let i = 0; i < this._sceneLayer._layerCollection.length; i++) {
    if (defined(this._sceneLayer._layerCollection[i]._tileset)) {
      this._sceneLayer._layerCollection[i]._tileset.prePassesUpdate(frameState);
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.postPassesUpdate = function (frameState) {
  for (let i = 0; i < this._sceneLayer._layerCollection.length; i++) {
    if (defined(this._sceneLayer._layerCollection[i]._tileset)) {
      this._sceneLayer._layerCollection[i]._tileset.postPassesUpdate(
        frameState
      );
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.updateForPass = function (frameState, passState) {
  for (let i = 0; i < this._sceneLayer._layerCollection.length; i++) {
    if (defined(this._sceneLayer._layerCollection[i]._tileset)) {
      this._sceneLayer._layerCollection[i]._tileset.updateForPass(
        frameState,
        passState
      );
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype._setLoading = function (isLoading) {
  if (this._isLoading !== isLoading) {
    this._isLoading = isLoading;
    this._loading.raiseEvent(this, isLoading);
  }
};

/**
 * @private
 */
I3SDataProvider.prototype._loadJson = function (uri, success, fail) {
  const that = this;
  return new Promise(function (resolve, reject) {
    if (that._traceFetches) {
      console.log("I3S FETCH:", uri);
    }
    const request = Resource.fetchJson(uri);
    request.then(function (data) {
      if (data.error) {
        console.error("Failed to fetch I3S ", uri);
        console.error(data.error.message);
        if (data.error.details) {
          for (let i = 0; i < data.error.details.length; i++) {
            console.log(data.error.details[i]);
          }
        }
        fail(reject);
      } else {
        success(data, resolve);
      }
    });
  });
};

/**
 * @private
 */
I3SDataProvider.prototype._loadBinary = function (uri, success, fail) {
  const that = this;
  return new Promise(function (resolve, reject) {
    if (that._traceFetches) {
      console.log("I3S FETCH:", uri);
    }
    const request = Resource.fetchArrayBuffer(uri);
    request.then(function (data) {
      if (data.error) {
        console.error(that._data.error.message);
        fail(reject);
      } else {
        success(data, resolve);
      }
    });
  });
};

/**
 * @private
 */
I3SDataProvider.prototype._binarizeGltf = function (rawGltf) {
  const encoder = new TextEncoder();
  const rawGltfData = encoder.encode(JSON.stringify(rawGltf));
  const binaryGltfData = new Uint8Array(rawGltfData.byteLength + 20);
  const binaryGltf = {
    magic: new Uint8Array(binaryGltfData.buffer, 0, 4),
    version: new Uint32Array(binaryGltfData.buffer, 4, 1),
    length: new Uint32Array(binaryGltfData.buffer, 8, 1),
    chunkLength: new Uint32Array(binaryGltfData.buffer, 12, 1),
    chunkType: new Uint32Array(binaryGltfData.buffer, 16, 1),
    chunkData: new Uint8Array(
      binaryGltfData.buffer,
      20,
      rawGltfData.byteLength
    ),
  };

  binaryGltf.magic[0] = "g".charCodeAt();
  binaryGltf.magic[1] = "l".charCodeAt();
  binaryGltf.magic[2] = "T".charCodeAt();
  binaryGltf.magic[3] = "F".charCodeAt();

  binaryGltf.version[0] = 2;
  binaryGltf.length[0] = binaryGltfData.byteLength;
  binaryGltf.chunkLength[0] = rawGltfData.byteLength;
  binaryGltf.chunkType[0] = 0x4e4f534a; // JSON
  binaryGltf.chunkData.set(rawGltfData);

  return binaryGltfData;
};

/**
 * @private
 */
I3SDataProvider.prototype._getDecoderTaskProcessor = function () {
  if (!defined(this._decoderTaskProcessor)) {
    const processor = new TaskProcessor("decodeI3S");
    this._taskProcessorReadyPromise = processor.initWebAssemblyModule({
      modulePath: "ThirdParty/Workers/draco_decoder_nodejs.js",
      wasmBinaryFile: "ThirdParty/draco_decoder.wasm",
    });

    this._decoderTaskProcessor = processor;
  }

  return this._decoderTaskProcessor;
};

function wgs84ToCartesian(long, lat, height) {
  return Ellipsoid.WGS84.cartographicToCartesian(
    new Cartographic(
      CesiumMath.toRadians(long),
      CesiumMath.toRadians(lat),
      height
    )
  );
}

function longLatsToMeter(longitude1, latitude1, longitude2, latitude2) {
  const p1 = wgs84ToCartesian(longitude1, latitude1, 0);
  const p2 = wgs84ToCartesian(longitude2, latitude2, 0);

  return Cartesian3.distance(p1, p2);
}

/**
 * This class implements an I3S scene layer
 *
 * @alias I3SSceneLayer
 * @constructor
 *
 * @param {I3SDataProvider} dataProvider The data source that is the owner of this scene layer
 *
 * @private
 */
function I3SSceneLayer(dataProvider) {
  this._dataProvider = dataProvider;
  this._layerCollection = [];
  this._uri = "";
}

Object.defineProperties(I3SSceneLayer.prototype, {
  /**
   * Gets the collection of Layers.
   * @memberof I3SSceneLayer.prototype
   * @type {Array}
   */
  layers: {
    get: function () {
      return this._layerCollection;
    },
  },
  /**
   * Gets the URI of the scene layer.
   * @memberof I3SSceneLayer.prototype
   * @type {String}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SSceneLayer.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the data from the provided I3S Scene layer.
 * @param {String} uri The uri where to fetch the data from.
 */
I3SSceneLayer.prototype.load = function (uri) {
  const that = this;
  this._uri = uri;
  return this._dataProvider._loadJson(
    uri,
    function (data, resolve) {
      // Success
      that._data = data;
      const layerPromises = [];
      if (that._data.layers) {
        for (
          let layerIndex = 0;
          layerIndex < that._data.layers.length;
          layerIndex++
        ) {
          const newLayer = new I3SLayer(
            that,
            that._data.layers[layerIndex],
            layerIndex
          );
          that._layerCollection.push(newLayer);
          layerPromises.push(newLayer.load());
        }
      } else {
        const newLayer = new I3SLayer(that, that._data, that._data.id);
        that._layerCollection.push(newLayer);
        layerPromises.push(newLayer.load());
      }
      Promise.all(layerPromises).then(function () {
        that._computeExtent();

        if (that._dataProvider._autoCenterCameraOnStart) {
          that.centerCamera("topdown");
        }

        resolve();
      });
    },
    function (reject) {
      // Fail
      reject();
    }
  );
};

/**
 * Centers the camera at the center of the extent of the scene at an altitude of 10000m in topdown.
 * Or 1000m when in oblique.
 * @param {String} [mode] Use "topdown" to set the camera be top down, otherwise, the camera is set with a pitch 0f 0.2 radians.
 */
I3SSceneLayer.prototype.centerCamera = function (mode) {
  if (mode === "topdown") {
    this._dataProvider.camera.setView({
      destination: wgs84ToCartesian(
        this._extent.centerLongitude,
        this._extent.centerLatitude,
        10000.0
      ),
    });
  } else {
    this._dataProvider.camera.setView({
      destination: wgs84ToCartesian(
        this._extent.minLongitude,
        this._extent.minLatitude,
        1000.0
      ),
      orientation: {
        heading: Math.PI / 4,
        pitch: -0.2,
        roll: 0,
      },
    });
  }
};

function computeExtent(minLongitude, minLatitude, maxLongitude, maxLatitude) {
  const extent = {
    minLongitude: minLongitude,
    maxLongitude: maxLongitude,
    minLatitude: minLatitude,
    maxLatitude: maxLatitude,
  };

  // Compute the center
  extent.centerLongitude = (extent.maxLongitude + extent.minLongitude) / 2;
  extent.centerLatitude = (extent.maxLatitude + extent.minLatitude) / 2;

  // Compute the spans
  extent.longitudeSpan = longLatsToMeter(
    extent.minLongitude,
    extent.minLatitude,
    extent.maxLongitude,
    extent.minLatitude
  );

  extent.latitudeSpan = longLatsToMeter(
    extent.minLongitude,
    extent.minLatitude,
    extent.minLongitude,
    extent.maxLatitude
  );

  return extent;
}

/**
 * @private
 */
I3SSceneLayer.prototype._computeExtent = function () {
  let minLongitude = Number.MAX_VALUE;
  let maxLongitude = -Number.MAX_VALUE;
  let minLatitude = Number.MAX_VALUE;
  let maxLatitude = -Number.MAX_VALUE;

  // Compute the extent from all layers
  for (
    let layerIndex = 0;
    layerIndex < this._layerCollection.length;
    layerIndex++
  ) {
    if (
      (this._layerCollection[layerIndex]._data.store &&
        this._layerCollection[layerIndex]._data.store.extent) ||
      this._layerCollection[layerIndex]._data.fullExtent
    ) {
      const layerExtent = this._layerCollection[layerIndex]._data.fullExtent
        ? this._layerCollection[layerIndex]._data.fullExtent
        : this._layerCollection[layerIndex]._data.store.extent;
      if (layerExtent && this._layerCollection[layerIndex]._data.fullExtent) {
        minLongitude = Math.min(minLongitude, layerExtent.xmin);
        minLatitude = Math.min(minLatitude, layerExtent.ymin);
        maxLongitude = Math.max(maxLongitude, layerExtent.xmax);
        maxLatitude = Math.max(maxLatitude, layerExtent.ymax);
      } else if (
        layerExtent &&
        this._layerCollection[layerIndex]._data.store.extent
      ) {
        minLongitude = Math.min(minLongitude, layerExtent[0]);
        minLatitude = Math.min(minLatitude, layerExtent[1]);
        maxLongitude = Math.max(maxLongitude, layerExtent[2]);
        maxLatitude = Math.max(maxLatitude, layerExtent[3]);
      }
    }
    this._extent = computeExtent(
      minLongitude,
      minLatitude,
      maxLongitude,
      maxLatitude
    );
  }
};

/**
 * This class implements an I3S layer. Each I3SLayer creates a Cesium3DTileset.
 *
 * @alias I3SLayer
 * @constructor
 *
 * @param {I3SSceneLayer} sceneLayer The scene layer
 * @param {Object} layerData The layer data that is loaded from the scene layer
 * @param {Number} index The index of the layer to be reflected
 *
 * @private
 */
function I3SLayer(sceneLayer, layerData, index) {
  this._parent = sceneLayer;
  this._dataProvider = sceneLayer._dataProvider;

  if (!defined(layerData.href)) {
    // assign a default layer
    layerData.href = `./layers/${index}`;
  }

  this._uri = layerData.href;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }
  let tilesetUrl = "";
  if (`${sceneLayer._dataProvider._url}`.match(/layers\/\d/)) {
    tilesetUrl = `${sceneLayer._dataProvider._url}`.replace(/\/+$/, "");
  } else {
    // Add '/' to url if needed + `${this._uri}` if tilesetUrl not already in ../layers/[id] format
    tilesetUrl = `${sceneLayer._dataProvider._url}`
      .replace(/\/?$/, "/")
      .concat(`${this._uri}`);
  }
  this._completeUriWithoutQuery = tilesetUrl;
  this._completeUri = this._completeUriWithoutQuery + query;
  this._data = layerData;
  this._rootNode = null;
  this._nodePages = {};
  this._nodePageFetches = {};

  this._computeGeometryDefinitions(true);
}

Object.defineProperties(I3SLayer.prototype, {
  /**
   * Gets the uri for the layer.
   * @memberof I3SLayer.prototype
   * @type {String}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the layer.
   * @memberof I3SLayer.prototype
   * @type {String}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
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
   * Gets the nodes for this layer.
   * @memberof I3SLayer.prototype
   * @type {I3SNode}
   */
  nodes: {
    get: function () {
      return this._nodes;
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

function getCoveredTiles(terrainProvider, extents) {
  return terrainProvider.readyPromise.then(function () {
    return getTiles(terrainProvider, extents);
  });
}

function getTiles(terrainProvider, extents) {
  const tilingScheme = terrainProvider.tilingScheme;

  // Sort points into a set of tiles
  const tileRequests = []; // Result will be an Array as it's easier to work with
  const tileRequestSet = {}; // A unique set

  const maxLevel = terrainProvider._lodCount;

  const minCorner = Cartographic.fromDegrees(
    extents.minLongitude,
    extents.minLatitude
  );
  const maxCorner = Cartographic.fromDegrees(
    extents.maxLongitude,
    extents.maxLatitude
  );
  const minCornerXY = tilingScheme.positionToTileXY(minCorner, maxLevel);
  const maxCornerXY = tilingScheme.positionToTileXY(maxCorner, maxLevel);

  // Get all the tiles in between
  for (let x = minCornerXY.x; x <= maxCornerXY.x; x++) {
    for (let y = minCornerXY.y; y <= maxCornerXY.y; y++) {
      const xy = new Cartesian2(x, y);
      const key = xy.toString();
      if (!tileRequestSet.hasOwnProperty(key)) {
        // When tile is requested for the first time
        const value = {
          x: xy.x,
          y: xy.y,
          level: maxLevel,
          tilingScheme: tilingScheme,
          terrainProvider: terrainProvider,
          positions: [],
        };
        tileRequestSet[key] = value;
        tileRequests.push(value);
      }
    }
  }

  // Send request for each required tile
  const tilePromises = [];
  for (let i = 0; i < tileRequests.length; ++i) {
    const tileRequest = tileRequests[i];
    const requestPromise = tileRequest.terrainProvider.requestTileGeometry(
      tileRequest.x,
      tileRequest.y,
      tileRequest.level
    );

    tilePromises.push(requestPromise);
  }

  return Promise.all(tilePromises).then(function (heightMapBuffers) {
    const heightMaps = [];
    for (let i = 0; i < heightMapBuffers.length; i++) {
      const options = {
        tilingScheme: tilingScheme,
        x: tileRequests[i].x,
        y: tileRequests[i].y,
        level: tileRequests[i].level,
      };
      const heightMap = heightMapBuffers[i];

      let projectionType = "Geographic";
      if (tilingScheme._projection instanceof WebMercatorProjection) {
        projectionType = "WebMercator";
      }

      const heightMapData = {
        projectionType: projectionType,
        projection: tilingScheme._projection,
        nativeExtent: tilingScheme.tileXYToNativeRectangle(
          options.x,
          options.y,
          options.level
        ),
        height: heightMap._height,
        width: heightMap._width,
        scale: heightMap._structure.heightScale,
        offset: heightMap._structure.heightOffset,
      };

      if (heightMap._encoding === HeightmapEncoding.LERC) {
        const result = Lerc.decode(heightMap._buffer);
        heightMapData.buffer = result.pixels[0];
      } else {
        heightMapData.buffer = heightMap._buffer;
      }

      heightMaps.push(heightMapData);
    }

    return heightMaps;
  });
}

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

    that._computeExtent();

    // Load tiles from arcgis
    const geoidTerrainProvider = that._dataProvider._geoidTiledTerrainProvider;
    let geoidDataList = [];
    const dataIsReadyPromise = new Promise(function (resolve, reject) {
      if (defined(geoidTerrainProvider)) {
        geoidTerrainProvider._readyPromise.then(function () {
          const tilesReadyPromise = getCoveredTiles(
            geoidTerrainProvider,
            that._extent
          );
          tilesReadyPromise.then(function (heightMaps) {
            geoidDataList = heightMaps;
            resolve();
          });
        });
      } else {
        console.log(
          "No Geoid Terrain service provided - no geoid conversion will be performed."
        );
        resolve();
      }
    });

    dataIsReadyPromise.then(function () {
      that._dataProvider._geoidDataList = geoidDataList;

      that._loadNodePage(0).then(function () {
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

  return this._rootNode.load(true);
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
    if (defined(that._nodePages[page])) {
      resolve();
    } else if (defined(that._nodePageFetches[page])) {
      that._nodePageFetches[page]._promise = that._nodePageFetches[
        page
      ]._promise.then(function () {
        resolve();
      });
    } else {
      let query = "";
      if (that._dataProvider._query && that._dataProvider._query !== "") {
        query = `?${that._dataProvider._query}`;
      }

      const nodePageURI = `${that._completeUriWithoutQuery}/nodepages/${page}${query}`;

      that._nodePageFetches[page] = {};
      that._nodePageFetches[page]._promise = new Promise(function (
        resolve,
        reject
      ) {
        that._nodePageFetches[page]._resolve = resolve;
      });

      const _resolve = function () {
        // resolve the chain of promises
        that._nodePageFetches[page]._resolve();
        delete that._nodePageFetches[page];
        resolve();
      };

      Resource.fetchJson(nodePageURI)
        .then(function (data) {
          if (data.error && data.error.code !== 200) {
            _resolve();
          } else {
            that._nodePages[page] = data.nodes;
            _resolve();
          }
        })
        .catch(function () {
          _resolve();
        });
    }
  });
};

/**
 * @private
 */
I3SLayer.prototype._computeExtent = function () {
  const layerExtent = this._data.fullExtent
    ? this._data.fullExtent
    : this._data.store.extent;
  if (layerExtent && this._data.fullExtent) {
    this._extent = computeExtent(
      layerExtent.xmin,
      layerExtent.ymin,
      layerExtent.xmax,
      layerExtent.ymax
    );
  } else if (layerExtent && this._data.store.extent) {
    this._extent = computeExtent(
      layerExtent[0],
      layerExtent[1],
      layerExtent[2],
      layerExtent[3]
    );
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

  let tilesetOptions = {};
  if (defined(this._dataProvider._cesium3dTilesetOptions)) {
    tilesetOptions = this._dataProvider._cesium3dTilesetOptions;
  }
  tilesetOptions.url = inPlaceTilesetURL;

  this._tileset = new Cesium3DTileset(tilesetOptions);

  this._tileset._isI3STileSet = true;

  const that = this;
  this._tileset.readyPromise.then(function () {
    that._tileset.tileLoad.addEventListener(function (tile) {});

    that._tileset.tileUnload.addEventListener(function (tile) {
      tile._i3sNode._clearGeometryData();
      URL.revokeObjectURL(tile._contentResource._url);
      tile._contentResource._url = tile._i3sNode._completeUriWithoutQuery;
    });

    that._tileset.tileVisible.addEventListener(function (tile) {
      if (tile._i3sNode) {
        tile._i3sNode._loadChildren();
      }
    });
  });
};
// Reimplement Cesium3DTile.prototype.requestContent so that
// We get a chance to load our own gltf from I3S data
Cesium3DTile.prototype._hookedRequestContent =
  Cesium3DTile.prototype.requestContent;

/**
 * @private
 */
Cesium3DTile.prototype._resolveHookedObject = function () {
  const that = this;
  // Keep a handle on the early promises
  // Call the real requestContent function
  this._hookedRequestContent();

  // Fulfill the promises
  this._contentReadyToProcessPromise.then(function () {
    that._contentReadyToProcessDefer.resolve();
  });

  this._contentReadyPromise.then(function (content) {
    that._isLoading = false;
    that._contentReadyDefer.resolve(content);
  });
};

Cesium3DTile.prototype.requestContent = function () {
  const that = this;
  if (!this.tileset._isI3STileSet) {
    return this._hookedRequestContent();
  }

  if (!this._isLoading) {
    this._isLoading = true;

    // Create early promises that will be fulfilled later
    this._contentReadyToProcessDefer = defer();
    this._contentReadyDefer = defer();
    this._contentReadyToProcessPromise = this._contentReadyToProcessDefer.promise;
    this._contentReadyPromise = this._contentReadyDefer.promise;

    this._i3sNode._scheduleCreateContentURL().then(function () {
      if (!that._contentResource._originalUrl) {
        that._contentResource._originalUrl = that._contentResource._url;
      }

      that._contentResource._url = that._i3sNode._glbURL;
      that._resolveHookedObject();
    });

    // Returns the number of requests
    return 0;
  }

  return 1;
};

Object.defineProperties(Cesium3DTile.prototype, {
  /**
   * Gets the I3S Node for the tile content.
   * @memberof Batched3DModel3DTileContent.prototype
   * @type {String}
   */
  i3sNode: {
    get: function () {
      return this._i3sNode;
    },
  },
});

export default I3SDataProvider;
