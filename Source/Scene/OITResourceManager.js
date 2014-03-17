/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Color',
        '../Renderer/BlendFunction',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/RenderbufferFormat'
    ], function(
        defined,
        destroyObject,
        Color,
        BlendFunction,
        ClearCommand,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat) {
    "use strict";

    var OITResourceManager = function(context) {
        var textureFloat = context.getFloatingPointTexture();
        this._translucentMRTSupport = context.getDrawBuffers() && textureFloat;

        // We support multipass for the Chrome D3D9 backend and ES 2.0 on mobile.
        this._translucentMultipassSupport = !this._translucentMRTSupport && textureFloat;

        this._opaqueTexture = undefined;
        this._accumulationTexture = undefined;
        this._revealageTexture = undefined;

        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;

        this._opaqueFBO = undefined;
        this._translucentFBO = undefined;
        this._alphaFBO = undefined;

        var opaqueClearCommand = new ClearCommand();
        opaqueClearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
        opaqueClearCommand.depth = 1.0;
        opaqueClearCommand.owner = this;
        this._opaqueClearCommand = opaqueClearCommand;

        var translucentMRTClearCommand = new ClearCommand();
        translucentMRTClearCommand.color = new Color(0.0, 0.0, 0.0, 1.0);
        translucentMRTClearCommand.owner = this;
        this._translucentMRTClearCommand = translucentMRTClearCommand;

        var translucentMultipassClearCommand = new ClearCommand();
        translucentMultipassClearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
        translucentMultipassClearCommand.owner = this;
        this._translucentMultipassClearCommand = translucentMultipassClearCommand;

        var alphaClearCommand= new ClearCommand();
        alphaClearCommand.color = new Color(1.0, 1.0, 1.0, 1.0);
        alphaClearCommand.owner = this;
        this._alphaClearCommand = alphaClearCommand;

        var depthClearCommand = new ClearCommand();
        depthClearCommand.depth = 1.0;
        depthClearCommand.owner = this;
        this._depthClearCommand = depthClearCommand;

        this._translucentRenderStateCache = {};
        this._alphaRenderStateCache = {};
        this._translucentShaderCache = {};
        this._alphaShaderCache = {};
    };

    var translucentMRTBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    var translucentColorBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ONE,
        functionDestinationAlpha : BlendFunction.ONE
    };

    var translucentAlphaBlend = {
        enabled : true,
        functionSourceRgb : BlendFunction.ZERO,
        functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    function getTranslucentRenderState(context, translucentBlending, cache, renderState) {
        var translucentState = cache[renderState.id];
        if (!defined(translucentState)) {
            var depthMask = renderState.depthMask;
            var blending = renderState.blending;

            renderState.depthMask = false;
            renderState.blending = translucentBlending;

            translucentState = context.createRenderState(renderState);
            cache[renderState.id] = translucentState;

            renderState.depthMask = depthMask;
            renderState.blending = blending;
        }

        return translucentState;
    }

    OITResourceManager.prototype.getTranslucentMRTRenderState = function(context, renderState) {
        return getTranslucentRenderState(context, translucentMRTBlend, this._translucentRenderStateCache, renderState);
    };

    OITResourceManager.prototype.getTranslucentColorRenderState = function(context, renderState) {
        return getTranslucentRenderState(context, translucentColorBlend, this._translucentRenderStateCache, renderState);
    };

    OITResourceManager.prototype.getTranslucentAlphaRenderState = function(context, renderState) {
        return getTranslucentRenderState(context, translucentAlphaBlend, this._alphaRenderStateCache, renderState);
    };

    var mrtShaderSource =
        '    vec3 Ci = czm_gl_FragColor.rgb * czm_gl_FragColor.a;\n' +
        '    float ai = czm_gl_FragColor.a;\n' +
        '    float wzi = czm_alphaWeight(ai);\n' +
        '    gl_FragData[0] = vec4(Ci * wzi, ai);\n' +
        '    gl_FragData[1] = vec4(ai * wzi);\n';

    var colorShaderSource =
        '    vec3 Ci = czm_gl_FragColor.rgb * czm_gl_FragColor.a;\n' +
        '    float ai = czm_gl_FragColor.a;\n' +
        '    float wzi = czm_alphaWeight(ai);\n' +
        '    gl_FragColor = vec4(Ci, ai) * wzi;\n';

    var alphaShaderSource =
        '    float ai = czm_gl_FragColor.a;\n' +
        '    gl_FragColor = vec4(ai);\n';

    function getTranslucentShaderProgram(context, shaderProgram, cache, source) {
        var id = shaderProgram.id;
        var shader = cache[id];
        if (!defined(shader)) {
            var attributeLocations = shaderProgram._attributeLocations;
            var vs = shaderProgram.vertexShaderSource;
            var fs = shaderProgram.fragmentShaderSource;

            var renamedFS = fs.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_translucent_main()');
            renamedFS = renamedFS.replace(/gl_FragColor/g, 'czm_gl_FragColor');
            renamedFS = renamedFS.replace(/discard/g, 'czm_discard = true');
            renamedFS = renamedFS.replace(/czm_phong/g, 'czm_translucentPhong');

            // Discarding the fragment in main is a workaround for ANGLE D3D9
            // shader compilation errors.
            var newSourceFS =
                (source.indexOf('gl_FragData') !== -1 ? '#extension GL_EXT_draw_buffers : enable \n' : '') +
                'vec4 czm_gl_FragColor;\n' +
                'bool czm_discard = false;\n' +
                renamedFS + '\n\n' +
                'void main()\n' +
                '{\n' +
                '    czm_translucent_main();\n' +
                '    if (czm_discard)\n' +
                '    {\n' +
                '        discard;\n' +
                '    }\n' +
                source +
                '}\n';

            shader = context.getShaderCache().getShaderProgram(vs, newSourceFS, attributeLocations);
            cache[id] = shader;
        }

        return shader;
    }

    OITResourceManager.prototype.getTranslucentMRTShaderProgram = function(context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, this._translucentShaderCache, mrtShaderSource);
    };

    OITResourceManager.prototype.getTranslucentColorShaderProgram = function(context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, this._translucentShaderCache, colorShaderSource);
    };

    OITResourceManager.prototype.getTranslucentAlphaShaderProgram = function(context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, this._alphaShaderCache, alphaShaderSource);
    };

    function updateTextures(that, width, height, supportedOIT) {
        if (!supportedOIT) {
            return;
        }

        var context = that._context;
        that._opaqueTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGB,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });
        that._accumulationTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
        that._revealageTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });

        if (context.getDepthTexture()) {
            that._depthTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_COMPONENT,
                pixelDatatype : PixelDatatype.UNSIGNED_SHORT
            });
        } else {
            that._depthRenderbuffer = context.createRenderbuffer({
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_COMPONENT16
            });
        }
    }

    OITResourceManager.prototype.update = function(context) {

    };

    return OITResourceManager;
});
