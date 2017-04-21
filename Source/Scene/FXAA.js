/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Cartesian2',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Shaders/PostProcessFilters/FXAA',
        '../ThirdParty/Shaders/FXAA3_11'
    ], function(
        BoundingRectangle,
        Cartesian2,
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        FXAAFS,
        FXAA3_11) {
    'use strict';

    /**
     * @private
     */
    function FXAA() {
        this._texture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._fbo = undefined;
        this._command = undefined;

        this._viewport = new BoundingRectangle();
        this._rs = undefined;

        this._useScissorTest = false;
        this._scissorRectangle = undefined;

        var clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            owner : this
        });
        this._clearCommand = clearCommand;

        this._qualityPreset = 39;
    }

    function destroyResources(fxaa) {
        fxaa._fbo = fxaa._fbo && fxaa._fbo.destroy();
        fxaa._texture = fxaa._texture && fxaa._texture.destroy();
        fxaa._depthStencilTexture = fxaa._depthStencilTexture && fxaa._depthStencilTexture.destroy();
        fxaa._depthStencilRenderbuffer = fxaa._depthStencilRenderbuffer && fxaa._depthStencilRenderbuffer.destroy();

        fxaa._fbo = undefined;
        fxaa._texture = undefined;
        fxaa._depthStencilTexture = undefined;
        fxaa._depthStencilRenderbuffer = undefined;

        if (defined(fxaa._command)) {
            fxaa._command.shaderProgram = fxaa._command.shaderProgram && fxaa._command.shaderProgram.destroy();
            fxaa._command = undefined;
        }
    }

    FXAA.prototype.update = function(context, passState) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var fxaaTexture = this._texture;
        var textureChanged = !defined(fxaaTexture) || fxaaTexture.width !== width || fxaaTexture.height !== height;
        if (textureChanged) {
            this._texture = this._texture && this._texture.destroy();
            this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
            this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

            this._texture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.LINEAR,
                    magnificationFilter : TextureMagnificationFilter.LINEAR
                })
            });

            if (context.depthTexture) {
                this._depthStencilTexture = new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_STENCIL,
                    pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
                });
            } else {
                this._depthStencilRenderbuffer = new Renderbuffer({
                    context : context,
                    width : width,
                    height : height,
                    format : RenderbufferFormat.DEPTH_STENCIL
                });
            }
        }

        if (!defined(this._fbo) || textureChanged) {
            this._fbo = this._fbo && this._fbo.destroy();

            this._fbo = new Framebuffer({
                context : context,
                colorTextures : [this._texture],
                depthStencilTexture : this._depthStencilTexture,
                depthStencilRenderbuffer : this._depthStencilRenderbuffer,
                destroyAttachments : false
            });
        }

        if (!defined(this._command)) {
            var fs =
                '#define FXAA_QUALITY_PRESET ' + this._qualityPreset + '\n' +
                FXAA3_11 + '\n' +
                FXAAFS;

            this._command = context.createViewportQuadCommand(fs, {
                owner : this
            });
        }

        this._viewport.width = width;
        this._viewport.height = height;

        var useScissorTest = !BoundingRectangle.equals(this._viewport, passState.viewport);
        var updateScissor = useScissorTest !== this._useScissorTest;
        this._useScissorTest = useScissorTest;

        if (!BoundingRectangle.equals(this._scissorRectangle, passState.viewport)) {
            this._scissorRectangle = BoundingRectangle.clone(passState.viewport, this._scissorRectangle);
            updateScissor = true;
        }

        if (!defined(this._rs) || !BoundingRectangle.equals(this._rs.viewport, this._viewport) || updateScissor) {
            this._rs = RenderState.fromCache({
                viewport : this._viewport,
                scissorTest : {
                    enabled : this._useScissorTest,
                    rectangle : this._scissorRectangle
                }
            });
        }

        this._command.renderState = this._rs;

        if (textureChanged) {
            var that = this;
            var rcpFrame = new Cartesian2(1.0 / this._texture.width, 1.0 / this._texture.height);
            this._command.uniformMap = {
                u_texture : function() {
                    return that._texture;
                },
                u_fxaaQualityRcpFrame : function() {
                    return rcpFrame;
                }
            };
        }
    };

    FXAA.prototype.execute = function(context, passState) {
        this._command.execute(context, passState);
    };

    FXAA.prototype.clear = function(context, passState, clearColor) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fbo;
        Color.clone(clearColor, this._clearCommand.color);
        this._clearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    FXAA.prototype.getColorFramebuffer = function() {
        return this._fbo;
    };

    FXAA.prototype.isDestroyed = function() {
        return false;
    };

    FXAA.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return FXAA;
});
