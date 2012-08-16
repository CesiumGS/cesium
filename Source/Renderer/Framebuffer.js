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
        this._depthRenderbuffer = undefined;
        this._stencilRenderbuffer = undefined;
        this._depthStencilRenderbuffer = undefined;

        if (description) {
            if (description.colorTexture) {
                this.setColorTexture(description.colorTexture);
            }

            if (description.colorRenderbuffer) {
                this.setColorRenderbuffer(description.colorRenderbuffer);
            }

            if (description.depthRenderbuffer) {
                this.setDepthRenderbuffer(description.depthRenderbuffer);
            }

            if (description.stencilRenderbuffer) {
                this.setStencilRenderbuffer(description.stencilRenderbuffer);
            }

            if (description.depthStencilRenderbuffer) {
                this.setDepthStencilRenderbuffer(description.depthStencilRenderbuffer);
            }
        }
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

    Framebuffer.prototype._bind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    };

    Framebuffer.prototype._unBind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
        this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();
        this._stencilRenderbuffer = this._stencilRenderbuffer && this._stencilRenderbuffer.destroy();
        this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();

        this._gl.deleteFramebuffer(this._framebuffer);
        return destroyObject(this);
    };

    return Framebuffer;
});