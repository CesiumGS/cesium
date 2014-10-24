/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/ShaderSource',
        '../Shaders/AdjustTranslucentFS',
        '../Shaders/CompositeOITFS',
        './BlendEquation',
        './BlendFunction'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        PixelDatatype,
        RenderState,
        ShaderSource,
        AdjustTranslucentFS,
        CompositeOITFS,
        BlendEquation,
        BlendFunction) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var OIT = function(context) {
        var extensionsSupported = context.floatingPointTexture && context.depthTexture;
        this._translucentMRTSupport = context.drawBuffers && extensionsSupported;

        // We support multipass for the Chrome D3D9 backend and ES 2.0 on mobile.
        this._translucentMultipassSupport = !this._translucentMRTSupport && extensionsSupported;

        this._opaqueTexture = undefined;
        this._accumulationTexture = undefined;
        this._depthTexture = undefined;

        this._opaqueFBO = undefined;
        this._translucentFBO = undefined;
        this._alphaFBO = undefined;

        this._adjustTranslucentFBO = undefined;
        this._adjustAlphaFBO = undefined;

        this._opaqueClearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            owner : this
        });
        this._translucentMRTClearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 1.0),
            owner : this
        });
        this._translucentMultipassClearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            owner : this
        });
        this._alphaClearCommand = new ClearCommand({
            color : new Color(1.0, 1.0, 1.0, 1.0),
            owner : this
        });

        this._translucentRenderStateCache = {};
        this._alphaRenderStateCache = {};
        this._translucentShaderCache = {};
        this._alphaShaderCache = {};

        this._compositeCommand = undefined;
        this._adjustTranslucentCommand = undefined;
        this._adjustAlphaCommand = undefined;
    };

    function destroyTextures(oit) {
        oit._opaqueTexture = oit._opaqueTexture && !oit._opaqueTexture.isDestroyed() && oit._opaqueTexture.destroy();
        oit._accumulationTexture = oit._accumulationTexture && !oit._accumulationTexture.isDestroyed() && oit._accumulationTexture.destroy();
        oit._revealageTexture = oit._revealageTexture && !oit._revealageTexture.isDestroyed() && oit._revealageTexture.destroy();
        oit._depthTexture = oit._depthTexture && !oit._depthTexture.isDestroyed() && oit._depthTexture.destroy();
    }

    function destroyFramebuffers(oit) {
        oit._opaqueFBO = oit._opaqueFBO && !oit._opaqueFBO.isDestroyed() && oit._opaqueFBO.destroy();
        oit._translucentFBO = oit._translucentFBO && !oit._translucentFBO.isDestroyed() && oit._translucentFBO.destroy();
        oit._alphaFBO = oit._alphaFBO && !oit._alphaFBO.isDestroyed() && oit._alphaFBO.destroy();
        oit._adjustTranslucentFBO = oit._adjustTranslucentFBO && !oit._adjustTranslucentFBO.isDestroyed() && oit._adjustTranslucentFBO.destroy();
        oit._adjustAlphaFBO = oit._adjustAlphaFBO && !oit._adjustAlphaFBO.isDestroyed() && oit._adjustAlphaFBO.destroy();
    }

    function destroyResources(oit) {
        destroyTextures(oit);
        destroyFramebuffers(oit);
    }

    function updateTextures(oit, context, width, height) {
        destroyTextures(oit);

        oit._opaqueTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });
        oit._accumulationTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
        oit._revealageTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
        oit._depthTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_COMPONENT,
            pixelDatatype : PixelDatatype.UNSIGNED_SHORT
        });
    }

    function updateFramebuffers(oit, context) {
        destroyFramebuffers(oit);

        var completeFBO = WebGLRenderingContext.FRAMEBUFFER_COMPLETE;
        var supported = true;

        // if MRT is supported, attempt to make an FBO with multiple color attachments
        if (oit._translucentMRTSupport) {
            oit._translucentFBO = context.createFramebuffer({
                colorTextures : [oit._accumulationTexture, oit._revealageTexture],
                depthTexture : oit._depthTexture,
                destroyAttachments : false
            });
            oit._adjustTranslucentFBO = context.createFramebuffer({
                colorTextures : [oit._accumulationTexture, oit._revealageTexture],
                destroyAttachments : false
            });

            if (oit._translucentFBO.status !== completeFBO || oit._adjustTranslucentFBO.status !== completeFBO) {
                destroyFramebuffers(oit);
                oit._translucentMRTSupport = false;
            }
        }

        // either MRT isn't supported or FBO creation failed, attempt multipass
        if (!oit._translucentMRTSupport) {
            oit._translucentFBO = context.createFramebuffer({
                colorTextures : [oit._accumulationTexture],
                depthTexture : oit._depthTexture,
                destroyAttachments : false
            });
            oit._alphaFBO = context.createFramebuffer({
                colorTextures : [oit._revealageTexture],
                depthTexture : oit._depthTexture,
                destroyAttachments : false
            });
            oit._adjustTranslucentFBO = context.createFramebuffer({
                colorTextures : [oit._accumulationTexture],
                destroyAttachments : false
            });
            oit._adjustAlphaFBO = context.createFramebuffer({
                colorTextures : [oit._revealageTexture],
                destroyAttachments : false
            });

            var translucentComplete = oit._translucentFBO.status === completeFBO;
            var alphaComplete = oit._alphaFBO.status === completeFBO;
            var adjustTranslucentComplete = oit._adjustTranslucentFBO.status === completeFBO;
            var adjustAlphaComplete = oit._adjustAlphaFBO.status === completeFBO;
            if (!translucentComplete || !alphaComplete || !adjustTranslucentComplete || !adjustAlphaComplete) {
                destroyResources(oit);
                oit._translucentMultipassSupport = false;
                supported = false;
            }
        }

        if (supported) {
            oit._opaqueFBO = context.createFramebuffer({
                colorTextures : [oit._opaqueTexture],
                depthTexture : oit._depthTexture,
                destroyAttachments : false
            });
        }

        return supported;
    }

    OIT.prototype.update = function(context) {
        if (!this.isSupported()) {
            return;
        }

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var opaqueTexture = this._opaqueTexture;
        var textureChanged = !defined(opaqueTexture) || opaqueTexture.width !== width || opaqueTexture.height !== height;
        if (textureChanged) {
            updateTextures(this, context, width, height);
        }

        if (!defined(this._opaqueFBO) || textureChanged) {
            if (!updateFramebuffers(this, context)) {
                // framebuffer creation failed
                return;
            }
        }

        var that = this;
        var fs;
        var uniformMap;

        if (!defined(this._compositeCommand)) {
            fs = new ShaderSource({
                sources : [CompositeOITFS]
            });
            if (this._translucentMRTSupport) {
                fs.defines.push('MRT');
            }

            uniformMap = {
                u_opaque : function() {
                    return that._opaqueTexture;
                },
                u_accumulation : function() {
                    return that._accumulationTexture;
                },
                u_revealage : function() {
                    return that._revealageTexture;
                }
            };
            this._compositeCommand = context.createViewportQuadCommand(fs, {
                renderState : context.createRenderState(),
                uniformMap : uniformMap,
                owner : this
            });
        }

        if (!defined(this._adjustTranslucentCommand)) {
            if (this._translucentMRTSupport) {
                fs = new ShaderSource({
                    defines : ['MRT'],
                    sources : [AdjustTranslucentFS]
                });

                uniformMap = {
                    u_bgColor : function() {
                        return that._translucentMRTClearCommand.color;
                    },
                    u_depthTexture : function() {
                        return that._depthTexture;
                    }
                };

                this._adjustTranslucentCommand = context.createViewportQuadCommand(fs, {
                    renderState : context.createRenderState(),
                    uniformMap : uniformMap,
                    owner : this
                });
            } else if (this._translucentMultipassSupport) {
                fs = new ShaderSource({
                    sources : [AdjustTranslucentFS]
                });

                uniformMap = {
                    u_bgColor : function() {
                        return that._translucentMultipassClearCommand.color;
                    },
                    u_depthTexture : function() {
                        return that._depthTexture;
                    }
                };

                this._adjustTranslucentCommand = context.createViewportQuadCommand(fs, {
                    renderState : context.createRenderState(),
                    uniformMap : uniformMap,
                    owner : this
                });

                uniformMap = {
                    u_bgColor : function() {
                        return that._alphaClearCommand.color;
                    },
                    u_depthTexture : function() {
                        return that._depthTexture;
                    }
                };

                this._adjustAlphaCommand = context.createViewportQuadCommand(fs, {
                    renderState : context.createRenderState(),
                    uniformMap : uniformMap,
                    owner : this
                });
            }
        }
    };

    var translucentMRTBlend = {
        enabled : true,
        color : new Color(0.0, 0.0, 0.0, 0.0),
        equationRgb : BlendEquation.ADD,
        equationAlpha : BlendEquation.ADD,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    var translucentColorBlend = {
        enabled : true,
        color : new Color(0.0, 0.0, 0.0, 0.0),
        equationRgb : BlendEquation.ADD,
        equationAlpha : BlendEquation.ADD,
        functionSourceRgb : BlendFunction.ONE,
        functionDestinationRgb : BlendFunction.ONE,
        functionSourceAlpha : BlendFunction.ONE,
        functionDestinationAlpha : BlendFunction.ONE
    };

    var translucentAlphaBlend = {
        enabled : true,
        color : new Color(0.0, 0.0, 0.0, 0.0),
        equationRgb : BlendEquation.ADD,
        equationAlpha : BlendEquation.ADD,
        functionSourceRgb : BlendFunction.ZERO,
        functionDestinationRgb : BlendFunction.ONE_MINUS_SOURCE_ALPHA,
        functionSourceAlpha : BlendFunction.ZERO,
        functionDestinationAlpha : BlendFunction.ONE_MINUS_SOURCE_ALPHA
    };

    function getTranslucentRenderState(context, translucentBlending, cache, renderState) {
        var translucentState = cache[renderState.id];
        if (!defined(translucentState)) {
            var rs = RenderState.clone(renderState);
            rs.depthMask = false;
            rs.blending = translucentBlending;

            translucentState = context.createRenderState(rs);
            cache[renderState.id] = translucentState;
        }

        return translucentState;
    }

    function getTranslucentMRTRenderState(oit, context, renderState) {
        return getTranslucentRenderState(context, translucentMRTBlend, oit._translucentRenderStateCache, renderState);
    }

    function getTranslucentColorRenderState(oit, context, renderState) {
        return getTranslucentRenderState(context, translucentColorBlend, oit._translucentRenderStateCache, renderState);
    }

    function getTranslucentAlphaRenderState(oit, context, renderState) {
        return getTranslucentRenderState(context, translucentAlphaBlend, oit._alphaRenderStateCache, renderState);
    }

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

            var fs = shaderProgram.fragmentShaderSource.clone();

            fs.sources = fs.sources.map(function(source) {
                source = source.replace(/void\s+main\s*\(\s*(?:void)?\s*\)/g, 'void czm_translucent_main()');
                source = source.replace(/gl_FragColor/g, 'czm_gl_FragColor');
                source = source.replace(/\bdiscard\b/g, 'czm_discard = true');
                source = source.replace(/czm_phong/g, 'czm_translucentPhong');
                return source;
            });

            // Discarding the fragment in main is a workaround for ANGLE D3D9
            // shader compilation errors.

            fs.sources.splice(0, 0,
                    (source.indexOf('gl_FragData') !== -1 ? '#extension GL_EXT_draw_buffers : enable \n' : '') +
                    'vec4 czm_gl_FragColor;\n' +
                    'bool czm_discard = false;\n');

            fs.sources.push(
                    'void main()\n' +
                    '{\n' +
                    '    czm_translucent_main();\n' +
                    '    if (czm_discard)\n' +
                    '    {\n' +
                    '        discard;\n' +
                    '    }\n' +
                    source +
                    '}\n');

            shader = context.createShaderProgram(shaderProgram.vertexShaderSource, fs, attributeLocations);
            cache[id] = shader;
        }

        return shader;
    }

    function getTranslucentMRTShaderProgram(oit, context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, oit._translucentShaderCache, mrtShaderSource);
    }

    function getTranslucentColorShaderProgram(oit, context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, oit._translucentShaderCache, colorShaderSource);
    }

    function getTranslucentAlphaShaderProgram(oit, context, shaderProgram) {
        return getTranslucentShaderProgram(context, shaderProgram, oit._alphaShaderCache, alphaShaderSource);
    }

    function executeTranslucentCommandsSortedMultipass(oit, scene, executeFunction, passState, commands) {
        var command;
        var renderState;
        var shaderProgram;
        var j;

        var context = scene.context;
        var framebuffer = passState.framebuffer;
        var length = commands.length;

        passState.framebuffer = oit._adjustTranslucentFBO;
        oit._adjustTranslucentCommand.execute(context, passState);
        passState.framebuffer = oit._adjustAlphaFBO;
        oit._adjustAlphaCommand.execute(context, passState);

        var debugFramebuffer = oit._opaqueFBO;
        passState.framebuffer = oit._translucentFBO;

        for (j = 0; j < length; ++j) {
            command = commands[j];

            if (!defined(command.oit) || command.shaderProgram.id !== command.oit.shaderProgramId) {
                command.oit = {
                    colorRenderState : getTranslucentColorRenderState(oit, context, command.renderState),
                    alphaRenderState : getTranslucentAlphaRenderState(oit, context, command.renderState),
                    colorShaderProgram : getTranslucentColorShaderProgram(oit, context, command.shaderProgram),
                    alphaShaderProgram : getTranslucentAlphaShaderProgram(oit, context, command.shaderProgram),
                    shaderProgramId : command.shaderProgram.id
                };
            }

            renderState = command.oit.colorRenderState;
            shaderProgram = command.oit.colorShaderProgram;
            executeFunction(command, scene, context, passState, renderState, shaderProgram, debugFramebuffer);
        }

        passState.framebuffer = oit._alphaFBO;

        for (j = 0; j < length; ++j) {
            command = commands[j];
            renderState = command.oit.alphaRenderState;
            shaderProgram = command.oit.alphaShaderProgram;
            executeFunction(command, scene, context, passState, renderState, shaderProgram, debugFramebuffer);
        }

        passState.framebuffer = framebuffer;
    }

    function executeTranslucentCommandsSortedMRT(oit, scene, executeFunction, passState, commands) {
        var context = scene.context;
        var framebuffer = passState.framebuffer;
        var length = commands.length;

        passState.framebuffer = oit._adjustTranslucentFBO;
        oit._adjustTranslucentCommand.execute(context, passState);

        var debugFramebuffer = oit._opaqueFBO;
        passState.framebuffer = oit._translucentFBO;

        for (var j = 0; j < length; ++j) {
            var command = commands[j];

            if (!defined(command.oit) || command.shaderProgram.id !== command.oit.shaderProgramId) {
                command.oit = {
                    translucentRenderState : getTranslucentMRTRenderState(oit, context, command.renderState),
                    translucentShaderProgram : getTranslucentMRTShaderProgram(oit, context, command.shaderProgram),
                    shaderProgramId : command.shaderProgram.id
                };
            }

            var renderState = command.oit.translucentRenderState;
            var shaderProgram = command.oit.translucentShaderProgram;
            executeFunction(command, scene, context, passState, renderState, shaderProgram, debugFramebuffer);
        }

        passState.framebuffer = framebuffer;
    }

    OIT.prototype.executeCommands = function(scene, executeFunction, passState, commands) {
        if (this._translucentMRTSupport) {
            executeTranslucentCommandsSortedMRT(this, scene, executeFunction, passState, commands);
            return;
        }

        executeTranslucentCommandsSortedMultipass(this, scene, executeFunction, passState, commands);
    };

    OIT.prototype.execute = function(context, passState) {
        this._compositeCommand.execute(context, passState);
    };

    OIT.prototype.clear = function(context, passState, clearColor) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._opaqueFBO;
        Color.clone(clearColor, this._opaqueClearCommand.color);
        this._opaqueClearCommand.execute(context, passState);

        passState.framebuffer = this._translucentFBO;
        var translucentClearCommand = this._translucentMRTSupport ? this._translucentMRTClearCommand : this._translucentMultipassClearCommand;
        translucentClearCommand.execute(context, passState);

        if (this._translucentMultipassSupport) {
            passState.framebuffer = this._alphaFBO;
            this._alphaClearCommand.execute(context, passState);
        }

        passState.framebuffer = framebuffer;
    };

    OIT.prototype.getColorFramebuffer = function() {
        return this._opaqueFBO;
    };

    OIT.prototype.isSupported = function() {
        return this._translucentMRTSupport || this._translucentMultipassSupport;
    };

    OIT.prototype.isDestroyed = function() {
        return false;
    };

    OIT.prototype.destroy = function() {
        destroyResources(this);

        if (defined(this._compositeCommand)) {
            this._compositeCommand.shaderProgram = this._compositeCommand.shaderProgram && this._compositeCommand.shaderProgram.destroy();
        }

        if (defined(this._adjustTranslucentCommand)) {
            this._adjustTranslucentCommand.shaderProgram = this._adjustTranslucentCommand.shaderProgram && this._adjustTranslucentCommand.shaderProgram.destroy();
        }

        if (defined(this._adjustAlphaCommand)) {
            this._adjustAlphaCommand.shaderProgram = this._adjustAlphaCommand.shaderProgram && this._adjustAlphaCommand.shaderProgram.destroy();
        }

        var name;
        var cache = this._translucentShaderCache;
        for (name in cache) {
            if (cache.hasOwnProperty(name) && defined(cache[name])) {
                cache[name].destroy();
            }
        }
        this._translucentShaderCache = {};

        cache = this._alphaShaderCache;
        for (name in cache) {
            if (cache.hasOwnProperty(name) && defined(cache[name])) {
                cache[name].destroy();
            }
        }
        this._alphaShaderCache = {};

        return destroyObject(this);
    };

    return OIT;
});
