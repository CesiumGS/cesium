import Color from "../Core/Color.js";
import CustomShader from "./Model/CustomShader.js";
import defined from "../Core/defined.js";
import MetadataComponentType from "./MetadataComponentType.js";
import MetadataType from "./MetadataType.js";
import TextureUniform from "./Model/TextureUniform.js";
import UniformType from "./Model/UniformType.js";

/**
 * Builds a custom shader for a voxel primitive based on information
 * from the VoxelProvider about the metadata properties.
 *
 * Supports scalar float properties, or vec3 or vec4 properties of type uint8 or float32.
 *
 * @function
 *
 * @param {VoxelProvider} provider The VoxelProvider for the primitive.
 * @returns {CustomShader|undefined} A custom shader for the primitive, or undefined if a shader could not be constructed.
 *
 * @private
 */
function buildVoxelCustomShader(provider) {
  const { names, types, componentTypes, minimumValues, maximumValues } =
    provider;

  // Loop over metadata properties and build a shader for the first property
  // that has a supported type and component type.
  for (let i = 0; i < names.length; i++) {
    const shader = constructMetadataShader(
      names[i],
      types[i],
      componentTypes[i],
      minimumValues?.[i],
      maximumValues?.[i],
    );
    if (defined(shader)) {
      return shader;
    }
  }
}

/**
 * Construct a metadata shader for a single metadata property.
 *
 * @param {string} name The name of the metadata property.
 * @param {MetadataType} type The type of the metadata property.
 * @param {MetadataComponentType} componentType The component type of the metadata property.
 * @param {number[]} minimumValue The minimum value of the metadata property.
 * @param {number[]} maximumValue The maximum value of the metadata property.
 * @returns {CustomShader|undefined} A custom shader for the metadata property, or undefined if a shader could not be constructed.
 *
 * @private
 */
function constructMetadataShader(
  name,
  type,
  componentType,
  minimumValue,
  maximumValue,
) {
  if (!defined(minimumValue) || !defined(maximumValue)) {
    // We need minimum and maximum values to construct a shader.
    return;
  }
  if (
    type === MetadataType.VEC4 &&
    componentType === MetadataComponentType.FLOAT32
  ) {
    return buildColorShader(name, minimumValue, maximumValue);
  } else if (
    type === MetadataType.SCALAR &&
    componentType === MetadataComponentType.FLOAT32
  ) {
    return buildColorMapShader(name, minimumValue, maximumValue);
  }
}

/**
 * Build a color shader for a metadata property of type VEC4 and component type FLOAT32.
 *
 * @param {string} name The name of the metadata property.
 * @param {number[]} minimumValue The minimum value of the metadata property.
 * @param {number[]} maximumValue The maximum value of the metadata property.
 * @returns {CustomShader|undefined} A custom shader for the metadata property, or undefined if a shader could not be constructed.
 *
 * @private
 */
function buildColorShader(name, minimumValue, maximumValue) {
  // Check if the values are in a range that would be meaningful to interpret as colors.
  const minComponent = Math.min(...minimumValue);
  const maxComponent = Math.max(...maximumValue);
  if (minComponent < 0 || maxComponent > 1) {
    // The data is out of the range expected for colors, so a color shader will be meaningless.
    return;
  }
  if (maxComponent - minComponent === 0) {
    // The data is constant, so a color shader will be meaningless.
    return;
  }

  return new CustomShader({
    fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
{
    material.diffuse = fsInput.metadata.${name}.rgb;
    material.alpha = fsInput.metadata.${name}.a;
}`,
  });
}

/**
 * Build a color map shader for a metadata property of type SCALAR and component type FLOAT32.
 *
 * @param {string} name The name of the metadata property.
 * @param {number[]} minimumValue The minimum value of the metadata property.
 * @param {number[]} maximumValue The maximum value of the metadata property.
 * @returns {CustomShader|undefined} A custom shader for the metadata property, or undefined if a shader could not be constructed.
 *
 * @private
 */
function buildColorMapShader(name, minimumValue, maximumValue) {
  if (maximumValue - minimumValue === 0) {
    // The data is constant, so a color map shader will be meaningless.
    return;
  }

  // Perceptually uniform color map similar to the "viridis" color map used in scientific visualization.
  const colorMapWidth = 128;
  const colorMap = createColorRamp(
    [
      new Color(0.267, 0.004, 0.329),
      new Color(0.282, 0.14, 0.457),
      new Color(0.254, 0.265, 0.53),
      new Color(0.207, 0.372, 0.553),
      new Color(0.164, 0.471, 0.558),
      new Color(0.128, 0.567, 0.551),
      new Color(0.135, 0.659, 0.518),
      new Color(0.194, 0.741, 0.443),
      new Color(0.282, 0.819, 0.369),
      new Color(0.396, 0.898, 0.301),
      new Color(0.538, 0.965, 0.236),
      new Color(0.741, 0.998, 0.149),
      new Color(0.993, 1.0, 0.144),
    ],
    colorMapWidth,
  );

  const textureUniform = new TextureUniform({
    typedArray: colorMap,
    width: colorMapWidth,
    height: 1,
  });

  return new CustomShader({
    uniforms: {
      u_colorMap: {
        type: UniformType.SAMPLER_2D,
        value: textureUniform,
      },
      // The starting values are also available in the shader from the metadata statistics.
      // But by using uniforms, we enable later dynamic changes to the range.
      u_minimumValue: {
        type: UniformType.FLOAT,
        value: minimumValue[0],
      },
      u_maximumValue: {
        type: UniformType.FLOAT,
        value: maximumValue[0],
      },
    },
    fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      float value = fsInput.metadata.${name};
      float valMin = fsInput.metadataStatistics.${name}.min;
      float valMax = fsInput.metadataStatistics.${name}.max;
      vec3 voxelNormal = fsInput.attributes.normalEC;
      float diffuse = max(0.0, dot(voxelNormal, czm_lightDirectionEC));
      float lighting = 0.5 + 0.5 * diffuse;

      if (value >= u_minimumValue && value <= u_maximumValue) {
        float lerp = (value - valMin) / (valMax - valMin);
        material.diffuse = texture(u_colorMap, vec2(lerp, 0.5)).rgb * lighting;
        material.alpha = 1.0;
      }
  }`,
  });
}

/**
 * Create a color ramp that linearly interpolates between the given colors.
 *
 * @param {Color[]} colors The array of colors to use for the color ramp.
 * @param {number} rampWidth The width of the color ramp texture to create.
 * @returns {Uint8Array} A typed array representing the color ramp.
 *
 * @private
 */
function createColorRamp(colors, rampWidth) {
  const ramp = document.createElement("canvas");
  ramp.width = rampWidth;
  ramp.height = 1;
  const ctx = ramp.getContext("2d");
  const grd = ctx.createLinearGradient(0, 0, ramp.width, 0);

  const stepSize = 1 / (colors.length - 1);
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    const stop = i * stepSize;
    const cssColor = color.toCssColorString();
    grd.addColorStop(stop, cssColor);
  }

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, ramp.width, ramp.height);

  const imageData = ctx.getImageData(0, 0, ramp.width, ramp.height);
  const array = new Uint8Array(imageData.data.buffer);
  return array;
}

export default buildVoxelCustomShader;
