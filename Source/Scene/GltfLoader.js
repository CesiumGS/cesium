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

var Attribute = ModelComponents.Attribute;
var Indices = ModelComponents.Indices;
var FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
var FeatureIdTexture = ModelComponents.FeatureIdTexture;
var MorphTarget = ModelComponents.MorphTarget;
var Primitive = ModelComponents.Primitive;
var Instances = ModelComponents.Instances;
var Skin = ModelComponents.Skin;
var Node = ModelComponents.Node;
var Scene = ModelComponents.Scene;
var Components = ModelComponents.Components;
var MetallicRoughness = ModelComponents.MetallicRoughness;
var SpecularGlossiness = ModelComponents.SpecularGlossiness;
var Material = ModelComponents.Material;

var GltfLoaderState = {
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
 *
 * @private
 */
export default function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var gltfResource = options.gltfResource;
  var baseResource = options.baseResource;
  var typedArray = options.typedArray;
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  var upAxis = defaultValue(options.upAxis, Axis.Y);
  var forwardAxis = defaultValue(options.forwardAxis, Axis.Z);

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
  this._transform = Matrix4.IDENTITY;

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

  /**
   * A world-space transform to apply to the primitives.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Matrix4}
   * @default {@link Matrix4.IDENTITY}
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
GltfLoader.prototype.load = function () {
  var gltfJsonLoader = ResourceCache.loadGltfJson({
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    typedArray: this._typedArray,
    gltfJson: this._gltfJson,
  });

  this._gltfJsonLoader = gltfJsonLoader;
  this._state = GltfLoaderState.LOADING;
  this._textureState = GltfLoaderState.LOADING;

  var that = this;
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
  var errorMessage = "Failed to load glTF";
  error = gltfLoader.getError(errorMessage, error);
  gltfLoader._promise.reject(error);
  gltfLoader._texturesLoadedPromise.reject(error);
}

function process(loader, frameState) {
  var i;
  var textureLoaders = loader._textureLoaders;
  var textureLoadersLength = textureLoaders.length;
  for (i = 0; i < textureLoadersLength; ++i) {
    textureLoaders[i].process(frameState);
  }

  var bufferViewLoaders = loader._bufferViewLoaders;
  var bufferViewLoadersLength = bufferViewLoaders.length;
  for (i = 0; i < bufferViewLoadersLength; ++i) {
    bufferViewLoaders[i].process(frameState);
  }

  var geometryLoaders = loader._geometryLoaders;
  var geometryLoadersLength = geometryLoaders.length;
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

    var supportedImageFormats = new SupportedImageFormats({
      webp: FeatureDetection.supportsWebP(),
      basis: frameState.context.supportsBasis,
    });

    var gltf;
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
  dequantize
) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  var vertexBufferLoader = ResourceCache.loadVertexBuffer({
    gltf: gltf,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    bufferViewId: bufferViewId,
    draco: draco,
    attributeSemantic: semantic,
    accessorId: accessorId,
    asynchronous: loader._asynchronous,
    dequantize: dequantize,
  });

  loader._geometryLoaders.push(vertexBufferLoader);

  return vertexBufferLoader;
}

function loadIndexBuffer(loader, gltf, accessorId, draco) {
  var indexBufferLoader = ResourceCache.loadIndexBuffer({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    draco: draco,
    asynchronous: loader._asynchronous,
  });

  loader._geometryLoaders.push(indexBufferLoader);

  return indexBufferLoader;
}

function loadBufferView(loader, gltf, bufferViewId) {
  var bufferViewLoader = ResourceCache.loadBufferView({
    gltf: gltf,
    bufferViewId: bufferViewId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
  });

  loader._bufferViewLoaders.push(bufferViewLoader);

  return bufferViewLoader;
}

function getAccessorTypedArray(gltf, accessor, bufferViewTypedArray) {
  var byteOffset = accessor.byteOffset;
  var byteStride = getAccessorByteStride(gltf, accessor);
  var count = accessor.count;
  var componentCount = numberOfComponentsForType(accessor.type);
  var componentType = accessor.componentType;
  var componentByteLength = ComponentDatatype.getSizeInBytes(componentType);
  var defaultByteStride = componentByteLength * componentCount;
  var componentsLength = count * componentCount;

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

  var accessorTypedArray = ComponentDatatype.createTypedArray(
    componentType,
    componentsLength
  );

  var dataView = new DataView(bufferViewTypedArray.buffer);
  var components = new Array(componentCount);
  var componentReader = getComponentReader(accessor.componentType);
  byteOffset = bufferViewTypedArray.byteOffset + byteOffset;

  for (var i = 0; i < count; ++i) {
    componentReader(
      dataView,
      byteOffset,
      componentCount,
      componentByteLength,
      components
    );
    for (var j = 0; j < componentCount; ++j) {
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
  var accessor = gltf.accessors[accessorId];
  var MathType = AttributeType.getMathType(accessor.type);

  var attribute = new Attribute();
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
  var setIndexRegex = /^\w+_(\d+)$/;
  var setIndexMatch = setIndexRegex.exec(gltfSemantic);
  if (setIndexMatch !== null) {
    return parseInt(setIndexMatch[1]);
  }
  return undefined;
}

function loadVertexAttribute(loader, gltf, accessorId, gltfSemantic, draco) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  var name = gltfSemantic;
  var semantic = VertexAttributeSemantic.fromGltfSemantic(gltfSemantic);
  var setIndex = defined(semantic) ? getSetIndex(gltfSemantic) : undefined;

  var attribute = createAttribute(gltf, accessorId, name, semantic, setIndex);

  if (!defined(draco) && !defined(bufferViewId)) {
    return attribute;
  }

  var vertexBufferLoader = loadVertexBuffer(
    loader,
    gltf,
    accessorId,
    gltfSemantic,
    draco,
    false
  );
  vertexBufferLoader.promise.then(function (vertexBufferLoader) {
    if (loader.isDestroyed()) {
      return;
    }

    attribute.buffer = vertexBufferLoader.vertexBuffer;

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

function loadInstancedAttribute(
  loader,
  gltf,
  accessorId,
  gltfSemantic,
  loadAsTypedArray,
  frameState
) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  var name = gltfSemantic;
  var semantic = InstanceAttributeSemantic.fromGltfSemantic(gltfSemantic);
  var setIndex = defined(semantic) ? getSetIndex(gltfSemantic) : undefined;

  var attribute = createAttribute(gltf, accessorId, name, semantic, setIndex);

  if (!defined(bufferViewId)) {
    return attribute;
  }

  if (!loadAsTypedArray && frameState.context.instancedArrays) {
    // Only create a GPU buffer if the browser supports WebGL instancing
    // Don't pass in draco object since instanced attributes can't be draco compressed
    var vertexBufferLoader = loadVertexBuffer(
      loader,
      gltf,
      accessorId,
      gltfSemantic,
      undefined,
      true
    );
    vertexBufferLoader.promise.then(function (vertexBufferLoader) {
      if (loader.isDestroyed()) {
        return;
      }
      attribute.buffer = vertexBufferLoader.vertexBuffer;
    });
    return attribute;
  }

  var bufferViewLoader = loadBufferView(loader, gltf, bufferViewId);
  bufferViewLoader.promise.then(function (bufferViewLoader) {
    if (loader.isDestroyed()) {
      return;
    }
    var bufferViewTypedArray = bufferViewLoader.typedArray;
    var accessorTypedArray = getAccessorTypedArray(
      gltf,
      accessor,
      bufferViewTypedArray
    );
    attribute.typedArray = accessorTypedArray;

    // The accessor's byteOffset and byteStride should be ignored since values
    // are tightly packed in a typed array
    attribute.byteOffset = 0;
    attribute.byteStride = undefined;
  });

  return attribute;
}

function loadIndices(loader, gltf, accessorId, draco) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  if (!defined(draco) && !defined(bufferViewId)) {
    return undefined;
  }

  var indices = new Indices();
  indices.indexDatatype = accessor.componentType;
  indices.count = accessor.count;

  var indexBufferLoader = loadIndexBuffer(loader, gltf, accessorId, draco);
  indexBufferLoader.promise.then(function (indexBufferLoader) {
    if (loader.isDestroyed()) {
      return;
    }
    indices.buffer = indexBufferLoader.indexBuffer;
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
  var imageId = GltfLoaderUtil.getImageIdFromTexture({
    gltf: gltf,
    textureId: textureInfo.index,
    supportedImageFormats: supportedImageFormats,
  });

  if (!defined(imageId)) {
    return undefined;
  }

  var textureLoader = ResourceCache.loadTexture({
    gltf: gltf,
    textureInfo: textureInfo,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    supportedImageFormats: supportedImageFormats,
    asynchronous: loader._asynchronous,
  });

  loader._textureLoaders.push(textureLoader);

  var textureReader = GltfLoaderUtil.createModelTextureReader({
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
  var material = new Material();

  var extensions = defaultValue(
    gltfMaterial.extensions,
    defaultValue.EMPTY_OBJECT
  );
  var pbrSpecularGlossiness = extensions.KHR_materials_pbrSpecularGlossiness;
  var pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;

  material.unlit = defined(extensions.KHR_materials_unlit);

  if (defined(pbrSpecularGlossiness)) {
    var specularGlossiness = new SpecularGlossiness();
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
    var metallicRoughness = new MetallicRoughness();
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
  var featureIdAttribute = new FeatureIdAttribute();
  featureIdAttribute.propertyTableId = propertyTableId;
  featureIdAttribute.setIndex = featureIds.attribute;
  featureIdAttribute.offset = defaultValue(featureIds.offset, 0);
  featureIdAttribute.repeat = featureIds.repeat;
  return featureIdAttribute;
}

// for backwards compatibility with EXT_feature_metadata
function loadFeatureIdAttributeLegacy(gltfFeatureIdAttribute, featureTableId) {
  var featureIdAttribute = new FeatureIdAttribute();
  var featureIds = gltfFeatureIdAttribute.featureIds;
  featureIdAttribute.propertyTableId = featureTableId;
  featureIdAttribute.setIndex = getSetIndex(featureIds.attribute);
  // constant/divisor was renamed to offset/repeat
  featureIdAttribute.offset = defaultValue(featureIds.constant, 0);
  // The default is now undefined
  var divisor = defaultValue(featureIds.divisor, 0);
  featureIdAttribute.repeat = divisor === 0 ? undefined : divisor;
  return featureIdAttribute;
}

function loadFeatureIdTexture(
  loader,
  gltf,
  gltfFeatureIdTexture,
  propertyTableId,
  supportedImageFormats
) {
  var featureIdTexture = new FeatureIdTexture();

  // The schema for feature ID textures is essential a subclass of glTF
  // textureInfo
  var textureInfo = gltfFeatureIdTexture;

  featureIdTexture.propertyTableId = propertyTableId;
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
  var channelString = "rgba".charAt(gltfFeatureIdTexture.channel);
  featureIdTexture.textureReader.channels = channelString;

  return featureIdTexture;
}

function loadFeatureIdTextureLegacy(
  loader,
  gltf,
  gltfFeatureIdTexture,
  featureTableId,
  supportedImageFormats
) {
  var featureIdTexture = new FeatureIdTexture();
  var featureIds = gltfFeatureIdTexture.featureIds;
  var textureInfo = featureIds.texture;

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
  var morphTarget = new MorphTarget();

  for (var semantic in target) {
    if (target.hasOwnProperty(semantic)) {
      var accessorId = target[semantic];
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
  var primitive = new Primitive();

  var materialId = gltfPrimitive.material;
  if (defined(materialId)) {
    primitive.material = loadMaterial(
      loader,
      gltf,
      gltf.materials[materialId],
      supportedImageFormats
    );
  }

  var extensions = defaultValue(
    gltfPrimitive.extensions,
    defaultValue.EMPTY_OBJECT
  );
  var draco = extensions.KHR_draco_mesh_compression;

  var attributes = gltfPrimitive.attributes;
  if (defined(attributes)) {
    for (var semantic in attributes) {
      if (attributes.hasOwnProperty(semantic)) {
        var accessorId = attributes[semantic];
        primitive.attributes.push(
          loadVertexAttribute(loader, gltf, accessorId, semantic, draco)
        );
      }
    }
  }

  var targets = gltfPrimitive.targets;
  if (defined(targets)) {
    var targetsLength = targets.length;
    for (var i = 0; i < targetsLength; ++i) {
      primitive.morphTargets.push(loadMorphTarget(loader, gltf, targets[i]));
    }
    primitive.morphWeights = defined(morphWeights)
      ? morphWeights.slice()
      : arrayFill(new Array(targetsLength), 0.0);
  }

  var indices = gltfPrimitive.indices;
  if (defined(indices)) {
    primitive.indices = loadIndices(loader, gltf, indices, draco);
  }

  var featureMetadata = extensions.EXT_mesh_features;
  var featureMetadataLegacy = extensions.EXT_feature_metadata;

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
  // Partition feature ID attributes and textures
  var i;
  var featureIdAttributes = [];
  var featureIdTextures = [];
  var featureIdsArray = metadataExtension.featureIds;
  var propertyTablesArray = metadataExtension.propertyTables;

  if (defined(featureIdsArray)) {
    for (i = 0; i < featureIdsArray.length; i++) {
      var featureIds = featureIdsArray[i];
      if (defined(featureIds.channel)) {
        featureIdTextures.push(featureIds);
      } else {
        featureIdAttributes.push(featureIds);
      }
    }
  }

  // Feature ID Attributes
  var featureIdAttributesLength = featureIdAttributes.length;
  for (i = 0; i < featureIdAttributesLength; ++i) {
    primitive.featureIdAttributes.push(
      loadFeatureIdAttribute(featureIdAttributes[i], propertyTablesArray[i])
    );
  }

  // Feature ID Textures
  var featureIdTexturesLength = featureIdTextures.length;
  for (i = 0; i < featureIdTexturesLength; ++i) {
    primitive.featureIdTextures.push(
      loadFeatureIdTexture(
        loader,
        gltf,
        featureIdTextures[i],
        propertyTablesArray[i],
        supportedImageFormats
      )
    );
  }

  // Feature Textures
  if (defined(metadataExtension.propertyTextures)) {
    primitive.featureTextureIds = metadataExtension.propertyTextures;
  }
}

function loadPrimitiveMetadataLegacy(
  loader,
  gltf,
  primitive,
  metadataExtension,
  supportedImageFormats
) {
  var i;

  // Feature ID Attributes
  var featureIdAttributes = metadataExtension.featureIdAttributes;
  if (defined(featureIdAttributes)) {
    var featureIdAttributesLength = featureIdAttributes.length;
    for (i = 0; i < featureIdAttributesLength; ++i) {
      var featureIdAttribute = featureIdAttributes[i];
      primitive.featureIdAttributes.push(
        loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          loader._sortedPropertyTableIds.indexOf(
            featureIdAttribute.featureTable
          )
        )
      );
    }
  }

  // Feature ID Textures
  var featureIdTextures = metadataExtension.featureIdTextures;
  if (defined(featureIdTextures)) {
    var featureIdTexturesLength = featureIdTextures.length;
    for (i = 0; i < featureIdTexturesLength; ++i) {
      var featureIdTexture = featureIdTextures[i];
      primitive.featureIdTextures.push(
        loadFeatureIdTextureLegacy(
          loader,
          gltf,
          featureIdTexture,
          loader._sortedPropertyTableIds.indexOf(featureIdTexture.featureTable),
          supportedImageFormats
        )
      );
    }
  }

  // Feature Textures
  if (defined(metadataExtension.featureTextures)) {
    // feature textures are now identified by an integer index. To convert the
    // string IDs to integers, find their place in the sorted list of feature
    // table names
    primitive.featureTextureIds = metadataExtension.featureTextures.map(
      function (id) {
        return loader._sortedFeatureTextureIds.indexOf(id);
      }
    );
  }
}

function loadInstances(loader, gltf, nodeExtensions, frameState) {
  var instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;

  var instances = new Instances();
  var attributes = instancingExtension.attributes;
  if (defined(attributes)) {
    var hasRotation = defined(attributes.ROTATION);
    var hasTranslationMinMax =
      defined(attributes.TRANSLATION) &&
      defined(gltf.accessors[attributes.TRANSLATION].min) &&
      defined(gltf.accessors[attributes.TRANSLATION].max);
    for (var semantic in attributes) {
      if (attributes.hasOwnProperty(semantic)) {
        // If the instances have rotations load the attributes as typed arrays
        // so that instance matrices are computed on the CPU. This avoids the
        // expensive quaternion -> rotation matrix conversion in the shader.
        // If the translation accessor does not have a min and max, load the
        // attributes as typed arrays, so the values can be used for computing
        // an accurate bounding volume. Feature ID attributes are also loaded as
        // typed arrays because we want to be able to add the instance's feature ID to
        // the pick object.
        var loadAsTypedArray =
          ((hasRotation || !hasTranslationMinMax) &&
            (semantic === InstanceAttributeSemantic.TRANSLATION ||
              semantic === InstanceAttributeSemantic.ROTATION ||
              semantic === InstanceAttributeSemantic.SCALE)) ||
          semantic.indexOf(InstanceAttributeSemantic.FEATURE_ID) >= 0;

        var accessorId = attributes[semantic];
        instances.attributes.push(
          loadInstancedAttribute(
            loader,
            gltf,
            accessorId,
            semantic,
            loadAsTypedArray,
            frameState
          )
        );
      }
    }
  }

  var instancingExtExtensions = defaultValue(
    instancingExtension.extensions,
    defaultValue.EMPTY_OBJECT
  );
  var featureMetadata = nodeExtensions.EXT_mesh_features;
  var featureMetadataLegacy = instancingExtExtensions.EXT_feature_metadata;

  if (defined(featureMetadata)) {
    loadInstanceMetadata(instances, featureMetadata);
  } else if (defined(featureMetadataLegacy)) {
    loadInstanceMetadataLegacy(
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
  var featureIdAttributes = metadataExtension.featureIds;
  var propertyTables = defined(metadataExtension.propertyTables)
    ? metadataExtension.propertyTables
    : [];

  var featureIdAttributesLength = featureIdAttributes.length;
  for (var i = 0; i < featureIdAttributesLength; i++) {
    var featureIds = featureIdAttributes[i];
    var propertyTableId = propertyTables[i];
    instances.featureIdAttributes.push(
      loadFeatureIdAttribute(featureIds, propertyTableId)
    );
  }
}

// For backwards-compatibility with EXT_feature_metadata
function loadInstanceMetadataLegacy(
  instances,
  metadataExtension,
  sortedPropertyTableIds
) {
  var featureIdAttributes = metadataExtension.featureIdAttributes;
  if (defined(featureIdAttributes)) {
    var featureIdAttributesLength = featureIdAttributes.length;
    for (var i = 0; i < featureIdAttributesLength; ++i) {
      var featureIdAttribute = featureIdAttributes[i];
      instances.featureIdAttributes.push(
        loadFeatureIdAttributeLegacy(
          featureIdAttribute,
          sortedPropertyTableIds.indexOf(featureIdAttribute.featureTable)
        )
      );
    }
  }
}

function loadSkin(loader, gltf, gltfSkin, nodes) {
  var skin = new Skin();

  var jointIds = gltfSkin.joints;
  var jointsLength = jointIds.length;
  var joints = new Array(jointsLength);
  for (var i = 0; i < jointsLength; ++i) {
    joints[i] = nodes[jointIds[i]];
  }
  skin.joints = joints;

  var inverseBindMatricesAccessorId = gltfSkin.inverseBindMatrices;
  if (defined(inverseBindMatricesAccessorId)) {
    var accessor = gltf.accessors[inverseBindMatricesAccessorId];
    var bufferViewId = accessor.bufferView;
    if (defined(bufferViewId)) {
      var bufferViewLoader = loadBufferView(loader, gltf, bufferViewId);
      bufferViewLoader.promise.then(function (bufferViewLoader) {
        if (loader.isDestroyed()) {
          return;
        }
        var bufferViewTypedArray = bufferViewLoader.typedArray;
        var accessorTypedArray = getAccessorTypedArray(
          gltf,
          accessor,
          bufferViewTypedArray
        );
        var inverseBindMatrices = new Array(jointsLength);
        for (var i = 0; i < jointsLength; ++i) {
          inverseBindMatrices[i] = Matrix4.unpack(accessorTypedArray, i * 16);
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
  var node = new Node();

  node.matrix = fromArray(Matrix4, gltfNode.matrix);
  node.translation = fromArray(Cartesian3, gltfNode.translation);
  node.rotation = fromArray(Quaternion, gltfNode.rotation);
  node.scale = fromArray(Cartesian3, gltfNode.scale);

  var meshId = gltfNode.mesh;
  if (defined(meshId)) {
    var mesh = gltf.meshes[meshId];
    var morphWeights = defaultValue(gltfNode.weights, mesh.weights);
    var primitives = mesh.primitives;
    var primitivesLength = primitives.length;
    for (var i = 0; i < primitivesLength; ++i) {
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

  var nodeExtensions = defaultValue(
    gltfNode.extensions,
    defaultValue.EMPTY_OBJECT
  );
  var instancingExtension = nodeExtensions.EXT_mesh_gpu_instancing;

  if (defined(instancingExtension)) {
    node.instances = loadInstances(loader, gltf, nodeExtensions, frameState);
  }

  return node;
}

function loadNodes(loader, gltf, supportedImageFormats, frameState) {
  var i;
  var j;

  var nodesLength = gltf.nodes.length;
  var nodes = new Array(nodesLength);
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
    var childrenNodeIds = gltf.nodes[i].children;
    if (defined(childrenNodeIds)) {
      var childrenLength = childrenNodeIds.length;
      for (j = 0; j < childrenLength; ++j) {
        nodes[i].children.push(nodes[childrenNodeIds[j]]);
      }
    }
  }

  for (i = 0; i < nodesLength; ++i) {
    var skinId = gltf.nodes[i].skin;
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
  var featureMetadataLoader = new GltfFeatureMetadataLoader({
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
  var nodesIds;
  if (defined(gltf.scenes) && defined(gltf.scene)) {
    nodesIds = gltf.scenes[gltf.scene].nodes;
  }
  nodesIds = defaultValue(nodesIds, gltf.nodes);
  nodesIds = defined(nodesIds) ? nodesIds : [];
  return nodesIds;
}

function loadScene(gltf, nodes, upAxis, forwardAxis) {
  var scene = new Scene();
  scene.upAxis = upAxis;
  scene.forwardAxis = forwardAxis;
  var sceneNodeIds = getSceneNodeIds(gltf);
  scene.nodes = sceneNodeIds.map(function (sceneNodeId) {
    return nodes[sceneNodeId];
  });
  return scene;
}

function parse(loader, gltf, supportedImageFormats, frameState) {
  var extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  var featureMetadataExtension = extensions.EXT_mesh_features;
  var featureMetadataExtensionLegacy = extensions.EXT_feature_metadata;

  if (featureMetadataExtensionLegacy) {
    // If the old EXT_feature_metadata extension is present, sort the IDs of the
    // feature tables and feature textures so we don't have to do this once
    // per primitive.
    //
    // This must run before loadNodes so these IDs are available when
    // attributes are processed.
    var featureTables = featureMetadataExtensionLegacy.featureTables;
    var featureTextures = featureMetadataExtensionLegacy.featureTextures;
    var allPropertyTableIds = defined(featureTables) ? featureTables : [];
    var allFeatureTextureIds = defined(featureTextures) ? featureTextures : [];
    loader._sortedPropertyTableIds = Object.keys(allPropertyTableIds).sort();
    loader._sortedFeatureTextureIds = Object.keys(allFeatureTextureIds).sort();
  }

  var nodes = loadNodes(loader, gltf, supportedImageFormats, frameState);
  var upAxis = loader._upAxis;
  var forwardAxis = loader._forwardAxis;
  var scene = loadScene(gltf, nodes, upAxis, forwardAxis);

  var components = new Components();
  components.scene = scene;
  components.nodes = nodes;

  loader._components = components;

  // Load feature metadata (feature tables and feature textures)
  if (
    defined(featureMetadataExtension) ||
    defined(featureMetadataExtensionLegacy)
  ) {
    var featureMetadataLoader = loadFeatureMetadata(
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
  var loaders = [];
  loaders.push.apply(loaders, loader._bufferViewLoaders);
  loaders.push.apply(loaders, loader._geometryLoaders);

  if (defined(loader._featureMetadataLoader)) {
    loaders.push(loader._featureMetadataLoader);
  }

  if (!loader._incrementallyLoadTextures) {
    loaders.push.apply(loaders, loader._textureLoaders);
  }

  var readyPromises = loaders.map(function (loader) {
    return loader.promise;
  });

  // Separate promise will resolve once textures are loaded.
  var texturePromises = loader._textureLoaders.map(function (loader) {
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
  var textureLoaders = loader._textureLoaders;
  var textureLoadersLength = textureLoaders.length;
  for (var i = 0; i < textureLoadersLength; ++i) {
    ResourceCache.unload(textureLoaders[i]);
  }
  loader._textureLoaders.length = 0;
}

function unloadBufferViews(loader) {
  var bufferViewLoaders = loader._bufferViewLoaders;
  var bufferViewLoadersLength = bufferViewLoaders.length;
  for (var i = 0; i < bufferViewLoadersLength; ++i) {
    ResourceCache.unload(bufferViewLoaders[i]);
  }
  loader._bufferViewLoaders.length = 0;
}

function unloadGeometry(loader) {
  var geometryLoaders = loader._geometryLoaders;
  var geometryLoadersLength = geometryLoaders.length;
  for (var i = 0; i < geometryLoadersLength; ++i) {
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
