/*global define*/
define([
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        defineProperties,
        destroyObject) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Renderbuffer
     * @internalConstructor
     *
     * @see Context#createRenderbuffer
     */
    function Renderbuffer(gl, format, width, height) {
        this._gl = gl;
        this._format = format;
        this._width = width;
        this._height = height;
        this._renderbuffer = this._gl.createRenderbuffer();

        gl.bindRenderbuffer(gl.RENDERBUFFER, this._renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, format, width, height);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    defineProperties(Renderbuffer.prototype, {
        /**
        * DOC_TBA
        * @memberof Renderbuffer.prototype
        */
        format: {
            get : function() {
                return this._format;
            }
        },

        /**
         * DOC_TBA
         * @memberof Renderbuffer.prototype
         */
        width: {
            get : function() {
                return this._width;
            }
        },

        /**
        * DOC_TBA
        * @memberof Renderbuffer.prototype
        */
        height: {
            get : function() {
                return this._height;
            }
        }
    });

    Renderbuffer.prototype._getRenderbuffer = function() {
        return this._renderbuffer;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Renderbuffer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see Renderbuffer.destroy
     */
    Renderbuffer.prototype.isDestroyed = function() {
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
     * @memberof Renderbuffer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This shader renderbuffer destroyed, i.e., destroy() was called.
     *
     * @see Renderbuffer.isDestroyed
     * @see <a href='http://www.khronos.org/opengles/sdk/2.0/docs/man/glDeleteRenderbuffers.xml'>glDeleteRenderbuffers</a>
     *
     * @example
     * renderbuffer = renderbuffer && renderbuffer.destroy();
     */
    Renderbuffer.prototype.destroy = function() {
        this._gl.deleteRenderbuffer(this._renderbuffer);
        return destroyObject(this);
    };

    return Renderbuffer;
});