import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import OctahedralProjectedCubeMap from "../OctahedralProjectedCubeMap.js";

var ImageBasedLightingPipelineStage = {};

ImageBasedLightingPipelineStage.name = "ImageBasedLightingPipelineStage"; // Helps with debugging

ImageBasedLightingPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  var iblParameters = model.imageBasedLightingParameters;
  var shaderBuilder = renderResources.shaderBuilder;

  // TODO: should we short circuit if this is false?
  if (iblParameters.isEnabled) {
    shaderBuilder.addDefine(
      "USE_IBL_LIGHTING",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addUniform(
      "vec2",
      "model_iblFactor",
      ShaderDestination.FRAGMENT
    );
  }

  if (defined(iblParameters.lightColor)) {
    shaderBuilder.addDefine(
      "USE_CUSTOM_LIGHT_COLOR",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addUniform(
      "vec3",
      "model_lightColor",
      ShaderDestination.FRAGMENT
    );
  }

  if (OctahedralProjectedCubeMap.isSupported(frameState.context)) {
    // TODO: This should check iblParameters
    var usesSH =
      defined(iblParameters.sphericalHarmonicCoefficients) ||
      model._useDefaultSphericalHarmonics;
    var usesSM =
      (defined(model._specularEnvironmentMapAtlas) &&
        model._specularEnvironmentMapAtlas.ready) ||
      model._useDefaultSpecularMaps;
    var addMatrix = usesSH || usesSM || iblParameters.isEnabled;
    if (addMatrix) {
      shaderBuilder.addUniform(
        "mat3",
        "model_iblReferenceFrameMatrix",
        ShaderDestination.FRAGMENT
      );
    }

    if (defined(iblParameters.sphericalHarmonicCoefficients)) {
      shaderBuilder.addDefine(
        "DIFFUSE_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addDefine(
        "CUSTOM_SPHERICAL_HARMONICS",
        undefined,
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "vec3",
        "model_sphericalHarmonicCoefficients[9]",
        ShaderDestination.FRAGMENT
      );
      // TODO: add this to IBL parameters object
    } else if (iblParameters.useDefaultSphericalHarmonics) {
      shaderBuilder.addDefine(
        "DIFFUSE_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
    }

    if (
      defined(iblParameters.specularEnvironmentMapAtlas) &&
      iblParameters.specularEnvironmentMapAtlas.ready
    ) {
      shaderBuilder.addDefine(
        "SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addDefine(
        "CUSTOM_SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "sampler2D",
        "model_specularMap",
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "vec2",
        "model_specularMapSize",
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "float",
        "model_maxSpecularLOD",
        ShaderDestination.FRAGMENT
      );
    } else if (model.useDefaultSpecularMaps) {
      shaderBuilder.addDefine(
        "SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
    }
  }

  if (defined(iblParameters.luminanceAtZenith)) {
    shaderBuilder.addDefine(
      "USE_SUN_LUMINANCE",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addUniform(
      "float",
      "model_luminanceAtZenith",
      ShaderDestination.FRAGMENT
    );
  }

  var uniformMap = {
    model_iblFactor: function () {
      return iblParameters.imageBasedLightingFactor;
    },
    model_iblReferenceFrameMatrix: function () {
      return iblParameters.iblReferenceFrameMatrix;
    },
    model_lightColor: function () {
      return iblParameters.lightColor;
    },
    model_luminanceAtZenith: function () {
      return iblParameters.luminanceAtZenith;
    },
    model_sphericalHarmonicCoefficients: function () {
      return iblParameters.sphericalHarmonicCoefficients;
    },
    model_specularMap: function () {
      return iblParameters.specularEnvironmentMapAtlas.texture;
    },
    model_specularMapSize: function () {
      return iblParameters.specularEnvironmentMapAtlas.dimensions;
    },
    model_maxSpecularLOD: function () {
      return iblParameters.specularEnvironmentMapAtlas.maximumMipmapLevel;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ImageBasedLightingPipelineStage;
