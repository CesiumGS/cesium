//import BoundingSphere from "../Core/BoundingSphere.js";
//import Cartesian2 from "../Core/Cartesian2.js";
//import Cartesian3 from "../Core/Cartesian3.js";
//import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../../Core/Check.js";
//import combine from "../Core/combine.js";
//import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../../Core/defaultValue.js";
import defined from "../../Core/defined.js";
//import ManagedArray from "../Core/ManagedArray.js";
//import Matrix3 from "../Core/Matrix3.js";
//import Matrix4 from "../Core/Matrix4.js";
//import oneTimeWarning from "../Core/oneTimeWarning.js";
//import Quaternion from "../Core/Quaternion.js";
import Resource from "../../Core/Resource.js";
//import Buffer from "../Renderer/Buffer.js";
//import BufferUsage from "../Renderer/BufferUsage.js";
//import numberOfComponentsForType from "../ThirdParty/GltfPipeline/numberOfComponentsForType.js";
import when from "../../ThirdParty/when.js";
//import AlphaMode from "./AlphaMode.js";
//import AttributeType from "./AttributeType.js";
import GltfLoader from "../GltfLoader.js";
//import MetadataType from "./MetadataType.js";
//import ModelComponents from "./ModelComponents.js";
import SceneMode from "../SceneMode.js";

//var Attribute = ModelComponents.Attribute;

var ModelState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

/**
 * @private
 */
export default function Model(options) {
  this._loader = options.loader;
  this._components = undefined;
  this._texturesLoaded = false;
  this._commandsCreated = false;
  this._components = undefined;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

Object.defineProperties(Model.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external
   * resources were downloaded and the WebGL resources were created. This is set
   * to <code>true</code> right before {@link Model#readyPromise} is resolved.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._state === ModelState.READY;
    },
  },

  /**
   * Gets the promise that will be resolved when this model is ready to render,
   * i.e., when the resources were downloaded and the WebGL resources were created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof Model.prototype
   * @type {Promise.<Model>}
   * @readonly
   *
   * @example
   * // Play all animations at half-speed when the model is ready to render
   * model.readyPromise.then(function(model) {
   *   model.activeAnimations.addAll({
   *     multiplier : 0.5
   *   });
   * }).otherwise(function(error){
   *   window.alert(error);
   * });
   *
   * @see Model#ready
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 *
 * <p>
 * Cesium supports glTF assets with the following extensions:
 * <p>glTF 2.0</p>
 * <ul>
 * <li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md|KHR_draco_mesh_compression}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/README.md|KHR_materials_pbrSpecularGlossiness}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit/README.md|KHR_materials_unlit}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_texture_transform/README.md|KHR_texture_transform}
 * </li><li>
 * {@link https://github.com/KhronosGroup/glTF/blob/master/extensions/2.0/Khronos/KHR_mesh_quantization/README.md|KHR_mesh_quantization}
 * </li>
 * </ul>
 * </p>
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  // TODO: validation layer?
  // TODO: throw if encountering an unrecognized required extension
  // TODO: need to recognize per-vertex metadata and convert it vertex attribute
  // TODO: this can have different interpolations: https://github.com/CesiumGS/3d-tiles-next/issues/15
  // TODO: random per-vertex attributes could be draco encoded. so could per-vertex metadata. so min/max metadata is required to support
  // TODO: most other stuff can be baked in the model matrix, normal matrix, tangent matrix
  // TODO: ability to unload metadata from CPU like for point clouds
  options = defined(options) ? options : defaultValue.EMPTY_OBJECT;

  var url = options.url;
  var basePath = options.basePath;
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );
  var allowPicking = defaultValue(options.allowPicking, true);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", url);
  //>>includeEnd('debug');

  var gltfResource = Resource.createIfNeeded(url);
  var baseResource = Resource.createIfNeeded(basePath);

  var loaderOptions = {
    gltfResource: gltfResource,
    baseResource: baseResource,
    releaseGltfJson: releaseGltfJson,
    asynchronous: asynchronous,
    incrementallyLoadTextures: incrementallyLoadTextures,
  };

  var modelOptions = {
    loader: new GltfLoader(loaderOptions),
    // incrementallyLoadTextures: incrementallyLoadTextures,
    allowPicking: allowPicking,
  };

  return new Model(modelOptions);
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.
 * </p>
 */
Model.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var that = this;

  if (!defined(this._loader)) {
    this._state = ModelState.READY;
    this._texturesLoaded = true;
  }

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
    this._loader.load();

    this._loader.promise
      .then(function (loader) {
        that._components = loader.components;
        that._state = ModelState.READY;
      })
      .otherwise(function (error) {
        that._state = ModelState.FAILED;
        that._readyPromise.reject(error);
      });
    this._loader.texturesLoadedPromise.then(function () {
      that._texturesLoaded = true;
    });
  }

  if (
    this._state === ModelState.LOADING ||
    (this._state === ModelState.READY && !this._texturesLoaded)
  ) {
    this._loader.process(frameState);
  }

  if (this._state === ModelState.READY && !this._commandsCreated) {
    this._commandsCreated = true;
    createCommands(this, frameState);

    frameState.afterRender.push(function () {
      that._readyPromise.resolve(that);
    });

    return;
  }

  if (this._state === ModelState.READY) {
    update(this, frameState);
  }
};

/*
var scratchStack = new ManagedArray();
*/

/*
function getUniformFunction(value) {
  return function () {
    return value;
  };
}
*/

/*
function getBoundingSphere(positionAttribute) {
  var min = Cartesian3.clone(positionAttribute.min);
  var max = Cartesian3.clone(positionAttribute.max);

  if (positionAttribute.normalized) {
    // The position may be normalized when loaded a glTF that has the
    // KHR_mesh_quantization extension. Unnormalize the min/max to account for this.
    var componentDatatype = positionAttribute.componentDatatype;
    var metadataType = MetadataType.fromComponentDatatype(componentDatatype);
    min.x = MetadataType.unnormalize(min.x, metadataType);
    min.y = MetadataType.unnormalize(min.y, metadataType);
    min.z = MetadataType.unnormalize(min.z, metadataType);
    max.x = MetadataType.unnormalize(max.x, metadataType);
    max.y = MetadataType.unnormalize(max.y, metadataType);
    max.z = MetadataType.unnormalize(max.z, metadataType);
  }

  return BoundingSphere.fromCornerPoints(min, max);
}
*/

/*
function isVertexAttributeSupported(property) {
  var type = property.type;
  var enumType = property.enumType;
  var valueType = property.valueType;
  var componentCount = property.componentCount;

  if (
    type === MetadataType.ARRAY &&
    (!defined(componentCount) || componentCount > 4)
  ) {
    // Variable-size arrays or arrays with more than 4 components are not supported
    return false;
  }

  if (defined(enumType)) {
    // Enums or arrays of enums are not supported
    return false;
  }

  if (valueType === MetadataType.STRING) {
    // Strings or arrays of strings are not supported
    return false;
  }

  return true;
}
*/

/*
function isVertexAttributeLossy(property) {
  // WebGL does not support vertex attributes with these types
  var valueType = property.valueType;
  return (
    valueType === MetadataType.UINT32 ||
    valueType === MetadataType.UINT64 ||
    valueType === MetadataType.INT32 ||
    valueType === MetadataType.INT64 ||
    valueType === MetadataType.FLOAT64
  );
}
*/

/*
var attributeTypes = [
  AttributeType.SCALAR,
  AttributeType.VEC2,
  AttributeType.VEC3,
  AttributeType.VEC4,
];
*/

/*
function getMetadataVertexAttributes(
  primitive,
  vertexCount,
  featureMetadata,
  frameState
) {
  // TODO: point cloud vertex attributes need to have names that don't use unicode characters
  // Convert per-vertex metadata to vertex buffers. Mainly applicable to point clouds.
  var metadataVertexAttributes = [];
  var featureIdAttributes = primitive.featureIdAttributes;
  var featureIdAttributesLength = featureIdAttributes.length;
  for (var i = 0; i < featureIdAttributesLength; ++i) {
    var featureIdAttribute = featureIdAttributes[i];
    var featureTableId = featureIdAttribute.featureTable;
    var featureTable = featureMetadata.getFeatureTable(featureTableId);
    var featureTableClass = featureTable.class;
    var setIndex = featureIdAttribute.setIndex;
    var divisor = featureIdAttribute.divisor;
    var constant = featureIdAttribute.constant;
    // TODO: what about divisor > 1?
    // TODO: what are the vertex interpolation rules?
    if (defined(setIndex) || divisor !== 1) {
      continue;
    }
    var propertyIds = featureTable.getPropertyIds(0);
    var propertyIdsLength = propertyIds.length;
    for (var j = 0; j < propertyIdsLength; ++j) {
      var propertyId = propertyIds[j];
      var typedArray = featureTable.getPropertyTypedArray(propertyId);
      if (!defined(typedArray)) {
        continue;
      }
      var property = featureTableClass.properties[propertyId];
      if (!isVertexAttributeSupported(property)) {
        continue;
      }
      var componentCount = property.componentCount; // TODO: check if defined for scalars
      var startOffset = constant * componentCount;
      var endOffset = startOffset + vertexCount * componentCount;
      typedArray = typedArray.subarray(startOffset, endOffset);
      if (isVertexAttributeLossy(property)) {
        oneTimeWarning(
          "Cast metadata property to floats",
          'Metadata property "' +
            propertyId +
            '" will be casted to a float array because UINT32, UINT64, INT32, INT64, and FLOAT64 are not valid WebGL vertex attribute types. Some precision may be lost.'
        );
        typedArray = new Float32Array(typedArray);
      }

      var vertexBuffer = Buffer.createVertexBuffer({
        typedArray: typedArray,
        context: frameState.context,
        usage: BufferUsage.STATIC_DRAW,
      });
      vertexBuffer.vertexArrayDestroyable = false;

      var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);

      var attribute = new Attribute();
      attribute.semantic = propertyId;
      attribute.constant = undefined;
      attribute.componentDatatype = componentDatatype;
      attribute.normalized = property.normalized;
      attribute.count = vertexCount;
      attribute.type = attributeTypes[componentCount];
      attribute.min = undefined;
      attribute.max = undefined;
      attribute.byteOffset = 0;
      attribute.byteStride = undefined;
      attribute.buffer = vertexBuffer;

      metadataVertexAttributes.push(attribute);
    }
  }

  return metadataVertexAttributes;
}
*/

// TODO: feature id attribute for implicit feature ids with non-1 divisor and non-constant

/*
function RuntimeNode() {
  this._computedMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._localMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._commands = [];
}

function RuntimePrimitive() {
  this._quantizationMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._command = undefined;
}

function RuntimeAttribute() {
  this._;
}
*/

/*
function getAttributeBySemantic(primitive, semantic) {
  // var attributes = primitive.attributes;
  // var attributesLength = attributes.length;
  // for (var i = 0; i < attributesLength; ++i) {
  //   attribute = attributes[i];
  //   if (attribute.semantic === semantic) {
  //     return attribute;
  //   }
  // }
}
*/

//var scratchPositionQuantizationScale = new Cartesian3();
/*
var scratchLocalScale = new Cartesian3();
var scratchModelMatrix = new Matrix4();
var cartesian3One = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));
var cartesian4One = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));
*/

/*
function getPositionQuantizationMatrix(positionAttribute) {
  var quantization = positionAttribute.quantization;
  var quantizedVolumeScale = Cartesian3.divideByScalar(
    quantization.quantizedVolumeDimensions,
    quantization.normalizationRange,
    scratchPositionQuantizationScale
  );
  var quantizedVolumeOffset = quantization.quantizedVolumeOffset;
  return Matrix4.fromTranslationQuaternionRotationScale(
    quantizedVolumeOffset,
    Quaternion.IDENTITY,
    quantizedVolumeScale
  );
}
*/

// TODO: what uniforms are needed for style or for custom shader? E.g. normal might be used for slope rendering but material might be unlit.
// TODO: assign defaults in ModelComponents
// TODO: how to prevent using too many attributes

/*
function usesTextureTransform(texture) {
  return !Matrix3.equals(texture.transform, Matrix3.IDENTITY);
}
*/

/*
function usesTexCoord0(texture) {
  return texture.texCoord === 0;
}
*/

/*
function usesUnlitShader(primitive) {
  var normalAttribute = getAttributeBySemantic(primitive, "NORMAL");
  return !defined(normalAttribute) || primitive.material.unlit;
}
*/

/*
function usesNormalAttribute(primitive) {
  var normalAttribute = getAttributeBySemantic(primitive, "NORMAL");
  return defined(normalAttribute) && !usesUnlitShader(primitive);
}
*/

/*
function usesTangentAttribute(primitive) {
  var tangentAttribute = getAttributeBySemantic(primitive, "TANGENT");
  var usesNormalTexture = defined(primitive.material.normalTexture);
  return (
    defined(tangentAttribute) &&
    usesNormalAttribute(primitive) &&
    usesNormalTexture
  );
}
*/

/*
function getMaterialUniforms(primitive, material, context) {
  var uniformMap = {};
  var uniformProperties = {
    material: material,
  };

  var specularGlossiness = material.specularGlossiness;
  var metallicRoughness = material.metallicRoughness;

  var usesSpecularGlossiness = defined(specularGlossiness);
  var usesMetallicRoughness =
    defined(metallicRoughness) && !usesSpecularGlossiness;

  var unlit = usesUnlitShader(primitive);
  var usesNormals = usesNormalAttribute(primitive);
  var usesTangents = usesTangentAttribute(primitive);

  var usesDiffuseTexture =
    usesSpecularGlossiness && defined(specularGlossiness.diffuseTexture);

  var usesDiffuseTextureTransform =
    usesDiffuseTexture &&
    usesTextureTransform(specularGlossiness.diffuseTexture);

  var usesSpecularGlossinessTexture =
    !unlit &&
    usesSpecularGlossiness &&
    defined(specularGlossiness.specularGlossinessTexture);

  var usesSpecularGlossinessTextureTransform =
    usesSpecularGlossinessTexture &&
    usesTextureTransform(specularGlossiness.specularGlossinessTexture);

  var usesDiffuseFactor =
    usesSpecularGlossiness &&
    !Cartesian4.equals(specularGlossiness.diffuseFactor, cartesian4One);

  var usesSpecularFactor =
    !unlit &&
    usesSpecularGlossiness &&
    !Cartesian3.equals(specularGlossiness.specularFactor, cartesian3One);

  var usesGlossinessFactor =
    !unlit &&
    usesSpecularGlossiness &&
    specularGlossiness.glossinessFactor !== 1.0;

  var usesBaseColorTexture =
    usesMetallicRoughness && defined(metallicRoughness.baseColorTexture);

  var usesBaseColorTextureTransform =
    usesBaseColorTexture &&
    usesTextureTransform(metallicRoughness.baseColorTexture);

  var usesBaseColorTexCoord0 =
    usesBaseColorTexture && usesTexCoord0(metallicRoughness.baseColorTexture);

  var usesMetallicRoughnessTexture =
    !unlit &&
    usesMetallicRoughness &&
    defined(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTextureTransform =
    usesMetallicRoughnessTexture &&
    usesTextureTransform(metallicRoughness.metallicRoughnessTexture);

  var usesMetallicRoughnessTexCoord0 =
    usesMetallicRoughnessTexture &&
    usesTexCoord0(metallicRoughness.metallicRoughnessTexture);

  var usesBaseColorFactor =
    usesMetallicRoughness &&
    !Cartesian3.equals(metallicRoughness.baseColorFactor, cartesian4One);

  var usesMetallicFactor =
    !unlit && usesMetallicRoughness && metallicRoughness.metallicFactor !== 1.0;

  var usesRoughnessFactor =
    !unlit &&
    usesMetallicRoughness &&
    metallicRoughness.roughnessFactor !== 1.0;

  var usesEmissiveTexture = !unlit && defined(material.emissiveTexture);

  var usesEmissiveTextureTransform =
    usesEmissiveTexture && usesTextureTransform(material.emissiveTexture);

  var usesEmissiveTexCoord0 =
    usesEmissiveTexture && usesTexCoord0(material.emissiveTexture);

  var usesNormalTexture =
    defined(material.normalTexture) &&
    usesNormals &&
    (usesTangents || context.standardDerivatives);

  var usesNormalTextureTransform =
    usesNormalTexture && usesTextureTransform(material.normalTexture);

  var usesNormalTexCoord0 =
    usesNormalTexture && usesTexCoord0(material.normalTexture);

  var usesOcclusionTexture = !unlit && defined(material.occlusionTexture);

  var usesOcclusionTextureTransform =
    usesOcclusionTexture && usesTextureTransform(material.occlusionTexture);

  var usesOcclusionTexCoord0 =
    usesOcclusionTexture && usesTexCoord0(material.occlusionTexture);

  var usesEmissiveFactor =
    !unlit && !Cartesian3.equals(material.emissiveFactor, Cartesian3.ZERO);

  var usesAlphaCutoff = material.alphaMode === AlphaMode.MASK;

  if (usesDiffuseTexture) {
    uniformMap.u_diffuseTexture = function () {
      return defaultValue(
        this.properties.material.specularGlossiness.diffuseTexture.texture,
        context.defaultTexture // return the default texture if the texture is still loading
      );
    };
  }

  if (usesDiffuseTextureTransform) {
    uniformMap.u_diffuseTextureTransform = function () {
      return this.properties.material.specularGlossiness.diffuseTexture
        .transform;
    };
  }

  if (usesSpecularGlossinessTexture) {
    uniformMap.u_specularGlossinessTexture = function () {
      return defaultValue(
        this.properties.material.specularGlossiness.specularGlossinessTexture
          .texture,
        context.defaultTexture // return the default texture if the texture is still loading
      );
    };
  }

  if (usesSpecularGlossinessTextureTransform) {
    uniformMap.u_specularGlossinessTextureTransform = function () {
      return this.properties.material.specularGlossiness
        .specularGlossinessTexture.transform;
    };
  }

  if (usesDiffuseFactor) {
    uniformMap.u_diffuseFactor = function () {
      return this.properties.material.specularGlossiness.diffuseFactor;
    };
  }

  if (usesSpecularFactor) {
    uniformMap.u_specularFactor = function () {
      return this.properties.material.specularGlossiness.specularFactor;
    };
  }

  if (usesGlossinessFactor) {
    uniformMap.u_glossinessFactor = function () {
      return this.properties.material.specularGlossiness.glossinessFactor;
    };
  }

  if (usesBaseColorTexture) {
    uniformMap.u_baseColorTexture = function () {
      return defaultValue(
        this.properties.material.metallicRoughness.baseColorTexture.texture,
        context.defaultTexture // return the default texture if the texture is still loading
      );
    };
  }

  if (usesBaseColorTextureTransform) {
    uniformMap.u_baseColorTextureTransform = function () {
      return this.properties.material.metallicRoughness.baseColorTexture
        .transform;
    };
  }

  if (usesMetallicRoughnessTexture) {
    uniformMap.u_metallicRoughnessTexture = function () {
      return defaultValue(
        this.properties.material.metallicRoughness.metallicRoughnessTexture
          .texture,
        context.defaultTexture // return the default texture if the texture is still loading
      );
    };
  }

  if (usesMetallicRoughnessTextureTransform) {
    uniformMap.u_metallicRoughnessTextureTransform = function () {
      return this.properties.material.metallicRoughness.metallicRoughnessTexture
        .transform;
    };
  }

  if (usesBaseColorFactor) {
    uniformMap.u_baseColorFactor = function () {
      return this.properties.material.metallicRoughness.baseColorFactor;
    };
  }

  if (usesMetallicFactor || usesRoughnessFactor) {
    uniformProperties.scratchMetallicRoughnessFactor = new Cartesian2();

    uniformMap.u_metallicRoughnessFactor = function () {
      return Cartesian2.fromElements(
        this.properties.material.metallicRoughness.metallicFactor,
        this.properties.material.metallicRoughness.roughnessFactor,
        this.properties.scratchMetallicRoughnessFactor
      );
    };
  }

  if (usesEmissiveTexture) {
    uniformMap.u_emissiveTexture = function () {
      return defaultValue(
        this.properties.material.emissiveTexture.texture,
        context.defaultTexture // TODO: this might look bright
      );
    };
  }

  if (usesEmissiveTextureTransform) {
    uniformMap.u_emissiveTextureTransform = function () {
      return this.properties.material.emissiveTexture.transform;
    };
  }

  if (usesNormalTexture) {
    uniformMap.u_normalTexture = function () {
      return defaultValue(
        this.properties.material.normalTexture.texture,
        context.defaultTexture // TODO: this is wrong
      );
    };
  }

  if (usesNormalTextureTransform) {
    uniformMap.u_normalTextureTransform = function () {
      return this.properties.material.normaTexture.transform;
    };
  }

  if (usesOcclusionTexture) {
    uniformMap.u_occlusionTexture = function () {
      return defaultValue(
        this.properties.material.occlusionTexture.texture,
        context.defaultTexture // return the default texture if the texture is still loading
      );
    };
  }

  if (usesOcclusionTextureTransform) {
    uniformMap.u_occlusionTextureTransform = function () {
      return this.properties.material.occlusionTexture.transform;
    };
  }

  if (usesEmissiveFactor) {
    uniformMap.u_emissiveFactor = function () {
      return this.properties.material.emissiveFactor;
    };
  }

  if (usesAlphaCutoff) {
    uniformMap.u_alphaCutoff = function () {
      return this.properties.material.alphaCutoff;
    };
  }

  return {
    uniformMap: uniformMap,
    uniformProperties: uniformProperties,
  };
}
*/

/*
function getPositionUniforms(positionAttribute) {
  var uniformMap = {};
  var uniformProperties = {};

  var positionQuantization = positionAttribute.quantization;
  if (defined(positionQuantization)) {
    var dequantizationOffset = positionQuantization.quantizedVolumeOffset;
    var dequantizationScale = Cartesian3.divideByScalar(
      positionQuantization.quantizedVolumeDimensions,
      positionQuantization.normalizationRange,
      new Cartesian3()
    );

    uniformProperties.positionDequantizationOffset = dequantizationOffset;
    uniformProperties.positionDequantizationScale = dequantizationScale;

    uniformMap.u_positionDequantizationOffset = function () {
      return this.properties.positionDequantizationOffset;
    };
    uniformMap.u_positionDequantizationScale = function () {
      return this.properties.positionDequantizationScale;
    };
  }

  return {
    uniformMap: uniformMap,
    uniformProperties: uniformProperties,
  };
}
*/

/*
function getNormalUniforms(node, positionAttribute, normalAttribute, context) {
  var uniformMap = {};
  var uniformProperties = {
    scratchNormalMatrix: new Matrix3(),
  };

  var normalQuantization = normalAttribute.quantization;
  if (defined(normalQuantization)) {
    if (normalQuantization.octEncoded) {
      uniformProperties.normalOctEncodedRange =
        normalQuantization.normalizationRange.x;
      uniformMap.u_normalOctEncodedRange = function () {
        return this.properties.normalOctEncodedRange;
      };
    } else {
      var dequantizationScale = Cartesian3.divideComponents(
        cartesian3One,
        normalQuantization.normalizationRange,
        new Cartesian3()
      );
      uniformProperties.normalDequantizationScale = dequantizationScale;
      uniformMap.u_normalDequantizationScale = function () {
        return this.properties.normalDequantizationScale;
      };
    }
  }

  if (
    positionAttribute.componentDatatype !== ComponentDatatype.FLOAT &&
    !defined(node.instances) &&
    !defined(node.skin)
  ) {
    // Important caveat when dealing with the KHR_mesh_quantization extension.
    // The extension says:
    //
    //   To simplify implementation requirements, the extension relies on
    //   existing ways to specify geometry transformation instead of adding
    //   special dequantization transforms to the schema.
    //
    // This means the dequantization offset/scale used to convert quantized
    // positions to object-space positions is baked into the node matrix. When
    // the x, y, and z axes have different quantization scales the node matrix
    // will have a non-uniform scale. This has undesired consequences when
    // transforming normals and tangents and the spec cautions against it:
    //
    //   To preserve the direction of normal/tangent vectors, it is
    //   recommended that the quantization scale specified in the transform
    //   is uniform across X/Y/Z axes.
    //
    // However not all exporters will follow these guidelines nor should they
    // if a single axis can be compressed with less bits than the others like
    // when using the EXT_meshopt_compression extension.
    //
    // To fix this the quantization scale needs to be factored out of the model
    // matrix when creating the normal matrix. However it's difficult to distinguish
    // non-uniform quantization scale from non-uniform scale produced by the scene
    // graph (e.g. stretching a parent node with an animation). The code below attempts
    // to do this by factoring out the quantization scale from the node's local
    // matrix rather than the computed model matrix.
    //
    // This workaround doesn't work in the following cases:
    //   1. The local matrix has a baked-in non-uniform scale and a baked-in
    //      non-uniform quantization scale. It's not possible to extract just
    //      the quantization scale in this case.
    //   2. The non-uniform quantization scale is baked into the instance
    //      translation, rotation, scale attributes. In general instanced models
    //      should be compressed with uniform quantization scale.
    //   3. The non-uniform quantization scale is baked into the inverse bind
    //      matrices of the skin. In general skinned models should be compressed
    //      with uniform quantization scale.
    uniformProperties.localMatrix = node._localMatrix;
  }

  uniformMap.u_normalMatrix = function () {
    var modelMatrix = this.properties.computedMatrix;
    var localMatrix = this.properties.localMatrix;
    var normalMatrix = this.properties.scratchNormalMatrix;

    if (defined(localMatrix)) {
      var localScale = Matrix4.getScale(localMatrix, scratchLocalScale);
      var inverseLocalScale = Cartesian3.divideComponents(
        cartesian3One,
        localScale,
        localScale
      );
      modelMatrix = Matrix4.multiplyByScale(
        modelMatrix,
        inverseLocalScale,
        scratchModelMatrix
      );
    }

    var modelViewMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      context.uniformState.view,
      scratchModelMatrix
    );

    var inverseModelViewMatrix = Matrix4.inverseTransformation(
      modelViewMatrix,
      scratchModelMatrix
    );

    normalMatrix = Matrix4.getMatrix3(inverseModelViewMatrix, normalMatrix);
    normalMatrix = Matrix3.transpose(normalMatrix, normalMatrix);

    return normalMatrix;
  };

  return {
    uniformMap: uniformMap,
    uniformProperties: uniformProperties,
  };
}
*/

/*
function getTangentUniforms(
  node,
  positionAttribute,
  tangentAttribute,
  context
) {
  var uniformMap = {};
  var uniformProperties = {
    scratchTangentMatrix: new Matrix3(),
  };

  var tangentQuantization = tangentAttribute.quantization;
  if (defined(tangentQuantization)) {
    if (tangentQuantization.octEncoded) {
      uniformProperties.tangentOctEncodedRange =
        tangentQuantization.normalizationRange.x;
      uniformMap.u_tangentOctEncodedRange = function () {
        return this.properties.tangentOctEncodedRange;
      };
    } else {
      var dequantizationScale = Cartesian3.divideComponents(
        cartesian3One,
        tangentQuantization.normalizationRange,
        new Cartesian3()
      );
      uniformProperties.tangentDequantizationScale = dequantizationScale;
      uniformMap.u_tangentDequantizationScale = function () {
        return this.properties.tangentDequantizationScale;
      };
    }
  }

  if (
    positionAttribute.componentDatatype !== ComponentDatatype.FLOAT &&
    !defined(node.instances) &&
    !defined(node.skin)
  ) {
    // See caveat about KHR_mesh_quantization above
    uniformProperties.localMatrix = node._localMatrix;
  }

  uniformMap.u_tangentMatrix = function () {
    var modelMatrix = this.properties.computedMatrix;
    var localMatrix = this.properties.localMatrix;
    var tangentMatrix = this.properties.scratchTangentMatrix;

    if (defined(localMatrix)) {
      var localScale = Matrix4.getScale(localMatrix, scratchLocalScale);
      var inverseLocalScale = Cartesian3.divideComponents(
        cartesian3One,
        localScale,
        localScale
      );
      modelMatrix = Matrix4.multiplyByScale(
        modelMatrix,
        inverseLocalScale,
        scratchModelMatrix
      );
    }

    var modelViewMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      context.uniformState.view,
      scratchModelMatrix
    );

    tangentMatrix = Matrix4.getMatrix3(modelViewMatrix, tangentMatrix);
    return tangentMatrix;
  };

  return {
    uniformMap: uniformMap,
    uniformProperties: uniformProperties,
  };
}
*/

/*
function combineUniforms(a, b) {
  a.uniformMap = combine(a.uniformMap, b.uniformMap);
  a.uniformProperties = combine(a.uniformProperties, b.uniformProperties);
  return a;
}
*/

/*
function getAttributeUniforms(node, primitive, context) {
  var positionAttribute = getAttributeBySemantic(primitive, "POSITION");
  var normalAttribute = getAttributeBySemantic(primitive, "NORMAL");
  var tangentAttribute = getAttributeBySemantic(primitive, "TANGENT");

  var usesNormals = usesNormalAttribute(primitive);
  var usesTangents = usesTangentAttribute(primitive);

  var uniforms = {
    uniformMap: {},
    uniformProperties: {},
  };

  var positionUniforms = getPositionUniforms(node, positionAttribute, context);
  combineUniforms(uniforms, positionUniforms);

  if (usesNormals) {
    var normalUniforms = getNormalUniforms(
      node,
      positionAttribute,
      normalAttribute,
      context
    );
    combineUniforms(uniforms, normalUniforms);
  }

  if (usesTangents) {
    var tangentUniforms = getTangentUniforms(
      node,
      positionAttribute,
      tangentAttribute,
      context
    );
    combineUniforms(uniforms, tangentUniforms);
  }

  return uniforms;
}
*/

/*
function getUniformMap(model, node, primitive, context) {
  // TODO: model matrix dirty
  // TODO: i3dm has instance matrices in world space but EXT_mesh_gpu_instancing has then in object space

  var material = primitive.material;

  var uniforms = {
    uniformMap: {},
    uniformProperties: {},
  };

  var attributeUniforms = getAttributeUniforms(node, primitive, context);
  combineUniforms(uniforms, attributeUniforms);

  var materialUniforms = getMaterialUniforms(primitive, material, context);
  combineUniforms(uniforms, materialUniforms);

  return combine(uniforms.uniformMap, {
    // make a separate object so that changes to the properties are seen on
    // derived commands that combine another uniform map with this one.
    properties: uniforms.uniformProperties,
  });

  return uniforms;
}
*/

function createCommands(model, frameState) {
  /*
  frameState.context.cache.modelShaderCache = defaultValue(
    frameState.context.cache.modelShaderCache,
    {}
  );

  var i;
  var j;
  var attribute;
  var pickId;

  var context = frameState.context;
  var allowPicking = model._allowPicking;
  var components = model._components;
  var scene = components.scene;
  var nodes = scene.nodes;
  var nodesLength = nodes.length;
  var featureMetadata = components.featureMetadata;

  var stack = scratchStack;
  stack.length = 0;

  for (i = 0; i < nodesLength; ++i) {
    stack.push(nodes[i]);
  }

  while (stack.length > 0) {
    var node = stack.pop();
    var primitives = node.primitives;
    var primitivesLength = primitives.length;

    for (i = 0; i < primitivesLength; ++i) {
      var primitive = primitives[i];
      var attributes = primitive.attributes.slice(); // Make a shallow copy
      var attributesLength = attributes.length;

      var positionIndex = -1;
      for (j = 0; j < attributesLength; ++j) {
        attribute = attributes[j];
        if (attribute.semantic === "POSITION") {
          positionIndex = j;
          break;
        }
      }

      if (positionIndex === -1) {
        // No position attribute. Skip this primitive.
        continue;
      }

      // Set the position attribute to the 0th index. In some WebGL implementations the shader
      // will not work correctly if the 0th attribute is not active. For example, some glTF models
      // list the normal attribute first but derived shaders like the cast-shadows shader do not use
      // the normal attribute.
      if (positionIndex > 0) {
        var attributeToSwap = attributes[0];
        attributes[0] = attributes[positionIndex];
        attributes[positionIndex] = attributeToSwap;
      }

      var positionAttribute = attributes[0];
      var boundingSphere = getBoundingSphere(positionAttribute);

      var uniformMap = {};
      var vertexAttributes = [];

      var metadataVertexAttributes = getMetadataVertexAttributes(
        featureMetadata
      );
      attributes.push.apply(attributes, metadataVertexAttributes);

      for (j = 0; j < attributesLength; ++j) {
        attribute = attributes[j];
        var semantic = attribute.semantic;
        var type = attribute.type;
        var componentDatatype = attribute.componentDatatype;
        var normalized = attribute.normalized;

        var quantization = attribute.quantization;
        if (defined(quantization)) {
          type = quantization.type;
          componentDatatype = quantization.componentDatatype;
          normalized = false; // Normalization happens through either uniforms or shader

          var attributeName = semantic;
          if (attributeName.charAt(0) === "_") {
            attributeName = attributeName.slice(1);
          }
          attributeName = attributeName.toLowerCase();

          if (quantization.octEncoded) {
            uniformMap[
              "u_octEncodedRange_" + attributeName
            ] = getUniformFunction(quantization.normalizationRange);
          } else {
            var quantizedVolumeOffset = quantization.quantizedVolumeOffset;
            var quantizedVolumeDimensions =
              quantization.quantizedVolumeDimensions;
            var normalizationRange = quantization.normalizationRange;
            var quantizedVolumeScale;

            var MathType = AttributeType.getMathType(type);
            if (MathType === Number) {
              quantizedVolumeScale =
                quantizedVolumeDimensions / normalizationRange;
            } else {
              quantizedVolumeScale = MathType.clone(quantizedVolumeDimensions);
              MathType.divideByScalar(quantizedVolumeScale, normalizationRange);
            }

            uniformMap["u_quantizedVolumeOffset"];

            uniformMap[
              "u_quantizedVolumeScale_" + attributeName
            ] = getUniformFunction(quantizedVolumeScale);
          }

          // var uniformVarName = "model_quantizedVolumeScaleAndOctEncodedRange_" + attribute.toLowerCase();
          // var
        }

        var componentsPerAttribute = numberOfComponentsForType(type);

        vertexAttributes.push({
          index: j,
          vertexBuffer: attribute.buffer,
          componentsPerAttribute: componentsPerAttribute,
          componentDatatype: componentDatatype,
          normalize: normalized,
          offsetInBytes: attribute.byteOffset,
          strideInBytes: attribute.byteStride,
        });
      }

      var indices = primitive.indices;
      var indexBuffer = defined(indices) ? indices.buffer : undefined;
      var count = defined(indices) ? indices.count : positionAttribute.count;
      var offset = 0;

      var vertexArray = new VertexArray({
        context: context,
        attributes: vertexAttributes,
        indexBuffer: indexBuffer,
      });

      // var renderState = RenderState.fromCache({}); // TODO
      // var isTranslucent = true; // TODO

      // var owner = model._pickObject; // TODO
      // if (!defined(owner)) {
      //   owner = {
      //     primitive: model,
      //     id: model.id,
      //     node: undefined, //runtimeNode.publicNode,
      //     mesh: undefined, //runtimeMeshesByName[mesh.name],
      //   };
      // }

      // pickId = undefined;
      // if (allowPicking && !defined(model._uniformMapLoaded)) {
      //   pickId = context.createPickId(owner);
      //   pickIds.push(pickId);
      //   var pickUniforms = {
      //     czm_pickColor: createPickColorFunction(pickId.color),
      //   };
      //   uniformMap = combine(uniformMap, pickUniforms);
      // }

      // if (allowPicking) {
      //   if (defined(model._pickIdLoaded) && defined(model._uniformMapLoaded)) {
      //     pickId = model._pickIdLoaded();
      //   } else {
      //     pickId = "czm_pickColor";
      //   }
      // }

      // var command = new DrawCommand({
      //   boundingVolume: boundingSphere,
      //   cull: model.cull, // TODO
      //   modelMatrix: new Matrix4(),
      //   primitiveType: primitive.mode,
      //   vertexArray: vertexArray,
      //   count: count,
      //   offset: offset,
      //   shaderProgram: rendererPrograms[programId],
      //   castShadows: castShadows,
      //   receiveShadows: receiveShadows,
      //   uniformMap: uniformMap,
      //   renderState: renderState,
      //   owner: owner,
      //   pass: isTranslucent ? Pass.TRANSLUCENT : model.opaquePass,
      //   pickId: pickId,
      // });
    }
  }

  // if (defined(this._root)) {
  //   var stack = scratchStack;
  //   stack.push(this._root);

  //   while (stack.length > 0) {
  //     var tile = stack.pop();
  //     tile.destroy();

  //     var children = tile.children;
  //     var length = children.length;
  //     for (var i = 0; i < length; ++i) {
  //       stack.push(children[i]);
  //     }
  //   }
  // }
  */
}

function update(model) {}
