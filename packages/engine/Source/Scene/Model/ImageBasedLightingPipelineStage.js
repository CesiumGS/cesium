import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ImageBasedLightingStageFS from "../../Shaders/Model/ImageBasedLightingStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import SpecularEnvironmentCubeMap from "../SpecularEnvironmentCubeMap.js";
import Cartesian2 from "../../Core/Cartesian2.js";

const ImageBasedLightingPipelineStage = {
  name: "ImageBasedLightingPipelineStage", // Helps with debugging
};

const scratchCartesian = new Cartesian2();

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
  frameState,
) {
  const imageBasedLighting = model.imageBasedLighting;
  const environmentMapManager = model.environmentMapManager;
  const shaderBuilder = renderResources.shaderBuilder;

  // If environment maps or spherical harmonics are not specifically provided, use procedural lighting.
  let specularEnvironmentMapAtlas;
  if (!defined(imageBasedLighting.specularEnvironmentMaps)) {
    specularEnvironmentMapAtlas = environmentMapManager.radianceCubeMap;
  }
  const sphericalHarmonicCoefficients =
    imageBasedLighting.sphericalHarmonicCoefficients ??
    environmentMapManager.sphericalHarmonicCoefficients;

  shaderBuilder.addDefine(
    "USE_IBL_LIGHTING",
    undefined,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addUniform(
    "vec2",
    "model_iblFactor",
    ShaderDestination.FRAGMENT,
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
        ShaderDestination.FRAGMENT,
      );
    }

    if (defined(specularEnvironmentMapAtlas)) {
      shaderBuilder.addDefine(
        "COMPUTE_POSITION_WC_ATMOSPHERE",
        undefined,
        ShaderDestination.BOTH,
      );
    }

    if (
      defined(sphericalHarmonicCoefficients) &&
      defined(sphericalHarmonicCoefficients[0])
    ) {
      shaderBuilder.addDefine(
        "DIFFUSE_IBL",
        undefined,
        ShaderDestination.FRAGMENT,
      );
      shaderBuilder.addDefine(
        "CUSTOM_SPHERICAL_HARMONICS",
        undefined,
        ShaderDestination.FRAGMENT,
      );
      shaderBuilder.addUniform(
        "vec3",
        "model_sphericalHarmonicCoefficients[9]",
        ShaderDestination.FRAGMENT,
      );
    } else if (imageBasedLighting.useDefaultSphericalHarmonics) {
      shaderBuilder.addDefine(
        "DIFFUSE_IBL",
        undefined,
        ShaderDestination.FRAGMENT,
      );
    }

    if (
      (defined(imageBasedLighting.specularEnvironmentCubeMap) &&
        imageBasedLighting.specularEnvironmentCubeMap.ready) ||
      defined(specularEnvironmentMapAtlas)
    ) {
      shaderBuilder.addDefine(
        "SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT,
      );
      shaderBuilder.addDefine(
        "CUSTOM_SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT,
      );
      shaderBuilder.addUniform(
        "samplerCube",
        "model_specularEnvironmentMaps",
        ShaderDestination.FRAGMENT,
      );
      shaderBuilder.addUniform(
        "float",
        "model_specularEnvironmentMapsMaximumLOD",
        ShaderDestination.FRAGMENT,
      );
    } else if (model.useDefaultSpecularMaps) {
      shaderBuilder.addDefine(
        "SPECULAR_IBL",
        undefined,
        ShaderDestination.FRAGMENT,
      );
    }
  }

  shaderBuilder.addFragmentLines(ImageBasedLightingStageFS);

  const uniformMap = {
    model_iblFactor: function () {
      return Cartesian2.multiplyByScalar(
        imageBasedLighting.imageBasedLightingFactor,
        environmentMapManager?.intensity || 1.0,
        scratchCartesian,
      );
    },
    model_iblReferenceFrameMatrix: function () {
      return model._iblReferenceFrameMatrix;
    },
    model_sphericalHarmonicCoefficients: function () {
      return sphericalHarmonicCoefficients;
    },
    model_specularEnvironmentMaps: function () {
      return imageBasedLighting.specularEnvironmentCubeMap.texture;
    },
    model_specularEnvironmentMapsMaximumLOD: function () {
      return imageBasedLighting.specularEnvironmentCubeMap.maximumMipmapLevel;
    },
  };

  if (defined(specularEnvironmentMapAtlas)) {
    uniformMap.model_specularEnvironmentMaps = function () {
      return specularEnvironmentMapAtlas;
    };
    uniformMap.model_specularEnvironmentMapsMaximumLOD = function () {
      return environmentMapManager.maximumMipmapLevel;
    };
  }

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ImageBasedLightingPipelineStage;
