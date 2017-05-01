/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getTimestamp',
        '../Widgets/getElement'
    ], function(
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(container)) {
            throw new DeveloperError('container is required');
        }
        //>>includeEnd('debug');

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

        this._lastFpsSampleTime = getTimestamp();
        this._lastMsSampleTime = getTimestamp();
        this._fpsFrameCount = 0;
        this._msFrameCount = 0;
    }

    /**
     * Update the display.  This function should only be called once per frame, because
     * each call records a frame in the internal buffer and redraws the display.
     */
    PerformanceDisplay.prototype.update = function() {
        var time = getTimestamp();

        this._fpsFrameCount++;
        var fpsElapsedTime = time - this._lastFpsSampleTime;
        if (fpsElapsedTime > 1000) {
            var fps = this._fpsFrameCount * 1000 / fpsElapsedTime | 0;
            this._fpsText.nodeValue = fps + ' FPS';
            this._lastFpsSampleTime = time;
            this._fpsFrameCount = 0;
        }

        this._msFrameCount++;
        var msElapsedTime = time - this._lastMsSampleTime;
        if (msElapsedTime > 200) {
            this._msText.nodeValue = (msElapsedTime / this._msFrameCount).toFixed(2) + ' MS';
            this._lastMsSampleTime = time;
            this._msFrameCount = 0;
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
