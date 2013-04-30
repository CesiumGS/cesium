/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Renderer/PixelFormat',
        './Material',
        './ViewportQuad'
    ], function(
        BoundingRectangle,
        Color,
        defaultValue,
        destroyObject,
        PixelFormat,
        Material,
        ViewportQuad) {
    "use strict";

    var defaultFpsColor = Color.fromCssColorString('#e52');
    var defaultFrameTimeColor = Color.fromCssColorString('#de3');
    var defaultBackgroundColor = Color.fromCssColorString('rgba(0, 0, 30, 0.9)');
    var defaultRectangle = new BoundingRectangle(0, 0, 80, 40);

    /**
     * Draws a display in the top left corner of the scene displaying FPS (frames per second),
     * averaged over 1 second intervals, as well as unaveraged frame time.
     *
     * @alias PerformanceDisplay
     * @constructor
     *
     * @param {Color} [description.fpsColor] The color of the FPS graph.
     * @param {Color} [description.frameTimeColor] The color of the frame time graph.
     * @param {Color} [description.backgroundColor] The color of the background of the display.
     * @param {String} [description.font] The CSS font of the text in the display.
     * @param {BoundingRectangle} [description.rectangle] The position and size of the display, relative to the top left corner.
     *
     * @example
     * scene.getPrimitives().add(new PerformanceDisplay());
     */
    var PerformanceDisplay = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        this._fpsColor = defaultValue(description.fpsColor, defaultFpsColor).toCssColorString();
        this._frameTimeColor = defaultValue(description.frameTimeColor, defaultFrameTimeColor).toCssColorString();
        this._backgroundColor = defaultValue(description.backgroundColor, defaultBackgroundColor).toCssColorString();
        this._font = defaultValue(description.font, 'bold 10px Helvetica,Arial,sans-serif');
        this._rectangle = defaultValue(description.rectangle, defaultRectangle);

        this._canvas = document.createElement('canvas');
        this._canvas.width = this._rectangle.width;
        this._canvas.height = this._rectangle.height;

        this._canvasContext = this._canvas.getContext('2d');
        this._canvasContext.font = this._font;
        this._canvasContext.lineWidth = 1;

        this._bufferLength = this._rectangle.width;
        this._frameTimeSamples = new Array(this._bufferLength);
        this._fpsSamples = new Array(this._bufferLength);

        for ( var i = 0; i < this._bufferLength; i++) {
            this._frameTimeSamples[i] = this._fpsSamples[i] = 0;
        }

        this._frameTimeIndex = 0;
        this._fpsIndex = 0;
        this._lastFpsSampleTime = undefined;
        this._frameCount = 0;

        this._quad = undefined;

        this._time = undefined;
        this._texture = undefined;
        this._viewportHeight = 0;
    };

    /**
     * Update the display.  This function should only be called once per frame, because
     * each call records a frame in the internal buffer and redraws the display.
     */
    PerformanceDisplay.prototype.update = function(context, frameState, commandList) {
        if (typeof this._time === 'undefined') {
            //first update
            this._lastFpsSampleTime = this._time = Date.now();
            return;
        }

        var previousTime = this._time;
        var time = this._time = Date.now();

        var frameTime = time - previousTime;
        this._frameTimeSamples[this._frameTimeIndex++] = frameTime;

        if (this._frameTimeIndex >= this._bufferLength) {
            this._frameTimeIndex = 0;
        }

        this._frameCount++;
        var fps = this._fps;
        var fpsElapsedTime = time - this._lastFpsSampleTime;
        if (fpsElapsedTime > 1000) {
            fps = this._fps = this._frameCount * 1000 / fpsElapsedTime | 0;
            this._fpsSamples[this._fpsIndex++] = fps;

            if (this._fpsIndex >= this._bufferLength) {
                this._fpsIndex = 0;
            }

            this._lastFpsSampleTime = time;
            this._frameCount = 0;
        }

        var ctx = this._canvasContext;
        var canvasWidth = this._rectangle.width;
        var canvasHeight = this._rectangle.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = this._backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (typeof fps !== 'undefined') {
            ctx.fillStyle = this._fpsColor;
            ctx.textAlign = 'left';
            ctx.fillText(fps + ' FPS', 1, 10);
        }

        ctx.fillStyle = this._frameTimeColor;
        ctx.textAlign = 'right';
        ctx.fillText(frameTime + ' MS', canvasWidth - 1, 10);

        for ( var i = 0; i < this._bufferLength; i++) {
            fps = this._fpsSamples[(i + this._fpsIndex) % this._bufferLength];
            if (fps > 0) {
                this._drawLine(this._fpsColor, i, fps / 100);
            }

            frameTime = this._frameTimeSamples[(i + this._frameTimeIndex) % this._bufferLength];
            if (frameTime > 0) {
                this._drawLine(this._frameTimeColor, i, frameTime / 200);
            }
        }

        if (typeof this._quad === 'undefined') {
            this._quad = new ViewportQuad(undefined, Material.fromType(context, Material.ImageType));
        }

        if (typeof this._texture === 'undefined') {
            this._texture = context.createTexture2D({
                source : this._canvas,
                pixelFormat : PixelFormat.RGBA
            });
            this._quad.material.uniforms.image = this._texture;
        } else {
            this._texture.copyFrom(this._canvas);
        }

        var viewportHeight = context.getCanvas().clientHeight;
        if (viewportHeight !== this._viewportHeight) {
            this._viewportHeight = viewportHeight;
            var rect = this._quad.rectangle;
            rect.x = this._rectangle.x;
            rect.y = viewportHeight - canvasHeight - this._rectangle.y;
            rect.width = canvasWidth;
            rect.height = canvasHeight;
        }

        this._quad.update(context, frameState, commandList);
    };

    PerformanceDisplay.prototype._drawLine = function(style, x, valuePercent) {
        var ctx = this._canvasContext;
        var canvasHeight = this._rectangle.height;
        var maxGraphHeight = canvasHeight - 10;

        x = 0.5 + x;
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.moveTo(x, canvasHeight);

        var lineHeight = valuePercent * maxGraphHeight;
        if (lineHeight > maxGraphHeight) {
            lineHeight = maxGraphHeight;
        }

        var y = canvasHeight - lineHeight;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    /**
     * Destroys the WebGL resources held by this object.
     */
    PerformanceDisplay.prototype.destroy = function() {
        this._quad = this._quad.destroy();
        return destroyObject(this);
    };

    return PerformanceDisplay;
});
