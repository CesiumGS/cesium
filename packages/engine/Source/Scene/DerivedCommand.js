import { MetadataComponentType } from "@cesium/engine";
import defined from "../Core/defined.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import MetadataType from "./MetadataType.js";
import MetadataPickingPipelineStage from "./Model/MetadataPickingPipelineStage.js";

/**
 * @private
 */
function DerivedCommand() {}

const fragDepthRegex = /\bgl_FragDepth\b/;
const discardRegex = /\bdiscard\b/;

function getDepthOnlyShaderProgram(context, shaderProgram) {
  const cachedShader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "depthOnly",
  );
  if (defined(cachedShader)) {
    return cachedShader;
  }

  let fs = shaderProgram.fragmentShaderSource;

  let writesDepthOrDiscards = false;
  const sources = fs.sources;
  for (let i = 0; i < sources.length; ++i) {
    if (fragDepthRegex.test(sources[i]) || discardRegex.test(sources[i])) {
      writesDepthOrDiscards = true;
      break;
    }
  }

  const usesLogDepth = fs.defines.indexOf("LOG_DEPTH") >= 0;

  if (!writesDepthOrDiscards && !usesLogDepth) {
    const source = `void main()
{
    out_FragColor = vec4(1.0);
}
`;
    fs = new ShaderSource({
      sources: [source],
    });
  } else if (!writesDepthOrDiscards && usesLogDepth) {
    const source = `void main()
{
    out_FragColor = vec4(1.0);
    czm_writeLogDepth();
}
`;
    fs = new ShaderSource({
      defines: ["LOG_DEPTH"],
      sources: [source],
    });
  }

  return context.shaderCache.createDerivedShaderProgram(
    shaderProgram,
    "depthOnly",
    {
      vertexShaderSource: shaderProgram.vertexShaderSource,
      fragmentShaderSource: fs,
      attributeLocations: shaderProgram._attributeLocations,
    },
  );
}

function getDepthOnlyRenderState(scene, renderState) {
  const cache = scene._depthOnlyRenderStateCache;

  const cachedDepthOnlyState = cache[renderState.id];
  if (defined(cachedDepthOnlyState)) {
    return cachedDepthOnlyState;
  }

  const rs = RenderState.getState(renderState);
  rs.depthMask = true;
  rs.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };

  const depthOnlyState = RenderState.fromCache(rs);
  cache[renderState.id] = depthOnlyState;

  return depthOnlyState;
}

DerivedCommand.createDepthOnlyDerivedCommand = function (
  scene,
  command,
  context,
  result,
) {
  // For a depth only pass, we bind a framebuffer with only a depth attachment (no color attachments),
  // do not write color, and write depth. If the fragment shader doesn't modify the fragment depth
  // or discard, the driver can replace the fragment shader with a pass-through shader. We're unsure if this
  // actually happens so we modify the shader to use a pass-through fragment shader.

  if (!defined(result)) {
    result = {};
  }

  const shader = result.depthOnlyCommand?.shaderProgram;
  const renderState = result.depthOnlyCommand?.renderState;

  result.depthOnlyCommand = DrawCommand.shallowClone(
    command,
    result.depthOnlyCommand,
  );

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.depthOnlyCommand.shaderProgram = getDepthOnlyShaderProgram(
      context,
      command.shaderProgram,
    );
    result.depthOnlyCommand.renderState = getDepthOnlyRenderState(
      scene,
      command.renderState,
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.depthOnlyCommand.shaderProgram = shader;
    result.depthOnlyCommand.renderState = renderState;
  }

  return result;
};

const writeLogDepthRegex = /\s+czm_writeLogDepth\(/;
const vertexlogDepthRegex = /\s+czm_vertexLogDepth\(/;

function getLogDepthShaderProgram(context, shaderProgram) {
  const disableLogDepthWrite =
    shaderProgram.fragmentShaderSource.defines.indexOf("LOG_DEPTH_READ_ONLY") >=
    0;
  if (disableLogDepthWrite) {
    return shaderProgram;
  }

  const cachedShader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "logDepth",
  );
  if (defined(cachedShader)) {
    return cachedShader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const vs = shaderProgram.vertexShaderSource.clone();
  const fs = shaderProgram.fragmentShaderSource.clone();

  vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
  vs.defines.push("LOG_DEPTH");
  fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
  fs.defines.push("LOG_DEPTH");

  let writesLogDepth = false;
  let sources = vs.sources;
  for (let i = 0; i < sources.length; ++i) {
    if (vertexlogDepthRegex.test(sources[i])) {
      writesLogDepth = true;
      break;
    }
  }

  if (!writesLogDepth) {
    for (let i = 0; i < sources.length; ++i) {
      sources[i] = ShaderSource.replaceMain(sources[i], "czm_log_depth_main");
    }

    const logMain = `

void main()
{
    czm_log_depth_main();
    czm_vertexLogDepth();
}
`;
    sources.push(logMain);
  }

  sources = fs.sources;

  writesLogDepth = false;
  for (let i = 0; i < sources.length; ++i) {
    if (writeLogDepthRegex.test(sources[i])) {
      writesLogDepth = true;
    }
  }
  // This define indicates that a log depth value is written by the shader but doesn't use czm_writeLogDepth.
  if (fs.defines.indexOf("LOG_DEPTH_WRITE") !== -1) {
    writesLogDepth = true;
  }

  let logSource = "";

  if (!writesLogDepth) {
    for (let i = 0; i < sources.length; i++) {
      sources[i] = ShaderSource.replaceMain(sources[i], "czm_log_depth_main");
    }

    logSource = `
void main()
{
    czm_log_depth_main();
    czm_writeLogDepth();
}
`;
  }

  sources.push(logSource);

  return context.shaderCache.createDerivedShaderProgram(
    shaderProgram,
    "logDepth",
    {
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attributeLocations: attributeLocations,
    },
  );
}

DerivedCommand.createLogDepthCommand = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  const shader = result.command?.shaderProgram;

  result.command = DrawCommand.shallowClone(command, result.command);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.command.shaderProgram = getLogDepthShaderProgram(
      context,
      command.shaderProgram,
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.command.shaderProgram = shader;
  }

  return result;
};

function getPickShaderProgram(context, shaderProgram, pickId) {
  const cachedShader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "pick",
  );
  if (defined(cachedShader)) {
    return cachedShader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const { sources, defines } = shaderProgram.fragmentShaderSource;

  const hasFragData = sources.some((source) => source.includes("out_FragData"));
  const outputColorVariable = hasFragData ? "out_FragData_0" : "out_FragColor";
  const newMain = `void main () 
{ 
    czm_non_pick_main(); 
    if (${outputColorVariable}.a == 0.0) { 
        discard; 
    } 
    ${outputColorVariable} = ${pickId}; 
} `;

  const length = sources.length;
  const newSources = new Array(length + 1);
  for (let i = 0; i < length; ++i) {
    newSources[i] = ShaderSource.replaceMain(sources[i], "czm_non_pick_main");
  }
  newSources[length] = newMain;
  const fragmentShaderSource = new ShaderSource({
    sources: newSources,
    defines: defines,
  });
  return context.shaderCache.createDerivedShaderProgram(shaderProgram, "pick", {
    vertexShaderSource: shaderProgram.vertexShaderSource,
    fragmentShaderSource: fragmentShaderSource,
    attributeLocations: attributeLocations,
  });
}

function getPickRenderState(scene, renderState) {
  const cache = scene.picking.pickRenderStateCache;
  const cachedPickState = cache[renderState.id];
  if (defined(cachedPickState)) {
    return cachedPickState;
  }

  const rs = RenderState.getState(renderState);
  rs.blending.enabled = false;

  // Turns on depth writing for opaque and translucent passes
  // Overlapping translucent geometry on the globe surface may exhibit z-fighting
  // during the pick pass which may not match the rendered scene. Once
  // terrain is on by default and ground primitives are used instead
  // this will become less of a problem.
  rs.depthMask = true;

  const pickState = RenderState.fromCache(rs);
  cache[renderState.id] = pickState;
  return pickState;
}

DerivedCommand.createPickDerivedCommand = function (
  scene,
  command,
  context,
  result,
) {
  if (!defined(result)) {
    result = {};
  }

  const shader = result.pickCommand?.shaderProgram;
  const renderState = result.pickCommand?.renderState;

  result.pickCommand = DrawCommand.shallowClone(command, result.pickCommand);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.pickCommand.shaderProgram = getPickShaderProgram(
      context,
      command.shaderProgram,
      command.pickId,
    );
    result.pickCommand.renderState = getPickRenderState(
      scene,
      command.renderState,
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.pickCommand.shaderProgram = shader;
    result.pickCommand.renderState = renderState;
  }

  return result;
};

/**
 * Replaces the value of the specified 'define' directive identifier
 * with the given value.
 *
 * The given defines are the parts of the define directives that are
 * stored in the `ShaderSource`. For example, the defines may be
 * `["EXAMPLE", "EXAMPLE_VALUE 123"]`
 *
 * Calling `replaceDefine(defines, "EXAMPLE", 999)` will result in
 * the defines being
 * `["EXAMPLE 999", "EXAMPLE_VALUE 123"]`
 *
 * @param {string[]} defines The define directive identifiers
 * @param {string} defineName The name (identifier) of the define directive
 * @param {any} newDefineValue The new value whose string representation
 * will become the token string for the define directive
 * @private
 */
function replaceDefine(defines, defineName, newDefineValue) {
  const n = defines.length;
  for (let i = 0; i < n; i++) {
    const define = defines[i];
    const tokens = define.trimStart().split(/\s+/);
    if (tokens[0] === defineName) {
      defines[i] = `${defineName} ${newDefineValue}`;
    }
  }
}

/**
 * Returns the component count for the given class property, or
 * its array length if it is an array.
 *
 * This will be
 * `[1, 2, 3, 4]` for `[SCALAR, VEC2, VEC3, VEC4`] types,
 * or the array length if it is an array.
 *
 * @param {MetadataClassProperty} classProperty The class property
 * @returns {number} The component count
 * @private
 */
function getComponentCount(classProperty) {
  if (!classProperty.isArray) {
    return MetadataType.getComponentCount(classProperty.type);
  }
  return classProperty.arrayLength;
}

/**
 * Returns the type that the given class property has in a GLSL shader.
 *
 * It returns the same string as `PropertyTextureProperty.prototype.getGlslType`
 * for a property texture property with the given class property
 *
 * @param {MetadataClassProperty} classProperty The class property
 * @returns {string} The GLSL shader type string for the property
 */
function getGlslType(classProperty) {
  const componentCount = getComponentCount(classProperty);
  if (classProperty.normalized) {
    if (componentCount === 1) {
      return "float";
    }
    return `vec${componentCount}`;
  }
  if (componentCount === 1) {
    return "int";
  }
  return `ivec${componentCount}`;
}

/**
 * Returns a shader statement that applies the inverse of the
 * value transform to the given value, based on the given offset
 * and scale.
 *
 * @param {string} input The input value
 * @param {string} offset The offset
 * @param {string} scale The scale
 * @returns {string} The statement
 */
function unapplyValueTransform(input, offset, scale) {
  return `((${input} - float(${offset})) / float(${scale}))`;
}

/**
 * Returns a shader statement that applies the inverse of the
 * normalization, based on the given component type
 *
 * @param {string} input The input value
 * @param {string} componentType The component type
 * @returns {string} The statement
 */
function unnormalize(input, componentType) {
  const max = MetadataComponentType.getMaximum(componentType);
  return `(${input}) / float(${max})`;
}

/**
 * Creates a shader statement that returns the value of the specified
 * property, normalized to the range [0, 1].
 *
 * @param {MetadataClassProperty} classProperty The class property
 * @param {object} metadataProperty The metadata property, either
 * a `PropertyTextureProperty` or a `PropertyAttributeProperty`
 * @returns {string} The string
 */
function getSourceValueStringScalar(classProperty, metadataProperty) {
  let result = `float(value)`;

  // The 'hasValueTransform' indicates whether the property
  // (or its class property) did define an 'offset' or 'scale'.
  // Even when they had not been defined in the JSON, they are
  // defined in the object, with default values.
  if (metadataProperty.hasValueTransform) {
    const offset = metadataProperty.offset;
    const scale = metadataProperty.scale;
    result = unapplyValueTransform(result, offset, scale);
  }
  if (!classProperty.normalized) {
    result = unnormalize(result, classProperty.componentType);
  }
  return result;
}

/**
 * Creates a shader statement that returns the value of the specified
 * component of the given property, normalized to the range [0, 1].
 *
 * @param {MetadataClassProperty} classProperty The class property
 * @param {object} metadataProperty The metadata property, either
 * a `PropertyTextureProperty` or a `PropertyAttributeProperty`
 * @param {string} componentName The name, in ["x", "y", "z", "w"]
 * @returns {string} The string
 */
function getSourceValueStringComponent(
  classProperty,
  metadataProperty,
  componentName,
) {
  const valueString = `value.${componentName}`;
  let result = `float(${valueString})`;

  // The 'hasValueTransform' indicates whether the property
  // (or its class property) did define an 'offset' or 'scale'.
  // Even when they had not been defined in the JSON, they are
  // defined in the object, with default values
  // Note that in the 'PropertyTextureProperty' and the
  // 'PropertyAttributeProperty', these values are
  // stored as "object types" (like 'Cartesian2'), whereas
  // in the 'MetadataClassProperty', they are stored as
  // "array types", e.g. a `[number, number]`
  if (metadataProperty.hasValueTransform) {
    const offset = metadataProperty.offset[componentName];
    const scale = metadataProperty.scale[componentName];
    result = unapplyValueTransform(result, offset, scale);
  }
  if (!classProperty.normalized) {
    result = unnormalize(result, classProperty.componentType);
  }
  return result;
}

/**
 * Creates a new `ShaderProgram` from the given input that renders metadata
 * values into the frame buffer, according to the given picked metadata info.
 *
 * This will update the `defines` of the fragment shader of the given shader
 * program, by setting `METADATA_PICKING_ENABLED`, and updating the
 * `METADATA_PICKING_VALUE_*` defines so that they reflect the components
 * of the metadata that should be written into the RGBA (vec4) that
 * ends up as the 'color' in the frame buffer.
 *
 * The RGBA values will eventually be converted back into an actual metadata
 * value in `Picking.js`, by calling `MetadataPicking.decodeMetadataValues`.
 *
 * @param {Context} context The context
 * @param {ShaderProgram} shaderProgram The shader program
 * @param {PickedMetadataInfo} pickedMetadataInfo The picked metadata info
 * @returns {ShaderProgram} The new shader program
 * @private
 */
function getPickMetadataShaderProgram(
  context,
  shaderProgram,
  pickedMetadataInfo,
) {
  const schemaId = pickedMetadataInfo.schemaId;
  const className = pickedMetadataInfo.className;
  const propertyName = pickedMetadataInfo.propertyName;
  const keyword = `pickMetadata-${schemaId}-${className}-${propertyName}`;
  const shader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    keyword,
  );
  if (defined(shader)) {
    return shader;
  }

  const metadataProperty = pickedMetadataInfo.metadataProperty;
  const classProperty = pickedMetadataInfo.classProperty;
  const glslType = getGlslType(classProperty);

  // Define the components that will go into the output `metadataValues`.
  // This will be the 'color' that is written into the frame buffer,
  // meaning that the values should be in [0.0, 1.0], and will become
  // values in [0, 255] in the frame buffer.
  // By default, all of them are 0.0.
  const sourceValueStrings = ["0.0", "0.0", "0.0", "0.0"];
  const componentCount = getComponentCount(classProperty);
  if (componentCount === 1) {
    // When the property is a scalar, store the source value
    // string directly in `metadataValues.x`
    sourceValueStrings[0] = getSourceValueStringScalar(
      classProperty,
      metadataProperty,
    );
  } else {
    // When the property is an array, store the array elements
    // in `metadataValues.x/y/z/w`
    const componentNames = ["x", "y", "z", "w"];
    for (let i = 0; i < componentCount; i++) {
      sourceValueStrings[i] = getSourceValueStringComponent(
        classProperty,
        metadataProperty,
        componentNames[i],
      );
    }
  }

  const newDefines = shaderProgram.fragmentShaderSource.defines.slice();
  newDefines.push(MetadataPickingPipelineStage.METADATA_PICKING_ENABLED);

  // Replace the defines of the shader, using the type, property
  // access, and value components  that have been determined
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_TYPE,
    glslType,
  );
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_STRING,
    `metadata.${propertyName}`,
  );
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_X,
    sourceValueStrings[0],
  );
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Y,
    sourceValueStrings[1],
  );
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_Z,
    sourceValueStrings[2],
  );
  replaceDefine(
    newDefines,
    MetadataPickingPipelineStage.METADATA_PICKING_VALUE_COMPONENT_W,
    sourceValueStrings[3],
  );

  const newFragmentShaderSource = new ShaderSource({
    sources: shaderProgram.fragmentShaderSource.sources,
    defines: newDefines,
  });
  const newShader = context.shaderCache.createDerivedShaderProgram(
    shaderProgram,
    keyword,
    {
      vertexShaderSource: shaderProgram.vertexShaderSource,
      fragmentShaderSource: newFragmentShaderSource,
      attributeLocations: shaderProgram._attributeLocations,
    },
  );
  return newShader;
}

/**
 * @private
 */
DerivedCommand.createPickMetadataDerivedCommand = function (
  scene,
  command,
  context,
  result,
) {
  if (!defined(result)) {
    result = {};
  }
  result.pickMetadataCommand = DrawCommand.shallowClone(
    command,
    result.pickMetadataCommand,
  );

  result.pickMetadataCommand.shaderProgram = getPickMetadataShaderProgram(
    context,
    command.shaderProgram,
    command.pickedMetadataInfo,
  );
  result.pickMetadataCommand.renderState = getPickRenderState(
    scene,
    command.renderState,
  );
  result.shaderProgramId = command.shaderProgram.id;

  return result;
};

function getHdrShaderProgram(context, shaderProgram) {
  const cachedShader = context.shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "HDR",
  );
  if (defined(cachedShader)) {
    return cachedShader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const vs = shaderProgram.vertexShaderSource.clone();
  const fs = shaderProgram.fragmentShaderSource.clone();

  vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
  vs.defines.push("HDR");
  fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
  fs.defines.push("HDR");

  return context.shaderCache.createDerivedShaderProgram(shaderProgram, "HDR", {
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

DerivedCommand.createHdrCommand = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  const shader = result.command?.shaderProgram;

  result.command = DrawCommand.shallowClone(command, result.command);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.command.shaderProgram = getHdrShaderProgram(
      context,
      command.shaderProgram,
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.command.shaderProgram = shader;
  }

  return result;
};
export default DerivedCommand;
