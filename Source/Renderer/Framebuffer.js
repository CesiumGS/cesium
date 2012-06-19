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
     * @name Framebuffer
     *
     * @see Context#createFramebuffer
     *
     * @internalConstructor
     */
    function Framebuffer(_gl, description) {
        var _framebuffer;
        var _colorTexture;
        var _colorRenderbuffer;
        var _depthRenderbuffer;
        var _stencilRenderbuffer;
        var _depthStencilRenderbuffer;

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.setColorTexture = function(texture) {
            this._bind();

            if (texture) {
                _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, texture._getTarget(), texture._getTexture(), 0);
            } else {
                _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, null, 0);
            }
            this._unBind();

            _colorTexture = texture;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.getColorTexture = function() {
            return _colorTexture;
        };

        /**
         * DOC_TBA.
         * @memberof Framebuffer
         * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
         */
        this.setColorRenderbuffer = function(renderbuffer) {
            this._bind();
            if (renderbuffer) {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
            } else {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.RENDERBUFFER, null);
            }
            this._unBind();

            _colorRenderbuffer = renderbuffer;
        };

        /**
         * DOC_TBA.
         * @memberof Framebuffer
         * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
         */
        this.getColorRenderbuffer = function() {
            return _colorRenderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.setDepthRenderbuffer = function(renderbuffer) {
            this._bind();
            if (renderbuffer) {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
            } else {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.RENDERBUFFER, null);
            }
            this._unBind();

            _depthRenderbuffer = renderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.getDepthRenderbuffer = function() {
            return _depthRenderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.setStencilRenderbuffer = function(renderbuffer) {
            this._bind();
            if (renderbuffer) {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.STENCIL_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
            } else {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.STENCIL_ATTACHMENT, _gl.RENDERBUFFER, null);
            }
            this._unBind();

            _stencilRenderbuffer = renderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.getStencilRenderbuffer = function() {
            return _stencilRenderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.setDepthStencilRenderbuffer = function(renderbuffer) {
            this._bind();
            if (renderbuffer) {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.RENDERBUFFER, renderbuffer._getRenderbuffer());
            } else {
                _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_STENCIL_ATTACHMENT, _gl.RENDERBUFFER, null);
            }
            this._unBind();

            _depthStencilRenderbuffer = renderbuffer;
        };

        /**
        * DOC_TBA.
        * @memberof Framebuffer
        * @exception {DeveloperError} This framebuffer was destroyed, i.e., destroy() was called.
        */
        this.getDepthStencilRenderbuffer = function() {
            return _depthStencilRenderbuffer;
        };

        this._bind = function() {
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, _framebuffer);
        };

        this._unBind = function() {
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);
        };

        /**
         * Returns true if this object was destroyed; otherwise, false.
         * <br /><br />
         * If this object was destroyed, it should not be used; calling any function other than
         * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
         *
         * @memberof Framebuffer
         *
         * @return {Boolean} True if this object was destroyed; otherwise, false.
         *
         * @see Framebuffer.destroy
         */
        this.isDestroyed = function() {
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
         * @memberof Framebuffer
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
        this.destroy = function() {
            // TODO:  What should the behavior be if the color attachment is a face in a cube map texture?
            _colorTexture = _colorTexture && _colorTexture.destroy();
            _colorRenderbuffer = _colorRenderbuffer && _colorRenderbuffer.destroy();
            _depthRenderbuffer = _depthRenderbuffer && _depthRenderbuffer.destroy();
            _stencilRenderbuffer = _stencilRenderbuffer && _stencilRenderbuffer.destroy();
            _depthStencilRenderbuffer = _depthStencilRenderbuffer && _depthStencilRenderbuffer.destroy();

            _gl.deleteFramebuffer(_framebuffer);
            return destroyObject(this);
        };

        _framebuffer = _gl.createFramebuffer();

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
    }

    return Framebuffer;
});