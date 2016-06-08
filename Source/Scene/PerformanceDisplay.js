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
    'use strict';

    /**
     * @private
     */
    function PerformanceDisplay(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var container = getElement(options.container);
        if (!defined(container)) {
            throw new DeveloperError('container is required');
        }

        this._container = container;

        var display = document.createElement('div');
        display.className = 'cesium-performanceDisplay';
        var fpsElement = document.createElement('div');
        fpsElement.className = 'cesium-performanceDisplay-fps';
        this._fpsText = document.createTextNode("");
        fpsElement.appendChild(this._fpsText);
        var msElement = document.createElement('div');
        msElement.className = 'cesium-performanceDisplay-ms';
        this._msText = document.createTextNode("");
        msElement.appendChild(this._msText);
        display.appendChild(msElement);
        display.appendChild(fpsElement);
        this._container.appendChild(display);

        this._lastFpsSampleTime = undefined;
        this._frameCount = 0;
        this._time = undefined;
        this._fps = 0;
        this._frameTime = 0;
    }

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
