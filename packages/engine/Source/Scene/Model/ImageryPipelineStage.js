import defined from "../../Core/defined.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import Check from "../../Core/Check.js";

import ShaderDestination from "../../Renderer/ShaderDestination.js";

import ImageryLayer from "../ImageryLayer.js";

import ImageryPipelineStageProcessing from "./ImageryPipelineStageProcessing.js";
import ImageryFlags from "./ImageryFlags.js";

/**
 * A pipeline stage that modifies the model shader to take into account
 * imagery textures that are draped over a primitive of the model, when it
 * is part a <code>Model3DTileContent</code> of a <code>Cesium3DTileset</code>
 * that has <code>imageryLayers</code> associated with it.
 *
 * TODO_DRAPING: Add more details as they become clearer. Most of what is done here tries to emulate the parts from
 * https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Shaders/GlobeFS.glsl#L166
 * that are relevant for imagery.
 *
 * @namespace ImageryPipelineStage
 *
 * @private
 */
class ImageryPipelineStage {
  /**
   * Process a primitive.
   *
   * TODO_DRAPING: Comments...
   *
   * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for the primitive
   * @param {ModelComponents.Primitive} primitive The primitive to be rendered
   * @param {FrameState} frameState The frame state.
   */
  static process(primitiveRenderResources, primitive, frameState) {
    console.log("Running ImageryPipelineStage");

    const model = primitiveRenderResources.model;
    const modelPrimitiveImagery = primitive.modelPrimitiveImagery;

    // This pipeline stage should not be executed for a primitive that
    // does not have a ModelPrimitiveImagery or when it is not 'ready',
    // but check it anyhow:

    //>>includeStart('debug', pragmas.debug);
    Check.defined("modelPrimitiveImagery", modelPrimitiveImagery);
    if (!modelPrimitiveImagery.ready) {
      // XXX_DRAPING Throw here in the future...
      //throw new DeveloperError("The modelPrimitiveImagery is not ready")
      console.error("The modelPrimitiveImagery is not ready");
      return;
    }
    //>>includeEnd('debug');

    const imageryLayers = model.imageryLayers;

    // Compute the arrays containing ALL projections and the array
    // containing the UNIQUE projections from the imagery layers.
    // A texture coordinate attribute only have to be created only
    // once for each projection.
    const allProjections =
      ImageryPipelineStageProcessing._extractProjections(imageryLayers);
    const uniqueProjections = [...new Set(allProjections)];

    // Create one texture coordinate attribute for each distinct
    // projection that is used in the imagery layers
    ImageryPipelineStageProcessing._createImageryTexCoordAttributes(
      uniqueProjections,
      modelPrimitiveImagery,
      primitiveRenderResources,
      frameState.context,
    );

    // Create the `ImageryInput` objects that describe
    // - the texture
    // - texture coordinate rectangle
    // - translation and scale
    // - index of the imagery texture coordinate attribute
    // to be passed to the actual imagery pipeline stage execution
    const imageryTexCoordAttributeSetIndices =
      ImageryPipelineStageProcessing._computeIndexMapping(
        allProjections,
        uniqueProjections,
      );
    const imageryInputs = ImageryPipelineStageProcessing._createImageryInputs(
      imageryLayers,
      modelPrimitiveImagery,
      imageryTexCoordAttributeSetIndices,
    );

    // XXX_DRAPING See how to handle that limit..
    if (imageryInputs.length > 10) {
      console.error(
        `XXX_DRAPING Found ${imageryInputs.length} texture units, truncating`,
      );
      imageryInputs.length = 10;
    }

    // TODO_DRAPING: This receives ALL imagery layers right now.
    // If there is no ImageryInput for one of them, then the
    // parts that are specific for that could be omitted, and
    // imageryLayers = imageryInputs.map((e) => e.imageryLayer);
    // could be used.
    const imageryLayersArray = [];
    for (let i = 0; i < imageryLayers.length; i++) {
      imageryLayersArray.push(imageryLayers.get(i));
    }

    ImageryPipelineStage._processImageryInputs(
      imageryLayersArray,
      primitiveRenderResources,
      imageryInputs,
      uniqueProjections.length,
    );
  }

  /**
   * Process the <code>ImageryInput</code> objects that have been
   * created in <code>process</code>.
   *
   * This will build the shader, containing the attributes, uniforms,
   * and "sample and blend" function that is required according to
   * the given imagery inputs
   *
   * @param {ImageryLayer[]} imageryLayersArray The imagery layers
   * @param {PrimitiveRenderResources} primitiveRenderResources The primitive render resources
   * @param {ImageryInput[]} imageryInputs The imagery inputs
   * @param {number} numImageryTexCoordAttributes The number of texture coordinate
   * attributes that have been created for the imagery (one for each distinct
   * projection that was found in the imagery layers)
   */
  static _processImageryInputs(
    imageryLayersArray,
    renderResources,
    imageryInputs,
    numImageryTexCoordAttributes,
  ) {
    const shaderBuilder = renderResources.shaderBuilder;

    const imageryFlags =
      ImageryPipelineStage._computeImageryFlags(imageryLayersArray);
    const numTextures = imageryInputs.length;

    // Set the global defines indicating the presence and number of
    // imagery textures.
    // TODO_DRAPING Check maxTextures to not be exceeded
    shaderBuilder.addDefine(`HAS_IMAGERY`);
    shaderBuilder.addDefine(`IMAGERY_TEXTURE_UNITS ${numTextures}`);

    ImageryPipelineStage._addAttributes(
      shaderBuilder,
      numImageryTexCoordAttributes,
    );

    ImageryPipelineStage._defineUniforms(shaderBuilder, imageryFlags);
    ImageryPipelineStage._buildSampleAndBlendFunction(
      shaderBuilder,
      imageryFlags,
    );

    ImageryPipelineStage._createMainImageryShader(
      shaderBuilder,
      imageryInputs,
      imageryFlags,
    );

    const uniformMap = renderResources.uniformMap;
    const uniforms = ImageryPipelineStage._createImageryUniforms(imageryInputs);
    ImageryPipelineStage._setImageryUniforms(uniformMap, uniforms);
  }

  /**
   * Add the attribute- and varying definitions for the imagery texture
   * coordinates to the given shader.
   *
   * This includes the definition of the <code>initializeImageryAttributes</code>
   * function that assigns the attribute values to varyings in the vertex shader.
   *
   * @param {ShaderBuilder} shaderBuilder The shader builder
   * @param {number} numTexCoords The number of imagery texture coordinate sets
   */
  static _addAttributes(shaderBuilder, numTexCoords) {
    for (let i = 0; i < numTexCoords; i++) {
      shaderBuilder.addAttribute("vec2", `a_imagery_texCoord_${i}`);
      shaderBuilder.addVarying("vec2", `v_imagery_texCoord_${i}`);
    }

    const functionId = "initializeImageryAttributes";
    const signature = `void ${functionId}()`;
    shaderBuilder.addFunction(functionId, signature, ShaderDestination.VERTEX);

    for (let i = 0; i < numTexCoords; i++) {
      shaderBuilder.addFunctionLines(functionId, [
        `v_imagery_texCoord_${i} = a_imagery_texCoord_${i};`,
      ]);
    }
  }

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
  static _computeImageryFlags(imageryLayers) {
    const imageryFlags = new ImageryFlags();
    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers[i];

      // TODO_DRAPING These are short-circuiting to `number` instead
      // of `boolean` here. Ignore that or do that clumsy `x = x && y`
      // or some `!!x` trickery...?
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
  }

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
  static _defineUniforms(shaderBuilder, imageryFlags) {
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
  }

  /**
   * Create the function signature for the `sampleAndBlend` function,
   * based on the features that are required for the imagery.
   *
   * For details, see `buildSampleAndBlendFunction`
   *
   * @param {ImageryFlags} imageryFlags The imagery flags
   * @returns {string} The string
   */
  static _createSampleAndBlendFunctionSignature(imageryFlags) {
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
  }

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
  static _buildSampleAndBlendFunction(shaderBuilder, imageryFlags) {
    const functionId = "sampleAndBlend";
    const signature =
      ImageryPipelineStage._createSampleAndBlendFunctionSignature(imageryFlags);
    shaderBuilder.addFunction(
      functionId,
      signature,
      ShaderDestination.FRAGMENT,
    );

    shaderBuilder.addFunctionLines(functionId, [`float effectiveAlpha = 1.0;`]);
    if (imageryFlags.alpha) {
      shaderBuilder.addFunctionLines(functionId, [
        `effectiveAlpha = textureAlpha;`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      // XXX_DRAPING This is the part that is documented as "This crazy step stuff"
      // in GlobeFS.glsl. It's talking about performance. Show me a benchmark!!!
      //`vec2 alphaMultiplier = step(textureCoordinateRectangle.st, textureCoordinates);`,
      //`effectiveAlpha = effectiveAlpha * alphaMultiplier.x * alphaMultiplier.y;`,
      //`alphaMultiplier = step(vec2(0.0), textureCoordinateRectangle.pq - textureCoordinates);`,
      //`effectiveAlpha = effectiveAlpha * alphaMultiplier.x * alphaMultiplier.y;`,

      // Trying the if-approach here...
      `if (textureCoordinates.x < textureCoordinateRectangle.x) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.x > textureCoordinateRectangle.z) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.y < textureCoordinateRectangle.y) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.y > textureCoordinateRectangle.w) effectiveAlpha = 0.0;`,

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
    ]);

    // Debug mode: Draw boundaries of imagery in red
    if (ImageryPipelineStage._debugDrawImageryBoundaries) {
      shaderBuilder.addFunctionLines(functionId, [
        `if (abs(textureCoordinates.x - textureCoordinateRectangle.x) < (1.0/256.0) || `,
        `    abs(textureCoordinates.x - textureCoordinateRectangle.z) < (1.0/256.0) || `,
        `    abs(textureCoordinates.y - textureCoordinateRectangle.y) < (1.0/256.0) || `,
        `    abs(textureCoordinates.y - textureCoordinateRectangle.w) < (1.0/256.0))`,
        `{`,
        `    result = vec4(1.0, 0.0, 0.0, effectiveAlpha);`,
        `}`,
      ]);
    }

    shaderBuilder.addFunctionLines(functionId, [`return result;`]);
  }

  /**
   * Creates the arguments for a call to `sampleAndBlend` for the
   * specified imagery.
   *
   * For details, see `buildSampleAndBlendFunction`
   *
   * @param {ImageryFlags} imageryFlags The imagery flags
   * @param {number} imageryTexCoordAttributeSetIndex The index for the texture coordinate attribute
   * @param {number} i The imagery index
   * @returns {string} The string
   */
  static _createSampleAndBlendCallArguments(
    imageryFlags,
    imageryTexCoordAttributeSetIndex,
    i,
  ) {
    const textureCoordinates = `v_imagery_texCoord_${imageryTexCoordAttributeSetIndex}`;

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
  }

  /**
   * Creates the main part of the imagery shader.
   *
   * It adds the `blendBaseColorWithImagery` function, which is to be
   * called in the `MaterialStageFS.glsl` when the `HAS_IMAGERY`
   * flag was set in the shader.
   *
   * The `blendBaseColorWithImagery` function will go through all imagery
   * layers in the input, and call the `sampleAndBlend` function, to
   * incorporate the imagery input in the resulting pixel.
   *
   * @param {ShaderBuilder} shaderBuilder The shader builder
   * @param {object[]} imageryInputs The imagery inputs
   * @param {ImageryFlags} imageryFlags The imagery flags
   */
  static _createMainImageryShader(shaderBuilder, imageryInputs, imageryFlags) {
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
      const imageryInput = imageryInputs[i];
      const imageryTexCoordAttributeSetIndex =
        imageryInput.imageryTexCoordAttributeSetIndex;
      const argsString =
        ImageryPipelineStage._createSampleAndBlendCallArguments(
          imageryFlags,
          imageryTexCoordAttributeSetIndex,
          i,
        );
      shaderBuilder.addFunctionLines(functionId, [
        `blendedBaseColor = sampleAndBlend(${argsString});`,
      ]);
    }

    shaderBuilder.addFunctionLines(functionId, [`return blendedBaseColor;`]);
  }

  /**
   * Creates an object that contains the uniform values the given imagery inputs.
   *
   * The result will be a structure that contains the uniform values
   * that match the definitions that have been created by `defineUniforms`.
   * (It will include the ones that still have their default values
   * and may not be needed eventually)
   *
   * @param {object[]} imageryInputs The imagery inputs
   * @returns {object} The uniforms
   */
  static _createImageryUniforms(imageryInputs) {
    // TODO_DRAPING Consider some scratch here, if people think that it matters
    const length = imageryInputs.length;
    const uniforms = {};
    uniforms.imageryTextures = Array(length);
    uniforms.imageryTextureCoordinateRectangle = Array(length);
    uniforms.imageryTextureTranslationAndScale = Array(length);
    uniforms.imageryTextureAlpha = Array(length);
    uniforms.imageryTextureBrightness = Array(length);
    uniforms.imageryTextureContrast = Array(length);
    uniforms.imageryTextureHue = Array(length);
    uniforms.imageryTextureSaturation = Array(length);
    uniforms.imageryTextureOneOverGamma = Array(length);
    uniforms.imageryTextureColorToAlpha = Array(length);

    for (let i = 0; i < length; i++) {
      const imageryInput = imageryInputs[i];

      const imageryLayer = imageryInput.imageryLayer;
      const texture = imageryInput.texture;
      const textureCoordinateRectangle =
        imageryInput.textureCoordinateRectangle;
      const textureTranslationAndScale =
        imageryInput.textureTranslationAndScale;

      uniforms.imageryTextures[i] = texture;
      uniforms.imageryTextureTranslationAndScale[i] =
        textureTranslationAndScale;
      uniforms.imageryTextureCoordinateRectangle[i] =
        textureCoordinateRectangle;

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
  }

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
  static _setImageryUniforms(uniformMap, uniforms) {
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
  }
}

// Static properties (direct initialization disallowed by eslint)
//ImageryPipelineStage.name = "ImageryPipelineStage"; // Helps with debugging, if you know where to look

/**
 * TODO_DRAPING: A debugging flag to draw the boundaries of imagery tiles
 * (Similar to "SHOW_TILE_BOUNDARIES" in GlobeFS.glsl)
 */
ImageryPipelineStage._debugDrawImageryBoundaries = true;

export default ImageryPipelineStage;
