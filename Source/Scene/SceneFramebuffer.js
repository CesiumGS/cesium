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
        this._idTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._framebuffer = undefined;
        this._idFramebuffer = undefined;

        this._idClearColor = new Color(0.0, 0.0, 0.0, 0.0);
        this._clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            owner : this
        });
    }

    function destroyResources(post) {
        post._framebuffer = post._framebuffer && post._framebuffer.destroy();
        post._idFramebuffer = post._idFramebuffer && post._idFramebuffer.destroy();
        post._colorTexture = post._colorTexture && post._colorTexture.destroy();
        post._idTexture = post._idTexture && post._idTexture.destroy();
        post._depthStencilTexture = post._depthStencilTexture && post._depthStencilTexture.destroy();
        post._depthStencilRenderbuffer = post._depthStencilRenderbuffer && post._depthStencilRenderbuffer.destroy();
        post._depthStencilIdTexture = post._depthStencilIdTexture && post._depthStencilIdTexture.destroy();
        post._depthStencilIdRenderbuffer = post._depthStencilIdRenderbuffer && post._depthStencilIdRenderbuffer.destroy();

        post._framebuffer = undefined;
        post._idFramebuffer = undefined;
        post._colorTexture = undefined;
        post._idTexture = undefined;
        post._depthStencilTexture = undefined;
        post._depthStencilRenderbuffer = undefined;
        post._depthStencilIdTexture = undefined;
        post._depthStencilIdRenderbuffer = undefined;
    }

    SceneFramebuffer.prototype.update = function(context, viewport) {
        var width = viewport.width;
        var height = viewport.height;
        var colorTexture = this._colorTexture;
        if (defined(colorTexture) && colorTexture.width === width && colorTexture.height === height) {
            return;
        }

        destroyResources(this);

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

        this._idTexture = new Texture({
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
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
            this._depthStencilIdTexture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.DEPTH_STENCIL,
                pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8,
                sampler : new Sampler({
                    wrapS : TextureWrap.CLAMP_TO_EDGE,
                    wrapT : TextureWrap.CLAMP_TO_EDGE,
                    minificationFilter : TextureMinificationFilter.NEAREST,
                    magnificationFilter : TextureMagnificationFilter.NEAREST
                })
            });
        } else {
            this._depthStencilRenderbuffer = new Renderbuffer({
                context : context,
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_STENCIL
            });
            this._depthStencilIdRenderbuffer = new Renderbuffer({
                context : context,
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_STENCIL
            });
        }

        this._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [this._colorTexture],
            depthStencilTexture : this._depthStencilTexture,
            depthStencilRenderbuffer : this._depthStencilRenderbuffer,
            destroyAttachments : false
        });

        this._idFramebuffer = new Framebuffer({
            context : context,
            colorTextures : [this._idTexture],
            depthStencilTexture : this._depthStencilIdTexture,
            depthStencilRenderbuffer : this._depthStencilIdRenderbuffer,
            destroyAttachments : false
        });
    };

    SceneFramebuffer.prototype.clear = function(context, passState, clearColor) {
        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._framebuffer;
        Color.clone(clearColor, this._clearCommand.color);
        this._clearCommand.execute(context, passState);

        passState.framebuffer = this._idFramebuffer;
        Color.clone(this._idClearColor, this._clearCommand.color);
        this._clearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    SceneFramebuffer.prototype.getFramebuffer = function() {
        return this._framebuffer;
    };

    SceneFramebuffer.prototype.getIdFramebuffer = function() {
        return this._idFramebuffer;
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
