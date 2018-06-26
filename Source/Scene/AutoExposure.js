define([
        '../Core/BoundingRectangle',
        '../Core/Check',
        '../Core/Color',
        '../Core/combine',
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/PixelFormat',
        '../Core/Resource',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/ShaderSource',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../ThirdParty/when',
        './PostProcessStageSampleMode'
    ], function(
        BoundingRectangle,
        Check,
        Color,
        combine,
        createGuid,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        CesiumMath,
        PixelFormat,
        Resource,
        PassState,
        PixelDatatype,
        RenderState,
        Sampler,
        ShaderSource,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        when,
        PostProcessStageSampleMode) {
    'use strict';

    function AutoExposure(options) {
        this._clearColor = defaultValue(options.clearColor, Color.BLACK);

        this._uniformMap = undefined;
        this._command = undefined;

        this._colorTexture = undefined;
        this._depthTexture = undefined;

        this._ready = false;

        this._name = 'czm_autoexposure';

        this._logDepthChanged = undefined;
        this._useLogDepth = undefined;

        this.enabled = true;
        this._enabled = true;

        this._framebuffers = undefined;
        this._commands = undefined;
    }

    defineProperties(AutoExposure.prototype, {
        ready : {
            get : function() {
                return this._ready;
            }
        },
        name : {
            get : function() {
                return this._name;
            }
        },
        outputTexture : {
            get : function() {
                return undefined;
            }
        }
    });

    function destroyFramebuffers(autoexposure) {
        var framebuffers = autoexposure._framebuffers;
        if (!defined(framebuffers)) {
            return;
        }

        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            framebuffers[i].destroy();
        }
        autoexposure._framebuffers = undefined;
    }

    function createFramebuffers(autoexposure, context) {
        destroyFramebuffers(autoexposure);

        var width = autoexposure._width;
        var height = autoexposure._height;

        var length = Math.ceil(Math.max(width, height) / 3.0);
        var framebuffers = new Array(length);
        for (var i = 0; i < length; ++i) {
            width = Math.max(Math.ceil(width / 3.0), 1.0);
            height = Math.max(Math.ceil(height / 3.0), 1.0);
            framebuffers[i] = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.RGBA,
                    pixelDatatype : PixelDatatype.FLOAT
                })]
            });
        }

        autoexposure._framebuffers = framebuffers;
    }

    function destroyCommands(autoexposure) {
        var commands = autoexposure._commands;
        if (!defined(commands)) {
            return;
        }

        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].shaderProgram.destroy();
        }
        autoexposure._commands = undefined;
    }

    function createUniformMap(autoexposure, index) {
        if (index === 0) {
            return {
                colorTexture : function() {
                    return autoexposure._colorTexture;
                }
            };
        }
        return {
            colorTexture : function() {
                return autoexposure._framebuffers[index - 1].getColorTexture(0);
            }
        };
    }

    function getShaderSource(autoexposure, index) {
        var framebuffers = autoexposure._framebuffers;
        if (index === 0) {

        }
    }

    function createCommands(autoexposure, context) {
        destroyCommands(autoexposure);
        var framebuffers = autoexposure._framebuffers;
        var length = framebuffers.length;

        var commands = new Array(length);

        for (var i = 1; i < length; ++i) {
            commands[i] = context.createViewportQuadCommand(getShaderSource(i), {
                framebuffer : framebuffers[i],
                uniformMap : createUniformMap(i)
            });
        }
    }

    AutoExposure.prototype.update = function(context, useLogDepth) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        if (width === this._width || height === this._height) {
            return;
        }

        this._width = width;
        this._height = height;

        createFramebuffers(this, context);
        createCommands(this, context);
    };

    AutoExposure.prototype.execute = function(context, colorTexture, depthTexture, idTexture) {
    };

    AutoExposure.prototype.isDestroyed = function() {
        return false;
    };

    AutoExposure.prototype.destroy = function() {
        return destroyObject(this);
    };

    return AutoExposure;
});
