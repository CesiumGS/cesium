import ArticulationStageType from "../Core/ArticulationStageType.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import InterpolationType from "../Core/InterpolationType.js";
import Matrix4 from "../Core/Matrix4.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Quaternion from "../Core/Quaternion.js";
import RuntimeError from "../Core/RuntimeError.js";
import Sampler from "../Renderer/Sampler.js";
import getAccessorByteStride from "./GltfPipeline/getAccessorByteStride.js";
import getComponentReader from "./GltfPipeline/getComponentReader.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";
import GltfStructuralMetadataLoader from "./GltfStructuralMetadataLoader.js";
import AttributeType from "./AttributeType.js";
import Axis from "./Axis.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import hasExtension from "./hasExtension.js";
import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js";
import ModelComponents from "./ModelComponents.js";
import PrimitiveLoadPlan from "./PrimitiveLoadPlan.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import SupportedImageFormats from "./SupportedImageFormats.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

const {
  Attribute,
  Indices,
  FeatureIdAttribute,
  FeatureIdTexture,
  FeatureIdImplicitRange,
  MorphTarget,
  Primitive,
  Instances,
  Skin,
  Node,
  AnimatedPropertyType,
  AnimationSampler,
  AnimationTarget,
  AnimationChannel,
  Animation,
  ArticulationStage,
  Articulation,
  Asset,
  Scene,
  Components,
  MetallicRoughness,
  SpecularGlossiness,
  Specular,
  Anisotropy,
  Clearcoat,
  Material,
} = ModelComponents;

/**
 * States of the glTF loading process. These states also apply to
 * asynchronous texture loading unless otherwise noted
 *
 * @enum {number}
 *
 * @private
 */
const GltfLoaderState = {
  /**
   * The initial state of the glTF loader before load() is called.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  NOT_LOADED: 0,
  /**
   * The state of the loader while waiting for the glTF JSON loader promise
   * to resolve.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  LOADING: 1,
  /**
   * The state of the loader once the glTF JSON is loaded but before
   * process() is called.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  LOADED: 2,
  /**
   * The state of the loader while parsing the glTF and creating GPU resources
   * as needed.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  PROCESSING: 3,
  /**
   * For some features like handling CESIUM_primitive_outlines, the geometry
   * must be modified after it is loaded. The post-processing state handles
   * any geometry modification (if needed).
   * <p>
   * This state is not used for asynchronous texture loading.
   * </p>
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  POST_PROCESSING: 4,
  /**
   * Once the processing/post-processing states are finished, the loader
   * enters the processed state (sometimes from a promise chain). The next
   * call to process() will advance to the ready state.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  PROCESSED: 5,
  /**
   * When the loader reaches the ready state, the loaders' promise will be
   * resolved.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  READY: 6,
  /**
   * If an error occurs at any point, the loader switches to the failed state.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  FAILED: 7,
  /**
   * If unload() is called, the loader switches to the unloaded state.
   *
   * @type {number}
   * @constant
   *
   * @private
   */
  UNLOADED: 8,
};

/**
 * Loads a glTF model.
 * <p>
 * Implements the {@link ResourceLoader} interface.
 * </p>
 *
 * @alias GltfLoader
 * @constructor
 * @augments ResourceLoader
 *
 * @param {object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF. This is often the path of the .gltf or .glb file, but may also be the path of the .b3dm, .i3dm, or .cmpt file containing the embedded glb. .cmpt resources should have a URI fragment indicating the index of the inner content to which the glb belongs in order to individually identify the glb in the cache, e.g. http://example.com/tile.cmpt#index=2.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Uint8Array} [options.typedArray] The typed array containing the glTF contents, e.g. from a .b3dm, .i3dm, or .cmpt file.
 * @param {object} [options.gltfJson] A parsed glTF JSON file instead of passing it in as a typed array.
 * @param {boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {boolean} [options.loadAttributesAsTypedArray=false] Load all attributes and indices as typed arrays instead of GPU buffers. If the attributes are interleaved in the glTF they will be de-interleaved in the typed array.
 * @param {boolean} [options.loadAttributesFor2D=false] If <code>true</code>, load the positions buffer and any instanced attribute buffers as typed arrays for accurately projecting models to 2D.
 * @param {boolean} [options.enablePick=false]  If <code>true</code>, load the positions buffer, any instanced attribute buffers, and index buffer as typed arrays for CPU-enabled picking in WebGL1.
 * @param {boolean} [options.loadIndicesForWireframe=false] If <code>true</code>, load the index buffer as both a buffer and typed array. The latter is useful for creating wireframe indices in WebGL1.
 * @param {boolean} [options.loadPrimitiveOutline=true] If <code>true</code>, load outlines from the {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/CESIUM_primitive_outline|CESIUM_primitive_outline} extension. This can be set false to avoid post-processing geometry at load time.
 * @param {boolean} [options.loadForClassification=false] If <code>true</code> and if the model has feature IDs, load the feature IDs and indices as typed arrays. This is useful for batching features for classification.
 * @param {boolean} [options.renameBatchIdSemantic=false] If <code>true</code>, rename _BATCHID or BATCHID to _FEATURE_ID_0. This is used for .b3dm models
 * @private
 */
function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const {
    gltfResource,
    typedArray,
    releaseGltfJson = false,
    asynchronous = true,
    incrementallyLoadTextures = true,
    upAxis = Axis.Y,
    forwardAxis = Axis.Z,
    loadAttributesAsTypedArray = false,
    loadAttributesFor2D = false,
    enablePick = false,
    loadIndicesForWireframe = false,
    loadPrimitiveOutline = true,
    loadForClassification = false,
    renameBatchIdSemantic = false,
  } = options;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  //>>includeEnd('debug');

  const { baseResource = gltfResource.clone() } = options;

  this._gltfJson = options.gltfJson;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._typedArray = typedArray;
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
  this._renameBatchIdSemantic = renameBatchIdSemantic;

  // When loading EXT_feature_metadata, the feature tables and textures
  // are now stored as arrays like the newer EXT_structural_metadata extension.
  // This requires sorting the dictionary keys for a consistent ordering.
  this._sortedPropertyTableIds = undefined;
  this._sortedFeatureTextureIds = undefined;

  this._gltfJsonLoader = undefined;
  this._state = GltfLoaderState.NOT_LOADED;
  this._textureState = GltfLoaderState.NOT_LOADED;
  this._promise = undefined;
  this._processError = undefined;
  this._textureErrors = [];

  // Information about whether to load primitives as typed arrays or buffers,
  // and whether post-processing is needed after loading (e.g. for
  // generating outlines)
  this._primitiveLoadPlans = [];

  // Loaders that need to be processed before the glTF becomes ready
  this._loaderPromises = [];
  this._textureLoaders = [];
  this._texturesPromises = [];
  this._textureCallbacks = [];
  this._bufferViewLoaders = [];
  this._geometryLoaders = [];
  this._geometryCallbacks = [];
  this._structuralMetadataLoader = undefined;
  this._loadResourcesPromise = undefined;
  this._resourcesLoaded = false;
  this._texturesLoaded = false;

  this._supportedImageFormats = undefined;

  // In some cases where geometry post-processing is needed (like generating
  // outlines) new attributes are added that may have GPU resources attached.
  // The GltfLoader will own the resources and store them here.
  this._postProcessBuffers = [];

  // Loaded results
  this._components = undefined;
}

if (defined(Object.create)) {
  GltfLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfLoader.prototype.constructor = GltfLoader;
}

Object.defineProperties(GltfLoader.prototype, {
  /**
   * The cache key of the resource.
   *
   * @memberof GltfLoader.prototype
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
   * @memberof GltfLoader.prototype
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
   * The loaded glTF json.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {object}
   * @readonly
   * @private
   */
  gltfJson: {
    get: function () {
      if (defined(this._gltfJsonLoader)) {
        return this._gltfJsonLoader.gltf;
      }
      return this._gltfJson;
    },
  },
  /**
   * Returns true if textures are loaded separately from the other glTF resources.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  incrementallyLoadTextures: {
    get: function () {
      return this._incrementallyLoadTextures;
    },
  },
  /**
   * true if textures are loaded, useful when incrementallyLoadTextures is true
   *
   * @memberof GltfLoader.prototype
   *
   * @type {boolean}
   * @readonly
   * @private
   */
  texturesLoaded: {
    get: function () {
      return this._texturesLoaded;
    },
  },
});

/**
 * Loads the gltf object
 */
async function loadGltfJson(loader) {
  loader._state = GltfLoaderState.LOADING;
  loader._textureState = GltfLoaderState.LOADING;

  try {
    const gltfJsonLoader = ResourceCache.getGltfJsonLoader({
      gltfResource: loader._gltfResource,
      baseResource: loader._baseResource,
      typedArray: loader._typedArray,
      gltfJson: loader._gltfJson,
    });
    loader._gltfJsonLoader = gltfJsonLoader;
    await gltfJsonLoader.load();

    if (
      loader.isDestroyed() ||
      loader.isUnloaded() ||
      gltfJsonLoader.isDestroyed()
    ) {
      return;
    }

    loader._state = GltfLoaderState.LOADED;
    loader._textureState = GltfLoaderState.LOADED;

    return loader;
  } catch (error) {
    if (loader.isDestroyed()) {
      return;
    }

    loader._state = GltfLoaderState.FAILED;
    loader._textureState = GltfLoaderState.FAILED;
    handleError(loader, error);
  }
}

async function loadResources(loader, frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    await FeatureDetection.supportsWebP.initialize();
  }

  loader._supportedImageFormats = new SupportedImageFormats({
    webp: FeatureDetection.supportsWebP(),
    basis: frameState.context.supportsBasis,
  });

  // Loaders that create GPU resources need to be processed every frame until they become
  // ready since the JobScheduler is not able to execute all jobs in a single
  // frame. Any promise failures are collected, and will be handled synchronously in process().
  // Also note that it's fine to call process before a loader is ready to process or
  // after it has failed; nothing will happen.
  const promise = parse(loader, frameState);

  // All resource loaders have been created, so we can begin processing
  loader._state = GltfLoaderState.PROCESSING;
  loader._textureState = GltfLoaderState.PROCESSING;

  if (defined(loader._gltfJsonLoader) && loader._releaseGltfJson) {
    // Check that the glTF JSON loader is still defined before trying to unload it.
    // It can be unloaded if the glTF loader is destroyed.
    ResourceCache.unload(loader._gltfJsonLoader);
    loader._gltfJsonLoader = undefined;
  }

  return promise;
}

/**
 * Loads the resource.
 * @returns {Promise.<GltfLoader>} A promise which resolves to the loader when the resource loading is completed.
 * @exception {RuntimeError} Unsupported glTF version
 * @exception {RuntimeError} Unsupported glTF Extension
 * @private
 */
GltfLoader.prototype.load = async function () {
  if (defined(this._promise)) {
    return this._promise;
  }

  this._promise = loadGltfJson(this);
  return this._promise;
};

function handleError(gltfLoader, error) {
  gltfLoader.unload();
  const errorMessage = "Failed to load glTF";
  throw gltfLoader.getError(errorMessage, error);
}

function processLoaders(loader, frameState) {
  let ready = true;
  const geometryLoaders = loader._geometryLoaders;
  for (let i = 0; i < geometryLoaders.length; ++i) {
    const geometryReady = geometryLoaders[i].process(frameState);
    if (geometryReady && defined(loader._geometryCallbacks[i])) {
      loader._geometryCallbacks[i]();
      loader._geometryCallbacks[i] = undefined;
    }
    ready = ready && geometryReady;
  }

  const structuralMetadataLoader = loader._structuralMetadataLoader;
  if (defined(structuralMetadataLoader)) {
    const metadataReady = structuralMetadataLoader.process(frameState);
    if (metadataReady) {
      loader._components.structuralMetadata =
        structuralMetadataLoader.structuralMetadata;
    }
    ready = ready && metadataReady;
  }

  if (ready) {
    // Geometry requires further processing
    loader._state = GltfLoaderState.POST_PROCESSING;
  }
}

function postProcessGeometry(loader, context) {
  // Apply post-processing steps on geometry such as
  // updating attributes for rendering outlines.
  const loadPlans = loader._primitiveLoadPlans;
  for (let i = 0; i < loadPlans.length; i++) {
    const loadPlan = loadPlans[i];
    loadPlan.postProcess(context);

    if (loadPlan.needsOutlines) {
      // The glTF loader takes ownership of any buffers generated in the
      // post-process stage since they were created after the geometry loaders
      // finished. This way they can be destroyed when the loader is destroyed.
      gatherPostProcessBuffers(loader, loadPlan);
    }
  }
}

function gatherPostProcessBuffers(loader, primitiveLoadPlan) {
  const buffers = loader._postProcessBuffers;
  const primitive = primitiveLoadPlan.primitive;

  const outlineCoordinates = primitive.outlineCoordinates;
  if (defined(outlineCoordinates)) {
    // outline coordinates are always loaded as a buffer.
    buffers.push(outlineCoordinates.buffer);
  }

  // to do post-processing, all the attributes are loaded as typed arrays
  // so if a buffer exists, it was newly generated
  const attributes = primitive.attributes;
  for (let i = 0; i < attributes.length; i++) {
    const attribute = attributes[i];
    if (defined(attribute.buffer)) {
      buffers.push(attribute.buffer);
    }
  }

  // Similarly for the indices.
  const indices = primitive.indices;
  if (defined(indices) && defined(indices.buffer)) {
    buffers.push(indices.buffer);
  }
}

/**
 * Process loaders other than textures
 * @private
 */
GltfLoader.prototype._process = function (frameState) {
  if (this._state === GltfLoaderState.READY) {
    return true;
  }

  if (this._state === GltfLoaderState.PROCESSING) {
    processLoaders(this, frameState);
  }

  if (
    this._resourcesLoaded &&
    this._state === GltfLoaderState.POST_PROCESSING
  ) {
    postProcessGeometry(this, frameState.context);
    this._state = GltfLoaderState.PROCESSED;
  }

  if (this._resourcesLoaded && this._state === GltfLoaderState.PROCESSED) {
    // The buffer views can be unloaded once the data is copied.
    unloadBufferViewLoaders(this);

    // Similarly, if the glTF was loaded from a typed array, release the memory
    this._typedArray = undefined;

    this._state = GltfLoaderState.READY;
    return true;
  }

  return false;
};

/**
 * Process textures other than textures
 * @private
 */
GltfLoader.prototype._processTextures = function (frameState) {
  if (this._textureState === GltfLoaderState.READY) {
    return true;
  }

  if (this._textureState !== GltfLoaderState.PROCESSING) {
    return false;
  }

  let ready = true;
  const textureLoaders = this._textureLoaders;
  for (let i = 0; i < textureLoaders.length; ++i) {
    const textureReady = textureLoaders[i].process(frameState);
    if (textureReady && defined(this._textureCallbacks[i])) {
      this._textureCallbacks[i]();
      this._textureCallbacks[i] = undefined;
    }

    ready = ready && textureReady;
  }

  if (!ready) {
    return false;
  }

  this._textureState = GltfLoaderState.READY;
  this._texturesLoaded = true;
  return true;
};

/**
 * Processes the resource until it becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 * @private
 */
GltfLoader.prototype.process = function (frameState) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("frameState", frameState);
  //>>includeEnd('debug');

  if (
    this._state === GltfLoaderState.LOADED &&
    !defined(this._loadResourcesPromise)
  ) {
    this._loadResourcesPromise = loadResources(this, frameState)
      .then(() => {
        this._resourcesLoaded = true;
      })
      .catch((error) => {
        this._processError = error;
      });
  }

  if (defined(this._processError)) {
    this._state = GltfLoaderState.FAILED;
    const error = this._processError;
    this._processError = undefined;
    handleError(this, error);
  }

  // Pop the next error of the list in case there are multiple
  const textureError = this._textureErrors.pop();
  if (defined(textureError)) {
    // There shouldn't be the need to completely unload in this case. Just throw the error.
    const error = this.getError("Failed to load glTF texture", textureError);
    error.name = "TextureError";
    throw error;
  }

  if (this._state === GltfLoaderState.FAILED) {
    return false;
  }

  let ready = false;
  try {
    ready = this._process(frameState);
  } catch (error) {
    this._state = GltfLoaderState.FAILED;
    handleError(this, error);
  }

  // Since textures can be loaded independently and are handled through a separate promise, they are processed in their own function
  let texturesReady = false;
  try {
    texturesReady = this._processTextures(frameState);
  } catch (error) {
    this._textureState = GltfLoaderState.FAILED;
    handleError(this, error);
  }

  if (this._incrementallyLoadTextures) {
    return ready;
  }

  return ready && texturesReady;
};

function getVertexBufferLoader(
  loader,
  accessorId,
  semantic,
  draco,
  loadBuffer,
  loadTypedArray,
  frameState
) {
  const gltf = loader.gltfJson;
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  const vertexBufferLoader = ResourceCache.getVertexBufferLoader({
    gltf: gltf,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    frameState: frameState,
    bufferViewId: bufferViewId,
    draco: draco,
    attributeSemantic: semantic,
    accessorId: accessorId,
    asynchronous: loader._asynchronous,
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  return vertexBufferLoader;
}

function getIndexBufferLoader(
  loader,
  accessorId,
  draco,
  loadBuffer,
  loadTypedArray,
  frameState
) {
  const indexBufferLoader = ResourceCache.getIndexBufferLoader({
    gltf: loader.gltfJson,
    accessorId: accessorId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    frameState: frameState,
    draco: draco,
    asynchronous: loader._asynchronous,
    loadBuffer: loadBuffer,
    loadTypedArray: loadTypedArray,
  });

  return indexBufferLoader;
}

function getBufferViewLoader(loader, bufferViewId) {
  const bufferViewLoader = ResourceCache.getBufferViewLoader({
    gltf: loader.gltfJson,
    bufferViewId: bufferViewId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
  });

  loader._bufferViewLoaders.push(bufferViewLoader);

  return bufferViewLoader;
}

function getPackedTypedArray(gltf, accessor, bufferViewTypedArray) {
  let byteOffset = accessor.byteOffset;
  const byteStride = getAccessorByteStride(gltf, accessor);
  const count = accessor.count;
  const componentCount = numberOfComponentsForType(accessor.type);
  const componentType = accessor.componentType;
  const componentByteLength = ComponentDatatype.getSizeInBytes(componentType);
  const defaultByteStride = componentByteLength * componentCount;
  const componentsLength = count * componentCount;

  if (byteStride === defaultByteStride) {
    // Copy the typed array and let the underlying ArrayBuffer be freed
    bufferViewTypedArray = new Uint8Array(bufferViewTypedArray);
    return ComponentDatatype.createArrayBufferView(
      componentType,
      bufferViewTypedArray.buffer,
      bufferViewTypedArray.byteOffset + byteOffset,
      componentsLength
    );
  }

  const accessorTypedArray = ComponentDatatype.createTypedArray(
    componentType,
    componentsLength
  );

  const dataView = new DataView(bufferViewTypedArray.buffer);
  const components = new Array(componentCount);
  const componentReader = getComponentReader(accessor.componentType);
  byteOffset = bufferViewTypedArray.byteOffset + byteOffset;

  for (let i = 0; i < count; ++i) {
    componentReader(
      dataView,
      byteOffset,
      componentCount,
      componentByteLength,
      components
    );
    for (let j = 0; j < componentCount; ++j) {
      accessorTypedArray[i * componentCount + j] = components[j];
    }
    byteOffset += byteStride;
  }

  return accessorTypedArray;
}

function loadDefaultAccessorValues(accessor, values) {
  const accessorType = accessor.type;
  if (accessorType === AttributeType.SCALAR) {
    return values.fill(0);
  }

  const MathType = AttributeType.getMathType(accessorType);
  return values.fill(MathType.clone(MathType.ZERO));
}

function loadAccessorValues(accessor, typedArray, values, useQuaternion) {
  const accessorType = accessor.type;
  const accessorCount = accessor.count;

  if (accessorType === AttributeType.SCALAR) {
    for (let i = 0; i < accessorCount; i++) {
      values[i] = typedArray[i];
    }
  } else if (accessorType === AttributeType.VEC4 && useQuaternion) {
    for (let i = 0; i < accessorCount; i++) {
      values[i] = Quaternion.unpack(typedArray, i * 4);
    }
  } else {
    const MathType = AttributeType.getMathType(accessorType);
    const numberOfComponents = AttributeType.getNumberOfComponents(
      accessorType
    );

    for (let i = 0; i < accessorCount; i++) {
      values[i] = MathType.unpack(typedArray, i * numberOfComponents);
    }
  }

  return values;
}

async function loadAccessorBufferView(
  loader,
  bufferViewLoader,
  accessor,
  useQuaternion,
  values
) {
  // Save a link to the gltfJson, which is removed after bufferViewLoader.load()
  const { gltfJson } = loader;

  await bufferViewLoader.load();
  if (loader.isDestroyed()) {
    return;
  }

  const typedArray = getPackedTypedArray(
    gltfJson,
    accessor,
    bufferViewLoader.typedArray
  );

  useQuaternion = defaultValue(useQuaternion, false);
  loadAccessorValues(accessor, typedArray, values, useQuaternion);
}

function loadAccessor(loader, accessor, useQuaternion) {
  const values = new Array(accessor.count);

  const bufferViewId = accessor.bufferView;
  if (defined(bufferViewId)) {
    const bufferViewLoader = getBufferViewLoader(loader, bufferViewId);
    const promise = loadAccessorBufferView(
      loader,
      bufferViewLoader,
      accessor,
      useQuaternion,
      values
    );
    loader._loaderPromises.push(promise);

    return values;
  }

  return loadDefaultAccessorValues(accessor, values);
}

function fromArray(MathType, values) {
  if (!defined(values)) {
    return undefined;
  }

  if (MathType === Number) {
    return values[0];
  }

  return MathType.unpack(values);
}

function getDefault(MathType) {
  if (MathType === Number) {
    return 0.0;
  }

  return new MathType(); // defaults to 0.0 for all types
}

function getQuantizationDivisor(componentDatatype) {
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return 127;
    case ComponentDatatype.UNSIGNED_BYTE:
      return 255;
    case ComponentDatatype.SHORT:
      return 32767;
    case ComponentDatatype.UNSIGNED_SHORT:
      return 65535;
    default:
      return 1.0;
  }
}

const minimumBoundsByType = {
  VEC2: new Cartesian2(-1.0, -1.0),
  VEC3: new Cartesian3(-1.0, -1.0, -1.0),
  VEC4: new Cartesian4(-1.0, -1.0, -1.0, -1.0),
};

function dequantizeMinMax(attribute, VectorType) {
  const divisor = getQuantizationDivisor(attribute.componentDatatype);
  const minimumBound = minimumBoundsByType[attribute.type];

  // dequantized = max(quantized / divisor, -1.0)
  let min = attribute.min;
  if (defined(min)) {
    min = VectorType.divideByScalar(min, divisor, min);
    min = VectorType.maximumByComponent(min, minimumBound, min);
  }

  let max = attribute.max;
  if (defined(max)) {
    max = VectorType.divideByScalar(max, divisor, max);
    max = VectorType.maximumByComponent(max, minimumBound, max);
  }

  attribute.min = min;
  attribute.max = max;
}

function setQuantizationFromWeb3dQuantizedAttributes(
  extension,
  attribute,
  MathType
) {
  const decodeMatrix = extension.decodeMatrix;
  const decodedMin = fromArray(MathType, extension.decodedMin);
  const decodedMax = fromArray(MathType, extension.decodedMax);

  if (defined(decodedMin) && defined(decodedMax)) {
    attribute.min = decodedMin;
    attribute.max = decodedMax;
  }

  const quantization = new ModelComponents.Quantization();
  quantization.componentDatatype = attribute.componentDatatype;
  quantization.type = attribute.type;

  if (decodeMatrix.length === 4) {
    quantization.quantizedVolumeOffset = decodeMatrix[2];
    quantization.quantizedVolumeStepSize = decodeMatrix[0];
  } else if (decodeMatrix.length === 9) {
    quantization.quantizedVolumeOffset = new Cartesian2(
      decodeMatrix[6],
      decodeMatrix[7]
    );
    quantization.quantizedVolumeStepSize = new Cartesian2(
      decodeMatrix[0],
      decodeMatrix[4]
    );
  } else if (decodeMatrix.length === 16) {
    quantization.quantizedVolumeOffset = new Cartesian3(
      decodeMatrix[12],
      decodeMatrix[13],
      decodeMatrix[14]
    );
    quantization.quantizedVolumeStepSize = new Cartesian3(
      decodeMatrix[0],
      decodeMatrix[5],
      decodeMatrix[10]
    );
  } else if (decodeMatrix.length === 25) {
    quantization.quantizedVolumeOffset = new Cartesian4(
      decodeMatrix[20],
      decodeMatrix[21],
      decodeMatrix[22],
      decodeMatrix[23]
    );
    quantization.quantizedVolumeStepSize = new Cartesian4(
      decodeMatrix[0],
      decodeMatrix[6],
      decodeMatrix[12],
      decodeMatrix[18]
    );
  }

  attribute.quantization = quantization;
}

function createAttribute(gltf, accessorId, name, semantic, setIndex) {
  const accessor = gltf.accessors[accessorId];
  const MathType = AttributeType.getMathType(accessor.type);
  const normalized = defaultValue(accessor.normalized, false);

  const attribute = new Attribute();
  attribute.name = name;
  attribute.semantic = semantic;
  attribute.setIndex = setIndex;
  attribute.constant = getDefault(MathType);
  attribute.componentDatatype = accessor.componentType;
  attribute.normalized = normalized;
  attribute.count = accessor.count;
  attribute.type = accessor.type;
  attribute.min = fromArray(MathType, accessor.min);
  attribute.max = fromArray(MathType, accessor.max);
  attribute.byteOffset = accessor.byteOffset;
  attribute.byteStride = getAccessorByteStride(gltf, accessor);

  if (hasExtension(accessor, "WEB3D_quantized_attributes")) {
    setQuantizationFromWeb3dQuantizedAttributes(
      accessor.extensions.WEB3D_quantized_attributes,
      attribute,
      MathType
    );
  }

  const isQuantizable =
    attribute.semantic === VertexAttributeSemantic.POSITION ||
    attribute.semantic === VertexAttributeSemantic.NORMAL ||
    attribute.semantic === VertexAttributeSemantic.TANGENT ||
    attribute.semantic === VertexAttributeSemantic.TEXCOORD;

  // In the glTF 2.0 spec, min and max are not affected by the normalized flag.
  // However, for KHR_mesh_quantization, min and max must be dequantized for
  // normalized values, else the bounding sphere will be computed incorrectly.
  const hasKhrMeshQuantization = gltf.extensionsRequired?.includes(
    "KHR_mesh_quantization"
  );

  if (hasKhrMeshQuantization && normalized && isQuantizable) {
    dequantizeMinMax(attribute, MathType);
  }

  return attribute;
}

function getSetIndex(gltfSemantic) {
  const setIndexRegex = /^\w+_(\d+)$/;
  const setIndexMatch = setIndexRegex.exec(gltfSemantic);
  if (setIndexMatch !== null) {
    return parseInt(setIndexMatch[1]);
  }
  return undefined;
}

const scratchSemanticInfo = {
  gltfSemantic: undefined,
  renamedSemantic: undefined,
  modelSemantic: undefined,
};

function getSemanticInfo(loader, semanticType, gltfSemantic) {
  // For .b3dm, rename _BATCHID (or the legacy BATCHID) to _FEATURE_ID_0
  // in the generated model components for compatibility with EXT_mesh_features
  let renamedSemantic = gltfSemantic;
  if (
    loader._renameBatchIdSemantic &&
    (gltfSemantic === "_BATCHID" || gltfSemantic === "BATCHID")
  ) {
    renamedSemantic = "_FEATURE_ID_0";
  }

  const modelSemantic = semanticType.fromGltfSemantic(renamedSemantic);

  const semanticInfo = scratchSemanticInfo;
  semanticInfo.gltfSemantic = gltfSemantic;
  semanticInfo.renamedSemantic = renamedSemantic;
  semanticInfo.modelSemantic = modelSemantic;

  return semanticInfo;
}

function isClassificationAttribute(attributeSemantic) {
  // Classification models only use the position, texcoord, and feature ID attributes.
  const isPositionAttribute =
    attributeSemantic === VertexAttributeSemantic.POSITION;
  const isFeatureIdAttribute =
    attributeSemantic === VertexAttributeSemantic.FEATURE_ID;
  const isTexcoordAttribute =
    attributeSemantic === VertexAttributeSemantic.TEXCOORD;

  return isPositionAttribute || isFeatureIdAttribute || isTexcoordAttribute;
}

function finalizeDracoAttribute(
  attribute,
  vertexBufferLoader,
  loadBuffer,
  loadTypedArray
) {
  // The accessor's byteOffset and byteStride should be ignored for draco.
  // Each attribute is tightly packed in its own buffer after decode.
  attribute.byteOffset = 0;
  attribute.byteStride = undefined;
  attribute.quantization = vertexBufferLoader.quantization;

  if (loadBuffer) {
    attribute.buffer = vertexBufferLoader.buffer;
  }

  if (loadTypedArray) {
    const componentDatatype = defined(vertexBufferLoader.quantization)
      ? vertexBufferLoader.quantization.componentDatatype
      : attribute.componentDatatype;

    attribute.typedArray = ComponentDatatype.createArrayBufferView(
      componentDatatype,
      vertexBufferLoader.typedArray.buffer
    );
  }
}

function finalizeAttribute(
  gltf,
  accessor,
  attribute,
  vertexBufferLoader,
  loadBuffer,
  loadTypedArray
) {
  if (loadBuffer) {
    attribute.buffer = vertexBufferLoader.buffer;
  }

  if (loadTypedArray) {
    const bufferViewTypedArray = vertexBufferLoader.typedArray;
    attribute.typedArray = getPackedTypedArray(
      gltf,
      accessor,
      bufferViewTypedArray
    );

    if (!loadBuffer) {
      // If the buffer isn't loaded, then the accessor's byteOffset and
      // byteStride should be ignored, since values are only available in a
      // tightly packed typed array
      attribute.byteOffset = 0;
      attribute.byteStride = undefined;
    }
  }
}

function loadAttribute(
  loader,
  accessorId,
  semanticInfo,
  draco,
  loadBuffer,
  loadTypedArray,
  frameState
) {
  const gltf = loader.gltfJson;
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  const gltfSemantic = semanticInfo.gltfSemantic;
  const renamedSemantic = semanticInfo.renamedSemantic;
  const modelSemantic = semanticInfo.modelSemantic;

  const setIndex = defined(modelSemantic)
    ? getSetIndex(renamedSemantic)
    : undefined;

  const name = gltfSemantic;
  const attribute = createAttribute(
    gltf,
    accessorId,
    name,
    modelSemantic,
    setIndex
  );

  if (!defined(draco) && !defined(bufferViewId)) {
    return attribute;
  }

  const vertexBufferLoader = getVertexBufferLoader(
    loader,
    accessorId,
    gltfSemantic,
    draco,
    loadBuffer,
    loadTypedArray,
    frameState
  );

  const index = loader._geometryLoaders.length;
  loader._geometryLoaders.push(vertexBufferLoader);
  const promise = vertexBufferLoader.load();
  loader._loaderPromises.push(promise);
  // This can only execute once vertexBufferLoader.process() has run and returns true
  // Save this finish callback by the loader index so it can be called
  // in process().
  loader._geometryCallbacks[index] = () => {
    if (
      defined(draco) &&
      defined(draco.attributes) &&
      defined(draco.attributes[gltfSemantic])
    ) {
      finalizeDracoAttribute(
        attribute,
        vertexBufferLoader,
        loadBuffer,
        loadTypedArray
      );
    } else {
      finalizeAttribute(
        gltf,
        accessor,
        attribute,
        vertexBufferLoader,
        loadBuffer,
        loadTypedArray
      );
    }
  };

  return attribute;
}

function loadVertexAttribute(
  loader,
  accessorId,
  semanticInfo,
  draco,
  hasInstances,
  needsPostProcessing,
  frameState
) {
  const modelSemantic = semanticInfo.modelSemantic;

  const isPositionAttribute =
    modelSemantic === VertexAttributeSemantic.POSITION;
  const isFeatureIdAttribute =
    modelSemantic === VertexAttributeSemantic.FEATURE_ID;

  const loadTypedArrayFor2D =
    isPositionAttribute &&
    !hasInstances &&
    loader._loadAttributesFor2D &&
    !frameState.scene3DOnly;
  const loadTypedArrayForPicking =
    isPositionAttribute && loader._enablePick && !frameState.context.webgl2;

  const loadTypedArrayForClassification =
    loader._loadForClassification && isFeatureIdAttribute;

  // Whether the final output should be a buffer or typed array
  // after loading and post-processing.
  const outputTypedArrayOnly = loader._loadAttributesAsTypedArray;
  const outputBuffer = !outputTypedArrayOnly;
  const outputTypedArray =
    outputTypedArrayOnly ||
    loadTypedArrayFor2D ||
    loadTypedArrayForPicking ||
    loadTypedArrayForClassification;

  // Determine what to load right now:
  //
  // - If post-processing is needed, load a packed typed array for
  //   further processing, and defer the buffer loading until later.
  // - On the other hand, if post-processing is not needed,
  //   set the load flags directly
  const loadBuffer = needsPostProcessing ? false : outputBuffer;
  const loadTypedArray = needsPostProcessing ? true : outputTypedArray;

  const attribute = loadAttribute(
    loader,
    accessorId,
    semanticInfo,
    draco,
    loadBuffer,
    loadTypedArray,
    frameState
  );

  const attributePlan = new PrimitiveLoadPlan.AttributeLoadPlan(attribute);
  attributePlan.loadBuffer = outputBuffer;
  attributePlan.loadTypedArray = outputTypedArray;

  return attributePlan;
}

function loadInstancedAttribute(
  loader,
  accessorId,
  attributes,
  gltfSemantic,
  frameState
) {
  const accessors = loader.gltfJson.accessors;
  const hasRotation = defined(attributes.ROTATION);
  const hasTranslationMinMax =
    defined(attributes.TRANSLATION) &&
    defined(accessors[attributes.TRANSLATION].min) &&
    defined(accessors[attributes.TRANSLATION].max);

  const semanticInfo = getSemanticInfo(
    loader,
    InstanceAttributeSemantic,
    gltfSemantic
  );
  const modelSemantic = semanticInfo.modelSemantic;

  const isTransformAttribute =
    modelSemantic === InstanceAttributeSemantic.TRANSLATION ||
    modelSemantic === InstanceAttributeSemantic.ROTATION ||
    modelSemantic === InstanceAttributeSemantic.SCALE;
  const isTranslationAttribute =
    modelSemantic === InstanceAttributeSemantic.TRANSLATION;

  // Load the attributes as typed arrays only if:
  // - loadAttributesAsTypedArray is true
  // - the instances have rotations. This only applies to the transform attributes,
  //   since The instance matrices are computed on the CPU. This avoids the
  //   expensive quaternion -> rotation matrix conversion in the shader.
  // - GPU instancing is not supported.
  const loadAsTypedArrayOnly =
    loader._loadAttributesAsTypedArray ||
    (hasRotation && isTransformAttribute) ||
    !frameState.context.instancedArrays;
  const loadTypedArrayForPicking =
    loader._enablePick && !frameState.context.webgl2;

  const loadBuffer = !loadAsTypedArrayOnly;

  // Load the translations as a typed array in addition to the buffer if
  // - the accessor does not have a min and max. The values will be used
  //   for computing an accurate bounding volume.
  // - the model will be projected to 2D.
  const loadFor2D = loader._loadAttributesFor2D && !frameState.scene3DOnly;
  const loadTranslationAsTypedArray =
    isTranslationAttribute &&
    (!hasTranslationMinMax || loadFor2D || loadTypedArrayForPicking);

  const loadTypedArray = loadAsTypedArrayOnly || loadTranslationAsTypedArray;

  // Don't pass in draco object since instanced attributes can't be draco compressed
  return loadAttribute(
    loader,
    accessorId,
    semanticInfo,
    undefined,
    loadBuffer,
    loadTypedArray,
    frameState
  );
}

function loadIndices(
  loader,
  accessorId,
  draco,
  hasFeatureIds,
  needsPostProcessing,
  frameState
) {
  const accessor = loader.gltfJson.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  if (!defined(draco) && !defined(bufferViewId)) {
    return undefined;
  }

  const indices = new Indices();
  indices.count = accessor.count;

  const loadAttributesAsTypedArray = loader._loadAttributesAsTypedArray;
  // Load the index buffer as a typed array to generate wireframes or pick in WebGL1.
  const loadForCpuOperations =
    (loader._loadIndicesForWireframe || loader._enablePick) &&
    !frameState.context.webgl2;

  // Load the index buffer as a typed array to batch features together for classification.
  const loadForClassification = loader._loadForClassification && hasFeatureIds;

  // Whether the final output should be a buffer or typed array
  // after loading and post-processing.
  const outputTypedArrayOnly = loadAttributesAsTypedArray;
  const outputBuffer = !outputTypedArrayOnly;
  const outputTypedArray =
    loadAttributesAsTypedArray || loadForCpuOperations || loadForClassification;

  // Determine what to load right now:
  //
  // - If post-processing is needed, load a packed typed array for
  //   further processing, and defer the buffer loading until later.
  // - On the other hand, if post-processing is not needed, set the load
  //   flags directly
  const loadBuffer = needsPostProcessing ? false : outputBuffer;
  const loadTypedArray = needsPostProcessing ? true : outputTypedArray;

  const indexBufferLoader = getIndexBufferLoader(
    loader,
    accessorId,
    draco,
    loadBuffer,
    loadTypedArray,
    frameState
  );

  const index = loader._geometryLoaders.length;
  loader._geometryLoaders.push(indexBufferLoader);
  const promise = indexBufferLoader.load();
  loader._loaderPromises.push(promise);
  // This can only execute once indexBufferLoader.process() has run and returns true
  // Save this finish callback by the loader index so it can be called
  // in process().
  loader._geometryCallbacks[index] = () => {
    indices.indexDatatype = indexBufferLoader.indexDatatype;
    indices.buffer = indexBufferLoader.buffer;
    indices.typedArray = indexBufferLoader.typedArray;
  };

  const indicesPlan = new PrimitiveLoadPlan.IndicesLoadPlan(indices);
  indicesPlan.loadBuffer = outputBuffer;
  indicesPlan.loadTypedArray = outputTypedArray;

  return indicesPlan;
}

function loadTexture(loader, textureInfo, frameState, samplerOverride) {
  const gltf = loader.gltfJson;
  const imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureInfo.index,
    supportedImageFormats: loader._supportedImageFormats,
  });

  if (!defined(imageId)) {
    return undefined;
  }

  const textureLoader = ResourceCache.getTextureLoader({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: loader._supportedImageFormats,
    frameState: frameState,
    asynchronous: loader._asynchronous,
  });

  const textureReader = GltfLoaderUtil.createModelTextureReader({
    textureInfo: textureInfo,
  });

  const index = loader._textureLoaders.length;
  loader._textureLoaders.push(textureLoader);
  const promise = textureLoader.load().catch((error) => {
    if (loader.isDestroyed()) {
      return;
    }

    if (!loader._incrementallyLoadTextures) {
      // If incrementallyLoadTextures is false, throw the error to ensure the loader state
      // immediately is set to have failed
      throw error;
    }

    // Otherwise, save the error so it can be thrown next
    loader._textureState = GltfLoaderState.FAILED;
    loader._textureErrors.push(error);
  });
  loader._texturesPromises.push(promise);
  // This can only execute once textureLoader.process() has run and returns true
  // Save this finish callback by the loader index so it can be called
  // in process().
  loader._textureCallbacks[index] = () => {
    textureReader.texture = textureLoader.texture;
    if (defined(samplerOverride)) {
      textureReader.texture.sampler = samplerOverride;
    }
  };

  return textureReader;
}

/**
 * Load textures and parse factors for the KHR_materials_pbrSpecularGlossiness extension
 * @param {GltfLoader} loader
 * @param {object} specularGlossinessInfo The contents of the KHR_materials_pbrSpecularGlossiness extension in the parsed glTF JSON
 * @param {FrameState} frameState
 * @returns {ModelComponents.SpecularGlossiness}
 * @private
 */
function loadSpecularGlossiness(loader, specularGlossinessInfo, frameState) {
  const {
    diffuseTexture,
    specularGlossinessTexture,
    diffuseFactor,
    specularFactor,
    glossinessFactor,
  } = specularGlossinessInfo;

  const specularGlossiness = new SpecularGlossiness();
  if (defined(diffuseTexture)) {
    specularGlossiness.diffuseTexture = loadTexture(
      loader,
      diffuseTexture,
      frameState
    );
  }
  if (defined(specularGlossinessTexture)) {
    specularGlossiness.specularGlossinessTexture = loadTexture(
      loader,
      specularGlossinessTexture,
      frameState
    );
  }
  specularGlossiness.diffuseFactor = fromArray(Cartesian4, diffuseFactor);
  specularGlossiness.specularFactor = fromArray(Cartesian3, specularFactor);
  specularGlossiness.glossinessFactor = glossinessFactor;

  return specularGlossiness;
}

/**
 * Load textures and parse factors for a metallic-roughness PBR model in a glTF material
 * @param {GltfLoader} loader
 * @param {object} metallicRoughnessInfo The contents of a pbrMetallicRoughness property in the parsed glTF JSON
 * @param {FrameState} frameState
 * @returns {ModelComponents.MetallicRoughness}
 * @private
 */
function loadMetallicRoughness(loader, metallicRoughnessInfo, frameState) {
  const {
    baseColorTexture,
    metallicRoughnessTexture,
    baseColorFactor,
    metallicFactor,
    roughnessFactor,
  } = metallicRoughnessInfo;

  const metallicRoughness = new MetallicRoughness();
  if (defined(baseColorTexture)) {
    metallicRoughness.baseColorTexture = loadTexture(
      loader,
      baseColorTexture,
      frameState
    );
  }
  if (defined(metallicRoughnessTexture)) {
    metallicRoughness.metallicRoughnessTexture = loadTexture(
      loader,
      metallicRoughnessTexture,
      frameState
    );
  }
  metallicRoughness.baseColorFactor = fromArray(Cartesian4, baseColorFactor);
  metallicRoughness.metallicFactor = metallicFactor;
  metallicRoughness.roughnessFactor = roughnessFactor;

  return metallicRoughness;
}

function loadSpecular(loader, specularInfo, frameState) {
  const {
    specularFactor,
    specularTexture,
    specularColorFactor,
    specularColorTexture,
  } = specularInfo;

  const specular = new Specular();
  if (defined(specularTexture)) {
    specular.specularTexture = loadTexture(loader, specularTexture, frameState);
  }
  if (defined(specularColorTexture)) {
    specular.specularColorTexture = loadTexture(
      loader,
      specularColorTexture,
      frameState
    );
  }
  specular.specularFactor = specularFactor;
  specular.specularColorFactor = fromArray(Cartesian3, specularColorFactor);

  return specular;
}

function loadAnisotropy(loader, anisotropyInfo, frameState) {
  const {
    anisotropyStrength = Anisotropy.DEFAULT_ANISOTROPY_STRENGTH,
    anisotropyRotation = Anisotropy.DEFAULT_ANISOTROPY_ROTATION,
    anisotropyTexture,
  } = anisotropyInfo;

  const anisotropy = new Anisotropy();
  if (defined(anisotropyTexture)) {
    anisotropy.anisotropyTexture = loadTexture(
      loader,
      anisotropyTexture,
      frameState
    );
  }
  anisotropy.anisotropyStrength = anisotropyStrength;
  anisotropy.anisotropyRotation = anisotropyRotation;

  return anisotropy;
}

function loadClearcoat(loader, clearcoatInfo, frameState) {
  const {
    clearcoatFactor = Clearcoat.DEFAULT_CLEARCOAT_FACTOR,
    clearcoatTexture,
    clearcoatRoughnessFactor = Clearcoat.DEFAULT_CLEARCOAT_ROUGHNESS_FACTOR,
    clearcoatRoughnessTexture,
    clearcoatNormalTexture,
  } = clearcoatInfo;

  const clearcoat = new Clearcoat();
  if (defined(clearcoatTexture)) {
    clearcoat.clearcoatTexture = loadTexture(
      loader,
      clearcoatTexture,
      frameState
    );
  }
  if (defined(clearcoatRoughnessTexture)) {
    clearcoat.clearcoatRoughnessTexture = loadTexture(
      loader,
      clearcoatRoughnessTexture,
      frameState
    );
  }
  if (defined(clearcoatNormalTexture)) {
    clearcoat.clearcoatNormalTexture = loadTexture(
      loader,
      clearcoatNormalTexture,
      frameState
    );
  }
  clearcoat.clearcoatFactor = clearcoatFactor;
  clearcoat.clearcoatRoughnessFactor = clearcoatRoughnessFactor;

  return clearcoat;
}

/**
 * Load textures and parse factors and flags for a glTF material
 *
 * @param {GltfLoader} loader
 * @param {object} gltfMaterial An entry from the <code>.materials</code> array in the glTF JSON
 * @param {FrameState} frameState
 * @returns {ModelComponents.Material}
 * @private
 */
function loadMaterial(loader, gltfMaterial, frameState) {
  const material = new Material();

  const extensions = defaultValue(
    gltfMaterial.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const pbrSpecularGlossiness = extensions.KHR_materials_pbrSpecularGlossiness;
  const pbrSpecular = extensions.KHR_materials_specular;
  const pbrAnisotropy = extensions.KHR_materials_anisotropy;
  const pbrClearcoat = extensions.KHR_materials_clearcoat;
  const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;

  material.unlit = defined(extensions.KHR_materials_unlit);

  if (defined(pbrSpecularGlossiness)) {
    material.specularGlossiness = loadSpecularGlossiness(
      loader,
      pbrSpecularGlossiness,
      frameState
    );
  } else {
    if (defined(pbrMetallicRoughness)) {
      material.metallicRoughness = loadMetallicRoughness(
        loader,
        pbrMetallicRoughness,
        frameState
      );
    }
    if (defined(pbrSpecular) && !material.unlit) {
      material.specular = loadSpecular(loader, pbrSpecular, frameState);
    }
    if (defined(pbrAnisotropy) && !material.unlit) {
      material.anisotropy = loadAnisotropy(loader, pbrAnisotropy, frameState);
    }
    if (defined(pbrClearcoat) && !material.unlit) {
      material.clearcoat = loadClearcoat(loader, pbrClearcoat, frameState);
    }
  }

  // Top level textures
  if (defined(gltfMaterial.emissiveTexture)) {
    material.emissiveTexture = loadTexture(
      loader,
      gltfMaterial.emissiveTexture,
      frameState
    );
  }
  // Normals aren't used for classification, so don't load the normal texture.
  if (defined(gltfMaterial.normalTexture) && !loader._loadForClassification) {
    material.normalTexture = loadTexture(
      loader,
      gltfMaterial.normalTexture,
      frameState
    );
  }
  if (defined(gltfMaterial.occlusionTexture)) {
    material.occlusionTexture = loadTexture(
      loader,
      gltfMaterial.occlusionTexture,
      frameState
    );
  }
  material.emissiveFactor = fromArray(Cartesian3, gltfMaterial.emissiveFactor);
  material.alphaMode = gltfMaterial.alphaMode;
  material.alphaCutoff = gltfMaterial.alphaCutoff;
  material.doubleSided = gltfMaterial.doubleSided;

  return material;
}

// for EXT_mesh_features
function loadFeatureIdAttribute(featureIds, positionalLabel) {
  const featureIdAttribute = new FeatureIdAttribute();
  featureIdAttribute.featureCount = featureIds.featureCount;
  featureIdAttribute.nullFeatureId = featureIds.nullFeatureId;
  featureIdAttribute.propertyTableId = featureIds.propertyTable;
  featureIdAttribute.setIndex = featureIds.attribute;
  featureIdAttribute.label = featureIds.label;
  featureIdAttribute.positionalLabel = positionalLabel;
  return featureIdAttribute;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdAttributeLegacy(
  gltfFeatureIdAttribute,
  featureTableId,
  featureCount,
  positionalLabel
) {
  const featureIdAttribute = new FeatureIdAttribute();
  const featureIds = gltfFeatureIdAttribute.featureIds;
  featureIdAttribute.featureCount = featureCount;
  featureIdAttribute.propertyTableId = featureTableId;
  featureIdAttribute.setIndex = getSetIndex(featureIds.attribute);
  featureIdAttribute.positionalLabel = positionalLabel;
  return featureIdAttribute;
}

// implicit ranges do not exist in EXT_mesh_features and EXT_instance_features,
// but both default to the vertex/instance ID which is like
// an implicit range of {offset: 0, repeat: 1}
function loadDefaultFeatureIds(featureIds, positionalLabel) {
  const featureIdRange = new FeatureIdImplicitRange();
  featureIdRange.propertyTableId = featureIds.propertyTable;
  featureIdRange.featureCount = featureIds.featureCount;
  featureIdRange.nullFeatureId = featureIds.nullFeatureId;
  featureIdRange.label = featureIds.label;
  featureIdRange.positionalLabel = positionalLabel;
  featureIdRange.offset = 0;
  featureIdRange.repeat = 1;
  return featureIdRange;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdImplicitRangeLegacy(
  gltfFeatureIdAttribute,
  featureTableId,
  featureCount,
  positionalLabel
) {
  const featureIdRange = new FeatureIdImplicitRange();
  const featureIds = gltfFeatureIdAttribute.featureIds;
  featureIdRange.propertyTableId = featureTableId;
  featureIdRange.featureCount = featureCount;

  // constant/divisor was renamed to offset/repeat
  featureIdRange.offset = defaultValue(featureIds.constant, 0);
  // The default is now undefined
  const divisor = defaultValue(featureIds.divisor, 0);
  featureIdRange.repeat = divisor === 0 ? undefined : divisor;

  featureIdRange.positionalLabel = positionalLabel;
  return featureIdRange;
}

// for EXT_mesh_features
function loadFeatureIdTexture(
  loader,
  gltfFeatureIdTexture,
  frameState,
  positionalLabel
) {
  const featureIdTexture = new FeatureIdTexture();

  featureIdTexture.featureCount = gltfFeatureIdTexture.featureCount;
  featureIdTexture.nullFeatureId = gltfFeatureIdTexture.nullFeatureId;
  featureIdTexture.propertyTableId = gltfFeatureIdTexture.propertyTable;
  featureIdTexture.label = gltfFeatureIdTexture.label;
  featureIdTexture.positionalLabel = positionalLabel;

  const textureInfo = gltfFeatureIdTexture.texture;
  featureIdTexture.textureReader = loadTexture(
    loader,
    textureInfo,
    frameState,
    Sampler.NEAREST // Feature ID textures require nearest sampling
  );

  // Though the new channel index is more future-proof, this implementation
  // only supports RGBA textures. At least for now, the string representation
  // is more useful for generating shader code.
  const channels = defined(textureInfo.channels) ? textureInfo.channels : [0];
  const channelString = channels
    .map(function (channelIndex) {
      return "rgba".charAt(channelIndex);
    })
    .join("");
  featureIdTexture.textureReader.channels = channelString;

  return featureIdTexture;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdTextureLegacy(
  loader,
  gltfFeatureIdTexture,
  featureTableId,
  frameState,
  featureCount,
  positionalLabel
) {
  const featureIdTexture = new FeatureIdTexture();
  const featureIds = gltfFeatureIdTexture.featureIds;
  const textureInfo = featureIds.texture;
  featureIdTexture.featureCount = featureCount;
  featureIdTexture.propertyTableId = featureTableId;
  featureIdTexture.textureReader = loadTexture(
    loader,
    textureInfo,
    frameState,
    Sampler.NEAREST // Feature ID textures require nearest sampling
  );

  featureIdTexture.textureReader.channels = featureIds.channels;
  featureIdTexture.positionalLabel = positionalLabel;

  return featureIdTexture;
}

function loadMorphTarget(
  loader,
  target,
  needsPostProcessing,
  primitiveLoadPlan,
  frameState
) {
  const morphTarget = new MorphTarget();

  // Don't pass in draco object since morph targets can't be draco compressed
  const draco = undefined;
  const hasInstances = false;

  for (const semantic in target) {
    if (!target.hasOwnProperty(semantic)) {
      continue;
    }
    const accessorId = target[semantic];

    const semanticInfo = getSemanticInfo(
      loader,
      VertexAttributeSemantic,
      semantic
    );

    const attributePlan = loadVertexAttribute(
      loader,
      accessorId,
      semanticInfo,
      draco,
      hasInstances,
      needsPostProcessing,
      frameState
    );
    morphTarget.attributes.push(attributePlan.attribute);

    // The load plan doesn't need to distinguish morph target attributes from
    // regular attributes
    primitiveLoadPlan.attributePlans.push(attributePlan);
  }

  return morphTarget;
}

/**
 * Load resources associated with a mesh primitive for a glTF node
 * @param {GltfLoader} loader
 * @param {object} gltfPrimitive One of the primitives in a mesh
 * @param {boolean} hasInstances True if the node using this mesh has instances
 * @param {FrameState} frameState
 * @returns {ModelComponents.Primitive}
 * @private
 */
function loadPrimitive(loader, gltfPrimitive, hasInstances, frameState) {
  const primitive = new Primitive();
  const primitivePlan = new PrimitiveLoadPlan(primitive);
  loader._primitiveLoadPlans.push(primitivePlan);

  const materialId = gltfPrimitive.material;
  if (defined(materialId)) {
    primitive.material = loadMaterial(
      loader,
      loader.gltfJson.materials[materialId],
      frameState
    );
  }

  const extensions = defaultValue(
    gltfPrimitive.extensions,
    defaultValue.EMPTY_OBJECT
  );

  let needsPostProcessing = false;
  const outlineExtension = extensions.CESIUM_primitive_outline;
  if (loader._loadPrimitiveOutline && defined(outlineExtension)) {
    needsPostProcessing = true;
    primitivePlan.needsOutlines = true;
    primitivePlan.outlineIndices = loadPrimitiveOutline(
      loader,
      outlineExtension,
      primitivePlan
    );
  }

  const loadForClassification = loader._loadForClassification;
  const draco = extensions.KHR_draco_mesh_compression;

  let hasFeatureIds = false;
  const attributes = gltfPrimitive.attributes;
  if (defined(attributes)) {
    for (const semantic in attributes) {
      if (!attributes.hasOwnProperty(semantic)) {
        continue;
      }
      const accessorId = attributes[semantic];
      const semanticInfo = getSemanticInfo(
        loader,
        VertexAttributeSemantic,
        semantic
      );

      const modelSemantic = semanticInfo.modelSemantic;
      if (loadForClassification && !isClassificationAttribute(modelSemantic)) {
        continue;
      }

      if (modelSemantic === VertexAttributeSemantic.FEATURE_ID) {
        hasFeatureIds = true;
      }

      const attributePlan = loadVertexAttribute(
        loader,
        accessorId,
        semanticInfo,
        draco,
        hasInstances,
        needsPostProcessing,
        frameState
      );

      primitivePlan.attributePlans.push(attributePlan);
      primitive.attributes.push(attributePlan.attribute);
    }
  }

  const targets = gltfPrimitive.targets;
  // Morph targets are disabled for classification models.
  if (defined(targets) && !loadForClassification) {
    for (let i = 0; i < targets.length; ++i) {
      primitive.morphTargets.push(
        loadMorphTarget(
          loader,
          targets[i],
          needsPostProcessing,
          primitivePlan,
          frameState
        )
      );
    }
  }

  const indices = gltfPrimitive.indices;
  if (defined(indices)) {
    const indicesPlan = loadIndices(
      loader,
      indices,
      draco,
      hasFeatureIds,
      needsPostProcessing,
      frameState
    );

    if (defined(indicesPlan)) {
      primitivePlan.indicesPlan = indicesPlan;
      primitive.indices = indicesPlan.indices;
    }
  }

  // With the latest revision, feature IDs are defined in EXT_mesh_features
  // while EXT_structural_metadata is for defining property textures and
  // property mappings. In the legacy EXT_feature_metadata, these concepts
  // were all in one extension.
  const structuralMetadata = extensions.EXT_structural_metadata;
  const meshFeatures = extensions.EXT_mesh_features;
  const featureMetadataLegacy = extensions.EXT_feature_metadata;
  const hasFeatureMetadataLegacy = defined(featureMetadataLegacy);

  // Load feature Ids
  if (defined(meshFeatures)) {
    loadPrimitiveFeatures(loader, primitive, meshFeatures, frameState);
  } else if (hasFeatureMetadataLegacy) {
    loadPrimitiveFeaturesLegacy(
      loader,
      primitive,
      featureMetadataLegacy,
      frameState
    );
  }

  // Load structural metadata
  if (defined(structuralMetadata)) {
    loadPrimitiveMetadata(primitive, structuralMetadata);
  } else if (hasFeatureMetadataLegacy) {
    loadPrimitiveMetadataLegacy(loader, primitive, featureMetadataLegacy);
  }

  const primitiveType = gltfPrimitive.mode;
  if (loadForClassification && primitiveType !== PrimitiveType.TRIANGLES) {
    throw new RuntimeError(
      "Only triangle meshes can be used for classification."
    );
  }
  primitive.primitiveType = primitiveType;

  return primitive;
}

function loadPrimitiveOutline(loader, outlineExtension) {
  const accessorId = outlineExtension.indices;
  const accessor = loader.gltfJson.accessors[accessorId];
  const useQuaternion = false;
  return loadAccessor(loader, accessor, useQuaternion);
}

// For EXT_mesh_features
function loadPrimitiveFeatures(
  loader,
  primitive,
  meshFeaturesExtension,
  frameState
) {
  let featureIdsArray;
  if (
    defined(meshFeaturesExtension) &&
    defined(meshFeaturesExtension.featureIds)
  ) {
    featureIdsArray = meshFeaturesExtension.featureIds;
  } else {
    featureIdsArray = [];
  }

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    const label = `featureId_${i}`;

    let featureIdComponent;
    if (defined(featureIds.texture)) {
      featureIdComponent = loadFeatureIdTexture(
        loader,
        featureIds,
        frameState,
        label
      );
    } else if (defined(featureIds.attribute)) {
      featureIdComponent = loadFeatureIdAttribute(featureIds, label);
    } else {
      // default to vertex ID, in other words an implicit range with
      // offset: 0, repeat: 1
      featureIdComponent = loadDefaultFeatureIds(featureIds, label);
    }

    primitive.featureIds.push(featureIdComponent);
  }
}

// For EXT_feature_metadata
function loadPrimitiveFeaturesLegacy(
  loader,
  primitive,
  metadataExtension,
  frameState
) {
  // For looking up the featureCount for each set of feature IDs
  const { featureTables } = loader.gltfJson.extensions.EXT_feature_metadata;

  let nextFeatureIdIndex = 0;

  // Feature ID Attributes
  const featureIdAttributes = metadataExtension.featureIdAttributes;
  if (defined(featureIdAttributes)) {
    for (let i = 0; i < featureIdAttributes.length; ++i) {
      const featureIdAttribute = featureIdAttributes[i];
      const featureTableId = featureIdAttribute.featureTable;
      const propertyTableId = loader._sortedPropertyTableIds.indexOf(
        featureTableId
      );
      const featureCount = featureTables[featureTableId].count;
      const label = `featureId_${nextFeatureIdIndex}`;
      nextFeatureIdIndex++;

      let featureIdComponent;
      if (defined(featureIdAttribute.featureIds.attribute)) {
        featureIdComponent = loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount,
          label
        );
      } else {
        featureIdComponent = loadFeatureIdImplicitRangeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount,
          label
        );
      }
      primitive.featureIds.push(featureIdComponent);
    }
  }

  // Feature ID Textures
  const featureIdTextures = metadataExtension.featureIdTextures;
  if (defined(featureIdTextures)) {
    for (let i = 0; i < featureIdTextures.length; ++i) {
      const featureIdTexture = featureIdTextures[i];
      const featureTableId = featureIdTexture.featureTable;
      const propertyTableId = loader._sortedPropertyTableIds.indexOf(
        featureTableId
      );
      const featureCount = featureTables[featureTableId].count;
      const featureIdLabel = `featureId_${nextFeatureIdIndex}`;
      nextFeatureIdIndex++;

      const featureIdComponent = loadFeatureIdTextureLegacy(
        loader,
        featureIdTexture,
        propertyTableId,
        frameState,
        featureCount,
        featureIdLabel
      );
      // Feature ID textures are added after feature ID attributes in the list
      primitive.featureIds.push(featureIdComponent);
    }
  }
}

// For primitive-level EXT_structural_metadata
function loadPrimitiveMetadata(primitive, structuralMetadataExtension) {
  if (!defined(structuralMetadataExtension)) {
    return;
  }

  // Property Textures
  if (defined(structuralMetadataExtension.propertyTextures)) {
    primitive.propertyTextureIds = structuralMetadataExtension.propertyTextures;
  }

  // Property Attributes
  if (defined(structuralMetadataExtension.propertyAttributes)) {
    primitive.propertyAttributeIds =
      structuralMetadataExtension.propertyAttributes;
  }
}

// For EXT_feature_metadata
function loadPrimitiveMetadataLegacy(loader, primitive, metadataExtension) {
  // Feature Textures
  if (defined(metadataExtension.featureTextures)) {
    // feature textures are now identified by an integer index. To convert the
    // string IDs to integers, find their place in the sorted list of feature
    // table names
    primitive.propertyTextureIds = metadataExtension.featureTextures.map(
      function (id) {
        return loader._sortedFeatureTextureIds.indexOf(id);
      }
    );
  }
}

function loadInstances(loader, nodeExtensions, frameState) {
  const instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;

  const instances = new Instances();
  const attributes = instancingExtension.attributes;
  if (defined(attributes)) {
    for (const semantic in attributes) {
      if (!attributes.hasOwnProperty(semantic)) {
        continue;
      }
      const accessorId = attributes[semantic];
      instances.attributes.push(
        loadInstancedAttribute(
          loader,
          accessorId,
          attributes,
          semantic,
          frameState
        )
      );
    }
  }

  const instancingExtExtensions = defaultValue(
    instancingExtension.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const instanceFeatures = nodeExtensions.EXT_instance_features;
  const featureMetadataLegacy = instancingExtExtensions.EXT_feature_metadata;

  if (defined(instanceFeatures)) {
    loadInstanceFeatures(instances, instanceFeatures);
  } else if (defined(featureMetadataLegacy)) {
    loadInstanceFeaturesLegacy(
      loader.gltfJson,
      instances,
      featureMetadataLegacy,
      loader._sortedPropertyTableIds
    );
  }

  return instances;
}

// For EXT_mesh_features
function loadInstanceFeatures(instances, instanceFeaturesExtension) {
  // feature IDs are required in EXT_instance_features
  const featureIdsArray = instanceFeaturesExtension.featureIds;

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    const label = `instanceFeatureId_${i}`;

    let featureIdComponent;
    if (defined(featureIds.attribute)) {
      featureIdComponent = loadFeatureIdAttribute(featureIds, label);
    } else {
      // in EXT_instance_features, the default is to assign IDs by instance
      // ID. This can be expressed with offset: 0, repeat: 1
      featureIdComponent = loadDefaultFeatureIds(featureIds, label);
    }

    instances.featureIds.push(featureIdComponent);
  }
}

// For backwards-compatibility with EXT_feature_metadata
function loadInstanceFeaturesLegacy(
  gltf,
  instances,
  metadataExtension,
  sortedPropertyTableIds
) {
  // For looking up the featureCount for each set of feature IDs
  const featureTables = gltf.extensions.EXT_feature_metadata.featureTables;

  const featureIdAttributes = metadataExtension.featureIdAttributes;
  if (defined(featureIdAttributes)) {
    for (let i = 0; i < featureIdAttributes.length; ++i) {
      const featureIdAttribute = featureIdAttributes[i];
      const featureTableId = featureIdAttribute.featureTable;
      const propertyTableId = sortedPropertyTableIds.indexOf(featureTableId);
      const featureCount = featureTables[featureTableId].count;
      const label = `instanceFeatureId_${i}`;

      let featureIdComponent;
      if (defined(featureIdAttribute.featureIds.attribute)) {
        featureIdComponent = loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount,
          label
        );
      } else {
        featureIdComponent = loadFeatureIdImplicitRangeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount,
          label
        );
      }
      instances.featureIds.push(featureIdComponent);
    }
  }
}

/**
 * Load resources associated with one node from a glTF JSON
 * @param {GltfLoader} loader
 * @param {object} gltfNode An entry from the <code>.nodes</code> array in the glTF JSON
 * @param {FrameState} frameState
 * @returns {ModelComponents.Node}
 * @private
 */
function loadNode(loader, gltfNode, frameState) {
  const node = new Node();

  node.name = gltfNode.name;

  node.matrix = fromArray(Matrix4, gltfNode.matrix);
  node.translation = fromArray(Cartesian3, gltfNode.translation);
  node.rotation = fromArray(Quaternion, gltfNode.rotation);
  node.scale = fromArray(Cartesian3, gltfNode.scale);

  const nodeExtensions = defaultValue(
    gltfNode.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;
  const articulationsExtension = nodeExtensions.AGI_articulations;

  if (defined(instancingExtension)) {
    if (loader._loadForClassification) {
      throw new RuntimeError(
        "Models with the EXT_mesh_gpu_instancing extension cannot be used for classification."
      );
    }
    node.instances = loadInstances(loader, nodeExtensions, frameState);
  }

  if (defined(articulationsExtension)) {
    node.articulationName = articulationsExtension.articulationName;
  }

  const meshId = gltfNode.mesh;
  if (defined(meshId)) {
    const mesh = loader.gltfJson.meshes[meshId];
    const primitives = mesh.primitives;
    for (let i = 0; i < primitives.length; ++i) {
      node.primitives.push(
        loadPrimitive(
          loader,
          primitives[i],
          defined(node.instances),
          frameState
        )
      );
    }

    // If the node has no weights array, it will look for the weights array provided
    // by the mesh. If both are undefined, it will default to an array of zero weights.
    const morphWeights = defaultValue(gltfNode.weights, mesh.weights);
    const targets = node.primitives[0].morphTargets;

    // Since meshes are not stored as separate components, the mesh weights will still
    // be stored at the node level.
    node.morphWeights = defined(morphWeights)
      ? morphWeights.slice()
      : new Array(targets.length).fill(0.0);
  }

  return node;
}

/**
 * Load resources associated with the nodes in a glTF JSON
 * @param {GltfLoader} loader
 * @param {FrameState} frameState
 * @returns {ModelComponents.Node[]}
 * @private
 */
function loadNodes(loader, frameState) {
  const nodeJsons = loader.gltfJson.nodes;
  if (!defined(nodeJsons)) {
    return [];
  }

  const loadedNodes = nodeJsons.map(function (nodeJson, i) {
    const node = loadNode(loader, nodeJson, frameState);
    node.index = i;
    return node;
  });

  for (let i = 0; i < loadedNodes.length; ++i) {
    const childrenNodeIds = nodeJsons[i].children;
    if (defined(childrenNodeIds)) {
      for (let j = 0; j < childrenNodeIds.length; ++j) {
        loadedNodes[i].children.push(loadedNodes[childrenNodeIds[j]]);
      }
    }
  }

  return loadedNodes;
}

function loadSkin(loader, gltfSkin, nodes) {
  const skin = new Skin();

  const jointIds = gltfSkin.joints;
  skin.joints = jointIds.map((jointId) => nodes[jointId]);

  const inverseBindMatricesAccessorId = gltfSkin.inverseBindMatrices;
  if (defined(inverseBindMatricesAccessorId)) {
    const accessor = loader.gltfJson.accessors[inverseBindMatricesAccessorId];
    skin.inverseBindMatrices = loadAccessor(loader, accessor);
  } else {
    skin.inverseBindMatrices = new Array(jointIds.length).fill(
      Matrix4.IDENTITY
    );
  }

  return skin;
}

function loadSkins(loader, nodes) {
  const skinJsons = loader.gltfJson.skins;

  // Skins are disabled for classification models.
  if (loader._loadForClassification || !defined(skinJsons)) {
    return [];
  }

  const loadedSkins = skinJsons.map(function (skinJson, i) {
    const skin = loadSkin(loader, skinJson, nodes);
    skin.index = i;
    return skin;
  });

  const nodeJsons = loader.gltfJson.nodes;
  for (let i = 0; i < nodes.length; ++i) {
    const skinId = nodeJsons[i].skin;
    if (defined(skinId)) {
      nodes[i].skin = loadedSkins[skinId];
    }
  }

  return loadedSkins;
}

async function loadStructuralMetadata(
  loader,
  extension,
  extensionLegacy,
  frameState
) {
  const structuralMetadataLoader = new GltfStructuralMetadataLoader({
    gltf: loader.gltfJson,
    extension: extension,
    extensionLegacy: extensionLegacy,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: loader._supportedImageFormats,
    frameState: frameState,
    asynchronous: loader._asynchronous,
  });
  loader._structuralMetadataLoader = structuralMetadataLoader;
  return structuralMetadataLoader.load();
}

function loadAnimationSampler(loader, gltfSampler) {
  const animationSampler = new AnimationSampler();
  const accessors = loader.gltfJson.accessors;

  const inputAccessor = accessors[gltfSampler.input];
  animationSampler.input = loadAccessor(loader, inputAccessor);

  const gltfInterpolation = gltfSampler.interpolation;
  animationSampler.interpolation = defaultValue(
    InterpolationType[gltfInterpolation],
    InterpolationType.LINEAR
  );

  const outputAccessor = accessors[gltfSampler.output];
  animationSampler.output = loadAccessor(loader, outputAccessor, true);

  return animationSampler;
}

function loadAnimationTarget(gltfTarget, nodes) {
  const animationTarget = new AnimationTarget();

  const nodeIndex = gltfTarget.node;
  // If the node isn't defined, the animation channel should be ignored.
  // It's easiest to signal this by returning undefined.
  if (!defined(nodeIndex)) {
    return undefined;
  }

  animationTarget.node = nodes[nodeIndex];

  const path = gltfTarget.path.toUpperCase();
  animationTarget.path = AnimatedPropertyType[path];

  return animationTarget;
}

function loadAnimationChannel(gltfChannel, samplers, nodes) {
  const animationChannel = new AnimationChannel();

  const samplerIndex = gltfChannel.sampler;
  animationChannel.sampler = samplers[samplerIndex];
  animationChannel.target = loadAnimationTarget(gltfChannel.target, nodes);

  return animationChannel;
}

function loadAnimation(loader, animationJson, nodes) {
  const animation = new Animation();
  animation.name = animationJson.name;

  const samplers = animationJson.samplers.map(function (samplerJson, i) {
    const sampler = loadAnimationSampler(loader, samplerJson);
    sampler.index = i;
    return sampler;
  });

  const channels = animationJson.channels.map(function (channelJson) {
    return loadAnimationChannel(channelJson, samplers, nodes);
  });

  animation.samplers = samplers;
  animation.channels = channels;

  return animation;
}

function loadAnimations(loader, nodes) {
  const animationJsons = loader.gltfJson.animations;

  // Animations are disabled for classification models.
  if (loader._loadForClassification || !defined(animationJsons)) {
    return [];
  }

  const animations = animationJsons.map(function (animationJson, i) {
    const animation = loadAnimation(loader, animationJson, nodes);
    animation.index = i;
    return animation;
  });

  return animations;
}

function loadArticulationStage(gltfStage) {
  const stage = new ArticulationStage();
  stage.name = gltfStage.name;

  const type = gltfStage.type.toUpperCase();
  stage.type = ArticulationStageType[type];

  stage.minimumValue = gltfStage.minimumValue;
  stage.maximumValue = gltfStage.maximumValue;
  stage.initialValue = gltfStage.initialValue;

  return stage;
}

function loadArticulation(articulationJson) {
  const articulation = new Articulation();
  articulation.name = articulationJson.name;
  articulation.stages = articulationJson.stages.map(loadArticulationStage);
  return articulation;
}

function loadArticulations(gltf) {
  const extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  const articulationJsons = extensions.AGI_articulations?.articulations;
  if (!defined(articulationJsons)) {
    return [];
  }
  return articulationJsons.map(loadArticulation);
}

function getSceneNodeIds(gltf) {
  let nodesIds;
  if (defined(gltf.scenes) && defined(gltf.scene)) {
    nodesIds = gltf.scenes[gltf.scene].nodes;
  }
  nodesIds = defaultValue(nodesIds, gltf.nodes);
  nodesIds = defined(nodesIds) ? nodesIds : [];
  return nodesIds;
}

function loadScene(gltf, nodes) {
  const scene = new Scene();
  const sceneNodeIds = getSceneNodeIds(gltf);
  scene.nodes = sceneNodeIds.map(function (sceneNodeId) {
    return nodes[sceneNodeId];
  });
  return scene;
}

const scratchCenter = new Cartesian3();

/**
 * Parse the glTF which populates the loaders arrays. Loading promises will be created, and will
 * resolve once the loaders are ready (i.e. all external resources
 * have been fetched and all GPU resources have been created). Loaders that
 * create GPU resources need to be processed every frame until they become
 * ready since the JobScheduler is not able to execute all jobs in a single
 * frame. Any promise failures are collected, and will be handled synchronously in process().
 * Also note that it's fine to call process before a loader is ready to process or
 * after it has failed; nothing will happen.
 *
 * @param {GltfLoader} loader
 * @param {FrameState} frameState
 * @returns {Promise} A Promise that resolves when all loaders are ready
 * @private
 */
function parse(loader, frameState) {
  const gltf = loader.gltfJson;
  const extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  const structuralMetadataExtension = extensions.EXT_structural_metadata;
  const featureMetadataExtensionLegacy = extensions.EXT_feature_metadata;
  const cesiumRtcExtension = extensions.CESIUM_RTC;

  if (defined(featureMetadataExtensionLegacy)) {
    // If the old EXT_feature_metadata extension is present, sort the IDs of the
    // feature tables and feature textures so we don't have to do this once
    // per primitive.
    //
    // This must run before loadNodes so these IDs are available when
    // attributes are processed.
    const featureTables = featureMetadataExtensionLegacy.featureTables;
    const featureTextures = featureMetadataExtensionLegacy.featureTextures;
    const allPropertyTableIds = defined(featureTables) ? featureTables : [];
    const allFeatureTextureIds = defined(featureTextures)
      ? featureTextures
      : [];
    loader._sortedPropertyTableIds = Object.keys(allPropertyTableIds).sort();
    loader._sortedFeatureTextureIds = Object.keys(allFeatureTextureIds).sort();
  }

  const nodes = loadNodes(loader, frameState);
  const skins = loadSkins(loader, nodes);
  const animations = loadAnimations(loader, nodes);
  const articulations = loadArticulations(gltf);
  const scene = loadScene(gltf, nodes);

  const components = new Components();
  const asset = new Asset();
  const copyright = gltf.asset.copyright;
  if (defined(copyright)) {
    const credits = copyright.split(";").map(function (string) {
      return new Credit(string.trim());
    });
    asset.credits = credits;
  }

  components.asset = asset;
  components.scene = scene;
  components.nodes = nodes;
  components.skins = skins;
  components.animations = animations;
  components.articulations = articulations;
  components.upAxis = loader._upAxis;
  components.forwardAxis = loader._forwardAxis;

  if (defined(cesiumRtcExtension)) {
    // CESIUM_RTC is almost always WGS84 coordinates so no axis conversion needed
    const center = Cartesian3.fromArray(
      cesiumRtcExtension.center,
      0,
      scratchCenter
    );
    components.transform = Matrix4.fromTranslation(
      center,
      components.transform
    );
  }

  loader._components = components;

  // Load structural metadata (property tables and property textures)
  if (
    defined(structuralMetadataExtension) ||
    defined(featureMetadataExtensionLegacy)
  ) {
    const promise = loadStructuralMetadata(
      loader,
      structuralMetadataExtension,
      featureMetadataExtensionLegacy,
      frameState
    );
    loader._loaderPromises.push(promise);
  }

  // Gather promises and handle any errors
  const readyPromises = [];
  readyPromises.push.apply(readyPromises, loader._loaderPromises);

  // When incrementallyLoadTextures is true, the errors are caught and thrown individually
  // since it doesn't affect the overall loader state
  if (!loader._incrementallyLoadTextures) {
    readyPromises.push.apply(readyPromises, loader._texturesPromises);
  }

  return Promise.all(readyPromises);
}

function unloadTextures(loader) {
  const textureLoaders = loader._textureLoaders;
  for (let i = 0; i < textureLoaders.length; ++i) {
    textureLoaders[i] =
      !textureLoaders[i].isDestroyed() &&
      ResourceCache.unload(textureLoaders[i]);
  }
  loader._textureLoaders.length = 0;
}

function unloadBufferViewLoaders(loader) {
  const bufferViewLoaders = loader._bufferViewLoaders;
  for (let i = 0; i < bufferViewLoaders.length; ++i) {
    bufferViewLoaders[i] =
      !bufferViewLoaders[i].isDestroyed() &&
      ResourceCache.unload(bufferViewLoaders[i]);
  }
  loader._bufferViewLoaders.length = 0;
}

function unloadGeometry(loader) {
  const geometryLoaders = loader._geometryLoaders;
  for (let i = 0; i < geometryLoaders.length; ++i) {
    geometryLoaders[i] =
      !geometryLoaders[i].isDestroyed() &&
      ResourceCache.unload(geometryLoaders[i]);
  }
  loader._geometryLoaders.length = 0;
}

function unloadGeneratedAttributes(loader) {
  const buffers = loader._postProcessBuffers;
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    if (!buffer.isDestroyed()) {
      buffer.destroy();
    }
  }
  buffers.length = 0;
}

function unloadStructuralMetadata(loader) {
  if (
    defined(loader._structuralMetadataLoader) &&
    !loader._structuralMetadataLoader.isDestroyed()
  ) {
    loader._structuralMetadataLoader.destroy();
    loader._structuralMetadataLoader = undefined;
  }
}

/**
 * Returns whether the resource has been unloaded.
 * @private
 */
GltfLoader.prototype.isUnloaded = function () {
  return this._state === GltfLoaderState.UNLOADED;
};

/**
 * Unloads the resource.
 * @private
 */
GltfLoader.prototype.unload = function () {
  if (defined(this._gltfJsonLoader) && !this._gltfJsonLoader.isDestroyed()) {
    ResourceCache.unload(this._gltfJsonLoader);
  }
  this._gltfJsonLoader = undefined;

  unloadTextures(this);
  unloadBufferViewLoaders(this);
  unloadGeometry(this);
  unloadGeneratedAttributes(this);
  unloadStructuralMetadata(this);

  this._components = undefined;
  this._typedArray = undefined;
  this._state = GltfLoaderState.UNLOADED;
};

export default GltfLoader;
