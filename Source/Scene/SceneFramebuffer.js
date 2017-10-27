define([
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
        '../Renderer/TextureWrap'
    ], function(
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
        TextureWrap) {
    'use strict';

    /**
     * @private
     */
    function SceneFramebuffer() {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._fbo = undefined;

        this._clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            owner : this
        });
    }

    function destroyResources(post) {
        post._fbo = post._fbo && post._fbo.destroy();
        post._colorTexture = post._colorTexture && post._colorTexture.destroy();
        post._depthStencilTexture = post._depthStencilTexture && post._depthStencilTexture.destroy();
        post._depthStencilRenderbuffer = post._depthStencilRenderbuffer && post._depthStencilRenderbuffer.destroy();

        post._fbo = undefined;
        post._colorTexture = undefined;
        post._depthStencilTexture = undefined;
        post._depthStencilRenderbuffer = undefined;
    }

    SceneFramebuffer.prototype.update = function(context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var colorTexture = this._colorTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height;
        if (textureChanged) {
            this._colorTexture = this._colorTexture && this._colorTexture.destroy();
            this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
            this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

            this._colorTexture = new Texture({
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
                colorTextures : [this._colorTexture],
                depthStencilTexture : this._depthStencilTexture,
                depthStencilRenderbuffer : this._depthStencilRenderbuffer,
                destroyAttachments : false
            });
        }
    };

    SceneFramebuffer.prototype.clear = function(context, passState, clearColor) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fbo;
        Color.clone(clearColor, this._clearCommand.color);
        this._clearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    SceneFramebuffer.prototype.getFramebuffer = function() {
        return this._fbo;
    };

    SceneFramebuffer.prototype.isDestroyed = function() {
        return false;
    };

    SceneFramebuffer.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return SceneFramebuffer;
});
