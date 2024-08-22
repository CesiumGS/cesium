import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ImageBasedLightingStageFS from "../../Shaders/Model/ImageBasedLightingStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SpecularEnvironmentCubeMap from "../SpecularEnvironmentCubeMap.js";

const ImageBasedLightingPipelineStage = {
  name: "ImageBasedLightingPipelineStage", // Helps with debugging
};

/**
 * Add shader code, uniforms, and defines related to image based lighting
 * @param {ModelRenderResources} renderResources
 * @param {Model} model
 * @param {FrameState} frameState
 * @private
 */
ImageBasedLightingPipelineStage.process = function (
  renderResources,
  model,
  frameState
) {
  const imageBasedLighting = model.imageBasedLighting;
  const shaderBuilder = renderResources.shaderBuilder;

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

  if (SpecularEnvironmentCubeMap.isSupported(frameState.context)) {
    const addMatrix =
      imageBasedLighting.useSphericalHarmonics ||
      imageBasedLighting.useSpecularEnvironmentMaps ||
      imageBasedLighting.enabled;
    if (addMatrix) {
      shaderBuilder.addUniform(
        "mat3",
        "model_iblReferenceFrameMatrix",
        ShaderDestination.FRAGMENT
      );
    }

    if (defined(imageBasedLighting.sphericalHarmonicCoefficients)) {
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
    } else if (imageBasedLighting.useDefaultSphericalHarmonics) {
      shaderBuilder.addDefine(
        "DIFFUSE_IBL",
        undefined,
        ShaderDestination.FRAGMENT
      );
    }

    if (
      defined(imageBasedLighting.specularEnvironmentCubeMap) &&
      imageBasedLighting.specularEnvironmentCubeMap.ready
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
        "samplerCube",
        "model_specularEnvironmentMaps",
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "float",
        "model_specularEnvironmentMapsMaximumLOD",
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

  if (defined(imageBasedLighting.luminanceAtZenith)) {
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

  shaderBuilder.addFragmentLines(ImageBasedLightingStageFS);

  const uniformMap = {
    model_iblFactor: function () {
      return imageBasedLighting.imageBasedLightingFactor;
    },
    model_iblReferenceFrameMatrix: function () {
      return model._iblReferenceFrameMatrix;
    },
    model_luminanceAtZenith: function () {
      return imageBasedLighting.luminanceAtZenith;
    },
    model_sphericalHarmonicCoefficients: function () {
      return imageBasedLighting.sphericalHarmonicCoefficients;
    },
    model_specularEnvironmentMaps: function () {
      return imageBasedLighting.specularEnvironmentCubeMap.texture;
    },
    model_specularEnvironmentMapsMaximumLOD: function () {
      return imageBasedLighting.specularEnvironmentCubeMap.maximumMipmapLevel;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ImageBasedLightingPipelineStage;
