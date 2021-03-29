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
import ModelLoaderResults from "./ModelLoaderResults.js";
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

var defaultAccept =
  "model/gltf-binary,model/gltf+json;q=0.8,application/json;q=0.2,*/*;q=0.01";

/**
 * TODO: from ArrayBuffer
 *
 * Loads a glTF model.
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
  this._promise = when.defer();

  // Resources that need to be updated manually in the update loop before the
  // loader is ready
  this._vertexAttributesToLoad = [];
  this._indicesToLoad = [];
  this._texturesToLoad = [];
  this._featureMetadataLoader = undefined;

  // Final results sent back to Model
  this._loaderResults = new ModelLoaderResults();
}

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

  var that = this;
  gltfJsonLoader.promise
    .then(function () {
      if (that.isDestroyed()) {
        unload(that);
        return;
      }
      var gltf = gltfJsonLoader.gltf;
      unload(that); // Unload the gltfJsonLoader
      parse(that, gltf, supportedImageFormats);
    })
    .otherwise(function (error) {
      unload(that);
      var errorMessage = "Failed to load glTF";
      error = ResourceLoader.getError(error, errorMessage);
      that._promise.reject(error);
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
  loader._featureMetadataLoader = featureMetadataLoader;
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
  var nodes = loadNodes(loader, gltf, nodeIds, supportedImageFormats);
  loader._loaderResults.nodes = nodes;

  // Load top-level feature metadata
  var extensions = defaultValue(gltf.extensions, defaultValue.EMPTY_OBJECT);
  var featureMetadataExtension = extensions.EXT_feature_metadata;
  if (defined(featureMetadataExtension)) {
    loadFeatureMetadata(
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

VertexAttributeToLoad.prototype.update = function (frameState) {
  this.vertexBufferLoader.update(frameState);
  this.vertexAttribute.vertexBuffer = this.vertexBufferLoader.vertexBuffer;
  return defined(this.vertexBufferLoader.vertexBuffer);
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
  this.indices.indexBuffer = this.indexBufferLoader.indexBuffer;
  return defined(this.indexBufferLoader.indexBuffer);
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
  this.texture.texture = this.textureLoader.texture;
  return defined(this.texture.texture);
};

TextureToLoad.prototype.unload = function () {
  ResourceCache.unload(this.textureLoader);
  this.texture.texture = undefined;
};

/**
 * Updates resources so that the model becomes ready.
 *
 * @param {FrameState} frameState The frame state.
 */
GltfLoader.prototype.update = function (frameState) {
  var i;

  var ready = true;

  var vertexAttributesToLoad = this._vertexAttributesToLoad;
  var vertexAttributesLength = vertexAttributesToLoad.length;
  for (i = 0; i < vertexAttributesLength; ++i) {
    ready = vertexAttributesToLoad[i].update(frameState) && ready;
  }

  var indicesToLoad = this._indicesToLoad;
  var indicesLength = indicesToLoad.length;
  for (i = 0; i < indicesLength; ++i) {
    ready = indicesToLoad[i].update(frameState) && ready;
  }

  var texturesToLoad = this._texturesToLoad;
  var texturesLength = texturesToLoad.length;
  for (i = 0; i < texturesLength; ++i) {
    ready = texturesToLoad[i].update(frameState) && ready;
  }

  var featureMetadataLoader = this._featureMetadataLoader;
  if (defined(featureMetadataLoader)) {
    featureMetadataLoader.update(frameState);
    var featureMetadata = featureMetadataLoader.featureMetadata;
    this._loaderResults.featureMetadata = featureMetadata;
    ready = defined(featureMetadata) && ready;
  }

  if (ready) {
    this._promise.resolve(this._loaderResults);
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
