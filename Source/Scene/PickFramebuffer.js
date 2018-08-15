define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Renderer/Framebuffer',
        '../Renderer/PassState',
        '../Renderer/Renderbuffer',
        '../Renderer/RenderbufferFormat',
        '../Renderer/Texture'
    ], function(
        BoundingRectangle,
        Color,
        defaultValue,
        defined,
        destroyObject,
        Framebuffer,
        PassState,
        Renderbuffer,
        RenderbufferFormat,
        Texture) {
    'use strict';

    /**
     * @private
     */
    function PickFramebuffer(context) {
        // Override per-command states
        var passState = new PassState(context);
        passState.blendingEnabled = false;
        passState.scissorTest = {
            enabled : true,
            rectangle : new BoundingRectangle()
        };
        passState.viewport = new BoundingRectangle();

        this._context = context;
        this._fb = undefined;
        this._passState = passState;
        this._width = 0;
        this._height = 0;
    }
    PickFramebuffer.prototype.begin = function(screenSpaceRectangle, viewport) {
        var context = this._context;
        var width = viewport.width;
        var height = viewport.height;

        BoundingRectangle.clone(screenSpaceRectangle, this._passState.scissorTest.rectangle);

        // Initially create or recreate renderbuffers and framebuffer used for picking
        if ((!defined(this._fb)) || (this._width !== width) || (this._height !== height)) {
            this._width = width;
            this._height = height;

            this._fb = this._fb && this._fb.destroy();
            this._fb = new Framebuffer({
                context : context,
                colorTextures : [new Texture({
                    context : context,
                    width : width,
                    height : height
                })],
                depthStencilRenderbuffer : new Renderbuffer({
                    context : context,
                    width : width,
                    height : height,
                    format : RenderbufferFormat.DEPTH_STENCIL
                })
            });
            this._passState.framebuffer = this._fb;
        }

        this._passState.viewport.width = width;
        this._passState.viewport.height = height;

        return this._passState;
    };

    var colorScratch = new Color();

    PickFramebuffer.prototype.end = function(screenSpaceRectangle) {
        var width = defaultValue(screenSpaceRectangle.width, 1.0);
        var height = defaultValue(screenSpaceRectangle.height, 1.0);

        var context = this._context;
        var pixels = context.readPixels({
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

                colorScratch.red = Color.byteToFloat(pixels[index]);
                colorScratch.green = Color.byteToFloat(pixels[index + 1]);
                colorScratch.blue = Color.byteToFloat(pixels[index + 2]);
                colorScratch.alpha = Color.byteToFloat(pixels[index + 3]);

                var object = context.getObjectByPickColor(colorScratch);
                if (defined(object)) {
                    return object;
                }
            }

            // if (top right || bottom left corners) || (top left corner) || (bottom right corner + (1, 0))
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

    PickFramebuffer.prototype.isDestroyed = function() {
        return false;
    };

    PickFramebuffer.prototype.destroy = function() {
        this._fb = this._fb && this._fb.destroy();
        return destroyObject(this);
    };

    return PickFramebuffer;
});
