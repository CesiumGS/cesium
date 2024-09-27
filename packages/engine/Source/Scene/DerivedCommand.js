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
