/*global define*/
define([
        '../Core/defineProperties',
        '../Core/destroyObject'
    ], function(
        defineProperties,
        destroyObject) {
    "use strict";

    /**
     * @private
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
        format: {
            get : function() {
                return this._format;
            }
        },
        width: {
            get : function() {
                return this._width;
            }
        },
        height: {
            get : function() {
                return this._height;
            }
        }
    });

    Renderbuffer.prototype._getRenderbuffer = function() {
        return this._renderbuffer;
    };

    Renderbuffer.prototype.isDestroyed = function() {
        return false;
    };

    Renderbuffer.prototype.destroy = function() {
        this._gl.deleteRenderbuffer(this._renderbuffer);
        return destroyObject(this);
    };

    return Renderbuffer;
});