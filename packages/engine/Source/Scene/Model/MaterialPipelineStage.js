import defined from "../../Core/defined.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Transforms from "../../Core/Transforms.js";
import ShaderDestination from "../../Renderer/ShaderDestination.js";
import Pass from "../../Renderer/Pass.js";
import MaterialStageFS from "../../Shaders/Model/MaterialStageFS.js";
import ConstantLodStageVS from "../../Shaders/Model/ConstantLodStageVS.js";
import ConstantLodStageFS from "../../Shaders/Model/ConstantLodStageFS.js";
import AlphaMode from "../AlphaMode.js";
import ModelComponents from "../ModelComponents.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import LightingModel from "./LightingModel.js";
import ModelUtility from "./ModelUtility.js";

const { Material, MetallicRoughness, SpecularGlossiness, Specular, Clearcoat } =
  ModelComponents;

/**
 * The material pipeline stage processes textures and other uniforms needed
 * to render a primitive. This handles the following material types:
 * <ul>
 *   <li>Basic glTF materials (PBR metallic roughness model)</li>
 *   <li>The `KHR_materials_specular` glTF extension</li>
 *   <li>The `KHR_materials_pbrSpecularGlossiness` glTF extension</li>
 *   <li>The `KHR_materials_unlit` glTF extension</li>
 * </ul>
 *
 * @namespace MaterialPipelineStage
 *
 * @private
 */
const MaterialPipelineStage = {
  name: "MaterialPipelineStage", // Helps with debugging

  // Expose some methods for testing
  _processTexture: processTexture,
  _processTextureTransform: processTextureTransform,
};

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
  frameState,
) {
  // gltf-pipeline automatically creates a default material so this will always
  // be defined.
  const material = primitive.material;
  const { model, uniformMap, shaderBuilder } = renderResources;

  if (!defined(uniformMap.u_constantLodDistance)) {
    uniformMap.u_constantLodDistance = function () {
      const boundingSphere = model.boundingSphere;
      const camera = frameState.camera;

      if (defined(boundingSphere) && defined(camera)) {
        const distance = Cartesian3.distance(
          camera.positionWC,
          boundingSphere.center,
        );
        return Math.max(distance, 0.1);
      }

      return 100.0;
    };
  }

  // Classification models only use position and feature ID attributes,
  // so textures should be disabled to avoid compile errors.
  const hasClassification = defined(model.classificationType);
  const disableTextures = hasClassification;

  // When textures are loaded incrementally, fall back to a default 1x1 texture
  const { defaultTexture, defaultNormalTexture, defaultEmissiveTexture } =
    frameState.context;

  processMaterialUniforms(
    material,
    uniformMap,
    shaderBuilder,
    defaultTexture,
    defaultNormalTexture,
    defaultEmissiveTexture,
    disableTextures,
    renderResources,
  );

  if (defined(material.specularGlossiness)) {
    processSpecularGlossinessUniforms(
      material.specularGlossiness,
      uniformMap,
      shaderBuilder,
      defaultTexture,
      disableTextures,
      renderResources,
    );
  } else {
    if (
      defined(material.specular) &&
      ModelUtility.supportedExtensions.KHR_materials_specular
    ) {
      processSpecularUniforms(
        material.specular,
        uniformMap,
        shaderBuilder,
        defaultTexture,
        disableTextures,
      );
    }
    if (
      defined(material.anisotropy) &&
      ModelUtility.supportedExtensions.KHR_materials_anisotropy
    ) {
      processAnisotropyUniforms(
        material.anisotropy,
        uniformMap,
        shaderBuilder,
        defaultTexture,
        disableTextures,
      );
    }
    if (
      defined(material.clearcoat) &&
      ModelUtility.supportedExtensions.KHR_materials_clearcoat
    ) {
      processClearcoatUniforms(
        material.clearcoat,
        uniformMap,
        shaderBuilder,
        defaultTexture,
        disableTextures,
      );
    }
    processMetallicRoughnessUniforms(
      material.metallicRoughness,
      uniformMap,
      shaderBuilder,
      defaultTexture,
      disableTextures,
      renderResources,
    );
  }

  // If the primitive does not have normals, fall back to unlit lighting.
  const hasNormals = ModelUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.NORMAL,
  );

  // Disable PointCloud normals if the user explicitly turned them off.
  const disablePointCloudNormals =
    defined(model.pointCloudShading) && !model.pointCloudShading.normalShading;

  // Classification models will be rendered as unlit.
  const lightingOptions = renderResources.lightingOptions;
  if (
    material.unlit ||
    !hasNormals ||
    hasClassification ||
    disablePointCloudNormals
  ) {
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

  // Configure and handle point diameter for POINTS primitives (BENTLEY_materials_point_style extension).
  if (defined(material.pointDiameter)) {
    shaderBuilder.addDefine(
      "HAS_POINT_DIAMETER",
      undefined,
      ShaderDestination.VERTEX,
    );
    shaderBuilder.addUniform(
      "float",
      "u_pointDiameter",
      ShaderDestination.VERTEX,
    );
    uniformMap.u_pointDiameter = function () {
      return material.pointDiameter * frameState.pixelRatio;
    };
  }

  shaderBuilder.addFragmentLines(MaterialStageFS);

  if (material.doubleSided) {
    shaderBuilder.addDefine(
      "HAS_DOUBLE_SIDED_MATERIAL",
      undefined,
      ShaderDestination.BOTH,
    );
  }
};

/**
 * Process constant LOD extension for a texture
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {string} uniformName The name of the sampler uniform
 * @param {string} defineName The name of the texture for use in the defines
 * @param {PrimitiveRenderResources|undefined} renderResources The render resources
 * @private
 */
function processConstantLod(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName,
  renderResources,
) {
  const constantLod = textureReader.constantLod;

  if (!defined(constantLod)) {
    return;
  }

  // renderResources is required for constant LOD to transform from ECEF/world coordinates to ENU
  if (!defined(renderResources)) {
    return;
  }

  const constantLodDefine = `HAS_${defineName}_CONSTANT_LOD`;
  shaderBuilder.addDefine(constantLodDefine, undefined, ShaderDestination.BOTH);

  if (!defined(uniformMap.u_constantLodOffset)) {
    shaderBuilder.addDefine(
      "HAS_CONSTANT_LOD",
      undefined,
      ShaderDestination.BOTH,
    );

    shaderBuilder.addVarying("vec3", "v_constantLodUvCustom");

    shaderBuilder.addUniform(
      "vec2",
      "u_constantLodOffset",
      ShaderDestination.VERTEX,
    );

    shaderBuilder.addUniform(
      "float",
      "u_constantLodDistance",
      ShaderDestination.VERTEX,
    );

    shaderBuilder.addUniform(
      "mat4",
      "u_constantLodWorldToEnu",
      ShaderDestination.VERTEX,
    );

    shaderBuilder.addFragmentLines(ConstantLodStageFS);

    const constantLodLines = ConstantLodStageVS.split("\n").filter((line) => {
      return !line.trim().startsWith("//") || line.includes("#");
    });
    shaderBuilder.addFunctionLines("setDynamicVaryingsVS", constantLodLines);
  }

  const paramsUniformName = `${uniformName}ConstantLodParams`;
  shaderBuilder.addUniform(
    "vec3",
    paramsUniformName,
    ShaderDestination.FRAGMENT,
  );

  uniformMap[paramsUniformName] = function () {
    return new Cartesian3(
      constantLod.minClampDistance,
      constantLod.maxClampDistance,
      constantLod.repetitions,
    );
  };

  if (!defined(uniformMap.u_constantLodOffset)) {
    uniformMap.u_constantLodOffset = function () {
      return constantLod.offset;
    };

    const enuMatrixInverse = Matrix4.clone(Matrix4.IDENTITY);
    let matrixComputed = false;

    uniformMap.u_constantLodWorldToEnu = function () {
      if (!matrixComputed) {
        const boundingSphere = renderResources.model.boundingSphere;
        if (defined(boundingSphere)) {
          const modelCenter = boundingSphere.center;
          const enuFrame = Transforms.eastNorthUpToFixedFrame(modelCenter);
          Matrix4.inverse(enuFrame, enuMatrixInverse);
          matrixComputed = true;
        }
      }
      return matrixComputed ? enuMatrixInverse : Matrix4.IDENTITY;
    };
  }
}

/**
 * Process a single texture transformation and add it to the shader and uniform map.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {string} uniformName The name of the sampler uniform such as <code>u_baseColorTexture</code>
 * @param {string} defineName The name of the texture for use in the defines, minus any prefix or suffix. For example, "BASE_COLOR" or "EMISSIVE"
 *
 * @private
 */
function processTextureTransform(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName,
) {
  // Add a define to enable the texture transformation code in the shader.
  const transformDefine = `HAS_${defineName}_TEXTURE_TRANSFORM`;
  shaderBuilder.addDefine(
    transformDefine,
    undefined,
    ShaderDestination.FRAGMENT,
  );

  // Add a uniform for the transformation matrix
  const transformUniformName = `${uniformName}Transform`;
  shaderBuilder.addUniform(
    "mat3",
    transformUniformName,
    ShaderDestination.FRAGMENT,
  );
  uniformMap[transformUniformName] = function () {
    return textureReader.transform;
  };
}

/**
 * Process a single texture scale and add it to the shader and uniform map.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {string} uniformName The name of the sampler uniform such as <code>u_baseColorTexture</code>
 * @param {string} defineName The name of the texture for use in the defines, minus any prefix or suffix. For example, "BASE_COLOR" or "EMISSIVE"
 *
 * @private
 */
function processTextureScale(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName,
) {
  // Add a define to enable the texture transformation code in the shader.
  const transformDefine = `HAS_${defineName}_TEXTURE_SCALE`;
  shaderBuilder.addDefine(
    transformDefine,
    undefined,
    ShaderDestination.FRAGMENT,
  );

  // Add a uniform for the transformation matrix
  const scaleUniformName = `${uniformName}Scale`;
  shaderBuilder.addUniform(
    "float",
    scaleUniformName,
    ShaderDestination.FRAGMENT,
  );
  uniformMap[scaleUniformName] = function () {
    return textureReader.scale;
  };
}

/**
 * Process a single texture and add it to the shader and uniform map.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder to modify
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ModelComponents.TextureReader} textureReader The texture to add to the shader
 * @param {string} uniformName The name of the sampler uniform such as <code>u_baseColorTexture</code>
 * @param {string} defineName The name of the texture for use in the defines, minus any prefix or suffix. For example, "BASE_COLOR" or "EMISSIVE"
 * @param {Texture} defaultTexture The default texture to use as a fallback if the texture is not yet loaded
 * @param {PrimitiveRenderResources|undefined} renderResources The render resources
 *
 * @private
 */
function processTexture(
  shaderBuilder,
  uniformMap,
  textureReader,
  uniformName,
  defineName,
  defaultTexture,
  renderResources,
) {
  // Add a uniform for the texture itself
  shaderBuilder.addUniform(
    "sampler2D",
    uniformName,
    ShaderDestination.FRAGMENT,
  );
  uniformMap[uniformName] = function () {
    return textureReader.texture ?? defaultTexture;
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
    ShaderDestination.FRAGMENT,
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
      defineName,
    );
  }

  const { scale } = textureReader;
  if (defined(scale) && scale !== 1.0) {
    processTextureScale(
      shaderBuilder,
      uniformMap,
      textureReader,
      uniformName,
      defineName,
    );
  }

  // Process constant LOD extension if present
  processConstantLod(
    shaderBuilder,
    uniformMap,
    textureReader,
    uniformName,
    defineName,
    renderResources,
  );
}

function processMaterialUniforms(
  material,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  defaultNormalTexture,
  defaultEmissiveTexture,
  disableTextures,
  renderResources,
) {
  const { emissiveFactor, emissiveTexture, normalTexture, occlusionTexture } =
    material;

  if (
    defined(emissiveFactor) &&
    !Cartesian3.equals(emissiveFactor, Material.DEFAULT_EMISSIVE_FACTOR)
  ) {
    shaderBuilder.addUniform(
      "vec3",
      "u_emissiveFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_emissiveFactor = function () {
      return material.emissiveFactor;
    };
    shaderBuilder.addDefine(
      "HAS_EMISSIVE_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );

    if (defined(emissiveTexture) && !disableTextures) {
      processTexture(
        shaderBuilder,
        uniformMap,
        emissiveTexture,
        "u_emissiveTexture",
        "EMISSIVE",
        defaultEmissiveTexture,
      );
    }
  }

  // Extract base color constant LOD to apply to normal texture
  let baseColorConstantLod;
  if (
    defined(material.metallicRoughness) &&
    defined(material.metallicRoughness.baseColorTexture) &&
    defined(material.metallicRoughness.baseColorTexture.constantLod)
  ) {
    baseColorConstantLod =
      material.metallicRoughness.baseColorTexture.constantLod;
  } else if (
    defined(material.specularGlossiness) &&
    defined(material.specularGlossiness.diffuseTexture) &&
    defined(material.specularGlossiness.diffuseTexture.constantLod)
  ) {
    baseColorConstantLod =
      material.specularGlossiness.diffuseTexture.constantLod;
  }

  if (defined(normalTexture) && !disableTextures) {
    // If normal texture AND base color have constant LOD, use base color's constant LOD properties to keep textures in sync
    let normalTextureToProcess = normalTexture;
    if (defined(normalTexture.constantLod) && defined(baseColorConstantLod)) {
      normalTextureToProcess = Object.create(
        Object.getPrototypeOf(normalTexture),
      );
      Object.assign(normalTextureToProcess, normalTexture);
      normalTextureToProcess.constantLod = baseColorConstantLod;
    }

    processTexture(
      shaderBuilder,
      uniformMap,
      normalTextureToProcess,
      "u_normalTexture",
      "NORMAL",
      defaultNormalTexture,
      renderResources,
    );
  }

  if (defined(occlusionTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      occlusionTexture,
      "u_occlusionTexture",
      "OCCLUSION",
      defaultTexture,
    );
  }
}

/**
 * Add uniforms and defines for the KHR_materials_pbrSpecularGlossiness extension
 *
 * @param {ModelComponents.SpecularGlossiness} specularGlossiness
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ShaderBuilder} shaderBuilder
 * @param {Texture} defaultTexture The default texture to use as a fallback if the texture is not yet loaded
 * @param {boolean} disableTextures
 * @param {PrimitiveRenderResources|undefined} renderResources The render resources for the primitive
 * @private
 */
function processSpecularGlossinessUniforms(
  specularGlossiness,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  disableTextures,
  renderResources,
) {
  const {
    diffuseTexture,
    diffuseFactor,
    specularGlossinessTexture,
    specularFactor,
    glossinessFactor,
  } = specularGlossiness;

  shaderBuilder.addDefine(
    "USE_SPECULAR_GLOSSINESS",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  if (defined(diffuseTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      diffuseTexture,
      "u_diffuseTexture",
      "DIFFUSE",
      defaultTexture,
      renderResources,
    );
  }

  if (
    defined(diffuseFactor) &&
    !Cartesian4.equals(diffuseFactor, SpecularGlossiness.DEFAULT_DIFFUSE_FACTOR)
  ) {
    shaderBuilder.addUniform(
      "vec4",
      "u_diffuseFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_diffuseFactor = function () {
      return specularGlossiness.diffuseFactor;
    };
    shaderBuilder.addDefine(
      "HAS_DIFFUSE_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  if (defined(specularGlossinessTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      specularGlossinessTexture,
      "u_specularGlossinessTexture",
      "SPECULAR_GLOSSINESS",
      defaultTexture,
    );
  }

  if (
    defined(specularFactor) &&
    !Cartesian3.equals(
      specularFactor,
      SpecularGlossiness.DEFAULT_SPECULAR_FACTOR,
    )
  ) {
    shaderBuilder.addUniform(
      "vec3",
      "u_legacySpecularFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_legacySpecularFactor = function () {
      return specularGlossiness.specularFactor;
    };
    shaderBuilder.addDefine(
      "HAS_LEGACY_SPECULAR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  if (
    defined(glossinessFactor) &&
    glossinessFactor !== SpecularGlossiness.DEFAULT_GLOSSINESS_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_glossinessFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_glossinessFactor = function () {
      return specularGlossiness.glossinessFactor;
    };
    shaderBuilder.addDefine(
      "HAS_GLOSSINESS_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }
}

/**
 * Add uniforms and defines for the KHR_materials_specular extension
 *
 * @param {ModelComponents.Specular} specular
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ShaderBuilder} shaderBuilder
 * @param {Texture} defaultTexture
 * @param {boolean} disableTextures
 * @private
 */
function processSpecularUniforms(
  specular,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  disableTextures,
) {
  const {
    specularTexture,
    specularFactor,
    specularColorTexture,
    specularColorFactor,
  } = specular;

  shaderBuilder.addDefine(
    "USE_SPECULAR",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  if (defined(specularTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      specularTexture,
      "u_specularTexture",
      "SPECULAR",
      defaultTexture,
    );
  }

  if (
    defined(specularFactor) &&
    specularFactor !== Specular.DEFAULT_SPECULAR_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_specularFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_specularFactor = function () {
      return specular.specularFactor;
    };
    shaderBuilder.addDefine(
      "HAS_SPECULAR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  if (defined(specularColorTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      specularColorTexture,
      "u_specularColorTexture",
      "SPECULAR_COLOR",
      defaultTexture,
    );
  }

  if (
    defined(specularColorFactor) &&
    !Cartesian3.equals(
      specularColorFactor,
      Specular.DEFAULT_SPECULAR_COLOR_FACTOR,
    )
  ) {
    shaderBuilder.addUniform(
      "vec3",
      "u_specularColorFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_specularColorFactor = function () {
      return specular.specularColorFactor;
    };
    shaderBuilder.addDefine(
      "HAS_SPECULAR_COLOR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }
}

const scratchAnisotropy = new Cartesian3();

/**
 * Add uniforms and defines for the KHR_materials_anisotropy extension
 *
 * @param {ModelComponents.Anisotropy} anisotropy
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ShaderBuilder} shaderBuilder
 * @param {Texture} defaultTexture
 * @param {boolean} disableTextures
 * @private
 */
function processAnisotropyUniforms(
  anisotropy,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  disableTextures,
) {
  const { anisotropyStrength, anisotropyRotation, anisotropyTexture } =
    anisotropy;

  shaderBuilder.addDefine(
    "USE_ANISOTROPY",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  if (defined(anisotropyTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      anisotropyTexture,
      "u_anisotropyTexture",
      "ANISOTROPY",
      defaultTexture,
    );
  }

  // Pre-compute cos and sin of rotation, since they are the same for all fragments.
  // Combine with strength as one vec3 uniform.
  const cosRotation = Math.cos(anisotropyRotation);
  const sinRotation = Math.sin(anisotropyRotation);
  shaderBuilder.addUniform("vec3", "u_anisotropy", ShaderDestination.FRAGMENT);
  uniformMap.u_anisotropy = function () {
    return Cartesian3.fromElements(
      cosRotation,
      sinRotation,
      anisotropyStrength,
      scratchAnisotropy,
    );
  };
}

/**
 * Add uniforms and defines for the KHR_materials_clearcoat extension
 *
 * @param {ModelComponents.Clearcoat} clearcoat
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ShaderBuilder} shaderBuilder
 * @param {Texture} defaultTexture
 * @param {boolean} disableTextures
 * @private
 */
function processClearcoatUniforms(
  clearcoat,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  disableTextures,
) {
  const {
    clearcoatFactor,
    clearcoatTexture,
    clearcoatRoughnessFactor,
    clearcoatRoughnessTexture,
    clearcoatNormalTexture,
  } = clearcoat;

  shaderBuilder.addDefine(
    "USE_CLEARCOAT",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  if (
    defined(clearcoatFactor) &&
    clearcoatFactor !== Clearcoat.DEFAULT_CLEARCOAT_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_clearcoatFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_clearcoatFactor = function () {
      return clearcoat.clearcoatFactor;
    };
    shaderBuilder.addDefine(
      "HAS_CLEARCOAT_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  if (defined(clearcoatTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      clearcoatTexture,
      "u_clearcoatTexture",
      "CLEARCOAT",
      defaultTexture,
    );
  }

  if (
    defined(clearcoatRoughnessFactor) &&
    clearcoatFactor !== Clearcoat.DEFAULT_CLEARCOAT_ROUGHNESS_FACTOR
  ) {
    shaderBuilder.addUniform(
      "float",
      "u_clearcoatRoughnessFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_clearcoatRoughnessFactor = function () {
      return clearcoat.clearcoatRoughnessFactor;
    };
    shaderBuilder.addDefine(
      "HAS_CLEARCOAT_ROUGHNESS_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  if (defined(clearcoatRoughnessTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      clearcoatRoughnessTexture,
      "u_clearcoatRoughnessTexture",
      "CLEARCOAT_ROUGHNESS",
      defaultTexture,
    );
  }

  if (defined(clearcoatNormalTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      clearcoatNormalTexture,
      "u_clearcoatNormalTexture",
      "CLEARCOAT_NORMAL",
      defaultTexture,
    );
  }
}

/**
 * Add uniforms and defines for the PBR metallic roughness model
 *
 * @param {ModelComponents.MetallicRoughness} metallicRoughness
 * @param {Object<string, Function>} uniformMap The uniform map to modify.
 * @param {ShaderBuilder} shaderBuilder
 * @param {Texture} defaultTexture The default texture to use as a fallback if the texture is not yet loaded
 * @param {boolean} disableTextures
 * @param {PrimitiveRenderResources|undefined} renderResources The render resources for the primitive
 * @private
 */
function processMetallicRoughnessUniforms(
  metallicRoughness,
  uniformMap,
  shaderBuilder,
  defaultTexture,
  disableTextures,
  renderResources,
) {
  shaderBuilder.addDefine(
    "USE_METALLIC_ROUGHNESS",
    undefined,
    ShaderDestination.FRAGMENT,
  );

  const baseColorTexture = metallicRoughness.baseColorTexture;
  if (defined(baseColorTexture) && !disableTextures) {
    processTexture(
      shaderBuilder,
      uniformMap,
      baseColorTexture,
      "u_baseColorTexture",
      "BASE_COLOR",
      defaultTexture,
      renderResources,
    );
  }

  const baseColorFactor = metallicRoughness.baseColorFactor;
  if (
    defined(baseColorFactor) &&
    !Cartesian4.equals(
      baseColorFactor,
      MetallicRoughness.DEFAULT_BASE_COLOR_FACTOR,
    )
  ) {
    shaderBuilder.addUniform(
      "vec4",
      "u_baseColorFactor",
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_baseColorFactor = function () {
      return metallicRoughness.baseColorFactor;
    };
    shaderBuilder.addDefine(
      "HAS_BASE_COLOR_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
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
      defaultTexture,
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
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_metallicFactor = function () {
      return metallicRoughness.metallicFactor;
    };
    shaderBuilder.addDefine(
      "HAS_METALLIC_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
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
      ShaderDestination.FRAGMENT,
    );
    uniformMap.u_roughnessFactor = function () {
      return metallicRoughness.roughnessFactor;
    };
    shaderBuilder.addDefine(
      "HAS_ROUGHNESS_FACTOR",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }
}

export default MaterialPipelineStage;
