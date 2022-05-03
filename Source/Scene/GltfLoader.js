import arrayFill from "../Core/arrayFill.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import Credit from "../Core/Credit.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import InterpolationType from "../Core/InterpolationType.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import Sampler from "../Renderer/Sampler.js";
import getAccessorByteStride from "./GltfPipeline/getAccessorByteStride.js";
import getComponentReader from "./GltfPipeline/getComponentReader.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";
import AttributeType from "./AttributeType.js";
import Axis from "./Axis.js";
import GltfStructuralMetadataLoader from "./GltfStructuralMetadataLoader.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import InstanceAttributeSemantic from "./InstanceAttributeSemantic.js";
import ModelComponents from "./ModelComponents.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";
import SupportedImageFormats from "./SupportedImageFormats.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

const Attribute = ModelComponents.Attribute;
const Indices = ModelComponents.Indices;
const FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
const FeatureIdTexture = ModelComponents.FeatureIdTexture;
const FeatureIdImplicitRange = ModelComponents.FeatureIdImplicitRange;
const MorphTarget = ModelComponents.MorphTarget;
const Primitive = ModelComponents.Primitive;
const Instances = ModelComponents.Instances;
const Skin = ModelComponents.Skin;
const Node = ModelComponents.Node;
const AnimatedPropertyType = ModelComponents.AnimatedPropertyType;
const AnimationSampler = ModelComponents.AnimationSampler;
const AnimationTarget = ModelComponents.AnimationTarget;
const AnimationChannel = ModelComponents.AnimationChannel;
const Animation = ModelComponents.Animation;
const Asset = ModelComponents.Asset;
const Scene = ModelComponents.Scene;
const Components = ModelComponents.Components;
const MetallicRoughness = ModelComponents.MetallicRoughness;
const SpecularGlossiness = ModelComponents.SpecularGlossiness;
const Material = ModelComponents.Material;

const GltfLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  LOADED: 2,
  PROCESSING: 3,
  PROCESSED: 4,
  READY: 4,
  FAILED: 5,
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
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.gltfResource The {@link Resource} containing the glTF. This is often the path of the .gltf or .glb file, but may also be the path of the .b3dm, .i3dm, or .cmpt file containing the embedded glb. .cmpt resources should have a URI fragment indicating the index of the inner content to which the glb belongs in order to individually identify the glb in the cache, e.g. http://example.com/tile.cmpt#index=2.
 * @param {Resource} [options.baseResource] The {@link Resource} that paths in the glTF JSON are relative to.
 * @param {Uint8Array} [options.typedArray] The typed array containing the glTF contents, e.g. from a .b3dm, .i3dm, or .cmpt file.
 * @param {Object} [options.gltfJson] A parsed glTF JSON file instead of passing it in as a typed array.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {Boolean} [options.loadAsTypedArray=false] Load all attributes and indices as typed arrays instead of GPU buffers.
 * @param {Boolean} [options.renameBatchIdSemantic=false] If true, rename _BATCHID or BATCHID to _FEATURE_ID_0. This is used for .b3dm models
 *
 * @private
 */
export default function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const gltfResource = options.gltfResource;
  let baseResource = options.baseResource;
  const typedArray = options.typedArray;
  const releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  const asynchronous = defaultValue(options.asynchronous, true);
  const incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  const upAxis = defaultValue(options.upAxis, Axis.Y);
  const forwardAxis = defaultValue(options.forwardAxis, Axis.Z);
  const loadAsTypedArray = defaultValue(options.loadAsTypedArray, false);
  const renameBatchIdSemantic = defaultValue(
    options.renameBatchIdSemantic,
    false
  );

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.gltfResource", gltfResource);
  //>>includeEnd('debug');

  baseResource = defined(baseResource) ? baseResource : gltfResource.clone();

  this._gltfJson = options.gltfJson;
  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._typedArray = typedArray;
  this._releaseGltfJson = releaseGltfJson;
  this._asynchronous = asynchronous;
  this._incrementallyLoadTextures = incrementallyLoadTextures;
  this._upAxis = upAxis;
  this._forwardAxis = forwardAxis;
  this._loadAsTypedArray = loadAsTypedArray;
  this._renameBatchIdSemantic = renameBatchIdSemantic;

  // When loading EXT_feature_metadata, the feature tables and textures
  // are now stored as arrays like the newer EXT_structural_metadata extension.
  // This requires sorting the dictionary keys for a consistent ordering.
  this._sortedPropertyTableIds = undefined;
  this._sortedFeatureTextureIds = undefined;

  this._gltfJsonLoader = undefined;
  this._state = GltfLoaderState.UNLOADED;
  this._textureState = GltfLoaderState.UNLOADED;
  this._promise = defer();
  this._texturesLoadedPromise = defer();

  // Loaders that need to be processed before the glTF becomes ready
  this._textureLoaders = [];
  this._bufferViewLoaders = [];
  this._geometryLoaders = [];
  this._structuralMetadataLoader = undefined;

  // Loaded results
  this._components = undefined;
}

if (defined(Object.create)) {
  GltfLoader.prototype = Object.create(ResourceLoader.prototype);
  GltfLoader.prototype.constructor = GltfLoader;
}

Object.defineProperties(GltfLoader.prototype, {
  /**
   * A promise that resolves to the resource when the resource is ready.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Promise.<GltfLoader>}
   * @readonly
   * @private
   */
  promise: {
    get: function () {
      return this._promise.promise;
    },
  },
  /**
   * The cache key of the resource.
   *
   * @memberof GltfLoader.prototype
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
   * A promise that resolves when all textures are loaded.
   * When <code>incrementallyLoadTextures</code> is true this may resolve after
   * <code>promise</code> resolves.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Promise<void>}
   * @readonly
   * @private
   */
  texturesLoadedPromise: {
    get: function () {
      return this._texturesLoadedPromise.promise;
    },
  },
});

/**
 * Loads the resource.
 * @private
 */
GltfLoader.prototype.load = function () {
  const gltfJsonLoader = ResourceCache.loadGltfJson({
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    typedArray: this._typedArray,
    gltfJson: this._gltfJson,
  });

  this._gltfJsonLoader = gltfJsonLoader;
  this._state = GltfLoaderState.LOADING;
  this._textureState = GltfLoaderState.LOADING;

  const that = this;
  gltfJsonLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        return;
      }
      that._state = GltfLoaderState.LOADED;
      that._textureState = GltfLoaderState.LOADED;
    })
    .catch(function (error) {
      if (that.isDestroyed()) {
        return;
      }
      handleError(that, error);
    });
};

function handleError(gltfLoader, error) {
  gltfLoader.unload();
  gltfLoader._state = GltfLoaderState.FAILED;
  gltfLoader._textureState = GltfLoaderState.FAILED;
  const errorMessage = "Failed to load glTF";
  error = gltfLoader.getError(errorMessage, error);
  gltfLoader._promise.reject(error);
  gltfLoader._texturesLoadedPromise.reject(error);
}

function process(loader, frameState) {
  let i;
  const textureLoaders = loader._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  for (i = 0; i < textureLoadersLength; ++i) {
    textureLoaders[i].process(frameState);
  }

  const bufferViewLoaders = loader._bufferViewLoaders;
  const bufferViewLoadersLength = bufferViewLoaders.length;
  for (i = 0; i < bufferViewLoadersLength; ++i) {
    bufferViewLoaders[i].process(frameState);
  }

  const geometryLoaders = loader._geometryLoaders;
  const geometryLoadersLength = geometryLoaders.length;
  for (i = 0; i < geometryLoadersLength; ++i) {
    geometryLoaders[i].process(frameState);
  }

  if (defined(loader._structuralMetadataLoader)) {
    loader._structuralMetadataLoader.process(frameState);
  }
}

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

  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }

  if (this._state === GltfLoaderState.LOADED) {
    this._state = GltfLoaderState.PROCESSING;

    const supportedImageFormats = new SupportedImageFormats({
      webp: FeatureDetection.supportsWebP(),
      basis: frameState.context.supportsBasis,
    });

    let gltf;
    if (defined(this._gltfJsonLoader)) {
      gltf = this._gltfJsonLoader.gltf;
    } else {
      gltf = this._gltfJson;
    }

    // Parse the glTF which populates the loaders arrays. The ready promise
    // resolves once all the loaders are ready (i.e. all external resources
    // have been fetched and all GPU resources have been created). Loaders that
    // create GPU resources need to be processed every frame until they become
    // ready since the JobScheduler is not able to execute all jobs in a single
    // frame. Also note that it's fine to call process before a loader is ready
    // to process; nothing will happen.
    parse(this, gltf, supportedImageFormats, frameState);

    if (defined(this._gltfJsonLoader) && this._releaseGltfJson) {
      // Check that the glTF JSON loader is still defined before trying to unload it.
      // It may be undefined if the ready promise rejects immediately (which can happen in unit tests)
      ResourceCache.unload(this._gltfJsonLoader);
      this._gltfJsonLoader = undefined;
    }
  }

  if (this._textureState === GltfLoaderState.LOADED) {
    this._textureState = GltfLoaderState.PROCESSING;
  }

  if (
    this._state === GltfLoaderState.PROCESSING ||
    this._textureState === GltfLoaderState.PROCESSING
  ) {
    process(this, frameState);
  }

  if (this._state === GltfLoaderState.PROCESSED) {
    unloadBufferViews(this); // Buffer views can be unloaded after the data has been copied
    this._state = GltfLoaderState.READY;
    this._promise.resolve(this);
  }

  if (this._textureState === GltfLoaderState.PROCESSED) {
    this._textureState = GltfLoaderState.READY;
    this._texturesLoadedPromise.resolve(this);
  }
};

function loadVertexBuffer(
  loader,
  gltf,
  accessorId,
  semantic,
  draco,
  dequantize,
  loadAsTypedArray
) {
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  const vertexBufferLoader = ResourceCache.loadVertexBuffer({
    gltf: gltf,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    bufferViewId: bufferViewId,
    draco: draco,
    attributeSemantic: semantic,
    accessorId: accessorId,
    asynchronous: loader._asynchronous,
    dequantize: dequantize,
    loadAsTypedArray: loadAsTypedArray,
  });

  loader._geometryLoaders.push(vertexBufferLoader);

  return vertexBufferLoader;
}

function loadIndexBuffer(loader, gltf, accessorId, draco, loadAsTypedArray) {
  const indexBufferLoader = ResourceCache.loadIndexBuffer({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    draco: draco,
    asynchronous: loader._asynchronous,
    loadAsTypedArray: loadAsTypedArray,
  });

  loader._geometryLoaders.push(indexBufferLoader);

  return indexBufferLoader;
}

function loadBufferView(loader, gltf, bufferViewId) {
  const bufferViewLoader = ResourceCache.loadBufferView({
    gltf: gltf,
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
    return arrayFill(values, 0);
  }

  const MathType = AttributeType.getMathType(accessorType);
  return arrayFill(values, MathType.clone(MathType.ZERO));
}

function loadAccessorValues(accessor, packedTypedArray, values, useQuaternion) {
  const accessorType = accessor.type;
  const accessorCount = accessor.count;

  if (accessorType === AttributeType.SCALAR) {
    for (let i = 0; i < accessorCount; i++) {
      values[i] = packedTypedArray[i];
    }
  } else if (accessorType === AttributeType.VEC4 && useQuaternion) {
    for (let i = 0; i < accessorCount; i++) {
      values[i] = Quaternion.unpack(packedTypedArray, i * 4);
    }
  } else {
    const MathType = AttributeType.getMathType(accessorType);
    const numberOfComponents = AttributeType.getNumberOfComponents(
      accessorType
    );

    for (let i = 0; i < accessorCount; i++) {
      values[i] = MathType.unpack(packedTypedArray, i * numberOfComponents);
    }
  }

  return values;
}

function loadAccessor(loader, gltf, accessorId, useQuaternion) {
  const accessor = gltf.accessors[accessorId];
  const accessorCount = accessor.count;
  const values = new Array(accessorCount);

  const bufferViewId = accessor.bufferView;
  if (defined(bufferViewId)) {
    const bufferViewLoader = loadBufferView(loader, gltf, bufferViewId);
    bufferViewLoader.promise
      .then(function (bufferViewLoader) {
        if (loader.isDestroyed()) {
          return;
        }
        const bufferViewTypedArray = bufferViewLoader.typedArray;
        const packedTypedArray = getPackedTypedArray(
          gltf,
          accessor,
          bufferViewTypedArray
        );

        useQuaternion = defaultValue(useQuaternion, false);
        loadAccessorValues(accessor, packedTypedArray, values, useQuaternion);
      })
      .catch(function () {
        loadDefaultAccessorValues(accessor, values);
      });

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

function createAttribute(gltf, accessorId, name, semantic, setIndex) {
  const accessor = gltf.accessors[accessorId];
  const MathType = AttributeType.getMathType(accessor.type);

  const attribute = new Attribute();
  attribute.name = name;
  attribute.semantic = semantic;
  attribute.setIndex = setIndex;
  attribute.constant = getDefault(MathType);
  attribute.componentDatatype = accessor.componentType;
  attribute.normalized = defaultValue(accessor.normalized, false);
  attribute.count = accessor.count;
  attribute.type = accessor.type;
  attribute.min = fromArray(MathType, accessor.min);
  attribute.max = fromArray(MathType, accessor.max);
  attribute.byteOffset = accessor.byteOffset;
  attribute.byteStride = getAccessorByteStride(gltf, accessor);

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

function loadAttribute(
  loader,
  gltf,
  accessorId,
  semanticType,
  gltfSemantic,
  draco,
  dequantize,
  loadAsTypedArray,
  loadAsTypedArrayPacked
) {
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  // For .b3dm, rename _BATCHID (or the legacy BATCHID) to _FEATURE_ID_0
  // in the generated model components for compatibility with EXT_mesh_features
  let renamedSemantic = gltfSemantic;
  if (
    loader._renameBatchIdSemantic &&
    (gltfSemantic === "_BATCHID" || gltfSemantic === "BATCHID")
  ) {
    renamedSemantic = "_FEATURE_ID_0";
  }

  const name = gltfSemantic;
  const modelSemantic = semanticType.fromGltfSemantic(renamedSemantic);
  const setIndex = defined(modelSemantic)
    ? getSetIndex(renamedSemantic)
    : undefined;
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

  const vertexBufferLoader = loadVertexBuffer(
    loader,
    gltf,
    accessorId,
    gltfSemantic,
    draco,
    dequantize,
    loadAsTypedArray
  );
  vertexBufferLoader.promise.then(function (vertexBufferLoader) {
    if (loader.isDestroyed()) {
      return;
    }

    if (loadAsTypedArrayPacked) {
      // The accessor's byteOffset and byteStride should be ignored since values
      // are tightly packed in a typed array
      const bufferViewTypedArray = vertexBufferLoader.typedArray;
      attribute.packedTypedArray = getPackedTypedArray(
        gltf,
        accessor,
        bufferViewTypedArray
      );
      attribute.byteOffset = 0;
      attribute.byteStride = undefined;
    } else if (loadAsTypedArray) {
      attribute.typedArray = vertexBufferLoader.typedArray;
    } else {
      attribute.buffer = vertexBufferLoader.buffer;
    }

    attribute.count = accessor.count;

    if (
      defined(draco) &&
      defined(draco.attributes) &&
      defined(draco.attributes[gltfSemantic])
    ) {
      // The accessor's byteOffset and byteStride should be ignored for draco.
      // Each attribute is tightly packed in its own buffer after decode.
      attribute.byteOffset = 0;
      attribute.byteStride = undefined;
      attribute.quantization = vertexBufferLoader.quantization;
    }
  });

  return attribute;
}

function loadVertexAttribute(loader, gltf, accessorId, gltfSemantic, draco) {
  return loadAttribute(
    loader,
    gltf,
    accessorId,
    VertexAttributeSemantic,
    gltfSemantic,
    draco,
    false,
    loader._loadAsTypedArray,
    false
  );
}

function loadInstancedAttribute(
  loader,
  gltf,
  accessorId,
  gltfSemantic,
  loadAsTypedArrayPacked
) {
  // Don't pass in draco object since instanced attributes can't be draco compressed
  return loadAttribute(
    loader,
    gltf,
    accessorId,
    InstanceAttributeSemantic,
    gltfSemantic,
    undefined,
    true,
    loadAsTypedArrayPacked,
    loadAsTypedArrayPacked
  );
}

function loadIndices(loader, gltf, accessorId, draco) {
  const accessor = gltf.accessors[accessorId];
  const bufferViewId = accessor.bufferView;

  if (!defined(draco) && !defined(bufferViewId)) {
    return undefined;
  }

  const indices = new Indices();
  indices.count = accessor.count;

  const loadAsTypedArray = loader._loadAsTypedArray;

  const indexBufferLoader = loadIndexBuffer(
    loader,
    gltf,
    accessorId,
    draco,
    loadAsTypedArray
  );

  indexBufferLoader.promise.then(function (indexBufferLoader) {
    if (loader.isDestroyed()) {
      return;
    }

    indices.indexDatatype = indexBufferLoader.indexDatatype;

    if (defined(indexBufferLoader.buffer)) {
      indices.buffer = indexBufferLoader.buffer;
    } else {
      indices.typedArray = indexBufferLoader.typedArray;
    }
  });

  return indices;
}

function loadTexture(
  loader,
  gltf,
  textureInfo,
  supportedImageFormats,
  samplerOverride
) {
  const imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureInfo.index,
    supportedImageFormats: supportedImageFormats,
  });

  if (!defined(imageId)) {
    return undefined;
  }

  const textureLoader = ResourceCache.loadTexture({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: supportedImageFormats,
    asynchronous: loader._asynchronous,
  });

  loader._textureLoaders.push(textureLoader);

  const textureReader = GltfLoaderUtil.createModelTextureReader({
    textureInfo: textureInfo,
  });

  textureLoader.promise.then(function (textureLoader) {
    if (loader.isDestroyed()) {
      return;
    }
    textureReader.texture = textureLoader.texture;
    if (defined(samplerOverride)) {
      textureReader.texture.sampler = samplerOverride;
    }
  });

  return textureReader;
}

function loadMaterial(loader, gltf, gltfMaterial, supportedImageFormats) {
  const material = new Material();

  const extensions = defaultValue(
    gltfMaterial.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const pbrSpecularGlossiness = extensions.KHR_materials_pbrSpecularGlossiness;
  const pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;

  material.unlit = defined(extensions.KHR_materials_unlit);

  if (defined(pbrSpecularGlossiness)) {
    const specularGlossiness = new SpecularGlossiness();
    material.specularGlossiness = specularGlossiness;

    if (defined(pbrSpecularGlossiness.diffuseTexture)) {
      specularGlossiness.diffuseTexture = loadTexture(
        loader,
        gltf,
        pbrSpecularGlossiness.diffuseTexture,
        supportedImageFormats
      );
    }
    if (defined(pbrSpecularGlossiness.specularGlossinessTexture)) {
      if (defined(pbrSpecularGlossiness.specularGlossinessTexture)) {
        specularGlossiness.specularGlossinessTexture = loadTexture(
          loader,
          gltf,
          pbrSpecularGlossiness.specularGlossinessTexture,
          supportedImageFormats
        );
      }
    }
    specularGlossiness.diffuseFactor = fromArray(
      Cartesian4,
      pbrSpecularGlossiness.diffuseFactor
    );
    specularGlossiness.specularFactor = fromArray(
      Cartesian3,
      pbrSpecularGlossiness.specularFactor
    );
    specularGlossiness.glossinessFactor =
      pbrSpecularGlossiness.glossinessFactor;
    material.pbrSpecularGlossiness = pbrSpecularGlossiness;
  } else if (defined(pbrMetallicRoughness)) {
    const metallicRoughness = new MetallicRoughness();
    material.metallicRoughness = metallicRoughness;

    if (defined(pbrMetallicRoughness.baseColorTexture)) {
      metallicRoughness.baseColorTexture = loadTexture(
        loader,
        gltf,
        pbrMetallicRoughness.baseColorTexture,
        supportedImageFormats
      );
    }
    if (defined(pbrMetallicRoughness.metallicRoughnessTexture)) {
      metallicRoughness.metallicRoughnessTexture = loadTexture(
        loader,
        gltf,
        pbrMetallicRoughness.metallicRoughnessTexture,
        supportedImageFormats
      );
    }
    metallicRoughness.baseColorFactor = fromArray(
      Cartesian4,
      pbrMetallicRoughness.baseColorFactor
    );
    metallicRoughness.metallicFactor = pbrMetallicRoughness.metallicFactor;
    metallicRoughness.roughnessFactor = pbrMetallicRoughness.roughnessFactor;
    material.pbrMetallicRoughness = pbrMetallicRoughness;
  }

  // Top level textures
  if (defined(gltfMaterial.emissiveTexture)) {
    material.emissiveTexture = loadTexture(
      loader,
      gltf,
      gltfMaterial.emissiveTexture,
      supportedImageFormats
    );
  }
  if (defined(gltfMaterial.normalTexture)) {
    material.normalTexture = loadTexture(
      loader,
      gltf,
      gltfMaterial.normalTexture,
      supportedImageFormats
    );
  }
  if (defined(gltfMaterial.occlusionTexture)) {
    material.occlusionTexture = loadTexture(
      loader,
      gltf,
      gltfMaterial.occlusionTexture,
      supportedImageFormats
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
  gltf,
  gltfFeatureIdTexture,
  supportedImageFormats,
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
    gltf,
    textureInfo,
    supportedImageFormats,
    Sampler.NEAREST // Feature ID textures require nearest sampling
  );

  // Though the new channel index is more future-proof, this implementation
  // only supports RGBA textures. At least for now, the string representation
  // is more useful for generating shader code.
  const channelString = textureInfo.channels
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
  gltf,
  gltfFeatureIdTexture,
  featureTableId,
  supportedImageFormats,
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
    gltf,
    textureInfo,
    supportedImageFormats,
    Sampler.NEAREST // Feature ID textures require nearest sampling
  );

  featureIdTexture.textureReader.channels = featureIds.channels;
  featureIdTexture.positionalLabel = positionalLabel;

  return featureIdTexture;
}

function loadMorphTarget(loader, gltf, target) {
  const morphTarget = new MorphTarget();

  for (const semantic in target) {
    if (target.hasOwnProperty(semantic)) {
      const accessorId = target[semantic];
      morphTarget.attributes.push(
        // Don't pass in draco object since morph targets can't be draco compressed
        loadVertexAttribute(loader, gltf, accessorId, semantic, undefined)
      );
    }
  }

  return morphTarget;
}

function loadPrimitive(loader, gltf, gltfPrimitive, supportedImageFormats) {
  const primitive = new Primitive();

  const materialId = gltfPrimitive.material;
  if (defined(materialId)) {
    primitive.material = loadMaterial(
      loader,
      gltf,
      gltf.materials[materialId],
      supportedImageFormats
    );
  }

  const extensions = defaultValue(
    gltfPrimitive.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const draco = extensions.KHR_draco_mesh_compression;

  const attributes = gltfPrimitive.attributes;
  if (defined(attributes)) {
    for (const semantic in attributes) {
      if (attributes.hasOwnProperty(semantic)) {
        const accessorId = attributes[semantic];
        primitive.attributes.push(
          loadVertexAttribute(loader, gltf, accessorId, semantic, draco)
        );
      }
    }
  }

  const targets = gltfPrimitive.targets;
  if (defined(targets)) {
    const targetsLength = targets.length;
    for (let i = 0; i < targetsLength; ++i) {
      primitive.morphTargets.push(loadMorphTarget(loader, gltf, targets[i]));
    }
  }

  const indices = gltfPrimitive.indices;
  if (defined(indices)) {
    primitive.indices = loadIndices(loader, gltf, indices, draco);
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
    loadPrimitiveFeatures(
      loader,
      gltf,
      primitive,
      meshFeatures,
      supportedImageFormats
    );
  } else if (hasFeatureMetadataLegacy) {
    loadPrimitiveFeaturesLegacy(
      loader,
      gltf,
      primitive,
      featureMetadataLegacy,
      supportedImageFormats
    );
  }

  // Load structural metadata
  if (defined(structuralMetadata)) {
    loadPrimitiveMetadata(primitive, structuralMetadata);
  } else if (hasFeatureMetadataLegacy) {
    loadPrimitiveMetadataLegacy(loader, primitive, featureMetadataLegacy);
  }

  primitive.primitiveType = gltfPrimitive.mode;

  return primitive;
}

// For EXT_mesh_features
function loadPrimitiveFeatures(
  loader,
  gltf,
  primitive,
  meshFeaturesExtension,
  supportedImageFormats
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
        gltf,
        featureIds,
        supportedImageFormats,
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
  gltf,
  primitive,
  metadataExtension,
  supportedImageFormats
) {
  // For looking up the featureCount for each set of feature IDs
  const featureTables = gltf.extensions.EXT_feature_metadata.featureTables;

  let nextFeatureIdIndex = 0;

  // Feature ID Attributes
  const featureIdAttributes = metadataExtension.featureIdAttributes;
  if (defined(featureIdAttributes)) {
    const featureIdAttributesLength = featureIdAttributes.length;
    for (let i = 0; i < featureIdAttributesLength; ++i) {
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
    const featureIdTexturesLength = featureIdTextures.length;
    for (let i = 0; i < featureIdTexturesLength; ++i) {
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
        gltf,
        featureIdTexture,
        propertyTableId,
        supportedImageFormats,
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

function loadInstances(loader, gltf, nodeExtensions, frameState) {
  const instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;

  const instances = new Instances();
  const attributes = instancingExtension.attributes;
  if (defined(attributes)) {
    const hasRotation = defined(attributes.ROTATION);
    const hasTranslationMinMax =
      defined(attributes.TRANSLATION) &&
      defined(gltf.accessors[attributes.TRANSLATION].min) &&
      defined(gltf.accessors[attributes.TRANSLATION].max);
    for (const semantic in attributes) {
      if (attributes.hasOwnProperty(semantic)) {
        // If the instances have rotations load the attributes as typed arrays
        // so that instance matrices are computed on the CPU. This avoids the
        // expensive quaternion -> rotation matrix conversion in the shader.
        // If the translation accessor does not have a min and max, load the
        // attributes as typed arrays, so the values can be used for computing
        // an accurate bounding volume. Feature ID attributes are also loaded as
        // typed arrays because we want to be able to add the instance's feature ID to
        // the pick object. Load as typed arrays if GPU instancing is not supported.
        const loadAsTypedArrayPacked =
          loader._loadAsTypedArray ||
          !frameState.context.instancedArrays ||
          ((hasRotation || !hasTranslationMinMax) &&
            (semantic === InstanceAttributeSemantic.TRANSLATION ||
              semantic === InstanceAttributeSemantic.ROTATION ||
              semantic === InstanceAttributeSemantic.SCALE)) ||
          semantic.indexOf(InstanceAttributeSemantic.FEATURE_ID) >= 0;

        const accessorId = attributes[semantic];
        instances.attributes.push(
          loadInstancedAttribute(
            loader,
            gltf,
            accessorId,
            semantic,
            loadAsTypedArrayPacked
          )
        );
      }
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
      gltf,
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
    const featureIdAttributesLength = featureIdAttributes.length;
    for (let i = 0; i < featureIdAttributesLength; ++i) {
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

function loadNode(loader, gltf, gltfNode, supportedImageFormats, frameState) {
  const node = new Node();

  node.name = gltfNode.name;

  node.matrix = fromArray(Matrix4, gltfNode.matrix);
  node.translation = fromArray(Cartesian3, gltfNode.translation);
  node.rotation = fromArray(Quaternion, gltfNode.rotation);
  node.scale = fromArray(Cartesian3, gltfNode.scale);

  const meshId = gltfNode.mesh;
  if (defined(meshId)) {
    const mesh = gltf.meshes[meshId];
    const primitives = mesh.primitives;
    const primitivesLength = primitives.length;
    for (let i = 0; i < primitivesLength; ++i) {
      node.primitives.push(
        loadPrimitive(loader, gltf, primitives[i], supportedImageFormats)
      );
    }

    // If the node has no weights array, it will look for the weights array provided
    // by the mesh. If both are undefined, it will default to an array of zero weights.
    const morphWeights = defaultValue(gltfNode.weights, mesh.weights);
    const targets = node.primitives[0].morphTargets;
    const targetsLength = targets.length;

    // Since meshes are not stored as separate components, the mesh weights will still
    // be stored at the node level.
    node.morphWeights = defined(morphWeights)
      ? morphWeights.slice()
      : arrayFill(new Array(targetsLength), 0.0);
  }

  const nodeExtensions = defaultValue(
    gltfNode.extensions,
    defaultValue.EMPTY_OBJECT
  );
  const instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;

  if (defined(instancingExtension)) {
    node.instances = loadInstances(loader, gltf, nodeExtensions, frameState);
  }

  return node;
}

function loadNodes(loader, gltf, supportedImageFormats, frameState) {
  let i;
  let j;

  const nodesLength = gltf.nodes.length;
  const nodes = new Array(nodesLength);
  for (i = 0; i < nodesLength; ++i) {
    const node = loadNode(
      loader,
      gltf,
      gltf.nodes[i],
      supportedImageFormats,
      frameState
    );
    node.index = i;
    nodes[i] = node;
  }

  for (i = 0; i < nodesLength; ++i) {
    const childrenNodeIds = gltf.nodes[i].children;
    if (defined(childrenNodeIds)) {
      const childrenLength = childrenNodeIds.length;
      for (j = 0; j < childrenLength; ++j) {
        nodes[i].children.push(nodes[childrenNodeIds[j]]);
      }
    }
  }

  return nodes;
}

function loadSkin(loader, gltf, gltfSkin, nodes) {
  const skin = new Skin();

  const jointIds = gltfSkin.joints;
  const jointsLength = jointIds.length;
  const joints = new Array(jointsLength);
  for (let i = 0; i < jointsLength; ++i) {
    joints[i] = nodes[jointIds[i]];
  }
  skin.joints = joints;

  const inverseBindMatricesAccessorId = gltfSkin.inverseBindMatrices;
  if (defined(inverseBindMatricesAccessorId)) {
    skin.inverseBindMatrices = loadAccessor(
      loader,
      gltf,
      inverseBindMatricesAccessorId
    );
  } else {
    skin.inverseBindMatrices = arrayFill(
      new Array(jointsLength),
      Matrix4.IDENTITY
    );
  }

  return skin;
}

function loadSkins(loader, gltf, nodes) {
  let i;

  const gltfSkins = gltf.skins;
  if (!defined(gltfSkins)) {
    return [];
  }

  const skinsLength = gltf.skins.length;
  const skins = new Array(skinsLength);
  for (i = 0; i < skinsLength; ++i) {
    const skin = loadSkin(loader, gltf, gltf.skins[i], nodes);
    skin.index = i;
    skins[i] = skin;
  }

  const nodesLength = nodes.length;
  for (i = 0; i < nodesLength; ++i) {
    const skinId = gltf.nodes[i].skin;
    if (defined(skinId)) {
      nodes[i].skin = skins[skinId];
    }
  }

  return skins;
}

function loadStructuralMetadata(
  loader,
  gltf,
  extension,
  extensionLegacy,
  supportedImageFormats
) {
  const structuralMetadataLoader = new GltfStructuralMetadataLoader({
    gltf: gltf,
    extension: extension,
    extensionLegacy: extensionLegacy,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: supportedImageFormats,
    asynchronous: loader._asynchronous,
  });
  structuralMetadataLoader.load();

  loader._structuralMetadataLoader = structuralMetadataLoader;

  return structuralMetadataLoader;
}

function loadAnimationSampler(loader, gltf, gltfSampler) {
  const animationSampler = new AnimationSampler();

  const inputAccessorId = gltfSampler.input;
  animationSampler.input = loadAccessor(loader, gltf, inputAccessorId);

  const gltfInterpolation = gltfSampler.interpolation;
  animationSampler.interpolation = defaultValue(
    InterpolationType[gltfInterpolation],
    InterpolationType.LINEAR
  );

  const outputAccessorId = gltfSampler.output;
  animationSampler.output = loadAccessor(loader, gltf, outputAccessorId, true);

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

function loadAnimation(loader, gltf, gltfAnimation, nodes) {
  let i;

  const animation = new Animation();
  animation.name = gltfAnimation.name;

  const gltfSamplers = gltfAnimation.samplers;
  const samplersLength = gltfSamplers.length;

  const samplers = new Array(samplersLength);
  for (i = 0; i < samplersLength; i++) {
    const sampler = loadAnimationSampler(loader, gltf, gltfSamplers[i]);
    sampler.index = i;
    samplers[i] = sampler;
  }

  const gltfChannels = gltfAnimation.channels;
  const channelsLength = gltfChannels.length;

  const channels = new Array(channelsLength);
  for (i = 0; i < channelsLength; i++) {
    channels[i] = loadAnimationChannel(gltfChannels[i], samplers, nodes);
  }

  animation.samplers = samplers;
  animation.channels = channels;

  return animation;
}

function loadAnimations(loader, gltf, nodes) {
  let i;

  const gltfAnimations = gltf.animations;
  if (!defined(gltfAnimations)) {
    return [];
  }

  const animationsLength = gltf.animations.length;
  const animations = new Array(animationsLength);
  for (i = 0; i < animationsLength; ++i) {
    const animation = loadAnimation(loader, gltf, gltf.animations[i], nodes);
    animation.index = i;
    animations[i] = animation;
  }

  return animations;
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

function parse(loader, gltf, supportedImageFormats, frameState) {
  const extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  const structuralMetadataExtension = extensions.EXT_structural_metadata;
  const featureMetadataExtensionLegacy = extensions.EXT_feature_metadata;

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

  const nodes = loadNodes(loader, gltf, supportedImageFormats, frameState);
  const skins = loadSkins(loader, gltf, nodes);
  const animations = loadAnimations(loader, gltf, nodes);
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
  components.upAxis = loader._upAxis;
  components.forwardAxis = loader._forwardAxis;

  loader._components = components;

  // Load structural metadata (property tables and property textures)
  if (
    defined(structuralMetadataExtension) ||
    defined(featureMetadataExtensionLegacy)
  ) {
    const structuralMetadataLoader = loadStructuralMetadata(
      loader,
      gltf,
      structuralMetadataExtension,
      featureMetadataExtensionLegacy,
      supportedImageFormats
    );
    structuralMetadataLoader.promise.then(function (structuralMetadataLoader) {
      if (loader.isDestroyed()) {
        return;
      }
      components.structuralMetadata =
        structuralMetadataLoader.structuralMetadata;
    });
  }

  // Gather promises and reject if any promises fail.
  const loaders = [];
  loaders.push.apply(loaders, loader._bufferViewLoaders);
  loaders.push.apply(loaders, loader._geometryLoaders);

  if (defined(loader._structuralMetadataLoader)) {
    loaders.push(loader._structuralMetadataLoader);
  }

  if (!loader._incrementallyLoadTextures) {
    loaders.push.apply(loaders, loader._textureLoaders);
  }

  const readyPromises = loaders.map(function (loader) {
    return loader.promise;
  });

  // Separate promise will resolve once textures are loaded.
  const texturePromises = loader._textureLoaders.map(function (loader) {
    return loader.promise;
  });

  Promise.all(readyPromises)
    .then(function () {
      if (loader.isDestroyed()) {
        return;
      }
      loader._state = GltfLoaderState.PROCESSED;
    })
    .catch(function (error) {
      if (loader.isDestroyed()) {
        return;
      }
      handleError(loader, error);
    });

  Promise.all(texturePromises).then(function () {
    if (loader.isDestroyed()) {
      return;
    }
    loader._textureState = GltfLoaderState.PROCESSED;
  });
}

function unloadTextures(loader) {
  const textureLoaders = loader._textureLoaders;
  const textureLoadersLength = textureLoaders.length;
  for (let i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  loader._textureLoaders.length = 0;
}

function unloadBufferViews(loader) {
  const bufferViewLoaders = loader._bufferViewLoaders;
  const bufferViewLoadersLength = bufferViewLoaders.length;
  for (let i = 0; i < bufferViewLoadersLength; ++i) {
    ResourceCache.unload(bufferViewLoaders[i]);
  }
  loader._bufferViewLoaders.length = 0;
}

function unloadGeometry(loader) {
  const geometryLoaders = loader._geometryLoaders;
  const geometryLoadersLength = geometryLoaders.length;
  for (let i = 0; i < geometryLoadersLength; ++i) {
    ResourceCache.unload(geometryLoaders[i]);
  }
  loader._geometryLoaders.length = 0;
}

function unloadStructuralMetadata(loader) {
  if (defined(loader._structuralMetadataLoader)) {
    loader._structuralMetadataLoader.destroy();
    loader._structuralMetadataLoader = undefined;
  }
}

/**
 * Unloads the resource.
 * @private
 */
GltfLoader.prototype.unload = function () {
  if (defined(this._gltfJsonLoader)) {
    ResourceCache.unload(this._gltfJsonLoader);
  }
  this._gltfJsonLoader = undefined;

  unloadTextures(this);
  unloadBufferViews(this);
  unloadGeometry(this);
  unloadStructuralMetadata(this);

  this._components = undefined;
};
