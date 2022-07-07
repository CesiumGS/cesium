/**
 * This code implements support for I3S 1.6 and 1.7 in the Cesium viewer. It allows the user
 * to access a scene server URL and load it inside of the Cesium viewer.
 *
 * When the scene server is initialized, and the loadURL function invoked, it do the following:
 *
 * Load the data at the scene server level
 * Load all layers data
 * For each layer, create a Cesium 3D Tile Set and load the root node
 *  When the root node is imported, it creates a Cesium 3D tile that is parented to the Cesium 3D tile set
 *  Load all children of the root node
 *  for each children
 *   Create a place holder 3D tile so that the LOD display can know about it and display as needed
 *   When the LOD display decides that a Cesium 3D tile is visible, it invokes requestContent on it
 *   At that moment, we intercept the call to requestContent, and we load the geometry in I3S format
 *   That geometry is transcoded on the fly to gltf format and ingested by Cesium
 *   When the geometry is loaded, we then load all children of this node as placeholders so that the LOD
 *   can know about them too
 *
 * About transcoding:
 *
 * We use web workers to transcode I3S geometries into Cesium GLTF
 * The steps are:
 *
 * Decode geometry attributes (positions, normals, etc..) either from DRACO or Binary format
 * Convert heights for all vertices from Orthometric to Ellipsoidal
 * Transform vertex coordinates from LONG/LAT/HEIGHT to Cartesian in local space and
 * scale appropriately if specified in the attribute metadata
 * Crop UVs if UV regions are defined in the attribute metadata
 * Create a GLTF document in memory that will be ingested as part of a glb payload
 *
 * About GEOID data:
 *
 * We provide the ability to use GEOID data to convert heights from orthometric to ellipsoidal.
 * The i3S data source uses a tiled elevation terrain provider to access the geoid tiles.
 * The sandcastle example below shows how to set the terrain provider service if required.
 *
 */

/// Sandcastle example:
/*
// Create a Viewer instances and add the Scene's primitives.
let viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    timeline: false,
});
viewer.clock.shouldAnimate = false;
let tours = {
    "Frankfurt": "https://tiles.arcgis.com/tiles/u0sSNqDXr7puKJrF/arcgis/rest/services/Frankfurt2017_v17/SceneServer"
    };
// Initialize the terrain provider which provides the geoid conversion
// If this is not specified, or the URL is invalid no geoid conversion will be applied.
let geoidService = new Cesium.ArcGISTiledElevationTerrainProvider({
    url : "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer",
});
let i3sOptions = {
    traceFetches : false, // for tracing I3S fetches
    autoCenterCameraOnStart : true, // auto center to the location of the i3s
    geoidTiledTerrainProvider : geoidService,  // pass the geoid service
};
let cesiumTilesetOptions = {
    show : true,
    skipLevelOfDetail : true,
    maximumScreenSpaceError : 16,
};
let dataProvider = new Cesium.I3SDataProvider("", viewer.scene, i3sOptions, cesiumTilesetOptions);
dataProvider.camera = viewer.camera; // for debug
dataProvider
    .loadUrl(tours["Frankfurt"])
    .then(function () {
    });
viewer.scene.primitives.add(dataProvider);
// Silhouette a feature on selection and show metadata in the InfoBox.
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(
    movement
) {
    // Pick a new feature
    let pickedFeature = viewer.scene.pick(movement.position);
    if (!Cesium.defined(pickedFeature)) {
        return;
    }
    let pickedPosition = viewer.scene.pickPosition(movement.position);
    if (pickedFeature && pickedFeature.content &&
        pickedFeature.content.i3sNode) {
        let i3sNode = pickedFeature.content.i3sNode;
        i3sNode.loadFields().then(function() {
            console.log(i3sNode);
            let geometry = i3sNode.geometryData[0];
            console.log(geometry);
            if (pickedPosition) {
                const location = geometry.getClosestPointIndexOnTriangle(
                    pickedPosition.x, pickedPosition.y, pickedPosition.z);
                console.log("Location", location);
                if (location.index !== -1 && geometry.customAttributes["feature-index"]) {
                    const featureIndex = geometry.customAttributes["feature-index"][location.index];
                    for (let fieldName=0; fieldName < i3sNode.fields.length; fieldName++) {
                        const field = i3sNode.fields[fieldName];
                        console.log(field.name + ": " + field.values[featureIndex]);
                    }
                }
            }
        });
    }
    console.log(viewer.scene.camera);
},
    Cesium.ScreenSpaceEventType.LEFT_CLICK);
*/

import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTile from "../Scene/Cesium3DTile.js";
import Cesium3DTileset from "../Scene/Cesium3DTileset.js";
import CesiumMath from "../Core/Math.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import Event from "../Core/Event.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import HeightmapEncoding from "../Core/HeightmapEncoding.js";
import Lerc from "../ThirdParty/lerc.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import Resource from "../Core/Resource.js";
import TaskProcessor from "../Core/TaskProcessor.js";
import Transforms from "../Core/Transforms.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";

// Maps i3Snode by URI

// Code traces
// set to true to turn on code tracing for debugging purposes
const _tracecode = false;
let traceCode = function () {};
if (_tracecode) {
  traceCode = console.log;
}

/**
 * This class implements using an I3S scene server as a Cesium data source. The URL
 * that is used for loadUrl should return a scene object. Currently supported I3S
 * versions are 1.6 and 1.7. I3SDataProvider is the main public class for I3S support.
 * All other classes in this source file implement the Object Model for the I3S entities,
 * which may at some point have more public interfaces if further introspection or
 * customization need to be added.
 * @alias I3SDataProvider
 * @constructor
 *
 * @param {String} [name] The name of this data source.  If undefined, a name
 *                        will be derived from the url.
 * @param {Scene} [scene] The scene to populate with the tileset
 *
 *
 * @example
 * let i3sData = new I3SDataProvider();
 * i3sData.loadUrl('https://tiles.arcgis.com/tiles/u0sSNqDXr7puKJrF/arcgis/rest/services/Frankfurt2017_v17/SceneServer');
 * viewer.scene.primitives.add(i3sData);
 *
 * @example
 * let geoidService = new Cesium.ArcGISTiledElevationTerrainProvider({
 *   url : "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer",
 *   });
 * let dataProvider = new I3SDataProvider("", viewer.scene, {
 *   autoCenterCameraOnStart : true, // auto center to the location of the i3s
 *   geoidTiledTerrainProvider : geoidService,  // pass the geoid service
 *
 */

function I3SDataProvider(name, scene, options, cesium3dTilesetOptions) {
  //All public configuration is defined as ES5 properties
  //These are just the "private" variables and their defaults.
  this._name = name;
  this._changed = new Event();
  this._error = new Event();
  this._isLoading = false;
  this._loading = new Event();
  this._scene = scene;
  this._traceFetches = false;
  this._autoCenterCameraOnStart = false;
  this._cesium3dTilesetOptions = {};
  if (defined(cesium3dTilesetOptions)) {
    this._cesium3dTilesetOptions = cesium3dTilesetOptions;
  }

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  if (defined(options.traceFetches)) {
    this._traceFetches = options.traceFetches;
  }

  if (defined(options.autoCenterCameraOnStart)) {
    this._autoCenterCameraOnStart = options.autoCenterCameraOnStart;
  }

  if (defined(options.geoidTiledTerrainProvider)) {
    this._geoidTiledTerrainProvider = options.geoidTiledTerrainProvider;
  }
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
   * @type {bool}
   */
  traceFetches: {
    get: function () {
      return this._traceFetches;
    },
    set: function (value) {
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      this._traceFetches = value;
    },
  },
  /**
   * Gets or sets auto centering of the camera on the data set.
   * @memberof I3SDataProvider.prototype
   * @type {bool}
   */
  autoCenterCameraOnStart: {
    get: function () {
      return this._autoCenterCameraOnStart;
    },
    set: function (value) {
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      this._autoCenterCameraOnStart = value;
    },
  },

  /**
   * The terrain provider referencing the GEOID service to be used for orthometric to ellipsoidal conversion
   * @memberof Viewer.prototype
   *
   * @type {TerrainProvider}
   */
  geoidTiledServiceProvider: {
    get: function () {
      return this._geoidTiledServiceProvider;
    },
    set: function (value) {
      this.geoidTiledServiceProvider = value;
    },
  },
});

/**
 * Asynchronously loads the I3S scene at the provided url, replacing any existing data.
 * @param {Object} [url] The url to be processed.
 * @returns {Promise<void>} a promise that will resolve when the I3S scene is loaded.
 */
I3SDataProvider.prototype.loadUrl = function (url) {
  const parts = url.split("?");
  this._url = parts[0];
  this._query = parts[1];
  this._completeUrl = url;

  this._sceneServer = new I3SSceneServer(this);
  return this._sceneServer.load(this._completeUrl);
};

/**
 * Loads the provided data, replacing any existing data.
 * @param {Array} [data] The object to be processed.
 */
I3SDataProvider.prototype.load = function (data) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(data)) {
    throw new DeveloperError("data is required.");
  }
  //>>includeEnd('debug');

  //Clear out any data that might already exist.
  this._setLoading(true);
  const entities = this._entityCollection;

  //It's a good idea to suspend events when making changes to a
  //large amount of entities.  This will cause events to be batched up
  //into the minimal amount of function calls and all take place at the
  //end of processing (when resumeEvents is called).
  entities.suspendEvents();
  entities.removeAll();

  //Once all data is processed, call resumeEvents and raise the changed event.
  entities.resumeEvents();
  this._changed.raiseEvent(this);
  this._setLoading(false);
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see Primitive#isDestroyed
 */
I3SDataProvider.prototype.destroy = function () {
  for (let i = 0; i < this._sceneServer._layerCollection.length; i++) {
    this._sceneServer._layerCollection[i]._tileset.destroy();
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
 * @see Primitive#destroy
 */
I3SDataProvider.prototype.isDestroyed = function () {
  if (this._sceneServer._layerCollection.length !== 0) {
    return this._sceneServer._layerCollection[0]._tileset.isDestroyed();
  }

  return false;
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {DeveloperError} All instance geometries must have the same primitiveType.
 * @exception {DeveloperError} Appearance and material have a uniform with the same name.
 * @exception {DeveloperError} Primitive.modelMatrix is only supported in 3D mode.
 * @exception {RuntimeError} Vertex texture fetch support is required to render primitives with per-instance attributes. The maximum number of vertex texture image units must be greater than zero.
 */
I3SDataProvider.prototype.update = function (frameState) {
  for (let i = 0; i < this._sceneServer._layerCollection.length; i++) {
    if (
      typeof this._sceneServer._layerCollection[i]._tileset !== "undefined" &&
      this._sceneServer._layerCollection[i]._tileset.ready
    ) {
      this._sceneServer._layerCollection[i]._tileset.update(frameState);
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.prePassesUpdate = function (frameState) {
  for (let i = 0; i < this._sceneServer._layerCollection.length; i++) {
    if (
      typeof this._sceneServer._layerCollection[i]._tileset !== "undefined" &&
      this._sceneServer._layerCollection[i]._tileset.ready
    ) {
      this._sceneServer._layerCollection[i]._tileset.prePassesUpdate(
        frameState
      );
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.postPassesUpdate = function (frameState) {
  for (let i = 0; i < this._sceneServer._layerCollection.length; i++) {
    if (
      typeof this._sceneServer._layerCollection[i]._tileset !== "undefined" &&
      this._sceneServer._layerCollection[i]._tileset.ready
    ) {
      this._sceneServer._layerCollection[i]._tileset.postPassesUpdate(
        frameState
      );
    }
  }
};

/**
 * @private
 */
I3SDataProvider.prototype.updateForPass = function (frameState, passState) {
  for (let i = 0; i < this._sceneServer._layerCollection.length; i++) {
    if (
      typeof this._sceneServer._layerCollection[i]._tileset !== "undefined" &&
      this._sceneServer._layerCollection[i]._tileset.ready
    ) {
      this._sceneServer._layerCollection[i]._tileset.updateForPass(
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
      traceCode("I3S FETCH:", uri);
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
I3SDataProvider.prototype._binarizeGLTF = function (rawGLTF) {
  const encoder = new TextEncoder();
  const rawGLTFData = encoder.encode(JSON.stringify(rawGLTF));
  const binaryGLTFData = new Uint8Array(rawGLTFData.byteLength + 20);
  const binaryGLTF = {
    magic: new Uint8Array(binaryGLTFData.buffer, 0, 4),
    version: new Uint32Array(binaryGLTFData.buffer, 4, 1),
    length: new Uint32Array(binaryGLTFData.buffer, 8, 1),
    chunkLength: new Uint32Array(binaryGLTFData.buffer, 12, 1),
    chunkType: new Uint32Array(binaryGLTFData.buffer, 16, 1),
    chunkData: new Uint8Array(
      binaryGLTFData.buffer,
      20,
      rawGLTFData.byteLength
    ),
  };

  binaryGLTF.magic[0] = "g".charCodeAt();
  binaryGLTF.magic[1] = "l".charCodeAt();
  binaryGLTF.magic[2] = "T".charCodeAt();
  binaryGLTF.magic[3] = "F".charCodeAt();

  binaryGLTF.version[0] = 2;
  binaryGLTF.length[0] = binaryGLTFData.byteLength;
  binaryGLTF.chunkLength[0] = rawGLTFData.byteLength;
  binaryGLTF.chunkType[0] = 0x4e4f534a; // JSON
  binaryGLTF.chunkData.set(rawGLTFData);

  return binaryGLTFData;
};

/**
 * @private
 */
I3SDataProvider._getDecoderTaskProcessor = function () {
  if (!defined(I3SDataProvider._decoderTaskProcessor)) {
    const processor = new TaskProcessor("decodeI3S");
    I3SDataProvider._taskProcessorReadyPromise = processor.initWebAssemblyModule(
      {
        modulePath: "ThirdParty/Workers/draco_decoder_nodejs.js",
        wasmBinaryFile: "ThirdParty/draco_decoder.wasm",
      }
    );

    I3SDataProvider._decoderTaskProcessor = processor;
  }

  return I3SDataProvider._decoderTaskProcessor;
};

/**
 * @private
 */
function wgs84ToCartesian(long, lat, height) {
  return Ellipsoid.WGS84.cartographicToCartesian(
    new Cartographic(
      CesiumMath.toRadians(long),
      CesiumMath.toRadians(lat),
      height
    )
  );
}

/**
 * @private
 */
function longLatsToMeter(longitude1, latitude1, longitude2, latitude2) {
  const p1 = wgs84ToCartesian(longitude1, latitude1, 0);
  const p2 = wgs84ToCartesian(longitude2, latitude2, 0);

  return Cartesian3.distance(p1, p2);
}

/**
 * @private
 */
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

function bilinearInterpolate(tx, ty, h00, h10, h01, h11) {
  const a = h00 * (1 - tx) + h10 * tx;
  const b = h01 * (1 - tx) + h11 * tx;
  return a * (1 - ty) + b * ty;
}

function sampleMap(u, v, width, data) {
  const address = u + v * width;
  return data[address];
}

function sampleGeoid(sampleX, sampleY, geoidData) {
  const extent = geoidData.nativeExtent;
  let x =
    ((sampleX - extent.west) / (extent.east - extent.west)) *
    (geoidData.width - 1);
  let y =
    ((sampleY - extent.south) / (extent.north - extent.south)) *
    (geoidData.height - 1);
  const xi = Math.floor(x);
  let yi = Math.floor(y);

  x -= xi;
  y -= yi;

  const xNext = xi < geoidData.width ? xi + 1 : xi;
  let yNext = yi < geoidData.height ? yi + 1 : yi;

  yi = geoidData.height - 1 - yi;
  yNext = geoidData.height - 1 - yNext;

  const h00 = sampleMap(xi, yi, geoidData.width, geoidData.buffer);
  const h10 = sampleMap(xNext, yi, geoidData.width, geoidData.buffer);
  const h01 = sampleMap(xi, yNext, geoidData.width, geoidData.buffer);
  const h11 = sampleMap(xNext, yNext, geoidData.width, geoidData.buffer);

  let finalHeight = bilinearInterpolate(x, y, h00, h10, h01, h11);
  finalHeight = finalHeight * geoidData.scale + geoidData.offset;
  return finalHeight;
}

/**
 * This class implements an I3S scene server
 * @private
 * @alias I3SSceneServer
 * @param {I3SDataProvider} [dataProvider] The data source that is the
 * owner of this scene server
 * @constructor
 */
function I3SSceneServer(dataProvider) {
  this._dataProvider = dataProvider;
  this._entities = {};
  this._layerCollection = [];
  this._uri = "";
}

Object.defineProperties(I3SSceneServer.prototype, {
  /**
   * Gets the collection of Layers.
   * @memberof I3SSceneServer.prototype
   * @type {Array}
   */
  layers: {
    get: function () {
      return this._layerCollection;
    },
  },
  /**
   * Gets the URI of the scene server.
   * @memberof I3SSceneServer.prototype
   * @type {String}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SSceneServer.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the provided data on the server.
 * @param {String} [uri] The uri where to fetch the data from.
 */
I3SSceneServer.prototype.load = function (uri) {
  const that = this;
  this._uri = uri;
  return this._dataProvider._loadJson(
    uri,
    function (data, resolve) {
      // Success
      that._data = data;
      const layerPromises = [];
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
I3SSceneServer.prototype.centerCamera = function (mode) {
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

/**
 * @private
 */
I3SSceneServer.prototype._computeExtent = function () {
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
      this._layerCollection[layerIndex]._data.store &&
      this._layerCollection[layerIndex]._data.store.extent
    ) {
      const layerExtent = this._layerCollection[layerIndex]._data.store.extent;
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
};

/**
 * This class implements an I3S layer, in Cesium, each I3SLayer
 * creates a Cesium3DTileset
 * @private
 * @alias I3SLayer
 * @constructor
 * @param {I3SSceneServer} [sceneServer] The scene server that is the
 * container for this layer
 * @param {object} [layerData] The layer data that is loaded from the scene
 * server
 * @param {number} [index] The index of the layer to be reflected
 */
function I3SLayer(sceneServer, layerData, index) {
  this._parent = sceneServer;
  this._dataProvider = sceneServer._dataProvider;

  if (layerData.href === undefined) {
    // assign a default layer
    layerData.href = `./layers/${index}`;
  }

  this._uri = layerData.href;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }
  this._completeUriWithoutQuery = `${sceneServer._dataProvider._url}/${this._uri}`;
  this._completeUri = this._completeUriWithoutQuery + query;

  this._data = layerData;
  this._entities = {};
  this._rootNode = null;
  this._nodePages = {};
  this._nodePageFetches = {};

  this._computeGeometryDefinitions(true);
}

Object.defineProperties(I3SLayer.prototype, {
  /**
   * Gets the uri for the layer.
   * @memberof I3SLayer.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the layer.
   * @memberof I3SLayer.prototype
   * @type {string}
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

/**
 * @private
 */
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

  //Get all the tiles in between
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

    //Load tiles from arcgis
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
      console.log("Starting to load visual elements");

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
    if (this._data.nodePages.rootIndex !== undefined) {
      rootIndex = this._data.nodePages.rootIndex;
    }
    this._rootNode = new I3SNode(this, rootIndex);
  } else {
    this._rootNode = new I3SNode(this, this._data.store.rootNode);
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
    if (that._nodePages[page] !== undefined) {
      resolve();
    } else if (that._nodePageFetches[page] !== undefined) {
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
  const layerExtent = this._data.store.extent;
  this._extent = computeExtent(
    layerExtent[0],
    layerExtent[1],
    layerExtent[2],
    layerExtent[3]
  );
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

/**
 * This class implements an I3S Node, in Cesium, each I3SNode
 * creates a Cesium3DTile
 * @private
 * @alias I3SNode
 * @constructor
 * @param {I3SLayer|I3SNode} [parent] The parent of that node
 * @param {String|Number} [ref] The uri or nodepage index to load the data from
 */
function I3SNode(parent, ref) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;

  if (this._parent instanceof I3SNode) {
    this._level = this._parent._level + 1;
  } else {
    this._level = 0;
  }

  // attach the current layer
  if (this._parent instanceof I3SLayer) {
    this._layer = this._parent;
  } else {
    this._layer = this._parent._layer;
  }

  if (this._level === 0) {
    if (typeof ref === "number") {
      this._nodeIndex = ref;
    } else {
      this._uri = ref;
    }
  } else if (typeof ref === "number") {
    this._nodeIndex = ref;
  } else {
    this._uri = ref;
  }

  if (this._uri !== undefined) {
    let query = "";
    if (this._dataProvider._query && this._dataProvider._query !== "") {
      query = `?${this._dataProvider._query}`;
    }

    this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  }

  this._entities = {};
  this._tile = null;
  this._geometryData = [];
  this._featureData = [];
  this._fields = {};
  this._children = [];
}

Object.defineProperties(I3SNode.prototype, {
  /**
   * Gets the uri for the node.
   * @memberof I3SNode.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the node.
   * @memberof I3SNode.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the parent layer
   * @memberof I3SNode.prototype
   * @type {Object}
   */
  layer: {
    get: function () {
      return this._layer;
    },
  },
  /**
   * Gets the parent node
   * @memberof I3SNode.prototype
   * @type {Object}
   */
  parent: {
    get: function () {
      return this._parent;
    },
  },
  /**
   * Gets the children nodes
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  children: {
    get: function () {
      return this._children;
    },
  },
  /**
   * Gets the collection of geometries
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  geometryData: {
    get: function () {
      return this._geometryData;
    },
  },
  /**
   * Gets the collection of features
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  featureData: {
    get: function () {
      return this._featureData;
    },
  },
  /**
   * Gets the collection of fields
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  fields: {
    get: function () {
      return this._fields;
    },
  },
  /**
   * Gets the Cesium3DTileSet for this layer.
   * @memberof I3SNode.prototype
   * @type {I3SNode}
   */
  tile: {
    get: function () {
      return this._tile;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SNode.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the node definition.
 * @returns {Promise<void>} a promise that is resolved when the I3S Node data is loaded
 */
I3SNode.prototype.load = function (isRoot) {
  const that = this;

  function processData() {
    if (!isRoot) {
      // Create a new tile
      const tileDefinition = that._create3DTileDefinition();

      const tileBlob = new Blob([JSON.stringify(tileDefinition)], {
        type: "application/json",
      });

      const inPlaceTileURL = URL.createObjectURL(tileBlob);
      const resource = Resource.createIfNeeded(inPlaceTileURL);

      that._tile = new Cesium3DTile(
        that._layer._tileset,
        resource,
        tileDefinition,
        that._parent._tile
      );

      that._tile._i3sNode = that;
    }
  }

  // if we don't have a nodepage index load from json
  if (this._nodeIndex === undefined) {
    return this._dataProvider._loadJson(
      this._completeUri,
      function (data, resolve) {
        // Success
        that._data = data;
        processData();
        resolve();
      },
      function (reject) {
        // Fail
        reject();
      }
    );
  }

  return new Promise(function (resolve, reject) {
    that._layer._getNodeInNodePages(that._nodeIndex).then(function (data) {
      that._data = data;

      const pageSize = that._layer._data.nodePages.nodesPerPage;
      const node =
        that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
          that._nodeIndex % pageSize
        ];
      if (isRoot) {
        that._uri = "nodes/root";
      } else if (node.mesh !== undefined) {
        const uriIndex =
          that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
            that._nodeIndex % pageSize
          ].mesh.geometry.resource;
        that._uri = `../${uriIndex}`;
      }
      if (that._uri !== undefined) {
        that._completeUriWithoutQuery = `${that._parent._completeUriWithoutQuery}/${that._uri}`;
        let query = "";
        if (that._dataProvider._query && that._dataProvider._query !== "") {
          query = `?${that._dataProvider._query}`;
        }
        that._completeUri = that._completeUriWithoutQuery + query;
      }

      processData();
      resolve();
    });
  });
};

/**
 * Loads the node fields.
 * @returns {Promise<void>} a promise that is resolved when the I3S Node fields are loaded
 */
I3SNode.prototype.loadFields = function () {
  // check if we must load fields
  const fields = this._layer._data.attributeStorageInfo;

  const that = this;
  function createAndLoadField(fields, index) {
    const newField = new I3SField(that, fields[index]);
    that._fields[newField._storageInfo.name] = newField;
    return newField.load();
  }

  const promises = [];
  if (fields) {
    for (let i = 0; i < fields.length; i++) {
      promises.push(createAndLoadField(fields, i));
    }
  }

  return Promise.all(promises);
};

/**
 * @private
 */
I3SNode.prototype._loadChildren = function (waitAllChildren) {
  const that = this;
  return new Promise(function (resolve, reject) {
    if (!that._childrenAreLoaded) {
      that._childrenAreLoaded = true;
      const childPromises = [];
      if (that._data.children) {
        for (
          let childIndex = 0;
          childIndex < that._data.children.length;
          childIndex++
        ) {
          const child = that._data.children[childIndex];
          const newChild = new I3SNode(that, child.href ? child.href : child);
          that._children.push(newChild);
          const childIsLoaded = newChild.load();
          if (waitAllChildren) {
            childPromises.push(childIsLoaded);
          }
          childIsLoaded.then(
            (function (theChild) {
              return function () {
                that._tile.children.push(theChild._tile);
              };
            })(newChild)
          );
        }
        if (waitAllChildren) {
          Promise.all(childPromises).then(function () {
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
};

/**
 * @private
 */
I3SNode.prototype._loadGeometryData = function () {
  const geometryPromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (this._data.geometryData) {
    for (
      let geomIndex = 0;
      geomIndex < this._data.geometryData.length;
      geomIndex++
    ) {
      const curGeometryData = new I3SGeometry(
        this,
        this._data.geometryData[geomIndex].href
      );
      this._geometryData.push(curGeometryData);
      geometryPromises.push(curGeometryData.load());
    }
  } else if (this._data.mesh) {
    const geometryDefinition = this._layer._findBestGeometryBuffers(
      this._data.mesh.geometry.definition,
      ["position", "uv0"]
    );

    const geometryURI = `./geometries/${geometryDefinition.bufferIndex}`;
    const newGeometryData = new I3SGeometry(this, geometryURI);
    newGeometryData._geometryDefinitions = geometryDefinition.definition;
    newGeometryData._geometryBufferInfo = geometryDefinition.geometryBufferInfo;
    this._geometryData.push(newGeometryData);
    geometryPromises.push(newGeometryData.load());
  }

  return Promise.all(geometryPromises);
};

/**
 * @private
 */
I3SNode.prototype._loadFeatureData = function () {
  const featurePromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (this._data.featureData) {
    for (
      let featureIndex = 0;
      featureIndex < this._data.featureData.length;
      featureIndex++
    ) {
      const newfeatureData = new I3SFeature(
        this,
        this._data.featureData[featureIndex].href
      );
      this._featureData.push(newfeatureData);
      featurePromises.push(newfeatureData.load());
    }
  }

  return Promise.all(featurePromises);
};

/**
 * @private
 */
I3SNode.prototype._clearGeometryData = function () {
  this._geometryData = [];
};

/**
 * @private
 */
I3SNode.prototype._create3DTileDefinition = function () {
  const obb = this._data.obb;
  const mbs = this._data.mbs;

  let boundingVolume = {};
  let geoPosition;
  let position;

  if (obb) {
    geoPosition = Cartographic.fromDegrees(
      obb.center[0],
      obb.center[1],
      obb.center[2]
    );
  } else if (mbs) {
    geoPosition = Cartographic.fromDegrees(mbs[0], mbs[1], mbs[2]);
  }

  //Offset bounding box position if we have a geoid service defined
  if (
    defined(this._dataProvider._geoidTiledTerrainProvider) &&
    defined(geoPosition)
  ) {
    for (let i = 0; i < this._dataProvider._geoidDataList.length; i++) {
      const tile = this._dataProvider._geoidDataList[i];
      const projectedPos = tile.projection.project(geoPosition);
      if (
        projectedPos.x > tile.nativeExtent.west &&
        projectedPos.x < tile.nativeExtent.east &&
        projectedPos.y > tile.nativeExtent.south &&
        projectedPos.y < tile.nativeExtent.north
      ) {
        geoPosition.height += sampleGeoid(projectedPos.x, projectedPos.y, tile);
        break;
      }
    }
  }

  if (obb) {
    boundingVolume = {
      box: [
        0,
        0,
        0,
        obb.halfSize[0],
        0,
        0,
        0,
        obb.halfSize[1],
        0,
        0,
        0,
        obb.halfSize[2],
      ],
    };
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
  } else if (mbs) {
    boundingVolume = {
      sphere: [0, 0, 0, mbs[3]],
    };
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
  } else {
    console.error(this);
  }

  // compute the geometric error
  let metersPerPixel = Infinity;

  let span = 0;
  if (this._data.mbs) {
    span = this._data.mbs[3];
  } else if (this._data.obb) {
    span = Math.max(
      Math.max(this._data.obb.halfSize[0], this._data.obb.halfSize[1]),
      this._data.obb.halfSize[2]
    );
  }

  // get the meters/pixel density required to pop the next LOD
  if (this._data.lodThreshold !== undefined) {
    if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThresholdSQ"
    ) {
      const maxScreenThreshold =
        Math.sqrt(this._data.lodThreshold) / (Math.PI * 0.25);
      metersPerPixel = span / maxScreenThreshold;
    } else if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThreshold"
    ) {
      const maxScreenThreshold = this._data.lodThreshold;
      metersPerPixel = span / maxScreenThreshold;
    } else {
      //Other LOD selection types can only be used for point cloud data
      console.error("Invalid lodSelectionMetricType in Layer");
    }
  } else if (this._data.lodSelection !== undefined) {
    for (
      let lodIndex = 0;
      lodIndex < this._data.lodSelection.length;
      lodIndex++
    ) {
      if (
        this._data.lodSelection[lodIndex].metricType === "maxScreenThreshold"
      ) {
        metersPerPixel = span / this._data.lodSelection[lodIndex].maxError;
      }
    }
  }

  if (metersPerPixel === Infinity) {
    metersPerPixel = 100000;
  }

  // calculate the length of 16 pixels in order to trigger the screen space error
  const geometricError = metersPerPixel * 16;

  // transformations
  const hpr = new HeadingPitchRoll(0, 0, 0);
  let orientation = Transforms.headingPitchRollQuaternion(position, hpr);

  if (this._data.obb) {
    orientation = new Quaternion(
      this._data.obb.quaternion[0],
      this._data.obb.quaternion[1],
      this._data.obb.quaternion[2],
      this._data.obb.quaternion[3]
    );
  }

  this._rotationMatrix = Matrix3.fromQuaternion(orientation);
  this._inverseRotationMatrix = new Matrix3();
  Matrix3.inverse(this._rotationMatrix, this._inverseRotationMatrix);

  this._globalTransforms = new Matrix4(
    this._rotationMatrix[0],
    this._rotationMatrix[1],
    this._rotationMatrix[2],
    0,
    this._rotationMatrix[3],
    this._rotationMatrix[4],
    this._rotationMatrix[5],
    0,
    this._rotationMatrix[6],
    this._rotationMatrix[7],
    this._rotationMatrix[8],
    0,
    position.x,
    position.y,
    position.z,
    1
  );

  this.inverseGlobalTransform = new Matrix4();
  Matrix4.inverse(this._globalTransforms, this.inverseGlobalTransform);

  const localTransforms = this._globalTransforms.clone();

  if (this._parent._globalTransforms) {
    Matrix4.multiply(
      this._globalTransforms,
      this._parent.inverseGlobalTransform,
      localTransforms
    );
  }

  // get children definition
  const childrenDefinition = [];
  for (let childIndex = 0; childIndex < this._children.length; childIndex++) {
    childrenDefinition.push(
      this._children[childIndex]._create3DTileDefinition()
    );
  }

  // Create a tile set
  const inPlaceTileDefinition = {
    children: childrenDefinition,
    refine: "REPLACE",
    boundingVolume: boundingVolume,
    transform: [
      localTransforms[0],
      localTransforms[4],
      localTransforms[8],
      localTransforms[12],
      localTransforms[1],
      localTransforms[5],
      localTransforms[9],
      localTransforms[13],
      localTransforms[2],
      localTransforms[6],
      localTransforms[10],
      localTransforms[14],
      localTransforms[3],
      localTransforms[7],
      localTransforms[11],
      localTransforms[15],
    ],
    content: {
      uri: this._completeUriWithoutQuery,
    },
    geometricError: geometricError,
  };

  return inPlaceTileDefinition;
};

/**
 * @private
 */
I3SNode.prototype._scheduleCreateContentURL = function () {
  const that = this;
  return new Promise(function (resolve, reject) {
    that._createContentURL(resolve, that._tile);
  });
};

function createI3SDecoderTask(data) {
  // Prepare the data to send to the worker
  const parentData = data.geometryData._parent._data;
  const parentRotationInverseMatrix =
    data.geometryData._parent._inverseRotationMatrix;

  const center = {
    long: 0,
    lat: 0,
    alt: 0,
  };

  if (parentData.obb) {
    center.long = parentData.obb.center[0];
    center.lat = parentData.obb.center[1];
    center.alt = parentData.obb.center[2];
  } else if (parentData.mbs) {
    center.long = parentData.mbs[0];
    center.lat = parentData.mbs[1];
    center.alt = parentData.mbs[2];
  }

  const axisFlipRotation = Matrix3.fromRotationX(-Math.PI / 2);
  const parentRotation = new Matrix3();

  Matrix3.multiply(
    axisFlipRotation,
    parentRotationInverseMatrix,
    parentRotation
  );

  const payload = {
    binaryData: data.geometryData._data,
    featureData:
      data.featureData && data.featureData[0] ? data.featureData[0].data : null,
    schema: data.defaultGeometrySchema,
    bufferInfo: data.geometryData._geometryBufferInfo,
    ellipsoidRadiiSquare: Ellipsoid.WGS84._radiiSquared,
    url: data.url,
    geoidDataList: data.geometryData._dataProvider._geoidDataList,
    cartographicCenter: center,
    cartesianCenter: wgs84ToCartesian(center.long, center.lat, center.alt),
    parentRotation: parentRotation,
  };

  const decodeI3STaskProcessor = I3SDataProvider._getDecoderTaskProcessor();

  const transferrableObjects = [];
  return I3SDataProvider._taskProcessorReadyPromise.then(function () {
    return decodeI3STaskProcessor.scheduleTask(payload, transferrableObjects);
  });
}

/**
 * @private
 */
I3SNode.prototype._createContentURL = function (resolve, tile) {
  let rawGLTF = {
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    nodes: [
      {
        name: "singleNode",
      },
    ],
    meshes: [],
    buffers: [],
    bufferViews: [],
    accessors: [],
    materials: [],
    textures: [],
    images: [],
    samplers: [],
    asset: {
      version: "2.0",
    },
  };

  // Load the geometry data
  const dataPromises = [this._loadFeatureData(), this._loadGeometryData()];

  const that = this;
  Promise.all(dataPromises).then(function () {
    // Binary GLTF
    const generateGLTF = new Promise(function (resolve, reject) {
      if (that._geometryData && that._geometryData.length > 0) {
        const parameters = {
          geometryData: that._geometryData[0],
          featureData: that._featureData,
          defaultGeometrySchema: that._layer._data.store.defaultGeometrySchema,
          url: that._geometryData[0]._completeUri,
          tile: that._tile,
        };

        const task = createI3SDecoderTask(parameters);
        if (!defined(task)) {
          // Postponed
          resolve();
          return;
        }

        task.then(function (result) {
          rawGLTF = parameters.geometryData._generateGLTF(
            result.meshData.nodesInScene,
            result.meshData.nodes,
            result.meshData.meshes,
            result.meshData.buffers,
            result.meshData.bufferViews,
            result.meshData.accessors
          );

          that._geometryData[0].customAttributes =
            result.meshData.customAttributes;
          resolve();
        });
      } else {
        resolve();
      }
    });

    generateGLTF.then(function () {
      const binaryGLTFData = that._dataProvider._binarizeGLTF(rawGLTF);
      const glbDataBlob = new Blob([binaryGLTFData], {
        type: "application/binary",
      });
      that._glbURL = URL.createObjectURL(glbDataBlob);
      resolve();
    });
  });
};

/**
 * This class implements an I3S Feature
 * @public
 * @alias I3SFeature
 * @constructor
 * @param {I3SNode} [parent] The parent of that feature
 * @param {String} [uri] The uri to load the data from
 */
function I3SFeature(parent, uri) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._layer = parent._layer;
  this._uri = uri;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
  this._completeUri = this._completeUriWithoutQuery + query;
}

Object.defineProperties(I3SFeature.prototype, {
  /**
   * Gets the uri for the feature.
   * @memberof I3SFeature.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the feature.
   * @memberof I3SFeature.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SFeature.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the data of the I3S feature is loaded
 */
I3SFeature.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadJson(
    this._completeUri,
    function (data, resolve) {
      that._data = data;
      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

/**
 * This class implements an I3S Field which is custom data attachec
 * to nodes
 * @private
 * @alias I3SField
 * @constructor
 * @param {I3SNode} [parent] The parent of that geometry
 * @param {Object} [storageInfo] The structure containing the storage info of the field
 */
function I3SField(parent, storageInfo) {
  this._storageInfo = storageInfo;
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._uri = `/attributes/${storageInfo.key}/0`;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  this._completeUriWithoutQuery =
    this._parent._completeUriWithoutQuery + this._uri;
  this._completeUri = this._completeUriWithoutQuery + query;
}

Object.defineProperties(I3SField.prototype, {
  /**
   * Gets the uri for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the header for this field.
   * @memberof I3SField.prototype
   * @type {Object}
   */
  header: {
    get: function () {
      return this._header;
    },
  },
  /**
   * Gets the values for this field.
   * @memberof I3SField.prototype
   * @type {Object}
   */
  values: {
    get: function () {
      return this._values && this._values.attributeValues
        ? this._values.attributeValues
        : [];
    },
  },
  /**
   * Gets the name for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  name: {
    get: function () {
      return this._storageInfo.name;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the geometry data is loaded
 */
I3SField.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(
    this._completeUri,
    function (data, resolve) {
      // check if we have a 404
      const dataView = new DataView(data);
      let success = true;
      if (dataView.getUint8(0) === "{".charCodeAt(0)) {
        const textContent = new TextDecoder();
        const str = textContent.decode(data);
        if (str.includes("404")) {
          success = false;
          console.error("Failed to load:", that._completeUri);
        }
      }

      if (success) {
        that._data = data;
        let offset = that._parseHeader(dataView);

        // @TODO: find out why we must skip 4 bytes when the value type is float 64
        if (
          that._storageInfo &&
          that._storageInfo.attributeValues &&
          that._storageInfo.attributeValues.valueType === "Float64"
        ) {
          offset += 4;
        }

        that._parseBody(dataView, offset);
      }

      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

/**
 * @private
 */
I3SField.prototype._parseValue = function (dataView, type, offset) {
  let value = null;
  if (type === "UInt8") {
    value = dataView.getUint8(offset);
    offset += 1;
  } else if (type === "Int8") {
    value = dataView.getInt8(offset);
    offset += 1;
  } else if (type === "UInt16") {
    value = dataView.getUint16(offset, true);
    offset += 2;
  } else if (type === "Int16") {
    value = dataView.getInt16(offset, true);
    offset += 2;
  } else if (type === "UInt32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Oid32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Int32") {
    value = dataView.getInt32(offset, true);
    offset += 4;
  } else if (type === "Float32") {
    value = dataView.getFloat32(offset, true);
    offset += 4;
  } else if (type === "UInt64") {
    value = dataView.getUint64(offset, true);
    offset += 8;
  } else if (type === "Int64") {
    value = dataView.getInt64(offset, true);
    offset += 8;
  } else if (type === "Float64") {
    value = dataView.getFloat64(offset, true);
    offset += 8;
  } else if (type === "String") {
    value = String.fromCharCode(dataView.getUint8(offset));
    offset += 1;
  }

  return {
    value: value,
    offset: offset,
  };
};

/**
 * @private
 */
I3SField.prototype._parseHeader = function (dataView) {
  let offset = 0;
  this._header = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.header.length;
    itemIndex++
  ) {
    const item = this._storageInfo.header[itemIndex];
    const parsedValue = this._parseValue(dataView, item.valueType, offset);
    this._header[item.property] = parsedValue.value;
    offset = parsedValue.offset;
  }
  return offset;
};

/**
 * @private
 */
I3SField.prototype._parseBody = function (dataView, offset) {
  this._values = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.ordering.length;
    itemIndex++
  ) {
    const item = this._storageInfo.ordering[itemIndex];
    const desc = this._storageInfo[item];
    if (desc) {
      this._values[item] = [];
      for (let index = 0; index < this._header.count; ++index) {
        if (desc.valueType !== "String") {
          const parsedValue = this._parseValue(
            dataView,
            desc.valueType,
            offset
          );
          this._values[item].push(parsedValue.value);
          offset = parsedValue.offset;
        } else {
          const stringLen = this._values.attributeByteCounts[index];
          let stringContent = "";
          for (let cIndex = 0; cIndex < stringLen; ++cIndex) {
            const curParsedValue = this._parseValue(
              dataView,
              desc.valueType,
              offset
            );
            stringContent += curParsedValue.value;
            offset = curParsedValue.offset;
          }
          this._values[item].push(stringContent);
        }
      }
    }
  }
};

/**
 * This class implements an I3S Geometry, in Cesium, each I3SGeometry
 * generates an in memory b3dm so be used as content for a Cesium3DTile
 * @private
 * @alias I3SGeometry
 * @constructor
 * @param {I3SNode} [parent] The parent of that geometry
 * @param {String} [uri] The uri to load the data from
 */
function I3SGeometry(parent, uri) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._layer = parent._layer;
  this._uri = uri;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  if (this._parent._nodeIndex) {
    this._completeUriWithoutQuery = `${this._layer._completeUriWithoutQuery}/nodes/${this._parent._data.mesh.geometry.resource}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  } else {
    this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  }
}

Object.defineProperties(I3SGeometry.prototype, {
  /**
   * Gets the uri for the geometry.
   * @memberof I3SGeometry.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the geometry.
   * @memberof I3SGeometry.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SGeometry.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the geometry data is loaded
 */
I3SGeometry.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(
    this._completeUri,
    function (data, resolve) {
      that._data = data;
      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

function sameSide(p1, p2, a, b) {
  const ab = {};
  const ap1 = {};
  const ap2 = {};
  const cp1 = {};
  const cp2 = {};
  Cartesian3.subtract(b, a, ab);
  Cartesian3.cross(ab, Cartesian3.subtract(p1, a, ap1), cp1);
  Cartesian3.cross(ab, Cartesian3.subtract(p2, a, ap2), cp2);
  return Cartesian3.dot(cp1, cp2) >= 0;
}

/**
 * Find a triangle touching the point px,py,pz, then return the vertex closest to the search point
 * @param {number} [px] the x component of the point to query
 * @param {number} [py] the y component of the point to query
 * @param {number} [pz] the z component of the point to query
 * @returns {object} a structure containing the index of the closest point,
 * the squared distance from the queried point to the point that is found
 * the distance from the queried point to the point that is found
 * the queried position in local space
 * the closest position in local space
 */
I3SGeometry.prototype.getClosestPointIndexOnTriangle = function (px, py, pz) {
  if (this.customAttributes && this.customAttributes.positions) {
    // convert queried position to local
    const position = new Cartesian3(px, py, pz);

    position.x -= this.customAttributes.cartesianCenter.x;
    position.y -= this.customAttributes.cartesianCenter.y;
    position.z -= this.customAttributes.cartesianCenter.z;
    Matrix3.multiplyByVector(
      this.customAttributes.parentRotation,
      position,
      position
    );

    let bestTriDist = Number.MAX_VALUE;
    let bestTri;
    let bestDistSq;
    let bestIndex;
    let bestPt;

    // Brute force lookup, @TODO: this can be improved with a spatial partitioning search system
    const positions = this.customAttributes.positions;
    const indices = this.customAttributes.indices;

    //We may have indexed or non-indexed triangles here
    let triCount;
    if (indices) {
      triCount = indices.length;
    } else {
      triCount = positions.length / 3;
    }

    for (let triIndex = 0; triIndex < triCount; triIndex++) {
      let i0, i1, i2;
      if (indices) {
        i0 = indices[triIndex];
        i1 = indices[triIndex + 1];
        i2 = indices[triIndex + 2];
      } else {
        i0 = triIndex * 3;
        i1 = triIndex * 3 + 3;
        i2 = triIndex * 3 + 6;
      }

      const v0 = new Cartesian3(
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2]
      );
      const v1 = new Cartesian3(
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2]
      );
      const v2 = new Cartesian3(
        positions[i2 * 3],
        positions[i2 * 3 + 1],
        positions[i2 * 3 + 2]
      );

      //Check how the point is positioned relative to the triangle.
      //This will tell us whether the projection of the point in the triangle's plane lands in the triangle
      if (
        !sameSide(position, v0, v1, v2) ||
        !sameSide(position, v1, v0, v2) ||
        !sameSide(position, v2, v0, v1)
      )
        continue;

      //Because of precision issues, we can't always reliably tell if the point lands directly on the face, so the most robust way is just to find the closest one
      const v0v1 = {},
        v0v2 = {},
        crossProd = {},
        normal = {};
      Cartesian3.subtract(v1, v0, v0v1);
      Cartesian3.subtract(v2, v0, v0v2);
      Cartesian3.cross(v0v1, v0v2, crossProd);

      //Skip "triangles" with 3 colinear points
      if (Cartesian3.magnitude(crossProd) === 0) continue;

      Cartesian3.normalize(crossProd, normal);

      const v0p = {},
        v1p = {},
        v2p = {};
      Cartesian3.subtract(position, v0, v0p);
      const normalDist = Math.abs(Cartesian3.dot(v0p, normal));
      if (normalDist < bestTriDist) {
        bestTriDist = normalDist;
        bestTri = triIndex;

        //Found a triangle, return the index of the closest point
        const d0 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v0, v0p)
        );
        const d1 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v1, v1p)
        );
        const d2 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v2, v2p)
        );
        if (d0 < d1 && d0 < d2) {
          bestIndex = i0;
          bestPt = v0;
          bestDistSq = d0;
        } else if (d1 < d2) {
          bestIndex = i1;
          bestPt = v1;
          bestDistSq = d1;
        } else {
          bestIndex = i2;
          bestPt = v2;
          bestDistSq = d2;
        }
      }
    }

    if (bestTri !== undefined) {
      return {
        index: bestIndex,
        distanceSquared: bestDistSq,
        distance: Math.sqrt(bestDistSq),
        queriedPosition: {
          x: position.x,
          y: position.y,
          z: position.z,
        },
        closestPosition: {
          x: bestPt.x,
          y: bestPt.y,
          z: bestPt.z,
        },
      };
    }
  }

  //No hits found
  return {
    index: -1,
    distanceSquared: Number.Infinity,
    distance: Number.Infinity,
  };
};

/**
 * @private
 */
I3SGeometry.prototype._generateGLTF = function (
  nodesInScene,
  nodes,
  meshes,
  buffers,
  bufferViews,
  accessors
) {
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  // Get the material definition
  const materialInfo = this._parent._data.mesh
    ? this._parent._data.mesh.material
    : null;
  let materialIndex = 0;
  let isTextured = false;
  let gltfMaterial = {
    pbrMetallicRoughness: {
      metallicFactor: 0.0,
    },
    doubleSided: true,
    name: "Material",
  };

  if (materialInfo) {
    materialIndex = materialInfo.definition;
  }

  let materialDefinition;
  if (this._layer._data.materialDefinitions) {
    materialDefinition = this._layer._data.materialDefinitions[materialIndex];
  }

  if (materialDefinition) {
    gltfMaterial = materialDefinition;

    // Textured. @TODO: extend to other textured cases
    if (
      materialDefinition.pbrMetallicRoughness &&
      materialDefinition.pbrMetallicRoughness.baseColorTexture
    ) {
      isTextured = true;
    }
  }

  let texturePath;

  if (this._parent._data.textureData) {
    texturePath = `${this._parent._completeUriWithoutQuery}/${this._parent._data.textureData[0].href}${query}`;
  } else {
    // Choose the JPG for the texture
    let textureName = "0";

    if (this._layer._data.textureSetDefinitions) {
      for (
        let defIndex = 0;
        defIndex < this._layer._data.textureSetDefinitions.length;
        defIndex++
      ) {
        const textureSetDefinition = this._layer._data.textureSetDefinitions[
          defIndex
        ];
        for (
          let formatIndex = 0;
          formatIndex < textureSetDefinition.formats.length;
          formatIndex++
        ) {
          const textureFormat = textureSetDefinition.formats[formatIndex];
          if (textureFormat.format === "jpg") {
            textureName = textureFormat.name;
            break;
          }
        }
      }
    }

    if (this._parent._data.mesh) {
      texturePath = `${this._layer._completeUriWithoutQuery}/nodes/${this._parent._data.mesh.material.resource}/textures/${textureName}${query}`;
    }
  }

  let gltfTextures = [];
  let gltfImages = [];
  let gltfSamplers = [];

  if (isTextured) {
    gltfTextures = [
      {
        sampler: 0,
        source: 0,
      },
    ];

    gltfImages = [
      {
        uri: texturePath,
      },
    ];

    gltfSamplers = [
      {
        magFilter: 9729,
        minFilter: 9986,
        wrapS: 10497,
        wrapT: 10497,
      },
    ];

    gltfMaterial.pbrMetallicRoughness.baseColorTexture.index = 0;
  }

  const gltfData = {
    scene: 0,
    scenes: [
      {
        nodes: nodesInScene,
      },
    ],
    nodes: nodes,
    meshes: meshes,
    buffers: buffers,
    bufferViews: bufferViews,
    accessors: accessors,
    materials: [gltfMaterial],
    textures: gltfTextures,
    images: gltfImages,
    samplers: gltfSamplers,
    asset: {
      version: "2.0",
    },
  };

  return gltfData;
};

// Reimplement Cesium3DTile.prototype.requestContent so that
// We get a chance to load our own b3dm from I3S data
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
   * @type {string}
   */
  i3sNode: {
    get: function () {
      return this._i3sNode;
    },
  },
});

export default I3SDataProvider;
