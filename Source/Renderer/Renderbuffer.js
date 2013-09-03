/*global define*/
define([
        '../Core/destroyObject'
    ], function(
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
    function Renderbuffer(_gl, _format, _width, _height) {
        var _renderbuffer = _gl.createRenderbuffer();

        _gl.bindRenderbuffer(_gl.RENDERBUFFER, _renderbuffer);
        _gl.renderbufferStorage(_gl.RENDERBUFFER, _format, _width, _height);
        _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);

        /**
        * DOC_TBA
        * @memberof Renderbuffer
        * @returns {Boolean} DOC_TBA
        * @exception {DeveloperError} This renderbuffer was destroyed, i.e., destroy() was called.
        */
        this.getFormat = function() {
            return _format;
        };

        /**
        * DOC_TBA
        * @memberof Renderbuffer
        * @returns {Boolean} DOC_TBA
        * @exception {DeveloperError} This renderbuffer was destroyed, i.e., destroy() was called.
        */
        this.getWidth = function() {
            return _width;
        };

        /**
        * DOC_TBA
        * @memberof Renderbuffer
        * @returns {Boolean} DOC_TBA
        * @exception {DeveloperError} This renderbuffer was destroyed, i.e., destroy() was called.
        */
        this.getHeight = function() {
            return _height;
        };

        this._getRenderbuffer = function() {
            return _renderbuffer;
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
        this.isDestroyed = function() {
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
        this.destroy = function() {
            _gl.deleteRenderbuffer(_renderbuffer);
            return destroyObject(this);
        };
    }

    return Renderbuffer;
});