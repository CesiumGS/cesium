/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        './PixelFormat'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        destroyObject,
        PixelFormat) {
    "use strict";

    function attachTexture(framebuffer, attachment, texture) {
        var gl = framebuffer._gl;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, texture._getTarget(), texture._getTexture(), 0);
    }

    function attachRenderbuffer(framebuffer, attachment, renderbuffer) {
        var gl = framebuffer._gl;
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
    }

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
    var Framebuffer = function(gl, maximumColorAttachments, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        this._gl = gl;
        this._framebuffer = gl.createFramebuffer();

        this._colorTextures = [];
        this._colorRenderbuffers = [];
        this._activeColorAttachments = [];

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

        // Throw if a texture and renderbuffer are attached to the same point.  This won't
        // cause a WebGL error (because only one will be attached), but is likely a developer error.

        //>>includeStart('debug', pragmas.debug);
        if (defined(description.colorTextures) && defined(description.colorRenderbuffers)) {
            throw new DeveloperError('Cannot have both color texture and color renderbuffer attachments.');
        }
        if (defined(description.depthTexture) && defined(description.depthRenderbuffer)) {
            throw new DeveloperError('Cannot have both a depth texture and depth renderbuffer attachment.');
        }
        if (defined(description.depthStencilTexture) && defined(description.depthStencilRenderbuffer)) {
            throw new DeveloperError('Cannot have both a depth-stencil texture and depth-stencil renderbuffer attachment.');
        }
        //>>includeEnd('debug');

        // Avoid errors defined in Section 6.5 of the WebGL spec
        var depthAttachment = (defined(description.depthTexture) || defined(description.depthRenderbuffer));
        var depthStencilAttachment = (defined(description.depthStencilTexture) || defined(description.depthStencilRenderbuffer));

        //>>includeStart('debug', pragmas.debug);
        if (depthAttachment && depthStencilAttachment) {
            throw new DeveloperError('Cannot have both a depth and depth-stencil attachment.');
        }
        if (defined(description.stencilRenderbuffer) && depthStencilAttachment) {
            throw new DeveloperError('Cannot have both a stencil and depth-stencil attachment.');
        }
        if (depthAttachment && defined(description.stencilRenderbuffer)) {
            throw new DeveloperError('Cannot have both a depth and stencil attachment.');
        }
        //>>includeEnd('debug');

        ///////////////////////////////////////////////////////////////////

        this._bind();

        var texture;
        var renderbuffer;
        var i;
        var length;
        var attachmentEnum;

        if (defined(description.colorTextures)) {
            var textures = description.colorTextures;
            length = this._colorTextures.length = this._activeColorAttachments.length = textures.length;

            //>>includeStart('debug', pragmas.debug);
            if (length > maximumColorAttachments) {
                throw new DeveloperError('The number of color attachments exceeds the number supported.');
            }
            //>>includeEnd('debug');

            for (i = 0; i < length; ++i) {
                texture = textures[i];

                //>>includeStart('debug', pragmas.debug);
                if (!PixelFormat.isColorFormat(texture.getPixelFormat())) {
                    throw new DeveloperError('The color-texture pixel-format must be a color format.');
                }
                //>>includeEnd('debug');

                attachmentEnum = this._gl.COLOR_ATTACHMENT0 + i;
                attachTexture(this, attachmentEnum, texture);
                this._activeColorAttachments[i] = attachmentEnum;
                this._colorTextures[i] = texture;
            }
        }

        if (defined(description.colorRenderbuffers)) {
            var renderbuffers = description.colorRenderbuffers;
            length = this._colorRenderbuffers.length = this._activeColorAttachments.length = renderbuffers.length;

            //>>includeStart('debug', pragmas.debug);
            if (length > maximumColorAttachments) {
                throw new DeveloperError('The number of color attachments exceeds the number supported.');
            }
            //>>includeEnd('debug');

            for (i = 0; i < length; ++i) {
                renderbuffer = renderbuffers[i];
                attachmentEnum = this._gl.COLOR_ATTACHMENT0 + i;
                attachRenderbuffer(this, attachmentEnum, renderbuffer);
                this._activeColorAttachments[i] = attachmentEnum;
                this._colorRenderbuffers[i] = renderbuffer;
            }
        }

        if (defined(description.depthTexture)) {
            texture = description.depthTexture;

            //>>includeStart('debug', pragmas.debug);
            if (texture.getPixelFormat() !== PixelFormat.DEPTH_COMPONENT) {
                throw new DeveloperError('The depth-texture pixel-format must be DEPTH_COMPONENT.');
            }
            //>>includeEnd('debug');

            attachTexture(this, this._gl.DEPTH_ATTACHMENT, texture);
            this._depthTexture = texture;
        }

        if (defined(description.depthRenderbuffer)) {
            renderbuffer = description.depthRenderbuffer;
            attachRenderbuffer(this, this._gl.DEPTH_ATTACHMENT, renderbuffer);
            this._depthRenderbuffer = renderbuffer;
        }

        if (defined(description.stencilRenderbuffer)) {
            renderbuffer = description.stencilRenderbuffer;
            attachRenderbuffer(this, this._gl.STENCIL_ATTACHMENT, renderbuffer);
            this._stencilRenderbuffer = renderbuffer;
        }

        if (defined(description.depthStencilTexture)) {
            texture = description.depthStencilTexture;

            //>>includeStart('debug', pragmas.debug);
            if (texture.getPixelFormat() !== PixelFormat.DEPTH_STENCIL) {
                throw new DeveloperError('The depth-stencil pixel-format must be DEPTH_STENCIL.');
            }
            //>>includeEnd('debug');

            attachTexture(this, this._gl.DEPTH_STENCIL_ATTACHMENT, texture);
            this._depthStencilTexture = texture;
        }

        if (defined(description.depthStencilRenderbuffer)) {
            renderbuffer = description.depthStencilRenderbuffer;
            attachRenderbuffer(this, this._gl.DEPTH_STENCIL_ATTACHMENT, renderbuffer);
            this._depthStencilRenderbuffer = renderbuffer;
        }

        this._unBind();
    };

    Framebuffer.prototype._bind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    };

    Framebuffer.prototype._unBind = function() {
        var gl = this._gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    Framebuffer.prototype._getActiveColorAttachments = function() {
        return this._activeColorAttachments;
    };

    /**
     * Returns the number of color textures or renderbuffers attached to this framebuffer.
     *
     * @memberof Framebuffer
     *
     * @returns {Number} The number of color attachments.
     */
    Framebuffer.prototype.getNumberOfColorAttachments = function() {
        return this._activeColorAttachments.length;
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
     * @exception {DeveloperError} index is required, must be greater than or equal to zero and must be less than the number of color attachments.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorTexture = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || index < 0 || index >= this._colorTextures.length) {
            throw new DeveloperError('index is required, must be greater than or equal to zero and must be less than the number of color attachments.');
        }
        //>>includeEnd('debug');

        return this._colorTextures[index];
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
     * @exception {DeveloperError} index is required, must be greater than or equal to zero and must be less than the number of color attachments.
     * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
     */
    Framebuffer.prototype.getColorRenderbuffer = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index) || index < 0 || index >= this._colorRenderbuffers.length) {
            throw new DeveloperError('index is required, must be greater than or equal to zero and must be less than the number of color attachments.');
        }
        //>>includeEnd('debug');

        return this._colorRenderbuffers[index];
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
