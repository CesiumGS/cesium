import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import modernizeShader from "../Renderer/modernizeShader.js";
import CzmBuiltins from "../Shaders/Builtin/CzmBuiltins.js";
import AutomaticUniforms from "./AutomaticUniforms.js";

function removeComments(source) {
  // remove inline comments
  source = source.replace(/\/\/.*/g, "");
  // remove multiline comment block
  return source.replace(/\/\*\*[\s\S]*?\*\//gm, function (match) {
    // preserve the number of lines in the comment block so the line numbers will be correct when debugging shaders
    const numberOfLines = match.match(/\n/gm).length;
    let replacement = "";
    for (let lineNumber = 0; lineNumber < numberOfLines; ++lineNumber) {
      replacement += "\n";
    }
    return replacement;
  });
}

function getDependencyNode(name, glslSource, nodes) {
  let dependencyNode;

  // check if already loaded
  for (let i = 0; i < nodes.length; ++i) {
    if (nodes[i].name === name) {
      dependencyNode = nodes[i];
    }
  }

  if (!defined(dependencyNode)) {
    // strip doc comments so we don't accidentally try to determine a dependency for something found
    // in a comment
    glslSource = removeComments(glslSource);

    // create new node
    dependencyNode = {
      name: name,
      glslSource: glslSource,
      dependsOn: [],
      requiredBy: [],
      evaluated: false,
    };
    nodes.push(dependencyNode);
  }

  return dependencyNode;
}

function generateDependencies(currentNode, dependencyNodes) {
  if (currentNode.evaluated) {
    return;
  }

  currentNode.evaluated = true;

  // identify all dependencies that are referenced from this glsl source code
  let czmMatches = currentNode.glslSource.match(/\bczm_[a-zA-Z0-9_]*/g);
  if (defined(czmMatches) && czmMatches !== null) {
    // remove duplicates
    czmMatches = czmMatches.filter(function (elem, pos) {
      return czmMatches.indexOf(elem) === pos;
    });

    czmMatches.forEach(function (element) {
      if (
        element !== currentNode.name &&
        ShaderSource._czmBuiltinsAndUniforms.hasOwnProperty(element)
      ) {
        const referencedNode = getDependencyNode(
          element,
          ShaderSource._czmBuiltinsAndUniforms[element],
          dependencyNodes
        );
        currentNode.dependsOn.push(referencedNode);
        referencedNode.requiredBy.push(currentNode);

        // recursive call to find any dependencies of the new node
        generateDependencies(referencedNode, dependencyNodes);
      }
    });
  }
}

function sortDependencies(dependencyNodes) {
  const nodesWithoutIncomingEdges = [];
  const allNodes = [];

  while (dependencyNodes.length > 0) {
    const node = dependencyNodes.pop();
    allNodes.push(node);

    if (node.requiredBy.length === 0) {
      nodesWithoutIncomingEdges.push(node);
    }
  }

  while (nodesWithoutIncomingEdges.length > 0) {
    const currentNode = nodesWithoutIncomingEdges.shift();

    dependencyNodes.push(currentNode);

    for (let i = 0; i < currentNode.dependsOn.length; ++i) {
      // remove the edge from the graph
      const referencedNode = currentNode.dependsOn[i];
      const index = referencedNode.requiredBy.indexOf(currentNode);
      referencedNode.requiredBy.splice(index, 1);

      // if referenced node has no more incoming edges, add to list
      if (referencedNode.requiredBy.length === 0) {
        nodesWithoutIncomingEdges.push(referencedNode);
      }
    }
  }

  // if there are any nodes left with incoming edges, then there was a circular dependency somewhere in the graph
  const badNodes = [];
  for (let j = 0; j < allNodes.length; ++j) {
    if (allNodes[j].requiredBy.length !== 0) {
      badNodes.push(allNodes[j]);
    }
  }

  //>>includeStart('debug', pragmas.debug);
  if (badNodes.length !== 0) {
    let message =
      "A circular dependency was found in the following built-in functions/structs/constants: \n";
    for (let k = 0; k < badNodes.length; ++k) {
      message = `${message + badNodes[k].name}\n`;
    }
    throw new DeveloperError(message);
  }
  //>>includeEnd('debug');
}

function getBuiltinsAndAutomaticUniforms(shaderSource) {
  // generate a dependency graph for builtin functions
  const dependencyNodes = [];
  const root = getDependencyNode("main", shaderSource, dependencyNodes);
  generateDependencies(root, dependencyNodes);
  sortDependencies(dependencyNodes);

  // Concatenate the source code for the function dependencies.
  // Iterate in reverse so that dependent items are declared before they are used.
  let builtinsSource = "";
  for (let i = dependencyNodes.length - 1; i >= 0; --i) {
    builtinsSource = `${builtinsSource + dependencyNodes[i].glslSource}\n`;
  }

  return builtinsSource.replace(root.glslSource, "");
}

function combineShader(shaderSource, isFragmentShader, context) {
  let i;
  let length;

  // Combine shader sources, generally for pseudo-polymorphism, e.g., czm_getMaterial.
  let combinedSources = "";
  const sources = shaderSource.sources;
  if (defined(sources)) {
    for (i = 0, length = sources.length; i < length; ++i) {
      // #line needs to be on its own line.
      combinedSources += `\n#line 0\n${sources[i]}`;
    }
  }

  combinedSources = removeComments(combinedSources);

  // Extract existing shader version from sources
  let version;
  combinedSources = combinedSources.replace(/#version\s+(.*?)\n/gm, function (
    match,
    group1
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (defined(version) && version !== group1) {
      throw new DeveloperError(
        `inconsistent versions found: ${version} and ${group1}`
      );
    }
    //>>includeEnd('debug');

    // Extract #version to put at the top
    version = group1;

    // Replace original #version directive with a new line so the line numbers
    // are not off by one.  There can be only one #version directive
    // and it must appear at the top of the source, only preceded by
    // whitespace and comments.
    return "\n";
  });

  // Extract shader extensions from sources
  const extensions = [];
  combinedSources = combinedSources.replace(/#extension.*\n/gm, function (
    match
  ) {
    // Extract extension to put at the top
    extensions.push(match);

    // Replace original #extension directive with a new line so the line numbers
    // are not off by one.
    return "\n";
  });

  // Remove precision qualifier
  combinedSources = combinedSources.replace(
    /precision\s(lowp|mediump|highp)\s(float|int);/,
    ""
  );

  // Replace main() for picked if desired.
  const pickColorQualifier = shaderSource.pickColorQualifier;
  if (defined(pickColorQualifier)) {
    combinedSources = ShaderSource.createPickFragmentShaderSource(
      combinedSources,
      pickColorQualifier
    );
  }

  // combine into single string
  let result = "";

  // #version must be first
  // defaults to #version 100 if not specified
  if (defined(version)) {
    result = `#version ${version}\n`;
  }

  const extensionsLength = extensions.length;
  for (i = 0; i < extensionsLength; i++) {
    result += extensions[i];
  }

  if (isFragmentShader) {
    // If high precision isn't support replace occurrences of highp with mediump
    // The highp keyword is not always available on older mobile devices
    // See https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#In_WebGL_1_highp_float_support_is_optional_in_fragment_shaders
    result +=
      "\
#ifdef GL_FRAGMENT_PRECISION_HIGH\n\
    precision highp float;\n\
    precision highp int;\n\
#else\n\
    precision mediump float;\n\
    precision mediump int;\n\
    #define highp mediump\n\
#endif\n\n";
  }

  // Prepend #defines for uber-shaders
  const defines = shaderSource.defines;
  if (defined(defines)) {
    for (i = 0, length = defines.length; i < length; ++i) {
      const define = defines[i];
      if (define.length !== 0) {
        result += `#define ${define}\n`;
      }
    }
  }

  // GLSLModernizer inserts its own layout qualifiers
  // at this position in the source
  if (context.webgl2) {
    result += "#define OUTPUT_DECLARATION\n\n";
  }

  // Define a constant for the OES_texture_float_linear extension since WebGL does not.
  if (context.textureFloatLinear) {
    result += "#define OES_texture_float_linear\n\n";
  }

  // Define a constant for the OES_texture_float extension since WebGL does not.
  if (context.floatingPointTexture) {
    result += "#define OES_texture_float\n\n";
  }

  // append built-ins
  if (shaderSource.includeBuiltIns) {
    result += getBuiltinsAndAutomaticUniforms(combinedSources);
  }

  // reset line number
  result += "\n#line 0\n";

  // append actual source
  result += combinedSources;

  // modernize the source
  if (context.webgl2) {
    result = modernizeShader(result, isFragmentShader, true);
  }

  return result;
}

/**
 * An object containing various inputs that will be combined to form a final GLSL shader string.
 *
 * @param {Object} [options] Object with the following properties:
 * @param {String[]} [options.sources] An array of strings to combine containing GLSL code for the shader.
 * @param {String[]} [options.defines] An array of strings containing GLSL identifiers to <code>#define</code>.
 * @param {String} [options.pickColorQualifier] The GLSL qualifier, <code>uniform</code> or <code>varying</code>, for the input <code>czm_pickColor</code>.  When defined, a pick fragment shader is generated.
 * @param {Boolean} [options.includeBuiltIns=true] If true, referenced built-in functions will be included with the combined shader.  Set to false if this shader will become a source in another shader, to avoid duplicating functions.
 *
 * @exception {DeveloperError} options.pickColorQualifier must be 'uniform' or 'varying'.
 *
 * @example
 * // 1. Prepend #defines to a shader
 * const source = new Cesium.ShaderSource({
 *   defines : ['WHITE'],
 *   sources : ['void main() { \n#ifdef WHITE\n gl_FragColor = vec4(1.0); \n#else\n gl_FragColor = vec4(0.0); \n#endif\n }']
 * });
 *
 * // 2. Modify a fragment shader for picking
 * const source2 = new Cesium.ShaderSource({
 *   sources : ['void main() { gl_FragColor = vec4(1.0); }'],
 *   pickColorQualifier : 'uniform'
 * });
 *
 * @private
 */
function ShaderSource(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  const pickColorQualifier = options.pickColorQualifier;

  //>>includeStart('debug', pragmas.debug);
  if (
    defined(pickColorQualifier) &&
    pickColorQualifier !== "uniform" &&
    pickColorQualifier !== "varying"
  ) {
    throw new DeveloperError(
      "options.pickColorQualifier must be 'uniform' or 'varying'."
    );
  }
  //>>includeEnd('debug');

  this.defines = defined(options.defines) ? options.defines.slice(0) : [];
  this.sources = defined(options.sources) ? options.sources.slice(0) : [];
  this.pickColorQualifier = pickColorQualifier;
  this.includeBuiltIns = defaultValue(options.includeBuiltIns, true);
}

ShaderSource.prototype.clone = function () {
  return new ShaderSource({
    sources: this.sources,
    defines: this.defines,
    pickColorQualifier: this.pickColorQualifier,
    includeBuiltIns: this.includeBuiltIns,
  });
};

ShaderSource.replaceMain = function (source, renamedMain) {
  renamedMain = `void ${renamedMain}()`;
  return source.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, renamedMain);
};

/**
 * Create a single string containing the full, combined vertex shader with all dependencies and defines.
 *
 * @param {Context} context The current rendering context
 *
 * @returns {String} The combined shader string.
 */
ShaderSource.prototype.createCombinedVertexShader = function (context) {
  return combineShader(this, false, context);
};

/**
 * Create a single string containing the full, combined fragment shader with all dependencies and defines.
 *
 * @param {Context} context The current rendering context
 *
 * @returns {String} The combined shader string.
 */
ShaderSource.prototype.createCombinedFragmentShader = function (context) {
  return combineShader(this, true, context);
};

/**
 * For ShaderProgram testing
 * @private
 */
ShaderSource._czmBuiltinsAndUniforms = {};

// combine automatic uniforms and Cesium built-ins
for (const builtinName in CzmBuiltins) {
  if (CzmBuiltins.hasOwnProperty(builtinName)) {
    ShaderSource._czmBuiltinsAndUniforms[builtinName] =
      CzmBuiltins[builtinName];
  }
}
for (const uniformName in AutomaticUniforms) {
  if (AutomaticUniforms.hasOwnProperty(uniformName)) {
    const uniform = AutomaticUniforms[uniformName];
    if (typeof uniform.getDeclaration === "function") {
      ShaderSource._czmBuiltinsAndUniforms[
        uniformName
      ] = uniform.getDeclaration(uniformName);
    }
  }
}

ShaderSource.createPickVertexShaderSource = function (vertexShaderSource) {
  const renamedVS = ShaderSource.replaceMain(
    vertexShaderSource,
    "czm_old_main"
  );
  const pickMain =
    "attribute vec4 pickColor; \n" +
    "varying vec4 czm_pickColor; \n" +
    "void main() \n" +
    "{ \n" +
    "    czm_old_main(); \n" +
    "    czm_pickColor = pickColor; \n" +
    "}";

  return `${renamedVS}\n${pickMain}`;
};

ShaderSource.createPickFragmentShaderSource = function (
  fragmentShaderSource,
  pickColorQualifier
) {
  const renamedFS = ShaderSource.replaceMain(
    fragmentShaderSource,
    "czm_old_main"
  );
  const pickMain =
    `${pickColorQualifier} vec4 czm_pickColor; \n` +
    `void main() \n` +
    `{ \n` +
    `    czm_old_main(); \n` +
    `    if (gl_FragColor.a == 0.0) { \n` +
    `       discard; \n` +
    `    } \n` +
    `    gl_FragColor = czm_pickColor; \n` +
    `}`;

  return `${renamedFS}\n${pickMain}`;
};

function containsString(shaderSource, string) {
  const sources = shaderSource.sources;
  const sourcesLength = sources.length;
  for (let i = 0; i < sourcesLength; ++i) {
    if (sources[i].indexOf(string) !== -1) {
      return true;
    }
  }
  return false;
}

function findFirstString(shaderSource, strings) {
  const stringsLength = strings.length;
  for (let i = 0; i < stringsLength; ++i) {
    const string = strings[i];
    if (containsString(shaderSource, string)) {
      return string;
    }
  }
  return undefined;
}

const normalVaryingNames = ["v_normalEC", "v_normal"];

ShaderSource.findNormalVarying = function (shaderSource) {
  // Fix for ModelExperimental: the shader text always has the word v_normalEC
  // wrapped in an #ifdef so instead of looking for v_normalEC look for the define
  if (containsString(shaderSource, "#ifdef HAS_NORMALS")) {
    if (containsString(shaderSource, "#define HAS_NORMALS")) {
      return "v_normalEC";
    }
    return undefined;
  }

  return findFirstString(shaderSource, normalVaryingNames);
};

const positionVaryingNames = ["v_positionEC"];

ShaderSource.findPositionVarying = function (shaderSource) {
  return findFirstString(shaderSource, positionVaryingNames);
};
export default ShaderSource;
