import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * A function to port GLSL shaders from GLSL ES 1.00 to GLSL ES 3.00
 *
 * This function is nowhere near comprehensive or complete. It just
 * handles some common cases.
 *
 * Note that this function requires the presence of the
 * "#define OUTPUT_DECLARATION" line that is appended
 * by ShaderSource.
 *
 * @private
 */
function modernizeShader(source, isFragmentShader) {
  var outputDeclarationRegex = /#define OUTPUT_DECLARATION/;
  var splitSource = source.split("\n");

  if (/#version 300 es/g.test(source)) {
    return source;
  }

  var outputDeclarationLine = -1;
  var i, line;
  for (i = 0; i < splitSource.length; ++i) {
    line = splitSource[i];
    if (outputDeclarationRegex.test(line)) {
      outputDeclarationLine = i;
      break;
    }
  }

  if (outputDeclarationLine === -1) {
    throw new DeveloperError("Could not find a #define OUTPUT_DECLARATION!");
  }

  var outputVariables = [];

  for (i = 0; i < 10; i++) {
    var fragDataString = "gl_FragData\\[" + i + "\\]";
    var newOutput = "czm_out" + i;
    var regex = new RegExp(fragDataString, "g");
    if (regex.test(source)) {
      setAdd(newOutput, outputVariables);
      replaceInSourceString(fragDataString, newOutput, splitSource);
      splitSource.splice(
        outputDeclarationLine,
        0,
        "layout(location = " + i + ") out vec4 " + newOutput + ";"
      );
      outputDeclarationLine += 1;
    }
  }

  var czmFragColor = "czm_fragColor";
  if (findInSource("gl_FragColor", splitSource)) {
    setAdd(czmFragColor, outputVariables);
    replaceInSourceString("gl_FragColor", czmFragColor, splitSource);
    splitSource.splice(
      outputDeclarationLine,
      0,
      "layout(location = 0) out vec4 czm_fragColor;"
    );
    outputDeclarationLine += 1;
  }

  var variableMap = getVariablePreprocessorBranch(outputVariables, splitSource);
  var lineAdds = {};
  for (i = 0; i < splitSource.length; i++) {
    line = splitSource[i];
    for (var variable in variableMap) {
      if (variableMap.hasOwnProperty(variable)) {
        var matchVar = new RegExp(
          "(layout)[^]+(out)[^]+(" + variable + ")[^]+",
          "g"
        );
        if (matchVar.test(line)) {
          lineAdds[line] = variable;
        }
      }
    }
  }

  for (var layoutDeclaration in lineAdds) {
    if (lineAdds.hasOwnProperty(layoutDeclaration)) {
      var variableName = lineAdds[layoutDeclaration];
      var lineNumber = splitSource.indexOf(layoutDeclaration);
      var entry = variableMap[variableName];
      var depth = entry.length;
      var d;
      for (d = 0; d < depth; d++) {
        splitSource.splice(lineNumber, 0, entry[d]);
      }
      lineNumber += depth + 1;
      for (d = depth - 1; d >= 0; d--) {
        splitSource.splice(lineNumber, 0, "#endif //" + entry[d]);
      }
    }
  }

  var webgl2UniqueID = "WEBGL_2";
  var webgl2DefineMacro = "#define " + webgl2UniqueID;
  var versionThree = "#version 300 es";
  var foundVersion = false;
  for (i = 0; i < splitSource.length; i++) {
    if (/#version/.test(splitSource[i])) {
      splitSource[i] = versionThree;
      foundVersion = true;
      break;
    }
  }

  if (!foundVersion) {
    splitSource.splice(0, 0, versionThree);
  }

  splitSource.splice(1, 0, webgl2DefineMacro);

  removeExtension("EXT_draw_buffers", webgl2UniqueID, splitSource);
  removeExtension("EXT_frag_depth", webgl2UniqueID, splitSource);
  removeExtension("OES_standard_derivatives", webgl2UniqueID, splitSource);

  replaceInSourceString("texture2D", "texture", splitSource);
  replaceInSourceString("texture3D", "texture", splitSource);
  replaceInSourceString("textureCube", "texture", splitSource);
  replaceInSourceString("gl_FragDepthEXT", "gl_FragDepth", splitSource);

  if (isFragmentShader) {
    replaceInSourceString("varying", "in", splitSource);
  } else {
    replaceInSourceString("attribute", "in", splitSource);
    replaceInSourceString("varying", "out", splitSource);
  }

  return compileSource(splitSource);
}

// Note that this fails if your string looks like
// searchString[singleCharacter]searchString
function replaceInSourceString(str, replacement, splitSource) {
  var regexStr = "(^|[^\\w])(" + str + ")($|[^\\w])";
  var regex = new RegExp(regexStr, "g");

  var splitSourceLength = splitSource.length;
  for (var i = 0; i < splitSourceLength; ++i) {
    var line = splitSource[i];
    splitSource[i] = line.replace(regex, "$1" + replacement + "$3");
  }
}

function replaceInSourceRegex(regex, replacement, splitSource) {
  var splitSourceLength = splitSource.length;
  for (var i = 0; i < splitSourceLength; ++i) {
    var line = splitSource[i];
    splitSource[i] = line.replace(regex, replacement);
  }
}

function findInSource(str, splitSource) {
  var regexStr = "(^|[^\\w])(" + str + ")($|[^\\w])";
  var regex = new RegExp(regexStr, "g");

  var splitSourceLength = splitSource.length;
  for (var i = 0; i < splitSourceLength; ++i) {
    var line = splitSource[i];
    if (regex.test(line)) {
      return true;
    }
  }
  return false;
}

function compileSource(splitSource) {
  var wholeSource = "";

  var splitSourceLength = splitSource.length;
  for (var i = 0; i < splitSourceLength; ++i) {
    wholeSource += splitSource[i] + "\n";
  }
  return wholeSource;
}

function setAdd(variable, set) {
  if (set.indexOf(variable) === -1) {
    set.push(variable);
  }
}

function getVariablePreprocessorBranch(layoutVariables, splitSource) {
  var variableMap = {};

  var numLayoutVariables = layoutVariables.length;

  var stack = [];
  for (var i = 0; i < splitSource.length; ++i) {
    var line = splitSource[i];
    var hasIF = /(#ifdef|#if)/g.test(line);
    var hasELSE = /#else/g.test(line);
    var hasENDIF = /#endif/g.test(line);

    if (hasIF) {
      stack.push(line);
    } else if (hasELSE) {
      var top = stack[stack.length - 1];
      var op = top.replace("ifdef", "ifndef");
      if (/if/g.test(op)) {
        op = op.replace(/(#if\s+)(\S*)([^]*)/, "$1!($2)$3");
      }
      stack.pop();
      stack.push(op);
    } else if (hasENDIF) {
      stack.pop();
    } else if (!/layout/g.test(line)) {
      for (var varIndex = 0; varIndex < numLayoutVariables; ++varIndex) {
        var varName = layoutVariables[varIndex];
        if (line.indexOf(varName) !== -1) {
          if (!defined(variableMap[varName])) {
            variableMap[varName] = stack.slice();
          } else {
            variableMap[varName] = variableMap[varName].filter(function (x) {
              return stack.indexOf(x) >= 0;
            });
          }
        }
      }
    }
  }

  return variableMap;
}

function removeExtension(name, webgl2UniqueID, splitSource) {
  var regex = "#extension\\s+GL_" + name + "\\s+:\\s+[a-zA-Z0-9]+\\s*$";
  replaceInSourceRegex(new RegExp(regex, "g"), "", splitSource);

  // replace any possible directive #ifdef (GL_EXT_extension) with WEBGL_2 unique directive
  replaceInSourceString("GL_" + name, webgl2UniqueID, splitSource);
}
export default modernizeShader;
