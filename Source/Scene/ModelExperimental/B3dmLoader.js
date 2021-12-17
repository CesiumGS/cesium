import Axis from "../Axis.js";
import B3dmParser from "../B3dmParser.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import FeatureMetadata from "../FeatureMetadata.js";
import GltfLoader from "../GltfLoader.js";
import Matrix4 from "../../Core/Matrix4.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import parseBatchTable from "../parseBatchTable.js";
import PropertyTable from "../PropertyTable.js";
import ResourceLoader from "../ResourceLoader.js";
import when from "../../ThirdParty/when.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

var B3dmLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

var FeatureIdAttribute = ModelComponents.FeatureIdAttribute;

/**
 * Loads a Batched 3D Model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias B3dmLoader
 * @constructor
 * @augments ResourceLoader
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.b3dmResource The {@link Resource} containing the b3dm.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the b3dm contents.
 * @param {Number} [options.byteOffset] The byte offset to the beginning of the b3dm contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {Boolean} [options.loadAsTypedArray=false] Load all attributes as typed arrays instead of GPU buffers.
 */
function B3dmLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  var b3dmResource = options.b3dmResource;
  var baseResource = options.baseResource;
  var arrayBuffer = options.arrayBuffer;
  var byteOffset = defaultValue(options.byteOffset, 0);
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  var upAxis = defaultValue(options.upAxis, Axis.Y);
  var forwardAxis = defaultValue(options.forwardAxis, Axis.X);
  var loadAsTypedArray = defaultValue(options.loadAsTypedArray, false);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.b3dmResource", b3dmResource);
  Check.typeOf.object("options.arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  baseResource = defined(baseResource) ? baseResource : b3dmResource.clone();

  this._b3dmResource = b3dmResource;
  this._baseResource = baseResource;
  this._arrayBuffer = arrayBuffer;
  this._byteOffset = byteOffset;
  this._releaseGltfJson = releaseGltfJson;
  this._asynchronous = asynchronous;
  this._incrementallyLoadTextures = incrementallyLoadTextures;
  this._upAxis = upAxis;
  this._forwardAxis = forwardAxis;
  this._loadAsTypedArray = loadAsTypedArray;

  this._state = B3dmLoaderState.UNLOADED;

  this._promise = when.defer();

  this._gltfLoader = undefined;

  // Loaded results.
  this._batchLength = 0;
  this._propertyTable = undefined;

  // The batch table object contains a json and a binary component access using keys of the same name.
  this._batchTable = undefined;
  this._components = undefined;
  this._transform = Matrix4.IDENTITY;
}

if (defined(Object.create)) {
  B3dmLoader.prototype = Object.create(ResourceLoader.prototype);
  B3dmLoader.prototype.constructor = B3dmLoader;
}

Object.defineProperties(B3dmLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {Promise.<B3dmLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },

  /**
   * A promise that resolves when all textures are loaded.
   * When <code>incrementallyLoadTextures</code> is true this may resolve after
   * <code>promise</code> resolves.
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {Promise}
   * @readonly
   * @private
   */
  texturesLoadedPromise: {
    get: function () {
      return this._gltfLoader.texturesLoadedPromise;
    },
  },
  /**
   * The cache key of the resource
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {String}
   * @readonly
   * @private
   */
  cacheKey: {
    get: function () {
      return undefined;
    },
  },

  /**
   * The loaded components.
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {ModelComponents.Components}
   * @readonly
   * @private
   */
  components: {
    get: function () {
      return this._components;
    },
  },

  /**
   * A world-space transform to apply to the primitives.
   * See {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel#global-semantics}
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {Matrix4}
   * @readonly
   * @private
   */
  transform: {
    get: function () {
      return this._transform;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
B3dmLoader.prototype.load = function () {
  var b3dm = B3dmParser.parse(this._arrayBuffer, this._byteOffset);

  var batchLength = b3dm.batchLength;
  var featureTableJson = b3dm.featureTableJson;
  var featureTableBinary = b3dm.featureTableBinary;
  var batchTableJson = b3dm.batchTableJson;
  var batchTableBinary = b3dm.batchTableBinary;

  var featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );
  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  // Set batch length.
  this._batchLength = batchLength;
  // Set the RTC Center transform, if present.
  var rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    this._transform = Matrix4.fromTranslation(Cartesian3.fromArray(rtcCenter));
  }

  this._batchTable = {
    json: batchTableJson,
    binary: batchTableBinary,
  };

  var gltfLoader = new GltfLoader({
    upAxis: this._upAxis,
    typedArray: b3dm.gltf,
    forwardAxis: this._forwardAxis,
    gltfResource: this._b3dmResource,
    baseResource: this._baseResource,
    releaseGltfJson: this._releaseGltfJson,
    incrementallyLoadTextures: this._incrementallyLoadTextures,
    loadAsTypedArray: this._loadAsTypedArray,
  });

  this._gltfLoader = gltfLoader;
  this._state = B3dmLoaderState.LOADING;

  var that = this;
  gltfLoader.load();
  gltfLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      var components = gltfLoader.components;
      createFeatureMetadata(that, components);
      that._components = components;

      that._state = B3dmLoaderState.READY;
      that._promise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
};

function handleError(b3dmLoader, error) {
  b3dmLoader.unload();
  b3dmLoader._state = B3dmLoaderState.FAILED;
  var errorMessage = "Failed to load b3dm";
  error = b3dmLoader.getError(errorMessage, error);
  b3dmLoader._promise.reject(error);
}

B3dmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (this._state === B3dmLoaderState.LOADING) {
    this._state = B3dmLoaderState.PROCESSING;
  }

  if (this._state === B3dmLoaderState.PROCESSING) {
    this._gltfLoader.process(frameState);
  }
};

function createFeatureMetadata(loader, components) {
  var batchTable = loader._batchTable;
  var batchLength = loader._batchLength;

  if (batchLength === 0) {
    return;
  }

  var featureMetadata;
  if (defined(batchTable.json)) {
    // Add the feature metadata from the batch table to the model components.
    featureMetadata = parseBatchTable({
      count: batchLength,
      batchTable: batchTable.json,
      binaryBody: batchTable.binary,
    });
  } else {
    // If batch table is not defined, create a property table without any properties.
    var emptyPropertyTable = new PropertyTable({
      name: MetadataClass.BATCH_TABLE_CLASS_NAME,
      count: batchLength,
    });
    featureMetadata = new FeatureMetadata({
      schema: {},
      propertyTables: [emptyPropertyTable],
    });
  }

  // Add the feature ID attribute to the primitives.
  var nodes = components.scene.nodes;
  for (var i = 0; i < nodes.length; i++) {
    processNode(nodes[i]);
  }
  components.featureMetadata = featureMetadata;
}

// Recursive function to add the feature ID attribute to all primitives that have a feature ID vertex attribute.
function processNode(node) {
  if (!defined(node.children) && !defined(node.primitives)) {
    return;
  }

  var i;
  if (defined(node.children)) {
    for (i = 0; i < node.children.length; i++) {
      processNode(node.children[i]);
    }
  }

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      var primitive = node.primitives[i];
      var featureIdVertexAttribute = ModelExperimentalUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.FEATURE_ID
      );
      if (defined(featureIdVertexAttribute)) {
        featureIdVertexAttribute.setIndex = 0;
        var featureIdAttribute = new FeatureIdAttribute();
        featureIdAttribute.propertyTableId = 0;
        featureIdAttribute.setIndex = 0;
        primitive.featureIdAttributes.push(featureIdAttribute);
      }
    }
  }
}

B3dmLoader.prototype.unload = function () {
  if (defined(this._gltfLoader)) {
    this._gltfLoader.unload();
  }

  this._components = undefined;
};

export default B3dmLoader;
