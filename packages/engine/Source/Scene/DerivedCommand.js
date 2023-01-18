import defined from "../Core/defined.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import RenderState from "../Renderer/RenderState.js";
import ShaderSource from "../Renderer/ShaderSource.js";

/**
 * @private
 */
function DerivedCommand() {}

const fragDepthRegex = /\bgl_FragDepth\b/;
const discardRegex = /\bdiscard\b/;

const depthFragmentShaderSource = `void main()
{
    out_FragColor = vec4(1.0);
}
`;

const logDepthFragmentShaderSource = `void main()
{
    out_FragColor = vec4(1.0);
    czm_writeLogDepth();
}
`;

/**
 * @private
 * @param {Context} context
 * @param {ShaderProgram} shaderProgram
 * @returns {ShaderProgram}
 */
function getDepthOnlyShaderProgram(context, shaderProgram) {
  const { shaderCache } = context;
  const shader = shaderCache.getDerivedShaderProgram(
    shaderProgram,
    "depthOnly"
  );
  if (defined(shader)) {
    return shader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  let fs = shaderProgram.fragmentShaderSource;

  const { sources, defines } = fs;

  const writesDepthOrDiscards = sources.some(
    (source) => fragDepthRegex.test(source) || discardRegex.test(source)
  );
  const usesLogDepth = defines.some((define) => define === "LOG_DEPTH");

  if (!writesDepthOrDiscards && !usesLogDepth) {
    fs = new ShaderSource({
      sources: [depthFragmentShaderSource],
    });
  } else if (!writesDepthOrDiscards && usesLogDepth) {
    fs = new ShaderSource({
      defines: ["LOG_DEPTH"],
      sources: [logDepthFragmentShaderSource],
    });
  }

  return shaderCache.createDerivedShaderProgram(shaderProgram, "depthOnly", {
    vertexShaderSource: shaderProgram.vertexShaderSource,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

/**
 * @private
 * @param {Scene} scene
 * @param {RenderState} renderState
 * @returns {RenderState}
 */
function getDepthOnlyRenderState(scene, renderState) {
  const cache = scene._depthOnlyRenderStateCache;

  let depthOnlyState = cache[renderState.id];
  if (defined(depthOnlyState)) {
    return depthOnlyState;
  }

  const rs = RenderState.getState(renderState);
  rs.depthMask = true;
  rs.colorMask = {
    red: false,
    green: false,
    blue: false,
    alpha: false,
  };

  depthOnlyState = cache[renderState.id] = RenderState.fromCache(rs);
  return depthOnlyState;
}

/**
 * For a depth only pass, we bind a framebuffer with only a depth attachment (no color attachments),
 * do not write color, and write depth. If the fragment shader doesn't modify the fragment depth
 * or discard, the driver can replace the fragment shader with a pass-through shader. We're unsure if this
 * actually happens so we modify the shader to use a pass-through fragment shader.
 *
 * @private
 * @param {Scene} scene
 * @param {Command} command
 * @param {Context} context
 * @param {Object} [result]
 * @returns {Object}
 */
DerivedCommand.createDepthOnlyDerivedCommand = function (
  scene,
  command,
  context,
  result
) {
  if (!defined(result)) {
    result = {};
  }

  let shader;
  let renderState;
  if (defined(result.depthOnlyCommand)) {
    shader = result.depthOnlyCommand.shaderProgram;
    renderState = result.depthOnlyCommand.renderState;
  }

  result.depthOnlyCommand = DrawCommand.shallowClone(
    command,
    result.depthOnlyCommand
  );

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.depthOnlyCommand.shaderProgram = getDepthOnlyShaderProgram(
      context,
      command.shaderProgram
    );
    result.depthOnlyCommand.renderState = getDepthOnlyRenderState(
      scene,
      command.renderState
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

/**
 * @private
 * @param {Context} context
 * @param {ShaderProgram} shaderProgram
 * @returns {ShaderProgram}
 */
function getLogDepthShaderProgram(context, shaderProgram) {
  const disableLogDepthWrite =
    shaderProgram.fragmentShaderSource.defines.indexOf("LOG_DEPTH_READ_ONLY") >=
    0;
  if (disableLogDepthWrite) {
    return shaderProgram;
  }

  const { shaderCache } = context;
  const shader = shaderCache.getDerivedShaderProgram(shaderProgram, "logDepth");
  if (defined(shader)) {
    return shader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const vs = shaderProgram.vertexShaderSource.clone();
  const fs = shaderProgram.fragmentShaderSource.clone();

  vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
  vs.defines.push("LOG_DEPTH");
  fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
  fs.defines.push("LOG_DEPTH");

  const vsSources = vs.sources;
  const vsWritesLogDepth = vsSources.some((source) =>
    vertexlogDepthRegex.test(source)
  );
  if (!vsWritesLogDepth) {
    for (let i = 0; i < vsSources.length; ++i) {
      vsSources[i] = ShaderSource.replaceMain(
        vsSources[i],
        "czm_log_depth_main"
      );
    }

    const logMain =
      "\n\n" +
      "void main() \n" +
      "{ \n" +
      "    czm_log_depth_main(); \n" +
      "    czm_vertexLogDepth(); \n" +
      "} \n";
    vsSources.push(logMain);
  }

  const fsSources = fs.sources;
  let fsWritesLogDepth = fsSources.some((source) =>
    writeLogDepthRegex.test(source)
  );
  // This define indicates that a log depth value is written by the shader but doesn't use czm_writeLogDepth.
  if (fs.defines.indexOf("LOG_DEPTH_WRITE") !== -1) {
    fsWritesLogDepth = true;
  }

  let logSource = "";
  if (!fsWritesLogDepth) {
    for (let i = 0; i < fsSources.length; i++) {
      fsSources[i] = ShaderSource.replaceMain(
        fsSources[i],
        "czm_log_depth_main"
      );
    }

    logSource +=
      "\n" +
      "void main() \n" +
      "{ \n" +
      "    czm_log_depth_main(); \n" +
      "    czm_writeLogDepth(); \n" +
      "} \n";
  }
  fsSources.push(logSource);

  return shaderCache.createDerivedShaderProgram(shaderProgram, "logDepth", {
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

/**
 * @private
 * @param {Command} command
 * @param {Context} context
 * @param {Object} [result]
 * @returns {Object}
 */
DerivedCommand.createLogDepthCommand = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  let shader;
  if (defined(result.command)) {
    shader = result.command.shaderProgram;
  }

  result.command = DrawCommand.shallowClone(command, result.command);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.command.shaderProgram = getLogDepthShaderProgram(
      context,
      command.shaderProgram
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.command.shaderProgram = shader;
  }

  return result;
};

/**
 * @private
 * @param {Context} context
 * @param {ShaderProgram} shaderProgram
 * @param {*} pickId
 * @returns {ShaderProgram}
 */
function getPickShaderProgram(context, shaderProgram, pickId) {
  const { shaderCache } = context;
  const shader = shaderCache.getDerivedShaderProgram(shaderProgram, "pick");
  if (defined(shader)) {
    return shader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const { sources, defines } = shaderProgram.fragmentShaderSource;

  const newMain =
    `${
      "void main() \n" +
      "{ \n" +
      "    czm_non_pick_main(); \n" +
      "    if (out_FragColor.a == 0.0) { \n" +
      "        discard; \n" +
      "    } \n" +
      "    out_FragColor = "
    }${pickId}; \n` + `} \n`;

  const length = sources.length;
  const newSources = new Array(length + 1);
  for (let i = 0; i < length; ++i) {
    newSources[i] = ShaderSource.replaceMain(sources[i], "czm_non_pick_main");
  }
  newSources[length] = newMain;

  const newFS = new ShaderSource({
    sources: newSources,
    defines: defines,
  });

  return shaderCache.createDerivedShaderProgram(shaderProgram, "pick", {
    vertexShaderSource: shaderProgram.vertexShaderSource,
    fragmentShaderSource: newFS,
    attributeLocations: attributeLocations,
  });
}

/**
 * @private
 * @param {Scene} scene
 * @param {RenderState} renderState
 * @returns {RenderState}
 */
function getPickRenderState(scene, renderState) {
  const cache = scene.picking.pickRenderStateCache;

  let pickState = cache[renderState.id];
  if (defined(pickState)) {
    return pickState;
  }

  const rs = RenderState.getState(renderState);
  rs.blending.enabled = false;

  // Turns on depth writing for opaque and translucent passes
  // Overlapping translucent geometry on the globe surface may exhibit z-fighting
  // during the pick pass which may not match the rendered scene. Once
  // terrain is on by default and ground primitives are used instead
  // this will become less of a problem.
  rs.depthMask = true;

  pickState = cache[renderState.id] = RenderState.fromCache(rs);
  return pickState;
}

/**
 * @private
 * @param {Scene} scene
 * @param {Command} command
 * @param {Context} context
 * @param {Object} [result]
 * @returns {Object}
 */
DerivedCommand.createPickDerivedCommand = function (
  scene,
  command,
  context,
  result
) {
  if (!defined(result)) {
    result = {};
  }

  let shader;
  let renderState;
  if (defined(result.pickCommand)) {
    shader = result.pickCommand.shaderProgram;
    renderState = result.pickCommand.renderState;
  }

  result.pickCommand = DrawCommand.shallowClone(command, result.pickCommand);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.pickCommand.shaderProgram = getPickShaderProgram(
      context,
      command.shaderProgram,
      command.pickId
    );
    result.pickCommand.renderState = getPickRenderState(
      scene,
      command.renderState
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.pickCommand.shaderProgram = shader;
    result.pickCommand.renderState = renderState;
  }

  return result;
};

/**
 * @private
 * @param {Context} context
 * @param {ShaderProgram} shaderProgram
 * @returns {ShaderProgram}
 */
function getHdrShaderProgram(context, shaderProgram) {
  const { shaderCache } = context;
  const shader = shaderCache.getDerivedShaderProgram(shaderProgram, "HDR");
  if (defined(shader)) {
    return shader;
  }

  const attributeLocations = shaderProgram._attributeLocations;
  const vs = shaderProgram.vertexShaderSource.clone();
  const fs = shaderProgram.fragmentShaderSource.clone();

  vs.defines = defined(vs.defines) ? vs.defines.slice(0) : [];
  vs.defines.push("HDR");
  fs.defines = defined(fs.defines) ? fs.defines.slice(0) : [];
  fs.defines.push("HDR");

  return shaderCache.createDerivedShaderProgram(shaderProgram, "HDR", {
    vertexShaderSource: vs,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

/**
 * @private
 * @param {Command} command
 * @param {Context} context
 * @param {Object} [result]
 * @returns {Object}
 */
DerivedCommand.createHdrCommand = function (command, context, result) {
  if (!defined(result)) {
    result = {};
  }

  let shader;
  if (defined(result.command)) {
    shader = result.command.shaderProgram;
  }

  result.command = DrawCommand.shallowClone(command, result.command);

  if (!defined(shader) || result.shaderProgramId !== command.shaderProgram.id) {
    result.command.shaderProgram = getHdrShaderProgram(
      context,
      command.shaderProgram
    );
    result.shaderProgramId = command.shaderProgram.id;
  } else {
    result.command.shaderProgram = shader;
  }

  return result;
};

export default DerivedCommand;
