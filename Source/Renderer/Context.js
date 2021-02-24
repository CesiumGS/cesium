import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import Color from "../Core/Color.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import Matrix4 from "../Core/Matrix4.js";
import PixelFormat from "../Core/PixelFormat.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import RuntimeError from "../Core/RuntimeError.js";
import WebGLConstants from "../Core/WebGLConstants.js";
import ViewportQuadVS from "../Shaders/ViewportQuadVS.js";
import BufferUsage from "./BufferUsage.js";
import ClearCommand from "./ClearCommand.js";
import ContextLimits from "./ContextLimits.js";
import CubeMap from "./CubeMap.js";
import DrawCommand from "./DrawCommand.js";
import PassState from "./PassState.js";
import PixelDatatype from "./PixelDatatype.js";
import RenderState from "./RenderState.js";
import ShaderCache from "./ShaderCache.js";
import ShaderProgram from "./ShaderProgram.js";
import Texture from "./Texture.js";
import TextureCache from "./TextureCache.js";
import UniformState from "./UniformState.js";
import VertexArray from "./VertexArray.js";

function errorToString(gl, error) {
  var message = "WebGL Error:  ";
  switch (error) {
    case gl.INVALID_ENUM:
      message += "INVALID_ENUM";
      break;
    case gl.INVALID_VALUE:
      message += "INVALID_VALUE";
      break;
    case gl.INVALID_OPERATION:
      message += "INVALID_OPERATION";
      break;
    case gl.OUT_OF_MEMORY:
      message += "OUT_OF_MEMORY";
      break;
    case gl.CONTEXT_LOST_WEBGL:
      message += "CONTEXT_LOST_WEBGL lost";
      break;
    default:
      message += "Unknown (" + error + ")";
  }

  return message;
}

function createErrorMessage(gl, glFunc, glFuncArguments, error) {
  var message = errorToString(gl, error) + ": " + glFunc.name + "(";

  for (var i = 0; i < glFuncArguments.length; ++i) {
    if (i !== 0) {
      message += ", ";
    }
    message += glFuncArguments[i];
  }
  message += ");";

  return message;
}

function throwOnError(gl, glFunc, glFuncArguments) {
  var error = gl.getError();
  if (error !== gl.NO_ERROR) {
    throw new RuntimeError(
      createErrorMessage(gl, glFunc, glFuncArguments, error)
    );
  }
}

function makeGetterSetter(gl, propertyName, logFunction) {
  return {
    get: function () {
      var value = gl[propertyName];
      logFunction(gl, "get: " + propertyName, value);
      return gl[propertyName];
    },
    set: function (value) {
      gl[propertyName] = value;
      logFunction(gl, "set: " + propertyName, value);
    },
  };
}

function wrapGL(gl, logFunction) {
  if (!defined(logFunction)) {
    return gl;
  }

  function wrapFunction(property) {
    return function () {
      var result = property.apply(gl, arguments);
      logFunction(gl, property, arguments);
      return result;
    };
  }

  var glWrapper = {};

  // JavaScript linters normally demand that a for..in loop must directly contain an if,
  // but in our loop below, we actually intend to iterate all properties, including
  // those in the prototype.
  /*eslint-disable guard-for-in*/
  for (var propertyName in gl) {
    var property = gl[propertyName];

    // wrap any functions we encounter, otherwise just copy the property to the wrapper.
    if (property instanceof Function) {
      glWrapper[propertyName] = wrapFunction(property);
    } else {
      Object.defineProperty(
        glWrapper,
        propertyName,
        makeGetterSetter(gl, propertyName, logFunction)
      );
    }
  }
  /*eslint-enable guard-for-in*/

  return glWrapper;
}

function getExtension(gl, names) {
  var length = names.length;
  for (var i = 0; i < length; ++i) {
    var extension = gl.getExtension(names[i]);
    if (extension) {
      return extension;
    }
  }

  return undefined;
}

/**
 * @private
 * @constructor
 */
function Context(canvas, options) {
  // this check must use typeof, not defined, because defined doesn't work with undeclared variables.
  if (typeof WebGLRenderingContext === "undefined") {
    throw new RuntimeError(
      "The browser does not support WebGL.  Visit http://get.webgl.org."
    );
  }

  //>>includeStart('debug', pragmas.debug);
  Check.defined("canvas", canvas);
  //>>includeEnd('debug');

  this._canvas = canvas;

  options = clone(options, true);
  // Don't use defaultValue.EMPTY_OBJECT here because the options object gets modified in the next line.
  options = defaultValue(options, {});
  options.allowTextureFilterAnisotropic = defaultValue(
    options.allowTextureFilterAnisotropic,
    true
  );
  var webglOptions = defaultValue(options.webgl, {});

  // Override select WebGL defaults
  webglOptions.alpha = defaultValue(webglOptions.alpha, false); // WebGL default is true
  webglOptions.stencil = defaultValue(webglOptions.stencil, true); // WebGL default is false

  var requestWebgl2 =
    defaultValue(options.requestWebgl2, false) &&
    typeof WebGL2RenderingContext !== "undefined";
  var webgl2 = false;

  var glContext;
  var getWebGLStub = options.getWebGLStub;

  if (!defined(getWebGLStub)) {
    if (requestWebgl2) {
      glContext =
        canvas.getContext("webgl2", webglOptions) ||
        canvas.getContext("experimental-webgl2", webglOptions) ||
        undefined;
      if (defined(glContext)) {
        webgl2 = true;
      }
    }
    if (!defined(glContext)) {
      glContext =
        canvas.getContext("webgl", webglOptions) ||
        canvas.getContext("experimental-webgl", webglOptions) ||
        undefined;
    }
    if (!defined(glContext)) {
      throw new RuntimeError(
        "The browser supports WebGL, but initialization failed."
      );
    }
  } else {
    // Use WebGL stub when requested for unit tests
    glContext = getWebGLStub(canvas, webglOptions);
  }

  this._originalGLContext = glContext;
  this._gl = glContext;
  this._webgl2 = webgl2;
  this._id = createGuid();

  // Validation and logging disabled by default for speed.
  this.validateFramebuffer = false;
  this.validateShaderProgram = false;
  this.logShaderCompilation = false;

  this._throwOnWebGLError = false;

  this._shaderCache = new ShaderCache(this);
  this._textureCache = new TextureCache();

  var gl = glContext;

  this._stencilBits = gl.getParameter(gl.STENCIL_BITS);

  ContextLimits._maximumCombinedTextureImageUnits = gl.getParameter(
    gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS
  ); // min: 8
  ContextLimits._maximumCubeMapSize = gl.getParameter(
    gl.MAX_CUBE_MAP_TEXTURE_SIZE
  ); // min: 16
  ContextLimits._maximumFragmentUniformVectors = gl.getParameter(
    gl.MAX_FRAGMENT_UNIFORM_VECTORS
  ); // min: 16
  ContextLimits._maximumTextureImageUnits = gl.getParameter(
    gl.MAX_TEXTURE_IMAGE_UNITS
  ); // min: 8
  ContextLimits._maximumRenderbufferSize = gl.getParameter(
    gl.MAX_RENDERBUFFER_SIZE
  ); // min: 1
  ContextLimits._maximumTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE); // min: 64
  ContextLimits._maximumVaryingVectors = gl.getParameter(
    gl.MAX_VARYING_VECTORS
  ); // min: 8
  ContextLimits._maximumVertexAttributes = gl.getParameter(
    gl.MAX_VERTEX_ATTRIBS
  ); // min: 8
  ContextLimits._maximumVertexTextureImageUnits = gl.getParameter(
    gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS
  ); // min: 0
  ContextLimits._maximumVertexUniformVectors = gl.getParameter(
    gl.MAX_VERTEX_UNIFORM_VECTORS
  ); // min: 128

  var aliasedLineWidthRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE); // must include 1
  ContextLimits._minimumAliasedLineWidth = aliasedLineWidthRange[0];
  ContextLimits._maximumAliasedLineWidth = aliasedLineWidthRange[1];

  var aliasedPointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); // must include 1
  ContextLimits._minimumAliasedPointSize = aliasedPointSizeRange[0];
  ContextLimits._maximumAliasedPointSize = aliasedPointSizeRange[1];

  var maximumViewportDimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  ContextLimits._maximumViewportWidth = maximumViewportDimensions[0];
  ContextLimits._maximumViewportHeight = maximumViewportDimensions[1];

  var highpFloat = gl.getShaderPrecisionFormat(
    gl.FRAGMENT_SHADER,
    gl.HIGH_FLOAT
  );
  ContextLimits._highpFloatSupported = highpFloat.precision !== 0;
  var highpInt = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT);
  ContextLimits._highpIntSupported = highpInt.rangeMax !== 0;

  this._antialias = gl.getContextAttributes().antialias;

  // Query and initialize extensions
  this._standardDerivatives = !!getExtension(gl, ["OES_standard_derivatives"]);
  this._blendMinmax = !!getExtension(gl, ["EXT_blend_minmax"]);
  this._elementIndexUint = !!getExtension(gl, ["OES_element_index_uint"]);
  this._depthTexture = !!getExtension(gl, [
    "WEBGL_depth_texture",
    "WEBKIT_WEBGL_depth_texture",
  ]);
  this._fragDepth = !!getExtension(gl, ["EXT_frag_depth"]);
  this._debugShaders = getExtension(gl, ["WEBGL_debug_shaders"]);

  this._textureFloat = !!getExtension(gl, ["OES_texture_float"]);
  this._textureHalfFloat = !!getExtension(gl, ["OES_texture_half_float"]);

  this._textureFloatLinear = !!getExtension(gl, ["OES_texture_float_linear"]);
  this._textureHalfFloatLinear = !!getExtension(gl, [
    "OES_texture_half_float_linear",
  ]);

  this._colorBufferFloat = !!getExtension(gl, [
    "EXT_color_buffer_float",
    "WEBGL_color_buffer_float",
  ]);
  this._floatBlend = !!getExtension(gl, ["EXT_float_blend"]);
  this._colorBufferHalfFloat = !!getExtension(gl, [
    "EXT_color_buffer_half_float",
  ]);

  this._s3tc = !!getExtension(gl, [
    "WEBGL_compressed_texture_s3tc",
    "MOZ_WEBGL_compressed_texture_s3tc",
    "WEBKIT_WEBGL_compressed_texture_s3tc",
  ]);
  this._pvrtc = !!getExtension(gl, [
    "WEBGL_compressed_texture_pvrtc",
    "WEBKIT_WEBGL_compressed_texture_pvrtc",
  ]);
  this._etc1 = !!getExtension(gl, ["WEBGL_compressed_texture_etc1"]);

  var textureFilterAnisotropic = options.allowTextureFilterAnisotropic
    ? getExtension(gl, [
        "EXT_texture_filter_anisotropic",
        "WEBKIT_EXT_texture_filter_anisotropic",
      ])
    : undefined;
  this._textureFilterAnisotropic = textureFilterAnisotropic;
  ContextLimits._maximumTextureFilterAnisotropy = defined(
    textureFilterAnisotropic
  )
    ? gl.getParameter(textureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT)
    : 1.0;

  var glCreateVertexArray;
  var glBindVertexArray;
  var glDeleteVertexArray;

  var glDrawElementsInstanced;
  var glDrawArraysInstanced;
  var glVertexAttribDivisor;

  var glDrawBuffers;

  var vertexArrayObject;
  var instancedArrays;
  var drawBuffers;

  if (webgl2) {
    var that = this;

    glCreateVertexArray = function () {
      return that._gl.createVertexArray();
    };
    glBindVertexArray = function (vao) {
      that._gl.bindVertexArray(vao);
    };
    glDeleteVertexArray = function (vao) {
      that._gl.deleteVertexArray(vao);
    };

    glDrawElementsInstanced = function (
      mode,
      count,
      type,
      offset,
      instanceCount
    ) {
      gl.drawElementsInstanced(mode, count, type, offset, instanceCount);
    };
    glDrawArraysInstanced = function (mode, first, count, instanceCount) {
      gl.drawArraysInstanced(mode, first, count, instanceCount);
    };
    glVertexAttribDivisor = function (index, divisor) {
      gl.vertexAttribDivisor(index, divisor);
    };

    glDrawBuffers = function (buffers) {
      gl.drawBuffers(buffers);
    };
  } else {
    vertexArrayObject = getExtension(gl, ["OES_vertex_array_object"]);
    if (defined(vertexArrayObject)) {
      glCreateVertexArray = function () {
        return vertexArrayObject.createVertexArrayOES();
      };
      glBindVertexArray = function (vertexArray) {
        vertexArrayObject.bindVertexArrayOES(vertexArray);
      };
      glDeleteVertexArray = function (vertexArray) {
        vertexArrayObject.deleteVertexArrayOES(vertexArray);
      };
    }

    instancedArrays = getExtension(gl, ["ANGLE_instanced_arrays"]);
    if (defined(instancedArrays)) {
      glDrawElementsInstanced = function (
        mode,
        count,
        type,
        offset,
        instanceCount
      ) {
        instancedArrays.drawElementsInstancedANGLE(
          mode,
          count,
          type,
          offset,
          instanceCount
        );
      };
      glDrawArraysInstanced = function (mode, first, count, instanceCount) {
        instancedArrays.drawArraysInstancedANGLE(
          mode,
          first,
          count,
          instanceCount
        );
      };
      glVertexAttribDivisor = function (index, divisor) {
        instancedArrays.vertexAttribDivisorANGLE(index, divisor);
      };
    }

    drawBuffers = getExtension(gl, ["WEBGL_draw_buffers"]);
    if (defined(drawBuffers)) {
      glDrawBuffers = function (buffers) {
        drawBuffers.drawBuffersWEBGL(buffers);
      };
    }
  }

  this.glCreateVertexArray = glCreateVertexArray;
  this.glBindVertexArray = glBindVertexArray;
  this.glDeleteVertexArray = glDeleteVertexArray;

  this.glDrawElementsInstanced = glDrawElementsInstanced;
  this.glDrawArraysInstanced = glDrawArraysInstanced;
  this.glVertexAttribDivisor = glVertexAttribDivisor;

  this.glDrawBuffers = glDrawBuffers;

  this._vertexArrayObject = !!vertexArrayObject;
  this._instancedArrays = !!instancedArrays;
  this._drawBuffers = !!drawBuffers;

  ContextLimits._maximumDrawBuffers = this.drawBuffers
    ? gl.getParameter(WebGLConstants.MAX_DRAW_BUFFERS)
    : 1;
  ContextLimits._maximumColorAttachments = this.drawBuffers
    ? gl.getParameter(WebGLConstants.MAX_COLOR_ATTACHMENTS)
    : 1;

  this._clearColor = new Color(0.0, 0.0, 0.0, 0.0);
  this._clearDepth = 1.0;
  this._clearStencil = 0;

  var us = new UniformState();
  var ps = new PassState(this);
  var rs = RenderState.fromCache();

  this._defaultPassState = ps;
  this._defaultRenderState = rs;
  this._defaultTexture = undefined;
  this._defaultCubeMap = undefined;

  this._us = us;
  this._currentRenderState = rs;
  this._currentPassState = ps;
  this._currentFramebuffer = undefined;
  this._maxFrameTextureUnitIndex = 0;

  // Vertex attribute divisor state cache. Workaround for ANGLE (also look at VertexArray.setVertexAttribDivisor)
  this._vertexAttribDivisors = [];
  this._previousDrawInstanced = false;
  for (var i = 0; i < ContextLimits._maximumVertexAttributes; i++) {
    this._vertexAttribDivisors.push(0);
  }

  this._pickObjects = {};
  this._nextPickColor = new Uint32Array(1);

  /**
   * @example
   * {
   *   webgl : {
   *     alpha : false,
   *     depth : true,
   *     stencil : false,
   *     antialias : true,
   *     premultipliedAlpha : true,
   *     preserveDrawingBuffer : false,
   *     failIfMajorPerformanceCaveat : true
   *   },
   *   allowTextureFilterAnisotropic : true
   * }
   */
  this.options = options;

  /**
   * A cache of objects tied to this context.  Just before the Context is destroyed,
   * <code>destroy</code> will be invoked on each object in this object literal that has
   * such a method.  This is useful for caching any objects that might otherwise
   * be stored globally, except they're tied to a particular context, and to manage
   * their lifetime.
   *
   * @type {Object}
   */
  this.cache = {};

  RenderState.apply(gl, rs, ps);
}

var defaultFramebufferMarker = {};

Object.defineProperties(Context.prototype, {
  id: {
    get: function () {
      return this._id;
    },
  },
  webgl2: {
    get: function () {
      return this._webgl2;
    },
  },
  canvas: {
    get: function () {
      return this._canvas;
    },
  },
  shaderCache: {
    get: function () {
      return this._shaderCache;
    },
  },
  textureCache: {
    get: function () {
      return this._textureCache;
    },
  },
  uniformState: {
    get: function () {
      return this._us;
    },
  },

  /**
   * The number of stencil bits per pixel in the default bound framebuffer.  The minimum is eight bits.
   * @memberof Context.prototype
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>STENCIL_BITS</code>.
   */
  stencilBits: {
    get: function () {
      return this._stencilBits;
    },
  },

  /**
   * <code>true</code> if the WebGL context supports stencil buffers.
   * Stencil buffers are not supported by all systems.
   * @memberof Context.prototype
   * @type {Boolean}
   */
  stencilBuffer: {
    get: function () {
      return this._stencilBits >= 8;
    },
  },

  /**
   * <code>true</code> if the WebGL context supports antialiasing.  By default
   * antialiasing is requested, but it is not supported by all systems.
   * @memberof Context.prototype
   * @type {Boolean}
   */
  antialias: {
    get: function () {
      return this._antialias;
    },
  },

  /**
   * <code>true</code> if the OES_standard_derivatives extension is supported.  This
   * extension provides access to <code>dFdx</code>, <code>dFdy</code>, and <code>fwidth</code>
   * functions from GLSL.  A shader using these functions still needs to explicitly enable the
   * extension with <code>#extension GL_OES_standard_derivatives : enable</code>.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/gles/extensions/OES/OES_standard_derivatives.txt|OES_standard_derivatives}
   */
  standardDerivatives: {
    get: function () {
      return this._standardDerivatives || this._webgl2;
    },
  },

  /**
   * <code>true</code> if the EXT_float_blend extension is supported. This
   * extension enables blending with 32-bit float values.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_float_blend/}
   */
  floatBlend: {
    get: function () {
      return this._floatBlend;
    },
  },

  /**
   * <code>true</code> if the EXT_blend_minmax extension is supported.  This
   * extension extends blending capabilities by adding two new blend equations:
   * the minimum or maximum color components of the source and destination colors.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_blend_minmax/}
   */
  blendMinmax: {
    get: function () {
      return this._blendMinmax || this._webgl2;
    },
  },

  /**
   * <code>true</code> if the OES_element_index_uint extension is supported.  This
   * extension allows the use of unsigned int indices, which can improve performance by
   * eliminating batch breaking caused by unsigned short indices.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/webgl/extensions/OES_element_index_uint/|OES_element_index_uint}
   */
  elementIndexUint: {
    get: function () {
      return this._elementIndexUint || this._webgl2;
    },
  },

  /**
   * <code>true</code> if WEBGL_depth_texture is supported.  This extension provides
   * access to depth textures that, for example, can be attached to framebuffers for shadow mapping.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
   */
  depthTexture: {
    get: function () {
      return this._depthTexture || this._webgl2;
    },
  },

  /**
   * <code>true</code> if OES_texture_float is supported. This extension provides
   * access to floating point textures that, for example, can be attached to framebuffers for high dynamic range.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/OES_texture_float/}
   */
  floatingPointTexture: {
    get: function () {
      return this._webgl2 || this._textureFloat;
    },
  },

  /**
   * <code>true</code> if OES_texture_half_float is supported. This extension provides
   * access to floating point textures that, for example, can be attached to framebuffers for high dynamic range.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/OES_texture_float/}
   */
  halfFloatingPointTexture: {
    get: function () {
      return this._webgl2 || this._textureHalfFloat;
    },
  },

  /**
   * <code>true</code> if OES_texture_float_linear is supported. This extension provides
   * access to linear sampling methods for minification and magnification filters of floating-point textures.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/OES_texture_float_linear/}
   */
  textureFloatLinear: {
    get: function () {
      return this._textureFloatLinear;
    },
  },

  /**
   * <code>true</code> if OES_texture_half_float_linear is supported. This extension provides
   * access to linear sampling methods for minification and magnification filters of half floating-point textures.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/OES_texture_half_float_linear/}
   */
  textureHalfFloatLinear: {
    get: function () {
      return (
        (this._webgl2 && this._textureFloatLinear) ||
        (!this._webgl2 && this._textureHalfFloatLinear)
      );
    },
  },

  /**
   * <code>true</code> if EXT_texture_filter_anisotropic is supported. This extension provides
   * access to anisotropic filtering for textured surfaces at an oblique angle from the viewer.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_texture_filter_anisotropic/}
   */
  textureFilterAnisotropic: {
    get: function () {
      return !!this._textureFilterAnisotropic;
    },
  },

  /**
   * <code>true</code> if WEBGL_texture_compression_s3tc is supported.  This extension provides
   * access to DXT compressed textures.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_s3tc/}
   */
  s3tc: {
    get: function () {
      return this._s3tc;
    },
  },

  /**
   * <code>true</code> if WEBGL_texture_compression_pvrtc is supported.  This extension provides
   * access to PVR compressed textures.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_pvrtc/}
   */
  pvrtc: {
    get: function () {
      return this._pvrtc;
    },
  },

  /**
   * <code>true</code> if WEBGL_texture_compression_etc1 is supported.  This extension provides
   * access to ETC1 compressed textures.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/WEBGL_compressed_texture_etc1/}
   */
  etc1: {
    get: function () {
      return this._etc1;
    },
  },

  /**
   * <code>true</code> if the OES_vertex_array_object extension is supported.  This
   * extension can improve performance by reducing the overhead of switching vertex arrays.
   * When enabled, this extension is automatically used by {@link VertexArray}.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/|OES_vertex_array_object}
   */
  vertexArrayObject: {
    get: function () {
      return this._vertexArrayObject || this._webgl2;
    },
  },

  /**
   * <code>true</code> if the EXT_frag_depth extension is supported.  This
   * extension provides access to the <code>gl_FragDepthEXT</code> built-in output variable
   * from GLSL fragment shaders.  A shader using these functions still needs to explicitly enable the
   * extension with <code>#extension GL_EXT_frag_depth : enable</code>.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/webgl/extensions/EXT_frag_depth/|EXT_frag_depth}
   */
  fragmentDepth: {
    get: function () {
      return this._fragDepth || this._webgl2;
    },
  },

  /**
   * <code>true</code> if the ANGLE_instanced_arrays extension is supported.  This
   * extension provides access to instanced rendering.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/ANGLE_instanced_arrays}
   */
  instancedArrays: {
    get: function () {
      return this._instancedArrays || this._webgl2;
    },
  },

  /**
   * <code>true</code> if the EXT_color_buffer_float extension is supported.  This
   * extension makes the gl.RGBA32F format color renderable.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/WEBGL_color_buffer_float/}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_color_buffer_float/}
   */
  colorBufferFloat: {
    get: function () {
      return this._colorBufferFloat;
    },
  },

  /**
   * <code>true</code> if the EXT_color_buffer_half_float extension is supported.  This
   * extension makes the format gl.RGBA16F format color renderable.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_color_buffer_half_float/}
   * @see {@link https://www.khronos.org/registry/webgl/extensions/EXT_color_buffer_float/}
   */
  colorBufferHalfFloat: {
    get: function () {
      return (
        (this._webgl2 && this._colorBufferFloat) ||
        (!this._webgl2 && this._colorBufferHalfFloat)
      );
    },
  },

  /**
   * <code>true</code> if the WEBGL_draw_buffers extension is supported. This
   * extensions provides support for multiple render targets. The framebuffer object can have mutiple
   * color attachments and the GLSL fragment shader can write to the built-in output array <code>gl_FragData</code>.
   * A shader using this feature needs to explicitly enable the extension with
   * <code>#extension GL_EXT_draw_buffers : enable</code>.
   * @memberof Context.prototype
   * @type {Boolean}
   * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_draw_buffers/|WEBGL_draw_buffers}
   */
  drawBuffers: {
    get: function () {
      return this._drawBuffers || this._webgl2;
    },
  },

  debugShaders: {
    get: function () {
      return this._debugShaders;
    },
  },

  throwOnWebGLError: {
    get: function () {
      return this._throwOnWebGLError;
    },
    set: function (value) {
      this._throwOnWebGLError = value;
      this._gl = wrapGL(
        this._originalGLContext,
        value ? throwOnError : undefined
      );
    },
  },

  /**
   * A 1x1 RGBA texture initialized to [255, 255, 255, 255].  This can
   * be used as a placeholder texture while other textures are downloaded.
   * @memberof Context.prototype
   * @type {Texture}
   */
  defaultTexture: {
    get: function () {
      if (this._defaultTexture === undefined) {
        this._defaultTexture = new Texture({
          context: this,
          source: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 255, 255, 255]),
          },
          flipY: false,
        });
      }

      return this._defaultTexture;
    },
  },

  /**
   * A cube map, where each face is a 1x1 RGBA texture initialized to
   * [255, 255, 255, 255].  This can be used as a placeholder cube map while
   * other cube maps are downloaded.
   * @memberof Context.prototype
   * @type {CubeMap}
   */
  defaultCubeMap: {
    get: function () {
      if (this._defaultCubeMap === undefined) {
        var face = {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 255, 255, 255]),
        };

        this._defaultCubeMap = new CubeMap({
          context: this,
          source: {
            positiveX: face,
            negativeX: face,
            positiveY: face,
            negativeY: face,
            positiveZ: face,
            negativeZ: face,
          },
          flipY: false,
        });
      }

      return this._defaultCubeMap;
    },
  },

  /**
   * The drawingBufferHeight of the underlying GL context.
   * @memberof Context.prototype
   * @type {Number}
   * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferHeight|drawingBufferHeight}
   */
  drawingBufferHeight: {
    get: function () {
      return this._gl.drawingBufferHeight;
    },
  },

  /**
   * The drawingBufferWidth of the underlying GL context.
   * @memberof Context.prototype
   * @type {Number}
   * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferWidth|drawingBufferWidth}
   */
  drawingBufferWidth: {
    get: function () {
      return this._gl.drawingBufferWidth;
    },
  },

  /**
   * Gets an object representing the currently bound framebuffer.  While this instance is not an actual
   * {@link Framebuffer}, it is used to represent the default framebuffer in calls to
   * {@link Texture.fromFramebuffer}.
   * @memberof Context.prototype
   * @type {Object}
   */
  defaultFramebuffer: {
    get: function () {
      return defaultFramebufferMarker;
    },
  },
});

/**
 * Validates a framebuffer.
 * Available in debug builds only.
 * @private
 */
function validateFramebuffer(context) {
  //>>includeStart('debug', pragmas.debug);
  if (context.validateFramebuffer) {
    var gl = context._gl;
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      var message;

      switch (status) {
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
          message =
            "Framebuffer is not complete.  Incomplete attachment: at least one attachment point with a renderbuffer or texture attached has its attached object no longer in existence or has an attached image with a width or height of zero, or the color attachment point has a non-color-renderable image attached, or the depth attachment point has a non-depth-renderable image attached, or the stencil attachment point has a non-stencil-renderable image attached.  Color-renderable formats include GL_RGBA4, GL_RGB5_A1, and GL_RGB565. GL_DEPTH_COMPONENT16 is the only depth-renderable format. GL_STENCIL_INDEX8 is the only stencil-renderable format.";
          break;
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
          message =
            "Framebuffer is not complete.  Incomplete dimensions: not all attached images have the same width and height.";
          break;
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
          message =
            "Framebuffer is not complete.  Missing attachment: no images are attached to the framebuffer.";
          break;
        case gl.FRAMEBUFFER_UNSUPPORTED:
          message =
            "Framebuffer is not complete.  Unsupported: the combination of internal formats of the attached images violates an implementation-dependent set of restrictions.";
          break;
      }

      throw new DeveloperError(message);
    }
  }
  //>>includeEnd('debug');
}

function applyRenderState(context, renderState, passState, clear) {
  var previousRenderState = context._currentRenderState;
  var previousPassState = context._currentPassState;
  context._currentRenderState = renderState;
  context._currentPassState = passState;
  RenderState.partialApply(
    context._gl,
    previousRenderState,
    renderState,
    previousPassState,
    passState,
    clear
  );
}

var scratchBackBufferArray;
// this check must use typeof, not defined, because defined doesn't work with undeclared variables.
if (typeof WebGLRenderingContext !== "undefined") {
  scratchBackBufferArray = [WebGLConstants.BACK];
}

function bindFramebuffer(context, framebuffer) {
  if (framebuffer !== context._currentFramebuffer) {
    context._currentFramebuffer = framebuffer;
    var buffers = scratchBackBufferArray;

    if (defined(framebuffer)) {
      framebuffer._bind();
      validateFramebuffer(context);

      // TODO: Need a way for a command to give what draw buffers are active.
      buffers = framebuffer._getActiveColorAttachments();
    } else {
      var gl = context._gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    if (context.drawBuffers) {
      context.glDrawBuffers(buffers);
    }
  }
}

var defaultClearCommand = new ClearCommand();

Context.prototype.clear = function (clearCommand, passState) {
  clearCommand = defaultValue(clearCommand, defaultClearCommand);
  passState = defaultValue(passState, this._defaultPassState);

  var gl = this._gl;
  var bitmask = 0;

  var c = clearCommand.color;
  var d = clearCommand.depth;
  var s = clearCommand.stencil;

  if (defined(c)) {
    if (!Color.equals(this._clearColor, c)) {
      Color.clone(c, this._clearColor);
      gl.clearColor(c.red, c.green, c.blue, c.alpha);
    }
    bitmask |= gl.COLOR_BUFFER_BIT;
  }

  if (defined(d)) {
    if (d !== this._clearDepth) {
      this._clearDepth = d;
      gl.clearDepth(d);
    }
    bitmask |= gl.DEPTH_BUFFER_BIT;
  }

  if (defined(s)) {
    if (s !== this._clearStencil) {
      this._clearStencil = s;
      gl.clearStencil(s);
    }
    bitmask |= gl.STENCIL_BUFFER_BIT;
  }

  var rs = defaultValue(clearCommand.renderState, this._defaultRenderState);
  applyRenderState(this, rs, passState, true);

  // The command's framebuffer takes presidence over the pass' framebuffer, e.g., for off-screen rendering.
  var framebuffer = defaultValue(
    clearCommand.framebuffer,
    passState.framebuffer
  );
  bindFramebuffer(this, framebuffer);

  gl.clear(bitmask);
};

function beginDraw(
  context,
  framebuffer,
  passState,
  shaderProgram,
  renderState
) {
  //>>includeStart('debug', pragmas.debug);
  if (defined(framebuffer) && renderState.depthTest) {
    if (renderState.depthTest.enabled && !framebuffer.hasDepthAttachment) {
      throw new DeveloperError(
        "The depth test can not be enabled (drawCommand.renderState.depthTest.enabled) because the framebuffer (drawCommand.framebuffer) does not have a depth or depth-stencil renderbuffer."
      );
    }
  }
  //>>includeEnd('debug');

  bindFramebuffer(context, framebuffer);
  applyRenderState(context, renderState, passState, false);
  shaderProgram._bind();
  context._maxFrameTextureUnitIndex = Math.max(
    context._maxFrameTextureUnitIndex,
    shaderProgram.maximumTextureUnitIndex
  );
}

function continueDraw(context, drawCommand, shaderProgram, uniformMap) {
  var primitiveType = drawCommand._primitiveType;
  var va = drawCommand._vertexArray;
  var offset = drawCommand._offset;
  var count = drawCommand._count;
  var instanceCount = drawCommand.instanceCount;

  //>>includeStart('debug', pragmas.debug);
  if (!PrimitiveType.validate(primitiveType)) {
    throw new DeveloperError(
      "drawCommand.primitiveType is required and must be valid."
    );
  }

  Check.defined("drawCommand.vertexArray", va);
  Check.typeOf.number.greaterThanOrEquals("drawCommand.offset", offset, 0);
  if (defined(count)) {
    Check.typeOf.number.greaterThanOrEquals("drawCommand.count", count, 0);
  }
  Check.typeOf.number.greaterThanOrEquals(
    "drawCommand.instanceCount",
    instanceCount,
    0
  );
  if (instanceCount > 0 && !context.instancedArrays) {
    throw new DeveloperError("Instanced arrays extension is not supported");
  }
  //>>includeEnd('debug');

  context._us.model = defaultValue(drawCommand._modelMatrix, Matrix4.IDENTITY);
  shaderProgram._setUniforms(
    uniformMap,
    context._us,
    context.validateShaderProgram
  );

  va._bind();
  var indexBuffer = va.indexBuffer;

  if (defined(indexBuffer)) {
    offset = offset * indexBuffer.bytesPerIndex; // offset in vertices to offset in bytes
    count = defaultValue(count, indexBuffer.numberOfIndices);
    if (instanceCount === 0) {
      context._gl.drawElements(
        primitiveType,
        count,
        indexBuffer.indexDatatype,
        offset
      );
    } else {
      context.glDrawElementsInstanced(
        primitiveType,
        count,
        indexBuffer.indexDatatype,
        offset,
        instanceCount
      );
    }
  } else {
    count = defaultValue(count, va.numberOfVertices);
    if (instanceCount === 0) {
      context._gl.drawArrays(primitiveType, offset, count);
    } else {
      context.glDrawArraysInstanced(
        primitiveType,
        offset,
        count,
        instanceCount
      );
    }
  }

  va._unBind();
}

Context.prototype.draw = function (
  drawCommand,
  passState,
  shaderProgram,
  uniformMap
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("drawCommand", drawCommand);
  Check.defined("drawCommand.shaderProgram", drawCommand._shaderProgram);
  //>>includeEnd('debug');

  passState = defaultValue(passState, this._defaultPassState);
  // The command's framebuffer takes presidence over the pass' framebuffer, e.g., for off-screen rendering.
  var framebuffer = defaultValue(
    drawCommand._framebuffer,
    passState.framebuffer
  );
  var renderState = defaultValue(
    drawCommand._renderState,
    this._defaultRenderState
  );
  shaderProgram = defaultValue(shaderProgram, drawCommand._shaderProgram);
  uniformMap = defaultValue(uniformMap, drawCommand._uniformMap);

  beginDraw(this, framebuffer, passState, shaderProgram, renderState);
  continueDraw(this, drawCommand, shaderProgram, uniformMap);
};

Context.prototype.endFrame = function () {
  var gl = this._gl;
  gl.useProgram(null);

  this._currentFramebuffer = undefined;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  var buffers = scratchBackBufferArray;
  if (this.drawBuffers) {
    this.glDrawBuffers(buffers);
  }

  var length = this._maxFrameTextureUnitIndex;
  this._maxFrameTextureUnitIndex = 0;

  for (var i = 0; i < length; ++i) {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
};

Context.prototype.readPixels = function (readState) {
  var gl = this._gl;

  readState = defaultValue(readState, defaultValue.EMPTY_OBJECT);
  var x = Math.max(defaultValue(readState.x, 0), 0);
  var y = Math.max(defaultValue(readState.y, 0), 0);
  var width = defaultValue(readState.width, gl.drawingBufferWidth);
  var height = defaultValue(readState.height, gl.drawingBufferHeight);
  var framebuffer = readState.framebuffer;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number.greaterThan("readState.width", width, 0);
  Check.typeOf.number.greaterThan("readState.height", height, 0);
  //>>includeEnd('debug');

  var pixelDatatype = PixelDatatype.UNSIGNED_BYTE;
  if (defined(framebuffer) && framebuffer.numberOfColorAttachments > 0) {
    pixelDatatype = framebuffer.getColorTexture(0).pixelDatatype;
  }

  var pixels = PixelFormat.createTypedArray(
    PixelFormat.RGBA,
    pixelDatatype,
    width,
    height
  );

  bindFramebuffer(this, framebuffer);

  gl.readPixels(
    x,
    y,
    width,
    height,
    PixelFormat.RGBA,
    PixelDatatype.toWebGLConstant(pixelDatatype, this),
    pixels
  );

  return pixels;
};

var viewportQuadAttributeLocations = {
  position: 0,
  textureCoordinates: 1,
};

Context.prototype.getViewportQuadVertexArray = function () {
  // Per-context cache for viewport quads
  var vertexArray = this.cache.viewportQuad_vertexArray;

  if (!defined(vertexArray)) {
    var geometry = new Geometry({
      attributes: {
        position: new GeometryAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0],
        }),

        textureCoordinates: new GeometryAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0],
        }),
      },
      // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
      indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
      primitiveType: PrimitiveType.TRIANGLES,
    });

    vertexArray = VertexArray.fromGeometry({
      context: this,
      geometry: geometry,
      attributeLocations: viewportQuadAttributeLocations,
      bufferUsage: BufferUsage.STATIC_DRAW,
      interleave: true,
    });

    this.cache.viewportQuad_vertexArray = vertexArray;
  }

  return vertexArray;
};

Context.prototype.createViewportQuadCommand = function (
  fragmentShaderSource,
  overrides
) {
  overrides = defaultValue(overrides, defaultValue.EMPTY_OBJECT);

  return new DrawCommand({
    vertexArray: this.getViewportQuadVertexArray(),
    primitiveType: PrimitiveType.TRIANGLES,
    renderState: overrides.renderState,
    shaderProgram: ShaderProgram.fromCache({
      context: this,
      vertexShaderSource: ViewportQuadVS,
      fragmentShaderSource: fragmentShaderSource,
      attributeLocations: viewportQuadAttributeLocations,
    }),
    uniformMap: overrides.uniformMap,
    owner: overrides.owner,
    framebuffer: overrides.framebuffer,
    pass: overrides.pass,
  });
};

/**
 * Gets the object associated with a pick color.
 *
 * @param {Color} pickColor The pick color.
 * @returns {Object} The object associated with the pick color, or undefined if no object is associated with that color.
 *
 * @example
 * var object = context.getObjectByPickColor(pickColor);
 *
 * @see Context#createPickId
 */
Context.prototype.getObjectByPickColor = function (pickColor) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("pickColor", pickColor);
  //>>includeEnd('debug');

  return this._pickObjects[pickColor.toRgba()];
};

function PickId(pickObjects, key, color) {
  this._pickObjects = pickObjects;
  this.key = key;
  this.color = color;
}

Object.defineProperties(PickId.prototype, {
  object: {
    get: function () {
      return this._pickObjects[this.key];
    },
    set: function (value) {
      this._pickObjects[this.key] = value;
    },
  },
});

PickId.prototype.destroy = function () {
  delete this._pickObjects[this.key];
  return undefined;
};

/**
 * Creates a unique ID associated with the input object for use with color-buffer picking.
 * The ID has an RGBA color value unique to this context.  You must call destroy()
 * on the pick ID when destroying the input object.
 *
 * @param {Object} object The object to associate with the pick ID.
 * @returns {Object} A PickId object with a <code>color</code> property.
 *
 * @exception {RuntimeError} Out of unique Pick IDs.
 *
 *
 * @example
 * this._pickId = context.createPickId({
 *   primitive : this,
 *   id : this.id
 * });
 *
 * @see Context#getObjectByPickColor
 */
Context.prototype.createPickId = function (object) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("object", object);
  //>>includeEnd('debug');

  // the increment and assignment have to be separate statements to
  // actually detect overflow in the Uint32 value
  ++this._nextPickColor[0];
  var key = this._nextPickColor[0];
  if (key === 0) {
    // In case of overflow
    throw new RuntimeError("Out of unique Pick IDs.");
  }

  this._pickObjects[key] = object;
  return new PickId(this._pickObjects, key, Color.fromRgba(key));
};

Context.prototype.isDestroyed = function () {
  return false;
};

Context.prototype.destroy = function () {
  // Destroy all objects in the cache that have a destroy method.
  var cache = this.cache;
  for (var property in cache) {
    if (cache.hasOwnProperty(property)) {
      var propertyValue = cache[property];
      if (defined(propertyValue.destroy)) {
        propertyValue.destroy();
      }
    }
  }

  this._shaderCache = this._shaderCache.destroy();
  this._textureCache = this._textureCache.destroy();
  this._defaultTexture = this._defaultTexture && this._defaultTexture.destroy();
  this._defaultCubeMap = this._defaultCubeMap && this._defaultCubeMap.destroy();

  return destroyObject(this);
};
export default Context;
