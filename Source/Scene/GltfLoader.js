import arrayFill from "../Core/arrayFill.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import Matrix4 from "../Core/Matrix4.js";
import Quaternion from "../Core/Quaternion.js";
import Sampler from "../Renderer/Sampler.js";
import getAccessorByteStride from "./GltfPipeline/getAccessorByteStride.js";
import getComponentReader from "./GltfPipeline/getComponentReader.js";
import numberOfComponentsForType from "./GltfPipeline/numberOfComponentsForType.js";
import when from "../ThirdParty/when.js";
import AttributeType from "./AttributeType.js";
import Axis from "./Axis.js";
import GltfFeatureMetadataLoader from "./GltfFeatureMetadataLoader.js";
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
  // are now stored as arrays like the newer EXT_mesh_features extension.
  // This requires sorting the dictionary keys for a consistent ordering.
  this._sortedPropertyTableIds = undefined;
  this._sortedFeatureTextureIds = undefined;

  this._gltfJsonLoader = undefined;
  this._state = GltfLoaderState.UNLOADED;
  this._textureState = GltfLoaderState.UNLOADED;
  this._promise = when.defer();
  this._texturesLoadedPromise = when.defer();

  // Loaders that need to be processed before the glTF becomes ready
  this._textureLoaders = [];
  this._bufferViewLoaders = [];
  this._geometryLoaders = [];
  this._featureMetadataLoader = undefined;

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
   * @type {Promise}
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
    .otherwise(function (error) {
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

  if (defined(loader._featureMetadataLoader)) {
    loader._featureMetadataLoader.process(frameState);
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

    if (loadAsTypedArray) {
      indices.typedArray = indexBufferLoader.typedArray;
    } else {
      indices.buffer = indexBufferLoader.buffer;
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
function loadFeatureIdAttribute(featureIds, propertyTableId) {
  const featureIdAttribute = new FeatureIdAttribute();
  featureIdAttribute.featureCount = featureIds.featureCount;
  featureIdAttribute.nullFeatureId = featureIds.nullFeatureId;
  featureIdAttribute.propertyTableId = propertyTableId;
  featureIdAttribute.setIndex = featureIds.attribute;
  return featureIdAttribute;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdAttributeLegacy(
  gltfFeatureIdAttribute,
  featureTableId,
  featureCount
) {
  const featureIdAttribute = new FeatureIdAttribute();
  const featureIds = gltfFeatureIdAttribute.featureIds;
  featureIdAttribute.featureCount = featureCount;
  featureIdAttribute.propertyTableId = featureTableId;
  featureIdAttribute.setIndex = getSetIndex(featureIds.attribute);
  return featureIdAttribute;
}

// for EXT_mesh_features
function loadFeatureIdImplicitRange(featureIds, propertyTableId) {
  const featureIdAttribute = new FeatureIdImplicitRange();
  featureIdAttribute.propertyTableId = propertyTableId;
  featureIdAttribute.featureCount = featureIds.featureCount;
  featureIdAttribute.nullFeatureId = featureIds.nullFeatureId;
  featureIdAttribute.offset = defaultValue(featureIds.offset, 0);
  featureIdAttribute.repeat = featureIds.repeat;
  return featureIdAttribute;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdImplicitRangeLegacy(
  gltfFeatureIdAttribute,
  featureTableId,
  featureCount
) {
  const featureIdAttribute = new FeatureIdImplicitRange();
  const featureIds = gltfFeatureIdAttribute.featureIds;
  featureIdAttribute.propertyTableId = featureTableId;
  featureIdAttribute.featureCount = featureCount;

  // constant/divisor was renamed to offset/repeat
  featureIdAttribute.offset = defaultValue(featureIds.constant, 0);
  // The default is now undefined
  const divisor = defaultValue(featureIds.divisor, 0);
  featureIdAttribute.repeat = divisor === 0 ? undefined : divisor;
  return featureIdAttribute;
}

// for EXT_mesh_features
function loadFeatureIdTexture(
  loader,
  gltf,
  gltfFeatureIdTexture,
  propertyTableId,
  supportedImageFormats
) {
  const featureIdTexture = new FeatureIdTexture();

  featureIdTexture.featureCount = gltfFeatureIdTexture.featureCount;
  featureIdTexture.nullFeatureId = gltfFeatureIdTexture.nullFeatureId;
  featureIdTexture.propertyTableId = propertyTableId;

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
  featureCount
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

function loadPrimitive(
  loader,
  gltf,
  gltfPrimitive,
  morphWeights,
  supportedImageFormats
) {
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
    primitive.morphWeights = defined(morphWeights)
      ? morphWeights.slice()
      : arrayFill(new Array(targetsLength), 0.0);
  }

  const indices = gltfPrimitive.indices;
  if (defined(indices)) {
    primitive.indices = loadIndices(loader, gltf, indices, draco);
  }

  const featureMetadata = extensions.EXT_mesh_features;
  const featureMetadataLegacy = extensions.EXT_feature_metadata;

  if (defined(featureMetadata)) {
    loadPrimitiveMetadata(
      loader,
      gltf,
      primitive,
      featureMetadata,
      supportedImageFormats
    );
  } else if (defined(featureMetadataLegacy)) {
    loadPrimitiveMetadataLegacy(
      loader,
      gltf,
      primitive,
      featureMetadataLegacy,
      supportedImageFormats
    );
  }

  primitive.primitiveType = gltfPrimitive.mode;

  return primitive;
}

function loadPrimitiveMetadata(
  loader,
  gltf,
  primitive,
  metadataExtension,
  supportedImageFormats
) {
  const featureIdsArray = defined(metadataExtension.featureIds)
    ? metadataExtension.featureIds
    : [];
  const propertyTables = defined(metadataExtension.propertyTables)
    ? metadataExtension.propertyTables
    : [];

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    // This may be undefined, as feature IDs are not required to have
    // associated metadata.
    const propertyTableId = propertyTables[i];

    let featureIdComponent;
    if (defined(featureIds.texture)) {
      featureIdComponent = loadFeatureIdTexture(
        loader,
        gltf,
        featureIds,
        propertyTableId,
        supportedImageFormats
      );
    } else if (defined(featureIds.attribute)) {
      featureIdComponent = loadFeatureIdAttribute(featureIds, propertyTableId);
    } else {
      featureIdComponent = loadFeatureIdImplicitRange(
        featureIds,
        propertyTableId
      );
    }

    primitive.featureIds.push(featureIdComponent);
  }

  // Property Textures
  if (defined(metadataExtension.propertyTextures)) {
    primitive.propertyTextureIds = metadataExtension.propertyTextures;
  }
}

function loadPrimitiveMetadataLegacy(
  loader,
  gltf,
  primitive,
  metadataExtension,
  supportedImageFormats
) {
  // For looking up the featureCount for each set of feature IDs
  const featureTables = gltf.extensions.EXT_feature_metadata.featureTables;

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

      let featureIdComponent;
      if (defined(featureIdAttribute.featureIds.attribute)) {
        featureIdComponent = loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount
        );
      } else {
        featureIdComponent = loadFeatureIdImplicitRangeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount
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
      const featureIdComponent = loadFeatureIdTextureLegacy(
        loader,
        gltf,
        featureIdTexture,
        propertyTableId,
        supportedImageFormats,
        featureCount
      );
      // Feature ID textures are added after feature ID attributes in the list
      primitive.featureIds.push(featureIdComponent);
    }
  }

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
  const featureMetadata = nodeExtensions.EXT_mesh_features;
  const featureMetadataLegacy = instancingExtExtensions.EXT_feature_metadata;

  if (defined(featureMetadata)) {
    loadInstanceMetadata(instances, featureMetadata);
  } else if (defined(featureMetadataLegacy)) {
    loadInstanceMetadataLegacy(
      gltf,
      instances,
      featureMetadataLegacy,
      loader._sortedPropertyTableIds
    );
  }

  return instances;
}

// For EXT_mesh_features
function loadInstanceMetadata(instances, metadataExtension) {
  // feature IDs are required in EXT_mesh_features
  const featureIdsArray = metadataExtension.featureIds;
  const propertyTables = defined(metadataExtension.propertyTables)
    ? metadataExtension.propertyTables
    : [];

  for (let i = 0; i < featureIdsArray.length; i++) {
    const featureIds = featureIdsArray[i];
    const propertyTableId = propertyTables[i];

    let featureIdComponent;
    if (defined(featureIds.attribute)) {
      featureIdComponent = loadFeatureIdAttribute(featureIds, propertyTableId);
    } else {
      featureIdComponent = loadFeatureIdImplicitRange(
        featureIds,
        propertyTableId
      );
    }
    instances.featureIds.push(featureIdComponent);
  }
}

// For backwards-compatibility with EXT_feature_metadata
function loadInstanceMetadataLegacy(
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

      let featureIdComponent;
      if (defined(featureIdAttribute.featureIds.attribute)) {
        featureIdComponent = loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount
        );
      } else {
        featureIdComponent = loadFeatureIdImplicitRangeLegacy(
          featureIdAttribute,
          propertyTableId,
          featureCount
        );
      }
      instances.featureIds.push(featureIdComponent);
    }
  }
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
    const accessor = gltf.accessors[inverseBindMatricesAccessorId];
    const bufferViewId = accessor.bufferView;
    if (defined(bufferViewId)) {
      const bufferViewLoader = loadBufferView(loader, gltf, bufferViewId);
      bufferViewLoader.promise.then(function (bufferViewLoader) {
        if (loader.isDestroyed()) {
          return;
        }
        const bufferViewTypedArray = bufferViewLoader.typedArray;
        const packedTypedArray = getPackedTypedArray(
          gltf,
          accessor,
          bufferViewTypedArray
        );
        const inverseBindMatrices = new Array(jointsLength);
        for (let i = 0; i < jointsLength; ++i) {
          inverseBindMatrices[i] = Matrix4.unpack(packedTypedArray, i * 16);
        }
        skin.inverseBindMatrices = inverseBindMatrices;
      });
    }
  } else {
    skin.inverseBindMatrices = arrayFill(
      new Array(jointsLength),
      Matrix4.IDENTITY
    );
  }

  return skin;
}

function loadNode(loader, gltf, gltfNode, supportedImageFormats, frameState) {
  const node = new Node();

  node.matrix = fromArray(Matrix4, gltfNode.matrix);
  node.translation = fromArray(Cartesian3, gltfNode.translation);
  node.rotation = fromArray(Quaternion, gltfNode.rotation);
  node.scale = fromArray(Cartesian3, gltfNode.scale);

  const meshId = gltfNode.mesh;
  if (defined(meshId)) {
    const mesh = gltf.meshes[meshId];
    const morphWeights = defaultValue(gltfNode.weights, mesh.weights);
    const primitives = mesh.primitives;
    const primitivesLength = primitives.length;
    for (let i = 0; i < primitivesLength; ++i) {
      node.primitives.push(
        loadPrimitive(
          loader,
          gltf,
          primitives[i],
          morphWeights,
          supportedImageFormats
        )
      );
    }
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
    nodes[i] = loadNode(
      loader,
      gltf,
      gltf.nodes[i],
      supportedImageFormats,
      frameState
    );
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

  for (i = 0; i < nodesLength; ++i) {
    const skinId = gltf.nodes[i].skin;
    if (defined(skinId)) {
      nodes[i].skin = loadSkin(loader, gltf, gltf.skins[skinId], nodes);
    }
  }

  return nodes;
}

function loadFeatureMetadata(
  loader,
  gltf,
  extension,
  extensionLegacy,
  supportedImageFormats
) {
  const featureMetadataLoader = new GltfFeatureMetadataLoader({
    gltf: gltf,
    extension: extension,
    extensionLegacy: extensionLegacy,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: supportedImageFormats,
    asynchronous: loader._asynchronous,
  });
  featureMetadataLoader.load();

  loader._featureMetadataLoader = featureMetadataLoader;

  return featureMetadataLoader;
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
  const featureMetadataExtension = extensions.EXT_mesh_features;
  const featureMetadataExtensionLegacy = extensions.EXT_feature_metadata;

  if (featureMetadataExtensionLegacy) {
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
  const scene = loadScene(gltf, nodes);

  const components = new Components();
  components.scene = scene;
  components.nodes = nodes;
  components.upAxis = loader._upAxis;
  components.forwardAxis = loader._forwardAxis;

  loader._components = components;

  // Load feature metadata (feature tables and feature textures)
  if (
    defined(featureMetadataExtension) ||
    defined(featureMetadataExtensionLegacy)
  ) {
    const featureMetadataLoader = loadFeatureMetadata(
      loader,
      gltf,
      featureMetadataExtension,
      featureMetadataExtensionLegacy,
      supportedImageFormats
    );
    featureMetadataLoader.promise.then(function (featureMetadataLoader) {
      if (loader.isDestroyed()) {
        return;
      }
      components.featureMetadata = featureMetadataLoader.featureMetadata;
    });
  }

  // Gather promises and reject if any promises fail.
  const loaders = [];
  loaders.push.apply(loaders, loader._bufferViewLoaders);
  loaders.push.apply(loaders, loader._geometryLoaders);

  if (defined(loader._featureMetadataLoader)) {
    loaders.push(loader._featureMetadataLoader);
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

  when
    .all(readyPromises)
    .then(function () {
      if (loader.isDestroyed()) {
        return;
      }
      loader._state = GltfLoaderState.PROCESSED;
    })
    .otherwise(function (error) {
      if (loader.isDestroyed()) {
        return;
      }
      handleError(loader, error);
    });

  when.all(texturePromises).then(function () {
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

function unloadFeatureMetadata(loader) {
  if (defined(loader._featureMetadataLoader)) {
    loader._featureMetadataLoader.destroy();
    loader._featureMetadataLoader = undefined;
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
  unloadFeatureMetadata(this);

  this._components = undefined;
};
