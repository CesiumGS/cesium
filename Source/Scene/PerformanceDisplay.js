/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Widgets/getElement'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        getElement) {
    "use strict";

    var defaultFpsColor = Color.fromCssColorString('#e52');
    var defaultFrameTimeColor = Color.fromCssColorString('#de3');
    var defaultBackgroundColor = Color.fromCssColorString('rgba(40, 40, 40, 0.7)');

    /**
     * Draws a display in the top left corner of the scene displaying FPS (frames per second),
     * averaged over 1 second intervals, as well as unaveraged frame time.
     *
     * @alias PerformanceDisplay
     * @constructor
     *
     * @param {Element} description.container The DOM element or ID that will contain the performance display.
     * @param {Color} [description.fpsColor] The color of the FPS graph.
     * @param {Color} [description.frameTimeColor] The color of the frame time graph.
     * @param {Color} [description.backgroundColor] The color of the background of the display.
     * @param {String} [description.font] The CSS font of the text in the display.
     *
     * @example
     * scene.getPrimitives().add(new PerformanceDisplay());
     */
    var PerformanceDisplay = function(description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);

        var container = getElement(description.container);
        if (!defined(container)) {
            throw new DeveloperError('conatiner is required');
        }

        this._container = container;
        this._fpsColor = defaultValue(description.fpsColor, defaultFpsColor).toCssColorString();
        this._frameTimeColor = defaultValue(description.frameTimeColor, defaultFrameTimeColor).toCssColorString();
        this._backgroundColor = defaultValue(description.backgroundColor, defaultBackgroundColor).toCssColorString();
        this._font = defaultValue(description.font, 'bold 14px Helvetica,Arial,sans-serif');

        var display = document.createElement('div');
        this._fpsElement = document.createElement('div');
        this._fpsElement.style.color = this._fpsColor;
        this._msElement = document.createElement('div');
        this._msElement.style.color = this._frameTimeColor;
        display.appendChild(this._fpsElement);
        display.appendChild(this._msElement);
        display.style['z-index'] = 1;
        display.style['background-color'] = this._backgroundColor;
        display.style.font = this._font;
        display.style.padding = '7px';
        display.style['border-radius']= '5px';
        display.style.border = '1px solid #444';
        this._container.appendChild(display);

        this._lastFpsSampleTime = undefined;
        this._frameCount = 0;
        this._time = undefined;
    };

    /**
     * Update the display.  This function should only be called once per frame, because
     * each call records a frame in the internal buffer and redraws the display.
     */
    PerformanceDisplay.prototype.update = function() {
        if (!defined(this._time)) {
            //first update
            this._lastFpsSampleTime = Date.now();
            this._time = Date.now();
            return;
        }

        var previousTime = this._time;
        this._time = Date.now();
        var time = this._time;

        var frameTime = time - previousTime;

        this._frameCount++;
        var fps = this._fps;
        var fpsElapsedTime = time - this._lastFpsSampleTime;
        if (fpsElapsedTime > 1000) {
            this._fps = this._frameCount * 1000 / fpsElapsedTime | 0;
            fps = this._fps;

            this._lastFpsSampleTime = time;
            this._frameCount = 0;
        }

        if (defined(fps)) {
            this._fpsElement.textContent = fps + ' FPS';
        }

        this._msElement.textContent = frameTime + ' MS';
    };

    /**
     * Destroys the WebGL resources held by this object.
     */
    PerformanceDisplay.prototype.destroy = function() {
        return destroyObject(this);
    };

    return PerformanceDisplay;
});
