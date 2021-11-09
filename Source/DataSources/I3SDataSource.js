/*
.####..#######...######......######..##.....##.########..########...#######..########..########...
..##..##.....##.##....##....##....##.##.....##.##.....##.##.....##.##.....##.##.....##....##......
..##.........##.##..........##.......##.....##.##.....##.##.....##.##.....##.##.....##....##......
..##...#######...######......######..##.....##.########..########..##.....##.########.....##......
..##.........##.......##..........##.##.....##.##........##........##.....##.##...##......##......
..##..##.....##.##....##....##....##.##.....##.##........##........##.....##.##....##.....##......
.####..#######...######......######...#######..##........##.........#######..##.....##....##......

.########..#######..########......######..########..######..####.##.....##.##.....##
.##.......##.....##.##.....##....##....##.##.......##....##..##..##.....##.###...###
.##.......##.....##.##.....##....##.......##.......##........##..##.....##.####.####
.######...##.....##.########.....##.......######....######...##..##.....##.##.###.##
.##.......##.....##.##...##......##.......##.............##..##..##.....##.##.....##
.##.......##.....##.##....##.....##....##.##.......##....##..##..##.....##.##.....##
.##........#######..##.....##.....######..########..######..####..#######..##.....##
*/

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
 *   That geometry is transcoded on the fly to b3dm format and ingested by Cesium
 *   When the geometry is loaded, we then load all children of this node as placeholders so that the LOD
 *   can know about them too
 *
 * About transcoding:
 *
 * We create web workers (as many as n-1 available hardware cores) to transcode I3S geometries into Cesium B3DM
 * The steps are:
 *
 * Decode geometry attributes (positions, normals, etc..) either from DRACO or Binary format
 * Convert heights for all vertices from Orthometric to Ellipsoidal
 * Transform vertex coordinates from LONG/LAT/HEIGHT to Cartesian in local space and
 * scale appropriately if specified in the attribute metadata
 * Crop UVs if UV regions are defined in the attribute metadata
 * Create a GLTF document in memory that will be ingested as part of a b3dm payload
 *
 * About GEOID data:
 *
 * We provide the ability to use GEOID data to convert heights from orthometric to ellipsoidal.
 * The i3S data source uses a tiled elevation terrain provider to access the geoid tiles.
 * The sandcastle example below shows how to set the terrain provider service if required.
 *
 */

/*
..######.....###....##....##.########...######.....###.....######..########.##.......########
.##....##...##.##...###...##.##.....##.##....##...##.##...##....##....##....##.......##......
.##........##...##..####..##.##.....##.##........##...##..##..........##....##.......##......
..######..##.....##.##.##.##.##.....##.##.......##.....##..######.....##....##.......######..
.......##.#########.##..####.##.....##.##.......#########.......##....##....##.......##......
.##....##.##.....##.##...###.##.....##.##....##.##.....##.##....##....##....##.......##......
..######..##.....##.##....##.########...######..##.....##..######.....##....########.########

.########.##.....##....###....##.....##.########..##.......########
.##........##...##....##.##...###...###.##.....##.##.......##......
.##.........##.##....##...##..####.####.##.....##.##.......##......
.######......###....##.....##.##.###.##.########..##.......######..
.##.........##.##...#########.##.....##.##........##.......##......
.##........##...##..##.....##.##.....##.##........##.......##......
.########.##.....##.##.....##.##.....##.##........########.########
*/
/*

// Create a Viewer instances and add the DataSource.
var viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    timeline: false,
});

viewer.clock.shouldAnimate = false;


var tours = {
    "Frankfurt": "https://tiles.arcgis.com/tiles/u0sSNqDXr7puKJrF/arcgis/rest/services/Frankfurt2017_v17/SceneServer"
    };

// Initialize the terrain provider which provides the geoid conversion
// If this is not specified, or the URL is invalid no geoid conversion will be applied.
var geoidService = new Cesium.ArcGISTiledElevationTerrainProvider({
    url : "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer",
});

var dataSource = new Cesium.I3SDataSource("", viewer.scene, {
    traceFetches : false, // for tracing I3S fetches
    traceVisuals : false, // for tracing visuals
    autoCenterCameraOnStart : true, // auto center to the location of the i3s
    geoidTiledTerrainProvider : geoidService,  // pass the geoid service
});
dataSource.camera = viewer.camera; // for debug
dataSource
    .loadUrl(tours["Frankfurt"])
    .then(function () {

    });

viewer.dataSources.add(dataSource);

// Silhouette a feature on selection and show metadata in the InfoBox.
viewer.screenSpaceEventHandler.setInputAction(function onLeftClick(
    movement
) {

    // Pick a new feature
    var pickedFeature = viewer.scene.pick(movement.position);
    if (!Cesium.defined(pickedFeature)) {
        return;
    }

    var pickedPosition = viewer.scene.pickPosition(movement.position);

    if (pickedFeature && pickedFeature.content &&
        pickedFeature.content.i3sNode) {

        var i3sNode = pickedFeature.content.i3sNode;
        i3sNode.loadFields().then(function() {
            console.log(i3sNode);
            var geometry = i3sNode.geometryData[0];
            console.log(geometry);
            if (pickedPosition) {
                var location = geometry.getClosestPointIndexOnTriangle(
                    pickedPosition.x, pickedPosition.y, pickedPosition.z);
                console.log("Location", location);
                if (location.index !== -1 && geometry.customAttributes["feature-index"]) {
                    var featureIndex = geometry.customAttributes["feature-index"][location.index];
                    for (var fieldName=0; fieldName < i3sNode.fields.length; fieldName++) {
                        var field = i3sNode.fields[fieldName];
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

/*
.####.##.....##.########...#######..########..########..######.
..##..###...###.##.....##.##.....##.##.....##....##....##....##
..##..####.####.##.....##.##.....##.##.....##....##....##......
..##..##.###.##.########..##.....##.########.....##.....######.
..##..##.....##.##........##.....##.##...##......##..........##
..##..##.....##.##........##.....##.##....##.....##....##....##
.####.##.....##.##.........#######..##.....##....##.....######.
*/

import Batched3DModel3DTileContent from "../Scene/Batched3DModel3DTileContent.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTile from "../Scene/Cesium3DTile.js";
import Cesium3DTileset from "../Scene/Cesium3DTileset.js";
import CesiumMath from "../Core/Math.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EntityCluster from "./EntityCluster.js";
import EntityCollection from "./EntityCollection.js";
import Event from "../Core/Event.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import HeightmapEncoding from "../Core/HeightmapEncoding.js";
import Lerc from "../ThirdParty/LercDecode.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Plane from "../Core/Plane.js";
import Quaternion from "../Core/Quaternion.js";
import Resource from "../Core/Resource.js";
import Transforms from "../Core/Transforms.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import when from "../ThirdParty/when.js";

/*
..######...##........#######..########.....###....##........######.
.##....##..##.......##.....##.##.....##...##.##...##.......##....##
.##........##.......##.....##.##.....##..##...##..##.......##......
.##...####.##.......##.....##.########..##.....##.##........######.
.##....##..##.......##.....##.##.....##.#########.##.............##
.##....##..##.......##.....##.##.....##.##.....##.##.......##....##
..######...########..#######..########..##.....##.########..######.
*/

// Maps i3Snode by URI
var _i3sContentCache = {};

// Prevent ESLint from issuing warnings about undefined Promise
// eslint-disable-next-line no-undef
var _Promise = Promise;

// Code traces
// set to true to turn on code tracing for debugging purposes
var _tracecode = false;
var traceCode = function () {};
if (_tracecode) {
  traceCode = console.log;
}

/*
.####..#######...######.
..##..##.....##.##....##
..##.........##.##......
..##...#######...######.
..##.........##.......##
..##..##.....##.##....##
.####..#######...######.

.########.....###....########....###...
.##.....##...##.##......##......##.##..
.##.....##..##...##.....##.....##...##.
.##.....##.##.....##....##....##.....##
.##.....##.#########....##....#########
.##.....##.##.....##....##....##.....##
.########..##.....##....##....##.....##

..######...#######..##.....##.########...######..########
.##....##.##.....##.##.....##.##.....##.##....##.##......
.##.......##.....##.##.....##.##.....##.##.......##......
..######..##.....##.##.....##.########..##.......######..
.......##.##.....##.##.....##.##...##...##.......##......
.##....##.##.....##.##.....##.##....##..##....##.##......
..######...#######...#######..##.....##..######..########
*/

/**
 * This class implements using an I3S scene server as a Cesium data source. The URL
 * that is used for loadUrl should return a scene object. Currently supported I3S
 * versions are 1.6 and 1.7. I3SDataSource is the main public class for I3S support.
 * All other classes in this source file implement the Object Model for the I3S entities,
 * which may at some point have more public interfaces if further introspection or
 * customization need to be added.
 * @alias I3SDataSource
 * @constructor
 *
 * @param {String} [name] The name of this data source.  If undefined, a name
 *                        will be derived from the url.
 * @param {Scene} [scene] The scene to populate with the tileset
 *
 *
 * @example
 * var dataSource = new I3SDataSource();
 * dataSource.loadUrl('https://tiles.arcgis.com/tiles/u0sSNqDXr7puKJrF/arcgis/rest/services/Frankfurt2017_v17/SceneServer');
 * dataSource.dataSources.add(dataSource);
 *
 * @example
 * var geoidService = new Cesium.ArcGISTiledElevationTerrainProvider({
 *   url : "https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/EGM2008/ImageServer",
 *   });
 * var dataSource = new I3SDataSource("", viewer.scene, {
 *   autoCenterCameraOnStart : true, // auto center to the location of the i3s
 *   geoidTiledTerrainProvider : geoidService,  // pass the geoid service
 *
 */

function I3SDataSource(name, scene, options) {
  //All public configuration is defined as ES5 properties
  //These are just the "private" letiables and their defaults.
  this._name = name;
  this._changed = new Event();
  this._error = new Event();
  this._isLoading = false;
  this._loading = new Event();
  this._entityCollection = new EntityCollection();
  this._entityCluster = new EntityCluster();
  this._scene = scene;
  this._traceFetches = false;
  this._traceVisuals = false;
  this._autoCenterCameraOnStart = false;
  this._GLTFProcessingQueue = new I3SGLTFProcessingQueue();

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  if (defined(options.traceVisuals)) {
    this._traceVisuals = options.traceVisuals;
  }
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

/*
.########..########...#######..########..########.########..########.####.########..######.
.##.....##.##.....##.##.....##.##.....##.##.......##.....##....##.....##..##.......##....##
.##.....##.##.....##.##.....##.##.....##.##.......##.....##....##.....##..##.......##......
.########..########..##.....##.########..######...########.....##.....##..######....######.
.##........##...##...##.....##.##........##.......##...##......##.....##..##.............##
.##........##....##..##.....##.##........##.......##....##.....##.....##..##.......##....##
.##........##.....##..#######..##........########.##.....##....##....####.########..######.
*/

Object.defineProperties(I3SDataSource.prototype, {
  //The below properties must be implemented by all DataSource instances

  /**
   * Gets a human-readable name for this instance.
   * @memberof I3SDataSource.prototype
   * @type {String}
   */
  name: {
    get: function () {
      return this._name;
    },
  },
  /**
   * this property is always undefined.
   * @memberof I3SDataSource.prototype
   * @type {DataSourceClock}
   */
  clock: {
    value: undefined,
    writable: false,
  },
  /**
   * Gets the collection of Entity instances.
   * @memberof I3SDataSource.prototype
   * @type {EntityCollection}
   */
  entities: {
    get: function () {
      return this._entityCollection;
    },
  },
  /**
   * Gets a value indicating if the data source is currently loading data.
   * @memberof I3SDataSource.prototype
   * @type {Boolean}
   */
  isLoading: {
    get: function () {
      return this._isLoading;
    },
  },
  /**
   * Gets an event that will be raised when the underlying data changes.
   * @memberof I3SDataSource.prototype
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
   * @memberof I3SDataSource.prototype
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
   * @memberof I3SDataSource.prototype
   * @type {Event}
   */
  loadingEvent: {
    get: function () {
      return this._loading;
    },
  },

  //These properties are specific to this DataSource.
  /**
   * Gets whether or not this data source should be displayed.
   * @memberof I3SDataSource.prototype
   * @type {Boolean}
   */
  show: {
    get: function () {
      return this._entityCollection;
    },
    set: function (value) {
      this._entityCollection = value;
    },
  },
  /**
   * Gets or sets the clustering options for this data source. This object can be shared between multiple data sources.
   * @memberof I3SDataSource.prototype
   * @type {EntityCluster}
   */
  clustering: {
    get: function () {
      return this._entityCluster;
    },
    set: function (value) {
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      this._entityCluster = value;
    },
  },
  /**
   * Gets or sets debugging and tracing of I3S fetches.
   * @memberof I3SDataSource.prototype
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
   * Gets or sets debugging and tracing of I3S entities' bounding boxes.
   * @memberof I3SDataSource.prototype
   * @type {bool}
   */
  traceVisuals: {
    get: function () {
      return this._traceVisuals;
    },
    set: function (value) {
      if (!defined(value)) {
        throw new DeveloperError("value must be defined.");
      }
      this._traceVisuals = value;
    },
  },
  /**
   * Gets or sets auto centering of the camera on the data set.
   * @memberof I3SDataSource.prototype
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

/*
.##........#######.....###....########..########.########...######.
.##.......##.....##...##.##...##.....##.##.......##.....##.##....##
.##.......##.....##..##...##..##.....##.##.......##.....##.##......
.##.......##.....##.##.....##.##.....##.######...########...######.
.##.......##.....##.#########.##.....##.##.......##...##.........##
.##.......##.....##.##.....##.##.....##.##.......##....##..##....##
.########..#######..##.....##.########..########.##.....##..######.
*/

/**
 * Asynchronously loads the I3S scene at the provided url, replacing any existing data.
 * @param {Object} [url] The url to be processed.
 * @returns {Promise<void>} a promise that will resolve when the I3S scene is loaded.
 */
I3SDataSource.prototype.loadUrl = function (url) {
  var parts = url.split("?");
  this._url = parts[0];
  this._query = parts[1];
  this._completeUrl = url;

  var deferredPromise = new when.defer();
  this._sceneServer = new I3SSceneServer(this);
  this._sceneServer.load(this._completeUrl).then(function () {
    deferredPromise.resolve();
  });

  return deferredPromise;
};

/**
 * Loads the provided data, replacing any existing data.
 * @param {Array} [data] The object to be processed.
 */
I3SDataSource.prototype.load = function (data) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(data)) {
    throw new DeveloperError("data is required.");
  }
  //>>includeEnd('debug');

  //Clear out any data that might already exist.
  this._setLoading(true);
  var entities = this._entityCollection;

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
 * @private
 */
I3SDataSource.prototype._setLoading = function (isLoading) {
  if (this._isLoading !== isLoading) {
    this._isLoading = isLoading;
    this._loading.raiseEvent(this, isLoading);
  }
};

/**
 * @private
 */
I3SDataSource.prototype._loadJson = function (uri, success, fail) {
  var that = this;
  return new _Promise(function (resolve, reject) {
    if (that._traceFetches) {
      console.log("I3S FETCH:", uri);
    }
    var request = fetch(uri);
    request.then(function (response) {
      response.json().then(function (data) {
        if (data.error) {
          console.error(that._data.error.message);
          fail(reject);
        } else {
          success(data, resolve);
        }
      });
    });
  });
};

/**
 * @private
 */
I3SDataSource.prototype._loadBinary = function (uri, success, fail) {
  var that = this;
  return new _Promise(function (resolve, reject) {
    if (that._traceFetches) {
      traceCode("I3S FETCH:", uri);
    }
    var request = fetch(uri);
    request.then(function (response) {
      response.arrayBuffer().then(function (data) {
        if (data.error) {
          console.error(that._data.error.message);
          fail(reject);
        } else {
          success(data, resolve);
        }
      });
    });
  });
};

/**
 * @private
 */
I3SDataSource.prototype._binarizeGLTF = function (rawGLTF) {
  var encoder = new TextEncoder();
  var rawGLTFData = encoder.encode(JSON.stringify(rawGLTF));
  var binaryGLTFData = new Uint8Array(rawGLTFData.byteLength + 20);
  var binaryGLTF = {
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
I3SDataSource.prototype._binarizeB3DM = function (
  featureTableJSON,
  batchTabelJSON,
  binaryGLTFData
) {
  var encoder = new TextEncoder();

  // Feature Table
  var featureTableOffset = 28;
  var featureTableJSONData = encoder.encode(featureTableJSON);
  var featureTableLength = featureTableJSONData.byteLength;

  // Batch Table
  var batchTableOffset = featureTableOffset + featureTableLength;
  var batchTableJSONData = encoder.encode(batchTabelJSON);

  // Calculate alignment buffer by padding the remainder of the batch table
  var paddingCount = (batchTableOffset + batchTableJSONData.byteLength) % 8;
  var batchTableLength = batchTableJSONData.byteLength + paddingCount;
  var paddingStart = batchTableJSONData.byteLength;
  var paddingStop = batchTableLength;

  // Binary GLTF
  var binaryGLTFOffset = batchTableOffset + batchTableLength;
  var binaryGLTFLength = binaryGLTFData.byteLength;

  var dataSize = featureTableLength + batchTableLength + binaryGLTFLength;
  var b3dmRawData = new Uint8Array(28 + dataSize);

  var b3dmData = {
    magic: new Uint8Array(b3dmRawData.buffer, 0, 4),
    version: new Uint32Array(b3dmRawData.buffer, 4, 1),
    byteLength: new Uint32Array(b3dmRawData.buffer, 8, 1),
    featureTableJSONByteLength: new Uint32Array(b3dmRawData.buffer, 12, 1),
    featureTableBinaryByteLength: new Uint32Array(b3dmRawData.buffer, 16, 1),
    batchTableJSONByteLength: new Uint32Array(b3dmRawData.buffer, 20, 1),
    batchTableBinaryByteLength: new Uint32Array(b3dmRawData.buffer, 24, 1),
    featureTable: new Uint8Array(
      b3dmRawData.buffer,
      featureTableOffset,
      featureTableLength
    ),
    batchTable: new Uint8Array(
      b3dmRawData.buffer,
      batchTableOffset,
      batchTableLength
    ),
    binaryGLTF: new Uint8Array(
      b3dmRawData.buffer,
      binaryGLTFOffset,
      binaryGLTFLength
    ),
  };

  b3dmData.magic[0] = "b".charCodeAt();
  b3dmData.magic[1] = "3".charCodeAt();
  b3dmData.magic[2] = "d".charCodeAt();
  b3dmData.magic[3] = "m".charCodeAt();

  b3dmData.version[0] = 1;
  b3dmData.byteLength[0] = b3dmRawData.byteLength;

  b3dmData.featureTable.set(featureTableJSONData);
  b3dmData.featureTableJSONByteLength[0] = featureTableLength;
  b3dmData.featureTableBinaryByteLength[0] = 0;

  b3dmData.batchTable.set(batchTableJSONData);
  for (var index = paddingStart; index < paddingStop; ++index) {
    b3dmData.batchTable[index] = 0x20;
  }
  b3dmData.batchTableJSONByteLength[0] = batchTableLength;
  b3dmData.batchTableBinaryByteLength[0] = 0;

  b3dmData.binaryGLTF.set(binaryGLTFData);

  return b3dmRawData;
};

/*
.##.....##.########.####.##.......####.########.##....##
.##.....##....##.....##..##........##.....##.....##..##.
.##.....##....##.....##..##........##.....##......####..
.##.....##....##.....##..##........##.....##.......##...
.##.....##....##.....##..##........##.....##.......##...
.##.....##....##.....##..##........##.....##.......##...
..#######.....##....####.########.####....##.......##...

.##.....##.########.########.##.....##..#######..########...######.
.###...###.##..........##....##.....##.##.....##.##.....##.##....##
.####.####.##..........##....##.....##.##.....##.##.....##.##......
.##.###.##.######......##....#########.##.....##.##.....##..######.
.##.....##.##..........##....##.....##.##.....##.##.....##.......##
.##.....##.##..........##....##.....##.##.....##.##.....##.##....##
.##.....##.########....##....##.....##..#######..########...######.
*/

/**
 * @private
 */
function _WGS84ToCartesian(long, lat, height) {
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
function _longLatsToMeter(longitude1, latitude1, longitude2, latitude2) {
  var p1 = _WGS84ToCartesian(longitude1, latitude1, 0);
  var p2 = _WGS84ToCartesian(longitude2, latitude2, 0);

  return Cartesian3.distance(p1, p2);
}

/**
 * @private
 */
function _computeExtent(minLongitude, minLatitude, maxLongitude, maxLatitude) {
  var extent = {
    minLongitude: minLongitude,
    maxLongitude: maxLongitude,
    minLatitude: minLatitude,
    maxLatitude: maxLatitude,
  };

  // Compute the center
  extent.centerLongitude = (extent.maxLongitude + extent.minLongitude) / 2;
  extent.centerLatitude = (extent.maxLatitude + extent.minLatitude) / 2;

  // Compute the spans
  extent.longitudeSpan = _longLatsToMeter(
    extent.minLongitude,
    extent.minLatitude,
    extent.maxLongitude,
    extent.minLatitude
  );

  extent.latitudeSpan = _longLatsToMeter(
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

/*
..######...######..########.##....##.########
.##....##.##....##.##.......###...##.##......
.##.......##.......##.......####..##.##......
..######..##.......######...##.##.##.######..
.......##.##.......##.......##..####.##......
.##....##.##....##.##.......##...###.##......
..######...######..########.##....##.########

..######..########.########..##.....##.########.########.
.##....##.##.......##.....##.##.....##.##.......##.....##
.##.......##.......##.....##.##.....##.##.......##.....##
..######..######...########..##.....##.######...########.
.......##.##.......##...##....##...##..##.......##...##..
.##....##.##.......##....##....##.##...##.......##....##.
..######..########.##.....##....###....########.##.....##
*/

/**
 * This class implements an I3S scene server
 * @private
 * @alias I3SSceneServer
 * @param {I3SDataSource} [dataSource] The data source that is the
 * owner of this scene server
 * @constructor
 */
function I3SSceneServer(dataSource) {
  this._dataSource = dataSource;
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
  var that = this;
  this._uri = uri;
  return this._dataSource._loadJson(
    uri,
    function (data, resolve) {
      // Success
      that._data = data;
      var layerPromises = [];
      for (
        var layerIndex = 0;
        layerIndex < that._data.layers.length;
        layerIndex++
      ) {
        var newLayer = new I3SLayer(
          that,
          that._data.layers[layerIndex],
          layerIndex
        );
        that._layerCollection.push(newLayer);
        layerPromises.push(newLayer.load());
      }

      _Promise.all(layerPromises).then(function () {
        that._computeExtent();

        if (that._dataSource._autoCenterCameraOnStart) {
          that.centerCamera("topdown");
        }

        resolve();
        that._createVisualElements();
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
    this._dataSource.camera.setView({
      destination: _WGS84ToCartesian(
        this._extent.centerLongitude,
        this._extent.centerLatitude,
        10000.0
      ),
    });
  } else {
    this._dataSource.camera.setView({
      destination: _WGS84ToCartesian(
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
  var minLongitude = Number.MAX_VALUE;
  var maxLongitude = -Number.MAX_VALUE;
  var minLatitude = Number.MAX_VALUE;
  var maxLatitude = -Number.MAX_VALUE;

  // Compute the extent from all layers
  for (
    var layerIndex = 0;
    layerIndex < this._layerCollection.length;
    layerIndex++
  ) {
    if (
      this._layerCollection[layerIndex]._data.store &&
      this._layerCollection[layerIndex]._data.store.extent
    ) {
      var layerExtent = this._layerCollection[layerIndex]._data.store.extent;
      minLongitude = Math.min(minLongitude, layerExtent[0]);
      minLatitude = Math.min(minLatitude, layerExtent[1]);
      maxLongitude = Math.max(maxLongitude, layerExtent[2]);
      maxLatitude = Math.max(maxLatitude, layerExtent[3]);
    }
  }
  this._extent = _computeExtent(
    minLongitude,
    minLatitude,
    maxLongitude,
    maxLatitude
  );
};

/**
 * @private
 */
I3SSceneServer.prototype._createVisualElements = function () {
  if (!this._dataSource._traceVisuals) {
    return;
  }
  // Add an entity for display
  this._entities.extentOutline = this._dataSource.entities.add({
    name: "Extent",
    position: _WGS84ToCartesian(
      this._extent.centerLongitude,
      this._extent.centerLatitude,
      0.0
    ),
    plane: {
      plane: new Plane(Cartesian3.UNIT_Z, 0.0),
      dimensions: new Cartesian2(
        this._extent.longitudeSpan,
        this._extent.latitudeSpan
      ),
      fill: false,
      outline: true,
      outlineColor: Color.GREEN,
    },
  });
};

/*
.##..........###....##....##.########.########.
.##.........##.##....##..##..##.......##.....##
.##........##...##....####...##.......##.....##
.##.......##.....##....##....######...########.
.##.......#########....##....##.......##...##..
.##.......##.....##....##....##.......##....##.
.########.##.....##....##....########.##.....##
*/

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
  this._dataSource = sceneServer._dataSource;

  if (layerData.href === undefined) {
    // assign a default layer
    layerData.href = "./layers/" + index;
  }

  this._uri = layerData.href;
  var query = "";
  if (this._dataSource._query && this._dataSource._query !== "") {
    query = "?" + this._dataSource._query;
  }
  this._completeUriWithoutQuery =
    sceneServer._dataSource._url + "/" + this._uri;
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
  var tilingScheme = terrainProvider.tilingScheme;

  // Sort points into a set of tiles
  var tileRequests = []; // Result will be an Array as it's easier to work with
  var tileRequestSet = {}; // A unique set

  var maxLevel = terrainProvider._lodCount;

  var minCorner = Cartographic.fromDegrees(
    extents.minLongitude,
    extents.minLatitude
  );
  var maxCorner = Cartographic.fromDegrees(
    extents.maxLongitude,
    extents.maxLatitude
  );
  var minCornerXY = tilingScheme.positionToTileXY(minCorner, maxLevel);
  var maxCornerXY = tilingScheme.positionToTileXY(maxCorner, maxLevel);

  //Get all the tiles in between
  for (var x = minCornerXY.x; x <= maxCornerXY.x; x++) {
    for (var y = minCornerXY.y; y <= maxCornerXY.y; y++) {
      var xy = new Cartesian2(x, y);
      var key = xy.toString();
      if (!tileRequestSet.hasOwnProperty(key)) {
        // When tile is requested for the first time
        var value = {
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
  var tilePromises = [];
  for (var i = 0; i < tileRequests.length; ++i) {
    var tileRequest = tileRequests[i];
    var requestPromise = tileRequest.terrainProvider.requestTileGeometry(
      tileRequest.x,
      tileRequest.y,
      tileRequest.level
    );

    tilePromises.push(requestPromise);
  }

  return when.all(tilePromises).then(function (heightMapBuffers) {
    var heightMaps = [];
    for (var i = 0; i < heightMapBuffers.length; i++) {
      var options = {
        tilingScheme: tilingScheme,
        x: tileRequests[i].x,
        y: tileRequests[i].y,
        level: tileRequests[i].level,
      };
      var heightMap = heightMapBuffers[i];

      var projectionType = "Geographic";
      if (tilingScheme._projection instanceof WebMercatorProjection) {
        projectionType = "WebMercator";
      }

      var heightMapData = {
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
        var result = Lerc.decode(heightMap._buffer);
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
  var that = this;
  return new _Promise(function (resolve, reject) {
    that._computeExtent();

    //Load tiles from arcgis

    var geoidTerrainProvider = that._dataSource._geoidTiledTerrainProvider;

    var dataIsReady = new when.defer();
    var geoidDataList = [];
    if (defined(geoidTerrainProvider)) {
      if (geoidTerrainProvider.ready) {
        var tilesReadyPromise = getCoveredTiles(
          geoidTerrainProvider,
          that._extent
        );
        when(tilesReadyPromise, function (heightMaps) {
          geoidDataList = heightMaps;
          dataIsReady.resolve();
        });
      } else {
        console.log(
          "Geoid Terrain service not available - no geoid conversion will be performed."
        );
        dataIsReady.resolve();
      }
    } else {
      console.log(
        "No Geoid Terrain service provided - no geoid conversion will be performed."
      );
      dataIsReady.resolve();
    }

    dataIsReady.then(function () {
      that._dataSource._geoidDataList = geoidDataList;
      console.log("Starting to load visual elements");
      that._createVisualElements();
      if (that._data.spatialReference.wkid === 4326) {
        that._loadNodePage(0).then(function () {
          that._loadRootNode().then(function () {
            that._create3DTileSet();
            if (that._data.store.version === "1.6") {
              that._rootNode._loadChildren().then(function () {
                resolve();
              });
            } else {
              resolve();
            }
          });
        });
      } else {
        console.log(
          "Unsupported spatial reference: " + that._data.spatialReference.wkid
        );
        resolve();
      }
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
      var defIndex = 0;
      defIndex < this._data.geometryDefinitions.length;
      defIndex++
    ) {
      var geometryBuffersInfo = [];
      var geometryBuffers = this._data.geometryDefinitions[defIndex]
        .geometryBuffers;

      for (var bufIndex = 0; bufIndex < geometryBuffers.length; bufIndex++) {
        var geometryBuffer = geometryBuffers[bufIndex];
        var collectedAttributes = [];
        var compressed = false;

        if (geometryBuffer.compressedAttributes && useCompression) {
          // check if compressed
          compressed = true;
          var attributes = geometryBuffer.compressedAttributes.attributes;
          for (var i = 0; i < attributes.length; i++) {
            collectedAttributes.push(attributes[i]);
          }
        } else {
          // uncompressed attributes
          for (var attribute in geometryBuffer) {
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

  var geometryDefinition = this._geometryDefinitions[definition];

  if (geometryDefinition) {
    for (var index = 0; index < geometryDefinition.length; ++index) {
      var geometryBufferInfo = geometryDefinition[index];
      var missed = false;
      var geometryAttributes = geometryBufferInfo.attributes;
      for (var attrIndex = 0; attrIndex < attributes.length; attrIndex++) {
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
    var rootIndex = 0;
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
  var Index = Math.floor(nodeIndex / this._data.nodePages.nodesPerPage);
  var offsetInPage = nodeIndex % this._data.nodePages.nodesPerPage;
  var that = this;
  return new _Promise(function (resolve, reject) {
    that._loadNodePage(Index).then(function () {
      resolve(that._nodePages[Index][offsetInPage]);
    });
  });
};

/**
 * @private
 */
I3SLayer.prototype._loadNodePage = function (page) {
  var that = this;
  return new _Promise(function (resolve, reject) {
    if (that._nodePages[page] !== undefined) {
      resolve();
    } else if (that._nodePageFetches[page] !== undefined) {
      that._nodePageFetches[page]._promise = that._nodePageFetches[
        page
      ]._promise.then(function () {
        resolve();
      });
    } else {
      var query = "";
      if (that._dataSource._query && that._dataSource._query !== "") {
        query = "?" + that._dataSource._query;
      }

      var nodePageURI = that._completeUriWithoutQuery + "/nodepages/";
      nodePageURI += page + query;

      that._nodePageFetches[page] = {};
      that._nodePageFetches[page]._promise = new _Promise(function (
        resolve,
        reject
      ) {
        that._nodePageFetches[page]._resolve = resolve;
      });

      var _resolve = function () {
        // resolve the chain of promises
        that._nodePageFetches[page]._resolve();
        delete that._nodePageFetches[page];
        resolve();
      };

      fetch(nodePageURI)
        .then(function (response) {
          response
            .json()
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
  var layerExtent = this._data.store.extent;
  this._extent = _computeExtent(
    layerExtent[0],
    layerExtent[1],
    layerExtent[2],
    layerExtent[3]
  );
};

/**
 * @private
 */
I3SLayer.prototype._createVisualElements = function () {
  if (!this._dataSource._traceVisuals) {
    return;
  }
  // Add an entity for display
  this._entities.extentOutline = this._dataSource.entities.add({
    name: "Extent",
    position: _WGS84ToCartesian(
      this._extent.centerLongitude,
      this._extent.centerLatitude,
      0.0
    ),
    plane: {
      plane: new Plane(Cartesian3.UNIT_Z, 0.0),
      dimensions: new Cartesian2(
        this._extent.longitudeSpan,
        this._extent.latitudeSpan
      ),
      fill: false,
      outline: true,
      outlineColor: Color.YELLOW,
    },
  });
};

/**
 * @private
 */
I3SLayer.prototype._create3DTileSet = function () {
  var inPlaceTileset = {
    asset: {
      version: "1.0",
    },
    geometricError: Number.MAX_VALUE,
    root: this._rootNode._create3DTileDefinition(),
  };

  var tilesetBlob = new Blob([JSON.stringify(inPlaceTileset)], {
    type: "application/json",
  });

  var inPlaceTilesetURL = URL.createObjectURL(tilesetBlob);

  this._tileset = this._dataSource._scene.primitives.add(
    new Cesium3DTileset({
      url: inPlaceTilesetURL,
      debugShowBoundingVolume: this._dataSource._traceVisuals,
      skipLevelOfDetail: true,
    })
  );

  this._tileset._isI3STileSet = true;

  var that = this;
  this._tileset.readyPromise.then(function () {
    that._tileset.tileLoad.addEventListener(function (tile) {});

    that._tileset.tileUnload.addEventListener(function (tile) {
      tile._i3sNode._clearGeometryData();
      tile._contentResource._url = tile._i3sNode._completeUriWithoutQuery;
    });

    that._tileset.tileVisible.addEventListener(function (tile) {
      if (tile._i3sNode) {
        tile._i3sNode._loadChildren();
      }
    });
  });
};

/*
.##....##..#######..########..########
.###...##.##.....##.##.....##.##......
.####..##.##.....##.##.....##.##......
.##.##.##.##.....##.##.....##.######..
.##..####.##.....##.##.....##.##......
.##...###.##.....##.##.....##.##......
.##....##..#######..########..########
*/

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
  this._dataSource = parent._dataSource;

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
    var query = "";
    if (this._dataSource._query && this._dataSource._query !== "") {
      query = "?" + this._dataSource._query;
    }

    this._completeUriWithoutQuery =
      this._parent._completeUriWithoutQuery + "/" + this._uri;
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
  var that = this;

  function processData() {
    that._createVisualElements();
    if (!isRoot) {
      // Create a new tile
      var tileDefinition = that._create3DTileDefinition();

      var tileBlob = new Blob([JSON.stringify(tileDefinition)], {
        type: "application/json",
      });

      var inPlaceTileURL = URL.createObjectURL(tileBlob);
      var resource = Resource.createIfNeeded(inPlaceTileURL);

      that._tile = new Cesium3DTile(
        that._layer._tileset,
        resource,
        tileDefinition,
        that._parent._tile
      );
    }
  }

  // if we don't have a nodepage index load from json
  if (this._nodeIndex === undefined) {
    return this._dataSource._loadJson(
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

  return new _Promise(function (resolve, reject) {
    that._layer._getNodeInNodePages(that._nodeIndex).then(function (data) {
      that._data = data;

      var pageSize = that._layer._data.nodePages.nodesPerPage;
      var node =
        that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
          that._nodeIndex % pageSize
        ];
      if (isRoot) {
        that._uri = "nodes/root";
      } else if (node.mesh !== undefined) {
        var uriIndex =
          that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
            that._nodeIndex % pageSize
          ].mesh.geometry.resource;
        that._uri = "../" + uriIndex;
      }
      if (that._uri !== undefined) {
        that._completeUriWithoutQuery =
          that._parent._completeUriWithoutQuery + "/" + that._uri;
        var query = "";
        if (that._dataSource._query && that._dataSource._query !== "") {
          query = "?" + that._dataSource._query;
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
  var fields = this._layer._data.attributeStorageInfo;

  var that = this;
  function createAndLoadField(fields, index) {
    var newField = new I3SField(that, fields[index]);
    that._fields[newField._storageInfo.name] = newField;
    return newField.load();
  }

  var promises = [];
  for (var i = 0; i < fields.length; i++) {
    promises.push(createAndLoadField(fields, i));
  }

  return _Promise.all(promises);
};

/**
 * @private
 */
I3SNode.prototype._loadChildren = function (waitAllChildren) {
  var that = this;
  return new _Promise(function (resolve, reject) {
    if (!that._childrenAreLoaded) {
      that._childrenAreLoaded = true;
      var childPromises = [];
      if (that._data.children) {
        for (
          var childIndex = 0;
          childIndex < that._data.children.length;
          childIndex++
        ) {
          var child = that._data.children[childIndex];
          var newChild = new I3SNode(that, child.href ? child.href : child);
          that._children.push(newChild);
          var childIsLoaded = newChild.load();
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
          _Promise.all(childPromises).then(function () {
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
  var geometryPromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (this._data.geometryData) {
    for (
      var geomIndex = 0;
      geomIndex < this._data.geometryData.length;
      geomIndex++
    ) {
      var curGeometryData = new I3SGeometry(
        this,
        this._data.geometryData[geomIndex].href
      );
      this._geometryData.push(curGeometryData);
      geometryPromises.push(curGeometryData.load());
    }
  } else if (this._data.mesh) {
    var geometryDefinition = this._layer._findBestGeometryBuffers(
      this._data.mesh.geometry.definition,
      ["position", "uv0"]
    );

    var geometryURI = "./geometries/" + geometryDefinition.bufferIndex;
    var newGeometryData = new I3SGeometry(this, geometryURI);
    newGeometryData._geometryDefinitions = geometryDefinition.definition;
    newGeometryData._geometryBufferInfo = geometryDefinition.geometryBufferInfo;
    this._geometryData.push(newGeometryData);
    geometryPromises.push(newGeometryData.load());
  }

  return _Promise.all(geometryPromises);
};

/**
 * @private
 */
I3SNode.prototype._loadFeatureData = function () {
  var featurePromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (this._data.featureData) {
    for (
      var featureIndex = 0;
      featureIndex < this._data.featureData.length;
      featureIndex++
    ) {
      var newfeatureData = new I3SFeature(
        this,
        this._data.featureData[featureIndex].href
      );
      this._featureData.push(newfeatureData);
      featurePromises.push(newfeatureData.load());
    }
  }

  return _Promise.all(featurePromises);
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
  var obb = this._data.obb;
  var mbs = this._data.mbs;

  var boundingVolume = {};
  var position;

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
    position = _WGS84ToCartesian(obb.center[0], obb.center[1], obb.center[2]);
  } else if (mbs) {
    boundingVolume = {
      sphere: [0, 0, 0, mbs[3]],
    };
    position = _WGS84ToCartesian(mbs[0], mbs[1], mbs[2]);
  } else {
    console.error(this);
  }

  // compute the geometric error
  var metersPerPixel = Infinity;

  var span = 0;
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
      var maxScreenThreshold =
        Math.sqrt(this._data.lodThreshold) / (Math.PI * 0.25);
      metersPerPixel = span / maxScreenThreshold;
    } else {
      console.error("Unsupported lodSelectionMetricType in Layer");
    }
  } else if (this._data.lodSelection !== undefined) {
    for (
      var lodIndex = 0;
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
  var geometricError = metersPerPixel * 16;

  // transformations
  var hpr = new HeadingPitchRoll(0, 0, 0);
  var orientation = Transforms.headingPitchRollQuaternion(position, hpr);

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

  var localTransforms = this._globalTransforms.clone();

  if (this._parent._globalTransforms) {
    Matrix4.multiply(
      this._globalTransforms,
      this._parent.inverseGlobalTransform,
      localTransforms
    );
  }

  // get children definition
  var childrenDefinition = [];
  for (var childIndex = 0; childIndex < this._children.length; childIndex++) {
    childrenDefinition.push(
      this._children[childIndex]._create3DTileDefinition()
    );
  }

  // Create a tile set
  var inPlaceTileDefinition = {
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

  // Add an entry in the data source content cache
  _i3sContentCache[this._completeUriWithoutQuery] = {
    i3sNode: this,
  };

  return inPlaceTileDefinition;
};

/**
 * @private
 */
I3SNode.prototype._scheduleCreateContentURL = function () {
  var that = this;
  return new _Promise(function (resolve, reject) {
    that._createContentURL(resolve, that._tile);
  });
};

/**
 * @private
 */
I3SNode.prototype._createContentURL = function (resolve, tile) {
  var rawGLTF = {
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

  // Feature Table
  var featureTableJSON = JSON.stringify({ BATCH_LENGTH: 0 });

  // Batch Table
  var batchTableJSON = JSON.stringify({});

  // Load the geometry data
  var dataPromises = [this._loadFeatureData(), this._loadGeometryData()];

  var that = this;
  _Promise.all(dataPromises).then(function () {
    // Binary GLTF
    var generateGLTF = new _Promise(function (resolve, reject) {
      if (that._geometryData && that._geometryData.length > 0) {
        var task = that._dataSource._GLTFProcessingQueue.addTask({
          geometryData: that._geometryData[0],
          featureData: that._featureData,
          defaultGeometrySchema: that._layer._data.store.defaultGeometrySchema,
          url: that._geometryData[0]._completeUri,
          tile: that._tile,
        });
        task.then(function (data) {
          rawGLTF = data.gltfData;
          that._geometryData[0].customAttributes = data.customAttributes;
          resolve();
        });
      } else {
        resolve();
      }
    });

    generateGLTF.then(function () {
      var binaryGLTFData = that._dataSource._binarizeGLTF(rawGLTF);
      var b3dmRawData = that._dataSource._binarizeB3DM(
        featureTableJSON,
        batchTableJSON,
        binaryGLTFData
      );
      var b3dmDataBlob = new Blob([b3dmRawData], {
        type: "application/binary",
      });
      that._b3dmURL = URL.createObjectURL(b3dmDataBlob);
      resolve();
    });
  });
};

/**
 * @private
 */
I3SNode.prototype._createVisualElements = function () {
  if (!this._dataSource._traceVisuals) {
    return;
  }
  var obb = this._data.obb;
  var mbs = this._data.mbs;

  if (obb) {
    // Add an entity for display
    var orientation = new Quaternion(
      obb.quaternion[0],
      obb.quaternion[1],
      obb.quaternion[2],
      obb.quaternion[3]
    );

    var obbPosition = _WGS84ToCartesian(
      obb.center[0],
      obb.center[1],
      obb.center[2]
    );

    this._entities.locator = this._dataSource.entities.add({
      name: "Extent",
      position: obbPosition,
      orientation: orientation,
      box: {
        dimensions: new Cartesian3(
          obb.halfSize[0] * 2,
          obb.halfSize[1] * 2,
          obb.halfSize[2] * 2
        ),
        fill: false,
        outline: true,
        outlineColor: Color.ORANGE,
      },
    });
  } else if (mbs) {
    var mbsPosition = _WGS84ToCartesian(mbs[0], mbs[1], mbs[2]);

    // Add an entity for display
    this._entities.locator = this._dataSource.entities.add({
      name: "Extent",
      position: mbsPosition,
      ellipse: {
        semiMinorAxis: mbs[3],
        semiMajorAxis: mbs[3],
        fill: false,
        outline: true,
        outlineColor: Color.ORANGE,
      },
    });
  }
};

/*
.########.########....###....########.##.....##.########..########
.##.......##.........##.##......##....##.....##.##.....##.##......
.##.......##........##...##.....##....##.....##.##.....##.##......
.######...######...##.....##....##....##.....##.########..######..
.##.......##.......#########....##....##.....##.##...##...##......
.##.......##.......##.....##....##....##.....##.##....##..##......
.##.......########.##.....##....##.....#######..##.....##.########
*/

/**
 * This class implements an I3S Feature
 * @private
 * @alias I3SFeature
 * @constructor
 * @param {I3SNode} [parent] The parent of that feature
 * @param {String} [uri] The uri to load the data from
 */
function I3SFeature(parent, uri) {
  this._parent = parent;
  this._dataSource = parent._dataSource;
  this._layer = parent._layer;
  this._uri = uri;
  var query = "";
  if (this._dataSource._query && this._dataSource._query !== "") {
    query = "?" + this._dataSource._query;
  }

  this._completeUriWithoutQuery =
    this._parent._completeUriWithoutQuery + "/" + this._uri;
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
  var that = this;
  return this._dataSource._loadJson(
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

/*
.########.####.########.##.......########.
.##........##..##.......##.......##.....##
.##........##..##.......##.......##.....##
.######....##..######...##.......##.....##
.##........##..##.......##.......##.....##
.##........##..##.......##.......##.....##
.##.......####.########.########.########.
*/
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
  this._dataSource = parent._dataSource;
  this._uri = "/attributes/" + storageInfo.key + "/0";
  var query = "";
  if (this._dataSource._query && this._dataSource._query !== "") {
    query = "?" + this._dataSource._query;
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
  var that = this;
  return this._dataSource._loadBinary(
    this._completeUri,
    function (data, resolve) {
      // check if we have a 404
      var dataView = new DataView(data);
      var success = true;
      if (dataView.getUint8(0) === "{".charCodeAt(0)) {
        var textContent = new TextDecoder();
        var str = textContent.decode(data);
        if (str.includes("404")) {
          success = false;
          console.error("Failed to load:", that._completeUri);
        }
      }

      if (success) {
        that._data = data;
        var offset = that._parseHeader(dataView);

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
  var value = null;
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
  var offset = 0;
  this._header = {};
  for (
    var itemIndex = 0;
    itemIndex < this._storageInfo.header.length;
    itemIndex++
  ) {
    var item = this._storageInfo.header[itemIndex];
    var parsedValue = this._parseValue(dataView, item.valueType, offset);
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
    var itemIndex = 0;
    itemIndex < this._storageInfo.ordering.length;
    itemIndex++
  ) {
    var item = this._storageInfo.ordering[itemIndex];
    var desc = this._storageInfo[item];
    if (desc) {
      this._values[item] = [];
      for (var index = 0; index < this._header.count; ++index) {
        if (desc.valueType !== "String") {
          var parsedValue = this._parseValue(dataView, desc.valueType, offset);
          this._values[item].push(parsedValue.value);
          offset = parsedValue.offset;
        } else {
          var stringLen = this._values.attributeByteCounts[index];
          var stringContent = "";
          for (var cIndex = 0; cIndex < stringLen; ++cIndex) {
            var curParsedValue = this._parseValue(
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

/*
..######...########..#######..##.....##.########.########.########..##....##
.##....##..##.......##.....##.###...###.##..........##....##.....##..##..##.
.##........##.......##.....##.####.####.##..........##....##.....##...####..
.##...####.######...##.....##.##.###.##.######......##....########.....##...
.##....##..##.......##.....##.##.....##.##..........##....##...##......##...
.##....##..##.......##.....##.##.....##.##..........##....##....##.....##...
..######...########..#######..##.....##.########....##....##.....##....##...
*/

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
  this._dataSource = parent._dataSource;
  this._layer = parent._layer;
  this._uri = uri;
  var query = "";
  if (this._dataSource._query && this._dataSource._query !== "") {
    query = "?" + this._dataSource._query;
  }

  if (this._parent._nodeIndex) {
    this._completeUriWithoutQuery =
      this._layer._completeUriWithoutQuery +
      "/nodes/" +
      this._parent._data.mesh.geometry.resource +
      "/" +
      this._uri;
    this._completeUri = this._completeUriWithoutQuery + query;
  } else {
    this._completeUriWithoutQuery =
      this._parent._completeUriWithoutQuery + "/" + this._uri;
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
  var that = this;
  return this._dataSource._loadBinary(
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

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
  return new Cartesian3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}
function subtract(a, b) {
  return new Cartesian3(a.x - b.x, a.y - b.y, a.z - b.z);
}
function scale(v, scalar) {
  return new Cartesian3(v.x * scalar, v.y * scalar, v.z * scalar);
}
function normalize(a) {
  return Cartesian3.magnitude(a) > 0
    ? scale(a, 1 / Cartesian3.magnitude(a))
    : a;
}

function sameSide(p1, p2, a, b) {
  var cp1 = cross(subtract(b, a), subtract(p1, a));
  var cp2 = cross(subtract(b, a), subtract(p2, a));
  return dot(cp1, cp2) >= 0;
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
    var position = new Cartesian3(px, py, pz);

    position.x -= this.customAttributes.cartesianCenter.x;
    position.y -= this.customAttributes.cartesianCenter.y;
    position.z -= this.customAttributes.cartesianCenter.z;
    Matrix3.multiplyByVector(
      this.customAttributes.parentRotation,
      position,
      position
    );

    var bestTriDist = Number.MAX_VALUE;
    var bestTri;
    var bestDistSq;
    var bestIndex;
    var bestPt;

    // Brute force lookup, @TODO: this can be improved with a spatial partitioning search system
    var positions = this.customAttributes.positions;
    var indices = this.customAttributes.indices;

    //We may have indexed or non-indexed triangles here
    var triCount;
    if (indices) {
      triCount = indices.length;
    } else {
      triCount = positions.length / 3;
    }

    for (var triIndex = 0; triIndex < triCount; triIndex++) {
      var v0, v1, v2, i0, i1, i2;
      if (indices) {
        i0 = indices[triIndex];
        i1 = indices[triIndex + 1];
        i2 = indices[triIndex + 2];
      } else {
        i0 = triIndex * 3;
        i1 = triIndex * 3 + 3;
        i2 = triIndex * 3 + 6;
      }

      v0 = new Cartesian3(
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2]
      );
      v1 = new Cartesian3(
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2]
      );
      v2 = new Cartesian3(
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
      var v0v1 = subtract(v1, v0);
      var v0v2 = subtract(v2, v0);
      var normal = normalize(cross(v0v1, v0v2));
      //Skip "triangles" with 3 colinear points
      if (Cartesian3.magnitude(normal) === 0) continue;

      var v0p = subtract(position, v0);
      var normalDist = Math.abs(dot(v0p, normal));
      if (normalDist < bestTriDist) {
        bestTriDist = normalDist;
        bestTri = triIndex;

        //Found a triangle, return the index of the closest point
        var d0 = Cartesian3.magnitudeSquared(subtract(position, v0));
        var d1 = Cartesian3.magnitudeSquared(subtract(position, v1));
        var d2 = Cartesian3.magnitudeSquared(subtract(position, v2));
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
  var query = "";
  if (this._dataSource._query && this._dataSource._query !== "") {
    query = "?" + this._dataSource._query;
  }

  // Get the material definition
  var materialInfo = this._parent._data.mesh
    ? this._parent._data.mesh.material
    : null;
  var materialIndex = 0;
  var isTextured = false;
  var gltfMaterial = {
    pbrMetallicRoughness: {
      metallicFactor: 0.0,
    },
    doubleSided: true,
    name: "Material",
  };

  if (materialInfo) {
    materialIndex = materialInfo.definition;
  }

  var materialDefinition;
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

  var texturePath;

  if (this._parent._data.textureData) {
    texturePath =
      this._parent._completeUriWithoutQuery +
      "/" +
      this._parent._data.textureData[0].href +
      query;
  } else {
    // Choose the JPG for the texture
    var textureName = "0";

    if (this._layer._data.textureSetDefinitions) {
      for (
        var defIndex = 0;
        defIndex < this._layer._data.textureSetDefinitions.length;
        defIndex++
      ) {
        var textureSetDefinition = this._layer._data.textureSetDefinitions[
          defIndex
        ];
        for (
          var formatIndex = 0;
          formatIndex < textureSetDefinition.formats.length;
          formatIndex++
        ) {
          var textureFormat = textureSetDefinition.formats[formatIndex];
          if (textureFormat.format === "jpg") {
            textureName = textureFormat.name;
            break;
          }
        }
      }
    }

    if (this._parent._data.mesh) {
      texturePath =
        this._layer._completeUriWithoutQuery +
        "/nodes/" +
        this._parent._data.mesh.material.resource +
        "/textures/" +
        textureName +
        query;
    }
  }

  var gltfTextures = [];
  var gltfImages = [];
  var gltfSamplers = [];

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

  var gltfData = {
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

/*
..######..##.....##..######..########..#######..##.....##
.##....##.##.....##.##....##....##....##.....##.###...###
.##.......##.....##.##..........##....##.....##.####.####
.##.......##.....##..######.....##....##.....##.##.###.##
.##.......##.....##.......##....##....##.....##.##.....##
.##....##.##.....##.##....##....##....##.....##.##.....##
..######...#######...######.....##.....#######..##.....##

.##.....##..#######...#######..##....##..######.
.##.....##.##.....##.##.....##.##...##..##....##
.##.....##.##.....##.##.....##.##..##...##......
.#########.##.....##.##.....##.#####.....######.
.##.....##.##.....##.##.....##.##..##.........##
.##.....##.##.....##.##.....##.##...##..##....##
.##.....##..#######...#######..##....##..######.
*/

// Reimplement Cesium3DTile.prototype.requestContent so that
// We get a chance to load our own b3dm from I3S data
Cesium3DTile.prototype._hookedRequestContent =
  Cesium3DTile.prototype.requestContent;

/**
 * @private
 */
Cesium3DTile.prototype._resolveHookedObject = function () {
  var that = this;
  // Keep a handle on the early promises
  var _contentReadyToProcessPromise = this._contentReadyToProcessPromise;
  var _contentReadyPromise = this._contentReadyPromise;

  // Call the real requestContent function
  this._hookedRequestContent();

  // Fulfill the promises
  if (_contentReadyToProcessPromise) {
    this._contentReadyToProcessPromise.then(function () {
      _contentReadyToProcessPromise.resolve();
    });
  }

  if (_contentReadyPromise) {
    this._contentReadyPromise.then(function () {
      that._isLoading = false;
      that._content._contentReadyPromise.resolve();
    });
  }
};

Cesium3DTile.prototype.requestContent = function () {
  var that = this;
  if (!this.tileset._isI3STileSet) {
    return this._hookedRequestContent();
  }

  if (!this._isLoading) {
    this._isLoading = true;

    var key = this._contentResource._url;
    if (this._contentResource._originalUrl) {
      key = this._contentResource._originalUrl;
    }

    if (key.startsWith("blob:")) {
      key = key.slice(5);
    }

    var content = _i3sContentCache[key];
    if (!content) {
      console.error("invalid key", key, _i3sContentCache);
      this._resolveHookedObject();
    } else {
      // We load the I3S content
      this._i3sNode = content.i3sNode;
      this._i3sNode._tile = this;

      // Create early promises that will be fulfilled later
      this._contentReadyToProcessPromise = when.defer();
      this._contentReadyPromise = when.defer();

      this._i3sNode._scheduleCreateContentURL().then(function () {
        if (!that._contentResource._originalUrl) {
          that._contentResource._originalUrl = that._contentResource._url;
        }

        that._contentResource._url = that._i3sNode._b3dmURL;
        that._resolveHookedObject();
      });
    }

    // Returns the number of requests
    return 0;
  }

  return 1;
};

Object.defineProperties(Batched3DModel3DTileContent.prototype, {
  /**
   * Gets the I3S Node for the tile content.
   * @memberof Batched3DModel3DTileContent.prototype
   * @type {string}
   */
  i3sNode: {
    get: function () {
      return this._tile._i3sNode;
    },
  },
});

/*
.##......##..#######..########..##....##.########.########.
.##..##..##.##.....##.##.....##.##...##..##.......##.....##
.##..##..##.##.....##.##.....##.##..##...##.......##.....##
.##..##..##.##.....##.########..#####....######...########.
.##..##..##.##.....##.##...##...##..##...##.......##...##..
.##..##..##.##.....##.##....##..##...##..##.......##....##.
..###..###...#######..##.....##.##....##.########.##.....##

..######...#######..########..########
.##....##.##.....##.##.....##.##......
.##.......##.....##.##.....##.##......
.##.......##.....##.##.....##.######..
.##.......##.....##.##.....##.##......
.##....##.##.....##.##.....##.##......
..######...#######..########..########
*/
function _workerCode() {
  var _tracecode = false;
  var traceCode = function () {};
  if (_tracecode) {
    traceCode = console.log;
  }

  // adapted from Ellipsoid.prototype.geodeticSurfaceNormalCartographic in Ellipsoid.js
  function geodeticSurfaceNormalCartographic(cartographic, result) {
    var longitude = cartographic.longitude;
    var latitude = cartographic.latitude;
    var cosLatitude = Math.cos(latitude);

    var x = cosLatitude * Math.cos(longitude);
    var y = cosLatitude * Math.sin(longitude);
    var z = Math.sin(latitude);

    // Normalize
    var length = Math.sqrt(x * x + y * y + z * z);
    result.x = x / length;
    result.y = y / length;
    result.z = z / length;
  }

  // adapted from Ellipsoid.prototype.cartographicToCartesian in Ellipsoid.js
  var n = { x: 0, y: 0, z: 0 };
  var k = { x: 0, y: 0, z: 0 };
  function cartographicToCartesian(cartographic, ellipsoidRadiiSquare, result) {
    geodeticSurfaceNormalCartographic(cartographic, n);
    k.x = ellipsoidRadiiSquare.x * n.x;
    k.y = ellipsoidRadiiSquare.y * n.y;
    k.z = ellipsoidRadiiSquare.z * n.z;
    var gamma = Math.sqrt(n.x * k.x + n.y * k.y + n.z * k.z);
    k.x /= gamma;
    k.y /= gamma;
    k.z /= gamma;

    n.x *= cartographic.height;
    n.y *= cartographic.height;
    n.z *= cartographic.height;

    result.x = k.x + n.x;
    result.y = k.y + n.y;
    result.z = k.z + n.z;
  }

  // adapted from Matrix3.multiplyByVector in Matrix3.js
  function multiplyByVector(matrix, cartesian, result) {
    var vX = cartesian.x;
    var vY = cartesian.y;
    var vZ = cartesian.z;

    result.x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
    result.y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
    result.z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;
  }

  var _degToRad = 0.017453292519943;
  var cartographic = {
    longitude: 0,
    latitude: 0,
    height: 0,
  };

  var position = {
    x: 0,
    y: 0,
    z: 0,
  };

  var normal = {
    x: 0,
    y: 0,
    z: 0,
  };

  var rotatedPosition = {
    x: 0,
    y: 0,
    z: 0,
  };

  var rotatedNormal = {
    x: 0,
    y: 0,
    z: 0,
  };

  /*
  ..#######..########..########.##.....##..#######..##.....##.########.########.########..####..######.
  .##.....##.##.....##....##....##.....##.##.....##.###...###.##..........##....##.....##..##..##....##
  .##.....##.##.....##....##....##.....##.##.....##.####.####.##..........##....##.....##..##..##......
  .##.....##.########.....##....#########.##.....##.##.###.##.######......##....########...##..##......
  .##.....##.##...##......##....##.....##.##.....##.##.....##.##..........##....##...##....##..##......
  .##.....##.##....##.....##....##.....##.##.....##.##.....##.##..........##....##....##...##..##....##
  ..#######..##.....##....##....##.....##..#######..##.....##.########....##....##.....##.####..######.
  .########..#######.
  ....##....##.....##
  ....##....##.....##
  ....##....##.....##
  ....##....##.....##
  ....##....##.....##
  ....##.....#######.
  .########.##.......##.......####.########...######...#######..####.########.....###....##......
  .##.......##.......##........##..##.....##.##....##.##.....##..##..##.....##...##.##...##......
  .##.......##.......##........##..##.....##.##.......##.....##..##..##.....##..##...##..##......
  .######...##.......##........##..########...######..##.....##..##..##.....##.##.....##.##......
  .##.......##.......##........##..##..............##.##.....##..##..##.....##.#########.##......
  .##.......##.......##........##..##........##....##.##.....##..##..##.....##.##.....##.##......
  .########.########.########.####.##.........######...#######..####.########..##.....##.########
  */

  function mercatorAngleToGeodeticLatitude(mercatorAngle) {
    return Math.PI / 2.0 - 2.0 * Math.atan(Math.exp(-mercatorAngle));
  }

  function geodeticLatitudeToMercatorAngle(latitude) {
    var maximumLatitude = mercatorAngleToGeodeticLatitude(Math.PI);

    // Clamp the latitude coordinate to the valid Mercator bounds.
    if (latitude > maximumLatitude) {
      latitude = maximumLatitude;
    } else if (latitude < -maximumLatitude) {
      latitude = -maximumLatitude;
    }
    var sinLatitude = Math.sin(latitude);
    return 0.5 * Math.log((1.0 + sinLatitude) / (1.0 - sinLatitude));
  }

  function geographicToWebMercator(lon, lat, ellipsoid) {
    var semimajorAxis = ellipsoid._maximumRadius;

    var x = lon * semimajorAxis;
    var y = geodeticLatitudeToMercatorAngle(lat) * semimajorAxis;

    return { x: x, y: y };
  }

  function bilinearInterpolate(tx, ty, h00, h10, h01, h11) {
    var a = h00 * (1 - tx) + h10 * tx;
    var b = h01 * (1 - tx) + h11 * tx;
    return a * (1 - ty) + b * ty;
  }

  function sampleMap(u, v, width, data) {
    var address = u + v * width;
    return data[address];
  }

  function sampleGeoid(sampleX, sampleY, geoidData) {
    var extent = geoidData.nativeExtent;
    var x =
      ((sampleX - extent.west) / (extent.east - extent.west)) *
      (geoidData.width - 1);
    var y =
      ((sampleY - extent.south) / (extent.north - extent.south)) *
      (geoidData.height - 1);
    var xi = Math.floor(x);
    var yi = Math.floor(y);

    x -= xi;
    y -= yi;

    var xNext = xi < geoidData.width ? xi + 1 : xi;
    var yNext = yi < geoidData.height ? yi + 1 : yi;

    yi = geoidData.height - 1 - yi;
    yNext = geoidData.height - 1 - yNext;

    var h00 = sampleMap(xi, yi, geoidData.width, geoidData.buffer);
    var h10 = sampleMap(xNext, yi, geoidData.width, geoidData.buffer);
    var h01 = sampleMap(xi, yNext, geoidData.width, geoidData.buffer);
    var h11 = sampleMap(xNext, yNext, geoidData.width, geoidData.buffer);

    var finalHeight = bilinearInterpolate(x, y, h00, h10, h01, h11);
    finalHeight = finalHeight * geoidData.scale + geoidData.offset;
    return finalHeight;
  }

  function sampleGeoidFromList(lon, lat, geoidDataList) {
    for (var i = 0; i < geoidDataList.length; i++) {
      var localExtent = geoidDataList[i].nativeExtent;
      var lonRadian = (lon / 180) * Math.PI;
      var latRadian = (lat / 180) * Math.PI;

      var localPt = {};
      if (geoidDataList[i].projectionType === "WebMercator") {
        localPt = geographicToWebMercator(
          lonRadian,
          latRadian,
          geoidDataList[i].projection._ellipsoid
        );
      } else {
        localPt.x = lonRadian;
        localPt.y = latRadian;
      }

      if (
        localPt.x > localExtent.west &&
        localPt.x < localExtent.east &&
        localPt.y > localExtent.south &&
        localPt.y < localExtent.north
      ) {
        return sampleGeoid(localPt.x, localPt.y, geoidDataList[i]);
      }
    }

    return 0;
  }

  function orthometricToEllipsoidal(
    vertexCount,
    position,
    scale_x,
    scale_y,
    center,
    geoidDataList,
    fast
  ) {
    // Fast conversion (using the center of the tile)
    var centerHeight = sampleGeoidFromList(
      center.long,
      center.lat,
      geoidDataList
    );

    if (fast) {
      for (var i = 0; i < vertexCount; ++i) {
        position[i * 3 + 2] += centerHeight;
      }
    } else {
      for (var j = 0; j < vertexCount; ++j) {
        var height = sampleGeoidFromList(
          center.long + scale_x * position[j * 3],
          center.lat + scale_y * position[j * 3 + 1],
          geoidDataList
        );
        position[j * 3 + 2] += height;
      }
    }
  }

  /*
  .########.########.....###....##....##..######..########..#######..########..##.....##
  ....##....##.....##...##.##...###...##.##....##.##.......##.....##.##.....##.###...###
  ....##....##.....##..##...##..####..##.##.......##.......##.....##.##.....##.####.####
  ....##....########..##.....##.##.##.##..######..######...##.....##.########..##.###.##
  ....##....##...##...#########.##..####.......##.##.......##.....##.##...##...##.....##
  ....##....##....##..##.....##.##...###.##....##.##.......##.....##.##....##..##.....##
  ....##....##.....##.##.....##.##....##..######..##........#######..##.....##.##.....##

  .##........#######...######.....###....##......
  .##.......##.....##.##....##...##.##...##......
  .##.......##.....##.##........##...##..##......
  .##.......##.....##.##.......##.....##.##......
  .##.......##.....##.##.......#########.##......
  .##.......##.....##.##....##.##.....##.##......
  .########..#######...######..##.....##.########
  */

  function transformToLocal(
    vertexCount,
    positions,
    normals,
    cartographicCenter,
    cartesianCenter,
    parentRotation,
    ellipsoidRadiiSquare,
    scale_x,
    scale_y
  ) {
    if (
      vertexCount === 0 ||
      positions === undefined ||
      positions.length === 0
    ) {
      return;
    }

    traceCode("converting " + vertexCount + " vertices ");
    for (var i = 0; i < vertexCount; ++i) {
      var indexOffset = i * 3;
      var indexOffset1 = indexOffset + 1;
      var indexOffset2 = indexOffset + 2;

      // Convert position from long, lat, height to Cartesian
      cartographic.longitude =
        _degToRad *
        (cartographicCenter.long + scale_x * positions[indexOffset]);
      cartographic.latitude =
        _degToRad *
        (cartographicCenter.lat + scale_y * positions[indexOffset1]);
      cartographic.height = cartographicCenter.alt + positions[indexOffset2];

      cartographicToCartesian(cartographic, ellipsoidRadiiSquare, position);

      position.x -= cartesianCenter.x;
      position.y -= cartesianCenter.y;
      position.z -= cartesianCenter.z;

      multiplyByVector(parentRotation, position, rotatedPosition);

      positions[indexOffset] = rotatedPosition.x;
      positions[indexOffset1] = rotatedPosition.y;
      positions[indexOffset2] = rotatedPosition.z;

      if (normals) {
        normal.x = normals[indexOffset];
        normal.y = normals[indexOffset1];
        normal.z = normals[indexOffset2];

        multiplyByVector(parentRotation, normal, rotatedNormal);

        // @TODO: check if normals are Z-UP or Y-UP and flip y and z
        normals[indexOffset] = rotatedNormal.x;
        normals[indexOffset1] = rotatedNormal.y;
        normals[indexOffset2] = rotatedNormal.z;
      }
    }
  }

  /*
  ..######..########...#######..########.....##.....##.##.....##
  .##....##.##.....##.##.....##.##.....##....##.....##.##.....##
  .##.......##.....##.##.....##.##.....##....##.....##.##.....##
  .##.......########..##.....##.########.....##.....##.##.....##
  .##.......##...##...##.....##.##...........##.....##..##...##.
  .##....##.##....##..##.....##.##...........##.....##...##.##..
  ..######..##.....##..#######..##............#######.....###...
  */

  function cropUVs(vertexCount, uv0s, uvRegions) {
    for (var vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
      var minU = uvRegions[vertexIndex * 4] / 65535.0;
      var minV = uvRegions[vertexIndex * 4 + 1] / 65535.0;
      var scaleU =
        (uvRegions[vertexIndex * 4 + 2] - uvRegions[vertexIndex * 4]) / 65535.0;
      var scaleV =
        (uvRegions[vertexIndex * 4 + 3] - uvRegions[vertexIndex * 4 + 1]) /
        65535.0;

      uv0s[vertexIndex * 2] *= scaleU;
      uv0s[vertexIndex * 2] += minU;

      uv0s[vertexIndex * 2 + 1] *= scaleV;
      uv0s[vertexIndex * 2 + 1] += minV;
    }
  }

  /*
  ..######...########.##....##.########.########.....###....########.########
  .##....##..##.......###...##.##.......##.....##...##.##......##....##......
  .##........##.......####..##.##.......##.....##..##...##.....##....##......
  .##...####.######...##.##.##.######...########..##.....##....##....######..
  .##....##..##.......##..####.##.......##...##...#########....##....##......
  .##....##..##.......##...###.##.......##....##..##.....##....##....##......
  ..######...########.##....##.########.##.....##.##.....##....##....########

  .####.##....##.########.########.########..##....##....###....##......
  ..##..###...##....##....##.......##.....##.###...##...##.##...##......
  ..##..####..##....##....##.......##.....##.####..##..##...##..##......
  ..##..##.##.##....##....######...########..##.##.##.##.....##.##......
  ..##..##..####....##....##.......##...##...##..####.#########.##......
  ..##..##...###....##....##.......##....##..##...###.##.....##.##......
  .####.##....##....##....########.##.....##.##....##.##.....##.########

  .########..##.....##.########.########.########.########.
  .##.....##.##.....##.##.......##.......##.......##.....##
  .##.....##.##.....##.##.......##.......##.......##.....##
  .########..##.....##.######...######...######...########.
  .##.....##.##.....##.##.......##.......##.......##...##..
  .##.....##.##.....##.##.......##.......##.......##....##.
  .########...#######..##.......##.......########.##.....##
  */

  function generateGLTFBuffer(
    vertexCount,
    indices,
    positions,
    normals,
    uv0s,
    colors
  ) {
    if (
      vertexCount === 0 ||
      positions === undefined ||
      positions.length === 0
    ) {
      return {
        buffers: [],
        bufferViews: [],
        accessors: [],
        meshes: [],
        nodes: [],
        nodesInScene: [],
      };
    }

    var buffers = [];
    var bufferViews = [];
    var accessors = [];
    var meshes = [];
    var nodes = [];
    var nodesInScene = [];

    // if we provide indices, then the vertex count is the length
    // of that array, otherwise we assume non-indexed triangle
    if (indices) {
      vertexCount = indices.length;
    }

    // allocate array
    var indexArray = new Uint32Array(vertexCount);

    if (indices) {
      // set the indices
      for (var vertexIndex = 0; vertexIndex < vertexCount; ++vertexIndex) {
        indexArray[vertexIndex] = indices[vertexIndex];
      }
    } else {
      // generate indices
      for (
        var newVertexIndex = 0;
        newVertexIndex < vertexCount;
        ++newVertexIndex
      ) {
        indexArray[newVertexIndex] = newVertexIndex;
      }
    }

    // push to the buffers, bufferViews and accessors
    var indicesBlob = new Blob([indexArray], { type: "application/binary" });
    var indicesURL = URL.createObjectURL(indicesBlob);

    var endIndex = vertexCount;

    // POSITIONS
    var meshPositions = positions.subarray(0, endIndex * 3);
    var positionsBlob = new Blob([meshPositions], {
      type: "application/binary",
    });
    var positionsURL = URL.createObjectURL(positionsBlob);

    // NORMALS
    var meshNormals = normals ? normals.subarray(0, endIndex * 3) : null;
    var normalsURL = null;
    if (meshNormals) {
      var normalsBlob = new Blob([meshNormals], {
        type: "application/binary",
      });
      normalsURL = URL.createObjectURL(normalsBlob);
    }

    // UV0s
    var meshUv0s = uv0s ? uv0s.subarray(0, endIndex * 2) : null;
    var uv0URL = null;
    if (meshUv0s) {
      var uv0Blob = new Blob([meshUv0s], { type: "application/binary" });
      uv0URL = URL.createObjectURL(uv0Blob);
    }

    // Colors
    // @TODO: check we can directly import vertex colors as bytes instead
    // of having to convert to float
    var meshColorsInBytes = colors ? colors.subarray(0, endIndex * 4) : null;
    var meshColors = null;
    var colorsURL = null;
    if (meshColorsInBytes) {
      var colorCount = meshColorsInBytes.length;
      meshColors = new Float32Array(colorCount);
      for (var i = 0; i < colorCount; ++i) {
        meshColors[i] = meshColorsInBytes[i] / 255.0;
      }

      var colorsBlob = new Blob([meshColors], { type: "application/binary" });
      colorsURL = URL.createObjectURL(colorsBlob);
    }

    var posIndex = 0;
    var normalIndex = 0;
    var uv0Index = 0;
    var colorIndex = 0;
    var indicesIndex = 0;

    var currentIndex = posIndex;

    var attributes = {};

    // POSITIONS
    attributes.POSITION = posIndex;
    buffers.push({
      uri: positionsURL,
      byteLength: meshPositions.byteLength,
    });
    bufferViews.push({
      buffer: posIndex,
      byteOffset: 0,
      byteLength: meshPositions.byteLength,
      target: 34962,
    });
    accessors.push({
      bufferView: posIndex,
      byteOffset: 0,
      componentType: 5126,
      count: vertexCount,
      type: "VEC3",
      max: [0, 0, 0],
      min: [0, 0, 0],
    });

    // NORMALS
    if (normalsURL) {
      ++currentIndex;
      normalIndex = currentIndex;
      attributes.NORMAL = normalIndex;
      buffers.push({
        uri: normalsURL,
        byteLength: meshNormals.byteLength,
      });
      bufferViews.push({
        buffer: normalIndex,
        byteOffset: 0,
        byteLength: meshNormals.byteLength,
        target: 34962,
      });
      accessors.push({
        bufferView: normalIndex,
        byteOffset: 0,
        componentType: 5126,
        count: vertexCount,
        type: "VEC3",
        max: [0, 0, 0],
        min: [0, 0, 0],
      });
    }

    // UV0
    if (uv0URL) {
      ++currentIndex;
      uv0Index = currentIndex;
      attributes.TEXCOORD_0 = uv0Index;
      buffers.push({
        uri: uv0URL,
        byteLength: meshUv0s.byteLength,
      });
      bufferViews.push({
        buffer: uv0Index,
        byteOffset: 0,
        byteLength: meshUv0s.byteLength,
        target: 34962,
      });
      accessors.push({
        bufferView: uv0Index,
        byteOffset: 0,
        componentType: 5126,
        count: vertexCount,
        type: "VEC2",
        max: [0, 0],
        min: [0, 0],
      });
    }

    // COLORS
    if (colorsURL) {
      ++currentIndex;
      colorIndex = currentIndex;
      attributes.COLOR_0 = colorIndex;
      buffers.push({
        uri: colorsURL,
        byteLength: meshColors.byteLength,
      });
      bufferViews.push({
        buffer: colorIndex,
        byteOffset: 0,
        byteLength: meshColors.byteLength,
        target: 34962,
      });
      accessors.push({
        bufferView: colorIndex,
        byteOffset: 0,
        componentType: 5126,
        count: vertexCount,
        type: "VEC4",
        max: [0, 0, 0, 0],
        min: [0, 0, 0, 0],
      });
    }

    // INDICES
    ++currentIndex;
    indicesIndex = currentIndex;
    buffers.push({
      uri: indicesURL,
      byteLength: indexArray.byteLength,
    });
    bufferViews.push({
      buffer: indicesIndex,
      byteOffset: 0,
      byteLength: indexArray.byteLength,
      target: 34963,
    });
    accessors.push({
      bufferView: indicesIndex,
      byteOffset: 0,
      componentType: 5125,
      count: vertexCount,
      type: "SCALAR",
      max: [0],
      min: [0],
    });

    // create a new mesh for this page
    meshes.push({
      primitives: [
        {
          attributes: attributes,
          indices: indicesIndex,
          material: 0,
        },
      ],
    });
    nodesInScene.push(0);
    nodes.push({ mesh: 0 });

    return {
      buffers: buffers,
      bufferViews: bufferViews,
      accessors: accessors,
      meshes: meshes,
      nodes: nodes,
      nodesInScene: nodesInScene,
    };
  }

  /*
  ..######...########..#######..##.....##.########.########.########..##....##
  .##....##..##.......##.....##.###...###.##..........##....##.....##..##..##.
  .##........##.......##.....##.####.####.##..........##....##.....##...####..
  .##...####.######...##.....##.##.###.##.######......##....########.....##...
  .##....##..##.......##.....##.##.....##.##..........##....##...##......##...
  .##....##..##.......##.....##.##.....##.##..........##....##....##.....##...
  ..######...########..#######..##.....##.########....##....##.....##....##...

  .########..########..######...#######..########..########.########.
  .##.....##.##.......##....##.##.....##.##.....##.##.......##.....##
  .##.....##.##.......##.......##.....##.##.....##.##.......##.....##
  .##.....##.######...##.......##.....##.##.....##.######...########.
  .##.....##.##.......##.......##.....##.##.....##.##.......##...##..
  .##.....##.##.......##....##.##.....##.##.....##.##.......##....##.
  .########..########..######...#######..########..########.##.....##
  */

  function decode(data, schema, bufferInfo, featureData) {
    var magicNumber = new Uint8Array(data, 0, 5);
    if (
      magicNumber[0] === "D".charCodeAt() &&
      magicNumber[1] === "R".charCodeAt() &&
      magicNumber[2] === "A".charCodeAt() &&
      magicNumber[3] === "C".charCodeAt() &&
      magicNumber[4] === "O".charCodeAt()
    ) {
      return decodeDracoEncodedGeometry(data, bufferInfo);
    }
    return decodeBinaryGeometry(data, schema, bufferInfo, featureData);
  }

  /*
  .########..########.....###.....######...#######.
  .##.....##.##.....##...##.##...##....##.##.....##
  .##.....##.##.....##..##...##..##.......##.....##
  .##.....##.########..##.....##.##.......##.....##
  .##.....##.##...##...#########.##.......##.....##
  .##.....##.##....##..##.....##.##....##.##.....##
  .########..##.....##.##.....##..######...#######.

  .########..########..######...#######..########..########.########.
  .##.....##.##.......##....##.##.....##.##.....##.##.......##.....##
  .##.....##.##.......##.......##.....##.##.....##.##.......##.....##
  .##.....##.######...##.......##.....##.##.....##.######...########.
  .##.....##.##.......##.......##.....##.##.....##.##.......##...##..
  .##.....##.##.......##....##.##.....##.##.....##.##.......##....##.
  .########..########..######...#######..########..########.##.....##
  */

  function decodeDracoEncodedGeometry(data, bufferInfo) {
    // Create the Draco decoder.
    // eslint-disable-next-line new-cap,no-undef
    var dracoDecoderModule = DracoDecoderModule();
    var buffer = new dracoDecoderModule.DecoderBuffer();

    var byteArray = new Uint8Array(data);
    buffer.Init(byteArray, byteArray.length);

    // Create a buffer to hold the encoded data.
    var dracoDecoder = new dracoDecoderModule.Decoder();
    var geometryType = dracoDecoder.GetEncodedGeometryType(buffer);
    var metadataQuerier = new dracoDecoderModule.MetadataQuerier();

    // Decode the encoded geometry.
    // See: https://github.com/google/draco/blob/master/src/draco/javascript/emscripten/draco_web_decoder.idl
    var dracoGeometry;
    var status;
    if (geometryType === dracoDecoderModule.TRIANGULAR_MESH) {
      dracoGeometry = new dracoDecoderModule.Mesh();
      status = dracoDecoder.DecodeBufferToMesh(buffer, dracoGeometry);
    }

    var decodedGeometry = {
      vertexCount: [0],
      featureCount: 0,
    };

    // if all is OK
    if (status && status.ok() && dracoGeometry.ptr !== 0) {
      var faceCount = dracoGeometry.num_faces();
      var attributesCount = dracoGeometry.num_attributes();
      var vertexCount = dracoGeometry.num_points();
      decodedGeometry.indices = new Uint32Array(faceCount * 3);
      var faces = decodedGeometry.indices;

      decodedGeometry.vertexCount[0] = vertexCount;
      decodedGeometry.scale_x = 1;
      decodedGeometry.scale_y = 1;

      // Decode faces
      // @TODO: Replace that code with GetTrianglesUInt32Array for better efficiency
      var face = new dracoDecoderModule.DracoInt32Array(3);
      for (var faceIndex = 0; faceIndex < faceCount; ++faceIndex) {
        dracoDecoder.GetFaceFromMesh(dracoGeometry, faceIndex, face);
        faces[faceIndex * 3] = face.GetValue(0);
        faces[faceIndex * 3 + 1] = face.GetValue(1);
        faces[faceIndex * 3 + 2] = face.GetValue(2);
      }

      dracoDecoderModule.destroy(face);

      for (var attrIndex = 0; attrIndex < attributesCount; ++attrIndex) {
        var dracoAttribute = dracoDecoder.GetAttribute(
          dracoGeometry,
          attrIndex
        );

        var attributeData = decodeDracoAttribute(
          dracoDecoderModule,
          dracoDecoder,
          dracoGeometry,
          dracoAttribute,
          vertexCount
        );

        // initial mapping
        var dracoAttributeType = dracoAttribute.attribute_type();
        var attributei3sName = "unknown";

        if (dracoAttributeType === dracoDecoderModule.POSITION) {
          attributei3sName = "positions";
        } else if (dracoAttributeType === dracoDecoderModule.NORMAL) {
          attributei3sName = "normals";
        } else if (dracoAttributeType === dracoDecoderModule.COLOR) {
          attributei3sName = "colors";
        } else if (dracoAttributeType === dracoDecoderModule.TEX_COORD) {
          attributei3sName = "uv0s";
        }

        // get the metadata
        var metadata = dracoDecoder.GetAttributeMetadata(
          dracoGeometry,
          attrIndex
        );

        if (metadata.ptr) {
          var numEntries = metadataQuerier.NumEntries(metadata);
          for (var entry = 0; entry < numEntries; ++entry) {
            var entryName = metadataQuerier.GetEntryName(metadata, entry);
            if (entryName === "i3s-scale_x") {
              decodedGeometry.scale_x = metadataQuerier.GetDoubleEntry(
                metadata,
                "i3s-scale_x"
              );
            } else if (entryName === "i3s-scale_y") {
              decodedGeometry.scale_y = metadataQuerier.GetDoubleEntry(
                metadata,
                "i3s-scale_y"
              );
            } else if (entryName === "i3s-attribute-type") {
              attributei3sName = metadataQuerier.GetStringEntry(
                metadata,
                "i3s-attribute-type"
              );
            }
          }
        }

        if (decodedGeometry[attributei3sName] !== undefined) {
          console.log("Attribute already exists", attributei3sName);
        }

        decodedGeometry[attributei3sName] = attributeData;

        if (attributei3sName === "feature-index") {
          decodedGeometry.featureCount++;
        }
      }

      dracoDecoderModule.destroy(dracoGeometry);
    }

    dracoDecoderModule.destroy(metadataQuerier);
    dracoDecoderModule.destroy(dracoDecoder);

    return decodedGeometry;
  }

  function decodeDracoAttribute(
    dracoDecoderModule,
    dracoDecoder,
    dracoGeometry,
    dracoAttribute,
    vertexCount
  ) {
    var bufferSize = dracoAttribute.num_components() * vertexCount;
    var dracoAttributeData = null;

    var handlers = [
      function () {}, // DT_INVALID - 0
      function () {
        // DT_INT8 - 1
        dracoAttributeData = new dracoDecoderModule.DracoInt8Array(bufferSize);
        var success = dracoDecoder.GetAttributeInt8ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Int8Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_UINT8 - 2
        dracoAttributeData = new dracoDecoderModule.DracoInt8Array(bufferSize);
        var success = dracoDecoder.GetAttributeUInt8ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Uint8Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_INT16 - 3
        dracoAttributeData = new dracoDecoderModule.DracoInt16Array(bufferSize);
        var success = dracoDecoder.GetAttributeInt16ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Int16Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_UINT16 - 4
        dracoAttributeData = new dracoDecoderModule.DracoInt16Array(bufferSize);
        var success = dracoDecoder.GetAttributeUInt16ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Uint16Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_INT32 - 5
        dracoAttributeData = new dracoDecoderModule.DracoInt32Array(bufferSize);
        var success = dracoDecoder.GetAttributeInt32ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Int32Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_UINT32 - 6
        dracoAttributeData = new dracoDecoderModule.DracoInt32Array(bufferSize);
        var success = dracoDecoder.GetAttributeUInt32ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Uint32Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_INT64 - 7
      },
      function () {
        // DT_UINT64 - 8
      },
      function () {
        // DT_FLOAT32 - 9
        dracoAttributeData = new dracoDecoderModule.DracoFloat32Array(
          bufferSize
        );
        var success = dracoDecoder.GetAttributeFloatForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Float32Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
      function () {
        // DT_FLOAT64 - 10
      },
      function () {
        // DT_FLOAT32 - 11
        dracoAttributeData = new dracoDecoderModule.DracoUInt8Array(bufferSize);
        var success = dracoDecoder.GetAttributeUInt8ForAllPoints(
          dracoGeometry,
          dracoAttribute,
          dracoAttributeData
        );

        if (!success) {
          console.error("Bad stream");
        }
        var attributeData = new Uint8Array(bufferSize);
        for (var i = 0; i < bufferSize; ++i) {
          attributeData[i] = dracoAttributeData.GetValue(i);
        }
        return attributeData;
      },
    ];

    var attributeData = handlers[dracoAttribute.data_type()]();

    if (dracoAttributeData) {
      dracoDecoderModule.destroy(dracoAttributeData);
    }

    return attributeData;
  }

  /*
  .########..####.##....##....###....########..##....##
  .##.....##..##..###...##...##.##...##.....##..##..##.
  .##.....##..##..####..##..##...##..##.....##...####..
  .########...##..##.##.##.##.....##.########.....##...
  .##.....##..##..##..####.#########.##...##......##...
  .##.....##..##..##...###.##.....##.##....##.....##...
  .########..####.##....##.##.....##.##.....##....##...

  .########..########..######...#######..########..########.########.
  .##.....##.##.......##....##.##.....##.##.....##.##.......##.....##
  .##.....##.##.......##.......##.....##.##.....##.##.......##.....##
  .##.....##.######...##.......##.....##.##.....##.######...########.
  .##.....##.##.......##.......##.....##.##.....##.##.......##...##..
  .##.....##.##.......##....##.##.....##.##.....##.##.......##....##.
  .########..########..######...#######..########..########.##.....##
  */

  var binaryAttributeDecoders = {
    position: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 3;
      decodedGeometry.positions = new Float32Array(data, offset, count);
      offset += count * 4;
      return offset;
    },
    normal: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 3;
      decodedGeometry.normals = new Float32Array(data, offset, count);
      offset += count * 4;
      return offset;
    },
    uv0: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 2;
      decodedGeometry.uv0s = new Float32Array(data, offset, count);
      offset += count * 4;
      return offset;
    },
    color: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 4;
      decodedGeometry.colors = new Uint8Array(data, offset, count);
      offset += count;
      return offset;
    },
    featureId: function (decodedGeometry, data, offset) {
      //We don't need to use this for anything so just increment the offset
      var count = decodedGeometry.featureCount;
      offset += count * 8;
      return offset;
    },
    id: function (decodedGeometry, data, offset) {
      //We don't need to use this for anything so just increment the offset
      var count = decodedGeometry.featureCount;
      offset += count * 8;
      return offset;
    },
    faceRange: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.featureCount * 2;
      decodedGeometry.faceRange = new Uint32Array(data, offset, count);
      offset += count * 4;
      return offset;
    },
    uvRegion: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 4;
      decodedGeometry["uv-region"] = new Uint16Array(data, offset, count);
      offset += count * 2;
      return offset;
    },
    region: function (decodedGeometry, data, offset) {
      var count = decodedGeometry.vertexCount * 4;
      decodedGeometry["uv-region"] = new Uint16Array(data, offset, count);
      offset += count * 2;
      return offset;
    },
  };

  function decodeBinaryGeometry(data, schema, bufferInfo, featureData) {
    // From this spec:
    // https://github.com/Esri/i3s-spec/blob/master/docs/1.7/defaultGeometrySchema.cmn.md
    var decodedGeometry = {
      vertexCount: 0,
    };

    var dataView = new DataView(data);

    try {
      var offset = 0;
      decodedGeometry.vertexCount = dataView.getUint32(offset, 1);
      offset += 4;

      decodedGeometry.featureCount = dataView.getUint32(offset, 1);
      offset += 4;

      if (bufferInfo) {
        for (
          var attrIndex = 0;
          attrIndex < bufferInfo.attributes.length;
          attrIndex++
        ) {
          if (binaryAttributeDecoders[bufferInfo.attributes[attrIndex]]) {
            offset = binaryAttributeDecoders[bufferInfo.attributes[attrIndex]](
              decodedGeometry,
              data,
              offset
            );
          } else {
            console.error(
              "Unknown decoder for",
              bufferInfo.attributes[attrIndex]
            );
          }
        }
      } else {
        var ordering = schema.ordering;
        var featureAttributeOrder = schema.featureAttributeOrder;

        if (
          featureData &&
          featureData.geometryData &&
          featureData.geometryData[0] &&
          featureData.geometryData[0].params
        ) {
          ordering = Object.keys(
            featureData.geometryData[0].params.vertexAttributes
          );
          featureAttributeOrder = Object.keys(
            featureData.geometryData[0].params.featureAttributes
          );
        }

        // use default geometry schema
        for (var i = 0; i < ordering.length; i++) {
          var decoder = binaryAttributeDecoders[ordering[i]];
          if (!decoder) {
            console.log(ordering[i]);
          }
          offset = decoder(decodedGeometry, data, offset);
        }

        for (var j = 0; j < featureAttributeOrder.length; j++) {
          var curDecoder = binaryAttributeDecoders[featureAttributeOrder[j]];
          if (!curDecoder) {
            console.log(featureAttributeOrder[j]);
          }
          offset = curDecoder(decodedGeometry, data, offset);
        }
      }
    } catch (e) {
      console.error(e);
    }

    decodedGeometry.scale_x = 1;
    decodedGeometry.scale_y = 1;

    return decodedGeometry;
  }

  /*
  .##......##..#######..########..##....##.########.########......######..########.##.....##.########.
  .##..##..##.##.....##.##.....##.##...##..##.......##.....##....##....##....##....##.....##.##.....##
  .##..##..##.##.....##.##.....##.##..##...##.......##.....##....##..........##....##.....##.##.....##
  .##..##..##.##.....##.########..#####....######...########......######.....##....##.....##.########.
  .##..##..##.##.....##.##...##...##..##...##.......##...##............##....##....##.....##.##.....##
  .##..##..##.##.....##.##....##..##...##..##.......##....##.....##....##....##....##.....##.##.....##
  ..###..###...#######..##.....##.##....##.########.##.....##.....######.....##.....#######..########.
  */
  onmessage = function (e) {
    traceCode(e.data.url);

    // Decode the data into geometry
    var geometryData = decode(
      e.data.binaryData,
      e.data.schema,
      e.data.bufferInfo,
      e.data.featureData
    );

    // Adjust height from orthometric to ellipsoidal
    if (e.data.geoidDataList && e.data.geoidDataList.length > 0) {
      orthometricToEllipsoidal(
        geometryData.vertexCount,
        geometryData.positions,
        geometryData.scale_x,
        geometryData.scale_y,
        e.data.cartographicCenter,
        e.data.geoidDataList,
        false
      );
    }

    // Transform vertices to local
    transformToLocal(
      geometryData.vertexCount,
      geometryData.positions,
      geometryData.normals,
      e.data.cartographicCenter,
      e.data.cartesianCenter,
      e.data.parentRotation,
      e.data.ellipsoidRadiiSquare,
      geometryData.scale_x,
      geometryData.scale_y
    );

    // Adjust UVs if there is a UV region
    if (geometryData.uv0s && geometryData["uv-region"]) {
      cropUVs(
        geometryData.vertexCount,
        geometryData.uv0s,
        geometryData["uv-region"]
      );
    }

    // Create the final buffer
    var meshData = generateGLTFBuffer(
      geometryData.vertexCount,
      geometryData.indices,
      geometryData.positions,
      geometryData.normals,
      geometryData.uv0s,
      geometryData.colors
    );

    var customAttributes = {};
    if (geometryData["feature-index"]) {
      customAttributes.positions = geometryData.positions;
      customAttributes.indices = geometryData.indices;
      customAttributes["feature-index"] = geometryData["feature-index"];
      customAttributes.cartesianCenter = e.data.cartesianCenter;
      customAttributes.parentRotation = e.data.parentRotation;
    } else if (geometryData["faceRange"]) {
      customAttributes.positions = geometryData.positions;
      customAttributes.indices = geometryData.indices;
      customAttributes.sourceURL = e.data.url;
      customAttributes.cartesianCenter = e.data.cartesianCenter;
      customAttributes.parentRotation = e.data.parentRotation;

      //Build the feature index array from the faceRange. This should store the
      customAttributes["feature-index"] = new Array(
        geometryData.positions.length
      );
      for (
        var range = 0;
        range < geometryData["faceRange"].length - 1;
        range += 2
      ) {
        var curIndex = range / 2;
        var rangeStart = geometryData["faceRange"][range];
        var rangeEnd = geometryData["faceRange"][range + 1];
        for (var i = rangeStart; i <= rangeEnd; i++) {
          customAttributes["feature-index"][i * 3] = curIndex;
          customAttributes["feature-index"][i * 3 + 1] = curIndex;
          customAttributes["feature-index"][i * 3 + 2] = curIndex;
        }
      }
    }

    meshData.customAttributes = customAttributes;
    postMessage(meshData);
  };
}

/*
.########..########...#######...######..########..######...######..####.##....##..######..
.##.....##.##.....##.##.....##.##....##.##.......##....##.##....##..##..###...##.##....##.
.##.....##.##.....##.##.....##.##.......##.......##.......##........##..####..##.##.......
.########..########..##.....##.##.......######....######...######...##..##.##.##.##...####
.##........##...##...##.....##.##.......##.............##.......##..##..##..####.##....##.
.##........##....##..##.....##.##....##.##.......##....##.##....##..##..##...###.##....##.
.##........##.....##..#######...######..########..######...######..####.##....##..######..

..#######..##.....##.########.##.....##.########
.##.....##.##.....##.##.......##.....##.##......
.##.....##.##.....##.##.......##.....##.##......
.##.....##.##.....##.######...##.....##.######..
.##..##.##.##.....##.##.......##.....##.##......
.##....##..##.....##.##.......##.....##.##......
..#####.##..#######..########..#######..########
*/
function I3SGLTFProcessingQueue() {
  var that = this;
  this._queue = [];
  this._processing = false;
  this._createWorkers(function () {
    that._process();
  });
}

I3SGLTFProcessingQueue.prototype._process = function () {
  var that = this;
  for (var workerIndex = 0; workerIndex < this._workers.length; workerIndex++) {
    if (this._workers[workerIndex].isReadyToWork) {
      if (this._queue.length > 0) {
        var task = this._queue.shift();
        task.execute(this._workers[workerIndex]);
        traceCode("Process Queue:" + this._queue.length);
      }
    }
  }
  setTimeout(function () {
    that._process();
  }, 100);
};

I3SGLTFProcessingQueue.prototype._createWorkers = function (cb) {
  var workerCode = String(_workerCode);

  var externalModules = ["/Source/ThirdParty/Workers/draco_decoder.js"];

  var fetchPromises = [];
  var externalModuleData = [];

  for (var index = 0; index < externalModules.length; ++index) {
    fetchPromises.push(when.defer());
    externalModuleData.push("");

    var fetchFunction = function (curIndex) {
      fetch(externalModules[curIndex]).then(function (response) {
        response.text().then(function (data) {
          externalModuleData[curIndex] = data;
          fetchPromises[curIndex].resolve();
        });
      });
    };
    fetchFunction(index);
  }

  var externalModulesLoaded = when.all(fetchPromises);
  var that = this;
  externalModulesLoaded.then(function () {
    var externalModuleCode = "";
    for (var i = 0; i < externalModuleData.length; i++)
      externalModuleCode += externalModuleData[i];

    workerCode = workerCode.replace("function _workerCode() {", "");
    workerCode = workerCode.slice(0, -1);
    var blob = new Blob([externalModuleCode + workerCode], {
      type: "test/javascript",
    });

    // Create the workers
    var workerCount = FeatureDetection.hardwareConcurrency - 1;
    traceCode("Using " + workerCount + " workers");
    that._workers = [];

    for (var loop = 0; loop < workerCount; ++loop) {
      var worker = new Worker(window.URL.createObjectURL(blob));

      worker.setTask = (function (thisWorker) {
        return function (task) {
          thisWorker._task = task;
          thisWorker.isReadyToWork = false;
          thisWorker.postMessage(task.payload);
        };
      })(worker);

      worker.onmessage = (function (thisWorker) {
        return function (e) {
          var task = thisWorker._task;

          var gltfData = task._geometry._generateGLTF(
            e.data.nodesInScene,
            e.data.nodes,
            e.data.meshes,
            e.data.buffers,
            e.data.bufferViews,
            e.data.accessors
          );

          thisWorker._task = null;
          thisWorker.isReadyToWork = true;
          task.resolve({
            gltfData: gltfData,
            customAttributes: e.data.customAttributes,
          });
        };
      })(worker);

      worker.isReadyToWork = true;
      that._workers.push(worker);
    }

    cb();
  });
};

I3SGLTFProcessingQueue.prototype.addTask = function (data) {
  var newTask = {
    _geometry: data.geometryData,
    _featureData:
      data.featureData && data.featureData[0] ? data.featureData[0] : null,
    _schema: data.defaultGeometrySchema,
    _tile: data.tile,
    _geoidDataList: data.geometryData._dataSource._geoidDataList,
    execute: function (worker) {
      // Prepare the data to send to the worker
      //var geometryData = this._geometry._data;
      var parentData = this._geometry._parent._data;
      var parentRotationInverseMatrix = this._geometry._parent
        ._inverseRotationMatrix;

      var payload = {
        binaryData: this._geometry._data,
        featureData: this._featureData ? this._featureData._data : null,
        schema: this._schema,
        bufferInfo: this._geometry._geometryBufferInfo,
        ellipsoidRadiiSquare: Ellipsoid.WGS84._radiiSquared,
        url: data.url,
        geoidDataList: this._geoidDataList,
      };

      var center = {
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

      payload.cartographicCenter = center;
      payload.cartesianCenter = _WGS84ToCartesian(
        center.long,
        center.lat,
        center.alt
      );

      var axisFlipRotation = Matrix3.fromRotationX(-Math.PI / 2);
      var parentRotation = new Matrix3();

      Matrix3.multiply(
        axisFlipRotation,
        parentRotationInverseMatrix,
        parentRotation
      );

      payload.parentRotation = [
        parentRotation[0],
        parentRotation[1],
        parentRotation[2],
        parentRotation[3],
        parentRotation[4],
        parentRotation[5],
        parentRotation[6],
        parentRotation[7],
        parentRotation[8],
      ];

      this.payload = payload;

      // launch the job on the web worker
      worker.setTask(this);
    },
  };

  var that = this;
  return new _Promise(function (resolve, reject) {
    newTask.resolve = resolve;
    newTask.reject = reject;
    that._queue.push(newTask);
  });
};

/*
.########.##.....##.########...#######..########..########
.##........##...##..##.....##.##.....##.##.....##....##...
.##.........##.##...##.....##.##.....##.##.....##....##...
.######......###....########..##.....##.########.....##...
.##.........##.##...##........##.....##.##...##......##...
.##........##...##..##........##.....##.##....##.....##...
.########.##.....##.##.........#######..##.....##....##...
*/
export default I3SDataSource;
