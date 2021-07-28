import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import AlphaMode from "../AlphaMode.js";
import LightingModel from "./LightingModel.js";
import MaterialStageFS from "../../Shaders/ModelExperimental/MaterialStageFS.js";

export default function MaterialPipelineStage() {}

/**
 * TODO
 * @param {PrimitiveRenderResources} renderResources
 * @param {ModelComponents.Primitive} primitive
 * @private
 */
MaterialPipelineStage.process = function (renderResources, primitive) {
  var material = primitive.material;

  var uniformMap = renderResources.uniformMap;
  var shaderBuilder = renderResources.shaderBuilder;

  processMaterialUniforms(material, uniformMap, shaderBuilder);

  if (defined(material.specularGlossiness)) {
    processSpecularGlossinessUniforms(material, uniformMap, shaderBuilder);
  } else {
    processMetallicRoughnessUniforms(material, uniformMap, shaderBuilder);
  }

  var lightingOptions = renderResources.lightingOptions;
  if (material.unlit) {
    lightingOptions.lightingModel = LightingModel.UNLIT;
  } else {
    lightingOptions.lightingModel = LightingModel.PBR;
  }

  // Configure back-face culling
  renderResources.renderStateOptions.cull = {
    enabled: !material.doubleSided,
  };

  addAlphaUniforms(material, uniformMap, shaderBuilder);

  shaderBuilder.addFragmentLines([MaterialStageFS]);
};

function processMaterialUniforms(material, uniformMap, shaderBuilder) {
  var texCoordIndex;

  var emissiveTexture = material.emissiveTexture;
  if (defined(emissiveTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_emissiveTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_emissiveTexture = function () {
      return material.emissiveTexture.texture;
    };
    texCoordIndex = emissiveTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_EMISSIVE_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_EMISSIVE",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var emissiveFactor = material.emissiveFactor;
  if (defined(emissiveFactor)) {
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
    shaderBuilder.addUniform(
      "sampler2D",
      "u_normalTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_normalTexture = function () {
      return material.normalTexture.texture;
    };
    texCoordIndex = normalTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_NORMAL_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_NORMAL",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var occlusionTexture = material.occlusionTexture;
  if (defined(occlusionTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_occlusionTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_occlusionTexture = function () {
      return material.occlusionTexture.texture;
    };
    texCoordIndex = occlusionTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_OCCLUSION_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_OCCLUSION",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }
}

function processSpecularGlossinessUniforms(
  material,
  uniformMap,
  shaderBuilder
) {
  var specularGlossiness = material.specularGlossiness;
  var texCoordIndex;
  shaderBuilder.addDefine(
    "USE_SPECULAR_GLOSSINESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  var diffuseTexture = specularGlossiness.diffuseTexture;
  if (defined(specularGlossiness.diffuseTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_diffuseTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_diffuseTexture = function () {
      return specularGlossiness.diffuseTexture.texture;
    };
    texCoordIndex = diffuseTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_DIFFUSE_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_DIFFUSE",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var diffuseFactor = specularGlossiness.diffuseFactor;
  if (defined(diffuseFactor)) {
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
  if (defined(specularGlossiness.specularGlossinessTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_specularGlossinessTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_specularGlossinessTexture = function () {
      return specularGlossiness.diffuseTexture.texture;
    };
    texCoordIndex = specularGlossinessTexture.texCoord;
    shaderBuilder.addDefine(
      "TEXCOORD_DIFFUSE",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var specularFactor = specularGlossiness.specularFactor;
  if (defined(specularFactor)) {
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
  if (defined(glossinessFactor)) {
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

function processMetallicRoughnessUniforms(material, uniformMap, shaderBuilder) {
  var metallicRoughness = material.metallicRoughness;
  shaderBuilder.addDefine(
    "USE_METALLIC_ROUGHNESS",
    undefined,
    ShaderDestination.FRAGMENT
  );

  var texCoordIndex;
  var baseColorTexture = metallicRoughness.baseColorTexture;
  if (defined(baseColorTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_baseColorTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_baseColorTexture = function () {
      return metallicRoughness.baseColorTexture.texture;
    };
    texCoordIndex = baseColorTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_BASE_COLOR_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_BASE_COLOR",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var metallicRoughnessTexture = metallicRoughness.metallicRoughnessTexture;
  if (defined(metallicRoughnessTexture)) {
    shaderBuilder.addUniform(
      "sampler2D",
      "u_metallicRoughnessTexture",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_metallicRoughnessTexture = function () {
      return metallicRoughness.metallicRoughnessTexture.texture;
    };
    texCoordIndex = metallicRoughnessTexture.texCoord;
    shaderBuilder.addDefine(
      "HAS_METALLIC_ROUGHNESS_TEXTURE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "TEXCOORD_METALLIC_ROUGHNESS",
      "v_texCoord_" + texCoordIndex,
      ShaderDestination.FRAGMENT
    );
  }

  var baseColorFactor = metallicRoughness.baseColorFactor;
  if (defined(baseColorFactor)) {
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

  var roughnessFactor = metallicRoughness.roughnessFactor;
  if (defined(roughnessFactor)) {
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

  var metallicFactor = metallicRoughness.metallicFactor;
  if (defined(metallicFactor)) {
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
}

function addAlphaUniforms(material, uniformMap, shaderBuilder) {
  var alphaMode = material.alphaMode;
  if (alphaMode === AlphaMode.MASK) {
    shaderBuilder.addDefine(
      "ALPHA_MODE_MASK",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addUniform(
      "float",
      "u_alphaCutoff",
      ShaderDestination.FRAGMENT
    );
    uniformMap.u_alphaCutoff = function () {
      return material.alphaCutoff;
    };
  } else if (alphaMode === AlphaMode.BLEND) {
    shaderBuilder.addDefine(
      "ALPHA_MODE_BLEND",
      undefined,
      ShaderDestination.FRAGMENT
    );
  } else {
    shaderBuilder.addDefine(
      "ALPHA_MODE_OPAQUE",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
}
