/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getTimestamp',
        '../Widgets/getElement'
    ], function(
        Color,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        getTimestamp,
        getElement) {
    "use strict";

    var defaultFpsColor = Color.fromCssColorString('#e52');
    var defaultFrameTimeColor = Color.fromCssColorString('#de3');
    var defaultBackgroundColor = Color.fromCssColorString('rgba(40, 40, 40, 0.7)');

    /**
     * @private
     */
    var PerformanceDisplay = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var container = getElement(options.container);
        if (!defined(container)) {
            throw new DeveloperError('container is required');
        }

        this._container = container;
        this._fpsColor = defaultValue(options.fpsColor, defaultFpsColor).toCssColorString();
        this._frameTimeColor = defaultValue(options.frameTimeColor, defaultFrameTimeColor).toCssColorString();
        this._backgroundColor = defaultValue(options.backgroundColor, defaultBackgroundColor).toCssColorString();
        this._font = defaultValue(options.font, 'bold 12px Helvetica,Arial,sans-serif');

        var display = document.createElement('div');
        var fpsElement = document.createElement('div');
        this._fpsText = document.createTextNode("");
        fpsElement.appendChild(this._fpsText);
        fpsElement.style.color = this._fpsColor;
        var msElement = document.createElement('div');
        this._msText = document.createTextNode("");
        msElement.style.color = this._frameTimeColor;
        msElement.appendChild(this._msText);
        display.appendChild(fpsElement);
        display.appendChild(msElement);
        display.style['z-index'] = 1;
        display.style['background-color'] = this._backgroundColor;
        display.style.font = this._font;
        display.style.padding = '7px';
        display.style['border-radius'] = '5px';
        display.style.border = '1px solid #444';
        this._container.appendChild(display);

        this._lastFpsSampleTime = undefined;
        this._frameCount = 0;
        this._time = undefined;
        this._fps = 0;
        this._frameTime = 0;
    };

    /**
     * Update the display.  This function should only be called once per frame, because
     * each call records a frame in the internal buffer and redraws the display.
     */
    PerformanceDisplay.prototype.update = function() {
        if (!defined(this._time)) {
            //first update
            this._lastFpsSampleTime = getTimestamp();
            this._time = getTimestamp();
            return;
        }

        var previousTime = this._time;
        var time = getTimestamp();
        this._time = time;

        var frameTime = time - previousTime;

        this._frameCount++;
        var fps = this._fps;
        var fpsElapsedTime = time - this._lastFpsSampleTime;
        if (fpsElapsedTime > 1000) {
            fps = this._frameCount * 1000 / fpsElapsedTime | 0;

            this._lastFpsSampleTime = time;
            this._frameCount = 0;
        }

        if (fps !== this._fps) {
            this._fpsText.nodeValue = fps + ' FPS';
            this._fps = fps;
        }

        if (frameTime !== this._frameTime) {
            this._msText.nodeValue = frameTime.toFixed(2) + ' MS';
            this._frameTime = frameTime;
        }

    };

    /**
     * Destroys the WebGL resources held by this object.
     */
    PerformanceDisplay.prototype.destroy = function() {
        return destroyObject(this);
    };

    return PerformanceDisplay;
});
