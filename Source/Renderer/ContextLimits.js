/**
 * @namespace
 * @private
 */
var ContextLimits = {
  _maximumCombinedTextureImageUnits: 0,
  _maximumCubeMapSize: 0,
  _maximumFragmentUniformVectors: 0,
  _maximumTextureImageUnits: 0,
  _maximumRenderbufferSize: 0,
  _maximumTextureSize: 0,
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
  _highpFloatSupported: false,
  _highpIntSupported: false,
};

Object.defineProperties(ContextLimits, {
  /**
   * The maximum number of texture units that can be used from the vertex and fragment
   * shader with this WebGL implementation.  The minimum is eight.  If both shaders access the
   * same texture unit, this counts as two texture units.
   * <br/>获取WebGL中最大纹理单元数量。最小值不会小于8。如果如果顶点着色器和片元着色器都访问同一个纹理单元，那么数量相当于两个纹理单元。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumCombinedTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumCombinedTextureImageUnits;
    },
  },

  /**
   * The approximate maximum cube mape width and height supported by this WebGL implementation.
   * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * <br/>获取WebGL中立方体贴图的最大的宽*高。最小值不小于16，但有些电脑支持的更大，如：8,192
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
   */
  maximumCubeMapSize: {
    get: function () {
      return ContextLimits._maximumCubeMapSize;
    },
  },

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a fragment shader with this WebGL implementation.  The minimum is 16.
   * <br/>获取WebGL中片元着色器可使用的最大全局变量（uniform）声明的<code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>的数量。最小不小于16。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
   */
  maximumFragmentUniformVectors: {
    get: function () {
      return ContextLimits._maximumFragmentUniformVectors;
    },
  },

  /**
   * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.  The minimum is eight.
   * <br/>获取WebGL中片段着色器可使用的最大纹理单元数量。最小值不小于8。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumTextureImageUnits;
    },
  },

  /**
   * The maximum renderbuffer width and height supported by this WebGL implementation.
   * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * <br/>获取WebGL中的最大渲染缓冲尺寸（宽*高）。最小值不小于16，但大多数电脑设备能够支持的更到，如：8,192。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_RENDERBUFFER_SIZE</code>.
   */
  maximumRenderbufferSize: {
    get: function () {
      return ContextLimits._maximumRenderbufferSize;
    },
  },

  /**
   * The approximate maximum texture width and height supported by this WebGL implementation.
   * <br/>获取WebGL中二维纹理的最大宽度*高度的近似值。
   * The minimum is 64, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * <br/>最少支持64，但大多数电脑支持的更大，如：8,192。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_SIZE</code>.
   */
  maximumTextureSize: {
    get: function () {
      return ContextLimits._maximumTextureSize;
    },
  },

  /**
   * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
   * The minimum is eight.  Matrices and arrays count as multiple <code>vec4</code>s.
   * <br/>获取WebGL中使用<code>varying</code>声明的<code>vec4</code>类型的变量的最大数量。最小不小于8。
   * <br/>声明为矩阵或者数组的<code>varying</code>变量会消耗多个插值器。
   * <br/>参考：{@link https://www.jianshu.com/p/e1f7228d4cbc OpenGL ES手册翻译---2.OpenGL ES操作（三）}
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VARYING_VECTORS</code>.
   */
  maximumVaryingVectors: {
    get: function () {
      return ContextLimits._maximumVaryingVectors;
    },
  },

  /**
   * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.  The minimum is eight.
   * <br/>获取WebGL中4个分量向量顶点属性的最大数量。最小值不小于8。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_ATTRIBS</code>.
   */
  maximumVertexAttributes: {
    get: function () {
      return ContextLimits._maximumVertexAttributes;
    },
  },

  /**
   * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
   * The minimum is zero, which means the GL does not support vertex texture fetch.
   * <br/>获取WebGL中顶点着色器中最大可以使用几个纹理单元。最小值不小于0，当为0时，说明不支持顶点纹理拾取。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumVertexTextureImageUnits: {
    get: function () {
      return ContextLimits._maximumVertexTextureImageUnits;
    },
  },

  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a vertex shader with this WebGL implementation.  The minimum is 16.
   * <br/>获取WebGL中顶点着色器中用全局变量<code>uniforms</code>声明的<code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>的最大数量。最小值不小于16。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
   */
  maximumVertexUniformVectors: {
    get: function () {
      return ContextLimits._maximumVertexUniformVectors;
    },
  },

  /**
   * The minimum aliased line width, in pixels, supported by this WebGL implementation.  It will be at most one.
   * <br/>获取WebGL中线段宽度的最小值，单位：像素；常常是：1px
   * <br/>参考：{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/lineWidth lineWidth}
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   */
  minimumAliasedLineWidth: {
    get: function () {
      return ContextLimits._minimumAliasedLineWidth;
    },
  },

  /**
   * The maximum aliased line width, in pixels, supported by this WebGL implementation.  It will be at least one.
   * <br/>获取WebGL中线段宽度的最大值，单位：像素；常常是：1px
   * <br/>参考：{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/lineWidth lineWidth}
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   */
  maximumAliasedLineWidth: {
    get: function () {
      return ContextLimits._maximumAliasedLineWidth;
    },
  },

  /**
   * The minimum aliased point size, in pixels, supported by this WebGL implementation.  It will be at most one.
   * <br/>获取WebGL中点半径的最小值，单位：像素；常常是：1px
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   */
  minimumAliasedPointSize: {
    get: function () {
      return ContextLimits._minimumAliasedPointSize;
    },
  },

  /**
   * The maximum aliased point size, in pixels, supported by this WebGL implementation.  It will be at least one.
   * <br/>获取WebGL中点半径的最大值，单位：像素；常常是：1px
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   */
  maximumAliasedPointSize: {
    get: function () {
      return ContextLimits._maximumAliasedPointSize;
    },
  },

  /**
   * The maximum supported width of the viewport.  It will be at least as large as the visible width of the associated canvas.
   * <br/>视口支持的最大宽度。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
   */
  maximumViewportWidth: {
    get: function () {
      return ContextLimits._maximumViewportWidth;
    },
  },

  /**
   * The maximum supported height of the viewport.  It will be at least as large as the visible height of the associated canvas.
   * <br/>视口支持的最大高度。
   * @memberof ContextLimits
   * @type {Number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
   */
  maximumViewportHeight: {
    get: function () {
      return ContextLimits._maximumViewportHeight;
    },
  },

  /**
   * The maximum degree of anisotropy for texture filtering
   * <br/>各向异性纹理过滤的最大值
   * <br/>参考：{@link https://www.cnblogs.com/kylegui/p/3855710.html anisotropy texture filtering}
   * @memberof ContextLimits
   * @type {Number}
   */
  maximumTextureFilterAnisotropy: {
    get: function () {
      return ContextLimits._maximumTextureFilterAnisotropy;
    },
  },

  /**
   * The maximum number of simultaneous outputs that may be written in a fragment shader.
   * <br/>从片元着色器中同步输出的最大值
   * @memberof ContextLimits
   * @type {Number}
   */
  maximumDrawBuffers: {
    get: function () {
      return ContextLimits._maximumDrawBuffers;
    },
  },

  /**
   * The maximum number of color attachments supported.
   * <br/>能够支持的最大颜色附件
   * @memberof ContextLimits
   * @type {Number}
   */
  maximumColorAttachments: {
    get: function () {
      return ContextLimits._maximumColorAttachments;
    },
  },

  /**
   * High precision float supported (<code>highp</code>) in fragment shaders.
   * <br/>片元着色器中是否支持高精度(<code>highp</code>)的<code>float</code>
   * @memberof ContextLimits
   * @type {Boolean}
   */
  highpFloatSupported: {
    get: function () {
      return ContextLimits._highpFloatSupported;
    },
  },

  /**
   * High precision int supported (<code>highp</code>) in fragment shaders.
   * <br/>片元着色器中是否支持高精度(<code>highp</code>)的<code>int</code>
   * @memberof ContextLimits
   * @type {Boolean}
   */
  highpIntSupported: {
    get: function () {
      return ContextLimits._highpIntSupported;
    },
  },
});
export default ContextLimits;
