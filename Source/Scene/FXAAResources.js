/*global define*/
define([
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Color',
        '../Renderer/createShaderSource',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/PixelFormat',
        '../Renderer/RenderbufferFormat',
        '../Shaders/PostProcessFilters/FXAA'
    ], function(
        defined,
        destroyObject,
        Cartesian2,
        Color,
        createShaderSource,
        ClearCommand,
        PixelDatatype,
        PixelFormat,
        RenderbufferFormat,
        FXAAFS) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var FXAAResources = function(context) {
        this.enabled = false;

        this._fxaaTexture = undefined;
        this._fxaaDepthTexture = undefined;
        this._fxaaDepthRenderbuffer = undefined;
        this._fxaaFBO = undefined;
        this._fxaaCommand = undefined;

        var fxaaClearCommand = new ClearCommand();
        fxaaClearCommand.color = new Color(0.0, 0.0, 0.0, 0.0);
        fxaaClearCommand.depth = 1.0;
        fxaaClearCommand.owner = this;
        this._fxaaClearCommand = fxaaClearCommand;
    };

    function destroyResources(that) {
        that._fxaaFBO = that._fxaaFBO && that._fxaaFBO.destroy();
        that._fxaaTexture = that._fxaaTexture && that._fxaaTexture.destroy();
        that._fxaaDepthTexture = that._fxaaDepthTexture && that._fxaaDepthTexture.destroy();
        that._fxaaDepthRenderbuffer = that._fxaaDepthRenderbuffer && that._fxaaDepthRenderbuffer.destroy();

        that._fxaaFBO = undefined;
        that._fxaaTexture = undefined;
        that._fxaaDepthTexture = undefined;
        that._fxaaDepthRenderbuffer = undefined;

        if (defined(that._fxaaCommand)) {
            that._fxaaCommand.shaderProgram = that._fxaaCommand.shaderProgram && that._fxaaCommand.shaderProgram.release();
            that._fxaaCommand = undefined;
        }
    }

    FXAAResources.prototype.update = function(context) {
        if (!this.enabled) {
            if (defined(this._fxaaTexture)) {
                destroyResources(this);
            }

            return;
        }

        var width = context.getDrawingBufferWidth();
        var height = context.getDrawingBufferHeight();

        var fxaaTexture = this._fxaaTexture;
        var textureChanged = !defined(fxaaTexture) || fxaaTexture.getWidth() !== width || fxaaTexture.getHeight() !== height;
        if (textureChanged) {
            this._fxaaTexture = this._fxaaTexture && this._fxaaTexture.destroy();
            this._fxaaDepthTexture = this._fxaaDepthTexture && this._fxaaDepthTexture.destroy();
            this._fxaaDepthRenderbuffer = this._fxaaDepthRenderbuffer && this._fxaaDepthRenderbuffer.destroy();

            this._fxaaTexture = context.createTexture2D({
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGB,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });

            if (context.getDepthTexture()) {
                this._fxaaDepthTexture = context.createTexture2D({
                    width : width,
                    height : height,
                    pixelFormat : PixelFormat.DEPTH_COMPONENT,
                    pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                });
            } else {
                this._fxaaDepthRenderbuffer = context.createRenderbuffer({
                    width : width,
                    height : height,
                    format : RenderbufferFormat.DEPTH_COMPONENT16
                });
            }
        }

        if (!defined(this._fxaaFBO) || textureChanged) {
            this._fxaaFBO = this._fxaaFBO && this._fxaaFBO.destroy();

            this._fxaaFBO = context.createFramebuffer({
                colorTextures : [this._fxaaTexture],
                depthTexture : this._fxaaDepthTexture,
                depthRenderbuffer : this._depthRenderbuffer,
                destroyAttachments : false
            });
        }

        if (!defined(this._fxaaCommand)) {
            var fs = createShaderSource({
                sources : [FXAAFS]
            });

            this._fxaaCommand = context.createViewportQuadCommand(fs, context.createRenderState());
        }

        if (textureChanged) {
            var that = this;
            var step = new Cartesian2(1.0 / this._fxaaTexture.getWidth(), 1.0 / this._fxaaTexture.getHeight());
            this._fxaaCommand.uniformMap = {
                u_texture : function() {
                    return that._fxaaTexture;
                },
                u_step : function() {
                    return step;
                }
            };
        }
    };

    FXAAResources.prototype.execute = function(context, passState) {
        if (!this.enabled) {
            return;
        }

        this._fxaaCommand.execute(context, passState);
    };

    FXAAResources.prototype.clear = function(context, passState, clearColor) {
        if(!this.enabled) {
            return;
        }

        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fxaaFBO;
        Color.clone(clearColor, this._fxaaClearCommand.color);
        this._fxaaClearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    FXAAResources.prototype.getColorFBO = function() {
        if (!this.enabled) {
            return undefined;
        }

        return this._fxaaFBO;
    };

    FXAAResources.prototype.isDestroyed = function() {
        return false;
    };

    FXAAResources.prototype.destroy = function() {
        destroyResources(this);
        return destroyObject(this);
    };

    return FXAAResources;
});
