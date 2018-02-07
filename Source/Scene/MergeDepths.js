define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/Framebuffer',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Texture',
        '../Shaders/PostProcessStages/MergeDepthsPacked'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        Framebuffer,
        PixelDatatype,
        RenderState,
        Texture,
        MergeDepthsPacked) {
    'use strict';

    /**
     * @private
     */
    function MergeDepths() {
        this.framebuffer = undefined;

        this._frustum = undefined;
        this._depthTexture = undefined;
        this._textureToMerge = undefined;
        this._mergeDepthCommand = undefined;

        this._clearCommand = new ClearCommand({
            color : new Color(0.0, 0.0, 0.0, 0.0)
        });
    }

    function updateFramebuffer(mergeDepths, context) {
        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var depthTexture = mergeDepths._depthTexture;
        var textureChanged = !defined(depthTexture) || depthTexture.width !== width || depthTexture.height !== height;
        if (textureChanged) {
            mergeDepths._depthTexture = mergeDepths._depthTexture && mergeDepths._depthTexture.destroy();
            mergeDepths.framebuffer = mergeDepths.framebuffer && mergeDepths.framebuffer.destroy();

            mergeDepths._depthTexture = new Texture({
                context : context,
                width : width,
                height : height,
                pixelFormat : PixelFormat.RGBA,
                pixelDatatype : PixelDatatype.UNSIGNED_BYTE
            });
            mergeDepths.framebuffer = new Framebuffer({
                context : context,
                colorTextures : [mergeDepths._depthTexture],
                destroyAttachments : false
            });
        }
    }

    function updateMergeCommand(mergeDepths, context) {
        if (defined(mergeDepths._mergeDepthCommand)) {
            return;
        }
        mergeDepths._mergeDepthCommand = context.createViewportQuadCommand(MergeDepthsPacked, {
            renderState : RenderState.fromCache(),
            uniformMap : {
                depthTexture : function() {
                    return mergeDepths._textureToMerge;
                },
                frustum : function() {
                    return mergeDepths._frustum;
                }
            },
            owner : mergeDepths
        });
    }

    MergeDepths.prototype.execute = function(context, depths, frustumCommandsList) {
        updateFramebuffer(this, context);
        updateMergeCommand(this, context);

        this._clearCommand.framebuffer = this.framebuffer;
        this._clearCommand.execute(context);

        var mergeCommand = this._mergeDepthCommand;
        mergeCommand.framebuffer = this.framebuffer;

        var numberOfFrustums = frustumCommandsList.length;

        for (var i = numberOfFrustums - 1; i >= 0; --i) {
            this._frustum = i / numberOfFrustums;
            this._textureToMerge = depths[i].framebuffer.getColorTexture(0);
            mergeCommand.execute(context);
        }
    };

    MergeDepths.prototype.isDestroyed = function() {
        return false;
    };

    MergeDepths.prototype.destroy = function() {
        this._depthTexture = this._depthTexture && this._depthTexture.destroy();
        this.framebuffer = this.framebuffer && this.framebuffer.destroy();

        if (defined(this._mergeDepthCommand)) {
            this._mergeDepthCommand.shaderProgram.destroy();
        }
        return destroyObject(this);
    };

    return MergeDepths;
});
