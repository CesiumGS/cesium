define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/PixelDatatype',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/Texture'
    ], function(
        BoundingRectangle,
        Color,
        defaultValue,
        defined,
        destroyObject,
        PixelFormat,
        Framebuffer,
        PassState,
        PixelDatatype,
        Renderbuffer,
        RenderbufferFormat,
        Texture) {
    'use strict';

    /**
     * @private
     */
    function PickDepthFramebuffer() {
        this._depthStencilTexture = undefined;
        this._framebuffer = undefined;
        this._passState = undefined;
    }

    function destroyResources(pickDepth) {
        pickDepth._framebuffer = pickDepth._framebuffer && pickDepth._framebuffer.destroy();
        pickDepth._depthStencilTexture = pickDepth._depthStencilTexture && pickDepth._depthStencilTexture.destroy();
    }

    function createResources(pickDepth, context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        pickDepth._depthStencilTexture = new Texture({
            context : context,
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8
        });

        pickDepth._framebuffer = new Framebuffer({
            context : context,
            depthStencilTexture : pickDepth._depthStencilTexture,
            destroyAttachments : false
        });

        var passState = new PassState(context);
        passState.blendingEnabled = false;
        passState.scissorTest = {
            enabled : true,
            rectangle : new BoundingRectangle()
        };
        passState.viewport = new BoundingRectangle();
        pickDepth._passState = passState;
    }

    PickDepthFramebuffer.prototype.update = function(context, drawingBufferPosition, viewport) {
        var width = viewport.width;
        var height = viewport.height;

        if (!defined(this._framebuffer) || width !== this._depthStencilTexture.width || height !== this._depthStencilTexture.height) {
            destroyResources(this);
            createResources(this, context);
        }

        var framebuffer = this._framebuffer;
        var passState = this._passState;
        passState.framebuffer = framebuffer;
        passState.viewport.width = width;
        passState.viewport.height = height;
        passState.scissorTest.rectangle.x = drawingBufferPosition.x;
        passState.scissorTest.rectangle.y = height - drawingBufferPosition.y;
        passState.scissorTest.rectangle.width = 1;
        passState.scissorTest.rectangle.height = 1;

        return passState;
    };

    PickDepthFramebuffer.prototype.isDestroyed = function() {
        return false;
    };

    PickDepthFramebuffer.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return PickDepthFramebuffer;
});
