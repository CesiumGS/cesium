import combine from "../../Core/combine.js";
import defined from "../../Core/defined.js";
import ImageBasedLightingStageFS from "../../Shaders/Model/ImageBasedLightingStageFS.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import OctahedralProjectedCubeMap from "../OctahedralProjectedCubeMap.js";

const ImageBasedLightingPipelineStage = {
  name: "ImageBasedLightingPipelineStage", // Helps with debugging
};

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

  if (OctahedralProjectedCubeMap.isSupported(frameState.context)) {
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
      defined(imageBasedLighting.specularEnvironmentMapAtlas) &&
      imageBasedLighting.specularEnvironmentMapAtlas.ready
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
        "model_specularEnvironmentMaps",
        ShaderDestination.FRAGMENT
      );
      shaderBuilder.addUniform(
        "vec2",
        "model_specularEnvironmentMapsSize",
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
      return imageBasedLighting.specularEnvironmentMapAtlas.texture;
    },
    model_specularEnvironmentMapsSize: function () {
      return imageBasedLighting.specularEnvironmentMapAtlas.texture.dimensions;
    },
    model_specularEnvironmentMapsMaximumLOD: function () {
      return imageBasedLighting.specularEnvironmentMapAtlas.maximumMipmapLevel;
    },
  };

  renderResources.uniformMap = combine(uniformMap, renderResources.uniformMap);
};

export default ImageBasedLightingPipelineStage;
