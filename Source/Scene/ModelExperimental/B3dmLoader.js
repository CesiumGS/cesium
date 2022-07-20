import Axis from "../Axis.js";
import B3dmParser from "../B3dmParser.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
import StructuralMetadata from "../StructuralMetadata.js";
import GltfLoader from "../GltfLoader.js";
import Matrix4 from "../../Core/Matrix4.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import parseBatchTable from "../parseBatchTable.js";
import PropertyTable from "../PropertyTable.js";
import ResourceLoader from "../ResourceLoader.js";
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
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {Boolean} [options.loadAttributesAsTypedArray=false] Load all attributes as typed arrays instead of GPU buffers. If the attributes are interleaved in the glTF they will be de-interleaved in the typed array.
 * @param {Boolean} [options.loadAttributesFor2D=false] If true, load the positions buffer and any instanced attribute buffers as typed arrays for accurately projecting models to 2D.
 * @param {Boolean} [options.loadIndicesForWireframe=false] Load the index buffer as a typed array. This is useful for creating wireframe indices in WebGL1.
 * @param {Boolean} [options.loadPrimitiveOutline=true] If true, load outlines from the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set false to avoid post-processing geometry at load time.
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
  const loadAttributesAsTypedArray = defaultValue(
    options.loadAttributesAsTypedArray,
    false
  );
  const loadAttributesFor2D = defaultValue(options.loadAttributesFor2D, false);
  const loadIndicesForWireframe = defaultValue(
    options.loadIndicesForWireframe,
    false
  );
  const loadPrimitiveOutline = defaultValue(options.loadPrimitiveOutline, true);

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
  this._loadAttributesAsTypedArray = loadAttributesAsTypedArray;
  this._loadAttributesFor2D = loadAttributesFor2D;
  this._loadIndicesForWireframe = loadIndicesForWireframe;
  this._loadPrimitiveOutline = loadPrimitiveOutline;

  this._state = B3dmLoaderState.UNLOADED;

  this._promise = undefined;

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
   * A promise that resolves to the resource when the resource is ready, or undefined if the resource hasn't started loading.
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {Promise.<B3dmLoader>|undefined}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise;
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
 * @returns {Promise.<B3dmLoader>} A promise which resolves to the loader when the resource loading is completed.
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
    loadAttributesAsTypedArray: this._loadAttributesAsTypedArray,
    loadAttributesFor2D: this._loadAttributesFor2D,
    loadIndicesForWireframe: this._loadIndicesForWireframe,
    loadPrimitiveOutline: this._loadPrimitiveOutline,
    renameBatchIdSemantic: true,
  });

  this._gltfLoader = gltfLoader;
  this._state = B3dmLoaderState.LOADING;

  const that = this;
  gltfLoader.load();
  this._promise = gltfLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      const components = gltfLoader.components;
      components.transform = that._transform;
      createStructuralMetadata(that, components);
      that._components = components;

      that._state = B3dmLoaderState.READY;
      return that;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      return handleError(that, error);
    });

  return this._promise;
};

function handleError(b3dmLoader, error) {
  b3dmLoader.unload();
  b3dmLoader._state = B3dmLoaderState.FAILED;
  const errorMessage = "Failed to load b3dm";
  error = b3dmLoader.getError(errorMessage, error);
  return Promise.reject(error);
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

function createStructuralMetadata(loader, components) {
  const batchTable = loader._batchTable;
  const batchLength = loader._batchLength;

  if (batchLength === 0) {
    return;
  }

  let structuralMetadata;
  if (defined(batchTable.json)) {
    // Add the structural metadata from the batch table to the model components.
    structuralMetadata = parseBatchTable({
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
    structuralMetadata = new StructuralMetadata({
      schema: {},
      propertyTables: [emptyPropertyTable],
    });
  }

  // Add the feature ID attribute to the primitives.
  const nodes = components.scene.nodes;
  const length = nodes.length;
  for (let i = 0; i < length; i++) {
    processNode(nodes[i]);
  }
  components.structuralMetadata = structuralMetadata;
}

// Recursive function to add the feature ID attribute to all primitives that have a feature ID vertex attribute.
function processNode(node) {
  const childrenLength = node.children.length;
  for (let i = 0; i < childrenLength; i++) {
    processNode(node.children[i]);
  }

  const primitivesLength = node.primitives.length;
  for (let i = 0; i < primitivesLength; i++) {
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
      featureIdAttribute.positionalLabel = "featureId_0";
      primitive.featureIds.push(featureIdAttribute);
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
