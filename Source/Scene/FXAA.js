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
    var FXAA = function(context) {
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

    function destroyResources(fxaa) {
        fxaa._fxaaFBO = fxaa._fxaaFBO && fxaa._fxaaFBO.destroy();
        fxaa._fxaaTexture = fxaa._fxaaTexture && fxaa._fxaaTexture.destroy();
        fxaa._fxaaDepthTexture = fxaa._fxaaDepthTexture && fxaa._fxaaDepthTexture.destroy();
        fxaa._fxaaDepthRenderbuffer = fxaa._fxaaDepthRenderbuffer && fxaa._fxaaDepthRenderbuffer.destroy();

        fxaa._fxaaFBO = undefined;
        fxaa._fxaaTexture = undefined;
        fxaa._fxaaDepthTexture = undefined;
        fxaa._fxaaDepthRenderbuffer = undefined;

        if (defined(fxaa._fxaaCommand)) {
            fxaa._fxaaCommand.shaderProgram = fxaa._fxaaCommand.shaderProgram && fxaa._fxaaCommand.shaderProgram.release();
            fxaa._fxaaCommand = undefined;
        }
    }

    FXAA.prototype.update = function(context) {
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

            this._fxaaCommand = context.createViewportQuadCommand(fs, {
                renderState : context.createRenderState(),
                owner : this
            });
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

    FXAA.prototype.execute = function(context, passState) {
        if (!this.enabled) {
            return;
        }

        this._fxaaCommand.execute(context, passState);
    };

    FXAA.prototype.clear = function(context, passState, clearColor) {
        if(!this.enabled) {
            return;
        }

        var framebuffer = passState.framebuffer;

        passState.framebuffer = this._fxaaFBO;
        Color.clone(clearColor, this._fxaaClearCommand.color);
        this._fxaaClearCommand.execute(context, passState);

        passState.framebuffer = framebuffer;
    };

    FXAA.prototype.getColorFramebuffer = function() {
        return this._fxaaFBO;
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
