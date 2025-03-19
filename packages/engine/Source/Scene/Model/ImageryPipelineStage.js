import defined from "../../Core/defined.js";
import Cartesian4 from "../../Core/Cartesian4.js";

import ShaderDestination from "../../Renderer/ShaderDestination.js";

import ImageryLayer from "../ImageryLayer.js";

/**
 * A pipeline stage that modifies the model shader to take into account
 * imagery textures that are draped over the model when it is part of
 * a tileset that has imagery layers associated with it.
 *
 * TODO_DRAPING: Add more details as they become clearer. Most of what is done here tries to emulate the parts from
 * https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Shaders/GlobeFS.glsl#L166
 * that are relevant for imagery.
 *
 * @namespace ImageryPipelineStage
 *
 * @private
 */
const ImageryPipelineStage = {
  name: "ImageryPipelineStage", // Helps with debugging, if you know where to look
};

/**
 * A class containing a set of flags indicating which parts of imagery
 * information have to be processed by the pipeline.
 *
 * Each flag indicates that at least one of the ´ImageryLayer` objects
 * that are part of the input did *not* have the default value that
 * was defined via the corresponding `ImageryLayer.DEFAULT_...`.
 */
class ImageryFlags {
  constructor() {
    this.alpha = false;
    this.brightness = false;
    this.contrast = false;
    this.hue = false;
    this.saturation = false;
    this.gamma = false;
    this.colorToAlpha = false;
  }
}

/**
 * XXX_DRAPING:
 *
 * The imageryInputs are
 * {
 *   imageryLayer: ImageryLayer,
 *   texture: Texture, // DUMMY TEXTURE
 *   useWebMercator: boolean, corresponding to tileImagery.useWebMercatorT
 *   textureTranslationAndScale: Cartesian4, corresponding to tileImagery.textureTranslationAndScale
 *   textureCoordinateRectangle: Rectangle, corresponding to tileImagery.textureCoordinateRectangle
 *   texCoordIndex:number
 * }
 *
 * Originally, this received a ModelComponents.Primitive at this point,
 * but we cannot use the primitive, because it only contains a
 * ModelComponents.Material that only contains a ModelComponents.TextureReader
 * that contains an "index : The index in the glTF", and there is no glTF here...
 * See XXX_DRAPING in ModelSceneGraph
 */
ImageryPipelineStage.process = function (
  renderResources,
  imageryInputs,
  frameState,
) {
  console.log("Running ImageryPipelineStage");

  const { shaderBuilder } = renderResources;

  const imageryLayers = imageryInputs.map((e) => e.imageryLayer);
  const imageryFlags = ImageryPipelineStage._computeImageryFlags(imageryLayers);

  ImageryPipelineStage._defineUniforms(shaderBuilder, imageryFlags);
  ImageryPipelineStage._buildSampleAndBlendFunction(
    shaderBuilder,
    imageryFlags,
  );

  ImageryPipelineStage._createMainImageryShader(
    shaderBuilder,
    imageryLayers,
    imageryFlags,
  );

  const uniformMap = renderResources.uniformMap;
  const uniforms = ImageryPipelineStage._createImageryUniforms(imageryInputs);
  ImageryPipelineStage._setImageryUniforms(uniformMap, uniforms);
};

/**
 * Returns the `ImageryFlags` that indicate the features that are
 * required for the given imagery layers.
 *
 * The resulting flags will indicate whether any of the given
 * imagery layer objects did *not* have the default value for
 * the respective property, as defined by `ImageryLayer.DEFAULT_...`
 *
 * @param {ImageryLayer[]} imageryLayers The imagery layers
 * @returns {ImageryFlags} The imagery flags
 */
ImageryPipelineStage._computeImageryFlags = function (imageryLayers) {
  const imageryFlags = new ImageryFlags();
  for (let i = 0; i < imageryLayers.length; i++) {
    const imageryLayer = imageryLayers[i];

    imageryFlags.alpha |= imageryLayer.alpha !== 1.0;
    imageryFlags.brightness |=
      imageryLayer.brightness !== ImageryLayer.DEFAULT_BRIGHTNESS;
    imageryFlags.contrast |=
      imageryLayer.contrast !== ImageryLayer.DEFAULT_CONTRAST;
    imageryFlags.hue |= imageryLayer.hue !== ImageryLayer.DEFAULT_HUE;
    imageryFlags.saturation |=
      imageryLayer.saturation !== ImageryLayer.DEFAULT_SATURATION;
    imageryFlags.gamma |= imageryLayer.gamma !== ImageryLayer.DEFAULT_GAMMA;
    const hasColorToAlpha =
      defined(imageryLayer.colorToAlpha) &&
      imageryLayer.colorToAlphaThreshold > 0.0;
    imageryFlags.colorToAlpha |= hasColorToAlpha;
  }
  return imageryFlags;
};

/**
 * Adds the uniforms that are required for the imagery to the shader.
 *
 * This will use the given shader builder to add the uniforms to the
 * shader that are always required for the imagery (e.g. the
 * `sampler2D u_imageryTextures[...]`).
 *
 * The array size of all arrays will be `IMAGERY_TEXTURE_UNITS`,
 * so this has to be added as a `define` with a positive value.
 *
 * Depending on the given imagery flags being `true`, it will add
 * the optional uniforms, like `u_imageryTextureAlpha`.
 *
 * The naming pattern will be `u_imageryTexture<name>`, except for
 * `gamma`: To safe that one measly division, the thane will be
 * `oneOverGamma` there.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder
 * @param {ImageryFlags} imageryFlags The imagery flags
 */
ImageryPipelineStage._defineUniforms = function (shaderBuilder, imageryFlags) {
  shaderBuilder.addUniform(
    "sampler2D",
    "u_imageryTextures[IMAGERY_TEXTURE_UNITS]",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addUniform(
    "vec4",
    "u_imageryTextureCoordinateRectangle[IMAGERY_TEXTURE_UNITS]",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addUniform(
    "vec4",
    "u_imageryTextureTranslationAndScale[IMAGERY_TEXTURE_UNITS]",
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addUniform(
    "bool",
    "u_imageryTextureUseWebMercatorT[IMAGERY_TEXTURE_UNITS]",
    ShaderDestination.FRAGMENT,
  );

  if (imageryFlags.alpha) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureAlpha[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.brightness) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureBrightness[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.contrast) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureContrast[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.hue) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureHue[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.saturation) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureSaturation[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.gamma) {
    shaderBuilder.addUniform(
      "float",
      "u_imageryTextureOneOverGamma[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
  if (imageryFlags.colorToAlpha) {
    shaderBuilder.addUniform(
      "vec4",
      "u_imageryTextureColorToAlpha[IMAGERY_TEXTURE_UNITS]",
      ShaderDestination.FRAGMENT,
    );
  }
};

/**
 * Create the function signature for the `sampleAndBlend` function,
 * based on the features that are required for the imagery.
 *
 * For details, see `buildSampleAndBlendFunction`
 *
 * @param {ImageryFlags} imageryFlags The imagery flags
 * @returns {string} The string
 */
ImageryPipelineStage._createSampleAndBlendFunctionSignature = function (
  imageryFlags,
) {
  const functionId = "sampleAndBlend";
  const parameters = [];
  parameters.push(`vec4 previousColor`);
  parameters.push(`sampler2D textureToSample`);
  parameters.push(`vec2 textureCoordinates`);
  parameters.push(`vec4 textureCoordinateRectangle`);
  parameters.push(`vec4 textureCoordinateTranslationAndScale`);
  if (imageryFlags.alpha) {
    parameters.push(`float textureAlpha`);
  }
  if (imageryFlags.brightness) {
    parameters.push(`float textureBrightness`);
  }
  if (imageryFlags.contrast) {
    parameters.push(`float textureContrast`);
  }
  if (imageryFlags.hue) {
    parameters.push(`float textureHue`);
  }
  if (imageryFlags.saturation) {
    parameters.push(`float textureSaturation`);
  }
  if (imageryFlags.gamma) {
    parameters.push(`float textureOneOverGamma`);
  }
  if (imageryFlags.colorToAlpha) {
    parameters.push(`vec4 colorToAlpha`);
  }
  const parametersString = parameters.join(", ");

  // XXX_DRAPING Debug log
  //console.log("sampleAndBlend parameters ", parameters);

  const signature = `vec4 ${functionId}(${parametersString})`;
  return signature;
};

/**
 * Build the `sampleAndBlend` function that will be called for each imagery,
 * to combine the previous pixel color with the respective imagery input.
 *
 * The function that is built here resembles the function that was originally defined at
 * https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Shaders/GlobeFS.glsl#L166
 *
 * However, for the function that is built here, the signature will
 * reflect the actual features that are required for the imagery:
 * For example, the `float textureAlpha` parameter will only be
 * present when `imageryFlags.alpha` is `true`.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder
 * @param {ImageryFlags} imageryFlags The imagery flags
 */
ImageryPipelineStage._buildSampleAndBlendFunction = function (
  shaderBuilder,
  imageryFlags,
) {
  const functionId = "sampleAndBlend";
  const signature =
    ImageryPipelineStage._createSampleAndBlendFunctionSignature(imageryFlags);
  shaderBuilder.addFunction(functionId, signature, ShaderDestination.FRAGMENT);

  shaderBuilder.addFunctionLines(functionId, [`float effectiveAlpha = 1.0;`]);
  if (imageryFlags.alpha) {
    shaderBuilder.addFunctionLines(functionId, [
      `effectiveAlpha = textureAlpha;`,
    ]);
  }
  shaderBuilder.addFunctionLines(functionId, [
    `vec2 alphaMultiplier = step(textureCoordinateRectangle.st, textureCoordinates);`,
    `effectiveAlpha = effectiveAlpha * alphaMultiplier.x * alphaMultiplier.y;`,
    `alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - textureCoordinates);`,
    `effectiveAlpha = effectiveAlpha * alphaMultiplier.x * alphaMultiplier.y;`,
    `vec2 translation = textureCoordinateTranslationAndScale.xy;`,
    `vec2 scale = textureCoordinateTranslationAndScale.zw;`,
    `vec2 effectiveTextureCoordinates = textureCoordinates * scale + translation;`,
    `vec4 value = texture(textureToSample, effectiveTextureCoordinates);`,
    `vec3 color = value.rgb;`,
    `float alpha = value.a;`,
  ]);

  if (imageryFlags.colorToAlpha) {
    shaderBuilder.addFunctionLines(functionId, [
      `vec3 colorDiff = abs(color.rgb - colorToAlpha.rgb);`,
      `colorDiff.r = czm_maximumComponent(colorDiff);`,
      `alpha = czm_branchFreeTernary(colorDiff.r < colorToAlpha.a, 0.0, alpha);`,
    ]);
  }

  if (imageryFlags.gamma) {
    shaderBuilder.addFunctionLines(functionId, [
      `color = pow(color, vec3(textureOneOverGamma));`,
    ]);
  } else {
    shaderBuilder.addFunctionLines(functionId, [
      `vec4 tempColor = czm_gammaCorrect(vec4(color, alpha));`,
      `color = tempColor.rgb;`,
      `alpha = tempColor.a;`,
    ]);
  }

  if (imageryFlags.brightness) {
    shaderBuilder.addFunctionLines(functionId, [
      `color = mix(vec3(0.0), color, textureBrightness);`,
    ]);
  }

  if (imageryFlags.contrast) {
    shaderBuilder.addFunctionLines(functionId, [
      `color = mix(vec3(0.5), color, textureContrast);`,
    ]);
  }
  if (imageryFlags.hue) {
    shaderBuilder.addFunctionLines(functionId, [
      `color = czm_hue(color, textureHue);`,
    ]);
  }

  if (imageryFlags.saturation) {
    shaderBuilder.addFunctionLines(functionId, [
      `color = czm_saturation(color, textureSaturation);`,
    ]);
  }

  shaderBuilder.addFunctionLines(functionId, [
    `float sourceAlpha = alpha * effectiveAlpha;`,
    `float outAlpha = mix(previousColor.a, 1.0, sourceAlpha);`,
    `outAlpha += sign(outAlpha) - 1.0;`,
    `vec3 outColor = mix(previousColor.rgb * previousColor.a, color, sourceAlpha) / outAlpha;`,
    // See comments in https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Shaders/GlobeFS.glsl#L166
    `vec4 result = vec4(outColor, max(outAlpha, 0.0));`,
    `return result;`,
  ]);
};

/**
 * Creates the arguments for a call to `sampleAndBlend` for the
 * specified imagery.
 *
 * For details, see `buildSampleAndBlendFunction`
 *
 * @param {ImageryFlags} imageryFlags The imagery flags
 * @param {number} i The imagery index
 * @returns {string} The string
 */
ImageryPipelineStage._createSampleAndBlendCallArguments = function (
  imageryFlags,
  i,
) {
  // XXX_DRAPING using v_texCoord_0 here!
  // Was u_dayTextureUseWebMercatorT[${i}] ? textureCoordinates.xz : textureCoordinates.xy,\n\
  const textureCoordinates = `v_texCoord_0`;

  const args = [];
  args.push(`blendedBaseColor`);
  args.push(`u_imageryTextures[${i}]`);
  args.push(`${textureCoordinates}`);
  args.push(`u_imageryTextureCoordinateRectangle[${i}]`);
  args.push(`u_imageryTextureTranslationAndScale[${i}]`);
  if (imageryFlags.alpha) {
    args.push(`u_imageryTextureAlpha[${i}]`);
  }
  if (imageryFlags.brightness) {
    args.push(`u_imageryTextureBrightness[${i}]`);
  }
  if (imageryFlags.contrast) {
    args.push(`u_imageryTextureContrast[${i}]`);
  }
  if (imageryFlags.hue) {
    args.push(`u_imageryTextureHue[${i}]`);
  }
  if (imageryFlags.saturation) {
    args.push(`u_imageryTextureSaturation[${i}]`);
  }
  if (imageryFlags.gamma) {
    args.push(`u_imageryTextureOneOverGamma[${i}]`);
  }
  if (imageryFlags.colorToAlpha) {
    args.push(`u_imageryTextureColorToAlpha[${i}]`);
  }

  // XXX_DRAPING Debug log
  //console.log("sampleAndBlend args ", args);

  const argsString = args.join(", ");
  return argsString;
};

/**
 * Creates the main part of the imagery shader.
 *
 * It adds the `HAS_IMAGERY` definition to the shader, which will cause
 * the `blendBaseColorWithImagery` function (also inserted by this function)
 * to be called in the `MaterialStageFS.glsl`.
 *
 * The `blendBaseColorWithImagery` function will go through all imagery
 * layers in the input, and call the `sampleAndBlend` function, to
 * incorporate the imagery input in the resulting pixel.
 *
 * @param {ShaderBuilder} shaderBuilder The shader builder
 * @param {object} imageryInputs TODO_DRAPING To be defined...
 * @param {ImageryFlags} imageryFlags The imagery flags
 */
ImageryPipelineStage._createMainImageryShader = function (
  shaderBuilder,
  imageryInputs,
  imageryFlags,
) {
  // TODO_DRAPING Check maxTextures to not be exceeded
  shaderBuilder.addDefine(`HAS_IMAGERY`);
  shaderBuilder.addDefine(`IMAGERY_TEXTURE_UNITS ${imageryInputs.length}`);

  const functionId = "blendBaseColorWithImagery";
  shaderBuilder.addFunction(
    functionId,
    `vec4 blendBaseColorWithImagery(vec4 baseColorWithAlpha)`,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addFunctionLines(functionId, [
    `vec4 blendedBaseColor = baseColorWithAlpha;`,
  ]);

  // Roughly what was done in https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Scene/GlobeSurfaceShaderSet.js#L394
  for (let i = 0; i < imageryInputs.length; i++) {
    const argsString = ImageryPipelineStage._createSampleAndBlendCallArguments(
      imageryFlags,
      i,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `blendedBaseColor = sampleAndBlend(${argsString});`,
    ]);
  }

  shaderBuilder.addFunctionLines(functionId, [`return blendedBaseColor;`]);
};

/**
 * Creates an object that contains the uniform values the given imagery inputs.
 *
 * The result will be a structure that contains the uniform values
 * that match the definitions that have been created by `defineUniforms`.
 * (It will include the ones that still have their default values
 * and may not be needed eventually)
 *
 * @param {object} imageryInputs TODO_DRAPING To be defined
 * @returns {object} The uniforms
 */
ImageryPipelineStage._createImageryUniforms = function (imageryInputs) {
  const uniforms = {};
  uniforms.imageryTextures = Array(imageryInputs.length);
  uniforms.imageryTextureCoordinateRectangle = Array(imageryInputs.length);
  uniforms.imageryTextureTranslationAndScale = Array(imageryInputs.length);
  uniforms.imageryTextureUseWebMercatorT = Array(imageryInputs.length);
  uniforms.imageryTextureAlpha = Array(imageryInputs.length);
  uniforms.imageryTextureBrightness = Array(imageryInputs.length);
  uniforms.imageryTextureContrast = Array(imageryInputs.length);
  uniforms.imageryTextureHue = Array(imageryInputs.length);
  uniforms.imageryTextureSaturation = Array(imageryInputs.length);
  uniforms.imageryTextureOneOverGamma = Array(imageryInputs.length);
  uniforms.imageryTextureColorToAlpha = Array(imageryInputs.length);

  for (let i = 0; i < imageryInputs.length; i++) {
    const imageryInput = imageryInputs[i];

    const imageryLayer = imageryInput.imageryLayer;
    const texture = imageryInput.texture;
    const useWebMercator = imageryInput.useWebMercator;
    const textureCoordinateRectangle = imageryInput.textureCoordinateRectangle;
    const textureTranslationAndScale = imageryInput.textureTranslationAndScale;

    uniforms.imageryTextures[i] = texture;
    uniforms.imageryTextureTranslationAndScale[i] = textureTranslationAndScale;
    uniforms.imageryTextureCoordinateRectangle[i] = textureCoordinateRectangle;

    uniforms.imageryTextureUseWebMercatorT[i] = useWebMercator;

    uniforms.imageryTextureAlpha[i] = imageryLayer.alpha;
    uniforms.imageryTextureBrightness[i] = imageryLayer.brightness;
    uniforms.imageryTextureContrast[i] = imageryLayer.contrast;
    uniforms.imageryTextureHue[i] = imageryLayer.hue;
    uniforms.imageryTextureSaturation[i] = imageryLayer.saturation;
    uniforms.imageryTextureOneOverGamma[i] = 1.0 / imageryLayer.gamma;

    let colorToAlpha = uniforms.imageryTextureColorToAlpha[i];
    if (!defined(colorToAlpha)) {
      colorToAlpha = new Cartesian4();
      uniforms.imageryTextureColorToAlpha[i] = colorToAlpha;
    }
    const hasColorToAlpha =
      defined(imageryLayer.colorToAlpha) &&
      imageryLayer.colorToAlphaThreshold > 0.0;
    if (hasColorToAlpha) {
      const color = imageryLayer.colorToAlpha;
      colorToAlpha.x = color.red;
      colorToAlpha.y = color.green;
      colorToAlpha.z = color.blue;
      colorToAlpha.w = imageryLayer.colorToAlphaThreshold;
    } else {
      colorToAlpha.w = -1.0;
    }
  }
  return uniforms;
};

/**
 * Fill the given uniform map with functions for all properties
 * in the given uniforms object.
 *
 * The uniform names will be created as `u_<propertyName>`, and
 * their value will just be a function that returns the respective
 * property value.
 *
 * @param {UniformMap} uniformMap The uniform map
 * @param {object} uniforms The uniforms
 */
ImageryPipelineStage._setImageryUniforms = function (uniformMap, uniforms) {
  for (const key in uniforms) {
    if (uniforms.hasOwnProperty(key)) {
      const name = `u_${key}`;

      // XXX_DRAPING Debug log
      //console.log("Adding uniform ", name);

      uniformMap[name] = function () {
        return uniforms[key];
      };
    }
  }
};

export default ImageryPipelineStage;
