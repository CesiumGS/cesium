import clone from "../Core/clone.js";
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
  var attributeLocations = {};
  var attributes = shaderProgram.vertexAttributes;
  for (var a in attributes) {
    if (attributes.hasOwnProperty(a)) {
      attributeLocations[a] = attributes[a].index;
    }
  }

  return attributeLocations;
}

function createDebugShowFrustumsShaderProgram(scene, shaderProgram) {
  var context = scene.context;
  var sp = shaderProgram;
  var fs = sp.fragmentShaderSource.clone();

  var targets = [];
  fs.sources = fs.sources.map(function (source) {
    source = ShaderSource.replaceMain(source, "czm_Debug_main");
    var re = /gl_FragData\[(\d+)\]/g;
    var match;
    while ((match = re.exec(source)) !== null) {
      if (targets.indexOf(match[1]) === -1) {
        targets.push(match[1]);
      }
    }
    return source;
  });
  var length = targets.length;

  var newMain = "";
  newMain += "uniform vec3 debugShowCommandsColor;\n";
  newMain += "uniform vec3 debugShowFrustumsColor;\n";
  newMain += "void main() \n" + "{ \n" + "    czm_Debug_main(); \n";

  // set debugShowCommandsColor to Color(1.0, 1.0, 1.0, 1.0) to stop rendering scene.debugShowCommands
  // set debugShowFrustumsColor to Color(1.0, 1.0, 1.0, 1.0) to stop rendering scene.debugShowFrustums
  var i;
  if (length > 0) {
    for (i = 0; i < length; ++i) {
      newMain +=
        "    gl_FragData[" + targets[i] + "].rgb *= debugShowCommandsColor;\n";
      newMain +=
        "    gl_FragData[" + targets[i] + "].rgb *= debugShowFrustumsColor;\n";
    }
  } else {
    newMain += "    gl_FragColor.rgb *= debugShowCommandsColor;\n";
    newMain += "    gl_FragColor.rgb *= debugShowFrustumsColor;\n";
  }
  newMain += "}";

  fs.sources.push(newMain);

  var attributeLocations = getAttributeLocations(sp);

  return ShaderProgram.fromCache({
    context: context,
    vertexShaderSource: sp.vertexShaderSource,
    fragmentShaderSource: fs,
    attributeLocations: attributeLocations,
  });
}

DebugInspector.prototype.createShowFrustumsCommand = function (scene, command) {
  // create debug command
  var debugCommand = DrawCommand.shallowClone(command);
  var shaderProgramId = command.shaderProgram.id;
  if (!defined(this._cachedShowFrustumsShaders[shaderProgramId])) {
    debugCommand.shaderProgram = createDebugShowFrustumsShaderProgram(
      scene,
      command.shaderProgram
    );

    this._cachedShowFrustumsShaders[shaderProgramId] =
      debugCommand.shaderProgram;
  } else {
    debugCommand.shaderProgram = this._cachedShowFrustumsShaders[
      shaderProgramId
    ];
  }

  // setup uniform for the shader
  debugCommand.uniformMap = clone(command.uniformMap);
  if (scene.debugShowCommands) {
    if (!defined(command._debugColor)) {
      command._debugColor = Color.fromRandom();
    }

    debugCommand.uniformMap.debugShowCommandsColor = function () {
      return command._debugColor;
    };
  } else {
    debugCommand.uniformMap.debugShowCommandsColor = function () {
      return new Color(1.0, 1.0, 1.0, 1.0);
    };
  }

  if (scene.debugShowFrustums) {
    // Support up to three frustums.  If a command overlaps all
    // three, it's code is not changed.
    var r = command.debugOverlappingFrustums & (1 << 0) ? 1.0 : 0.0;
    var g = command.debugOverlappingFrustums & (1 << 1) ? 1.0 : 0.0;
    var b = command.debugOverlappingFrustums & (1 << 2) ? 1.0 : 0.0;

    debugCommand.uniformMap.debugShowFrustumsColor = function () {
      return new Color(r, g, b, 1.0);
    };
  } else {
    debugCommand.uniformMap.debugShowFrustumsColor = function () {
      return new Color(1.0, 1.0, 1.0, 1.0);
    };
  }

  return debugCommand;
};
export default DebugInspector;
