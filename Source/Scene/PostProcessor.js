/*global define*/
define([
        '../Core/Check',
        '../Core/Color',
        '../Core/combine',
        '../Core/defaultValue',
        '../Core/defined',
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
        './PostProcessorStage'
    ], function(
        Check,
        Color,
        combine,
        defaultValue,
        defined,
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
        PostProcessorStage) {
    'use strict';

    /**
     * @private
     */
    function PostProcessor(options) {
        this._pass = options.pass;
        this._stages = options.stages;
        this._framebuffers = undefined;
        this._colorTextures = undefined;
        this._innerStages = undefined;

        // Check for changes
        this._inputFramebuffer = undefined;
        this._outputFramebuffer = undefined;
        this._stageShows = undefined;
    }

    function destroyTextures(processor) {
        var colorTextures = processor._colorTextures;
        if (defined(colorTextures)) {
            var length = colorTextures.length;
            for (var i = 0; i < length; ++i) {
                colorTextures[i].destroy();
            }
            processor._colorTextures = undefined;
        }
    }

    function destroyFramebuffers(processor) {
        var framebuffers = processor._framebuffers;
        if (defined(framebuffers)) {
            var length = framebuffers.length;
            for (var i = 0; i < length; ++i) {
                framebuffers[i].destroy();
            }
            processor._framebuffers = undefined;
        }
    }

    function destroyDrawCommands(processor) {
        var innerStages = processor._innerStages;
        if (defined(innerStages)) {
            var length = innerStages.length;
            for (var i = 0; i < length; ++i) {
                var stage = innerStages[i];
                stage._drawCommand.shaderProgram.destroy();
                stage._drawCommand = undefined;
            }
        }
    }

    function createDrawCommands(processor, context) {
        var innerStages = processor._innerStages;
        var pass = processor._pass;
        var length = innerStages.length;
        for (var i = 0; i < length; ++i) {
            var stage = innerStages[i];
            stage._drawCommand = context.createViewportQuadCommand(stage._fragmentShader, {
                renderState : RenderState.fromCache(),
                pass : pass,
                owner : processor
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

        return new PostProcessorStage({
            fragmentShader : fragmentShader
        });
    }

    function createStages(processor, inputFramebuffer, outputFramebuffer) {
        var innerStages = [];
        var stageShows = [];
        processor._innerStages = innerStages;
        processor._stageShows = stageShows;

        var i;
        var stage;
        var stages = processor._stages;
        var length = stages.length;
        for (i = 0; i < length; ++i) {
            stage = stages[i];
            var show = stage.show && stage.ready;
            stageShows.push(show);
            if (!show) {
                continue;
            }
            var subStages = stage._stages;
            if (defined(subStages)) {
                var subStagesLength = subStages.length;
                for (var j = 0; j < subStagesLength; ++j) {
                    innerStages.push(subStages[j]);
                }
            } else {
                innerStages.push(stage);
            }
        }

        // Cannot read and write to the same framebuffer simultaneously, add a passthrough stage.
        if (inputFramebuffer === outputFramebuffer && innerStages.length === 1) {
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

    function createTextures(processor, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var innerStages = processor._innerStages;
        var length = CesiumMath.clamp(innerStages.length - 1, 0, 2);
        var colorTextures = new Array(length);
        processor._colorTextures = colorTextures;

        for (var i = 0; i < length; ++i) {
            colorTextures[i] = new Texture({
                context : context,
                width : screenWidth,
                height : screenHeight,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : createSampler()
            });
        }
    }

    function createFramebuffers(processor, context) {
        var colorTextures = processor._colorTextures;
        var length = colorTextures.length;
        var framebuffers = new Array(length);
        processor._framebuffers = framebuffers;

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

    function linkStages(processor, inputFramebuffer, outputFramebuffer) {
        var innerStages = processor._innerStages;
        var colorTextures = processor._colorTextures;
        var framebuffers = processor._framebuffers;
        var depthTexture = defaultValue(inputFramebuffer.depthStencilTexture, inputFramebuffer.depthTexture);

        var length = innerStages.length;
        for (var i = 0; i < length; ++i) {
            var colorTexture;
            if (i === 0) {
                colorTexture = inputFramebuffer.getColorTexture(0);
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
            drawCommand.uniformMap = createUniformMap(stage, colorTexture, depthTexture);
            drawCommand.framebuffer = framebuffer;
        }
    }

    function isDirty(processor, inputFramebuffer, outputFramebuffer, context) {
        var screenWidth = context.drawingBufferWidth;
        var screenHeight = context.drawingBufferHeight;

        var stages = processor._stages;
        var innerStages = processor._innerStages;
        var stageShows = processor._stageShows;

        if (!defined(innerStages)) {
            return true;
        }

        if (inputFramebuffer !== processor._inputFramebuffer || outputFramebuffer !== processor._outputFramebuffer) {
            processor._inputFramebuffer = inputFramebuffer;
            processor._outputFramebuffer = outputFramebuffer;
            return true;
        }

        var showDirty = false;
        var length = stages.length;
        for (var i = 0; i < length; ++i) {
            var stage = stages[i];
            var show = stage.show && stage.ready;
            if (show !== stageShows[i]) {
                stageShows[i] = show;
                showDirty = true;
            }
        }
        if (showDirty) {
            return true;
        }

        length = innerStages.length;
        if (length > 1) {
            var colorTexture = processor._colorTextures[0];
            if ((colorTexture.width !== screenWidth) || (colorTexture.height !== screenHeight)) {
                return true;
            }
        }

        return false;
    }

    PostProcessor.prototype.update = function(frameState, inputFramebuffer, outputFramebuffer) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('frameState', frameState);
        Check.typeOf.object('inputFramebuffer', inputFramebuffer);
        //>>includeEnd('debug');

        var context = frameState.context;
        var commandList = frameState.commandList;

        var i;
        var stages = this._stages;
        var length = stages.length;
        for (i = 0; i < length; ++i) {
            stages[i].update(frameState);
        }

        if (isDirty(this, inputFramebuffer, outputFramebuffer, context)) {
            destroyDrawCommands(this);
            destroyTextures(this);
            destroyFramebuffers(this);
            createStages(this, inputFramebuffer, outputFramebuffer);
            createDrawCommands(this, context);
            createTextures(this, context);
            createFramebuffers(this, context);
            linkStages(this, inputFramebuffer, outputFramebuffer);
        }

        var innerStages = this._innerStages;
        length = innerStages.length;
        for (i = 0; i < length; ++i) {
            commandList.push(innerStages[i]._drawCommand);
        }
    };

    PostProcessor.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessor.prototype.destroy = function() {
        destroyDrawCommands();
        destroyTextures();
        destroyFramebuffers();
        return destroyObject(this);
    };

    return PostProcessor;
});
