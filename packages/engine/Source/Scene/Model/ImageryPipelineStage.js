import defined from "../../Core/defined.js";
import Cartesian4 from "../../Core/Cartesian4.js";
import Check from "../../Core/Check.js";
import Rectangle from "../../Core/Rectangle.js";

import ShaderDestination from "../../Renderer/ShaderDestination.js";

import ImageryLayer from "../ImageryLayer.js";
import AttributeType from "../AttributeType.js";

import ImageryFlags from "./ImageryFlags.js";
import ModelPrimitiveImagery from "./ModelPrimitiveImagery.js";
import ImageryInput from "./ImageryInput.js";
import ImageryState from "../ImageryState.js";
import oneTimeWarning from "../../Core/oneTimeWarning.js";

/**
 * A compile-time debugging flag to draw the boundaries of imagery tiles
 * (Similar to "SHOW_TILE_BOUNDARIES" in GlobeFS.glsl)
 * @private
 */
const debugDrawImageryBoundaries = false;

// Scratch variable for _computeTextureTranslationAndScale
const nativeBoundingRectangleScratch = new Rectangle();

// Scratch variable for _computeTextureTranslationAndScale
const nativeImageryRectangleScratch = new Rectangle();

/**
 * A pipeline stage that modifies the model shader to take into account
 * imagery textures that are draped over a primitive of the model, when it
 * is part a <code>Model3DTileContent</code> of a <code>Cesium3DTileset</code>
 * that has <code>imageryLayers</code> associated with it.
 *
 * Most of what is done here tries to emulate the parts from
 * https://github.com/CesiumGS/cesium/blob/6cc004aaff586bb59f07f199216ae511014cf5a9/packages/engine/Source/Shaders/GlobeFS.glsl#L166
 * that are relevant for imagery, using the more modern ShaderBuilder structures.
 *
 * @namespace ImageryPipelineStage
 *
 * @private
 */
class ImageryPipelineStage {
  /**
   * Process a primitive.
   *
   * This will update the render resources of the given primitive,
   * depending on the imagery that is covered by the given primitive.
   *
   * This will obtain the <code>ModelPrimitiveImagery</code> from
   * the given primitive, and use that to compute the actual
   * <code>ImageryInput</code> objects that describe the information
   * that has to be passed to the shader for draping the imagery over
   * the primitive.
   *
   * After the <code>ImageryInput</code> has been computed, it will
   * extend the render resources with the texture coordinate
   * attribute that has to be used for the imagery, and augment
   * the <code>primitiveRenderResources.shaderBuilder</code> with
   * the information hat is required for the draping.
   *
   * @param {PrimitiveRenderResources} primitiveRenderResources The render resources for the primitive
   * @param {ModelComponents.Primitive} primitive The primitive to be rendered
   * @param {FrameState} frameState The frame state.
   */
  static process(primitiveRenderResources, primitive, frameState) {
    const model = primitiveRenderResources.model;
    const modelPrimitiveImagery = primitive.modelPrimitiveImagery;

    // When the creation of the model primitive imagery is happening
    // asynchronously, then the primitive may not yet contain it.
    // Return early in this case
    if (!defined(modelPrimitiveImagery)) {
      return;
    }

    // Similarly, when the model primitive imagery is not yet ready,
    // then nothing can be done here
    if (!modelPrimitiveImagery.ready) {
      return;
    }

    // Compute the arrays containing ALL projections and the array
    // containing the UNIQUE projections from the imagery layers,
    // to establish the mapping between the imagery index and the
    // imagery texture coordinate attribute set index.
    // (This should be implemented and/or documented better...)
    const imageryLayers = model.imageryLayers;
    const allProjections =
      ModelPrimitiveImagery._extractProjections(imageryLayers);
    const uniqueProjections = [...new Set(allProjections)];
    const imageryTexCoordAttributeSetIndices =
      ImageryPipelineStage._computeIndexMapping(
        allProjections,
        uniqueProjections,
      );

    // Create the `ImageryInput` objects that describe
    // - the texture
    // - texture coordinate rectangle
    // - translation and scale
    // - index of the imagery texture coordinate attribute
    // to be passed to the actual imagery pipeline stage execution
    const imageryInputs = ImageryPipelineStage._createImageryInputs(
      imageryLayers,
      modelPrimitiveImagery,
      imageryTexCoordAttributeSetIndices,
    );

    // This can happen when none of the imagery textures could
    // be obtained, because they had all been INVALID/FAILED,
    // or when none of the imagery layers is actually visible
    // according to `show==true`
    // Bail out in this case
    if (imageryInputs.length === 0) {
      return;
    }

    // TODO_DRAPING This will have to be handled with upsampling.
    // For now, just truncate the textures to not exceed the
    // number of texture units
    if (imageryInputs.length > 10) {
      oneTimeWarning(
        "imagery-texture-units",
        `Warning: Draped imagery requires ${imageryInputs.length} texture units, truncating`,
      );
      imageryInputs.length = 10;
    }

    // Add the imagery texture coordinate attributes to the render
    // resources
    ImageryPipelineStage._addImageryTexCoordAttributesToRenderResources(
      modelPrimitiveImagery,
      primitiveRenderResources,
    );

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
   * Add one attribute to the render resources, for each imagery texture
   * coordinate that was computed in the given model primitive imagery
   * (one for each projection)
   *
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @param {PrimitiveRenderResources} primitiveRenderResources The render resources
   */
  static _addImageryTexCoordAttributesToRenderResources(
    modelPrimitiveImagery,
    primitiveRenderResources,
  ) {
    const imageryTexCoordAttributes =
      modelPrimitiveImagery.imageryTexCoordAttributesPerProjection();
    for (const imageryTexCoordAttribute of imageryTexCoordAttributes) {
      ImageryPipelineStage._addImageryTexCoordAttributeToRenderResources(
        imageryTexCoordAttribute,
        primitiveRenderResources,
      );
    }
  }

  /**
   * Add the given attribute to the render resources
   *
   * @param {ModelComponents.Attribute} imageryTexCoordAttribute The attribute
   * @param {PrimitiveRenderResources} primitiveRenderResources The render resources
   */
  static _addImageryTexCoordAttributeToRenderResources(
    imageryTexCoordAttribute,
    primitiveRenderResources,
  ) {
    const componentsPerAttribute = AttributeType.getNumberOfComponents(
      imageryTexCoordAttribute.type,
    );
    // Convert the given object into another object that essentially
    // contains the same information, but not exactly, and with most
    // properties having slightly different names. Shrug.
    const renderResourcesAttribute = {
      index: primitiveRenderResources.attributeIndex++,
      value: defined(imageryTexCoordAttribute.buffer)
        ? undefined
        : imageryTexCoordAttribute.constant,
      vertexBuffer: imageryTexCoordAttribute.buffer,
      count: imageryTexCoordAttribute.count,
      componentsPerAttribute: componentsPerAttribute,
      componentDatatype: imageryTexCoordAttribute.componentDatatype,
      offsetInBytes: imageryTexCoordAttribute.byteOffset,
      strideInBytes: imageryTexCoordAttribute.byteStride,
      normalize: imageryTexCoordAttribute.normalized,
    };
    primitiveRenderResources.attributes.push(renderResourcesAttribute);
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

      // These are short-circuiting to `number` instead
      // of `boolean` here. With "ecmaVersion: 2021", we
      // could use "||=" here. Otherwise, there is no
      // nice shortcut for this.
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
      // This is the part that is documented as "This crazy step stuff"
      // in GlobeFS.glsl. Using the if-approach here...
      `if (textureCoordinates.x < textureCoordinateRectangle.x) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.x > textureCoordinateRectangle.z) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.y < textureCoordinateRectangle.y) effectiveAlpha = 0.0;`,
      `if (textureCoordinates.y > textureCoordinateRectangle.w) effectiveAlpha = 0.0;`,

      `vec2 translation = textureCoordinateTranslationAndScale.xy;`,
      `vec2 scale = textureCoordinateTranslationAndScale.zw;`,
      `vec2 effectiveTextureCoordinates = textureCoordinates * scale + translation;`,
      `vec4 value = texture(textureToSample, effectiveTextureCoordinates);`,
      `value = czm_srgbToLinear(value);`,

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
    if (debugDrawImageryBoundaries) {
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
   * @param {ImageryInput[]} imageryInputs The imagery inputs
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
   * @param {ImageryInput[]} imageryInputs The imagery inputs
   * @returns {object} The uniforms
   */
  static _createImageryUniforms(imageryInputs) {
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
        uniformMap[name] = function () {
          return uniforms[key];
        };
      }
    }
  }

  /**
   * Create the <code>ImageryInput</code> objects that have to be fed to the imagery
   * pipeline stage for draping the given imagery layers over the primitive
   * that is described by the given model primitive imagery.
   *
   * For each imagery layer that is currently visible (as of `show==true`), this
   * will obtain the <code>ImageryCoverage</code> objects that are provided by
   * the given model primitive imagery (and that describe the imagery tiles
   * that are covered by the primitive), and create one <code>ImageryInput</code> for
   * each of them.
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layers
   * @param {ModelPrimitiveImagery} modelPrimitiveImagery The model primitive imagery
   * @param {number[]} imageryTexCoordAttributeSetIndices The array that contains,
   * for each imagery layer index, the set index of the texture coordinate
   * attribute that should be used for this imagery. This is the value that
   * will be used to access the texture coordinate attribute
   * <code>a_imagery_texCoord_${imageryTexCoordAttributeSetIndex}</code>
   * in the shader.
   * @returns {ImageryInput[]} The imagery inputs
   */
  static _createImageryInputs(
    imageryLayers,
    modelPrimitiveImagery,
    imageryTexCoordAttributeSetIndices,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    Check.defined("modelPrimitiveImagery", modelPrimitiveImagery);
    Check.defined(
      "imageryTexCoordAttributeSetIndices",
      imageryTexCoordAttributeSetIndices,
    );
    //>>includeEnd('debug');

    const imageryInputs = [];

    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers.get(i);
      if (!imageryLayer.show) {
        continue;
      }
      const imageryTexCoordAttributeSetIndex =
        imageryTexCoordAttributeSetIndices[i];
      const mappedPositions =
        modelPrimitiveImagery.mappedPositionsForImageryLayer(imageryLayer);
      const cartographicBoundingRectangle =
        mappedPositions.cartographicBoundingRectangle;
      const coverages =
        modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);

      for (let j = 0; j < coverages.length; j++) {
        const coverage = coverages[j];
        const imageryInput = ImageryPipelineStage._createImageryInput(
          imageryLayer,
          coverage,
          cartographicBoundingRectangle,
          imageryTexCoordAttributeSetIndex,
        );
        if (defined(imageryInput)) {
          imageryInputs.push(imageryInput);
        }
      }
    }
    return imageryInputs;
  }

  /**
   * Create the `ImageryInput` that has to be passed to the imagery pipeline
   * stage, for the given `ImageryCoverage`.
   *
   * The `ImageryCoverage` describes on imagery tile that is covered by the
   * cartographic bounding rectangle of the primitive positions. This function
   * obtains the actual `Imagery` object and its texture, computes the
   * required texture coordinate and scale, and assembles this information
   * into an `ImageryInput`.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {ImageryCoverage} coverage The imagery coverage
   * @param {Rectangle} cartographicBoundingRectangle The bounding rectangle
   * of the cartographic primitive positions
   * @param {number} imageryTexCoordAttributeSetIndex The set index of the
   * texture coordinate attribute that should be used for this imagery.
   * This is the value that will be used to access the texture coordinate
   * attribute <code>a_imagery_texCoord_${imageryTexCoordAttributeSetIndex}</code>
   * in the shader.
   * @returns {ImageryInput|undefined} The imagery input, or undefined if
   * the imagery for the given coverage turned out to be in the
   * <code>ImageryState.INVALID/FAILED<code> state, or did not have
   * a valid texture.
   * @private
   */
  static _createImageryInput(
    imageryLayer,
    coverage,
    cartographicBoundingRectangle,
    imageryTexCoordAttributeSetIndex,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    Check.defined("coverage", coverage);
    Check.defined(
      "cartographicBoundingRectangle",
      cartographicBoundingRectangle,
    );
    Check.typeOf.number.greaterThanOrEquals(
      "imageryTexCoordAttributeSetIndex",
      imageryTexCoordAttributeSetIndex,
      0,
    );
    //>>includeEnd('debug');

    // Bail out early if something went wrong in the imagery
    // loading state machine
    const imagery = coverage.imagery;
    if (
      imagery.state === ImageryState.FAILED ||
      imagery.state === ImageryState.INVALID
    ) {
      return undefined;
    }

    // The texture coordinates are computed for the respective
    // imagery, so pick either the textureWebMercator or the
    // texture here
    let texture = imagery.textureWebMercator;
    if (!defined(texture)) {
      texture = imagery.texture;
      if (!defined(texture)) {
        // Print an error message only when the imagery
        // SHOULD actually have a texture
        if (imagery.state === ImageryState.READY) {
          console.log(
            `Imagery at ${coverage.x}, ${coverage.y} (level ${coverage.level}) does not have any texture - state ${imagery.state}`,
          );
        }
        return undefined;
      }
    }

    const textureTranslationAndScale =
      ImageryPipelineStage._computeTextureTranslationAndScale(
        imageryLayer,
        cartographicBoundingRectangle,
        imagery.rectangle,
      );

    // Convert the texture coordinate rectangle into a Cartesian4
    // for the consumption as a uniform in the shader
    const textureCoordinateCartesianRectangle =
      coverage.textureCoordinateRectangle;
    const textureCoordinateRectangle = new Cartesian4(
      textureCoordinateCartesianRectangle.minX,
      textureCoordinateCartesianRectangle.minY,
      textureCoordinateCartesianRectangle.maxX,
      textureCoordinateCartesianRectangle.maxY,
    );

    const imageryInput = new ImageryInput(
      imageryLayer,
      texture,
      textureTranslationAndScale,
      textureCoordinateRectangle,
      imageryTexCoordAttributeSetIndex,
    );
    return imageryInput;
  }

  /**
   * Compute the translation and scale that has to be applied to
   * the texture coordinates for mapping the given imagery to
   * the geometry.
   *
   * The given rectangles will be converted into their "native" representation,
   * using the tiling scheme of the given imagery layer, and passed
   * to `_computeTextureTranslationAndScaleFromNative` (see that for details).
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {Rectangle} nonNativeBoundingRectangle The bounding
   * rectangle of the geometry
   * @param {Rectangle} nonNativeImageryRectangle The bounding
   * rectangle of the imagery
   * @returns {Cartesian4} The translation and scale
   * @private
   */
  static _computeTextureTranslationAndScale(
    imageryLayer,
    nonNativeBoundingRectangle,
    nonNativeImageryRectangle,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    Check.defined("nonNativeBoundingRectangle", nonNativeBoundingRectangle);
    Check.defined("nonNativeImageryRectangle", nonNativeImageryRectangle);
    //>>includeEnd('debug');

    const tilingScheme = imageryLayer.imageryProvider.tilingScheme;

    const nativeBoundingRectangle = tilingScheme.rectangleToNativeRectangle(
      nonNativeBoundingRectangle,
      nativeBoundingRectangleScratch,
    );
    const nativeImageryRectangle = tilingScheme.rectangleToNativeRectangle(
      nonNativeImageryRectangle,
      nativeImageryRectangleScratch,
    );

    const translationAndScale =
      ImageryPipelineStage._computeTextureTranslationAndScaleFromNative(
        nativeBoundingRectangle,
        nativeImageryRectangle,
      );
    return translationAndScale;
  }

  /**
   * Compute the translation and scale that has to be applied to
   * the texture coordinates for mapping the given imagery rectangle
   * to the geometry rectangle.
   *
   * This will compute a Cartesian4 containing the
   * (offsetX, offsetY, scaleX, scaleY) that have to be applied to
   * the texture coordinates that that have been computed with
   * `ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions`.
   * In the shader, this offset and scale will map the given imagery rectangle
   * to the geometry * rectangle.
   *
   * @param {Imagery} imagery The imagery
   * @param {Rectangle} nonNativeBoundingRectangle The bounding
   * rectangle of the geometry
   * @param {Rectangle} nonNativeImageryRectangle The bounding
   * rectangle of the imagery
   * @returns {Cartesian4} The translation and scale
   * @private
   */
  static _computeTextureTranslationAndScaleFromNative(
    nativeBoundingRectangle,
    nativeImageryRectangle,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("nativeBoundingRectangle", nativeBoundingRectangle);
    Check.defined("nativeImageryRectangle", nativeImageryRectangle);
    //>>includeEnd('debug');

    const invImageryWidth = 1.0 / nativeImageryRectangle.width;
    const invImageryHeight = 1.0 / nativeImageryRectangle.height;
    const deltaWest =
      nativeBoundingRectangle.west - nativeImageryRectangle.west;
    const deltaSouth =
      nativeBoundingRectangle.south - nativeImageryRectangle.south;
    const offsetX = deltaWest * invImageryWidth;
    const offsetY = deltaSouth * invImageryHeight;
    const scaleX = nativeBoundingRectangle.width * invImageryWidth;
    const scaleY = nativeBoundingRectangle.height * invImageryHeight;
    return new Cartesian4(offsetX, offsetY, scaleX, scaleY);
  }

  /**
   * Computes the index mapping from the given source to the given target.
   *
   * The result will be an array that has the same length as the source,
   * and contains the indices that the source elements have in the
   * target array.
   *
   * @param {object[]} source The source array
   * @param {object[]} target The target array
   * @returns {number[]} The result
   */
  static _computeIndexMapping(source, target) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("source", source);
    Check.defined("target", target);
    //>>includeEnd('debug');

    const result = [];
    const length = source.length;
    for (let i = 0; i < length; i++) {
      const element = source[i];
      const index = target.indexOf(element);
      result.push(index);
    }
    return result;
  }
}

// Static properties (direct initialization disallowed by eslint)
//ImageryPipelineStage.name = "ImageryPipelineStage"; // Helps with debugging, if you know where to look

export default ImageryPipelineStage;
