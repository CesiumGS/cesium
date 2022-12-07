import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import RuntimeError from "../Core/RuntimeError.js";
import AutomaticUniforms from "./AutomaticUniforms.js";
import ContextLimits from "./ContextLimits.js";
import createUniform from "./createUniform.js";
import createUniformArray from "./createUniformArray.js";

let nextShaderProgramId = 0;

/**
 * @private
 */
function ShaderProgram(options) {
  let vertexShaderText = options.vertexShaderText;
  let fragmentShaderText = options.fragmentShaderText;

  if (typeof spector !== "undefined") {
    // The #line statements common in Cesium shaders interfere with the ability of the
    // SpectorJS to show errors on the correct line. So remove them when SpectorJS
    // is active.
    vertexShaderText = vertexShaderText.replace(/^#line/gm, "//#line");
    fragmentShaderText = fragmentShaderText.replace(/^#line/gm, "//#line");
  }

  const modifiedFS = handleUniformPrecisionMismatches(
    vertexShaderText,
    fragmentShaderText
  );

  this._gl = options.gl;
  this._logShaderCompilation = options.logShaderCompilation;
  this._debugShaders = options.debugShaders;
  this._attributeLocations = options.attributeLocations;

  this._program = undefined;
  this._numberOfVertexAttributes = undefined;
  this._vertexAttributes = undefined;
  this._uniformsByName = undefined;
  this._uniforms = undefined;
  this._automaticUniforms = undefined;
  this._manualUniforms = undefined;
  this._duplicateUniformNames = modifiedFS.duplicateUniformNames;
  this._cachedShader = undefined; // Used by ShaderCache

  /**
   * @private
   */
  this.maximumTextureUnitIndex = undefined;

  this._vertexShaderSource = options.vertexShaderSource;
  this._vertexShaderText = options.vertexShaderText;
  this._fragmentShaderSource = options.fragmentShaderSource;
  this._fragmentShaderText = modifiedFS.fragmentShaderText;

  /**
   * @private
   */
  this.id = nextShaderProgramId++;
}

ShaderProgram.fromCache = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  return options.context.shaderCache.getShaderProgram(options);
};

ShaderProgram.replaceCache = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.context", options.context);
  //>>includeEnd('debug');

  return options.context.shaderCache.replaceShaderProgram(options);
};

Object.defineProperties(ShaderProgram.prototype, {
  /**
   * GLSL source for the shader program's vertex shader.
   * @memberof ShaderProgram.prototype
   *
   * @type {ShaderSource}
   * @readonly
   */
  vertexShaderSource: {
    get: function () {
      return this._vertexShaderSource;
    },
  },
  /**
   * GLSL source for the shader program's fragment shader.
   * @memberof ShaderProgram.prototype
   *
   * @type {ShaderSource}
   * @readonly
   */
  fragmentShaderSource: {
    get: function () {
      return this._fragmentShaderSource;
    },
  },
  vertexAttributes: {
    get: function () {
      initialize(this);
      return this._vertexAttributes;
    },
  },
  numberOfVertexAttributes: {
    get: function () {
      initialize(this);
      return this._numberOfVertexAttributes;
    },
  },
  allUniforms: {
    get: function () {
      initialize(this);
      return this._uniformsByName;
    },
  },
});

function extractUniforms(shaderText) {
  const uniformNames = [];
  const uniformLines = shaderText.match(/uniform.*?(?![^{]*})(?=[=\[;])/g);
  if (defined(uniformLines)) {
    const len = uniformLines.length;
    for (let i = 0; i < len; i++) {
      const line = uniformLines[i].trim();
      const name = line.slice(line.lastIndexOf(" ") + 1);
      uniformNames.push(name);
    }
  }
  return uniformNames;
}

function handleUniformPrecisionMismatches(
  vertexShaderText,
  fragmentShaderText
) {
  // If a uniform exists in both the vertex and fragment shader but with different precision qualifiers,
  // give the fragment shader uniform a different name. This fixes shader compilation errors on devices
  // that only support mediump in the fragment shader.
  const duplicateUniformNames = {};

  if (!ContextLimits.highpFloatSupported || !ContextLimits.highpIntSupported) {
    let i, j;
    let uniformName;
    let duplicateName;
    const vertexShaderUniforms = extractUniforms(vertexShaderText);
    const fragmentShaderUniforms = extractUniforms(fragmentShaderText);
    const vertexUniformsCount = vertexShaderUniforms.length;
    const fragmentUniformsCount = fragmentShaderUniforms.length;

    for (i = 0; i < vertexUniformsCount; i++) {
      for (j = 0; j < fragmentUniformsCount; j++) {
        if (vertexShaderUniforms[i] === fragmentShaderUniforms[j]) {
          uniformName = vertexShaderUniforms[i];
          duplicateName = `czm_mediump_${uniformName}`;
          // Update fragmentShaderText with renamed uniforms
          const re = new RegExp(`${uniformName}\\b`, "g");
          fragmentShaderText = fragmentShaderText.replace(re, duplicateName);
          duplicateUniformNames[duplicateName] = uniformName;
        }
      }
    }
  }

  return {
    fragmentShaderText: fragmentShaderText,
    duplicateUniformNames: duplicateUniformNames,
  };
}

const consolePrefix = "[Cesium WebGL] ";

function createAndLinkProgram(gl, shader) {
  const vsSource = shader._vertexShaderText;
  const fsSource = shader._fragmentShaderText;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vsSource);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fsSource);
  gl.compileShader(fragmentShader);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  const attributeLocations = shader._attributeLocations;
  if (defined(attributeLocations)) {
    for (const attribute in attributeLocations) {
      if (attributeLocations.hasOwnProperty(attribute)) {
        gl.bindAttribLocation(
          program,
          attributeLocations[attribute],
          attribute
        );
      }
    }
  }

  gl.linkProgram(program);
  let log;

  // For performance: if linker succeeds, return without checking compile status
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (shader._logShaderCompilation) {
      log = gl.getShaderInfoLog(vertexShader);
      if (defined(log) && log.length > 0) {
        console.log(`${consolePrefix}Vertex shader compile log: ${log}`);
      }

      log = gl.getShaderInfoLog(fragmentShader);
      if (defined(log) && log.length > 0) {
        console.log(`${consolePrefix}Fragment shader compile log: ${log}`);
      }

      log = gl.getProgramInfoLog(program);
      if (defined(log) && log.length > 0) {
        console.log(`${consolePrefix}Shader program link log: ${log}`);
      }
    }

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    return program;
  }

  // Program failed to link. Try to find and report the reason
  let errorMessage;
  const debugShaders = shader._debugShaders;

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    log = gl.getShaderInfoLog(fragmentShader);
    console.error(`${consolePrefix}Fragment shader compile log: ${log}`);
    console.error(`${consolePrefix} Fragment shader source:\n${fsSource}`);
    errorMessage = `Fragment shader failed to compile.  Compile log: ${log}`;
  } else if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    log = gl.getShaderInfoLog(vertexShader);
    console.error(`${consolePrefix}Vertex shader compile log: ${log}`);
    console.error(`${consolePrefix} Vertex shader source:\n${vsSource}`);
    errorMessage = `Vertex shader failed to compile.  Compile log: ${log}`;
  } else {
    log = gl.getProgramInfoLog(program);
    console.error(`${consolePrefix}Shader program link log: ${log}`);
    logTranslatedSource(vertexShader, "vertex");
    logTranslatedSource(fragmentShader, "fragment");
    errorMessage = `Program failed to link.  Link log: ${log}`;
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  gl.deleteProgram(program);
  throw new RuntimeError(errorMessage);

  function logTranslatedSource(compiledShader, name) {
    if (!defined(debugShaders)) {
      return;
    }
    const translation = debugShaders.getTranslatedShaderSource(compiledShader);
    if (translation === "") {
      console.error(`${consolePrefix}${name} shader translation failed.`);
      return;
    }
    console.error(
      `${consolePrefix}Translated ${name} shaderSource:\n${translation}`
    );
  }
}

function findVertexAttributes(gl, program, numberOfAttributes) {
  const attributes = {};
  for (let i = 0; i < numberOfAttributes; ++i) {
    const attr = gl.getActiveAttrib(program, i);
    const location = gl.getAttribLocation(program, attr.name);

    attributes[attr.name] = {
      name: attr.name,
      type: attr.type,
      index: location,
    };
  }

  return attributes;
}

function findUniforms(gl, program) {
  const uniformsByName = {};
  const uniforms = [];
  const samplerUniforms = [];

  const numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

  for (let i = 0; i < numberOfUniforms; ++i) {
    const activeUniform = gl.getActiveUniform(program, i);
    const suffix = "[0]";
    const uniformName =
      activeUniform.name.indexOf(
        suffix,
        activeUniform.name.length - suffix.length
      ) !== -1
        ? activeUniform.name.slice(0, activeUniform.name.length - 3)
        : activeUniform.name;

    // Ignore GLSL built-in uniforms returned in Firefox.
    if (uniformName.indexOf("gl_") !== 0) {
      if (activeUniform.name.indexOf("[") < 0) {
        // Single uniform
        const location = gl.getUniformLocation(program, uniformName);

        // IE 11.0.9 needs this check since getUniformLocation can return null
        // if the uniform is not active (e.g., it is optimized out).  Looks like
        // getActiveUniform() above returns uniforms that are not actually active.
        if (location !== null) {
          const uniform = createUniform(
            gl,
            activeUniform,
            uniformName,
            location
          );

          uniformsByName[uniformName] = uniform;
          uniforms.push(uniform);

          if (uniform._setSampler) {
            samplerUniforms.push(uniform);
          }
        }
      } else {
        // Uniform array

        let uniformArray;
        let locations;
        let value;
        let loc;

        // On some platforms - Nexus 4 in Firefox for one - an array of sampler2D ends up being represented
        // as separate uniforms, one for each array element.  Check for and handle that case.
        const indexOfBracket = uniformName.indexOf("[");
        if (indexOfBracket >= 0) {
          // We're assuming the array elements show up in numerical order - it seems to be true.
          uniformArray = uniformsByName[uniformName.slice(0, indexOfBracket)];

          // Nexus 4 with Android 4.3 needs this check, because it reports a uniform
          // with the strange name webgl_3467e0265d05c3c1[1] in our globe surface shader.
          if (!defined(uniformArray)) {
            continue;
          }

          locations = uniformArray._locations;

          // On the Nexus 4 in Chrome, we get one uniform per sampler, just like in Firefox,
          // but the size is not 1 like it is in Firefox.  So if we push locations here,
          // we'll end up adding too many locations.
          if (locations.length <= 1) {
            value = uniformArray.value;
            loc = gl.getUniformLocation(program, uniformName);

            // Workaround for IE 11.0.9.  See above.
            if (loc !== null) {
              locations.push(loc);
              value.push(gl.getUniform(program, loc));
            }
          }
        } else {
          locations = [];
          for (let j = 0; j < activeUniform.size; ++j) {
            loc = gl.getUniformLocation(program, `${uniformName}[${j}]`);

            // Workaround for IE 11.0.9.  See above.
            if (loc !== null) {
              locations.push(loc);
            }
          }
          uniformArray = createUniformArray(
            gl,
            activeUniform,
            uniformName,
            locations
          );

          uniformsByName[uniformName] = uniformArray;
          uniforms.push(uniformArray);

          if (uniformArray._setSampler) {
            samplerUniforms.push(uniformArray);
          }
        }
      }
    }
  }

  return {
    uniformsByName: uniformsByName,
    uniforms: uniforms,
    samplerUniforms: samplerUniforms,
  };
}

function partitionUniforms(shader, uniforms) {
  const automaticUniforms = [];
  const manualUniforms = [];

  for (const uniform in uniforms) {
    if (uniforms.hasOwnProperty(uniform)) {
      const uniformObject = uniforms[uniform];
      let uniformName = uniform;
      // if it's a duplicate uniform, use its original name so it is updated correctly
      const duplicateUniform = shader._duplicateUniformNames[uniformName];
      if (defined(duplicateUniform)) {
        uniformObject.name = duplicateUniform;
        uniformName = duplicateUniform;
      }
      const automaticUniform = AutomaticUniforms[uniformName];
      if (defined(automaticUniform)) {
        automaticUniforms.push({
          uniform: uniformObject,
          automaticUniform: automaticUniform,
        });
      } else {
        manualUniforms.push(uniformObject);
      }
    }
  }

  return {
    automaticUniforms: automaticUniforms,
    manualUniforms: manualUniforms,
  };
}

function setSamplerUniforms(gl, program, samplerUniforms) {
  gl.useProgram(program);

  let textureUnitIndex = 0;
  const length = samplerUniforms.length;
  for (let i = 0; i < length; ++i) {
    textureUnitIndex = samplerUniforms[i]._setSampler(textureUnitIndex);
  }

  gl.useProgram(null);

  return textureUnitIndex;
}

function initialize(shader) {
  if (defined(shader._program)) {
    return;
  }

  reinitialize(shader);
}

function reinitialize(shader) {
  const oldProgram = shader._program;

  const gl = shader._gl;
  const program = createAndLinkProgram(gl, shader, shader._debugShaders);
  const numberOfVertexAttributes = gl.getProgramParameter(
    program,
    gl.ACTIVE_ATTRIBUTES
  );
  const uniforms = findUniforms(gl, program);
  const partitionedUniforms = partitionUniforms(
    shader,
    uniforms.uniformsByName
  );

  shader._program = program;
  shader._numberOfVertexAttributes = numberOfVertexAttributes;
  shader._vertexAttributes = findVertexAttributes(
    gl,
    program,
    numberOfVertexAttributes
  );
  shader._uniformsByName = uniforms.uniformsByName;
  shader._uniforms = uniforms.uniforms;
  shader._automaticUniforms = partitionedUniforms.automaticUniforms;
  shader._manualUniforms = partitionedUniforms.manualUniforms;

  shader.maximumTextureUnitIndex = setSamplerUniforms(
    gl,
    program,
    uniforms.samplerUniforms
  );

  if (oldProgram) {
    shader._gl.deleteProgram(oldProgram);
  }

  // If SpectorJS is active, add the hook to make the shader editor work.
  // https://github.com/BabylonJS/Spector.js/blob/master/documentation/extension.md#shader-editor
  if (typeof spector !== "undefined") {
    shader._program.__SPECTOR_rebuildProgram = function (
      vertexSourceCode, // The new vertex shader source
      fragmentSourceCode, // The new fragment shader source
      onCompiled, // Callback triggered by your engine when the compilation is successful. It needs to send back the new linked program.
      onError // Callback triggered by your engine in case of error. It needs to send the WebGL error to allow the editor to display the error in the gutter.
    ) {
      const originalVS = shader._vertexShaderText;
      const originalFS = shader._fragmentShaderText;

      // SpectorJS likes to replace `!=` with `! =` for unknown reasons,
      // and that causes glsl compile failures. So fix that up.
      const regex = / ! = /g;
      shader._vertexShaderText = vertexSourceCode.replace(regex, " != ");
      shader._fragmentShaderText = fragmentSourceCode.replace(regex, " != ");

      try {
        reinitialize(shader);
        onCompiled(shader._program);
      } catch (e) {
        shader._vertexShaderText = originalVS;
        shader._fragmentShaderText = originalFS;

        // Only pass on the WebGL error:
        const errorMatcher = /(?:Compile|Link) error: ([^]*)/;
        const match = errorMatcher.exec(e.message);
        if (match) {
          onError(match[1]);
        } else {
          onError(e.message);
        }
      }
    };
  }
}

ShaderProgram.prototype._bind = function () {
  initialize(this);
  this._gl.useProgram(this._program);
};

ShaderProgram.prototype._setUniforms = function (
  uniformMap,
  uniformState,
  validate
) {
  let len;
  let i;

  if (defined(uniformMap)) {
    const manualUniforms = this._manualUniforms;
    len = manualUniforms.length;
    for (i = 0; i < len; ++i) {
      const mu = manualUniforms[i];
      mu.value = uniformMap[mu.name]();
    }
  }

  const automaticUniforms = this._automaticUniforms;
  len = automaticUniforms.length;
  for (i = 0; i < len; ++i) {
    const au = automaticUniforms[i];
    au.uniform.value = au.automaticUniform.getValue(uniformState);
  }

  ///////////////////////////////////////////////////////////////////

  // It appears that assigning the uniform values above and then setting them here
  // (which makes the GL calls) is faster than removing this loop and making
  // the GL calls above.  I suspect this is because each GL call pollutes the
  // L2 cache making our JavaScript and the browser/driver ping-pong cache lines.
  const uniforms = this._uniforms;
  len = uniforms.length;
  for (i = 0; i < len; ++i) {
    uniforms[i].set();
  }

  if (validate) {
    const gl = this._gl;
    const program = this._program;

    gl.validateProgram(program);
    //>>includeStart('debug', pragmas.debug);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      throw new DeveloperError(
        `Program validation failed.  Program info log: ${gl.getProgramInfoLog(
          program
        )}`
      );
    }
    //>>includeEnd('debug');
  }
};

ShaderProgram.prototype.isDestroyed = function () {
  return false;
};

ShaderProgram.prototype.destroy = function () {
  this._cachedShader.cache.releaseShaderProgram(this);
  return undefined;
};

ShaderProgram.prototype.finalDestroy = function () {
  this._gl.deleteProgram(this._program);
  return destroyObject(this);
};
export default ShaderProgram;
