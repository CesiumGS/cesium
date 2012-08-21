/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject'
    ], function(
        DeveloperError,
        destroyObject) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Framebuffer
     *
     * @see Context#createFramebuffer
     *
     * @internalConstructor
     */
    var Framebuffer = function(gl, description) {
        this._gl = gl;
        this._framebuffer = gl.createFramebuffer();

        this._colorTexture = undefined;
        this._colorRenderbuffer = undefined;
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;
        this._stencilRenderbuffer = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;

        if (description) {
            // Throw if a texture and renderbuffer are attached to the same point.  This won't
            // cause a WebGL error (because only one will be attached), but is likely a developer error.

            if (description.colorTexture && description.colorRenderbuffer) {
                throw new DeveloperError('Cannot have both a color texture and color renderbuffer attachment.');
            }

            if (description.depthTexture && description.depthRenderbuffer) {
                throw new DeveloperError('Cannot have both a depth texture and depth renderbuffer attachment.');
            }

            if (description.depthStencilTexture && description.depthStencilRenderbuffer) {
                throw new DeveloperError('Cannot have both a depth-stencil texture and depth-stencil renderbuffer attachment.');
            }

            // Avoid errors defined in Section 6.5 of the WebGL spec
            var depthAttachment = (description.depthTexture || description.depthRenderbuffer);
            var depthStencilAttachment = (description.depthStencilTexture || description.depthStencilRenderbuffer);

            if (depthAttachment && depthStencilAttachment) {
                throw new DeveloperError('Cannot have both a depth and depth-stencil attachment.');
            }

            if (description.stencilRenderbuffer && depthStencilAttachment) {
                throw new DeveloperError('Cannot have both a stencil and depth-stencil attachment.');
            }

            if (depthAttachment && description.stencilRenderbuffer) {
                throw new DeveloperError('Cannot have both a depth and stencil attachment.');
            }

            ///////////////////////////////////////////////////////////////////

            if (description.colorTexture) {
                this.setColorTexture(description.colorTexture);
            }

            if (description.colorRenderbuffer) {
                this.setColorRenderbuffer(description.colorRenderbuffer);
            }

            if (description.depthTexture) {
                this.setDepthTexture(description.depthTexture);
            }

            if (description.depthRenderbuffer) {
                this.setDepthRenderbuffer(description.depthRenderbuffer);
            }

            if (description.stencilRenderbuffer) {
                this.setStencilRenderbuffer(description.stencilRenderbuffer);
            }

            if (description.depthStencilTexture) {
                this.setDepthStencilTexture(description.depthStencilTexture);
            }

            if (description.depthStencilRenderbuffer) {
                this.setDepthStencilRenderbuffer(description.depthStencilRenderbuffer);
            }
        }
    };

    Framebuffer.prototype._bind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    };

    Framebuffer.prototype._unBind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setColorTexture = function(texture) {
        this._bind();
        var gl = this._gl;

        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, texture._getTarget(), texture._getTexture(), 0);
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
        }
        this._unBind();

        this._colorTexture = texture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorTexture = function() {
        return this._colorTexture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setColorRenderbuffer = function(renderbuffer) {
        this._bind();
        var gl = this._gl;

        if (renderbuffer) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, null);
        }
        this._unBind();

        this._colorRenderbuffer = renderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorRenderbuffer = function() {
        return this._colorRenderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthTexture = function(texture) {
        this._bind();
        var gl = this._gl;

// TODO: remove duplication with similar functions
// TODO: clear previous _depthTexture?
// TODO: clear _depthRenderbuffer?
// TODO: validate texture format?

        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, texture._getTarget(), texture._getTexture(), 0);
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, null, 0);
        }
        this._unBind();

        this._depthTexture = texture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthTexture = function() {
        return this._depthTexture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthRenderbuffer = function(renderbuffer) {
        this._bind();
        var gl = this._gl;

        if (renderbuffer) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, null);
        }
        this._unBind();

        this._depthRenderbuffer = renderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthRenderbuffer = function() {
        return this._depthRenderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setStencilRenderbuffer = function(renderbuffer) {
        this._bind();
        var gl = this._gl;

        if (renderbuffer) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, null);
        }
        this._unBind();

        this._stencilRenderbuffer = renderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getStencilRenderbuffer = function() {
        return this._stencilRenderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthStencilTexture = function(texture) {
        this._bind();
        var gl = this._gl;

// TODO: see TODOs in setDepthTexture

        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, texture._getTarget(), texture._getTexture(), 0);
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.TEXTURE_2D, null, 0);
        }
        this._unBind();

        this._depthStencilTexture = texture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthStencilTexture = function() {
        return this._depthStencilTexture;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthStencilRenderbuffer = function(renderbuffer) {
        this._bind();
        var gl = this._gl;

        if (renderbuffer) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, null);
        }
        this._unBind();

        this._depthStencilRenderbuffer = renderbuffer;
    };

    /**
     * DOC_TBA.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthStencilRenderbuffer = function() {
        return this._depthStencilRenderbuffer;
    };

    /**
     * Returns true if the framebuffer has a depth attachment.  Depth attachments include
     * depth and depth-stencil textures, and depth and depth-stencil renderbuffers.  When
     * rendering to a framebuffer, a depth attachment is required for the depth test to have effect.
     *
     * @return {Boolean} Returns true if the framebuffer has a depth attachment; otherwise, false.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.hasDepthAttachment = function() {
        return !!(this.getDepthTexture() || this.getDepthRenderbuffer() || this.getDepthStencilTexture() || this.getDepthStencilRenderbuffer());
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Framebuffer.destroy
     */
    Framebuffer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Only call this if the framebuffer has no attachments or the framebuffer owns its attachments;
     * otherwise, the owner of the textures/renderbuffers is responsible for deleting them.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * <br /><br />
     * This will fail if the color attachment is a face in a cube map texture.
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     *
     * @see Framebuffer.isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteFramebuffers.xml'>glDeleteFramebuffers</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteTextures.xml'>glDeleteTextures</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteRenderbuffers.xml'>glDeleteRenderbuffers</a>
     *
     * @example
     * // Destroying the framebuffer implicitly calls destroy for each of its attachments.
     * var texture = context.createTexture2D({ width : 1, height : 1 });
     * framebuffer = context.createFramebuffer({ colorTexture : texture });
     * // ...
     * framebuffer = framebuffer.destroy();
     * // Calling texture.destroy() would throw <code>DeveloperError</code> at this point.
     */
    Framebuffer.prototype.destroy = function() {
        // TODO:  What should the behavior be if the color attachment is a face in a cube map texture?
        this._colorTexture = this._colorTexture && this._colorTexture.destroy();
        this._colorRenderbuffer = this._colorRenderbuffer && this._colorRenderbuffer.destroy();
        this._depthTexture = this._depthTexture && this._depthTexture.destroy();
        this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();
        this._stencilRenderbuffer = this._stencilRenderbuffer && this._stencilRenderbuffer.destroy();
        this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
        this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

        this._gl.deleteFramebuffer(this._framebuffer);
        return destroyObject(this);
    };

    return Framebuffer;
});