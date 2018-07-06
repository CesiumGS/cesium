define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Texture'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        Texture) {
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
        var texture;
        if (index === 0) {
            texture = autoexposure._colorTexture;
        } else {
            texture = autoexposure._framebuffers[index - 1].getColorTexture(0);
        }
        return {
            colorTexture : function() {
                return texture;
            },
            colorTextureDimensions : function() {
                return texture.dimensions;
            }
        };
    }

    function getShaderSource(index) {
        var source;
        if (index === 0) {
            source =
                'uniform sampler2D colorTexture; \n' +
                'varying vec2 v_textureCoordinates; \n' +
                'void main() { \n' +
                '    vec4 color = texture2D(colorTexture, v_textureCoordinates); \n' +
                '    gl_FragColor = max(color.r, max(color.g, color.b)); \n' +
                '} \n';
            return source;
        }

        source =
            'uniform sampler2D colorTexture; \n' +
            'uniform vec2 colorTextureDimensions; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() { \n' +
            '    float color = 0.0; \n' +
            '    float xStep = 1.0 /colorTextureDimensions.x; \n' +
            '    float yStep = 1.0 /colorTextureDimensions.y; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(-xStep, yStep)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(0.0, yStep)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(xStep, yStep)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(-xStep, 0.0)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(0.0, 0.0)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(xStep, 0.0)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(-xStep, -yStep)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(0.0, -yStep)).r; \n' +
            '    color += texture2D(colorTexture, v_textureCoordinates + vec2(xStep, -yStep)).r; \n' +
            '    gl_FragColor = vec4(color / 9.0); \n' +
            '} \n';
        return source;
    }

    function createCommands(autoexposure, context) {
        destroyCommands(autoexposure);
        var framebuffers = autoexposure._framebuffers;
        var length = framebuffers.length;

        var commands = new Array(length);

        for (var i = 1; i < length; ++i) {
            commands[i] = context.createViewportQuadCommand(getShaderSource(i), {
                framebuffer : framebuffers[i],
                uniformMap : createUniformMap(autoexposure, i)
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
        this._colorTexture = colorTexture;

        var commands = this._commands;
        if (!defined(commands)) {
            return;
        }

        var length = commands.length;
        for (var i = 0; i < length; ++i) {
            commands[i].execute(context);
        }
    };

    AutoExposure.prototype.isDestroyed = function() {
        return false;
    };

    AutoExposure.prototype.destroy = function() {
        destroyFramebuffers(this);
        destroyCommands(this);
        return destroyObject(this);
    };

    return AutoExposure;
});
