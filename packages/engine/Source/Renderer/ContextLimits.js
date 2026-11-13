/**
 * These are set in the constructor for {@link Context}
 *
 * @private
 */
const ContextLimits = {
  _maximumCombinedTextureImageUnits: 0,
  _maximumCubeMapSize: 0,
  _maximumFragmentUniformVectors: 0,
  _maximumTextureImageUnits: 0,
  _maximumRenderbufferSize: 0,
  _maximumTextureSize: 0,
  _maximum3DTextureSize: 0,
  _maximumVaryingVectors: 0,
  _maximumVertexAttributes: 0,
  _maximumVertexTextureImageUnits: 0,
  _maximumVertexUniformVectors: 0,
  _minimumAliasedLineWidth: 0,
  _maximumAliasedLineWidth: 0,
  _minimumAliasedPointSize: 0,
  _maximumAliasedPointSize: 0,
  _maximumViewportWidth: 0,
  _maximumViewportHeight: 0,
  _maximumTextureFilterAnisotropy: 0,
  _maximumDrawBuffers: 0,
  _maximumColorAttachments: 0,
  _maximumSamples: 0,
  _highpFloatSupported: false,
  _highpIntSupported: false,
};

Object.defineProperties(ContextLimits, {
  /**
   * The maximum number of texture units that can be used from the vertex and fragment
   * shader with this WebGL implementation.
   * If both shaders access the same texture unit, this counts as two texture units.
   * The minimum in WebGL2 contexts is 32, or 8 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumCombinedTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumCombinedTextureImageUnits;
    },
  },

  /**
   * The approximate maximum cube map width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 16.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumCubeMapSize: {
    get: function () {
      return ContextLimits._maximumCubeMapSize;
    },
  },

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a fragment shader with this WebGL implementation.
   * The minimum in WebGL2 contexts is 224, or 16 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumFragmentUniformVectors: {
    get: function () {
      return ContextLimits._maximumFragmentUniformVectors;
    },
  },

  /**
   * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.
   * The minimum in WebGL2 contexts is 16, or 8 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumTextureImageUnits;
    },
  },

  /**
   * The maximum renderbuffer width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 1.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_RENDERBUFFER_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumRenderbufferSize: {
    get: function () {
      return ContextLimits._maximumRenderbufferSize;
    },
  },

  /**
   * The approximate maximum texture width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 64.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_TEXTURE_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumTextureSize: {
    get: function () {
      return ContextLimits._maximumTextureSize;
    },
  },

  /**
   * The approximate maximum texture width, height, and depth supported by this WebGL2 implementation.
   * The minimum is 256, but most desktop and laptop implementations will support much larger sizes like 2048.
   * 3D textures are not supported in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_3D_TEXTURE_SIZE</code>.
   */
  maximum3DTextureSize: {
    get: function () {
      return ContextLimits._maximum3DTextureSize;
    },
  },

  /**
   * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
   * The minimum is 15 in WebGL2 contexts, or 8 in WebGL1 contexts. Matrices and arrays count as multiple <code>vec4</code>s.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VARYING_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumVaryingVectors: {
    get: function () {
      return ContextLimits._maximumVaryingVectors;
    },
  },

  /**
   * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.
   * The minimum is 16 in WebGL2 contexts, or 8 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_ATTRIBS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumVertexAttributes: {
    get: function () {
      return ContextLimits._maximumVertexAttributes;
    },
  },

  /**
   * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
   * The minimum is 16 in WebGL2 contexts, or 0 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumVertexTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumVertexTextureImageUnits;
    },
  },

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a vertex shader with this WebGL implementation.
   * The minimum is 256 in WebGL2 contexts, or 128 in WebGL1 contexts.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  maximumVertexUniformVectors: {
    get: function () {
      return ContextLimits._maximumVertexUniformVectors;
    },
  },

  /**
   * The minimum aliased line width, in pixels, supported by this WebGL implementation. It will be at most one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  minimumAliasedLineWidth: {
    get: function () {
      return ContextLimits._minimumAliasedLineWidth;
    },
  },

  /**
   * The maximum aliased line width, in pixels, supported by this WebGL implementation. It will be at least one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumAliasedLineWidth: {
    get: function () {
      return ContextLimits._maximumAliasedLineWidth;
    },
  },

  /**
   * The minimum aliased point size, in pixels, supported by this WebGL implementation. It will be at most one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  minimumAliasedPointSize: {
    get: function () {
      return ContextLimits._minimumAliasedPointSize;
    },
  },

  /**
   * The maximum aliased point size, in pixels, supported by this WebGL implementation. It will be at least one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumAliasedPointSize: {
    get: function () {
      return ContextLimits._maximumAliasedPointSize;
    },
  },

  /**
   * The maximum supported width of the viewport. It will be at least as large as the visible width of the associated canvas.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VIEWPORT_DIMS</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumViewportWidth: {
    get: function () {
      return ContextLimits._maximumViewportWidth;
    },
  },

  /**
   * The maximum supported height of the viewport. It will be at least as large as the visible height of the associated canvas.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VIEWPORT_DIMS</code>.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumViewportHeight: {
    get: function () {
      return ContextLimits._maximumViewportHeight;
    },
  },

  /**
   * The maximum degree of anisotropy for texture filtering
   * @memberof ContextLimits
   * @type {number}
   */
  maximumTextureFilterAnisotropy: {
    get: function () {
      return ContextLimits._maximumTextureFilterAnisotropy;
    },
  },

  /**
   * The maximum number of simultaneous outputs that may be written in a fragment shader.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumDrawBuffers: {
    get: function () {
      return ContextLimits._maximumDrawBuffers;
    },
  },

  /**
   * The maximum number of color attachments supported.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumColorAttachments: {
    get: function () {
      return ContextLimits._maximumColorAttachments;
    },
  },

  /**
   * The maximum number of samples supported for multisampling.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumSamples: {
    get: function () {
      return ContextLimits._maximumSamples;
    },
  },

  /**
   * High precision float supported (<code>highp</code>) in fragment shaders.
   * @memberof ContextLimits
   * @type {boolean}
   */
  highpFloatSupported: {
    get: function () {
      return ContextLimits._highpFloatSupported;
    },
  },

  /**
   * High precision int supported (<code>highp</code>) in fragment shaders.
   * @memberof ContextLimits
   * @type {boolean}
   */
  highpIntSupported: {
    get: function () {
      return ContextLimits._highpIntSupported;
    },
  },
});
export default ContextLimits;
