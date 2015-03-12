/*global define*/
define([
        '../Core/Color',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/PixelFormat',
        '../Renderer/ClearCommand',
        '../Renderer/PixelDatatype',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter'
    ], function(
        Color,
        defined,
        destroyObject,
        PixelFormat,
        ClearCommand,
        PixelDatatype,
        TextureMagnificationFilter,
        TextureMinificationFilter) {
    "use strict";
    /*global WebGLRenderingContext*/

    /**
     * @private
     */
    var GlobeDepth = function(context) {
        this._colorTexture = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilGlobeTest = undefined;

        this.framebuffer = undefined;
        this._copyDepthFramebuffer = undefined;

        var supported = updateFramebuffers(this, context);
        if (supported) {
            updateCopyCommands(this, context);
        }

        this.supported = supported;
    };

    function destroyTextures(globeDepth) {
        globeDepth._colorTexture = globeDepth._colorTexture && !globeDepth._colorTexture.isDestroyed() && globeDepth._colorTexture.destroy();
        globeDepth._depthStencilTexture = globeDepth._depthStencilTexture && !globeDepth._depthStencilTexture.isDestroyed() && globeDepth._depthStencilTexture.destroy();
        globeDepth._depthStencilGlobeTest = globeDepth._depthStencilGlobeTest && !globeDepth._depthStencilGlobeTest.isDestroyed() && globeDepth._depthStencilGlobeTest.destroy();
    }

    function destroyFramebuffers(globeDepth) {
        globeDepth.framebuffer = globeDepth.framebuffer && !globeDepth.framebuffer.isDestroyed() && globeDepth.framebuffer.destroy();
        globeDepth._copyDepthFramebuffer = globeDepth._copyDepthFramebuffer && !globeDepth._copyDepthFramebuffer.isDestroyed() && globeDepth._copyDepthFramebuffer.destroy();
    }

    function createTextures(globeDepth, context, width, height) {
        globeDepth._colorTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE
        });
        globeDepth._colorTexture.sampler = context.createSampler({
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        });

        globeDepth._depthStencilTexture = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.DEPTH_STENCIL,
            pixelDatatype : PixelDatatype.UNSIGNED_INT_24_8_WEBGL
        });
        globeDepth._depthStencilGlobeTest = context.createTexture2D({
            width : width,
            height : height,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.FLOAT
        });
    }

    function createFramebuffers(globeDepth, context, width, height) {
        destroyTextures(globeDepth);
        destroyFramebuffers(globeDepth);

        createTextures(globeDepth, context, width, height);

        globeDepth.framebuffer = context.createFramebuffer({
            colorTextures : [globeDepth._colorTexture],
            depthStencilTexture : globeDepth._depthStencilTexture,
            destroyAttachments : false
        });

        globeDepth._copyDepthFramebuffer = context.createFramebuffer({
            colorTextures : [globeDepth._depthStencilGlobeTest],
            destroyAttachments : false
        });

        var complete = WebGLRenderingContext.FRAMEBUFFER_COMPLETE;
        if (globeDepth.framebuffer.status !== complete || globeDepth._copyDepthFramebuffer.status !== complete) {
            destroyTextures(globeDepth);
            destroyFramebuffers(globeDepth);
            return false;
        }

        return true;
    }

    function updateFramebuffers(globeDepth, context) {
        if (!context.depthTexture) {
            return;
        }

        var width = context.drawingBufferWidth;
        var height = context.drawingBufferHeight;

        var colorTexture = globeDepth._colorTexture;
        var textureChanged = !defined(colorTexture) || colorTexture.width !== width || colorTexture.height !== height;
        if (!defined(globeDepth.framebuffer) || textureChanged) {
            if (!createFramebuffers(globeDepth, context, width, height)) {
                // framebuffer creation failed
                return false;
            }
        }

        context.uniformState.globeDepthTexture = globeDepth._depthStencilGlobeTest;

        return true;
    }

    function updateCopyCommands(globeDepth, context) {
        if (!defined(globeDepth._copyDepthCommand)) {
            var copyDepthFS =
                'uniform sampler2D depthTexture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main() { gl_FragColor = vec4(texture2D(depthTexture, v_textureCoordinates).r); }\n';
            globeDepth._copyDepthCommand = context.createViewportQuadCommand(copyDepthFS, {
                renderState : context.createRenderState(),
                uniformMap : {
                    depthTexture : function() {
                        return globeDepth._depthStencilTexture;
                    }
                },
                owner : globeDepth
            });
        }

        globeDepth._copyDepthCommand.framebuffer = globeDepth._copyDepthFramebuffer;

        if (!defined(globeDepth._copyColorCommand)) {
            var copyColorFS =
                'uniform sampler2D colorTexture;\n' +
                'varying vec2 v_textureCoordinates;\n' +
                'void main() { gl_FragColor = texture2D(colorTexture, v_textureCoordinates); }\n';
            globeDepth._copyColorCommand = context.createViewportQuadCommand(copyColorFS, {
                renderState : context.createRenderState(),
                uniformMap : {
                    colorTexture : function() {
                        return globeDepth._colorTexture;
                    }
                },
                owner : globeDepth
            });
        }

        if (!defined(globeDepth._clearColorCommand)) {
            globeDepth._clearColorCommand = new ClearCommand({
                color : new Color(0.0, 0.0, 0.0, 0.0),
                owner : globeDepth
            });
        }

        globeDepth._clearColorCommand.framebuffer = globeDepth.framebuffer;
    }

    GlobeDepth.prototype.update = function(context) {
        if (!this.supported) {
            return;
        }

        updateFramebuffers(this, context);
        updateCopyCommands(this, context);
    };

    GlobeDepth.prototype.getFramebuffer = function() {
        return this._frambuffer;
    };

    GlobeDepth.prototype.executeCopyDepth = function(context, passState) {
        if (this.supported && defined(this._copyDepthCommand)) {
            this._copyDepthCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.executeCopyColor = function(context, passState) {
        if (this.supported && defined(this._copyColorCommand)) {
            this._copyColorCommand.execute(context, passState);
        }
    };

    GlobeDepth.prototype.clear = function(context, passState, clearColor) {
        if (this.supported) {
            var clear = this._clearColorCommand;
            Color.clone(clearColor, clear.color);
            clear.execute(context, passState);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see GlobeDepth#destroy
     */
    GlobeDepth.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see GlobeDepth#isDestroyed
     */
    GlobeDepth.prototype.destroy = function() {
        destroyTextures(this);
        destroyFramebuffers(this);
        return destroyObject(this);
    };

    return GlobeDepth;
});