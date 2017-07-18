define([
        '../Core/Check',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/loadImage',
        '../Core/Math',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        './BlendingState',
        './PostProcessStage'
    ], function(
        Check,
        Color,
        combine,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        loadImage,
        CesiumMath,
        PixelFormat,
        Framebuffer,
        PixelDatatype,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        BlendingState,
        PostProcessStage) {
    'use strict';

    /**
     * Executes a series of post processing stages.
     *
     * @param {Object} options An object with the following properties:
     * @param {PostProcessStage[]} options.stages The post processing stages to run.
     * @param {Boolean} [options.overwriteInput=false] Whether to overwrite the input frambuffer color texture during post processing.
     * @param {Boolean} [options.blendOutput=false] Whether to alpha blend the post processing with the output framebuffer.
     *
     * @alias PostProcess
     * @constructor
     * @private
     */
    function PostProcess(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.stages', options.stages);
        //>>includeEnd('debug');

        this._stages = options.stages;
        this._overwriteInput = defaultValue(options.overwriteInput, false);
        this._blendOutput = defaultValue(options.blendOutput, true);

        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._innerStages = undefined;
        this._cache = undefined;
        this._inputColorTexture = undefined;
        this._inputDepthTexture = undefined;
        this._outputFramebuffer = undefined;
        this._stagesEnabled = undefined;
    }

    defineProperties(PostProcess.prototype, {
        enabled : {
            get : function() {
                var stages = this._stages;
                var length = stages.length;
                for (var i = 0; i < length; ++i) {
                    if (stages[i].show) {
                        return true;
                    }
                }
                return false;
            }
        }
    });

    function CachedTexture() {
        this.count = 0;
        this.texture = undefined;
    }

    function PostProcessCache() {
        this.textures = [
            new CachedTexture(),
            new CachedTexture()
        ];
    }

    PostProcessCache.prototype.createTexture = function(index, context) {
        var cachedTexture = this.textures[index];
        var colorTexture = cachedTexture.texture;
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        if (defined(colorTexture) && ((colorTexture.width !== screenWidth) || (colorTexture.height !== screenHeight))) {
            colorTexture.destroy();
            cachedTexture.count = 0;
        }

        var count = ++cachedTexture.count;
        if (count === 1) {
            cachedTexture.texture = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });
        }
        return cachedTexture.texture;
    };

    PostProcessCache.prototype.destroyTexture = function(index) {
        var cachedTexture = this.textures[index];
        var count = --cachedTexture.count;
        if (count === 0) {
            cachedTexture.texture.destroy();
            cachedTexture.texture = undefined;
        }
    };

    function destroyTextures(postProcess) {
        var colorTextures = postProcess._colorTextures;
        var inputColorTexture = postProcess._inputColorTexture;
        if (defined(colorTextures)) {
            var length = colorTextures.length;
            for (var i = 0; i < length; ++i) {
                var colorTexture = colorTextures[i];
                if (colorTexture !== inputColorTexture) {
                    postProcess._cache.destroyTexture(i);
                }
            }
            postProcess._colorTextures = undefined;
        }
    }

    function destroyFramebuffers(postProcess) {
        var framebuffers = postProcess._framebuffers;
        if (defined(framebuffers)) {
            var length = framebuffers.length;
            for (var i = 0; i < length; ++i) {
                framebuffers[i].destroy();
            }
            postProcess._framebuffers = undefined;
        }
    }

    function destroyDrawCommands(postProcess) {
        var innerStages = postProcess._innerStages;
        if (defined(innerStages)) {
            var length = innerStages.length;
            for (var i = 0; i < length; ++i) {
                var stage = innerStages[i];
                stage._drawCommand.shaderProgram.destroy();
                stage._drawCommand = undefined;
            }
        }
    }

    function createRenderState(blend) {
        if (blend) {
            return RenderState.fromCache({
                blending : BlendingState.ALPHA_BLEND
            });
        }

        return RenderState.fromCache();
    }

    function createDrawCommands(postProcess, context) {
        var innerStages = postProcess._innerStages;
        var length = innerStages.length;
        for (var i = 0; i < length; ++i) {
            var stage = innerStages[i];
            var renderState = (postProcess._blendOutput && (i === length - 1)) ? createRenderState(true) : createRenderState(false);
            stage._drawCommand = context.createViewportQuadCommand(stage._fragmentShader, {
                renderState : renderState,
                owner : postProcess
            });
        }
    }

    function createPassthroughStage() {
        var fragmentShader =
            'uniform sampler2D u_colorTexture; \n' +
            'varying vec2 v_textureCoordinates; \n' +
            'void main() \n' +
            '{ \n' +
            '    vec4 color = texture2D(u_colorTexture, v_textureCoordinates); \n' +
            '    gl_FragColor = color; \n' +
            '} \n';

        return new PostProcessStage({
            fragmentShader : fragmentShader
        });
    }

    function createStages(postProcess, inputColorTexture, outputFramebuffer) {
        var innerStages = [];
        var stagesEnabled = [];
        postProcess._innerStages = innerStages;
        postProcess._stagesEnabled = stagesEnabled;

        var i;
        var stage;
        var stages = postProcess._stages;
        var length = stages.length;
        for (i = 0; i < length; ++i) {
            stage = stages[i];
            var enabled = stage.show && stage.ready;
            stagesEnabled.push(enabled);
            if (enabled) {
                innerStages.push(stage);
            }
        }

        // Cannot read and write to the same framebuffer simultaneously, add a passthrough stage.
        var outputColorTexture = defined(outputFramebuffer) ? outputFramebuffer.getColorTexture(0) : undefined;
        if (inputColorTexture === outputColorTexture && innerStages.length === 1) {
            var passthroughStage = createPassthroughStage();
            innerStages.push(passthroughStage);
        }
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });
    }

    function createTextures(postProcess, inputColorTexture, context) {
        var innerStages = postProcess._innerStages;
        var length = CesiumMath.clamp(innerStages.length - 1, 0, 2);
        var colorTextures = new Array(length);
        postProcess._colorTextures = colorTextures;

        if (length >= 1) {
            colorTextures[0] = postProcess._cache.createTexture(0, context);
        }
        if (length === 2) {
            colorTextures[1] = postProcess._overwriteInput ? inputColorTexture : postProcess._cache.createTexture(1, context);
        }
    }

    function createFramebuffers(postProcess, context) {
        var colorTextures = postProcess._colorTextures;
        var length = colorTextures.length;
        var framebuffers = new Array(length);
        postProcess._framebuffers = framebuffers;

        for (var i = 0; i < length; ++i) {
            framebuffers[i] = new Framebuffer({
                context : context,
                colorTextures : [colorTextures[i]],
                destroyAttachments : false
            });
        }
    }

    function getUniformFunction(stage, name) {
        return function() {
            return stage._uniformValues[name];
        };
    }

    function createUniformMap(stage, colorTexture, depthTexture) {
        var uniformMap = {};
        var uniformValues = stage._uniformValues;
        for (var name in uniformValues) {
            if (uniformValues.hasOwnProperty(name)) {
                var uniformName = 'u_' + name;
                uniformMap[uniformName] = getUniformFunction(stage, name);
            }
        }

        return combine(uniformMap, {
            u_colorTexture : function() {
                return colorTexture;
            },
            u_depthTexture : function() {
                return depthTexture;
            }
        });
    }

    function linkStages(postProcess, inputColorTexture, inputDepthTexture, outputFramebuffer) {
        var innerStages = postProcess._innerStages;
        var colorTextures = postProcess._colorTextures;
        var framebuffers = postProcess._framebuffers;

        var length = innerStages.length;
        for (var i = 0; i < length; ++i) {
            var colorTexture;
            if (i === 0) {
                colorTexture = inputColorTexture;
            } else {
                colorTexture = colorTextures[(i + 1) % colorTextures.length];
            }

            var framebuffer;
            if (i === length - 1) {
                framebuffer = outputFramebuffer;
            } else {
                framebuffer = framebuffers[i % framebuffers.length];
            }

            var stage = innerStages[i];
            var drawCommand = stage._drawCommand;
            drawCommand.uniformMap = createUniformMap(stage, colorTexture, inputDepthTexture);
            drawCommand.framebuffer = framebuffer;
        }
    }

    function isDirty(postProcess, inputColorTexture, inputDepthTexture, outputFramebuffer, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var stages = postProcess._stages;
        var innerStages = postProcess._innerStages;
        var stagesEnabled = postProcess._stagesEnabled;

        if (inputColorTexture !== postProcess._inputColorTexture ||
            inputDepthTexture !== postProcess._inputDepthTexture ||
            outputFramebuffer !== postProcess._outputFramebuffer) {
            postProcess._inputColorTexture = inputColorTexture;
            postProcess._inputDepthTexture = inputDepthTexture;
            postProcess._outputFramebuffer = outputFramebuffer;
            return true;
        }

        if (!defined(innerStages)) {
            return true;
        }

        var i;
        var length = stages.length;
        var stagesDirty = false;
        for (i = 0; i < length; ++i) {
            var stage = stages[i];
            var enabled = stage.show && stage.ready;
            if (enabled !== stagesEnabled[i]) {
                stagesEnabled[i] = enabled;
                stagesDirty = true;
            }
        }
        if (stagesDirty) {
            return true;
        }

        var colorTextures = postProcess._colorTextures;
        length = colorTextures.length;
        for (i = 0; i < length; ++i) {
            var colorTexture = colorTextures[i];
            if (colorTexture.isDestroyed()) {
                // Cached color texture was destroyed by another post process due to a screen resize
                return true;
            }
            if ((colorTexture.width !== screenWidth) || (colorTexture.height !== screenHeight)) {
                // Textures were resized
                return true;
            }
        }

        return false;
    }

    PostProcess.prototype.execute = function(frameState, inputColorTexture, inputDepthTexture, outputFramebuffer) {
        var context = frameState.context;

        var cache = context.cache.postProcess;
        if (!defined(cache)) {
            cache = new PostProcessCache();
            context.cache.postProcess = cache;
        }
        this._cache = cache;

        var i;
        var stages = this._stages;
        var length = stages.length;
        for (i = 0; i < length; ++i) {
            stages[i].update(frameState);
        }

        if (isDirty(this, inputColorTexture, inputDepthTexture, outputFramebuffer, context)) {
            destroyDrawCommands(this);
            destroyFramebuffers(this);
            createStages(this, inputColorTexture, outputFramebuffer);
            createDrawCommands(this, context);
            createTextures(this, inputColorTexture, context);
            createFramebuffers(this, context);
            linkStages(this, inputColorTexture, inputDepthTexture, outputFramebuffer);
        }

        var innerStages = this._innerStages;
        length = innerStages.length;
        for (i = 0; i < length; ++i) {
            innerStages[i]._drawCommand.execute(context);
        }
    };

    PostProcess.prototype.isDestroyed = function() {
        return false;
    };

    PostProcess.prototype.destroy = function() {
        destroyDrawCommands();
        destroyTextures();
        destroyFramebuffers();
        return destroyObject(this);
    };

    return PostProcess;
});
