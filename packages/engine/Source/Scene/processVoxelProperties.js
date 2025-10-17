import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";

/**
 * Update the shader with defines, structs, and functions to handle
 * voxel properties and statistics
 * @function
 *
 * @param {VoxelRenderResources} renderResources
 * @param {VoxelPrimitive} primitive
 *
 * @private
 */
function processVoxelProperties(renderResources, primitive) {
  const { shaderBuilder } = renderResources;

  const { names, types, componentTypes, minimumValues, maximumValues } =
    primitive._provider;

  const attributeLength = types.length;
  const hasStatistics = defined(minimumValues) && defined(maximumValues);

  shaderBuilder.addDefine(
    "METADATA_COUNT",
    attributeLength,
    ShaderDestination.FRAGMENT,
  );

  if (hasStatistics) {
    shaderBuilder.addDefine(
      "STATISTICS",
      undefined,
      ShaderDestination.FRAGMENT,
    );
  }

  // PropertyStatistics structs
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const glslType = getGlslType(types[i]);
    const propertyStatisticsStructId = `PropertyStatistics_${name}`;
    const propertyStatisticsStructName = `PropertyStatistics_${name}`;
    shaderBuilder.addStruct(
      propertyStatisticsStructId,
      propertyStatisticsStructName,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "min");
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "max");
  }

  // MetadataStatistics struct
  const metadataStatisticsStructId = "MetadataStatistics";
  const metadataStatisticsStructName = "MetadataStatistics";
  const metadataStatisticsFieldName = "metadataStatistics";
  shaderBuilder.addStruct(
    metadataStatisticsStructId,
    metadataStatisticsStructName,
    ShaderDestination.FRAGMENT,
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const propertyStructName = `PropertyStatistics_${name}`;
    const propertyFieldName = name;
    shaderBuilder.addStructField(
      metadataStatisticsStructId,
      propertyStructName,
      propertyFieldName,
    );
  }

  // Metadata struct
  const metadataStructId = "Metadata";
  const metadataStructName = "Metadata";
  const metadataFieldName = "metadata";
  shaderBuilder.addStruct(
    metadataStructId,
    metadataStructName,
    ShaderDestination.FRAGMENT,
  );
  for (let i = 0; i < attributeLength; i++) {
    const glslType = getGlslType(types[i]);
    shaderBuilder.addStructField(metadataStructId, glslType, names[i]);
  }

  // Attributes struct
  const attributesStructId = "Attributes";
  const attributesStructName = "Attributes";
  const attributesFieldName = "attributes";
  shaderBuilder.addStruct(
    attributesStructId,
    attributesStructName,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addStructField(attributesStructId, "vec3", "positionEC");
  shaderBuilder.addStructField(attributesStructId, "vec3", "normalEC");

  // Voxel struct
  const voxelStructId = "Voxel";
  const voxelStructName = "Voxel";
  const voxelFieldName = "voxel";
  shaderBuilder.addStruct(
    voxelStructId,
    voxelStructName,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addStructField(voxelStructId, "vec3", "viewDirUv");
  shaderBuilder.addStructField(voxelStructId, "float", "travelDistance");
  shaderBuilder.addStructField(voxelStructId, "int", "stepCount");
  shaderBuilder.addStructField(voxelStructId, "int", "tileIndex");
  shaderBuilder.addStructField(voxelStructId, "int", "sampleIndex");
  shaderBuilder.addStructField(voxelStructId, "float", "distanceToDepthBuffer");

  // FragmentInput struct
  const fragmentInputStructId = "FragmentInput";
  const fragmentInputStructName = "FragmentInput";
  shaderBuilder.addStruct(
    fragmentInputStructId,
    fragmentInputStructName,
    ShaderDestination.FRAGMENT,
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    metadataStatisticsStructName,
    metadataStatisticsFieldName,
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    metadataStructName,
    metadataFieldName,
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    attributesStructName,
    attributesFieldName,
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    voxelStructName,
    voxelFieldName,
  );

  // Properties struct
  const propertiesStructId = "Properties";
  const propertiesStructName = "Properties";
  const propertiesFieldName = "properties";
  shaderBuilder.addStruct(
    propertiesStructId,
    propertiesStructName,
    ShaderDestination.FRAGMENT,
  );
  for (let i = 0; i < attributeLength; i++) {
    const glslType = getGlslType(types[i]);
    shaderBuilder.addStructField(propertiesStructId, glslType, names[i]);
  }

  // Fragment shader functions

  // clearProperties function
  {
    const functionId = "clearProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} clearProperties()`,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const glslType = getGlslType(types[i], componentTypes[i]);
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${names[i]} = ${glslType}(0.0);`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // sumProperties function
  {
    const functionId = "sumProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} sumProperties(${propertiesStructName} propertiesA, ${propertiesStructName} propertiesB)`,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = propertiesA.${name} + propertiesB.${name};`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // scaleProperties function
  {
    const functionId = "scaleProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} scaleProperties(${propertiesStructName} ${propertiesFieldName}, float scale)`,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} scaledProperties = ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      shaderBuilder.addFunctionLines(functionId, [
        `scaledProperties.${names[i]} *= scale;`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [`return scaledProperties;`]);
  }

  // mixProperties
  {
    const functionId = "mixProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} mixProperties(${propertiesStructName} propertiesA, ${propertiesStructName} propertiesB, float mixFactor)`,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = mix(propertiesA.${name}, propertiesB.${name}, mixFactor);`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  // copyPropertiesToMetadata
  {
    const functionId = "copyPropertiesToMetadata";
    shaderBuilder.addFunction(
      functionId,
      `void copyPropertiesToMetadata(in ${propertiesStructName} ${propertiesFieldName}, inout ${metadataStructName} ${metadataFieldName})`,
      ShaderDestination.FRAGMENT,
    );
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `${metadataFieldName}.${name} = ${propertiesFieldName}.${name};`,
      ]);
    }
  }

  // setStatistics function
  if (hasStatistics) {
    const functionId = "setStatistics";
    shaderBuilder.addFunction(
      functionId,
      `void setStatistics(inout ${metadataStatisticsStructName} ${metadataStatisticsFieldName})`,
      ShaderDestination.FRAGMENT,
    );
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentCount = MetadataType.getComponentCount(type);
      for (let j = 0; j < componentCount; j++) {
        const glslField = getGlslField(type, j);
        const minimumValue = minimumValues[i][j];
        const maximumValue = maximumValues[i][j];
        if (!defined(minimumValue) || !defined(maximumValue)) {
          continue;
        }
        shaderBuilder.addFunctionLines(functionId, [
          `${metadataStatisticsFieldName}.${name}.min${glslField} = ${getGlslNumberAsFloat(
            minimumValue,
          )};`,
          `${metadataStatisticsFieldName}.${name}.max${glslField} = ${getGlslNumberAsFloat(
            maximumValue,
          )};`,
        ]);
      }
    }
  }

  // getPropertiesFromMegatextureAtUv
  {
    const functionId = "getPropertiesFromMegatextureAtUv";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} getPropertiesFromMegatextureAtUv(vec2 texcoord)`,
      ShaderDestination.FRAGMENT,
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const type = types[i];
      const componentType = componentTypes[i];
      const glslTextureSwizzle = getGlslTextureSwizzle(type, componentType);
      shaderBuilder.addFunctionLines(functionId, [
        `properties.${names[i]} = texture(u_megatextureTextures[${i}], texcoord)${glslTextureSwizzle};`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }
}

/**
 * Converts a {@link MetadataType} to a GLSL type.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {string} The GLSL type.
 *
 * @private
 */
function getGlslType(type) {
  if (type === MetadataType.SCALAR) {
    return "float";
  } else if (type === MetadataType.VEC2) {
    return "vec2";
  } else if (type === MetadataType.VEC3) {
    return "vec3";
  } else if (type === MetadataType.VEC4) {
    return "vec4";
  }
}

/**
 * Gets the GLSL swizzle when reading data from a texture.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {string} The GLSL swizzle.
 *
 * @private
 */
function getGlslTextureSwizzle(type) {
  if (type === MetadataType.SCALAR) {
    return ".r";
  } else if (type === MetadataType.VEC2) {
    return ".ra";
  } else if (type === MetadataType.VEC3) {
    return ".rgb";
  } else if (type === MetadataType.VEC4) {
    return "";
  }
}

/**
 * GLSL needs to have `.0` at the end of whole number floats or else it's
 * treated like an integer.
 *
 * @function
 *
 * @param {number} number The number to convert.
 * @returns {string} The number as floating point in GLSL.
 *
 * @private
 */
function getGlslNumberAsFloat(number) {
  let numberString = number.toString();
  if (numberString.indexOf(".") === -1) {
    numberString = `${number}.0`;
  }
  return numberString;
}

/**
 * Gets the GLSL field
 *
 * @function
 *
 * @param {MetadataType} type
 * @param {number} index
 * @returns {string}
 *
 * @private
 */
function getGlslField(type, index) {
  if (type === MetadataType.SCALAR) {
    return "";
  }
  return `[${index}]`;
}

export default processVoxelProperties;
