/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        './ContextLimits',
        './RenderbufferFormat'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        ContextLimits,
        RenderbufferFormat) {
    'use strict';

    /**
     * @private
     */
    function Renderbuffer(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.context)) {
            throw new DeveloperError('options.context is required.');
        }
        //>>includeEnd('debug');

        var context = options.context;
        var gl = context._gl;
        var maximumRenderbufferSize = ContextLimits.maximumRenderbufferSize;

        var format = defaultValue(options.format, RenderbufferFormat.RGBA4);
        var width = defined(options.width) ? options.width : gl.drawingBufferWidth;
        var height = defined(options.height) ? options.height : gl.drawingBufferHeight;

        //>>includeStart('debug', pragmas.debug);
        if (!RenderbufferFormat.validate(format)) {
            throw new DeveloperError('Invalid format.');
        }

        if (width <= 0) {
            throw new DeveloperError('Width must be greater than zero.');
        }

        if (width > maximumRenderbufferSize) {
            throw new DeveloperError('Width must be less than or equal to the maximum renderbuffer size (' + maximumRenderbufferSize + ').  Check maximumRenderbufferSize.');
        }

        if (height <= 0) {
            throw new DeveloperError('Height must be greater than zero.');
        }

        if (height > maximumRenderbufferSize) {
            throw new DeveloperError('Height must be less than or equal to the maximum renderbuffer size (' + maximumRenderbufferSize + ').  Check maximumRenderbufferSize.');
        }
        //>>includeEnd('debug');

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