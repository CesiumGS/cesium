define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/getTimestamp',
        '../Widgets/getElement'
    ], function(
        defaultValue,
        defined,
        defineProperties,
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
        this._fpsText = document.createTextNode('');
        fpsElement.appendChild(this._fpsText);
        var msElement = document.createElement('div');
        msElement.className = 'cesium-performanceDisplay-ms';
        this._msText = document.createTextNode('');
        msElement.appendChild(this._msText);
        display.appendChild(msElement);
        display.appendChild(fpsElement);
        this._container.appendChild(display);

        this._lastFpsSampleTime = getTimestamp();
        this._lastMsSampleTime = getTimestamp();
        this._fpsFrameCount = 0;
        this._msFrameCount = 0;

        this._throttled = false;
        var throttledElement = document.createElement('div');
        throttledElement.className = 'cesium-performanceDisplay-throttled';
        this._throttledText = document.createTextNode('');
        throttledElement.appendChild(this._throttledText);
        display.appendChild(throttledElement);
    }

     defineProperties(PerformanceDisplay.prototype, {
        /**
         * The display should indicate the FPS is being throttled.
         * @memberof PerformanceDisplay.prototype
         *
         * @type {Boolean}
         */
        throttled : {
            get : function() {
                return this._throttled;
            },
            set : function(value) {
                if (this._throttled === value) {
                    return;
                }

                if (value) {
                    this._throttledText.nodeValue = '(throttled)';
                } else {
                    this._throttledText.nodeValue = '';
                }

                this._throttled = value;
            }
        }
    });

    /**
     * Update the display.  This function should only be called once per frame, because
     * each call records a frame in the internal buffer and redraws the display.
     *
     * @param {Boolean} [renderedThisFrame=true] If provided, the FPS count will only update and display if true.
     */
    PerformanceDisplay.prototype.update = function(renderedThisFrame) {
        var time = getTimestamp();
        var updateDisplay = defaultValue(renderedThisFrame, true);

        this._fpsFrameCount++;
        var fpsElapsedTime = time - this._lastFpsSampleTime;
        if (fpsElapsedTime > 1000) {
            var fps = 'N/A';
            if (updateDisplay) {
                fps = this._fpsFrameCount * 1000 / fpsElapsedTime | 0;
            }

            this._fpsText.nodeValue = fps + ' FPS';
            this._lastFpsSampleTime = time;
            this._fpsFrameCount = 0;
        }

        this._msFrameCount++;
        var msElapsedTime = time - this._lastMsSampleTime;
        if (msElapsedTime > 200) {
            var ms = 'N/A';
            if (updateDisplay) {
                ms = (msElapsedTime / this._msFrameCount).toFixed(2);
            }

            this._msText.nodeValue = ms + ' MS';
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
