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

const B3dmLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

const FeatureIdAttribute = ModelComponents.FeatureIdAttribute;

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

  const b3dmResource = options.b3dmResource;
  let baseResource = options.baseResource;
  const arrayBuffer = options.arrayBuffer;
  const byteOffset = defaultValue(options.byteOffset, 0);
  const releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  const asynchronous = defaultValue(options.asynchronous, true);
  const incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  const upAxis = defaultValue(options.upAxis, Axis.Y);
  const forwardAxis = defaultValue(options.forwardAxis, Axis.X);
  const loadAsTypedArray = defaultValue(options.loadAsTypedArray, false);

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
});

/**
 * Loads the resource.
 * @private
 */
B3dmLoader.prototype.load = function () {
  const b3dm = B3dmParser.parse(this._arrayBuffer, this._byteOffset);

  let batchLength = b3dm.batchLength;
  const featureTableJson = b3dm.featureTableJson;
  const featureTableBinary = b3dm.featureTableBinary;
  const batchTableJson = b3dm.batchTableJson;
  const batchTableBinary = b3dm.batchTableBinary;

  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );
  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  // Set batch length.
  this._batchLength = batchLength;
  // Set the RTC Center transform, if present.
  const rtcCenter = featureTable.getGlobalProperty(
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

  const gltfLoader = new GltfLoader({
    typedArray: b3dm.gltf,
    upAxis: this._upAxis,
    forwardAxis: this._forwardAxis,
    gltfResource: this._b3dmResource,
    baseResource: this._baseResource,
    releaseGltfJson: this._releaseGltfJson,
    incrementallyLoadTextures: this._incrementallyLoadTextures,
    loadAsTypedArray: this._loadAsTypedArray,
    renameBatchIdSemantic: true,
  });

  this._gltfLoader = gltfLoader;
  this._state = B3dmLoaderState.LOADING;

  const that = this;
  gltfLoader.load();
  gltfLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      const components = gltfLoader.components;
      components.transform = that._transform;
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
  const errorMessage = "Failed to load b3dm";
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
  const batchTable = loader._batchTable;
  const batchLength = loader._batchLength;

  if (batchLength === 0) {
    return;
  }

  let featureMetadata;
  if (defined(batchTable.json)) {
    // Add the feature metadata from the batch table to the model components.
    featureMetadata = parseBatchTable({
      count: batchLength,
      batchTable: batchTable.json,
      binaryBody: batchTable.binary,
    });
  } else {
    // If batch table is not defined, create a property table without any properties.
    const emptyPropertyTable = new PropertyTable({
      name: MetadataClass.BATCH_TABLE_CLASS_NAME,
      count: batchLength,
    });
    featureMetadata = new FeatureMetadata({
      schema: {},
      propertyTables: [emptyPropertyTable],
    });
  }

  // Add the feature ID attribute to the primitives.
  const nodes = components.scene.nodes;
  for (let i = 0; i < nodes.length; i++) {
    processNode(nodes[i]);
  }
  components.featureMetadata = featureMetadata;
}

// Recursive function to add the feature ID attribute to all primitives that have a feature ID vertex attribute.
function processNode(node) {
  if (!defined(node.children) && !defined(node.primitives)) {
    return;
  }

  let i;
  if (defined(node.children)) {
    for (i = 0; i < node.children.length; i++) {
      processNode(node.children[i]);
    }
  }

  if (defined(node.primitives)) {
    for (i = 0; i < node.primitives.length; i++) {
      const primitive = node.primitives[i];
      const featureIdVertexAttribute = ModelExperimentalUtility.getAttributeBySemantic(
        primitive,
        VertexAttributeSemantic.FEATURE_ID
      );
      if (defined(featureIdVertexAttribute)) {
        featureIdVertexAttribute.setIndex = 0;
        const featureIdAttribute = new FeatureIdAttribute();
        featureIdAttribute.propertyTableId = 0;
        featureIdAttribute.setIndex = 0;
        primitive.featureIds.push(featureIdAttribute);
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
