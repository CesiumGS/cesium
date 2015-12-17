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
        '../Renderer/Texture',
        '../Shaders/PostProcessFilters/FXAA'
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
        Texture,
        FXAAFS) {
    "use strict";

    /**
     * @private
     */
    function FXAA(context) {
        this._texture = undefined;
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;
        this._fbo = undefined;
        this._command = undefined;

        this._viewport = new BoundingRectangle();
        this._rs = undefined;

        var clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0),
            depth : 1.0,
            owner : this
        });
        this._clearCommand = clearCommand;
    }

    function destroyResources(fxaa) {
        fxaa._fbo = fxaa._fbo && fxaa._fbo.destroy();
        fxaa._texture = fxaa._texture && fxaa._texture.destroy();
        fxaa._depthTexture = fxaa._depthTexture && fxaa._depthTexture.destroy();
        fxaa._depthRenderbuffer = fxaa._depthRenderbuffer && fxaa._depthRenderbuffer.destroy();

        fxaa._fbo = undefined;
        fxaa._texture = undefined;
        fxaa._depthTexture = undefined;
        fxaa._depthRenderbuffer = undefined;

        if (defined(fxaa._command)) {
            fxaa._command.shaderProgram = fxaa._command.shaderProgram && fxaa._command.shaderProgram.destroy();
            fxaa._command = undefined;
        }
    }

    FXAA.prototype.update = function(context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var fxaaTexture = this._texture;
        var textureChanged = !defined(fxaaTexture) || fxaaTexture.width !== width || fxaaTexture.height !== height;
        if (textureChanged) {
            this._texture = this._texture && this._texture.destroy();
            this._depthTexture = this._depthTexture && this._depthTexture.destroy();
            this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();

            this._texture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });

            if (context.depthTexture) {
                this._depthTexture = new Texture({
                    context : context,
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                });
            } else {
                this._depthRenderbuffer = new Renderbuffer({
                    context : context,
                    width : width,
                    height : height,
                    format : RenderbufferFormat.DEPTH_COMPONENT16
                });
            }
        }

        if (!defined(this._fbo) || textureChanged) {
            this._fbo = this._fbo && this._fbo.destroy();

            this._fbo = new Framebuffer({
                context : context,
                colorTextures : [this._texture],
                depthTexture : this._depthTexture,
                depthRenderbuffer : this._depthRenderbuffer,
                destroyAttachments : false
            });
        }

        if (!defined(this._command)) {
            this._command = context.createViewportQuadCommand(FXAAFS, {
                owner : this
            });
        }

        this._viewport.width = width;
        this._viewport.height = height;

        if (!defined(this._rs) || !BoundingRectangle.equals(this._rs.viewport, this._viewport)) {
            this._rs = RenderState.fromCache({
                viewport : this._viewport
            });
        }

        this._command.renderState = this._rs;

        if (textureChanged) {
            var that = this;
            var step = new Cartesian2(1.0 / this._texture.width, 1.0 / this._texture.height);
            this._command.uniformMap = {
                u_texture : function() {
                    return that._texture;
                },
                u_step : function() {
                    return step;
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
