define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        Color,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    'use strict';

    function AutoExposure() {
        this._uniformMap = undefined;
        this._command = undefined;

        this._colorTexture = undefined;
        this._depthTexture = undefined;

        this._ready = false;

        this._name = 'czm_autoexposure';

        this._logDepthChanged = undefined;
        this._useLogDepth = undefined;

        this._framebuffers = undefined;
        this._previousLuminance = undefined;

        this._commands = undefined;
        this._clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            framebuffer : undefined
        });

        this.enabled = true;
        this._enabled = true;

        this.minimumLuminance = 0.1;
        this.maximumLuminance = 10.0;
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
                var framebuffers = this._framebuffers;
                if (!defined(framebuffers)) {
                    return undefined;
                }
                return framebuffers[framebuffers.length - 1].getColorTexture(0);
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

        autoexposure._previousLuminance.destroy();
        autoexposure._previousLuminance = undefined;
    }

    function createFramebuffers(autoexposure, context) {
        destroyFramebuffers(autoexposure);

        var width = autoexposure._width;
        var height = autoexposure._height;

        var pixelFormat = PixelFormat.RGBA;
        var pixelDatatype = PixelDatatype.FLOAT;
        var sampler = new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });

        var length = Math.ceil(Math.log(Math.max(width, height)) / Math.log(3.0));
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
                    pixelFormat : pixelFormat,
                    pixelDatatype : pixelDatatype,
                    sampler : sampler
                })]
            });
        }

        var lastTexture = framebuffers[length - 1].getColorTexture(0);
        autoexposure._previousLuminance = new Framebuffer({
            context : context,
            colorTextures : [new Texture({
                context : context,
                width : lastTexture.width,
                height : lastTexture.height,
                pixelFormat : pixelFormat,
                pixelDatatype : pixelDatatype,
                sampler : sampler
            })]
        });

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
        var uniforms;
        if (index === 0) {
            uniforms = {
                colorTexture : function() {
                    return autoexposure._colorTexture;
                },
                colorTextureDimensions : function() {
                    return autoexposure._colorTexture.dimensions;
                }
            };
        } else {
            var texture = autoexposure._framebuffers[index - 1].getColorTexture(0);
            uniforms = {
                colorTexture : function() {
                    return texture;
                },
                colorTextureDimensions : function() {
                    return texture.dimensions;
                }
            };
        }

        uniforms.minimumLuminance = function() {
            return autoexposure.minimumLuminance;
        };
        uniforms.maximumLuminance = function() {
            return autoexposure.maximumLuminance;
        };
        uniforms.previousLuminance = function() {
            return autoexposure._previousLuminance;
        };

        return uniforms;
    }

    function getShaderSource(index, length) {
        var source =
            'uniform sampler2D colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'float sampleTexture(vec2 offset) { \n';

        if (index === 0) {
            source +=
                '    vec4 color = texture2D(colorTexture, v_textureCoordinates + offset); \n' +
                '    return czm_luminance(color.rgb); \n';
        } else {
            source +=
                '    return texture2D(colorTexture, v_textureCoordinates + offset).r; \n';
        }

        source += '}\n\n';

        source +=
            'uniform vec2 colorTextureDimensions; \n' +
            'uniform float minimumLuminance; \n' +
            'uniform float maximumLuminance; \n' +
            'uniform sampler2D previousLuminance; \n' +
            'void main() { \n' +
            '    float color = 0.0; \n' +
            '    float xStep = 1.0 /colorTextureDimensions.x; \n' +
            '    float yStep = 1.0 /colorTextureDimensions.y; \n' +
            '    color += sampleTexture(vec2(-xStep, yStep)); \n' +
            '    color += sampleTexture(vec2(0.0, yStep)); \n' +
            '    color += sampleTexture(vec2(xStep, yStep)); \n' +
            '    color += sampleTexture(vec2(-xStep, 0.0)); \n' +
            '    color += sampleTexture(vec2(0.0, 0.0)); \n' +
            '    color += sampleTexture(vec2(xStep, 0.0)); \n' +
            '    color += sampleTexture(vec2(-xStep, -yStep)); \n' +
            '    color += sampleTexture(vec2(0.0, -yStep)); \n' +
            '    color += sampleTexture(vec2(xStep, -yStep)); \n' +
            '    color /= 9.0; \n';

        if (index === length - 1) {
            source +=
                '    float previous = texture2D(previousLuminance, vec2(0.5)).r; \n' +
                '    color = previous + (color - previous) / (60.0 * 4.0); \n' +
                '    color = clamp(color, minimumLuminance, maximumLuminance); \n';
        }

        source +=
            '    gl_FragColor = vec4(color); \n' +
            '} \n';
        return source;
    }

    function createCommands(autoexposure, context) {
        destroyCommands(autoexposure);
        var framebuffers = autoexposure._framebuffers;
        var length = framebuffers.length;

        var commands = new Array(length);

        for (var i = 0; i < length; ++i) {
            commands[i] = context.createViewportQuadCommand(getShaderSource(i, length), {
                framebuffer : framebuffers[i],
                uniformMap : createUniformMap(autoexposure, i)
            });
        }
        autoexposure._commands = commands;
    }

    AutoExposure.prototype.clear = function(context) {
        var framebuffers = this._framebuffers;
        if (!defined(framebuffers)) {
            return;
        }

        var clearCommand = this._clearCommand;
        var length = framebuffers.length;
        for (var i = 0; i < length; ++i) {
            clearCommand.framebuffer = framebuffers[i];
            clearCommand.execute(context);
        }
    };

    AutoExposure.prototype.update = function(context, useLogDepth) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        if (width !== this._width || height !== this._height) {
            this._width = width;
            this._height = height;

            createFramebuffers(this, context);
            createCommands(this, context);

            if (!this._ready) {
                this._ready = true;
            }
        }

        var framebuffers = this._framebuffers;
        var temp = framebuffers[framebuffers.length - 1];
        framebuffers[framebuffers.length - 1] = this._previousLuminance;
        this._commands[this._commands.length - 1].framebuffer = this._previousLuminance;
        this._previousLuminance = temp;
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
