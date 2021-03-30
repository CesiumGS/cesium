import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import Resource from "../Core/Resource.js";
import ForEach from "../ThirdParty/GltfPipeline/ForEach.js";
import when from "../ThirdParty/when.js";
import GltfFeatureMetadataLoader from "./GltfFeatureMetadataLoader.js";
import GltfLoaderUtil from "./GltfLoaderUtil.js";
import ModelComponents from "./ModelComponents.js";
import ResourceCache from "./ResourceCache.js";
import ResourceLoader from "./ResourceLoader.js";

var VertexAttribute = ModelComponents.VertexAttribute;
var Indices = ModelComponents.Indices;
var FeatureIdAttribute = ModelComponents.FeatureIdAttribute;
var FeatureIdTexture = ModelComponents.FeatureIdTexture;
var MorphTarget = ModelComponents.MorphTarget;
var Primitive = ModelComponents.Primitive;
var Mesh = ModelComponents.Mesh;
var Instances = ModelComponents.Instances;
var Node = ModelComponents.Node;
var Texture = ModelComponents.Texture;
var Material = ModelComponents.Material;

var GltfLoaderState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY_EXCEPT_TEXTURES: 3,
  READY: 4,
  FAILED: 5,
};

var defaultAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

/**
 * Loads a glTF model.
 *
 * TODO: load directly from ArrayBuffer
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.uri The uri to the glTF file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.keepResident=false] Whether the glTF JSON and embedded buffers should stay in the cache indefinitely.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 *
 * @alias GltfLoader
 * @constructor
 *
 * @private
 */
export default function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.uri;
  var basePath = options.basePath;
  var keepResident = defaultValue(options.keepResident, false);
  var asynchronous = defaultValue(options.asynchronous, true);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.uri", uri);
  //>>includeEnd('debug');

  var gltfResource = Resource.createIfNeeded(uri);

  if (!defined(gltfResource.headers.Accept)) {
    gltfResource.headers.Accept = defaultAccept;
  }

  var baseResource = defined(basePath)
    ? Resource.createIfNeeded(basePath)
    : gltfResource.clone();

  this._gltfResource = gltfResource;
  this._baseResource = baseResource;
  this._keepResident = keepResident;
  this._asynchronous = asynchronous;
  this._gltfJsonLoader = undefined;
  this._error = undefined;
  this._state = GltfLoaderState.UNLOADED;

  // Resources that need to be loaded manually before the loader becomes ready
  this._vertexAttributesToLoad = [];
  this._indicesToLoad = [];
  this._texturesToLoad = [];
  this._featureMetadataLoader = undefined;

  // Loaded results for Model
  this._nodes = [];
  this._featureMetadata = undefined;
}

Object.defineProperties(GltfLoader.prototype, {
  /**
   * The loaded nodes.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {ModelComponents.Node}
   * @readonly
   */
  nodes: {
    get: function () {
      return this._nodes;
    },
  },
  /**
   * The loaded feature metadata.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {FeatureMetadata}
   * @readonly
   */
  featureMetadata: {
    get: function () {
      return this._featureMetadata;
    },
  },
  /**
   * An error if the glTF fails to load.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Error}
   * @readonly
   */
  error: {
    get: function () {
      return this._error;
    },
  },
  /**
   * Whether the glTF is ready.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._state === GltfLoaderState.READY;
    },
  },
  /**
   * Whether the glTF is ready except for loading textures.
   *
   * @memberof GltfLoader.prototype
   *
   * @type {Boolean}
   * @readonly
   */
  readyExceptTextures: {
    get: function () {
      return this._state === GltfLoaderState.READY_EXCEPT_TEXTURES;
    },
  },
});

/**
 * Loads the glTF.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfLoader.prototype.load = function (frameState) {
  var supportedImageFormats = {
    webp: FeatureDetection.supportsWebP(),
    s3tc: frameState.context.s3tc,
    pvrtc: frameState.context.pvrtc,
    etc1: frameState.context.etc1,
  };

  var gltfJsonLoader = ResourceCache.loadGltf({
    gltfResource: this._gltfResource,
    baseResource: this._baseResource,
    keepResident: this._keepResident,
  });

  this._gltfJsonLoader = gltfJsonLoader;
  this._state = GltfLoaderState.LOADING;

  var that = this;
  gltfJsonLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        unload(that);
        return;
      }
      var gltf = gltfJsonLoader.gltf;
      unload(that); // Unloads the gltfJsonLoader
      parse(that, gltf, supportedImageFormats);
      that._state = GltfLoaderState.PROCESSING;
    })
    .otherwise(function (error) {
      unload(that);
      var errorMessage = "Failed to load glTF";
      that._error = ResourceLoader.getError(error, errorMessage);
    });
};

function loadVertexBuffer(loader, gltf, accessorId, semantic, draco) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  if (!defined(draco) && !defined(bufferViewId)) {
    return undefined;
  }

  return ResourceCache.loadVertexBuffer({
    gltf: gltf,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    bufferViewId: bufferViewId,
    draco: draco,
    dracoAttributeSemantic: semantic,
    keepResident: false,
    asynchronous: loader._asynchronous,
  });
}

function loadVertexAttribute(loader, gltf, accessorId, semantic, draco) {
  var vertexAttribute = new VertexAttribute();

  var vertexBufferLoader = loadVertexBuffer(
    loader,
    gltf,
    accessorId,
    semantic,
    draco
  );

  // Accessors default to all zeros when there is no buffer view
  var constantValue = defined(vertexBufferLoader) ? undefined : 0;

  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;
  var bufferView = gltf.bufferViews[bufferViewId];

  vertexAttribute.semantic = semantic;
  vertexAttribute.constantValue = constantValue;
  vertexAttribute.byteOffset = accessor.byteOffset;
  vertexAttribute.byteStride = bufferView.byteStride;
  vertexAttribute.componentType = accessor.componentType;
  vertexAttribute.normalized = accessor.normalized;
  vertexAttribute.count = accessor.count;
  vertexAttribute.type = accessor.type;
  vertexAttribute.min = accessor.min;
  vertexAttribute.max = accessor.max;

  if (defined(vertexBufferLoader)) {
    loader._vertexAttributesToLoad.push(
      new VertexAttributeToLoad(vertexAttribute, vertexBufferLoader)
    );
  }

  return vertexAttribute;
}

function loadIndexBuffer(loader, gltf, accessorId, draco) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewId = accessor.bufferView;

  if (!defined(draco) && !defined(bufferViewId)) {
    return undefined;
  }

  return ResourceCache.loadIndexBuffer({
    gltf: gltf,
    accessorId: accessorId,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    draco: draco,
    keepResident: false,
    asynchronous: loader._asynchronous,
  });
}

function loadIndices(loader, gltf, accessorId, draco) {
  var indexBufferLoader = loadIndexBuffer(loader, gltf, accessorId, draco);

  // Accessors default to all zeros when there is no buffer view
  var constantValue = defined(indexBufferLoader) ? undefined : 0;

  var accessor = gltf.accessors[accessorId];

  var indices = new Indices();
  indices.constantValue = constantValue;
  indices.indexDatatype = accessor.componentType;
  indices.count = accessor.count;

  if (defined(indexBufferLoader)) {
    loader._indicesToLoad.push(new IndicesToLoad(indices, indexBufferLoader));
  }

  return indices;
}

function loadTexture(loader, gltf, textureInfo, supportedImageFormats) {
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
    keepResident: false,
    asynchronous: loader._asynchronous,
  });

  var texture = new Texture();
  texture.texCoord = textureInfo.texCoord;

  loader._texturesToLoad.push(new TextureToLoad(texture, textureLoader));

  return texture;
}

function loadMaterial(loader, gltf, gltfMaterial, supportedImageFormats) {
  var material = new Material();

  // Metallic roughness
  var pbrMetallicRoughness = gltfMaterial.pbrMetallicRoughness;
  if (defined(pbrMetallicRoughness)) {
    if (defined(pbrMetallicRoughness.baseColorTexture)) {
      material.baseColorTexture = loadTexture(
        loader,
        gltf,
        pbrMetallicRoughness.baseColorTexture,
        supportedImageFormats
      );
    }
    if (defined(pbrMetallicRoughness.metallicRoughnessTexture)) {
      material.metallicRoughnessTexture = loadTexture(
        loader,
        gltf,
        pbrMetallicRoughness.metallicRoughnessTexture,
        supportedImageFormats
      );
    }
    material.baseColorFactor = pbrMetallicRoughness.baseColorFactor;
    material.metallicFactor = pbrMetallicRoughness.metallicFactor;
    material.roughnessFactor = pbrMetallicRoughness.roughnessFactor;
  }

  if (defined(material.extensions)) {
    // Spec gloss extension
    var pbrSpecularGlossiness =
      material.extensions.KHR_materials_pbrSpecularGlossiness;
    if (defined(pbrSpecularGlossiness)) {
      if (defined(pbrSpecularGlossiness.diffuseTexture)) {
        material.diffuseTexture = loadTexture(
          loader,
          gltf,
          pbrSpecularGlossiness.diffuseTexture,
          supportedImageFormats
        );
      }
      if (defined(pbrSpecularGlossiness.specularGlossinessTexture)) {
        if (defined(pbrSpecularGlossiness.specularGlossinessTexture)) {
          material.specularGlossinessTexture = loadTexture(
            loader,
            gltf,
            pbrSpecularGlossiness.specularGlossinessTexture,
            supportedImageFormats
          );
        }
      }
      material.diffuseFactor = pbrSpecularGlossiness.diffuseFactor;
      material.specularFactor = pbrSpecularGlossiness.specularFactor;
      material.glossinessFactor = pbrSpecularGlossiness.glossinessFactor;
    }
  }

  // Top level textures
  if (defined(material.emissiveTexture)) {
    material.emissiveTexture = loadTexture(
      loader,
      gltf,
      material.emissiveTexture,
      supportedImageFormats
    );
  }
  if (defined(material.normalTexture)) {
    material.normalTexture = loadTexture(
      loader,
      gltf,
      material.normalTexture,
      supportedImageFormats
    );
  }
  if (defined(material.occlusionTexture)) {
    material.occlusionTexture = loadTexture(
      loader,
      gltf,
      material.occlusionTexture,
      supportedImageFormats
    );
  }
  material.emissiveFactor = gltfMaterial.emissiveFactor;
  material.alphaMode = gltfMaterial.alphaMode;
  material.alphaCutoff = gltfMaterial.alphaCutoff;
  material.doubleSided = gltfMaterial.doubleSided;

  return material;
}

function loadFeatureIdAttribute(gltfFeatureIdAttribute) {
  var featureIdAttribute = new FeatureIdAttribute();
  var featureIds = featureIdAttribute.featureIds;
  featureIdAttribute.featureTable = gltfFeatureIdAttribute.featureTable;
  featureIdAttribute.attribute = featureIds.attribute;
  featureIdAttribute.constant = featureIds.constant;
  featureIdAttribute.divisor = featureIds.divisor;
}

function loadFeatureIdTexture(
  loader,
  gltf,
  gltfFeatureIdTexture,
  supportedImageFormats
) {
  var featureIdTexture = new FeatureIdTexture();
  var featureIds = gltfFeatureIdTexture.featureIds;
  var textureInfo = featureIds.texture;

  featureIdTexture.featureTable = gltfFeatureIdTexture.featureTable;
  featureIdTexture.channels = featureIds.channels;
  featureIdTexture.texture = loadTexture(
    loader,
    gltf,
    textureInfo,
    supportedImageFormats
  );

  return featureIdTexture;
}

function loadMorphTarget(loader, gltf, gltfTarget) {
  var morphTarget = new MorphTarget();
  ForEach.meshPrimitiveTargetAttribute(gltfTarget, function (
    accessorId,
    semantic
  ) {
    var vertexAttribute = loadVertexAttribute(
      loader,
      gltf,
      accessorId,
      semantic
      // don't pass in draco object since morph targets can't be draco compressed
    );
    morphTarget.vertexAttributes.push(vertexAttribute);
  });
  return morphTarget;
}

function loadPrimitive(loader, gltf, gltfPrimitive, supportedImageFormats) {
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
  var featureMetadata = extensions.EXT_feature_metadata;

  ForEach.meshPrimitiveAttribute(gltfPrimitive, function (
    accessorId,
    semantic
  ) {
    primitive.vertexAttributes.push(
      loadVertexAttribute(loader, gltf, accessorId, semantic, draco)
    );
  });

  ForEach.meshPrimitiveTarget(gltfPrimitive, function (gltfTarget) {
    primitive.morphTargets.push(loadMorphTarget(loader, gltf, gltfTarget));
  });

  if (defined(gltfPrimitive.indices)) {
    primitive.indices = loadIndices(loader, gltf, gltfPrimitive.indices, draco);
  }

  if (defined(featureMetadata)) {
    var i;

    // Feature ID Attributes
    var featureIdAttributes = featureMetadata.featureIdAttributes;
    if (defined(featureIdAttributes)) {
      var featureIdAttributesLength = featureIdAttributesLength;
      for (i = 0; i < featureIdAttributesLength; ++i) {
        primitive.featureIdAttributes.push(
          loadFeatureIdAttribute(featureIdAttributes[i])
        );
      }
    }

    // Feature ID Textures
    var featureIdTextures = featureMetadata.featureIdTextures;
    if (defined(featureIdTextures)) {
      var featureIdTexturesLength = featureIdTextures.length;
      for (i = 0; i < featureIdTexturesLength; ++i) {
        primitive.featureIdTextures.push(
          loadFeatureIdTexture(
            loader,
            gltf,
            featureIdTextures[i],
            supportedImageFormats
          )
        );
      }
    }

    // Feature Textures
    primitive.featureTextures = featureMetadata.featureTextures;
  }

  primitive.mode = gltfPrimitive.mode;

  return primitive;
}

function loadMesh(loader, gltf, gltfMesh, supportedImageFormats) {
  var mesh = new Mesh();

  ForEach.meshPrimitive(gltfMesh, function (primitive) {
    mesh.primitives.push(
      loadPrimitive(loader, gltf, primitive, supportedImageFormats)
    );
  });

  mesh.morphWeights = gltfMesh.weights;

  return mesh;
}

function loadInstances(loader, gltf, instancingExtension) {
  var instances = new Instances();
  var attributes = instancingExtension.attributes;
  if (defined(attributes)) {
    for (var semantic in attributes) {
      if (attributes.hasOwnProperty(semantic)) {
        var accessorId = attributes[semantic];
        // TODO: handle case where GPU instancing isn't supported
        instances.vertexAttributes.push(
          loadVertexAttribute(loader, gltf, accessorId, semantic)
        );
      }
    }
  }

  var extensions = defaultValue(
    instancingExtension.extensions,
    defaultValue.EMPTY_OBJECT
  );
  var featureMetadata = extensions.EXT_feature_metadata;
  if (defined(featureMetadata)) {
    var featureIdAttributes = featureMetadata.featureIdAttributes;
    if (defined(featureIdAttributes)) {
      var featureIdAttributesLength = featureIdAttributesLength;
      for (var i = 0; i < featureIdAttributesLength; ++i) {
        instances.featureIdAttributes.push(
          loadFeatureIdAttribute(featureIdAttributes[i])
        );
      }
    }
  }
  return instances;
}

function loadNode(loader, gltf, gltfNode, supportedImageFormats) {
  var node = new Node();

  var meshId = gltfNode.mesh;
  if (defined(meshId)) {
    var gltfMesh = gltf.meshes[meshId];
    node.mesh = loadMesh(loader, gltf, gltfMesh, supportedImageFormats);
  }

  var extensions = defaultValue(node.extensions, defaultValue.EMPTY_OBJECT);
  var instancingExtension = extensions.EXT_mesh_gpu_instancing;
  if (defined(instancingExtension)) {
    node.instances = loadInstances(loader, gltf, instancingExtension);
  }

  return node;
}

function loadNodes(loader, gltf, nodeIds, supportedImageFormats) {
  var length = nodeIds.length;
  var nodes = new Array(length);
  for (var i = 0; i < length; i++) {
    var nodeId = nodeIds[i];
    var gltfNode = gltf.nodes[nodeId];
    var node = loadNode(loader, gltf, gltfNode, supportedImageFormats);
    nodes.push(node);

    var children = gltfNode.children;
    if (defined(children)) {
      node.children = loadNodes(loader, gltf, children, supportedImageFormats);
    }
  }
  return nodes;
}

function loadFeatureMetadata(loader, gltf, extension, supportedImageFormats) {
  var featureMetadataLoader = new GltfFeatureMetadataLoader({
    gltf: gltf,
    gltfResource: loader._gltfResource,
    baseResource: loader._baseResource,
    extension: extension,
    supportedImageFormats: supportedImageFormats,
    asynchronous: loader._asynchronous,
  });
  featureMetadataLoader.load();
  return featureMetadataLoader;
}

function getSceneNodeIds(gltf) {
  var nodes;
  if (defined(gltf.scenes) && defined(gltf.scene)) {
    nodes = gltf.scenes[gltf.scene].nodes;
  }
  nodes = defaultValue(nodes, gltf.nodes);
  nodes = defined(nodes) ? nodes : [];
  return nodes;
}

function parse(loader, gltf, supportedImageFormats) {
  // Load nodes, meshes, primitives, materials, textures,
  var nodeIds = getSceneNodeIds(gltf);
  loader._nodes = loadNodes(loader, gltf, nodeIds, supportedImageFormats);

  // Load top-level feature metadata
  var extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  var featureMetadataExtension = extensions.EXT_feature_metadata;
  if (defined(featureMetadataExtension)) {
    loader._featureMetadataLoader = loadFeatureMetadata(
      this,
      gltf,
      featureMetadataExtension,
      supportedImageFormats
    );
  }
}

function VertexAttributeToLoad(vertexAttribute, vertexBufferLoader) {
  this.vertexAttribute = vertexAttribute;
  this.vertexBufferLoader = vertexBufferLoader;
}

// TODO: rename update to process
VertexAttributeToLoad.prototype.update = function (frameState) {
  this.vertexBufferLoader.update(frameState);
  var vertexBuffer = this.vertexBufferLoader.vertexBuffer;
  if (defined(vertexBuffer)) {
    this.vertexAttribute.vertexBuffer = vertexBuffer;
    return true;
  }
  return false;
};

VertexAttributeToLoad.prototype.unload = function () {
  ResourceCache.unload(this.vertexBufferLoader);
  this.vertexAttribute.vertexBuffer = undefined;
};

function IndicesToLoad(indices, indexBufferLoader) {
  this.indices = indices;
  this.indexBufferLoader = indexBufferLoader;
}

IndicesToLoad.prototype.update = function (frameState) {
  this.indexBufferLoader.update(frameState);
  var indexBuffer = this.indexBufferLoader.indexBuffer;
  if (defined(indexBuffer)) {
    this.indices.indexBuffer = indexBuffer;
    return true;
  }
  return false;
};

IndicesToLoad.prototype.unload = function () {
  ResourceCache.unload(this.indexBufferLoader);
  this.indices.indexBuffer = undefined;
};

function TextureToLoad(texture, textureLoader) {
  this.texture = texture;
  this.textureLoader = textureLoader;
}

TextureToLoad.prototype.update = function (frameState) {
  this.textureLoader.update(frameState);
  var texture = this.textureLoader.texture;
  if (defined(texture)) {
    this.texture.texture = texture;
    return true;
  }
  return false;
};

TextureToLoad.prototype.unload = function () {
  ResourceCache.unload(this.textureLoader);
  this.texture.texture = undefined;
};

/**
 * Process resources so that they become ready.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfLoader.prototype.process = function (frameState) {
  if (this._state === GltfLoaderState.LOADING) {
    return;
  }

  var i;

  var attributesReady = true;
  var indicesReady = true;
  var texturesReady = true;
  var featureMetadataReady = true;

  var attributesToLoad = this._vertexAttributesToLoad;
  var attributesLength = attributesToLoad.length;
  for (i = 0; i < attributesLength; ++i) {
    attributesReady = attributesToLoad[i].update(frameState) && attributesReady;
  }

  var indicesToLoad = this._indicesToLoad;
  var indicesLength = indicesToLoad.length;
  for (i = 0; i < indicesLength; ++i) {
    indicesReady = indicesToLoad[i].update(frameState) && indicesReady;
  }

  var texturesToLoad = this._texturesToLoad;
  var texturesLength = texturesToLoad.length;
  for (i = 0; i < texturesLength; ++i) {
    texturesReady = texturesToLoad[i].update(frameState) && texturesReady;
  }

  var featureMetadataLoader = this._featureMetadataLoader;
  if (defined(featureMetadataLoader)) {
    featureMetadataLoader.update(frameState);
    var featureMetadata = featureMetadataLoader.featureMetadata;
    featureMetadataReady = defined(featureMetadata);
    this._featureMetadata = featureMetadata;
  }

  if (attributesReady && indicesReady && featureMetadataReady) {
    if (texturesReady) {
      this._state = GltfLoaderState.READY;
    } else {
      this._state = GltfLoaderState.READY_EXCEPT_TEXTURES;
    }
  }
};

function unload(loader) {
  if (defined(loader._gltfJsonLoader)) {
    ResourceCache.unload(loader._gltfJsonLoader);
  }
  loader._gltfJsonLoader = undefined;

  if (defined(loader._featureMetadataLoader)) {
    ResourceCache.unload(loader._featureMetadataLoader);
  }
  loader._featureMetadataLoader = undefined;

  loader._vertexAttributesToLoad.forEach(function (vertexAttributeToLoad) {
    vertexAttributeToLoad.unload();
  });
  loader._vertexAttributesToLoad = [];

  loader._indicesToLoad.forEach(function (indicesToLoad) {
    indicesToLoad.unload();
  });
  loader._indicesToLoad = [];

  loader._texturesToLoad.forEach(function (textureToLoad) {
    textureToLoad.unload();
  });
  loader._texturesToLoad = [];
}

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see GltfLoader#destroy
 */
GltfLoader.prototype.isDestroyed = function () {
  return false;
};

/**
 * Unloads resources from the cache.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * gltfLoader = gltfLoader && gltfLoader.destroy();
 *
 * @see GltfLoader#isDestroyed
 */
GltfLoader.prototype.destroy = function () {
  unload(this);
  return destroyObject(this);
};
