import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import Matrix3 from "../../Core/Matrix3.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Pass from "../../Renderer/Pass.js";
import MaterialStageFS from "../../Shaders/ModelExperimental/MaterialStageFS.js";
import AlphaMode from "../AlphaMode.js";
import ModelComponents from "../ModelComponents.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import LightingModel from "./LightingModel.js";
import ModelUtility from "./ModelUtility.js";

const Material = ModelComponents.Material;
const MetallicRoughness = ModelComponents.MetallicRoughness;
const SpecularGlossiness = ModelComponents.SpecularGlossiness;

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
const MaterialPipelineStage = {};
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
  // gltf-pipeline automatically creates a default material so this will always
  // be defined.
  const material = primitive.material;
  const model = renderResources.model;

  // Classification models only use position and feature ID attributes,
  // so textures should be disabled to avoid compile errors.
  const hasClassification = defined(model.classificationType);
  const disableTextures = hasClassification;

  const uniformMap = renderResources.uniformMap;
  const shaderBuilder = renderResources.shaderBuilder;

  // When textures are loaded incrementally, fall back to a default 1x1 texture
  const defaultTexture = frameState.context.defaultTexture;
  const defaultNormalTexture = frameState.context.defaultNormalTexture;
  const defaultEmissiveTexture = frameState.context.defaultEmissiveTexture;

  processMaterialUniforms(
    material,
    uniformMap,
    shaderBuilder,
    defaultTexture,
    defaultNormalTexture,
    defaultEmissiveTexture,
    disableTextures
  );

  if (defined(material.specularGlossiness)) {
    processSpecularGlossinessUniforms(
      material,
      uniformMap,
      shaderBuilder,
      defaultTexture,
      disableTextures
    );
  } else {
    processMetallicRoughnessUniforms(
      material,
      uniformMap,
      shaderBuilder,
      defaultTexture,
      disableTextures
    );
  }

  // If the primitive does not have normals, fall back to unlit lighting.
  const hasNormals = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.NORMAL
  );

  // Classification models will be rendered as unlit.
  const lightingOptions = renderResources.lightingOptions;
  if (material.unlit || !hasNormals || hasClassification) {
    lightingOptions.lightingModel = LightingModel.UNLIT;
  } else {
    lightingOptions.lightingModel = LightingModel.PBR;
  }

  // Configure back-face culling
  const cull = model.backFaceCulling && !material.doubleSided;
  renderResources.renderStateOptions.cull.enabled = cull;

  const alphaOptions = renderResources.alphaOptions;
  if (material.alphaMode === AlphaMode.BLEND) {
    alphaOptions.pass = Pass.TRANSLUCENT;
  } else if (material.alphaMode === AlphaMode.MASK) {
    alphaOptions.alphaCutoff = material.alphaCutoff;
  }

  shaderBuilder.addFragmentLines([MaterialStageFS]);

  if (material.doubleSided) {
    shaderBuilder.addDefine(
      "HAS_DOUBLE_SIDED_MATERIAL",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
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
  const transformDefine = `HAS_${defineName}_TEXTURE_TRANSFORM`;
  shaderBuilder.addDefine(
    transformDefine,
    undefined,
    ShaderDestination.FRAGMENT
  );

  // Add a uniform for the transformation matrix
  const transformUniformName = `${uniformName}Transform`;
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
  const textureDefine = `HAS_${defineName}_TEXTURE`;
  shaderBuilder.addDefine(textureDefine, undefined, ShaderDestination.FRAGMENT);

  // Add a #define to tell the shader which texture coordinates varying to use.
  const texCoordIndex = textureReader.texCoord;
  const texCoordVarying = `v_texCoord_${texCoordIndex}`;
  const texCoordDefine = `TEXCOORD_${defineName}`;
  shaderBuilder.addDefine(
    texCoordDefine,
    texCoordVarying,
    ShaderDestination.FRAGMENT
  );

  // Some textures have matrix transforms (e.g. for texture atlases). Add those
  // to the shader if present.
  const textureTransform = textureReader.transform;
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
  defaultEmissiveTexture,
  disableTextures
) {
  const emissiveTexture = material.emissiveTexture;
  if (defined(emissiveTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      emissiveTexture,
      "u_emissiveTexture",
      "EMISSIVE",
      defaultEmissiveTexture
    );
  }

  const emissiveFactor = material.emissiveFactor;
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

  const normalTexture = material.normalTexture;
  if (defined(normalTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      normalTexture,
      "u_normalTexture",
      "NORMAL",
      defaultNormalTexture
    );
  }

  const occlusionTexture = material.occlusionTexture;
  if (defined(occlusionTexture) && !disableTextures) {
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
  defaultTexture,
  disableTextures
) {
  const specularGlossiness = material.specularGlossiness;
  shaderBuilder.addDefine(
    "USE_SPECULAR_GLOSSINESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  const diffuseTexture = specularGlossiness.diffuseTexture;
  if (defined(diffuseTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      diffuseTexture,
      "u_diffuseTexture",
      "DIFFUSE",
      defaultTexture
    );
  }

  const diffuseFactor = specularGlossiness.diffuseFactor;
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

  const specularGlossinessTexture =
    specularGlossiness.specularGlossinessTexture;
  if (defined(specularGlossinessTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      specularGlossinessTexture,
      "u_specularGlossinessTexture",
      "SPECULAR_GLOSSINESS",
      defaultTexture
    );
  }

  const specularFactor = specularGlossiness.specularFactor;
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

  const glossinessFactor = specularGlossiness.glossinessFactor;
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
  defaultTexture,
  disableTextures
) {
  const metallicRoughness = material.metallicRoughness;
  shaderBuilder.addDefine(
    "USE_METALLIC_ROUGHNESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  const baseColorTexture = metallicRoughness.baseColorTexture;
  if (defined(baseColorTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      baseColorTexture,
      "u_baseColorTexture",
      "BASE_COLOR",
      defaultTexture
    );
  }

  const baseColorFactor = metallicRoughness.baseColorFactor;
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

  const metallicRoughnessTexture = metallicRoughness.metallicRoughnessTexture;
  if (defined(metallicRoughnessTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      metallicRoughnessTexture,
      "u_metallicRoughnessTexture",
      "METALLIC_ROUGHNESS",
      defaultTexture
    );
  }

  const metallicFactor = metallicRoughness.metallicFactor;
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

  const roughnessFactor = metallicRoughness.roughnessFactor;
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
