import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import ShaderProgram from "./ShaderProgram.js";
import ShaderSource from "./ShaderSource.js";

/**
 * @private
 */
function ShaderCache(context) {
  this._context = context;
  this._shaders = {};
  this._numberOfShaders = 0;
  this._shadersToRelease = {};
}

Object.defineProperties(ShaderCache.prototype, {
  numberOfShaders: {
    get: function () {
      return this._numberOfShaders;
    },
  },
});

/**
     * Returns a shader program from the cache, or creates and caches a new shader program,
     * given the GLSL vertex and fragment shader source and attribute locations.
     * <p>
     * The difference between this and {@link ShaderCache#getShaderProgram}, is this is used to
     * replace an existing reference to a shader program, which is passed as the first argument.
     * </p>
     *
     * @param {Object} options Object with the following properties:
     * @param {ShaderProgram} [options.shaderProgram] The shader program that is being reassigned.
     * @param {String|ShaderSource} options.vertexShaderSource The GLSL source for the vertex shader.
     * @param {String|ShaderSource} options.fragmentShaderSource The GLSL source for the fragment shader.
     * @param {Object} options.attributeLocations Indices for the attribute inputs to the vertex shader.

     * @returns {ShaderProgram} The cached or newly created shader program.
     *
     *
     * @example
     * this._shaderProgram = context.shaderCache.replaceShaderProgram({
     *     shaderProgram : this._shaderProgram,
     *     vertexShaderSource : vs,
     *     fragmentShaderSource : fs,
     *     attributeLocations : attributeLocations
     * });
     *
     * @see ShaderCache#getShaderProgram
     */
ShaderCache.prototype.replaceShaderProgram = function (options) {
  if (defined(options.shaderProgram)) {
    options.shaderProgram.destroy();
  }

  return this.getShaderProgram(options);
};

/**
 * Returns a shader program from the cache, or creates and caches a new shader program,
 * given the GLSL vertex and fragment shader source and attribute locations.
 *
 * @param {Object} options Object with the following properties:
 * @param {String|ShaderSource} options.vertexShaderSource The GLSL source for the vertex shader.
 * @param {String|ShaderSource} options.fragmentShaderSource The GLSL source for the fragment shader.
 * @param {Object} options.attributeLocations Indices for the attribute inputs to the vertex shader.
 *
 * @returns {ShaderProgram} The cached or newly created shader program.
 */
ShaderCache.prototype.getShaderProgram = function (options) {
  // convert shaders which are provided as strings into ShaderSource objects
  // because ShaderSource handles all the automatic including of built-in functions, etc.

  var vertexShaderSource = options.vertexShaderSource;
  var fragmentShaderSource = options.fragmentShaderSource;
  var attributeLocations = options.attributeLocations;

  if (typeof vertexShaderSource === "string") {
    vertexShaderSource = new ShaderSource({
      sources: [vertexShaderSource],
    });
  }

  if (typeof fragmentShaderSource === "string") {
    fragmentShaderSource = new ShaderSource({
      sources: [fragmentShaderSource],
    });
  }

  var vertexShaderText = vertexShaderSource.createCombinedVertexShader(
    this._context
  );
  var fragmentShaderText = fragmentShaderSource.createCombinedFragmentShader(
    this._context
  );

  var keyword =
    vertexShaderText + fragmentShaderText + JSON.stringify(attributeLocations);
  var cachedShader;

  if (defined(this._shaders[keyword])) {
    cachedShader = this._shaders[keyword];

    // No longer want to release this if it was previously released.
    delete this._shadersToRelease[keyword];
  } else {
    var context = this._context;
    var shaderProgram = new ShaderProgram({
      gl: context._gl,
      logShaderCompilation: context.logShaderCompilation,
      debugShaders: context.debugShaders,
      vertexShaderSource: vertexShaderSource,
      vertexShaderText: vertexShaderText,
      fragmentShaderSource: fragmentShaderSource,
      fragmentShaderText: fragmentShaderText,
      attributeLocations: attributeLocations,
    });

    cachedShader = {
      cache: this,
      shaderProgram: shaderProgram,
      keyword: keyword,
      derivedKeywords: [],
      count: 0,
    };

    // A shader can't be in more than one cache.
    shaderProgram._cachedShader = cachedShader;
    this._shaders[keyword] = cachedShader;
    ++this._numberOfShaders;
  }

  ++cachedShader.count;
  return cachedShader.shaderProgram;
};

ShaderCache.prototype.replaceDerivedShaderProgram = function (
  shaderProgram,
  keyword,
  options
) {
  var cachedShader = shaderProgram._cachedShader;
  var derivedKeyword = keyword + cachedShader.keyword;
  var cachedDerivedShader = this._shaders[derivedKeyword];
  if (defined(cachedDerivedShader)) {
    destroyShader(this, cachedDerivedShader);
    var index = cachedShader.derivedKeywords.indexOf(keyword);
    if (index > -1) {
      cachedShader.derivedKeywords.splice(index, 1);
    }
  }

  return this.createDerivedShaderProgram(shaderProgram, keyword, options);
};

ShaderCache.prototype.getDerivedShaderProgram = function (
  shaderProgram,
  keyword
) {
  var cachedShader = shaderProgram._cachedShader;
  var derivedKeyword = keyword + cachedShader.keyword;
  var cachedDerivedShader = this._shaders[derivedKeyword];
  if (!defined(cachedDerivedShader)) {
    return undefined;
  }

  return cachedDerivedShader.shaderProgram;
};

ShaderCache.prototype.createDerivedShaderProgram = function (
  shaderProgram,
  keyword,
  options
) {
  var cachedShader = shaderProgram._cachedShader;
  var derivedKeyword = keyword + cachedShader.keyword;

  var vertexShaderSource = options.vertexShaderSource;
  var fragmentShaderSource = options.fragmentShaderSource;
  var attributeLocations = options.attributeLocations;

  if (typeof vertexShaderSource === "string") {
    vertexShaderSource = new ShaderSource({
      sources: [vertexShaderSource],
    });
  }

  if (typeof fragmentShaderSource === "string") {
    fragmentShaderSource = new ShaderSource({
      sources: [fragmentShaderSource],
    });
  }

  var context = this._context;

  var vertexShaderText = vertexShaderSource.createCombinedVertexShader(context);
  var fragmentShaderText = fragmentShaderSource.createCombinedFragmentShader(
    context
  );

  var derivedShaderProgram = new ShaderProgram({
    gl: context._gl,
    logShaderCompilation: context.logShaderCompilation,
    debugShaders: context.debugShaders,
    vertexShaderSource: vertexShaderSource,
    vertexShaderText: vertexShaderText,
    fragmentShaderSource: fragmentShaderSource,
    fragmentShaderText: fragmentShaderText,
    attributeLocations: attributeLocations,
  });

  var derivedCachedShader = {
    cache: this,
    shaderProgram: derivedShaderProgram,
    keyword: derivedKeyword,
    derivedKeywords: [],
    count: 0,
  };

  cachedShader.derivedKeywords.push(keyword);
  derivedShaderProgram._cachedShader = derivedCachedShader;
  this._shaders[derivedKeyword] = derivedCachedShader;
  return derivedShaderProgram;
};

function destroyShader(cache, cachedShader) {
  var derivedKeywords = cachedShader.derivedKeywords;
  var length = derivedKeywords.length;
  for (var i = 0; i < length; ++i) {
    var keyword = derivedKeywords[i] + cachedShader.keyword;
    var derivedCachedShader = cache._shaders[keyword];
    destroyShader(cache, derivedCachedShader);
  }

  delete cache._shaders[cachedShader.keyword];
  cachedShader.shaderProgram.finalDestroy();
}

ShaderCache.prototype.destroyReleasedShaderPrograms = function () {
  var shadersToRelease = this._shadersToRelease;

  for (var keyword in shadersToRelease) {
    if (shadersToRelease.hasOwnProperty(keyword)) {
      var cachedShader = shadersToRelease[keyword];
      destroyShader(this, cachedShader);
      --this._numberOfShaders;
    }
  }

  this._shadersToRelease = {};
};

ShaderCache.prototype.releaseShaderProgram = function (shaderProgram) {
  if (defined(shaderProgram)) {
    var cachedShader = shaderProgram._cachedShader;
    if (cachedShader && --cachedShader.count === 0) {
      this._shadersToRelease[cachedShader.keyword] = cachedShader;
    }
  }
};

ShaderCache.prototype.isDestroyed = function () {
  return false;
};

ShaderCache.prototype.destroy = function () {
  var shaders = this._shaders;
  for (var keyword in shaders) {
    if (shaders.hasOwnProperty(keyword)) {
      shaders[keyword].shaderProgram.finalDestroy();
    }
  }
  return destroyObject(this);
};
export default ShaderCache;
