// @ts-check

/**
 * These are set in the constructor for {@link Context}
 *
 * @private
 */
class ContextLimits {
  static _maximumCombinedTextureImageUnits = 0;
  static _maximumCubeMapSize = 0;
  static _maximumFragmentUniformVectors = 0;
  static _maximumTextureImageUnits = 0;
  static _maximumRenderbufferSize = 0;
  static _maximumTextureSize = 0;
  static _maximum3DTextureSize = 0;
  static _maximumVaryingVectors = 0;
  static _maximumVertexAttributes = 0;
  static _maximumVertexTextureImageUnits = 0;
  static _maximumVertexUniformVectors = 0;
  static _minimumAliasedLineWidth = 0;
  static _maximumAliasedLineWidth = 0;
  static _minimumAliasedPointSize = 0;
  static _maximumAliasedPointSize = 0;
  static _maximumViewportWidth = 0;
  static _maximumViewportHeight = 0;
  static _maximumTextureFilterAnisotropy = 0;
  static _maximumDrawBuffers = 0;
  static _maximumColorAttachments = 0;
  static _maximumSamples = 0;
  static _highpFloatSupported = false;
  static _highpIntSupported = false;

  /**
   * The maximum number of texture units that can be used from the vertex and fragment
   * shader with this WebGL implementation.
   * If both shaders access the same texture unit, this counts as two texture units.
   * The minimum in WebGL2 contexts is 32, or 8 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumCombinedTextureImageUnits() {
    return ContextLimits._maximumCombinedTextureImageUnits;
  }

  /**
   * The approximate maximum cube map width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 16.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumCubeMapSize() {
    return ContextLimits._maximumCubeMapSize;
  }

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a fragment shader with this WebGL implementation.
   * The minimum in WebGL2 contexts is 224, or 16 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumFragmentUniformVectors() {
    return ContextLimits._maximumFragmentUniformVectors;
  }

  /**
   * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.
   * The minimum in WebGL2 contexts is 16, or 8 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumTextureImageUnits() {
    return ContextLimits._maximumTextureImageUnits;
  }

  /**
   * The maximum renderbuffer width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 1.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_RENDERBUFFER_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumRenderbufferSize() {
    return ContextLimits._maximumRenderbufferSize;
  }

  /**
   * The approximate maximum texture width and height supported by this WebGL implementation.
   * The minimum in WebGL2 contexts is 2048, but most desktop and laptop implementations will support much larger sizes like 8192.
   * The minimum in WebGL1 contexts is 64.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_TEXTURE_SIZE</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumTextureSize() {
    return ContextLimits._maximumTextureSize;
  }

  /**
   * The approximate maximum texture width, height, and depth supported by this WebGL2 implementation.
   * The minimum is 256, but most desktop and laptop implementations will support much larger sizes like 2048.
   * 3D textures are not supported in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_3D_TEXTURE_SIZE</code>.
   */
  static get maximum3DTextureSize() {
    return ContextLimits._maximum3DTextureSize;
  }

  /**
   * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
   * The minimum is 15 in WebGL2 contexts, or 8 in WebGL1 contexts. Matrices and arrays count as multiple <code>vec4</code>s.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VARYING_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumVaryingVectors() {
    return ContextLimits._maximumVaryingVectors;
  }

  /**
   * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.
   * The minimum is 16 in WebGL2 contexts, or 8 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_ATTRIBS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumVertexAttributes() {
    return ContextLimits._maximumVertexAttributes;
  }

  /**
   * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
   * The minimum is 16 in WebGL2 contexts, or 0 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumVertexTextureImageUnits() {
    return ContextLimits._maximumVertexTextureImageUnits;
  }

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a vertex shader with this WebGL implementation.
   * The minimum is 256 in WebGL2 contexts, or 128 in WebGL1 contexts.
   * @type {number}
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es2.0/xhtml/glGet.xml|glGet in OpenGL ES 2.0} for WebGL1 contexts.
   */
  static get maximumVertexUniformVectors() {
    return ContextLimits._maximumVertexUniformVectors;
  }

  /**
   * The minimum aliased line width, in pixels, supported by this WebGL implementation. It will be at most one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   * @type {number}
   */
  static get minimumAliasedLineWidth() {
    return ContextLimits._minimumAliasedLineWidth;
  }

  /**
   * The maximum aliased line width, in pixels, supported by this WebGL implementation. It will be at least one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   * @type {number}
   */
  static get maximumAliasedLineWidth() {
    return ContextLimits._maximumAliasedLineWidth;
  }

  /**
   * The minimum aliased point size, in pixels, supported by this WebGL implementation. It will be at most one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   * @type {number}
   */
  static get minimumAliasedPointSize() {
    return ContextLimits._minimumAliasedPointSize;
  }

  /**
   * The maximum aliased point size, in pixels, supported by this WebGL implementation. It will be at least one.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   * @type {number}
   */
  static get maximumAliasedPointSize() {
    return ContextLimits._maximumAliasedPointSize;
  }

  /**
   * The maximum supported width of the viewport. It will be at least as large as the visible width of the associated canvas.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VIEWPORT_DIMS</code>.
   * @type {number}
   */
  static get maximumViewportWidth() {
    return ContextLimits._maximumViewportWidth;
  }

  /**
   * The maximum supported height of the viewport. It will be at least as large as the visible height of the associated canvas.
   * @see {@link https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glGet.xhtml|glGet in OpenGL ES 3.0} with <code>MAX_VIEWPORT_DIMS</code>.
   * @type {number}
   */
  static get maximumViewportHeight() {
    return ContextLimits._maximumViewportHeight;
  }

  /**
   * The maximum degree of anisotropy for texture filtering
   * @type {number}
   */
  static get maximumTextureFilterAnisotropy() {
    return ContextLimits._maximumTextureFilterAnisotropy;
  }

  /**
   * The maximum number of simultaneous outputs that may be written in a fragment shader.
   * @type {number}
   */
  static get maximumDrawBuffers() {
    return ContextLimits._maximumDrawBuffers;
  }

  /**
   * The maximum number of color attachments supported.
   * @type {number}
   */
  static get maximumColorAttachments() {
    return ContextLimits._maximumColorAttachments;
  }

  /**
   * The maximum number of samples supported for multisampling.
   * @type {number}
   */
  static get maximumSamples() {
    return ContextLimits._maximumSamples;
  }

  /**
   * High precision float supported (<code>highp</code>) in fragment shaders.
   * @type {boolean}
   */
  static get highpFloatSupported() {
    return ContextLimits._highpFloatSupported;
  }

  /**
   * High precision int supported (<code>highp</code>) in fragment shaders.
   * @type {boolean}
   */
  static get highpIntSupported() {
    return ContextLimits._highpIntSupported;
  }
}

export default ContextLimits;
