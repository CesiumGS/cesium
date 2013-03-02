/*global define*/
define([
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/Color',
        '../Core/DeveloperError',
        './ClearCommand',
        './RenderbufferFormat'
    ], function(
        defaultValue,
        destroyObject,
        Color,
        DeveloperError,
        ClearCommand,
        RenderbufferFormat) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias PickFramebuffer
     * @internalConstructor
     *
     * @see Context#createPickFramebuffer
     * @see Context#pick
     */
    var PickFramebuffer = function(context) {
        this._context = context;
        this._fb = null;
        this._width = 0;
        this._height = 0;

        // Clear to black.  Since this is the background color, no objects will be black
        this._clearCommand = new ClearCommand();
        this._clearCommand.clearState = context.createClearState({
            color : new Color(0.0, 0.0, 0.0, 1.0),
            depth : 1.0,
            stencil : 0
        });
    };

    /**
     * DOC_TBA
     * @memberof PickFramebuffer
     */
    PickFramebuffer.prototype.begin = function() {
        var context = this._context;

        // Initially create or recreate renderbuffers and framebuffer used for picking
        if (!this._fb ||
            (this._width !== context.getCanvas().clientWidth) ||
            (this._height !== context.getCanvas().clientHeight)) {
            this._width = context.getCanvas().clientWidth;
            this._height = context.getCanvas().clientHeight;

            this._fb = this._fb && this._fb.destroy();
            this._fb = context.createFramebuffer({
                colorRenderbuffer : context.createRenderbuffer(),
                depthRenderbuffer : context.createRenderbuffer({
                    format : RenderbufferFormat.DEPTH_COMPONENT16
                })
            });
        }

        this._clearCommand.execute(context, this._fb);

        return this._fb;
    };

    var colorScratch = new Color();

    /**
     * DOC_TBA
     * @memberof PickFramebuffer
     */
    PickFramebuffer.prototype.end = function(screenSpaceRectangle) {
        if (typeof screenSpaceRectangle === 'undefined') {
            throw new DeveloperError('screenSpaceRectangle is required.');
        }

        var width = defaultValue(screenSpaceRectangle.width, 1.0);
        var height = defaultValue(screenSpaceRectangle.height, 1.0);

        var pixels = this._context.readPixels({
            x : screenSpaceRectangle.x,
            y : screenSpaceRectangle.y,
            width : width,
            height : height,
            framebuffer : this._fb
        });

        var max = Math.max(width, height);
        var length = max * max;
        var halfWidth = Math.floor(width * 0.5);
        var halfHeight = Math.floor(height * 0.5);

        var x = 0;
        var y = 0;
        var dx = 0;
        var dy = -1;

        // Spiral around the center pixel, this is a workaround until
        // we can access the depth buffer on all browsers.

        // The region does not have to square and the dimensions do not have to be odd, but
        // loop iterations would be wasted. Prefer square regions where the size is odd.
        for (var i = 0; i < length; ++i) {
            if (-halfWidth <= x && x <= halfWidth && -halfHeight <= y && y <= halfHeight) {
                var index = 4 * ((halfHeight - y) * width + x + halfWidth);

                colorScratch.red = pixels[index];
                colorScratch.green = pixels[index + 1];
                colorScratch.blue = pixels[index + 2];
                colorScratch.alpha = pixels[index + 3];

                var object = this._context.getObjectByPickId(colorScratch);
                if (typeof object !== 'undefined') {
                    return object;
                }
            }

            // if (top right || bottom left corners) || (top left corner) || (bottom right corner + (1, 0)
            // change spiral direction
            if (x === y || (x < 0 && -x === y) || (x > 0 && x === 1 - y)) {
                var temp = dx;
                dx = -dy;
                dy = temp;
            }

            x += dx;
            y += dy;
        }

        return undefined;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof PickFramebuffer
     *
     * @return {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see PickFramebuffer#destroy
     */
    PickFramebuffer.prototype.isDestroyed = function() {
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
     * @memberof PickFramebuffer
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see PickFramebuffer#isDestroyed
     *
     * @example
     * PickFramebuffer = PickFramebuffer && PickFramebuffer.destroy();
     */
    PickFramebuffer.prototype.destroy = function() {
        this._fb = this._fb && this._fb.destroy();
        return destroyObject(this);
    };

    return PickFramebuffer;
});