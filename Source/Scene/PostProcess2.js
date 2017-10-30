define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Math',
        '../Core/PixelFormat',
        '../Core/destroyObject',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './PostProcessSampleMode'
    ], function(
        BoundingRectangle,
        Color,
        combine,
        defaultValue,
        defined,
        defineProperties,
        CesiumMath,
        PixelFormat,
        destroyObject,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        PostProcessSampleMode) {
    'use strict';

    function PostProcess(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._textureScale = defaultValue(options.textureScale, 1.0);
        this._forcePowerOfTwo = defaultValue(options.forcePowerOfTwo, false);
        this._sampleMode = defaultValue(options.samplingMode, PostProcessSampleMode.NEAREST);
        this._pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
        this._pixelDatatype = defaultValue(options.pixelDatatype, PixelDatatype.UNSIGNED_BYTE);
        this._clearColor = defaultValue(options.clearColor, Color.BLACK);

        this._fragmentShader = options.fragmentShader;
        this._uniformValues = options.uniformValues;

        this._uniformMap = undefined;
        this._outputTexture = undefined;
        this._framebuffer = undefined;
        this._command = undefined;
        this._clearCommand = undefined;

        this._colorTexture = undefined;
        this._depthTexture = undefined;
    }

    defineProperties(PostProcess.prototype, {
        uniformValues : {
            get : function() {
                return this._uniformValues;
            }
        },
        fragmentShader : {
            get : function() {
                return this._fragementShader;
            }
        },
        outputTexture : {
            get : function() {
                return this._outputTexture;
            }
        }
    });

    function getUniformFunction(postProcess, name) {
        return function() {
            return postProcess._uniformValues[name];
        };
    }

    function createUniformMap(postProcess) {
        if (defined(postProcess._uniformMap)) {
            return;
        }

        var uniformMap = {};
        var uniformValues = postProcess._uniformValues;
        for (var name in uniformValues) {
            if (uniformValues.hasOwnProperty(name)) {
                if (uniformValues.hasOwnProperty(name) && typeof uniformValues[name] !== 'function') {
                    uniformMap[name] = getUniformFunction(postProcess, name);
                } else {
                    uniformMap[name] = uniformValues[name];
                }
            }
        }

        postProcess._uniformMap = combine(uniformMap, {
            u_colorTexture : function() {
                return postProcess._colorTexture;
            },
            u_depthTexture : function() {
                return postProcess._depthTexture;
            }
        });
    }

    function destroyTextures(postProcess) {
        postProcess._outputTexture = postProcess._outputTexture && !postProcess._outputTexture.isDestroyed() && postProcess._outputTexture.destroy();
    }

    function destroyFramebuffers(postProcess) {
        postProcess._framebuffer = postProcess._framebuffer && !postProcess._framebuffer.isDestroyed() && postProcess._framebuffer.destroy();
    }

    function createTextures(postProcess, context, width, height) {
        postProcess._outputTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : postProcess._pixelFormat,
            pixelDatatype : postProcess._pixelDatatype
        });
    }

    function createFramebuffers(postProcess, context) {
        postProcess._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [postProcess._outputTexture],
            destroyAttachments : false
        });
    }

    function createRenderState(postProcess, width, height) {
        postProcess._renderState = RenderState.fromCache({
            viewport : new BoundingRectangle(0, 0, width, height)
        });
    }

    function updateFramebuffers(postProcess, context, width, height) {
        var colorTexture = postProcess._outputTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height;
        if (!defined(postProcess._framebuffer) || textureChanged) {
            destroyTextures(postProcess);
            destroyFramebuffers(postProcess);
            createTextures(postProcess, context, width, height);
            createFramebuffers(postProcess, context);
            createRenderState(postProcess, width, height);
        }
    }

    function createDrawCommand(postProcess, context) {
        if (defined(postProcess._command)) {
            return;
        }

        postProcess._command = context.createViewportQuadCommand(postProcess._fragmentShader, {
            uniformMap : postProcess._uniformMap,
            owner : postProcess
        });
    }

    function createSampler(postProcess) {
        var mode = postProcess._sampleMode;

        var minFilter;
        var magFilter;

        if (mode === PostProcessSampleMode.LINEAR) {
            minFilter = TextureMinificationFilter.LINEAR;
            magFilter = TextureMagnificationFilter.LINEAR;
        } else {
            minFilter = TextureMinificationFilter.NEAREST;
            magFilter = TextureMagnificationFilter.NEAREST;
        }

        var sampler = postProcess._sampler;
        if (!defined(sampler) || sampler.minificationFilter !== minFilter || sampler.magnificationFilter !== magFilter) {
            postProcess._sampler = new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : minFilter,
                magnificationFilter : magFilter
            });
        }
    }

    PostProcess.prototype.update = function(context) {
        var scale = this._textureScale;
        var width = context.drawingBufferWidth * scale;
        var height = context.drawingBufferHeight * scale;

        var size = Math.min(width, height);
        if (this._forcePowerOfTwo) {
            if (!CesiumMath.isPowerOfTwo(size)) {
                size = CesiumMath.nextPowerOfTwo(size);
            }
            width = size;
            height = size;
        }

        createUniformMap(this);
        updateFramebuffers(this, context, width, height);
        createDrawCommand(this, context);
        createSampler(this);

        if (!defined(this._clearCommand)) {
            this._clearCommand = new ClearCommand({
                color : this._clearColor
            });
        }

        this._command.framebuffer = this._framebuffer;
        this._command._renderState = this._renderState;
        this._clearCommand.framebuffer = this._framebuffer;
    };

    PostProcess.prototype.clear = function(context) {
        this._clearCommand.execute(context);
    };

    PostProcess.prototype._setColorTexture = function(texture) {
        this._colorTexture = texture;
    };

    PostProcess.prototype._setDepthTexture = function(texture) {
        this._depthTexture = texture;
    };

    PostProcess.prototype._getFramebuffer = function() {
        return this._framebuffer;
    };

    PostProcess.prototype.execute = function(context) {
        if (!defined(this._command)) {
            return;
        }
        if (!Sampler.equals(this._colorTexture.sampler, this._sampler)) {
            this._colorTexture.sampler = this._sampler;
        }
        this._command.execute(context);
    };

    PostProcess.prototype.isDestroyed = function() {
        return false;
    };

    PostProcess.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);
        if (defined(this._command)) {
            this._command.shaderProgram = this._command.shaderProgram && this._command.shaderProgram.destroy();
        }
        return destroyObject(this);
    };

    return PostProcess;
});
