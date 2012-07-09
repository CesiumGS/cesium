/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Color',
        './RenderbufferFormat'
    ], function(
        destroyObject,
        Color,
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
                depthStencilRenderbuffer : context.createRenderbuffer({
                    format : RenderbufferFormat.DEPTH_STENCIL
                })
            });
        }

        // Clear to black.  Since this is the background color, no objects will be black
        context.clear(context.createClearState({
            framebuffer : this._fb,
            color : new Color(0.0, 0.0, 0.0, 1.0),
            depth : 1.0,
            stencil : 0
        }));

        return this._fb;
    };

    /**
     * DOC_TBA
     * @memberof PickFramebuffer
     */
    PickFramebuffer.prototype.end = function(screenSpacePosition) {
        if (screenSpacePosition) {
            // TODO:  function with custom width/height
            var pixels = this._context.readPixels({
                x : screenSpacePosition.x,
                y : screenSpacePosition.y,
                width : 1,
                height : 1,
                framebuffer : this._fb
            });

            return this._context.getObjectByPickId(new Color(pixels[0], pixels[1], pixels[2], pixels[3]));
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