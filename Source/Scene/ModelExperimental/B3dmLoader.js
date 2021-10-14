import Axis from "../Axis.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import deprecationWarning from "../../Core/deprecationWarning.js";
import FeatureTable from "../FeatureTable.js";
import FeatureMetadata from "../FeatureMetadata.js";
import getJsonFromTypedArray from "../../Core/getJsonFromTypedArray.js";
import GltfLoader from "../GltfLoader.js";
import parseBatchTable from "../parseBatchTable.js";
import ResourceLoader from "../ResourceLoader.js";
import RuntimeError from "../../Core/RuntimeError.js";
import when from "../../ThirdParty/when.js";
import MetadataClass from "../MetadataClass.js";
import Matrix4 from "../../Core/Matrix4.js";

var B3dmLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  LOADED: 2,
  PROCESSING: 3,
  READY: 4,
  FAILED: 5,
};

var UINT32_BYTE_SIZE = Uint32Array.BYTES_PER_ELEMENT;

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
 * @param {Resource} options.b3dmResource The {@link Resource} containing the B3DM.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the B3DM contents.
 * @param {Number} [options.byteOffset] The byte offset to the beginning of the B3DM contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
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

  // Since the 3D Tiles code handles loading of the tile contents, the B3dmLoader starts at the LOADED stage.
  this._state = B3dmLoaderState.LOADED;
  this._promise = when.defer();
  this._texturesLoadedPromise = when.defer();
  this._gltfLoader = undefined;

  // Loaded results.
  this._batchLength = 0;
  this._rtcTransform = undefined;
  this._featureTable = undefined;
  this._batchTable = undefined;
  this._components = undefined;
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
   * @memberof GltfLoader.prototype
   *
   * @type {Promise}
   * @readonly
   * @private
   */
  texturesLoadedPromise: {
    get: function () {
      return this._texturesLoadedPromise.promise;
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
   * The RTC transform stored in the feature table.
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {Matrix4}
   * @readonly
   * @private
   */
  rtcTransform: {
    get: function () {
      return this._rtcTransform;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
B3dmLoader.prototype.load = function () {
  var byteStart = this._byteOffset;
  var offset = byteStart;
  var arrayBuffer = this._arrayBuffer;
  var typedArray = new Uint8Array(arrayBuffer);

  // Parse B3DM header.
  var header = parseHeader(arrayBuffer);
  // The length of the B3DM header.
  offset += header.headerByteLength;
  // The byte length of the B3DM.
  var byteLength = header.byteLength;
  var batchLength = header.batchLength;
  var batchTableJsonByteLength = header.batchTableJsonByteLength;
  var batchTableBinaryByteLength = header.batchTableBinaryByteLength;
  var featureTableJsonByteLength = header.featureTableJsonByteLength;
  var featureTableBinaryByteLength = header.featureTableBinaryByteLength;

  // Load feature table.
  var featureTable = loadFeatureTable(
    arrayBuffer,
    offset,
    typedArray,
    batchLength,
    featureTableJsonByteLength,
    featureTableBinaryByteLength
  );
  offset += featureTableJsonByteLength + featureTableBinaryByteLength;
  this._featureTable = featureTable;

  // Set batch length.
  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  featureTable.featuresLength = batchLength;
  this._batchLength = batchLength;

  // Load batch table.
  var batchTable = loadBatchTable(
    arrayBuffer,
    offset,
    typedArray,
    batchTableJsonByteLength,
    batchTableBinaryByteLength
  );
  offset += batchTableJsonByteLength + batchTableBinaryByteLength;
  this._batchTable = batchTable;

  // Load glTF.
  var gltfByteLength = byteStart + byteLength - offset;
  if (gltfByteLength === 0) {
    throw new RuntimeError("glTF byte length must be greater than 0.");
  }
  var gltfTypedArray;
  if (offset % 4 === 0) {
    gltfTypedArray = new Uint8Array(arrayBuffer, offset, gltfByteLength);
  } else {
    // Create a copy of the glb so that it is 4-byte aligned
    B3dmLoader._deprecationWarning(
      "b3dm-glb-unaligned",
      "The embedded glb is not aligned to a 4-byte boundary."
    );
    gltfTypedArray = new Uint8Array(
      typedArray.subarray(offset, offset + gltfByteLength)
    );
  }

  var gltfLoader = new GltfLoader({
    upAxis: this._upAxis,
    typedArray: gltfTypedArray,
    forwardAxis: this._forwardAxis,
    gltfResource: this._b3dmResource,
    baseResource: this._baseResource,
    releaseGltfJson: this._releaseGltfJson,
    incrementallyLoadTextures: this._incrementallyLoadTextures,
  });

  this._gltfLoader = gltfLoader;
  this._state = B3dmLoaderState.LOADING;

  gltfLoader.load();
};

function handleError(gltfLoader, error) {
  gltfLoader.unload();
  gltfLoader._state = B3dmLoaderState.FAILED;
  var errorMessage = "Failed to load B3DM";
  error = gltfLoader.getError(errorMessage, error);
  gltfLoader._promise.reject(error);
}

function parseHeader(arrayBuffer) {
  var offset = 0;
  var dataView = new DataView(arrayBuffer);

  // Skip B3DM magic.
  offset += UINT32_BYTE_SIZE;
  var version = dataView.getUint32(offset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Batched 3D Model version 1 is supported. Version " +
        version +
        " is not."
    );
  }
  offset += UINT32_BYTE_SIZE;

  var byteLength = dataView.getUint32(offset, true);
  offset += UINT32_BYTE_SIZE;
  var featureTableJsonByteLength = dataView.getUint32(offset, true);
  offset += UINT32_BYTE_SIZE;
  var featureTableBinaryByteLength = dataView.getUint32(offset, true);
  offset += UINT32_BYTE_SIZE;
  var batchTableJsonByteLength = dataView.getUint32(offset, true);
  offset += UINT32_BYTE_SIZE;
  var batchTableBinaryByteLength = dataView.getUint32(offset, true);
  offset += UINT32_BYTE_SIZE;

  var batchLength;
  // Legacy header #1: [batchLength] [batchTableByteLength]
  // Legacy header #2: [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]
  // Current header: [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength]
  // If the header is in the first legacy format 'batchTableJsonByteLength' will be the start of the JSON string (a quotation mark) or the glTF magic.
  // Accordingly its first byte will be either 0x22 or 0x67, and so the minimum uint32 expected is 0x22000000 = 570425344 = 570MB. It is unlikely that the feature table JSON will exceed this length.
  // The check for the second legacy format is similar, except it checks 'batchTableBinaryByteLength' instead
  if (batchTableJsonByteLength >= 570425344) {
    // First legacy check
    offset -= UINT32_BYTE_SIZE * 2;
    batchLength = featureTableJsonByteLength;
    batchTableJsonByteLength = featureTableBinaryByteLength;
    batchTableBinaryByteLength = 0;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    B3dmLoader._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchLength] [batchTableByteLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  } else if (batchTableBinaryByteLength >= 570425344) {
    // Second legacy check
    offset -= UINT32_BYTE_SIZE;
    batchLength = batchTableJsonByteLength;
    batchTableJsonByteLength = featureTableJsonByteLength;
    batchTableBinaryByteLength = featureTableBinaryByteLength;
    featureTableJsonByteLength = 0;
    featureTableBinaryByteLength = 0;
    B3dmLoader._deprecationWarning(
      "b3dm-legacy-header",
      "This b3dm header is using the legacy format [batchTableJsonByteLength] [batchTableBinaryByteLength] [batchLength]. The new format is [featureTableJsonByteLength] [featureTableBinaryByteLength] [batchTableJsonByteLength] [batchTableBinaryByteLength] from https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/Batched3DModel."
    );
  }

  return {
    headerByteLength: offset,
    byteLength: byteLength,
    batchLength: batchLength,
    batchTableJsonByteLength: batchTableJsonByteLength,
    batchTableBinaryByteLength: batchTableBinaryByteLength,
    featureTableJsonByteLength: featureTableJsonByteLength,
    featureTableBinaryByteLength: featureTableBinaryByteLength,
  };
}

function loadFeatureTable(
  arrayBuffer,
  offset,
  typedArray,
  batchLength,
  featureTableJsonByteLength,
  featureTableBinaryByteLength
) {
  var featureTableJson;
  if (featureTableJsonByteLength === 0) {
    featureTableJson = {
      BATCH_LENGTH: defaultValue(batchLength, 0),
    };
  } else {
    featureTableJson = getJsonFromTypedArray(
      typedArray,
      offset,
      featureTableJsonByteLength
    );
    offset += featureTableJsonByteLength;
  }

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    offset,
    featureTableBinaryByteLength
  );
  offset += featureTableBinaryByteLength;

  return new Cesium3DTileFeatureTable(featureTableJson, featureTableBinary);
}

function loadBatchTable(
  arrayBuffer,
  offset,
  typedArray,
  batchTableJsonByteLength,
  batchTableBinaryByteLength
) {
  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // PERFORMANCE_IDEA: is it possible to allocate this on-demand?  Perhaps keep the
    // arraybuffer/string compressed in memory and then decompress it when it is first accessed.
    //
    // We could also make another request for it, but that would make the property set/get
    // API async, and would double the number of numbers in some cases.
    batchTableJson = getJsonFromTypedArray(
      typedArray,
      offset,
      batchTableJsonByteLength
    );
    offset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        offset,
        batchTableBinaryByteLength
      );
      // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
      batchTableBinary = new Uint8Array(batchTableBinary);
      offset += batchTableBinaryByteLength;
    }
  }

  return {
    json: batchTableJson,
    binary: batchTableBinary,
  };
}

B3dmLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  var gltfLoader = this._gltfLoader;

  // Once the components are loaded, add the feature metadata created from the batch table.
  var that = this;
  gltfLoader.process(frameState);
  gltfLoader.promise.then(function () {
    if (that.isDestroyed()) {
      return;
    }

    var components = gltfLoader.components;
    processGltfComponents(that, components);
    that._components = components;

    that._state = B3dmLoader.READY;
    that._promise.resolve(that);
  });

  gltfLoader.texturesLoadedPromise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      that._texturesLoadedPromise.resolve(that);
    })
    .otherwise(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
};

function processGltfComponents(loader, components) {
  var batchTable = loader._batchTable;
  var batchLength = loader._batchLength;
  var featureTable = loader._featureTable;

  var featureMetadata;
  if (defined(batchTable.json)) {
    // Add the feature metadata from the batch table to the model components.
    featureMetadata = parseBatchTable({
      count: batchLength,
      batchTable: batchTable.json,
      binaryBody: batchTable.binary,
    });
  } else {
    // If batch table is not defined, create a feature table without any properties.
    var emptyFeatureTable = new FeatureTable({
      count: batchLength,
    });
    var featureTables = {};
    featureTables[MetadataClass.BATCH_TABLE_CLASS_NAME] = emptyFeatureTable;
    featureMetadata = new FeatureMetadata({
      schema: {},
      featureTables: featureTables,
    });
  }
  components.featureMetadata = featureMetadata;

  // Apply the RTC Center transform, if present.
  var rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    var rootNodes = components.scene.nodes;
    for (var i = 0; i < rootNodes.length; i++) {
      applyRTCTransform(rootNodes[i], rtcCenter);
    }
  }
}

function applyRTCTransform(node, rtcCenter) {
  if (defined(node.matrix)) {
    var rtcTransform = Matrix4.fromTranslation(Cartesian3.fromArray(rtcCenter));
    Matrix4.multiply(node.matrix, rtcTransform, node.matrix);
  } else if (defined(node.translation)) {
    Cartesian3.add(rtcCenter, node.translation, node.translation);
  } else {
    node.translation = rtcCenter;
  }
}

B3dmLoader.prototype.unload = function () {
  if (defined(this._gltfLoader)) {
    this._gltfLoader.unload();
  }

  this._components = undefined;
};

// This can be overridden for testing purposes
B3dmLoader._deprecationWarning = deprecationWarning;

export default B3dmLoader;
