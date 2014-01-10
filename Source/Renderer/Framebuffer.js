/*global define*/
define([
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './PixelFormat'
    ], function(
        defined,
        DeveloperError,
        destroyObject,
        PixelFormat) {
    "use strict";

    /**
     * A framebuffer is a target for draw and clear calls.  It can contain color, depth, and stencil attachments
     * that are written to in response to these calls.  If the attachments are textures, they can be read in
     * later rendering passes.
     *
     * @alias Framebuffer
     *
     * @see Context#createFramebuffer
     *
     * @internalConstructor
     */
    var Framebuffer = function(gl, drawBuffers, maximumColorAttachments, description) {
        this._gl = gl;
        this._drawBuffers = drawBuffers;
        this._maxAttachments = maximumColorAttachments;
        this._framebuffer = gl.createFramebuffer();

        this._colorTextures = [];
        this._colorRenderbuffers = [];
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;
        this._stencilRenderbuffer = undefined;
        this._depthStencilTexture = undefined;
        this._depthStencilRenderbuffer = undefined;

        /**
         * When true, the framebuffer owns its attachments so they will be destroyed when
         * {@link Framebuffer#destroy} is called or when a new attachment is assigned
         * to an attachment point.
         *
         * @type {Boolean}
         * @default true
         *
         * @see Framebuffer#destroy
         */
        this.destroyAttachments = true;

        if (description) {
            // Throw if a texture and renderbuffer are attached to the same point.  This won't
            // cause a WebGL error (because only one will be attached), but is likely a developer error.

            if (description.colorTextures && description.colorRenderbuffers) {
                throw new DeveloperError('Cannot have both color texture and color renderbuffer attachments.');
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

            var i;
            var length;

            if (description.colorTextures) {
                var textures = description.colorTextures;
                length = textures.length;

                if (length > this._maxAttachments) {
                    throw new DeveloperError('The number of color attachments exceeds the number supported.');
                }

                for (i = 0; i < length; ++i) {
                    this.setColorTexture(i, textures[i]);
                }
            }

            if (description.colorRenderbuffers) {
                var renderbuffers = description.colorRenderbuffers;
                length = renderbuffers.length;

                if (length > this._maxAttachments) {
                    throw new DeveloperError('The number of color attachments exceeds the number supported.');
                }

                for (i = 0; i < length; ++i) {
                    this.setColorRenderbuffer(i, renderbuffers[i]);
                }
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

    function attachTexture(framebuffer, attachment, texture) {
        framebuffer._bind();
        var gl = framebuffer._gl;

        if (texture) {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, texture._getTarget(), texture._getTexture(), 0);
        } else {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, null, 0);
        }
        framebuffer._unBind();
    }

    function attachRenderbuffer(framebuffer, attachment, renderbuffer) {
        framebuffer._bind();
        var gl = framebuffer._gl;

        if (renderbuffer) {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
        } else {
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, null);
        }
        framebuffer._unBind();
    }

    function destroyAttachment(framebuffer, attachment) {
        if (framebuffer.destroyAttachments && attachment && attachment.destroy) {
            attachment.destroy();
        }
    }

    /**
     * Attaches a texture to a color attachment point.  When this framebuffer is passed to a draw
     * or clear call, the texture is the target of color output, e.g., <code>gl_FragColor</code> or <code>gl_FragData[index]</code>.
     *
     * @memberof Framebuffer
     *
     * @param {Number} The index of the color attachment. Must be greater than or equal to 0 and less than or equal to the maximum number of supported solor attachments.
     * @param {Texture} The texture to attach.  <code>undefined</code> dettaches the current texture.
     *
     * @exception {DeveloperError} index is required and must be between 0 and the maximum number of supported color attachments.
     * @exception {DeveloperError} The color-texture pixel-format must be a color format.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     *
     * @see Context#getMaximumColorAttachments
     */
    Framebuffer.prototype.setColorTexture = function(index, texture) {
        if (!defined(index) || index < 0 || index > this._maxAttachments) {
            throw new DeveloperError('index is required and must be between 0 and the maximum number of supported color attachments.');
        }

        if (texture && !PixelFormat.isColorFormat(texture.getPixelFormat())) {
            throw new DeveloperError('The color-texture pixel-format must be a color format.');
        }

        attachTexture(this, this._gl.COLOR_ATTACHMENT0 + index, texture);
        destroyAttachment(this, this._colorTextures[index]);
        this._colorTextures[index] = texture;
    };

    /**
     * Returns a color texture attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @param {Number} index The index of the color texture attachment.
     *
     * @returns {Texture} The color texture attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorTexture = function(index) {
        return this._colorTextures[index];
    };

    /**
     * Prefer {@link Framebuffer#setColorTexture}.
     *
     * @memberof Framebuffer
     *
     * @exception {DeveloperError} index is required and must be between 0 and the maximum number of supported color attachments.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setColorRenderbuffer = function(index, renderbuffer) {
        if (!defined(index) || index < 0 || index > this._maxAttachments) {
            throw new DeveloperError('index is required and must be between 0 and the maximum number of supported color attachments.');
        }

        attachRenderbuffer(this, this._gl.COLOR_ATTACHMENT0 + index, renderbuffer);
        destroyAttachment(this, this._colorRenderbuffers[index]);
        this._colorRenderbuffers[index] = renderbuffer;
    };

    /**
     * Returns a color renderbuffer attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @param {Number} index The index of the color renderbuffer attachment.
     *
     * @returns {Texture} The color renderbuffer attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorRenderbuffer = function(index) {
        return this._colorRenderbuffers[index];
    };

    /**
     * Attaches a texture to the depth attachment point.  When this framebuffer is passed to a draw
     * or clear call, the texture is the target of depth output.
     *
     * @memberof Framebuffer
     *
     * @param {Texture} The texture to attach.  <code>undefined</code> dettaches the current texture.
     *
     * @exception {DeveloperError} The depth-texture pixel-format must be DEPTH_COMPONENT.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthTexture = function(texture) {
        if (texture && (texture.getPixelFormat() !== PixelFormat.DEPTH_COMPONENT)) {
            throw new DeveloperError('The depth-texture pixel-format must be DEPTH_COMPONENT.');
        }

        attachTexture(this, this._gl.DEPTH_ATTACHMENT, texture);
        destroyAttachment(this, this._depthTexture);
        this._depthTexture = texture;
    };

    /**
     * Returns the depth texture attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Texture} The depth texture attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthTexture = function() {
        return this._depthTexture;
    };

    /**
     * Prefer {@link Framebuffer#setDepthTexture}.
     *
     * @memberof Framebuffer
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthRenderbuffer = function(renderbuffer) {
        attachRenderbuffer(this, this._gl.DEPTH_ATTACHMENT, renderbuffer);
        destroyAttachment(this, this._depthRenderbuffer);
        this._depthRenderbuffer = renderbuffer;
    };

    /**
     * Returns the depth renderbuffer attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Texture} The depth renderbuffer attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthRenderbuffer = function() {
        return this._depthRenderbuffer;
    };

    /**
     * Prefer {@link Framebuffer#setDepthStencilTexture}.
     *
     * @memberof Framebuffer
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setStencilRenderbuffer = function(renderbuffer) {
        attachRenderbuffer(this, this._gl.STENCIL_ATTACHMENT, renderbuffer);
        destroyAttachment(this, this._stencilRenderbuffer);
        this._stencilRenderbuffer = renderbuffer;
    };

    /**
     * Returns the stencil renderbuffer attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Texture} The stencil renderbuffer attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getStencilRenderbuffer = function() {
        return this._stencilRenderbuffer;
    };

    /**
     * Attaches a texture to the depth-stencil attachment point.  When this framebuffer is passed to a draw
     * or clear call, the texture is the target of depth and stencil output.
     *
     * @memberof Framebuffer
     *
     * @param {Texture} The texture to attach.  <code>undefined</code> dettaches the current texture.
     *
     * @exception {DeveloperError} The depth-stencil-texture pixel-format must be DEPTH_STENCIL.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthStencilTexture = function(texture) {
        if (texture && (texture.getPixelFormat() !== PixelFormat.DEPTH_STENCIL)) {
            throw new DeveloperError('The depth-stencil pixel-format must be DEPTH_STENCIL.');
        }

        attachTexture(this, this._gl.DEPTH_STENCIL_ATTACHMENT, texture);
        destroyAttachment(this, this._depthStencilTexture);
        this._depthStencilTexture = texture;
    };

    /**
     * Returns the depth-stencil texture attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Texture} The depth-stencil texture attached to this framebuffer.
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getDepthStencilTexture = function() {
        return this._depthStencilTexture;
    };

    /**
     * Prefer {@link Framebuffer#setDepthStencilTexture}.
     *
     * @memberof Framebuffer
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.setDepthStencilRenderbuffer = function(renderbuffer) {
        attachRenderbuffer(this, this._gl.DEPTH_STENCIL_ATTACHMENT, renderbuffer);
        destroyAttachment(this, this._depthStencilRenderbuffer);
        this._depthStencilRenderbuffer = renderbuffer;
    };

    /**
     * Returns the depth-stencil renderbuffer attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Texture} The depth-stencil renderbuffer attached to this framebuffer.
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
     * @memberof Framebuffer
     *
     * @returns {Boolean} Returns true if the framebuffer has a depth attachment; otherwise, false.
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
     * @memberof Framebuffer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Framebuffer#destroy
     */
    Framebuffer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Framebuffer attachments are only destoryed if the framebuffer owns them, i.e., {@link destroyAttachments}
     * is true.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Framebuffer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     *
     * @see Framebuffer#isDestroyed
     * @see Framebuffer#destroyAttachments
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteFramebuffers.xml'>glDeleteFramebuffers</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteTextures.xml'>glDeleteTextures</a>
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteRenderbuffers.xml'>glDeleteRenderbuffers</a>
     *
     * @example
     * var texture = context.createTexture2D({ width : 1, height : 1 });
     * framebuffer = context.createFramebuffer({ colorTextures : [texture] });
     * // ...
     * framebuffer = framebuffer.destroy();
     * // texture is also destroyed.
     */
    Framebuffer.prototype.destroy = function() {
        if (this.destroyAttachments) {
            // If the color texture is a cube map face, it is owned by the cube map, and will not be destroyed.
            var i = 0;
            var textures = this._colorTextures;
            var length = textures.length;
            for (; i < length; ++i) {
                var texture = textures[i];
                if (defined(texture)) {
                    texture.destroy();
                }
            }

            var renderbuffers = this._colorRenderbuffers;
            length = renderbuffers.length;
            for (i = 0; i < length; ++i) {
                var renderbuffer = renderbuffers[i];
                if (defined(renderbuffer)) {
                    renderbuffer.destroy();
                }
            }

            this._depthTexture = this._depthTexture && this._depthTexture.destroy();
            this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();
            this._stencilRenderbuffer = this._stencilRenderbuffer && this._stencilRenderbuffer.destroy();
            this._depthStencilTexture = this._depthStencilTexture && this._depthStencilTexture.destroy();
            this._depthStencilRenderbuffer = this._depthStencilRenderbuffer && this._depthStencilRenderbuffer.destroy();
        }

        this._gl.deleteFramebuffer(this._framebuffer);
        return destroyObject(this);
    };

    return Framebuffer;
});
