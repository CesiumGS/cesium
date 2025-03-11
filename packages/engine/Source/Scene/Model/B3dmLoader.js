import Axis from "../Axis.js";
import B3dmParser from "../B3dmParser.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cesium3DTileFeatureTable from "../Cesium3DTileFeatureTable.js";
import Check from "../../Core/Check.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import Frozen from "../../Core/Frozen.js";
import defined from "../../Core/defined.js";
import StructuralMetadata from "../StructuralMetadata.js";
import GltfLoader from "../GltfLoader.js";
import Matrix4 from "../../Core/Matrix4.js";
import MetadataClass from "../MetadataClass.js";
import ModelComponents from "../ModelComponents.js";
import ModelUtility from "./ModelUtility.js";
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
 * @param {object} options Object with the following properties:
 * @param {Resource} options.b3dmResource The {@link Resource} containing the b3dm.
 * @param {ArrayBuffer} options.arrayBuffer The array buffer of the b3dm contents.
 * @param {number} [options.byteOffset] The byte offset to the beginning of the b3dm contents in the array buffer.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.X] The forward-axis of the glTF model.
 * @param {boolean} [options.loadAttributesAsTypedArray=false] If <code>true</code>, load all attributes as typed arrays instead of GPU buffers. If the attributes are interleaved in the glTF they will be de-interleaved in the typed array.
 * @param {boolean} [options.loadAttributesFor2D=false] If <code>true</code>, load the positions buffer and any instanced attribute buffers as typed arrays for accurately projecting models to 2D.
 * @param {boolean} [options.enablePick=false]  If <code>true</code>, load the positions buffer, any instanced attribute buffers, and index buffer as typed arrays for CPU-enabled picking in WebGL1.
 * @param {boolean} [options.loadIndicesForWireframe=false] If <code>true</code>, load the index buffer as a typed array. This is useful for creating wireframe indices in WebGL1.
 * @param {boolean} [options.loadPrimitiveOutline=true] If <code>true</code>, load outlines from the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set false to avoid post-processing geometry at load time.
 * @param {boolean} [options.loadForClassification=false] If <code>true</code> and if the model has feature IDs, load the feature IDs and indices as typed arrays. This is useful for batching features for classification.
 * */
function B3dmLoader(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  const b3dmResource = options.b3dmResource;
  let baseResource = options.baseResource;
  const arrayBuffer = options.arrayBuffer;
  const byteOffset = options.byteOffset ?? 0;
  const releaseGltfJson = options.releaseGltfJson ?? false;
  const asynchronous = options.asynchronous ?? true;
  const incrementallyLoadTextures = options.incrementallyLoadTextures ?? true;
  const upAxis = options.upAxis ?? Axis.Y;
  const forwardAxis = options.forwardAxis ?? Axis.X;
  const loadAttributesAsTypedArray =
    options.loadAttributesAsTypedArray ?? false;
  const loadAttributesFor2D = options.loadAttributesFor2D ?? false;
  const enablePick = options.enablePick ?? false;
  const loadIndicesForWireframe = options.loadIndicesForWireframe ?? false;
  const loadPrimitiveOutline = options.loadPrimitiveOutline ?? true;
  const loadForClassification = options.loadForClassification ?? false;

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
  this._enablePick = enablePick;
  this._loadIndicesForWireframe = loadIndicesForWireframe;
  this._loadPrimitiveOutline = loadPrimitiveOutline;
  this._loadForClassification = loadForClassification;

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
   * true if textures are loaded, useful when incrementallyLoadTextures is true
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  texturesLoaded: {
    get: function () {
      return this._gltfLoader?.texturesLoaded;
    },
  },
  /**
   * The cache key of the resource
   *
   * @memberof B3dmLoader.prototype
   *
   * @type {string}
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
 * @returns {Promise<B3dmLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @private
 */
B3dmLoader.prototype.load = function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  const b3dm = B3dmParser.parse(this._arrayBuffer, this._byteOffset);

  let batchLength = b3dm.batchLength;
  const featureTableJson = b3dm.featureTableJson;
  const featureTableBinary = b3dm.featureTableBinary;
  const batchTableJson = b3dm.batchTableJson;
  const batchTableBinary = b3dm.batchTableBinary;

  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary,
  );
  batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
  // Set batch length.
  this._batchLength = batchLength;
  // Set the RTC Center transform, if present.
  const rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3,
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
    enablePick: this._enablePick,
    loadIndicesForWireframe: this._loadIndicesForWireframe,
    loadPrimitiveOutline: this._loadPrimitiveOutline,
    loadForClassification: this._loadForClassification,
    renameBatchIdSemantic: true,
  });

  this._gltfLoader = gltfLoader;
  this._state = B3dmLoaderState.LOADING;

  const that = this;
  this._promise = gltfLoader
    .load()
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }

      that._state = B3dmLoaderState.PROCESSING;
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

  if (this._state === B3dmLoaderState.READY) {
    return true;
  }

  if (this._state !== B3dmLoaderState.PROCESSING) {
    return false;
  }

  const ready = this._gltfLoader.process(frameState);
  if (!ready) {
    return false;
  }

  const components = this._gltfLoader.components;

  // Combine the RTC_CENTER transform from the b3dm and the CESIUM_RTC
  // transform from the glTF. In practice usually only one or the
  // other is supplied. If they don't exist the transforms will
  // be identity matrices.
  components.transform = Matrix4.multiplyTransformation(
    this._transform,
    components.transform,
    components.transform,
  );
  createStructuralMetadata(this, components);
  this._components = components;

  // Now that we have the parsed components, we can release the array buffer
  this._arrayBuffer = undefined;

  this._state = B3dmLoaderState.READY;
  return true;
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
    const featureIdVertexAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      VertexAttributeSemantic.FEATURE_ID,
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
  if (defined(this._gltfLoader) && !this._gltfLoader.isDestroyed()) {
    this._gltfLoader.unload();
  }

  this._components = undefined;
  this._arrayBuffer = undefined;
};

export default B3dmLoader;
