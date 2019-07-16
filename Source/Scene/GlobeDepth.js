define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/ShaderSource',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureWrap',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Shaders/PostProcessStages/DepthViewPacked',
        '../Shaders/PostProcessStages/PassThrough',
        '../Shaders/PostProcessStages/PassThroughDepth',
        './StencilConstants',
        './StencilFunction',
        './StencilOperation'
    ], function(
        BoundingRectangle,
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        RenderState,
        ShaderSource,
        Sampler,
        Texture,
        TextureWrap,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        DepthViewPacked,
        PassThrough,
        PassThroughDepth,
        StencilConstants,
        StencilFunction,
        StencilOperation) {
    'use strict';

    /**
     * @private
     */
    function GlobeDepth() {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._globeDepthTexture = undefined;
        this._tempGlobeDepthTexture = undefined;
        this._tempCopyDepthTexture = undefined;

        this.framebuffer = undefined;
        this._copyDepthFramebuffer = undefined;
        this._tempCopyDepthFramebuffer = undefined;
        this._updateDepthFramebuffer = undefined;

        this._clearColorCommand = undefined;
        this._copyColorCommand = undefined;
        this._copyDepthCommand = undefined;
        this._tempCopyDepthCommand = undefined;
        this._updateDepthCommand = undefined;

        this._viewport = new BoundingRectangle();
        this._rs = undefined;
        this._rsUpdate = undefined;

        this._useScissorTest = false;
        this._scissorRectangle = undefined;

        this._useLogDepth = undefined;
        this._useHdr = undefined;

        this._debugGlobeDepthViewportCommand = undefined;
    }

    function executeDebugGlobeDepth(globeDepth, context, passState, useLogDepth) {
        if (!defined(globeDepth._debugGlobeDepthViewportCommand) || useLogDepth !== globeDepth._useLogDepth) {
            var fsSource =
                'uniform sampler2D u_depthTexture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main()\n' +
                '{\n' +
                '    float z_window = czm_unpackDepth(texture2D(u_depthTexture, v_textureCoordinates));\n' +
                '    z_window = czm_reverseLogDepth(z_window); \n' +
                '    float n_range = czm_depthRange.near;\n' +
                '    float f_range = czm_depthRange.far;\n' +
                '    float z_ndc = (2.0 * z_window - n_range - f_range) / (f_range - n_range);\n' +
                '    float scale = pow(z_ndc * 0.5 + 0.5, 8.0);\n' +
                '    gl_FragColor = vec4(mix(vec3(0.0), vec3(1.0), scale), 1.0);\n' +
                '}\n';
            var fs = new ShaderSource({
                defines : [useLogDepth ? 'LOG_DEPTH' : ''],
                sources : [fsSource]
            });

            globeDepth._debugGlobeDepthViewportCommand = context.createViewportQuadCommand(fs, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._globeDepthTexture;
                    }
                },
                owner : globeDepth
            });

            globeDepth._useLogDepth = useLogDepth;
        }

        globeDepth._debugGlobeDepthViewportCommand.execute(context, passState);
    }

    function destroyTextures(globeDepth) {
        globeDepth._colorTexture = globeDepth._colorTexture && !globeDepth._colorTexture.isDestroyed() && globeDepth._colorTexture.destroy();
        globeDepth._depthStencilTexture = globeDepth._depthStencilTexture && !globeDepth._depthStencilTexture.isDestroyed() && globeDepth._depthStencilTexture.destroy();
        globeDepth._globeDepthTexture = globeDepth._globeDepthTexture && !globeDepth._globeDepthTexture.isDestroyed() && globeDepth._globeDepthTexture.destroy();
    }

    function destroyFramebuffers(globeDepth) {
        globeDepth.framebuffer = globeDepth.framebuffer && !globeDepth.framebuffer.isDestroyed() && globeDepth.framebuffer.destroy();
        globeDepth._copyDepthFramebuffer = globeDepth._copyDepthFramebuffer && !globeDepth._copyDepthFramebuffer.isDestroyed() && globeDepth._copyDepthFramebuffer.destroy();
    }

    function destroyUpdateDepthResources(globeDepth) {
        globeDepth._tempCopyDepthFramebuffer = globeDepth._tempCopyDepthFramebuffer && !globeDepth._tempCopyDepthFramebuffer.isDestroyed() && globeDepth._tempCopyDepthFramebuffer.destroy();
        globeDepth._updateDepthFramebuffer = globeDepth._updateDepthFramebuffer && !globeDepth._updateDepthFramebuffer.isDestroyed() && globeDepth._updateDepthFramebuffer.destroy();
        globeDepth._tempGlobeDepthTexture = globeDepth._tempGlobeDepthTexture && !globeDepth._tempGlobeDepthTexture.isDestroyed() && globeDepth._tempGlobeDepthTexture.destroy();
    }

    function createUpdateDepthResources(globeDepth, context, width, height, passState) {
        globeDepth._tempGlobeDepthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
        globeDepth._tempCopyDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._tempGlobeDepthTexture],
            destroyAttachments : false
        });
        globeDepth._updateDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._globeDepthTexture],
            depthStencilTexture : passState.framebuffer.depthStencilTexture,
            destroyAttachments : false
        });
    }

    function createTextures(globeDepth, context, width, height, hdr) {
        var pixelDatatype = hdr ? (context.halfFloatingPointTexture ? PixelDatatype.HALF_FLOAT : PixelDatatype.FLOAT) : PixelDatatype.UNSIGNED_BYTE;
        globeDepth._colorTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : pixelDatatype,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });

        globeDepth._depthStencilTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
        });

        globeDepth._globeDepthTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : new Sampler({
                wrapS : TextureWrap.CLAMP_TO_EDGE,
                wrapT : TextureWrap.CLAMP_TO_EDGE,
                minificationFilter : TextureMinificationFilter.NEAREST,
                magnificationFilter : TextureMagnificationFilter.NEAREST
            })
        });
    }

    function createFramebuffers(globeDepth, context) {
        globeDepth.framebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._colorTexture],
            depthStencilTexture : globeDepth._depthStencilTexture,
            destroyAttachments : false
        });

        globeDepth._copyDepthFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [globeDepth._globeDepthTexture],
            destroyAttachments : false
        });
    }

    function updateFramebuffers(globeDepth, context, width, height, hdr) {
        var colorTexture = globeDepth._colorTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height || hdr !== globeDepth._useHdr;
        if (!defined(globeDepth.framebuffer) || textureChanged) {
            destroyTextures(globeDepth);
            destroyFramebuffers(globeDepth);
            createTextures(globeDepth, context, width, height, hdr);
            createFramebuffers(globeDepth, context);
        }
    }

    function updateCopyCommands(globeDepth, context, width, height, passState) {
        globeDepth._viewport.width = width;
        globeDepth._viewport.height = height;

        var useScissorTest = !BoundingRectangle.equals(globeDepth._viewport, passState.viewport);
        var updateScissor = useScissorTest !== globeDepth._useScissorTest;
        globeDepth._useScissorTest = useScissorTest;

        if (!BoundingRectangle.equals(globeDepth._scissorRectangle, passState.viewport)) {
            globeDepth._scissorRectangle = BoundingRectangle.clone(passState.viewport, globeDepth._scissorRectangle);
            updateScissor = true;
        }

        if (!defined(globeDepth._rs) || !BoundingRectangle.equals(globeDepth._viewport, globeDepth._rs.viewport) || updateScissor) {
            globeDepth._rs = RenderState.fromCache({
                viewport : globeDepth._viewport,
                scissorTest : {
                    enabled : globeDepth._useScissorTest,
                    rectangle : globeDepth._scissorRectangle
                }
            });
            // Copy packed depth only if the 3D Tiles bit is set
            globeDepth._rsUpdate = RenderState.fromCache({
                viewport : globeDepth._viewport,
                scissorTest : {
                    enabled : globeDepth._useScissorTest,
                    rectangle : globeDepth._scissorRectangle
                },
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.EQUAL,
                    frontOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.KEEP
                    },
                    backFunction : StencilFunction.NEVER,
                    reference : StencilConstants.CESIUM_3D_TILE_MASK,
                    mask : StencilConstants.CESIUM_3D_TILE_MASK
                }
            });
        }

        if (!defined(globeDepth._copyDepthCommand)) {
            globeDepth._copyDepthCommand = context.createViewportQuadCommand(PassThroughDepth, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._depthStencilTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._copyDepthCommand.framebuffer = globeDepth._copyDepthFramebuffer;
        globeDepth._copyDepthCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._copyColorCommand)) {
            globeDepth._copyColorCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._colorTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._copyColorCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._tempCopyDepthCommand)) {
            globeDepth._tempCopyDepthCommand = context.createViewportQuadCommand(PassThroughDepth, {
                uniformMap : {
                    u_depthTexture : function() {
                        return globeDepth._tempCopyDepthTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._tempCopyDepthCommand.framebuffer = globeDepth._tempCopyDepthFramebuffer;
        globeDepth._tempCopyDepthCommand.renderState = globeDepth._rs;

        if (!defined(globeDepth._updateDepthCommand)) {
            globeDepth._updateDepthCommand = context.createViewportQuadCommand(PassThrough, {
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._tempGlobeDepthTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._updateDepthCommand.framebuffer = globeDepth._updateDepthFramebuffer;
        globeDepth._updateDepthCommand.renderState = globeDepth._rsUpdate;

        if (!defined(globeDepth._clearColorCommand)) {
            globeDepth._clearColorCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                stencil : 0.0,
                owner : globeDepth
            });
        }

        globeDepth._clearColorCommand.framebuffer = globeDepth.framebuffer;
    }

    GlobeDepth.prototype.executeDebugGlobeDepth = function(context, passState, useLogDepth) {
        executeDebugGlobeDepth(this, context, passState, useLogDepth);
    };

    GlobeDepth.prototype.update = function(context, passState, viewport, hdr) {
        var width = viewport.width;
        var height = viewport.height;

        updateFramebuffers(this, context, width, height, hdr);
        updateCopyCommands(this, context, width, height, passState);
        context.uniformState.globeDepthTexture = undefined;

        this._useHdr = hdr;
    };

    GlobeDepth.prototype.executeCopyDepth = function(context, passState) {
        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
            context.uniformState.globeDepthTexture = this._globeDepthTexture;
        }
    };

    GlobeDepth.prototype.executeUpdateDepth = function(context, passState, clearGlobeDepth) {
        var depthTextureToCopy = passState.framebuffer.depthStencilTexture;
        if (clearGlobeDepth || (depthTextureToCopy !== this._depthStencilTexture)) {
            // First copy the depth to a temporary globe depth texture, then update the
            // main globe depth texture where the stencil bit for 3D Tiles is set.
            // This preserves the original globe depth except where 3D Tiles is rendered.
            // The additional texture and framebuffer resources are created on demand.
            if (defined(this._updateDepthCommand)) {
                if (!defined(this._updateDepthFramebuffer) ||
                    (this._updateDepthFramebuffer.depthStencilTexture !== depthTextureToCopy) ||
                    (this._updateDepthFramebuffer.getColorTexture(0) !== this._globeDepthTexture)) {
                    var width = this._globeDepthTexture.width;
                    var height = this._globeDepthTexture.height;
                    destroyUpdateDepthResources(this);
                    createUpdateDepthResources(this, context, width, height, passState);
                    updateCopyCommands(this, context, width, height, passState);
                }
                this._tempCopyDepthTexture = depthTextureToCopy;
                this._tempCopyDepthCommand.execute(context, passState);
                this._updateDepthCommand.execute(context, passState);
            }
            return;
        }

        // Fast path - the depth texture can be copied normally.
        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.executeCopyColor = function(context, passState) {
        if (defined(this._copyColorCommand)) {
            this._copyColorCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.clear = function(context, passState, clearColor) {
        var clear = this._clearColorCommand;
        if (defined(clear)) {
            Color.clone(clearColor, clear.color);
            clear.execute(context, passState);
        }
    };

    GlobeDepth.prototype.isDestroyed = function() {
        return false;
    };

    GlobeDepth.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);
        destroyUpdateDepthResources(this);

        if (defined(this._copyColorCommand)) {
            this._copyColorCommand.shaderProgram = this._copyColorCommand.shaderProgram.destroy();
        }

        if (defined(this._copyDepthCommand)) {
            this._copyDepthCommand.shaderProgram = this._copyDepthCommand.shaderProgram.destroy();
        }

        var command = this._debugGlobeDepthViewportCommand;
        if (defined(command)) {
            command.shaderProgram = command.shaderProgram.destroy();
        }

        return destroyObject(this);
    };

    return GlobeDepth;
});
