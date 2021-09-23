import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import AlphaMode from "../AlphaMode.js";
import LightingModel from "./LightingModel.js";
import MaterialStageFS from "../../Shaders/ModelExperimental/MaterialStageFS.js";
import Pass from "../../Renderer/Pass.js";
import Matrix3 from "../../Core/Matrix3.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import ModelComponents from "../ModelComponents.js";

var Material = ModelComponents.Material;
var MetallicRoughness = ModelComponents.MetallicRoughness;
var SpecularGlossiness = ModelComponents.SpecularGlossiness;

/**
 * The material pipeline stage processes textures and other uniforms needed
 * to render a primitive. This handles the following material types:
 * <ul>
 *   <li>Basic glTF materials (PBR metallic roughness model)</li>
 *   <li>The `KHR_materials_pbrSpecularGlossiness` glTF extension</li>
 *   <li>The `KHR_materials_unlit` glTF extension</li>
 * </ul>
 *
 * @namespace MaterialPipelineStage
 *
 * @private
 */
var MaterialPipelineStage = {};
MaterialPipelineStage.name = "MaterialPipelineStage"; // Helps with debugging

/**
 * Process a primitive. This modifies the following parts of the render
 * resources:
 * <ul>
 *   <li>Modifies the shader to include the material processing stage</li>
 *   <li>Modifies the shader to include additional uniforms for textures and other rendering details</li>
 *   <li>Modifies the lighting options to set either PBR or unlit lighting</li>
 *   <li>Sets the render state for back-face culling</li>
 * </ul>
 * @param {PrimitiveRenderResources} renderResources The render resources for the primitive
 * @param {ModelComponents.Primitive} primitive The primitive to be rendered
 * @param {FrameState} frameState The frame state.
 * @private
 */
MaterialPipelineStage.process = function (
  renderResources,
  primitive,
  frameState
) {
  var material = primitive.material;

  var uniformMap = renderResources.uniformMap;
  var shaderBuilder = renderResources.shaderBuilder;

  // When textures are loaded incrementally, fall back to a default 1x1 texture
  var defaultTexture = frameState.context.defaultTexture;
  var defaultNormalTexture = frameState.context.defaultNormalTexture;
  var defaultEmissiveTexture = frameState.context.defaultEmissiveTexture;

  processMaterialUniforms(
    material,
    uniformMap,
    shaderBuilder,
    defaultTexture,
    defaultNormalTexture,
    defaultEmissiveTexture
  );

  if (defined(material.specularGlossiness)) {
    processSpecularGlossinessUniforms(
      material,
      uniformMap,
      shaderBuilder,
      defaultTexture
    );
  } else {
    processMetallicRoughnessUniforms(
      material,
      uniformMap,
      shaderBuilder,
      defaultTexture
    );
  }

  var lightingOptions = renderResources.lightingOptions;
  if (material.unlit) {
    lightingOptions.lightingModel = LightingModel.UNLIT;
  } else {
    lightingOptions.lightingModel = LightingModel.PBR;
  }

  // Configure back-face culling
  var cull = !material.doubleSided;
  renderResources.renderStateOptions.cull = {
    enabled: cull,
  };

  var alphaOptions = renderResources.alphaOptions;
  alphaOptions.alphaMode = material.alphaMode;
  if (material.alphaMode === AlphaMode.BLEND) {
    alphaOptions.pass = Pass.TRANSLUCENT;
  } else if (material.alphaMode === AlphaMode.MASK) {
    alphaOptions.alphaCutoff = material.alphaCutoff;
  }

  shaderBuilder.addFragmentLines([MaterialStageFS]);
};

/**
 * Process a single texture transformation and add it to the shader and uniform map.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object.<String, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {String} uniformName The name of the sampler uniform such as <code>u_baseColorTexture</code>
 * @param {String} defineName The name of the texture for use in the defines, minus any prefix or suffix. For example, "BASE_COLOR" or "EMISSIVE"
 *
 * @private
 */
function processTextureTransform(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName
) {
  // Add a define to enable the texture transformation code in the shader.
  var transformDefine = "HAS_" + defineName + "_TEXTURE_TRANSFORM";
  shaderBuilder.addDefine(
    transformDefine,
    undefined,
    ShaderDestination.FRAGMENT
  );

  // Add a uniform for the transformation matrix
  var transformUniformName = uniformName + "Transform";
  shaderBuilder.addUniform(
    "mat3",
    transformUniformName,
    ShaderDestination.FRAGMENT
  );
  uniformMap[transformUniformName] = function () {
    return textureReader.transform;
  };
}

/**
 * Process a single texture and add it to the shader and uniform map.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object.<String, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {String} uniformName The name of the sampler uniform such as <code>u_baseColorTexture</code>
 * @param {String} defineName The name of the texture for use in the defines, minus any prefix or suffix. For example, "BASE_COLOR" or "EMISSIVE"
 *
 * @private
 */
function processTexture(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName,
  defaultTexture
) {
  // Add a uniform for the texture itself
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT
  );
  uniformMap[uniformName] = function () {
    return defaultValue(textureReader.texture, defaultTexture);
  };

  // Add a #define directive to enable using the texture in the shader
  var textureDefine = "HAS_" + defineName + "_TEXTURE";
  shaderBuilder.addDefine(textureDefine, undefined, ShaderDestination.FRAGMENT);

  // Add a #define to tell the shader which texture coordinates varying to use.
  var texCoordIndex = textureReader.texCoord;
  var texCoordVarying = "v_texCoord_" + texCoordIndex;
  var texCoordDefine = "TEXCOORD_" + defineName;
  shaderBuilder.addDefine(
    texCoordDefine,
    texCoordVarying,
    ShaderDestination.FRAGMENT
  );

  // Some textures have matrix transforms (e.g. for texture atlases). Add those
  // to the shader if present.
  var textureTransform = textureReader.transform;
  if (
    defined(textureTransform) &&
    !Matrix3.equals(textureTransform, Matrix3.IDENTITY)
  ) {
    processTextureTransform(
      shaderBuilder,
      uniformMap,
      textureReader,
      uniformName,
      defineName
    );
  }
}

function processMaterialUniforms(
  material,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  defaultNormalTexture,
  defaultEmissiveTexture
) {
  var emissiveTexture = material.emissiveTexture;
  if (defined(emissiveTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      emissiveTexture,
      "u_emissiveTexture",
      "EMISSIVE",
      defaultEmissiveTexture
    );
  }

  var emissiveFactor = material.emissiveFactor;
  if (
    defined(emissiveFactor) &&
    !Cartesian3.equals(emissiveFactor, Material.DEFAULT_EMISSIVE_FACTOR)
  ) {
    shaderBuilder.addUniform(
      "vec3",
      "u_emissiveFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_emissiveFactor = function () {
      return material.emissiveFactor;
    };
    shaderBuilder.addDefine(
      "HAS_EMISSIVE_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var normalTexture = material.normalTexture;
  if (defined(normalTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      normalTexture,
      "u_normalTexture",
      "NORMAL",
      defaultNormalTexture
    );
  }

  var occlusionTexture = material.occlusionTexture;
  if (defined(occlusionTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      occlusionTexture,
      "u_occlusionTexture",
      "OCCLUSION",
      defaultTexture
    );
  }
}

function processSpecularGlossinessUniforms(
  material,
  uniformMap,
  shaderBuilder,
  defaultTexture
) {
  var specularGlossiness = material.specularGlossiness;
  shaderBuilder.addDefine(
    "USE_SPECULAR_GLOSSINESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  var diffuseTexture = specularGlossiness.diffuseTexture;
  if (defined(diffuseTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      diffuseTexture,
      "u_diffuseTexture",
      "DIFFUSE",
      defaultTexture
    );
  }

  var diffuseFactor = specularGlossiness.diffuseFactor;
  if (
    defined(diffuseFactor) &&
    !Cartesian4.equals(diffuseFactor, SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR)
  ) {
    shaderBuilder.addUniform(
      "vec4",
      "u_diffuseFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_diffuseFactor = function () {
      return specularGlossiness.diffuseFactor;
    };
    shaderBuilder.addDefine(
      "HAS_DIFFUSE_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var specularGlossinessTexture = specularGlossiness.specularGlossinessTexture;
  if (defined(specularGlossinessTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      specularGlossinessTexture,
      "u_specularGlossinessTexture",
      "SPECULAR_GLOSSINESS",
      defaultTexture
    );
  }

  var specularFactor = specularGlossiness.specularFactor;
  if (
    defined(specularFactor) &&
    !Cartesian3.equals(
      specularFactor,
      SpecularGlossiness.DEFAULT_SPECULAR_FACTOR
    )
  ) {
    shaderBuilder.addUniform(
      "vec3",
      "u_specularFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_specularFactor = function () {
      return specularGlossiness.specularFactor;
    };
    shaderBuilder.addDefine(
      "HAS_SPECULAR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var glossinessFactor = specularGlossiness.glossinessFactor;
  if (
    defined(glossinessFactor) &&
    glossinessFactor !== SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_glossinessFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_glossinessFactor = function () {
      return specularGlossiness.glossinessFactor;
    };
    shaderBuilder.addDefine(
      "HAS_GLOSSINESS_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
}

function processMetallicRoughnessUniforms(
  material,
  uniformMap,
  shaderBuilder,
  defaultTexture
) {
  var metallicRoughness = material.metallicRoughness;
  shaderBuilder.addDefine(
    "USE_METALLIC_ROUGHNESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  var baseColorTexture = metallicRoughness.baseColorTexture;
  if (defined(baseColorTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      baseColorTexture,
      "u_baseColorTexture",
      "BASE_COLOR",
      defaultTexture
    );
  }

  var baseColorFactor = metallicRoughness.baseColorFactor;
  if (
    defined(baseColorFactor) &&
    !Cartesian4.equals(
      baseColorFactor,
      MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR
    )
  ) {
    shaderBuilder.addUniform(
      "vec4",
      "u_baseColorFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_baseColorFactor = function () {
      return metallicRoughness.baseColorFactor;
    };
    shaderBuilder.addDefine(
      "HAS_BASE_COLOR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var metallicRoughnessTexture = metallicRoughness.metallicRoughnessTexture;
  if (defined(metallicRoughnessTexture)) {
    processTexture(
      shaderBuilder,
      uniformMap,
      metallicRoughnessTexture,
      "u_metallicRoughnessTexture",
      "METALLIC_ROUGHNESS",
      defaultTexture
    );
  }

  var metallicFactor = metallicRoughness.metallicFactor;
  if (
    defined(metallicFactor) &&
    metallicFactor !== MetallicRoughness.DEFAULT_METALLIC_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_metallicFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_metallicFactor = function () {
      return metallicRoughness.metallicFactor;
    };
    shaderBuilder.addDefine(
      "HAS_METALLIC_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  var roughnessFactor = metallicRoughness.roughnessFactor;
  if (
    defined(roughnessFactor) &&
    roughnessFactor !== MetallicRoughness.DEFAULT_ROUGHNESS_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_roughnessFactor",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_roughnessFactor = function () {
      return metallicRoughness.roughnessFactor;
    };
    shaderBuilder.addDefine(
      "HAS_ROUGHNESS_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
}

// Exposed for testing
MaterialPipelineStage._processTexture = processTexture;
MaterialPipelineStage._processTextureTransform = processTextureTransform;

export default MaterialPipelineStage;
