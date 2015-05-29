/*global define*/
define([
        '../Core/clone',
        '../Core/Color',
        '../Core/ComponentDatatype',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/FeatureDetection',
        '../Core/Geometry',
        '../Core/GeometryAttribute',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PixelFormat',
        '../Core/PrimitiveType',
        '../Core/RuntimeError',
        '../Shaders/ViewportQuadVS',
        './Buffer',
        './BufferUsage',
        './ClearCommand',
        './CubeMap',
        './DrawCommand',
        './Framebuffer',
        './PassState',
        './PickFramebuffer',
        './PixelDatatype',
        './Renderbuffer',
        './RenderbufferFormat',
        './RenderState',
        './ShaderCache',
        './Texture',
        './TextureMagnificationFilter',
        './TextureMinificationFilter',
        './TextureWrap',
        './UniformState',
        './VertexArray'
    ], function(
        clone,
        Color,
        ComponentDatatype,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        Geometry,
        GeometryAttribute,
        IndexDatatype,
        CesiumMath,
        Matrix4,
        PixelFormat,
        PrimitiveType,
        RuntimeError,
        ViewportQuadVS,
        Buffer,
        BufferUsage,
        ClearCommand,
        CubeMap,
        DrawCommand,
        Framebuffer,
        PassState,
        PickFramebuffer,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        ShaderCache,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        UniformState,
        VertexArray) {
    "use strict";
    /*global WebGLRenderingContext*/

    function errorToString(gl, error) {
        var message = 'WebGL Error:  ';
        switch (error) {
        case gl.INVALID_ENUM:
            message += 'INVALID_ENUM';
            break;
        case gl.INVALID_VALUE:
            message += 'INVALID_VALUE';
            break;
        case gl.INVALID_OPERATION:
            message += 'INVALID_OPERATION';
            break;
        case gl.OUT_OF_MEMORY:
            message += 'OUT_OF_MEMORY';
            break;
        case gl.CONTEXT_LOST_WEBGL:
            message += 'CONTEXT_LOST_WEBGL lost';
            break;
        default:
            message += 'Unknown (' + error + ')';
        }

        return message;
    }

    function createErrorMessage(gl, glFunc, glFuncArguments, error) {
        var message = errorToString(gl, error) + ': ' + glFunc.name + '(';

        for ( var i = 0; i < glFuncArguments.length; ++i) {
            if (i !== 0) {
                message += ', ';
            }
            message += glFuncArguments[i];
        }
        message += ');';

        return message;
    }

    function throwOnError(gl, glFunc, glFuncArguments) {
        var error = gl.getError();
        if (error !== gl.NO_ERROR) {
            throw new RuntimeError(createErrorMessage(gl, glFunc, glFuncArguments, error));
        }
    }

    function makeGetterSetter(gl, propertyName, logFunc) {
        return {
            get : function() {
                var value = gl[propertyName];
                logFunc(gl, 'get: ' + propertyName, value);
                return gl[propertyName];
            },
            set : function(value) {
                gl[propertyName] = value;
                logFunc(gl, 'set: ' + propertyName, value);
            }
        };
    }

    function wrapGL(gl, logFunc) {
        if (!logFunc) {
            return gl;
        }

        function wrapFunction(property) {
            return function() {
                var result = property.apply(gl, arguments);
                logFunc(gl, property, arguments);
                return result;
            };
        }

        var glWrapper = {};

        /*jslint forin: true*/
        /*jshint forin: false*/
        // JSLint normally demands that a for..in loop must directly contain an if,
        // but in our loop below, we actually intend to iterate all properties, including
        // those in the prototype.
        for ( var propertyName in gl) {
            var property = gl[propertyName];

            // wrap any functions we encounter, otherwise just copy the property to the wrapper.
            if (typeof property === 'function') {
                glWrapper[propertyName] = wrapFunction(property);
            } else {
                Object.defineProperty(glWrapper, propertyName, makeGetterSetter(gl, propertyName, logFunc));
            }
        }

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
     */
    var Context = function(canvas, options) {
        // this check must use typeof, not defined, because defined doesn't work with undeclared variables.
        if (typeof WebGLRenderingContext === 'undefined') {
            throw new RuntimeError('The browser does not support WebGL.  Visit http://get.webgl.org.');
        }

        //>>includeStart('debug', pragmas.debug);
        if (!defined(canvas)) {
            throw new DeveloperError('canvas is required.');
        }
        //>>includeEnd('debug');

        this._canvas = canvas;

        options = clone(options, true);
        options = defaultValue(options, {});
        options.allowTextureFilterAnisotropic = defaultValue(options.allowTextureFilterAnisotropic, true);
        var webglOptions = defaultValue(options.webgl, {});

        // Override select WebGL defaults
        webglOptions.alpha = defaultValue(webglOptions.alpha, false); // WebGL default is true
        webglOptions.failIfMajorPerformanceCaveat = defaultValue(webglOptions.failIfMajorPerformanceCaveat, true); // WebGL default is false

        // Firefox 35 with ANGLE has a regression that causes alpha : false to affect all framebuffers
        // Since we can't detect for ANGLE without a context, we just detect for Windows.
        // https://github.com/AnalyticalGraphicsInc/cesium/issues/2431
        if (FeatureDetection.isFirefox() && FeatureDetection.isWindows()) {
            var firefoxVersion = FeatureDetection.firefoxVersion();
            if (firefoxVersion[0] === 35) {
                webglOptions.alpha = true;
            }
        }

        this._originalGLContext = canvas.getContext('webgl', webglOptions) || canvas.getContext('experimental-webgl', webglOptions) || undefined;

        if (!defined(this._originalGLContext)) {
            throw new RuntimeError('The browser supports WebGL, but initialization failed.');
        }

        this._id = createGuid();

        // Validation and logging disabled by default for speed.
        this.validateFramebuffer = false;
        this.validateShaderProgram = false;
        this.logShaderCompilation = false;

        this._throwOnWebGLError = false;

        this._shaderCache = new ShaderCache(this);

        var gl = this._gl = this._originalGLContext;

        this._version = gl.getParameter(gl.VERSION);
        this._shadingLanguageVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
        this._vendor = gl.getParameter(gl.VENDOR);
        this._renderer = gl.getParameter(gl.RENDERER);
        this._redBits = gl.getParameter(gl.RED_BITS);
        this._greenBits = gl.getParameter(gl.GREEN_BITS);
        this._blueBits = gl.getParameter(gl.BLUE_BITS);
        this._alphaBits = gl.getParameter(gl.ALPHA_BITS);
        this._depthBits = gl.getParameter(gl.DEPTH_BITS);
        this._stencilBits = gl.getParameter(gl.STENCIL_BITS);
        this._maximumCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS); // min: 8
        this._maximumCubeMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE); // min: 16
        this._maximumFragmentUniformVectors = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS); // min: 16
        this._maximumTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS); // min: 8
        this._maximumRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE); // min: 1
        this._maximumTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE); // min: 64
        this._maximumVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS); // min: 8
        this._maximumVertexAttributes = gl.getParameter(gl.MAX_VERTEX_ATTRIBS); // min: 8
        this._maximumVertexTextureImageUnits = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS); // min: 0
        this._maximumVertexUniformVectors = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS); // min: 128
        this._aliasedLineWidthRange = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE); // must include 1
        this._aliasedPointSizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE); // must include 1
        this._maximumViewportDimensions = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

        this._antialias = gl.getContextAttributes().antialias;

        // Query and initialize extensions
        this._standardDerivatives = getExtension(gl, ['OES_standard_derivatives']);
        this._elementIndexUint = getExtension(gl, ['OES_element_index_uint']);
        this._depthTexture = getExtension(gl, ['WEBGL_depth_texture', 'WEBKIT_WEBGL_depth_texture']);
        this._textureFloat = getExtension(gl, ['OES_texture_float']);

        var textureFilterAnisotropic = options.allowTextureFilterAnisotropic ? getExtension(gl, ['EXT_texture_filter_anisotropic', 'WEBKIT_EXT_texture_filter_anisotropic']) : undefined;
        this._textureFilterAnisotropic = textureFilterAnisotropic;
        this._maximumTextureFilterAnisotropy = defined(textureFilterAnisotropic) ? gl.getParameter(textureFilterAnisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1.0;

        this._vertexArrayObject = getExtension(gl, ['OES_vertex_array_object']);
        this._fragDepth = getExtension(gl, ['EXT_frag_depth']);

        this._drawBuffers = getExtension(gl, ['WEBGL_draw_buffers']);
        this._maximumDrawBuffers = defined(this._drawBuffers) ? gl.getParameter(this._drawBuffers.MAX_DRAW_BUFFERS_WEBGL) : 1;
        this._maximumColorAttachments = defined(this._drawBuffers) ? gl.getParameter(this._drawBuffers.MAX_COLOR_ATTACHMENTS_WEBGL) : 1; // min when supported: 4

        this._debugShaders = getExtension(gl, ['WEBGL_debug_shaders']);

        var cc = gl.getParameter(gl.COLOR_CLEAR_VALUE);
        this._clearColor = new Color(cc[0], cc[1], cc[2], cc[3]);
        this._clearDepth = gl.getParameter(gl.DEPTH_CLEAR_VALUE);
        this._clearStencil = gl.getParameter(gl.STENCIL_CLEAR_VALUE);

        var us = new UniformState();
        var ps = new PassState(this);
        var rs = this.createRenderState();

        this._defaultPassState = ps;
        this._defaultRenderState = rs;
        this._defaultTexture = undefined;
        this._defaultCubeMap = undefined;

        this._us = us;
        this._currentRenderState = rs;
        this._currentFramebuffer = undefined;
        this._maxFrameTextureUnitIndex = 0;

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
         *     preserveDrawingBuffer : false
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
    };

    var defaultFramebufferMarker = {};

    defineProperties(Context.prototype, {
        id : {
            get : function() {
                return this._id;
            }
        },
        canvas : {
            get : function() {
                return this._canvas;
            }
        },
        shaderCache : {
            get : function() {
                return this._shaderCache;
            }
        },
        uniformState : {
            get : function() {
                return this._us;
            }
        },

        /**
         * The WebGL version or release number of the form &lt;WebGL&gt;&lt;space&gt;&lt;version number&gt;&lt;space&gt;&lt;vendor-specific information&gt;.
         * @memberof Context.prototype
         * @type {String}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGetString.xml|glGetString} with <code>VERSION</code>.
         */
        version : {
            get : function() {
                return this._version;
            }
        },

        /**
         * The version or release number for the shading language of the form WebGL&lt;space&gt;GLSL&lt;space&gt;ES&lt;space&gt;&lt;version number&gt;&lt;space&gt;&lt;vendor-specific information&gt;.
         * @memberof Context.prototype
         * @type {String}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGetString.xml|glGetString} with <code>SHADING_LANGUAGE_VERSION</code>.
         */
        shadingLanguageVersion : {
            get : function() {
                return this._shadingLanguageVersion;
            }
        },

        /**
         * The company responsible for the WebGL implementation.
         * @memberof Context.prototype
         * @type {String}
         */
        vendor : {
            get : function() {
                return this._vendor;
            }
        },

        /**
         * The name of the renderer/configuration/hardware platform. For example, this may be the model of the
         * video card, e.g., 'GeForce 8800 GTS/PCI/SSE2', or the browser-dependent name of the GL implementation, e.g.
         * 'Mozilla' or 'ANGLE.'
         * @memberof Context.prototype
         * @type {String}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGetString.xml|glGetString} with <code>RENDERER</code>.
         * @see {@link http://code.google.com/p/angleproject/|ANGLE}
         */
        renderer : {
            get : function() {
                return this._renderer;
            }
        },

        /**
         * The number of red bits per component in the default framebuffer's color buffer.  The minimum is eight.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>RED_BITS</code>.
         */
        redBits : {
            get : function() {
                return this._redBits;
            }
        },

        /**
         * The number of green bits per component in the default framebuffer's color buffer.  The minimum is eight.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>GREEN_BITS</code>.
         */
        greenBits : {
            get : function() {
                return this._greenBits;
            }
        },

        /**
         * The number of blue bits per component in the default framebuffer's color buffer.  The minimum is eight.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>BLUE_BITS</code>.
         */
        blueBits : {
            get : function() {
                return this._blueBits;
            }
        },

        /**
         * The number of alpha bits per component in the default framebuffer's color buffer.  The minimum is eight.
         * <br /><br />
         * The alpha channel is used for GL destination alpha operations and by the HTML compositor to combine the color buffer
         * with the rest of the page.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALPHA_BITS</code>.
         */
        alphaBits : {
            get : function() {
                return this._alphaBits;
            }
        },

        /**
         * The number of depth bits per pixel in the default bound framebuffer.  The minimum is 16 bits; most
         * implementations will have 24 bits.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>DEPTH_BITS</code>.
         */
        depthBits : {
            get : function() {
                return this._depthBits;
            }
        },

        /**
         * The number of stencil bits per pixel in the default bound framebuffer.  The minimum is eight bits.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>STENCIL_BITS</code>.
         */
        stencilBits : {
            get : function() {
                return this._stencilBits;
            }
        },

        /**
         * The maximum number of texture units that can be used from the vertex and fragment
         * shader with this WebGL implementation.  The minimum is eight.  If both shaders access the
         * same texture unit, this counts as two texture units.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumCombinedTextureImageUnits : {
            get : function() {
                return this._maximumCombinedTextureImageUnits;
            }
        },

        /**
         * The approximate maximum cube mape width and height supported by this WebGL implementation.
         * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
         */
        maximumCubeMapSize : {
            get : function() {
                return this._maximumCubeMapSize;
            }
        },

        /**
         * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
         * uniforms that can be used by a fragment shader with this WebGL implementation.  The minimum is 16.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
         */
        maximumFragmentUniformVectors : {
            get : function() {
                return this._maximumFragmentUniformVectors;
            }
        },

        /**
         * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.  The minimum is eight.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumTextureImageUnits : {
            get : function() {
                return this._maximumTextureImageUnits;
            }
        },

        /**
         * The maximum renderbuffer width and height supported by this WebGL implementation.
         * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_RENDERBUFFER_SIZE</code>.
         */
        maximumRenderbufferSize : {
            get : function() {
                return this._maximumRenderbufferSize;
            }
        },

        /**
         * The approximate maximum texture width and height supported by this WebGL implementation.
         * The minimum is 64, but most desktop and laptop implementations will support much larger sizes like 8,192.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_SIZE</code>.
         */
        maximumTextureSize : {
            get : function() {
                return this._maximumTextureSize;
            }
        },

        /**
         * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
         * The minimum is eight.  Matrices and arrays count as multiple <code>vec4</code>s.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VARYING_VECTORS</code>.
         */
        maximumVaryingVectors : {
            get : function() {
                return this._maximumVaryingVectors;
            }
        },

        /**
         * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.  The minimum is eight.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_ATTRIBS</code>.
         */
        maximumVertexAttributes : {
            get : function() {
                return this._maximumVertexAttributes;
            }
        },

        /**
         * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
         * The minimum is zero, which means the GL does not support vertex texture fetch.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
         */
        maximumVertexTextureImageUnits : {
            get : function() {
                return this._maximumVertexTextureImageUnits;
            }
        },

        /**
         * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
         * uniforms that can be used by a vertex shader with this WebGL implementation.  The minimum is 16.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
         */
        maximumVertexUniformVectors : {
            get : function() {
                return this._maximumVertexUniformVectors;
            }
        },

        /**
         * The minimum aliased line width, in pixels, supported by this WebGL implementation.  It will be at most one.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
         */
        minimumAliasedLineWidth : {
            get :  function() {
                return this._aliasedLineWidthRange[0];
            }
        },

        /**
         * The maximum aliased line width, in pixels, supported by this WebGL implementation.  It will be at least one.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
         */
        maximumAliasedLineWidth : {
            get : function() {
                return this._aliasedLineWidthRange[1];
            }
        },

        /**
         * The minimum aliased point size, in pixels, supported by this WebGL implementation.  It will be at most one.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
         */
        minimumAliasedPointSize : {
            get : function() {
                return this._aliasedPointSizeRange[0];
            }
        },

        /**
         * The maximum aliased point size, in pixels, supported by this WebGL implementation.  It will be at least one.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
         */
        maximumAliasedPointSize : {
            get : function() {
                return this._aliasedPointSizeRange[1];
            }
        },

        /**
         * The maximum supported width of the viewport.  It will be at least as large as the visible width of the associated canvas.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
         */
        maximumViewportWidth : {
            get : function() {
                return this._maximumViewportDimensions[0];
            }
        },

        /**
         * The maximum supported height of the viewport.  It will be at least as large as the visible height of the associated canvas.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
         */
        maximumViewportHeight : {
            get : function() {
                return this._maximumViewportDimensions[1];
            }
        },

        /**
         * <code>true</code> if the WebGL context supports antialiasing.  By default
         * antialiasing is requested, but it is not supported by all systems.
         * @memberof Context.prototype
         * @type {Boolean}
         */
        antialias : {
            get : function() {
                return this._antialias;
            }
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
        standardDerivatives : {
            get : function() {
                return !!this._standardDerivatives;
            }
        },

        /**
         * <code>true</code> if the OES_element_index_uint extension is supported.  This
         * extension allows the use of unsigned int indices, which can improve performance by
         * eliminating batch breaking caused by unsigned short indices.
         * @memberof Context.prototype
         * @type {Boolean}
         * @see {@link http://www.khronos.org/registry/webgl/extensions/OES_element_index_uint/|OES_element_index_uint}
         */
        elementIndexUint : {
            get : function() {
                return !!this._elementIndexUint;
            }
        },

        /**
         * <code>true</code> if WEBGL_depth_texture is supported.  This extension provides
         * access to depth textures that, for example, can be attached to framebuffers for shadow mapping.
         * @memberof Context.prototype
         * @type {Boolean}
         * @see {@link http://www.khronos.org/registry/webgl/extensions/WEBGL_depth_texture/|WEBGL_depth_texture}
         */
        depthTexture : {
            get : function() {
                return !!this._depthTexture;
            }
        },

        /**
         * <code>true</code> if OES_texture_float is supported.  This extension provides
         * access to floating point textures that, for example, can be attached to framebuffers for high dynamic range.
         * @memberof Context.prototype
         * @type {Boolean}
         * @see {@link http://www.khronos.org/registry/gles/extensions/OES/OES_texture_float.txt|OES_texture_float}
         */
        floatingPointTexture : {
            get : function() {
                return !!this._textureFloat;
            }
        },

        textureFilterAnisotropic : {
            get : function() {
                return !!this._textureFilterAnisotropic;
            }
        },

        maximumTextureFilterAnisotropy : {
            get : function() {
                return this._maximumTextureFilterAnisotropy;
            }
        },

        /**
         * <code>true</code> if the OES_vertex_array_object extension is supported.  This
         * extension can improve performance by reducing the overhead of switching vertex arrays.
         * When enabled, this extension is automatically used by {@link VertexArray}.
         * @memberof Context.prototype
         * @type {Boolean}
         * @see {@link http://www.khronos.org/registry/webgl/extensions/OES_vertex_array_object/|OES_vertex_array_object}
         */
        vertexArrayObject : {
            get : function() {
                return !!this._vertexArrayObject;
            }
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
        fragmentDepth : {
            get : function() {
                return !!this._fragDepth;
            }
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
        drawBuffers : {
            get : function() {
                return !!this._drawBuffers;
            }
        },

        /**
         * The maximum number of simultaneous outputs that may be written in a fragment shader.
         * @memberof Context.prototype
         * @type {Number}
         */
        maximumDrawBuffers : {
            get : function() {
                return this._maximumDrawBuffers;
            }
        },

        /**
         * The maximum number of color attachments supported.
         * @memberof Context.prototype
         * @type {Number}
         */
        maximumColorAttachments : {
            get : function() {
                return this._maximumColorAttachments;
            }
        },

        debugShaders : {
            get : function() {
                return this._debugShaders;
            }
        },

        throwOnWebGLError : {
            get : function() {
                return this._throwOnWebGLError;
            },
            set : function(value) {
                this._throwOnWebGLError = value;
                this._gl = wrapGL(this._originalGLContext, value ? throwOnError : null);
            }
        },

        /**
         * A 1x1 RGBA texture initialized to [255, 255, 255, 255].  This can
         * be used as a placeholder texture while other textures are downloaded.
         * @memberof Context.prototype
         * @type {Texture}
         */
        defaultTexture : {
            get : function() {
                if (this._defaultTexture === undefined) {
                    this._defaultTexture = this.createTexture2D({
                        source : {
                            width : 1,
                            height : 1,
                            arrayBufferView : new Uint8Array([255, 255, 255, 255])
                        }
                    });
                }

                return this._defaultTexture;
            }
        },

        /**
         * A cube map, where each face is a 1x1 RGBA texture initialized to
         * [255, 255, 255, 255].  This can be used as a placeholder cube map while
         * other cube maps are downloaded.
         * @memberof Context.prototype
         * @type {CubeMap}
         */
        defaultCubeMap : {
            get : function() {
                if (this._defaultCubeMap === undefined) {
                    var face = {
                        width : 1,
                        height : 1,
                        arrayBufferView : new Uint8Array([255, 255, 255, 255])
                    };

                    this._defaultCubeMap = this.createCubeMap({
                        source : {
                            positiveX : face,
                            negativeX : face,
                            positiveY : face,
                            negativeY : face,
                            positiveZ : face,
                            negativeZ : face
                        }
                    });
                }

                return this._defaultCubeMap;

            }
        },

        /**
         * The drawingBufferHeight of the underlying GL context.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferHeight|drawingBufferHeight}
         */
        drawingBufferHeight : {
            get : function() {
                return this._gl.drawingBufferHeight;
            }
        },

        /**
         * The drawingBufferWidth of the underlying GL context.
         * @memberof Context.prototype
         * @type {Number}
         * @see {@link https://www.khronos.org/registry/webgl/specs/1.0/#DOM-WebGLRenderingContext-drawingBufferWidth|drawingBufferWidth}
         */
        drawingBufferWidth : {
            get : function() {
                return this._gl.drawingBufferWidth;
            }
        },

        /**
         * Gets an object representing the currently bound framebuffer.  While this instance is not an actual
         * {@link Framebuffer}, it is used to represent the default framebuffer in calls to
         * {@link Context.createTexture2DFromFramebuffer}.
         * @memberof Context.prototype
         * @type {Object}
         */
        defaultFramebuffer : {
            get : function() {
                return defaultFramebufferMarker;
            }
        }
    });

    Context.prototype.replaceShaderProgram = function(shaderProgram, vertexShaderSource, fragmentShaderSource, attributeLocations) {
        return this._shaderCache.replaceShaderProgram(shaderProgram, vertexShaderSource, fragmentShaderSource, attributeLocations);
    };

    Context.prototype.createShaderProgram = function(vertexShaderSource, fragmentShaderSource, attributeLocations) {
        return this._shaderCache.getShaderProgram(vertexShaderSource, fragmentShaderSource, attributeLocations);
    };

    function createBuffer(gl, bufferTarget, typedArrayOrSizeInBytes, usage) {
        var sizeInBytes;

        if (typeof typedArrayOrSizeInBytes === 'number') {
            sizeInBytes = typedArrayOrSizeInBytes;
        } else if (typeof typedArrayOrSizeInBytes === 'object' && typeof typedArrayOrSizeInBytes.byteLength === 'number') {
            sizeInBytes = typedArrayOrSizeInBytes.byteLength;
        } else {
            //>>includeStart('debug', pragmas.debug);
            throw new DeveloperError('typedArrayOrSizeInBytes must be either a typed array or a number.');
            //>>includeEnd('debug');
        }

        //>>includeStart('debug', pragmas.debug);
        if (sizeInBytes <= 0) {
            throw new DeveloperError('typedArrayOrSizeInBytes must be greater than zero.');
        }

        if (!BufferUsage.validate(usage)) {
            throw new DeveloperError('usage is invalid.');
        }
        //>>includeEnd('debug');

        var buffer = gl.createBuffer();
        gl.bindBuffer(bufferTarget, buffer);
        gl.bufferData(bufferTarget, typedArrayOrSizeInBytes, usage);
        gl.bindBuffer(bufferTarget, null);

        return new Buffer(gl, bufferTarget, sizeInBytes, usage, buffer);
    }

    /**
     * Creates a vertex buffer, which contains untyped vertex data in GPU-controlled memory.
     * <br /><br />
     * A vertex array defines the actual makeup of a vertex, e.g., positions, normals, texture coordinates,
     * etc., by interpreting the raw data in one or more vertex buffers.
     *
     * @param {ArrayBufferView|Number} typedArrayOrSizeInBytes A typed array containing the data to copy to the buffer, or a <code>Number</code> defining the size of the buffer in bytes.
     * @param {BufferUsage} usage Specifies the expected usage pattern of the buffer.  On some GL implementations, this can significantly affect performance.  See {@link BufferUsage}.
     * @returns {VertexBuffer} The vertex buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} The size in bytes must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     *
     * @see Context#createVertexArray
     * @see Context#createIndexBuffer
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ARRAY_BUFFER</code>
     *
     * @example
     * // Example 1. Create a dynamic vertex buffer 16 bytes in size.
     * var buffer = context.createVertexBuffer(16, BufferUsage.DYNAMIC_DRAW);
     *
     * @example
     * // Example 2. Create a dynamic vertex buffer from three floating-point values.
     * // The data copied to the vertex buffer is considered raw bytes until it is
     * // interpreted as vertices using a vertex array.
     * var positionBuffer = context.createVertexBuffer(new Float32Array([0, 0, 0]),
     *     BufferUsage.STATIC_DRAW);
     */
    Context.prototype.createVertexBuffer = function(typedArrayOrSizeInBytes, usage) {
        return createBuffer(this._gl, this._gl.ARRAY_BUFFER, typedArrayOrSizeInBytes, usage);
    };

    /**
     * Creates an index buffer, which contains typed indices in GPU-controlled memory.
     * <br /><br />
     * An index buffer can be attached to a vertex array to select vertices for rendering.
     * <code>Context.draw</code> can render using the entire index buffer or a subset
     * of the index buffer defined by an offset and count.
     *
     * @param {ArrayBufferView|Number} typedArrayOrSizeInBytes A typed array containing the data to copy to the buffer, or a <code>Number</code> defining the size of the buffer in bytes.
     * @param {BufferUsage} usage Specifies the expected usage pattern of the buffer.  On some GL implementations, this can significantly affect performance.  See {@link BufferUsage}.
     * @param {IndexDatatype} indexDatatype The datatype of indices in the buffer.
     * @returns {IndexBuffer} The index buffer, ready to be attached to a vertex array.
     *
     * @exception {DeveloperError} IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.    Check context.elementIndexUint.
     * @exception {DeveloperError} The size in bytes must be greater than zero.
     * @exception {DeveloperError} Invalid <code>usage</code>.
     * @exception {DeveloperError} Invalid <code>indexDatatype</code>.
     *
     * @see Context#createVertexArray
     * @see Context#createVertexBuffer
     * @see Context#draw
     * @see VertexArray
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGenBuffer.xml|glGenBuffer}
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBindBuffer.xml|glBindBuffer} with <code>ELEMENT_ARRAY_BUFFER</code>
     * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glBufferData.xml|glBufferData} with <code>ELEMENT_ARRAY_BUFFER</code>
     *
     * @example
     * // Example 1. Create a stream index buffer of unsigned shorts that is
     * // 16 bytes in size.
     * var buffer = context.createIndexBuffer(16, BufferUsage.STREAM_DRAW,
     *     IndexDatatype.UNSIGNED_SHORT);
     *
     * @example
     * // Example 2. Create a static index buffer containing three unsigned shorts.
     * var buffer = context.createIndexBuffer(new Uint16Array([0, 1, 2]),
     *     BufferUsage.STATIC_DRAW, IndexDatatype.UNSIGNED_SHORT)
     */
    Context.prototype.createIndexBuffer = function(typedArrayOrSizeInBytes, usage, indexDatatype) {
        //>>includeStart('debug', pragmas.debug);
        if (!IndexDatatype.validate(indexDatatype)) {
            throw new DeveloperError('Invalid indexDatatype.');
        }
        //>>includeEnd('debug');

        if ((indexDatatype === IndexDatatype.UNSIGNED_INT) && !this.elementIndexUint) {
            throw new DeveloperError('IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.  Check context.elementIndexUint.');
        }

        var bytesPerIndex = IndexDatatype.getSizeInBytes(indexDatatype);

        var gl = this._gl;
        var buffer = createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, typedArrayOrSizeInBytes, usage);
        var numberOfIndices = buffer.sizeInBytes / bytesPerIndex;

        defineProperties(buffer, {
            indexDatatype: {
                get : function() {
                    return indexDatatype;
                }
            },
            bytesPerIndex : {
                get : function() {
                    return bytesPerIndex;
                }
            },
            numberOfIndices : {
                get : function() {
                    return numberOfIndices;
                }
            }
        });

        return buffer;
    };

    /**
     * Creates a vertex array, which defines the attributes making up a vertex, and contains an optional index buffer
     * to select vertices for rendering.  Attributes are defined using object literals as shown in Example 1 below.
     *
     * @param {Object[]} [attributes] An optional array of attributes.
     * @param {IndexBuffer} [indexBuffer] An optional index buffer.
     *
     * @returns {VertexArray} The vertex array, ready for use with drawing.
     *
     * @exception {DeveloperError} Attribute must have a <code>vertexBuffer</code>.
     * @exception {DeveloperError} Attribute must have a <code>componentsPerAttribute</code>.
     * @exception {DeveloperError} Attribute must have a valid <code>componentDatatype</code> or not specify it.
     * @exception {DeveloperError} Attribute must have a <code>strideInBytes</code> less than or equal to 255 or not specify it.
     * @exception {DeveloperError} Index n is used by more than one attribute.
     *
     * @see Context#createVertexArrayFromGeometry
     * @see Context#createVertexBuffer
     * @see Context#createIndexBuffer
     * @see Context#draw
     *
     * @example
     * // Example 1. Create a vertex array with vertices made up of three floating point
     * // values, e.g., a position, from a single vertex buffer.  No index buffer is used.
     * var positionBuffer = context.createVertexBuffer(12, BufferUsage.STATIC_DRAW);
     * var attributes = [
     *     {
     *         index                  : 0,
     *         enabled                : true,
     *         vertexBuffer           : positionBuffer,
     *         componentsPerAttribute : 3,
     *         componentDatatype      : ComponentDatatype.FLOAT,
     *         normalize              : false,
     *         offsetInBytes          : 0,
     *         strideInBytes          : 0 // tightly packed
     *     }
     * ];
     * var va = context.createVertexArray(attributes);
     *
     * @example
     * // Example 2. Create a vertex array with vertices from two different vertex buffers.
     * // Each vertex has a three-component position and three-component normal.
     * var positionBuffer = context.createVertexBuffer(12, BufferUsage.STATIC_DRAW);
     * var normalBuffer = context.createVertexBuffer(12, BufferUsage.STATIC_DRAW);
     * var attributes = [
     *     {
     *         index                  : 0,
     *         vertexBuffer           : positionBuffer,
     *         componentsPerAttribute : 3,
     *         componentDatatype      : ComponentDatatype.FLOAT
     *     },
     *     {
     *         index                  : 1,
     *         vertexBuffer           : normalBuffer,
     *         componentsPerAttribute : 3,
     *         componentDatatype      : ComponentDatatype.FLOAT
     *     }
     * ];
     * var va = context.createVertexArray(attributes);
     *
     * @example
     * // Example 3. Creates the same vertex layout as Example 2 using a single
     * // vertex buffer, instead of two.
     * var buffer = context.createVertexBuffer(24, BufferUsage.STATIC_DRAW);
     * var attributes = [
     *     {
     *         vertexBuffer           : buffer,
     *         componentsPerAttribute : 3,
     *         componentDatatype      : ComponentDatatype.FLOAT,
     *         offsetInBytes          : 0,
     *         strideInBytes          : 24
     *     },
     *     {
     *         vertexBuffer           : buffer,
     *         componentsPerAttribute : 3,
     *         componentDatatype      : ComponentDatatype.FLOAT,
     *         normalize              : true,
     *         offsetInBytes          : 12,
     *         strideInBytes          : 24
     *     }
     * ];
     * var va = context.createVertexArray(attributes);
     */
    Context.prototype.createVertexArray = function(attributes, indexBuffer) {
        return new VertexArray(this._gl, this._vertexArrayObject, attributes, indexBuffer);
    };

    /**
     * options.source can be {@link ImageData}, {@link Image}, {@link Canvas}, or {@link Video}.
     *
     * @exception {RuntimeError} When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, this WebGL implementation must support WEBGL_depth_texture.  Check context.depthTexture.
     * @exception {RuntimeError} When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.
     * @exception {DeveloperError} options requires a source field to create an initialized texture or width and height fields to create a blank texture.
     * @exception {DeveloperError} Width must be greater than zero.
     * @exception {DeveloperError} Width must be less than or equal to the maximum texture size.
     * @exception {DeveloperError} Height must be greater than zero.
     * @exception {DeveloperError} Height must be less than or equal to the maximum texture size.
     * @exception {DeveloperError} Invalid options.pixelFormat.
     * @exception {DeveloperError} Invalid options.pixelDatatype.
     * @exception {DeveloperError} When options.pixelFormat is DEPTH_COMPONENT, options.pixelDatatype must be UNSIGNED_SHORT or UNSIGNED_INT.
     * @exception {DeveloperError} When options.pixelFormat is DEPTH_STENCIL, options.pixelDatatype must be UNSIGNED_INT_24_8_WEBGL.
     * @exception {DeveloperError} When options.pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, source cannot be provided.
     *
     * @see Context#createTexture2DFromFramebuffer
     * @see Context#createCubeMap
     * @see Context#createSampler
     */
    Context.prototype.createTexture2D = function(options) {
        return new Texture(this, options);
    };

    /**
     * Creates a texture, and copies a subimage of the framebuffer to it.  When called without arguments,
     * the texture is the same width and height as the framebuffer and contains its contents.
     *
     * @param {PixelFormat} [pixelFormat=PixelFormat.RGB] The texture's internal pixel format.
     * @param {Number} [framebufferXOffset=0] An offset in the x direction in the framebuffer where copying begins from.
     * @param {Number} [framebufferYOffset=0] An offset in the y direction in the framebuffer where copying begins from.
     * @param {Number} [width=canvas.clientWidth] The width of the texture in texels.
     * @param {Number} [height=canvas.clientHeight] The height of the texture in texels.
     * @param {Framebuffer} [framebuffer=defaultFramebuffer] The framebuffer from which to create the texture.  If this
     *        parameter is not specified, the default framebuffer is used.
     * @returns {Texture} A texture with contents from the framebuffer.
     *
     * @exception {DeveloperError} Invalid pixelFormat.
     * @exception {DeveloperError} pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} framebufferXOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferYOffset must be greater than or equal to zero.
     * @exception {DeveloperError} framebufferXOffset + width must be less than or equal to canvas.clientWidth.
     * @exception {DeveloperError} framebufferYOffset + height must be less than or equal to canvas.clientHeight.
     *
     * @see Context#createTexture2D
     * @see Context#createCubeMap
     * @see Context#createSampler
     *
     * @example
     * // Create a texture with the contents of the framebuffer.
     * var t = context.createTexture2DFromFramebuffer();
     */
    Context.prototype.createTexture2DFromFramebuffer = function(pixelFormat, framebufferXOffset, framebufferYOffset, width, height, framebuffer) {
        var gl = this._gl;

        pixelFormat = defaultValue(pixelFormat, PixelFormat.RGB);
        framebufferXOffset = defaultValue(framebufferXOffset, 0);
        framebufferYOffset = defaultValue(framebufferYOffset, 0);
        width = defaultValue(width, gl.drawingBufferWidth);
        height = defaultValue(height, gl.drawingBufferHeight);

        //>>includeStart('debug', pragmas.debug);
        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid pixelFormat.');
        }

        if (PixelFormat.isDepthFormat(pixelFormat)) {
            throw new DeveloperError('pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.');
        }

        if (framebufferXOffset < 0) {
            throw new DeveloperError('framebufferXOffset must be greater than or equal to zero.');
        }

        if (framebufferYOffset < 0) {
            throw new DeveloperError('framebufferYOffset must be greater than or equal to zero.');
        }

        if (framebufferXOffset + width > gl.drawingBufferWidth) {
            throw new DeveloperError('framebufferXOffset + width must be less than or equal to drawingBufferWidth');
        }

        if (framebufferYOffset + height > gl.drawingBufferHeight) {
            throw new DeveloperError('framebufferYOffset + height must be less than or equal to drawingBufferHeight.');
        }
        //>>includeEnd('debug');

        var texture = new Texture(this, {
            width : width,
            height : height,
            pixelFormat : pixelFormat,
            source : {
                framebuffer : defined(framebuffer) ? framebuffer : this.defaultFramebuffer,
                xOffset : framebufferXOffset,
                yOffset : framebufferYOffset,
                width : width,
                height : height
            }
        });

        return texture;
    };

    /**
     * options.source can be {@link ImageData}, {@link Image}, {@link Canvas}, or {@link Video}.
     *
     * @returns {CubeMap} The newly created cube map.
     *
     * @exception {RuntimeError} When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.  Check context.floatingPointTexture.
     * @exception {DeveloperError} options.source requires positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ faces.
     * @exception {DeveloperError} Each face in options.sources must have the same width and height.
     * @exception {DeveloperError} options requires a source field to create an initialized cube map or width and height fields to create a blank cube map.
     * @exception {DeveloperError} Width must equal height.
     * @exception {DeveloperError} Width and height must be greater than zero.
     * @exception {DeveloperError} Width and height must be less than or equal to the maximum cube map size.
     * @exception {DeveloperError} Invalid options.pixelFormat.
     * @exception {DeveloperError} options.pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.
     * @exception {DeveloperError} Invalid options.pixelDatatype.
     *
     * @see Context#createTexture2D
     * @see Context#createTexture2DFromFramebuffer
     * @see Context#createSampler
     */
    Context.prototype.createCubeMap = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var source = options.source;
        var width;
        var height;

        if (defined(source)) {
            var faces = [source.positiveX, source.negativeX, source.positiveY, source.negativeY, source.positiveZ, source.negativeZ];

            //>>includeStart('debug', pragmas.debug);
            if (!faces[0] || !faces[1] || !faces[2] || !faces[3] || !faces[4] || !faces[5]) {
                throw new DeveloperError('options.source requires positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ faces.');
            }
            //>>includeEnd('debug');

            width = faces[0].width;
            height = faces[0].height;

            //>>includeStart('debug', pragmas.debug);
            for ( var i = 1; i < 6; ++i) {
                if ((Number(faces[i].width) !== width) || (Number(faces[i].height) !== height)) {
                    throw new DeveloperError('Each face in options.source must have the same width and height.');
                }
            }
            //>>includeEnd('debug');
        } else {
            width = options.width;
            height = options.height;
        }

        var size = width;
        var pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        var pixelDatatype = defaultValue(options.pixelDatatype, PixelDatatype.UNSIGNED_BYTE);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(width) || !defined(height)) {
            throw new DeveloperError('options requires a source field to create an initialized cube map or width and height fields to create a blank cube map.');
        }

        if (width !== height) {
            throw new DeveloperError('Width must equal height.');
        }

        if (size <= 0) {
            throw new DeveloperError('Width and height must be greater than zero.');
        }

        if (size > this._maximumCubeMapSize) {
            throw new DeveloperError('Width and height must be less than or equal to the maximum cube map size (' + this._maximumCubeMapSize + ').  Check maximumCubeMapSize.');
        }

        if (!PixelFormat.validate(pixelFormat)) {
            throw new DeveloperError('Invalid options.pixelFormat.');
        }

        if (PixelFormat.isDepthFormat(pixelFormat)) {
            throw new DeveloperError('options.pixelFormat cannot be DEPTH_COMPONENT or DEPTH_STENCIL.');
        }

        if (!PixelDatatype.validate(pixelDatatype)) {
            throw new DeveloperError('Invalid options.pixelDatatype.');
        }
        //>>includeEnd('debug');

        if ((pixelDatatype === PixelDatatype.FLOAT) && !this.floatingPointTexture) {
            throw new DeveloperError('When options.pixelDatatype is FLOAT, this WebGL implementation must support the OES_texture_float extension.');
        }

        // Use premultiplied alpha for opaque textures should perform better on Chrome:
        // http://media.tojicode.com/webglCamp4/#20
        var preMultiplyAlpha = options.preMultiplyAlpha || ((pixelFormat === PixelFormat.RGB) || (pixelFormat === PixelFormat.LUMINANCE));
        var flipY = defaultValue(options.flipY, true);

        var gl = this._gl;
        var textureTarget = gl.TEXTURE_CUBE_MAP;
        var texture = gl.createTexture();

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(textureTarget, texture);

        function createFace(target, sourceFace) {
            if (sourceFace.arrayBufferView) {
                gl.texImage2D(target, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, sourceFace.arrayBufferView);
            } else {
                gl.texImage2D(target, 0, pixelFormat, pixelFormat, pixelDatatype, sourceFace);
            }
        }

        if (defined(source)) {
            // TODO: _gl.pixelStorei(_gl._UNPACK_ALIGNMENT, 4);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, preMultiplyAlpha);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);

            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_X, source.positiveX);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, source.negativeX);
            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, source.positiveY);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, source.negativeY);
            createFace(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, source.positiveZ);
            createFace(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, source.negativeZ);
        } else {
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
            gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, pixelFormat, size, size, 0, pixelFormat, pixelDatatype, null);
        }
        gl.bindTexture(textureTarget, null);

        return new CubeMap(gl, this._textureFilterAnisotropic, textureTarget, texture, pixelFormat, pixelDatatype, size, preMultiplyAlpha, flipY);
    };

    /**
     * Creates a framebuffer with optional initial color, depth, and stencil attachments.
     * Framebuffers are used for render-to-texture effects; they allow us to render to
     * textures in one pass, and read from it in a later pass.
     *
     * @param {Object} [options] The initial framebuffer attachments as shown in the examplebelow.  The possible properties are <code>colorTextures</code>, <code>colorRenderbuffers</code>, <code>depthTexture</code>, <code>depthRenderbuffer</code>, <code>stencilRenderbuffer</code>, <code>depthStencilTexture</code>, and <code>depthStencilRenderbuffer</code>.
     * @returns {Framebuffer} The created framebuffer.
     *
     * @exception {DeveloperError} Cannot have both color texture and color renderbuffer attachments.
     * @exception {DeveloperError} Cannot have both a depth texture and depth renderbuffer attachment.
     * @exception {DeveloperError} Cannot have both a depth-stencil texture and depth-stencil renderbuffer attachment.
     * @exception {DeveloperError} Cannot have both a depth and depth-stencil renderbuffer.
     * @exception {DeveloperError} Cannot have both a stencil and depth-stencil renderbuffer.
     * @exception {DeveloperError} Cannot have both a depth and stencil renderbuffer.
     * @exception {DeveloperError} The color-texture pixel-format must be a color format.
     * @exception {DeveloperError} The depth-texture pixel-format must be DEPTH_COMPONENT.
     * @exception {DeveloperError} The depth-stencil-texture pixel-format must be DEPTH_STENCIL.
     * @exception {DeveloperError} The number of color attachments exceeds the number supported.
     *
     * @see Context#createTexture2D
     * @see Context#createCubeMap
     * @see Context#createRenderbuffer
     *
     * @example
     * // Create a framebuffer with color and depth texture attachments.
     * var width = context.canvas.clientWidth;
     * var height = context.canvas.clientHeight;
     * var framebuffer = context.createFramebuffer({
     *   colorTextures : [context.createTexture2D({
     *     width : width,
     *     height : height,
     *     pixelFormat : PixelFormat.RGBA
     *   })],
     *   depthTexture : context.createTexture2D({
     *     width : width,
     *     height : height,
     *     pixelFormat : PixelFormat.DEPTH_COMPONENT,
     *     pixelDatatype : PixelDatatype.UNSIGNED_SHORT
     *   })
     * });
     */
    Context.prototype.createFramebuffer = function(options) {
        return new Framebuffer(this._gl, this._maximumColorAttachments, options);
    };

    Context.prototype.createRenderbuffer = function(options) {
        var gl = this._gl;

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var format = defaultValue(options.format, RenderbufferFormat.RGBA4);
        var width = defined(options.width) ? options.width : gl.drawingBufferWidth;
        var height = defined(options.height) ? options.height : gl.drawingBufferHeight;

        //>>includeStart('debug', pragmas.debug);
        if (!RenderbufferFormat.validate(format)) {
            throw new DeveloperError('Invalid format.');
        }

        if (width <= 0) {
            throw new DeveloperError('Width must be greater than zero.');
        }

        if (width > this.maximumRenderbufferSize) {
            throw new DeveloperError('Width must be less than or equal to the maximum renderbuffer size (' + this.maximumRenderbufferSize + ').  Check maximumRenderbufferSize.');
        }

        if (height <= 0) {
            throw new DeveloperError('Height must be greater than zero.');
        }

        if (height > this.maximumRenderbufferSize) {
            throw new DeveloperError('Height must be less than or equal to the maximum renderbuffer size (' + this.maximumRenderbufferSize + ').  Check maximumRenderbufferSize.');
        }
        //>>includeEnd('debug');

        return new Renderbuffer(gl, format, width, height);
    };

    var nextRenderStateId = 0;
    var renderStateCache = {};

    /**
     * Validates and then finds or creates an immutable render state, which defines the pipeline
     * state for a {@link DrawCommand} or {@link ClearCommand}.  All inputs states are optional.  Omitted states
     * use the defaults shown in the example below.
     *
     * @param {Object} [renderState] The states defining the render state as shown in the example below.
     *
     * @exception {RuntimeError} renderState.lineWidth is out of range.
     * @exception {DeveloperError} Invalid renderState.frontFace.
     * @exception {DeveloperError} Invalid renderState.cull.face.
     * @exception {DeveloperError} scissorTest.rectangle.width and scissorTest.rectangle.height must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.depthRange.near can't be greater than renderState.depthRange.far.
     * @exception {DeveloperError} renderState.depthRange.near must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.depthRange.far must be less than or equal to zero.
     * @exception {DeveloperError} Invalid renderState.depthTest.func.
     * @exception {DeveloperError} renderState.blending.color components must be greater than or equal to zero and less than or equal to one
     * @exception {DeveloperError} Invalid renderState.blending.equationRgb.
     * @exception {DeveloperError} Invalid renderState.blending.equationAlpha.
     * @exception {DeveloperError} Invalid renderState.blending.functionSourceRgb.
     * @exception {DeveloperError} Invalid renderState.blending.functionSourceAlpha.
     * @exception {DeveloperError} Invalid renderState.blending.functionDestinationRgb.
     * @exception {DeveloperError} Invalid renderState.blending.functionDestinationAlpha.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontFunction.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backFunction.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.fail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.zFail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.frontOperation.zPass.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.fail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.zFail.
     * @exception {DeveloperError} Invalid renderState.stencilTest.backOperation.zPass.
     * @exception {DeveloperError} renderState.viewport.width must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.viewport.width must be less than or equal to the maximum viewport width.
     * @exception {DeveloperError} renderState.viewport.height must be greater than or equal to zero.
     * @exception {DeveloperError} renderState.viewport.height must be less than or equal to the maximum viewport height.
     *
     * @see DrawCommand
     * @see ClearCommand
     *
     * @example
     * var defaults = {
     *     frontFace : WindingOrder.COUNTER_CLOCKWISE,
     *     cull : {
     *         enabled : false,
     *         face : CullFace.BACK
     *     },
     *     lineWidth : 1,
     *     polygonOffset : {
     *         enabled : false,
     *         factor : 0,
     *         units : 0
     *     },
     *     scissorTest : {
     *         enabled : false,
     *         rectangle : {
     *             x : 0,
     *             y : 0,
     *             width : 0,
     *             height : 0
     *         }
     *     },
     *     depthRange : {
     *         near : 0,
     *         far : 1
     *     },
     *     depthTest : {
     *         enabled : false,
     *         func : DepthFunction.LESS
     *      },
     *     colorMask : {
     *         red : true,
     *         green : true,
     *         blue : true,
     *         alpha : true
     *     },
     *     depthMask : true,
     *     stencilMask : ~0,
     *     blending : {
     *         enabled : false,
     *         color : {
     *             red : 0.0,
     *             green : 0.0,
     *             blue : 0.0,
     *             alpha : 0.0
     *         },
     *         equationRgb : BlendEquation.ADD,
     *         equationAlpha : BlendEquation.ADD,
     *         functionSourceRgb : BlendFunction.ONE,
     *         functionSourceAlpha : BlendFunction.ONE,
     *         functionDestinationRgb : BlendFunction.ZERO,
     *         functionDestinationAlpha : BlendFunction.ZERO
     *     },
     *     stencilTest : {
     *         enabled : false,
     *         frontFunction : StencilFunction.ALWAYS,
     *         backFunction : StencilFunction.ALWAYS,
     *         reference : 0,
     *         mask : ~0,
     *         frontOperation : {
     *             fail : StencilOperation.KEEP,
     *             zFail : StencilOperation.KEEP,
     *             zPass : StencilOperation.KEEP
     *         },
     *         backOperation : {
     *             fail : StencilOperation.KEEP,
     *             zFail : StencilOperation.KEEP,
     *             zPass : StencilOperation.KEEP
     *         }
     *     },
     *     sampleCoverage : {
     *         enabled : false,
     *         value : 1.0,
     *         invert : false
     *      }
     * };
     *
     * // Same as just context.createRenderState().
     * var rs = context.createRenderState(defaults);
     */
    Context.prototype.createRenderState = function(renderState) {
        var partialKey = JSON.stringify(renderState);
        var cachedState = renderStateCache[partialKey];
        if (defined(cachedState)) {
            return cachedState;
        }

        // Cache miss.  Fully define render state and try again.
        var states = new RenderState(this, renderState);
        var fullKey = JSON.stringify(states);
        cachedState = renderStateCache[fullKey];
        if (!defined(cachedState)) {
            states.id = nextRenderStateId++;

            cachedState = states;

            // Cache full render state.  Multiple partially defined render states may map to this.
            renderStateCache[fullKey] = cachedState;
        }

        // Cache partial render state so we can skip validation on a cache hit for a partially defined render state
        renderStateCache[partialKey] = cachedState;

        return cachedState;
    };

    Context.prototype.createSampler = function(sampler) {
        var s = {
            wrapS : defaultValue(sampler.wrapS, TextureWrap.CLAMP_TO_EDGE),
            wrapT : defaultValue(sampler.wrapT, TextureWrap.CLAMP_TO_EDGE),
            minificationFilter : defaultValue(sampler.minificationFilter, TextureMinificationFilter.LINEAR),
            magnificationFilter : defaultValue(sampler.magnificationFilter, TextureMagnificationFilter.LINEAR),
            maximumAnisotropy : (defined(sampler.maximumAnisotropy)) ? sampler.maximumAnisotropy : 1.0
        };

        //>>includeStart('debug', pragmas.debug);
        if (!TextureWrap.validate(s.wrapS)) {
            throw new DeveloperError('Invalid sampler.wrapS.');
        }

        if (!TextureWrap.validate(s.wrapT)) {
            throw new DeveloperError('Invalid sampler.wrapT.');
        }

        if (!TextureMinificationFilter.validate(s.minificationFilter)) {
            throw new DeveloperError('Invalid sampler.minificationFilter.');
        }

        if (!TextureMagnificationFilter.validate(s.magnificationFilter)) {
            throw new DeveloperError('Invalid sampler.magnificationFilter.');
        }

        if (s.maximumAnisotropy < 1.0) {
            throw new DeveloperError('sampler.maximumAnisotropy must be greater than or equal to one.');
        }
        //>>includeEnd('debug');

        return s;
    };

    function validateFramebuffer(context, framebuffer) {
        if (context.validateFramebuffer) {
            var gl = context._gl;
            var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                var message;

                switch (status) {
                case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
                    message = 'Framebuffer is not complete.  Incomplete attachment: at least one attachment point with a renderbuffer or texture attached has its attached object no longer in existence or has an attached image with a width or height of zero, or the color attachment point has a non-color-renderable image attached, or the depth attachment point has a non-depth-renderable image attached, or the stencil attachment point has a non-stencil-renderable image attached.  Color-renderable formats include GL_RGBA4, GL_RGB5_A1, and GL_RGB565. GL_DEPTH_COMPONENT16 is the only depth-renderable format. GL_STENCIL_INDEX8 is the only stencil-renderable format.';
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
                    message = 'Framebuffer is not complete.  Incomplete dimensions: not all attached images have the same width and height.';
                    break;
                case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
                    message = 'Framebuffer is not complete.  Missing attachment: no images are attached to the framebuffer.';
                    break;
                case gl.FRAMEBUFFER_UNSUPPORTED:
                    message = 'Framebuffer is not complete.  Unsupported: the combination of internal formats of the attached images violates an implementation-dependent set of restrictions.';
                    break;
                }

                throw new DeveloperError(message);
            }
        }
    }

    function applyRenderState(context, renderState, passState) {
        var previousState = context._currentRenderState;
        if (previousState !== renderState) {
            context._currentRenderState = renderState;
            RenderState.partialApply(context._gl, previousState, renderState, passState);
         }
         // else same render state as before so state is already applied.
    }

    var scratchBackBufferArray;
    // this check must use typeof, not defined, because defined doesn't work with undeclared variables.
    if (typeof WebGLRenderingContext !== 'undefined') {
        scratchBackBufferArray = [WebGLRenderingContext.BACK];
    }

    function bindFramebuffer(context, framebuffer) {
        if (framebuffer !== context._currentFramebuffer) {
            context._currentFramebuffer = framebuffer;
            var buffers = scratchBackBufferArray;

            if (defined(framebuffer)) {
                framebuffer._bind();
                validateFramebuffer(context, framebuffer);

                // TODO: Need a way for a command to give what draw buffers are active.
                buffers = framebuffer._getActiveColorAttachments();
            } else {
                var gl = context._gl;
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }

            if (context.drawBuffers) {
                context._drawBuffers.drawBuffersWEBGL(buffers);
            }
        }
    }

    var defaultClearCommand = new ClearCommand();

    Context.prototype.clear = function(clearCommand, passState) {
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
        applyRenderState(this, rs, passState);

        // The command's framebuffer takes presidence over the pass' framebuffer, e.g., for off-screen rendering.
        var framebuffer = defaultValue(clearCommand.framebuffer, passState.framebuffer);
        bindFramebuffer(this, framebuffer);

        gl.clear(bitmask);
    };

    function beginDraw(context, framebuffer, drawCommand, passState, renderState, shaderProgram) {
        var rs = defaultValue(defaultValue(renderState, drawCommand.renderState), context._defaultRenderState);

        //>>includeStart('debug', pragmas.debug);
        if (defined(framebuffer) && rs.depthTest) {
            if (rs.depthTest.enabled && !framebuffer.hasDepthAttachment) {
                throw new DeveloperError('The depth test can not be enabled (drawCommand.renderState.depthTest.enabled) because the framebuffer (drawCommand.framebuffer) does not have a depth or depth-stencil renderbuffer.');
            }
        }
        //>>includeEnd('debug');

        bindFramebuffer(context, framebuffer);

        applyRenderState(context, rs, passState);

        var sp = defaultValue(shaderProgram, drawCommand.shaderProgram);
        sp._bind();
        context._maxFrameTextureUnitIndex = Math.max(context._maxFrameTextureUnitIndex, sp.maximumTextureUnitIndex);
    }

    function continueDraw(context, drawCommand, shaderProgram) {
        var primitiveType = drawCommand.primitiveType;
        var va = drawCommand.vertexArray;
        var offset = drawCommand.offset;
        var count = drawCommand.count;

        //>>includeStart('debug', pragmas.debug);
        if (!PrimitiveType.validate(primitiveType)) {
            throw new DeveloperError('drawCommand.primitiveType is required and must be valid.');
        }

        if (!defined(va)) {
            throw new DeveloperError('drawCommand.vertexArray is required.');
        }

        if (offset < 0) {
            throw new DeveloperError('drawCommand.offset must be omitted or greater than or equal to zero.');
        }

        if (count < 0) {
            throw new DeveloperError('drawCommand.count must be omitted or greater than or equal to zero.');
        }
        //>>includeEnd('debug');

        context._us.model = defaultValue(drawCommand.modelMatrix, Matrix4.IDENTITY);
        var sp = defaultValue(shaderProgram, drawCommand.shaderProgram);
        sp._setUniforms(drawCommand.uniformMap, context._us, context.validateShaderProgram);

        va._bind();
        var indexBuffer = va.indexBuffer;

        if (defined(indexBuffer)) {
            offset = offset * indexBuffer.bytesPerIndex; // offset in vertices to offset in bytes
            count = defaultValue(count, indexBuffer.numberOfIndices);
            context._gl.drawElements(primitiveType, count, indexBuffer.indexDatatype, offset);
        } else {
            count = defaultValue(count, va.numberOfVertices);
            context._gl.drawArrays(primitiveType, offset, count);
        }

        va._unBind();
    }

    Context.prototype.draw = function(drawCommand, passState, renderState, shaderProgram) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(drawCommand)) {
            throw new DeveloperError('drawCommand is required.');
        }

        if (!defined(drawCommand.shaderProgram)) {
            throw new DeveloperError('drawCommand.shaderProgram is required.');
        }
        //>>includeEnd('debug');

        passState = defaultValue(passState, this._defaultPassState);
        // The command's framebuffer takes presidence over the pass' framebuffer, e.g., for off-screen rendering.
        var framebuffer = defaultValue(drawCommand.framebuffer, passState.framebuffer);

        beginDraw(this, framebuffer, drawCommand, passState, renderState, shaderProgram);
        continueDraw(this, drawCommand, shaderProgram);
    };

    Context.prototype.endFrame = function() {
        var gl = this._gl;
        gl.useProgram(null);

        this._currentFramebuffer = undefined;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        var buffers = scratchBackBufferArray;
        if (this.drawBuffers) {
            this._drawBuffers.drawBuffersWEBGL(scratchBackBufferArray);
        }

        var length = this._maxFrameTextureUnitIndex;
        this._maxFrameTextureUnitIndex = 0;

        for (var i = 0; i < length; ++i) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
        }
    };

    Context.prototype.readPixels = function(readState) {
        var gl = this._gl;

        readState = readState || {};
        var x = Math.max(readState.x || 0, 0);
        var y = Math.max(readState.y || 0, 0);
        var width = readState.width || gl.drawingBufferWidth;
        var height = readState.height || gl.drawingBufferHeight;
        var framebuffer = readState.framebuffer;

        //>>includeStart('debug', pragmas.debug);
        if (width <= 0) {
            throw new DeveloperError('readState.width must be greater than zero.');
        }

        if (height <= 0) {
            throw new DeveloperError('readState.height must be greater than zero.');
        }
        //>>includeEnd('debug');

        var pixels = new Uint8Array(4 * width * height);

        bindFramebuffer(this, framebuffer);

        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        return pixels;
    };

    //////////////////////////////////////////////////////////////////////////////////////////

    function computeNumberOfVertices(attribute) {
        return attribute.values.length / attribute.componentsPerAttribute;
    }

    function computeAttributeSizeInBytes(attribute) {
        return ComponentDatatype.getSizeInBytes(attribute.componentDatatype) * attribute.componentsPerAttribute;
    }

    function interleaveAttributes(attributes) {
        var j;
        var name;
        var attribute;

        // Extract attribute names.
        var names = [];
        for (name in attributes) {
            // Attribute needs to have per-vertex values; not a constant value for all vertices.
            if (attributes.hasOwnProperty(name) &&
                    defined(attributes[name]) &&
                    defined(attributes[name].values)) {
                names.push(name);

                if (attributes[name].componentDatatype === ComponentDatatype.DOUBLE) {
                    attributes[name].componentDatatype = ComponentDatatype.FLOAT;
                    attributes[name].values = ComponentDatatype.createTypedArray(ComponentDatatype.FLOAT, attributes[name].values);
                }
            }
        }

        // Validation.  Compute number of vertices.
        var numberOfVertices;
        var namesLength = names.length;

        if (namesLength > 0) {
            numberOfVertices = computeNumberOfVertices(attributes[names[0]]);

            for (j = 1; j < namesLength; ++j) {
                var currentNumberOfVertices = computeNumberOfVertices(attributes[names[j]]);

                if (currentNumberOfVertices !== numberOfVertices) {
                    throw new RuntimeError(
                        'Each attribute list must have the same number of vertices.  ' +
                        'Attribute ' + names[j] + ' has a different number of vertices ' +
                        '(' + currentNumberOfVertices.toString() + ')' +
                        ' than attribute ' + names[0] +
                        ' (' + numberOfVertices.toString() + ').');
                }
            }
        }

        // Sort attributes by the size of their components.  From left to right, a vertex stores floats, shorts, and then bytes.
        names.sort(function(left, right) {
            return ComponentDatatype.getSizeInBytes(attributes[right].componentDatatype) - ComponentDatatype.getSizeInBytes(attributes[left].componentDatatype);
        });

        // Compute sizes and strides.
        var vertexSizeInBytes = 0;
        var offsetsInBytes = {};

        for (j = 0; j < namesLength; ++j) {
            name = names[j];
            attribute = attributes[name];

            offsetsInBytes[name] = vertexSizeInBytes;
            vertexSizeInBytes += computeAttributeSizeInBytes(attribute);
        }

        if (vertexSizeInBytes > 0) {
            // Pad each vertex to be a multiple of the largest component datatype so each
            // attribute can be addressed using typed arrays.
            var maxComponentSizeInBytes = ComponentDatatype.getSizeInBytes(attributes[names[0]].componentDatatype); // Sorted large to small
            var remainder = vertexSizeInBytes % maxComponentSizeInBytes;
            if (remainder !== 0) {
                vertexSizeInBytes += (maxComponentSizeInBytes - remainder);
            }

            // Total vertex buffer size in bytes, including per-vertex padding.
            var vertexBufferSizeInBytes = numberOfVertices * vertexSizeInBytes;

            // Create array for interleaved vertices.  Each attribute has a different view (pointer) into the array.
            var buffer = new ArrayBuffer(vertexBufferSizeInBytes);
            var views = {};

            for (j = 0; j < namesLength; ++j) {
                name = names[j];
                var sizeInBytes = ComponentDatatype.getSizeInBytes(attributes[name].componentDatatype);

                views[name] = {
                    pointer : ComponentDatatype.createTypedArray(attributes[name].componentDatatype, buffer),
                    index : offsetsInBytes[name] / sizeInBytes, // Offset in ComponentType
                    strideInComponentType : vertexSizeInBytes / sizeInBytes
                };
            }

            // Copy attributes into one interleaved array.
            // PERFORMANCE_IDEA:  Can we optimize these loops?
            for (j = 0; j < numberOfVertices; ++j) {
                for ( var n = 0; n < namesLength; ++n) {
                    name = names[n];
                    attribute = attributes[name];
                    var values = attribute.values;
                    var view = views[name];
                    var pointer = view.pointer;

                    var numberOfComponents = attribute.componentsPerAttribute;
                    for ( var k = 0; k < numberOfComponents; ++k) {
                        pointer[view.index + k] = values[(j * numberOfComponents) + k];
                    }

                    view.index += view.strideInComponentType;
                }
            }

            return {
                buffer : buffer,
                offsetsInBytes : offsetsInBytes,
                vertexSizeInBytes : vertexSizeInBytes
            };
        }

        // No attributes to interleave.
        return undefined;
    }

    /**
     * Creates a vertex array from a geometry.  A geometry contains vertex attributes and optional index data
     * in system memory, whereas a vertex array contains vertex buffers and an optional index buffer in WebGL
     * memory for use with rendering.
     * <br /><br />
     * The <code>geometry</code> argument should use the standard layout like the geometry returned by {@link BoxGeometry}.
     * <br /><br />
     * <code>options</code> can have four properties:
     * <ul>
     *   <li><code>geometry</code>:  The source geometry containing data used to create the vertex array.</li>
     *   <li><code>attributeLocations</code>:  An object that maps geometry attribute names to vertex shader attribute locations.</li>
     *   <li><code>bufferUsage</code>:  The expected usage pattern of the vertex array's buffers.  On some WebGL implementations, this can significantly affect performance.  See {@link BufferUsage}.  Default: <code>BufferUsage.DYNAMIC_DRAW</code>.</li>
     *   <li><code>interleave</code>:  Determines if all attributes are interleaved in a single vertex buffer or if each attribute is stored in a separate vertex buffer.  Default: <code>false</code>.</li>
     * </ul>
     * <br />
     * If <code>options</code> is not specified or the <code>geometry</code> contains no data, the returned vertex array is empty.
     *
     * @param {Object} [options] An object defining the geometry, attribute indices, buffer usage, and vertex layout used to create the vertex array.
     *
     * @exception {RuntimeError} Each attribute list must have the same number of vertices.
     * @exception {DeveloperError} The geometry must have zero or one index lists.
     * @exception {DeveloperError} Index n is used by more than one attribute.
     *
     * @see Context#createVertexArray
     * @see Context#createVertexBuffer
     * @see Context#createIndexBuffer
     * @see GeometryPipeline.createAttributeLocations
     * @see ShaderProgram
     *
     * @example
     * // Example 1. Creates a vertex array for rendering a box.  The default dynamic draw
     * // usage is used for the created vertex and index buffer.  The attributes are not
     * // interleaved by default.
     * var geometry = new BoxGeometry();
     * var va = context.createVertexArrayFromGeometry({
     *     geometry           : geometry,
     *     attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
     * });
     *
     * @example
     * // Example 2. Creates a vertex array with interleaved attributes in a
     * // single vertex buffer.  The vertex and index buffer have static draw usage.
     * var va = context.createVertexArrayFromGeometry({
     *     geometry           : geometry,
     *     attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
     *     bufferUsage        : BufferUsage.STATIC_DRAW,
     *     interleave         : true
     * });
     *
     * @example
     * // Example 3.  When the caller destroys the vertex array, it also destroys the
     * // attached vertex buffer(s) and index buffer.
     * va = va.destroy();
     */
    Context.prototype.createVertexArrayFromGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var geometry = defaultValue(options.geometry, defaultValue.EMPTY_OBJECT);

        var bufferUsage = defaultValue(options.bufferUsage, BufferUsage.DYNAMIC_DRAW);

        var attributeLocations = defaultValue(options.attributeLocations, defaultValue.EMPTY_OBJECT);
        var interleave = defaultValue(options.interleave, false);
        var createdVAAttributes = options.vertexArrayAttributes;

        var name;
        var attribute;
        var vertexBuffer;
        var vaAttributes = (defined(createdVAAttributes)) ? createdVAAttributes : [];
        var attributes = geometry.attributes;

        if (interleave) {
            // Use a single vertex buffer with interleaved vertices.
            var interleavedAttributes = interleaveAttributes(attributes);
            if (defined(interleavedAttributes)) {
                vertexBuffer = this.createVertexBuffer(interleavedAttributes.buffer, bufferUsage);
                var offsetsInBytes = interleavedAttributes.offsetsInBytes;
                var strideInBytes = interleavedAttributes.vertexSizeInBytes;

                for (name in attributes) {
                    if (attributes.hasOwnProperty(name) && defined(attributes[name])) {
                        attribute = attributes[name];

                        if (defined(attribute.values)) {
                            // Common case: per-vertex attributes
                            vaAttributes.push({
                                index : attributeLocations[name],
                                vertexBuffer : vertexBuffer,
                                componentDatatype : attribute.componentDatatype,
                                componentsPerAttribute : attribute.componentsPerAttribute,
                                normalize : attribute.normalize,
                                offsetInBytes : offsetsInBytes[name],
                                strideInBytes : strideInBytes
                            });
                        } else {
                            // Constant attribute for all vertices
                            vaAttributes.push({
                                index : attributeLocations[name],
                                value : attribute.value,
                                componentDatatype : attribute.componentDatatype,
                                normalize : attribute.normalize
                            });
                        }
                    }
                }
            }
        } else {
            // One vertex buffer per attribute.
            for (name in attributes) {
                if (attributes.hasOwnProperty(name) && defined(attributes[name])) {
                    attribute = attributes[name];

                    var componentDatatype = attribute.componentDatatype;
                    if (componentDatatype === ComponentDatatype.DOUBLE) {
                        componentDatatype = ComponentDatatype.FLOAT;
                    }

                    vertexBuffer = undefined;
                    if (defined(attribute.values)) {
                        vertexBuffer = this.createVertexBuffer(ComponentDatatype.createTypedArray(componentDatatype, attribute.values), bufferUsage);
                    }

                    vaAttributes.push({
                        index : attributeLocations[name],
                        vertexBuffer : vertexBuffer,
                        value : attribute.value,
                        componentDatatype : componentDatatype,
                        componentsPerAttribute : attribute.componentsPerAttribute,
                        normalize : attribute.normalize
                    });
                }
            }
        }

        var indexBuffer;
        var indices = geometry.indices;
        if (defined(indices)) {
            if ((Geometry.computeNumberOfVertices(geometry) > CesiumMath.SIXTY_FOUR_KILOBYTES) && this.elementIndexUint) {
                indexBuffer = this.createIndexBuffer(new Uint32Array(indices), bufferUsage, IndexDatatype.UNSIGNED_INT);
            } else{
                indexBuffer = this.createIndexBuffer(new Uint16Array(indices), bufferUsage, IndexDatatype.UNSIGNED_SHORT);
            }
        }

        return this.createVertexArray(vaAttributes, indexBuffer);
    };

    var viewportQuadAttributeLocations = {
        position : 0,
        textureCoordinates : 1
    };

    Context.prototype.createViewportQuadCommand = function(fragmentShaderSource, overrides) {
        // Per-context cache for viewport quads
        var vertexArray = this.cache.viewportQuad_vertexArray;

        if (!defined(vertexArray)) {
            var geometry = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [
                           -1.0, -1.0,
                            1.0, -1.0,
                            1.0,  1.0,
                           -1.0,  1.0
                        ]
                    }),

                    textureCoordinates : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 2,
                        values : [
                            0.0, 0.0,
                            1.0, 0.0,
                            1.0, 1.0,
                            0.0, 1.0
                        ]
                    })
                },
                // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
                indices : new Uint16Array([0, 1, 2, 0, 2, 3]),
                primitiveType : PrimitiveType.TRIANGLES
            });

            vertexArray = this.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeLocations : {
                    position : 0,
                    textureCoordinates : 1
                },
                bufferUsage : BufferUsage.STATIC_DRAW,
                interleave : true
            });

            this.cache.viewportQuad_vertexArray = vertexArray;
        }

        overrides = defaultValue(overrides, defaultValue.EMPTY_OBJECT);

        return new DrawCommand({
            vertexArray : vertexArray,
            primitiveType : PrimitiveType.TRIANGLES,
            renderState : overrides.renderState,
            shaderProgram : this.createShaderProgram(ViewportQuadVS, fragmentShaderSource, viewportQuadAttributeLocations),
            uniformMap : overrides.uniformMap,
            owner : overrides.owner,
            framebuffer : overrides.framebuffer
        });
    };

    Context.prototype.createPickFramebuffer = function() {
        return new PickFramebuffer(this);
    };

    /**
     * Gets the object associated with a pick color.
     *
     * @param {Color} pickColor The pick color.
     * @returns {Object} The object associated with the pick color, or undefined if no object is associated with that color.
     *
     * @see Context#createPickId
     *
     * @example
     * var object = context.getObjectByPickColor(pickColor);
     */
    Context.prototype.getObjectByPickColor = function(pickColor) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(pickColor)) {
            throw new DeveloperError('pickColor is required.');
        }
        //>>includeEnd('debug');

        return this._pickObjects[pickColor.toRgba()];
    };

    function PickId(pickObjects, key, color) {
        this._pickObjects = pickObjects;
        this.key = key;
        this.color = color;
    }

    defineProperties(PickId.prototype, {
        object : {
            get : function() {
                return this._pickObjects[this.key];
            },
            set : function(value) {
                this._pickObjects[this.key] = value;
            }
        }
    });

    PickId.prototype.destroy = function() {
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
     * @see Context#getObjectByPickColor
     *
     * @example
     * this._pickId = context.createPickId({
     *   primitive : this,
     *   id : this.id
     * });
     */
    Context.prototype.createPickId = function(object) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(object)) {
            throw new DeveloperError('object is required.');
        }
        //>>includeEnd('debug');

        // the increment and assignment have to be separate statements to
        // actually detect overflow in the Uint32 value
        ++this._nextPickColor[0];
        var key = this._nextPickColor[0];
        if (key === 0) {
            // In case of overflow
            throw new RuntimeError('Out of unique Pick IDs.');
        }

        this._pickObjects[key] = object;
        return new PickId(this._pickObjects, key, Color.fromRgba(key));
    };

    Context.prototype.isDestroyed = function() {
        return false;
    };

    Context.prototype.destroy = function() {
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
        this._defaultTexture = this._defaultTexture && this._defaultTexture.destroy();
        this._defaultCubeMap = this._defaultCubeMap && this._defaultCubeMap.destroy();

        return destroyObject(this);
    };

    return Context;
});
