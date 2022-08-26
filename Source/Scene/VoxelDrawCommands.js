import Cartesian3 from "../Core/Cartesian3";
import combine from "../Core/combine.js";
import defined from "../Core/defined";
import PrimitiveType from "../Core/PrimitiveType.js";
import BlendingState from "./BlendingState.js";
import CullFace from "./CullFace.js";
import getClippingFunction from "./getClippingFunction.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Pass from "../Renderer/Pass.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderBuilder from "../Renderer/ShaderBuilder.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import VoxelFS from "../Shaders/Voxels/VoxelFS.js";
import VoxelVS from "../Shaders/Voxels/VoxelVS.js";
import IntersectionUtils from "../Shaders/Voxels/IntersectionUtils.js";
import IntersectDepth from "../Shaders/Voxels/IntersectDepth.js";
import IntersectClippingPlanes from "../Shaders/Voxels/IntersectClippingPlanes.js";
import IntersectBox from "../Shaders/Voxels/IntersectBox.js";
import IntersectCylinder from "../Shaders/Voxels/IntersectCylinder.js";
import IntersectEllipsoid from "../Shaders/Voxels/IntersectEllipsoid.js";
import Intersection from "../Shaders/Voxels/Intersection.js";
import convertUvToBox from "../Shaders/Voxels/convertUvToBox.js";
import convertUvToCylinder from "../Shaders/Voxels/convertUvToCylinder.js";
import convertUvToEllipsoid from "../Shaders/Voxels/convertUvToEllipsoid.js";
import Octree from "../Shaders/Voxels/Octree.js";
import Megatexture from "../Shaders/Voxels/Megatexture.js";
import MetadataType from "./MetadataType.js";

/**
 * @function
 *
 * @param {VoxelPrimitive} primitive
 * @param {Context} context
 *
 * @private
 */
function buildVoxelDrawCommands(primitive, context) {
  const provider = primitive._provider;
  const traversal = primitive._traversal;
  const types = provider.types;
  const componentTypes = provider.componentTypes;
  const depthTest = primitive._depthTest;
  const shape = primitive._shape;
  const minimumValues = provider.minimumValues;
  const maximumValues = provider.maximumValues;
  const customShader = primitive._customShader;
  const attributeLength = types.length;
  const hasStatistics = defined(minimumValues) && defined(maximumValues);
  const clippingPlanes = primitive._clippingPlanes;
  const clippingPlanesLength =
    defined(clippingPlanes) && clippingPlanes.enabled
      ? clippingPlanes.length
      : 0;
  const clippingPlanesUnion = defined(clippingPlanes)
    ? clippingPlanes.unionClippingRegions
    : false;

  // Build shader

  const shaderBuilder = new ShaderBuilder();

  // Vertex shader

  shaderBuilder.addVertexLines([VoxelVS]);

  // Fragment shader

  shaderBuilder.addFragmentLines([
    customShader.fragmentShaderText,
    "#line 0",
    IntersectionUtils,
  ]);
  if (depthTest) {
    shaderBuilder.addFragmentLines([IntersectDepth]);
  }
  if (clippingPlanesLength > 0) {
    shaderBuilder.addFragmentLines([IntersectClippingPlanes]);
  }

  const shapeType = provider.shape;
  if (shapeType === "BOX") {
    shaderBuilder.addFragmentLines([
      IntersectBox,
      Intersection,
      convertUvToBox,
    ]);
  } else if (shapeType === "CYLINDER") {
    shaderBuilder.addFragmentLines([
      IntersectCylinder,
      Intersection,
      convertUvToCylinder,
    ]);
  } else if (shapeType === "ELLIPSOID") {
    shaderBuilder.addFragmentLines([
      IntersectEllipsoid,
      Intersection,
      convertUvToEllipsoid,
    ]);
  }

  shaderBuilder.addFragmentLines([Octree, Megatexture, VoxelFS]);

  // Fragment shader defines

  shaderBuilder.addDefine(
    "METADATA_COUNT",
    attributeLength,
    ShaderDestination.FRAGMENT
  );

  if (
    !Cartesian3.equals(primitive.paddingBefore, Cartesian3.ZERO) ||
    !Cartesian3.equals(primitive.paddingAfter, Cartesian3.ZERO)
  ) {
    shaderBuilder.addDefine("PADDING", undefined, ShaderDestination.FRAGMENT);
  }
  if (depthTest) {
    shaderBuilder.addDefine(
      "DEPTH_TEST",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  // Allow reading from log depth texture, but don't write log depth anywhere.
  // Note: This needs to be set even if depthTest is off because it affects the
  // derived command system.
  if (primitive._useLogDepth) {
    shaderBuilder.addDefine(
      "LOG_DEPTH_READ_ONLY",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (primitive._jitter) {
    shaderBuilder.addDefine("JITTER", undefined, ShaderDestination.FRAGMENT);
  }
  if (primitive._nearestSampling) {
    shaderBuilder.addDefine(
      "NEAREST_SAMPLING",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }
  if (hasStatistics) {
    shaderBuilder.addDefine(
      "STATISTICS",
      undefined,
      ShaderDestination.FRAGMENT
    );
  }

  if (clippingPlanesLength > 0) {
    shaderBuilder.addDefine(
      "CLIPPING_PLANES",
      undefined,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addDefine(
      "CLIPPING_PLANES_COUNT",
      clippingPlanesLength,
      ShaderDestination.FRAGMENT
    );
    if (clippingPlanesUnion) {
      shaderBuilder.addDefine(
        "CLIPPING_PLANES_UNION",
        undefined,
        ShaderDestination.FRAGMENT
      );
    }
  }

  // Count how many intersections the shader will do.
  let intersectionCount = shape.shaderMaximumIntersectionsLength;

  if (clippingPlanesLength > 0) {
    shaderBuilder.addDefine(
      "CLIPPING_PLANES_INTERSECTION_INDEX",
      intersectionCount,
      ShaderDestination.FRAGMENT
    );
    if (clippingPlanesLength === 1) {
      intersectionCount += 1;
    } else if (clippingPlanesUnion) {
      intersectionCount += 2;
    } else {
      intersectionCount += 1;
    }
  }

  if (depthTest) {
    shaderBuilder.addDefine(
      "DEPTH_INTERSECTION_INDEX",
      intersectionCount,
      ShaderDestination.FRAGMENT
    );
    intersectionCount += 1;
  }

  shaderBuilder.addDefine(
    "INTERSECTION_COUNT",
    intersectionCount,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addDefine(
    "SAMPLE_COUNT",
    `${traversal._sampleCount}`,
    ShaderDestination.FRAGMENT
  );

  const shapeDefines = shape.shaderDefines;
  for (const key in shapeDefines) {
    if (shapeDefines.hasOwnProperty(key)) {
      let value = shapeDefines[key];
      // if value is undefined, don't define it
      // if value is true, define it to nothing
      if (defined(value)) {
        value = value === true ? undefined : value;
        shaderBuilder.addDefine(key, value, ShaderDestination.FRAGMENT);
      }
    }
  }

  // Fragment shader uniforms

  // Custom shader uniforms
  const customShaderUniforms = customShader.uniforms;
  let uniformMap = primitive._uniformMap;
  uniformMap = primitive._uniformMap = combine(
    uniformMap,
    customShader.uniformMap
  );
  for (const uniformName in customShaderUniforms) {
    if (customShaderUniforms.hasOwnProperty(uniformName)) {
      const uniform = customShaderUniforms[uniformName];
      shaderBuilder.addUniform(
        uniform.type,
        uniformName,
        ShaderDestination.FRAGMENT
      );
    }
  }

  // The reason this uniform is added by shader builder is because some of the
  // dynamically generated shader code reads from it.
  shaderBuilder.addUniform(
    "sampler2D",
    "u_megatextureTextures[METADATA_COUNT]",
    ShaderDestination.FRAGMENT
  );

  // Fragment shader structs
  const names = provider.names;

  // PropertyStatistics structs
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const propertyStatisticsStructId = `PropertyStatistics_${name}`;
    const propertyStatisticsStructName = `PropertyStatistics_${name}`;
    shaderBuilder.addStruct(
      propertyStatisticsStructId,
      propertyStatisticsStructName,
      ShaderDestination.FRAGMENT
    );
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "min");
    shaderBuilder.addStructField(propertyStatisticsStructId, glslType, "max");
  }

  // Statistics struct
  const statisticsStructId = "Statistics";
  const statisticsStructName = "Statistics";
  const statisticsFieldName = "statistics";
  shaderBuilder.addStruct(
    statisticsStructId,
    statisticsStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const propertyStructName = `PropertyStatistics_${name}`;
    const propertyFieldName = name;
    shaderBuilder.addStructField(
      statisticsStructId,
      propertyStructName,
      propertyFieldName
    );
  }

  // Metadata struct
  const metadataStructId = "Metadata";
  const metadataStructName = "Metadata";
  const metadataFieldName = "metadata";
  shaderBuilder.addStruct(
    metadataStructId,
    metadataStructName,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addStructField(
    metadataStructId,
    statisticsStructName,
    statisticsFieldName
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(metadataStructId, glslType, name);
  }

  // VoxelProperty structs
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslPartialDerivativeType(type);
    const voxelPropertyStructId = `VoxelProperty_${name}`;
    const voxelPropertyStructName = `VoxelProperty_${name}`;
    shaderBuilder.addStruct(
      voxelPropertyStructId,
      voxelPropertyStructName,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeLocal"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeWorld"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeView"
    );
    shaderBuilder.addStructField(
      voxelPropertyStructId,
      glslType,
      "partialDerivativeValid"
    );
  }

  // Voxel struct
  const voxelStructId = "Voxel";
  const voxelStructName = "Voxel";
  const voxelFieldName = "voxel";
  shaderBuilder.addStruct(
    voxelStructId,
    voxelStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const voxelPropertyStructName = `VoxelProperty_${name}`;
    shaderBuilder.addStructField(voxelStructId, voxelPropertyStructName, name);
  }
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionEC");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionShapeUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "positionUvLocal");
  shaderBuilder.addStructField(voxelStructId, "vec3", "viewDirUv");
  shaderBuilder.addStructField(voxelStructId, "vec3", "viewDirWorld");
  shaderBuilder.addStructField(voxelStructId, "float", "travelDistance");

  // FragmentInput struct
  const fragmentInputStructId = "FragmentInput";
  const fragmentInputStructName = "FragmentInput";
  shaderBuilder.addStruct(
    fragmentInputStructId,
    fragmentInputStructName,
    ShaderDestination.FRAGMENT
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    metadataStructName,
    metadataFieldName
  );
  shaderBuilder.addStructField(
    fragmentInputStructId,
    voxelStructName,
    voxelFieldName
  );

  // Properties struct
  const propertiesStructId = "Properties";
  const propertiesStructName = "Properties";
  const propertiesFieldName = "properties";
  shaderBuilder.addStruct(
    propertiesStructId,
    propertiesStructName,
    ShaderDestination.FRAGMENT
  );
  for (let i = 0; i < attributeLength; i++) {
    const name = names[i];
    const type = types[i];
    const glslType = getGlslType(type);
    shaderBuilder.addStructField(propertiesStructId, glslType, name);
  }

  // Fragment shader functions

  // clearProperties function
  {
    const functionId = "clearProperties";
    shaderBuilder.addFunction(
      functionId,
      `${propertiesStructName} clearProperties()`,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentType = componentTypes[i];
      const glslType = getGlslType(type, componentType);
      shaderBuilder.addFunctionLines(functionId, [
        `${propertiesFieldName}.${name} = ${glslType}(0.0);`,
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
      ShaderDestination.FRAGMENT
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
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} scaledProperties = ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      shaderBuilder.addFunctionLines(functionId, [
        `scaledProperties.${name} *= scale;`,
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
      ShaderDestination.FRAGMENT
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
      ShaderDestination.FRAGMENT
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
      `void setStatistics(inout ${statisticsStructName} ${statisticsFieldName})`,
      ShaderDestination.FRAGMENT
    );
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentCount = MetadataType.getComponentCount(type);
      for (let j = 0; j < componentCount; j++) {
        const glslField = getGlslField(type, j);
        const minimumValue = minimumValues[i][j];
        const maximumValue = maximumValues[i][j];
        shaderBuilder.addFunctionLines(functionId, [
          `${statisticsFieldName}.${name}.min${glslField} = ${getGlslNumberAsFloat(
            minimumValue
          )};`,
          `${statisticsFieldName}.${name}.max${glslField} = ${getGlslNumberAsFloat(
            maximumValue
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
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [
      `${propertiesStructName} ${propertiesFieldName};`,
    ]);
    for (let i = 0; i < attributeLength; i++) {
      const name = names[i];
      const type = types[i];
      const componentType = componentTypes[i];
      const glslTextureSwizzle = getGlslTextureSwizzle(type, componentType);
      shaderBuilder.addFunctionLines(functionId, [
        `properties.${name} = texture2D(u_megatextureTextures[${i}], texcoord)${glslTextureSwizzle};`,
      ]);
    }
    shaderBuilder.addFunctionLines(functionId, [
      `return ${propertiesFieldName};`,
    ]);
  }

  if (clippingPlanesLength > 0) {
    // Extract the getClippingPlane function from the getClippingFunction string.
    // This is a bit of a hack.
    const functionId = "getClippingPlane";
    const entireFunction = getClippingFunction(clippingPlanes, context);
    const functionSignatureBegin = 0;
    const functionSignatureEnd = entireFunction.indexOf(")") + 1;
    const functionBodyBegin =
      entireFunction.indexOf("{", functionSignatureEnd) + 1;
    const functionBodyEnd = entireFunction.indexOf("}", functionBodyBegin);
    const functionSignature = entireFunction.slice(
      functionSignatureBegin,
      functionSignatureEnd
    );
    const functionBody = entireFunction.slice(
      functionBodyBegin,
      functionBodyEnd
    );
    shaderBuilder.addFunction(
      functionId,
      functionSignature,
      ShaderDestination.FRAGMENT
    );
    shaderBuilder.addFunctionLines(functionId, [functionBody]);
  }

  // Compile shaders
  const shaderBuilderPick = shaderBuilder.clone();
  shaderBuilderPick.addDefine("PICKING", undefined, ShaderDestination.FRAGMENT);
  const shaderProgram = shaderBuilder.buildShaderProgram(context);
  const shaderProgramPick = shaderBuilderPick.buildShaderProgram(context);
  const renderState = RenderState.fromCache({
    cull: {
      enabled: true,
      face: CullFace.BACK,
    },
    depthTest: {
      enabled: false,
    },
    depthMask: false,
    // internally the shader does premultiplied alpha, so it makes sense to blend that way too
    blending: BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
  });

  // Create the draw commands
  const viewportQuadVertexArray = context.getViewportQuadVertexArray();
  const drawCommand = new DrawCommand({
    vertexArray: viewportQuadVertexArray,
    primitiveType: PrimitiveType.TRIANGLES,
    renderState: renderState,
    shaderProgram: shaderProgram,
    uniformMap: uniformMap,
    pass: Pass.VOXELS,
    executeInClosestFrustum: true,
    owner: this,
    cull: depthTest, // don't cull or occlude if depth testing is off
    occlude: depthTest, // don't cull or occlude if depth testing is off
  });

  // Create the pick draw command
  const drawCommandPick = DrawCommand.shallowClone(
    drawCommand,
    new DrawCommand()
  );
  drawCommandPick.shaderProgram = shaderProgramPick;
  drawCommandPick.pickOnly = true;

  // Delete the old shader programs
  if (defined(primitive._drawCommand)) {
    const command = primitive._drawCommand;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }
  if (defined(primitive._drawCommandPick)) {
    const command = primitive._drawCommandPick;
    command.shaderProgram =
      command.shaderProgram && command.shaderProgram.destroy();
  }

  primitive._drawCommand = drawCommand;
  primitive._drawCommandPick = drawCommandPick;
}

// Shader builder helpers

/**
 * Converts a {@link MetadataType} to a GLSL type.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {String} The GLSL type.
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
 * @returns {String} The GLSL swizzle.
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
 * Gets the GLSL type of the partial derivative of {@link MetadataType}.
 *
 * @function
 *
 * @param {MetadataType} type The {@link MetadataType}.
 * @returns {String} The GLSL type.
 *
 * @private
 */
function getGlslPartialDerivativeType(type) {
  if (type === MetadataType.SCALAR) {
    return "vec3";
  } else if (type === MetadataType.VEC2) {
    return "mat2";
  } else if (type === MetadataType.VEC3) {
    return "mat3";
  } else if (type === MetadataType.VEC4) {
    return "mat4";
  }
}

/**
 * GLSL needs to have `.0` at the end of whole number floats or else it's
 * treated like an integer.
 *
 * @function
 *
 * @param {Number} number The number to convert.
 * @returns {String} The number as floating point in GLSL.
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
 * @param {Number} index
 * @returns {String}
 *
 * @private
 */
function getGlslField(type, index) {
  if (type === MetadataType.SCALAR) {
    return "";
  }
  return `[${index}]`;
}

export default buildVoxelDrawCommands;
