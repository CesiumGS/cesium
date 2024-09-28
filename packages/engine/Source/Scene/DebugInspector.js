import Color from "../Core/Color.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import ShaderSource from "../Renderer/ShaderSource.js";
import ShaderProgram from "../Renderer/ShaderProgram.js";
import defined from "../Core/defined.js";

/**
 * @private
 */
function DebugInspector() {
  this._cachedShowFrustumsShaders = {};
}

function getAttributeLocations(shaderProgram) {
  const attributeLocations = {};
  const attributes = shaderProgram.vertexAttributes;
  for (const a in attributes) {
    if (attributes.hasOwnProperty(a)) {
      attributeLocations[a] = attributes[a].index;
    }
  }

  return attributeLocations;
}

function createDebugShowFrustumsShaderProgram(scene, shaderProgram) {
  const context = scene.context;
  const sp = shaderProgram;
  const fs = sp.fragmentShaderSource.clone();

  const targets = [];
  fs.sources = fs.sources.map(function (source) {
    source = ShaderSource.replaceMain(source, "czm_Debug_main");
    const re = /out_FragData_(\d+)/g;
    let match;
    while ((match = re.exec(source)) !== null) {
      if (targets.indexOf(match[1]) === -1) {
        targets.push(match[1]);
      }
    }
    return source;
  });
  const length = targets.length;

  let newMain = "";
  newMain += "uniform vec3 debugShowCommandsColor;\n";
  newMain += "uniform vec3 debugShowFrustumsColor;\n";
  newMain += "void main() \n" + "{ \n" + "    czm_Debug_main(); \n";

  // set debugShowCommandsColor to Color(1.0, 1.0, 1.0, 1.0) to stop rendering scene.debugShowCommands
  // set debugShowFrustumsColor to Color(1.0, 1.0, 1.0, 1.0) to stop rendering scene.debugShowFrustums
  let i;
  if (length > 0) {
    for (i = 0; i < length; ++i) {
      newMain += `    out_FragData_${targets[i]}.rgb *= debugShowCommandsColor;\n`;
      newMain += `    out_FragData_${targets[i]}.rgb *= debugShowFrustumsColor;\n`;
    }
  } else {
    newMain += "    out_FragColor.rgb *= debugShowCommandsColor;\n";
    newMain += "    out_FragColor.rgb *= debugShowFrustumsColor;\n";
  }
  newMain += "}";

  fs.sources.push(newMain);

  const attributeLocations = getAttributeLocations(sp);

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: sp.vertexShaderSource,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

const scratchFrustumColor = new Color();
function createDebugShowFrustumsUniformMap(scene, command) {
  // setup uniform for the shader
  let debugUniformMap;
  if (!defined(command.uniformMap)) {
    debugUniformMap = {};
  } else {
    debugUniformMap = command.uniformMap;
  }

  if (
    defined(debugUniformMap.debugShowCommandsColor) ||
    defined(debugUniformMap.debugShowFrustumsColor)
  ) {
    return debugUniformMap;
  }

  debugUniformMap.debugShowCommandsColor = function () {
    if (!scene.debugShowCommands) {
      return Color.WHITE;
    }

    if (!defined(command._debugColor)) {
      command._debugColor = Color.fromRandom();
    }

    return command._debugColor;
  };

  debugUniformMap.debugShowFrustumsColor = function () {
    if (!scene.debugShowFrustums) {
      return Color.WHITE;
    }

    // Support up to three frustums.  If a command overlaps all
    // three, it's code is not changed.
    scratchFrustumColor.red =
      command.debugOverlappingFrustums & (1 << 0) ? 1.0 : 0.0;
    scratchFrustumColor.green =
      command.debugOverlappingFrustums & (1 << 1) ? 1.0 : 0.0;
    scratchFrustumColor.blue =
      command.debugOverlappingFrustums & (1 << 2) ? 1.0 : 0.0;
    scratchFrustumColor.alpha = 1.0;
    return scratchFrustumColor;
  };

  return debugUniformMap;
}

const scratchShowFrustumCommand = new DrawCommand();
DebugInspector.prototype.executeDebugShowFrustumsCommand = function (
  scene,
  command,
  passState,
) {
  // create debug command
  const shaderProgramId = command.shaderProgram.id;
  let debugShaderProgram = this._cachedShowFrustumsShaders[shaderProgramId];
  if (!defined(debugShaderProgram)) {
    debugShaderProgram = createDebugShowFrustumsShaderProgram(
      scene,
      command.shaderProgram,
    );

    this._cachedShowFrustumsShaders[shaderProgramId] = debugShaderProgram;
  }

  const debugCommand = DrawCommand.shallowClone(
    command,
    scratchShowFrustumCommand,
  );
  debugCommand.shaderProgram = debugShaderProgram;
  debugCommand.uniformMap = createDebugShowFrustumsUniformMap(scene, command);
  debugCommand.execute(scene.context, passState);
};
export default DebugInspector;
