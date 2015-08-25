/*global define*/
define([], function() {
    "use strict";

    /**
     * @private
     */
    var ContextLimits = {
        // these values are set when a context is created

        /**
         * The maximum number of texture units that can be used from the vertex and fragment
         * shader with this WebGL implementation.  The minimum is eight.  If both shaders access the
         * same texture unit, this counts as two texture units.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumCombinedTextureImageUnits : undefined,

        /**
         * The approximate maximum cube mape width and height supported by this WebGL implementation.
         * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
         */
        maximumCubeMapSize : undefined,

        /**
         * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
         * uniforms that can be used by a fragment shader with this WebGL implementation.  The minimum is 16.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
         */
        maximumFragmentUniformVectors : undefined,

        /**
         * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.  The minimum is eight.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumTextureImageUnits : undefined,

        /**
         * The maximum renderbuffer width and height supported by this WebGL implementation.
         * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_RENDERBUFFER_SIZE</code>.
         */
        maximumRenderbufferSize : undefined,

        /**
         * The approximate maximum texture width and height supported by this WebGL implementation.
         * The minimum is 64, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_SIZE</code>.
         */
        maximumTextureSize : undefined,

        /**
         * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
         * The minimum is eight.  Matrices and arrays count as multiple <code>vec4</code>s.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VARYING_VECTORS</code>.
         */
        maximumVaryingVectors : undefined,

        /**
         * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.  The minimum is eight.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_ATTRIBS</code>.
         */
        maximumVertexAttributes : undefined,

        /**
         * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
         * The minimum is zero, which means the GL does not support vertex texture fetch.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumVertexTextureImageUnits : undefined,

        /**
         * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
         * uniforms that can be used by a vertex shader with this WebGL implementation.  The minimum is 16.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
         */
        maximumVertexUniformVectors : undefined,

        /**
         * The minimum aliased line width, in pixels, supported by this WebGL implementation.  It will be at most one.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
         */
        minimumAliasedLineWidth : undefined,

        /**
         * The maximum aliased line width, in pixels, supported by this WebGL implementation.  It will be at least one.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
         */
        maximumAliasedLineWidth : undefined,

        /**
         * The minimum aliased point size, in pixels, supported by this WebGL implementation.  It will be at most one.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
         */
        minimumAliasedPointSize : undefined,

        /**
         * The maximum aliased point size, in pixels, supported by this WebGL implementation.  It will be at least one.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
         */
        maximumAliasedPointSize : undefined,

        /**
         * The maximum supported width of the viewport.  It will be at least as large as the visible width of the associated canvas.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
         */
        maximumViewportWidth : undefined,

        /**
         * The maximum supported height of the viewport.  It will be at least as large as the visible height of the associated canvas.
         * @memberof ContextLimits
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
         */
        maximumViewportHeight : undefined,

        /**
         * The maximum degree of anisotropy for texture filtering
         * @memberof ContextLimits
         * @type {Number}
         */
        maximumTextureFilterAnisotropy : undefined,

        /**
         * The maximum number of simultaneous outputs that may be written in a fragment shader.
         * @memberof ContextLimits
         * @type {Number}
         */
        maximumDrawBuffers : undefined,

        /**
         * The maximum number of color attachments supported.
         * @memberof ContextLimits
         * @type {Number}
         */
        maximumColorAttachments : undefined
    };

    return ContextLimits;
});