define([
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap',
        '../Scene/DerivedCommand',
        '../Scene/PickDepth'
    ], function(
        Cartesian3,
        Cartesian4,
        BoundingRectangle,
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PassState,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap,
        DerivedCommand,
        PickDepth) {
    'use strict';

    /**
     * @private
     */
    function PickOffscreenFramebuffer() {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;
        this._framebuffer = undefined;
        this._clearCommand = undefined;
        this._passState = undefined;
    }

    function destroyResources(picker) {
        picker._framebuffer = picker._framebuffer && picker._framebuffer.destroy();
        picker._colorTexture = picker._colorTexture && picker._colorTexture.destroy();
        picker._depthStencilTexture = picker._depthStencilTexture && picker._depthStencilTexture.destroy();
        picker._depthStencilRenderbuffer = picker._depthStencilRenderbuffer && picker._depthStencilRenderbuffer.destroy();
    }

    function createResources(picker, context) {
        var width = 1;
        var height = 1;

        picker._colorTexture = new Texture({
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
            picker._depthStencilTexture = new Texture({
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
            picker._depthStencilRenderbuffer = new Renderbuffer({
                context : context,
                width : width,
                height : height,
                format : RenderbufferFormat.DEPTH_STENCIL
            });
        }

        picker._framebuffer = new Framebuffer({
            context : context,
            colorTextures : [picker._colorTexture],
            depthStencilTexture : picker._depthStencilTexture,
            depthStencilRenderbuffer : picker._depthStencilRenderbuffer,
            destroyAttachments : false
        });

        var passState = new PassState(context);
        passState.framebuffer = picker._framebuffer;
        passState.viewport = new BoundingRectangle(0, 0, width, height);
        picker._passState = passState;

        picker._clearCommand = new ClearCommand({
            depth : 1.0,
            color : new Color(),
            owner : this
        });

        picker._pickDepth = new PickDepth();
    }

    PickOffscreenFramebuffer.prototype.begin = function(frameState) {
        var context = frameState.context;
        if (!defined(this._framebuffer)) {
            createResources(this, context);
        }

        return this._passState;
    };

    var scratchColor = new Color();

    PickOffscreenFramebuffer.prototype.end = function(context) {
        var pixels = context.readPixels({
            x : 0,
            y : 0,
            width : 1,
            height : 1,
            framebuffer : this._framebuffer
        });

        var pickColor = scratchColor;
        pickColor.red = Color.byteToFloat(pixels[0]);
        pickColor.green = Color.byteToFloat(pixels[1]);
        pickColor.blue = Color.byteToFloat(pixels[2]);
        pickColor.alpha = Color.byteToFloat(pixels[3]);

        return context.getObjectByPickColor(pickColor);
    };

    PickOffscreenFramebuffer.prototype.isDestroyed = function() {
        return false;
    };

    PickOffscreenFramebuffer.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PickOffscreenFramebuffer;
});
