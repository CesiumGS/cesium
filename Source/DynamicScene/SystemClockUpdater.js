/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        './fillIncrementally'
    ], function(
         DeveloperError,
         defaultValue,
         fillIncrementally) {
    "use strict";

    /**
     * A updater that retrieves data from the url at the specified refreshRate based on the system clock.
     *
     * @alias SystemClockUpdater
     * @constructor
     *
     * @param {CzmlProcessor} czmlProcessor The document manager.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     * @param {DynamicObject} url A dynamic property whose value is the URL of the event stream.
     * @param {DynamicObject} refreshRate A dynamic property whose value is the interval to request data from the URL.
     * @param {function} [fillFunction={@link fillIncrementally}] The function used to fill the {@link DynamicObjectCollection}.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} url is required.
     *
     * @see fillIncrementally
     */
    var SystemClockUpdater = function SystemClockUpdater(czmlProcessor, dynamicObjectCollection, url, refreshRate, fillFunction) {
        if (typeof czmlProcessor === 'undefined') {
            throw new DeveloperError('czmlProcessor is required.');
        }
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        if (typeof fillFunction === 'undefined') {
            fillFunction = fillIncrementally;
        }

        this._czmlProcessor = czmlProcessor;
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._refreshRate = defaultValue(refreshRate, 60);//default to 60 seconds
        this._fillFunction = fillFunction;
        this._url = url;
        this._lastUpdateTime = new Date();
    };

    /**
     * Called during the Cesium update loop.
     * @memberof SystemClockUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     */
    SystemClockUpdater.prototype.update = function(currentTime) {
        var now = new Date();
        if(typeof this._lastUpdateTime === 'undefined' || now.valueOf() >= this._lastUpdateTime.valueOf() + this._refreshRate.getValue(currentTime) * 1000){
            this._lastUpdateTime = now;
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._fillFunction(this._dynamicObjectCollection, this._url.getValue(currentTime),
                        function(item, dynamicObjectCollection, url){
                            self._czmlProcessor.process(item, dynamicObjectCollection, url);
                        },
                        function(czmlData) {
                            storeHandle = false;
                            self._handle = undefined;
                        }
                );
                if (storeHandle) {
                    this._handle = handle;
                }
            }
        }
    };

    /**
     * Aborts the current connection.
     * @memberof SystemClockUpdater
     */
    SystemClockUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle();
            this._handle = undefined;
        }
    };

    return SystemClockUpdater;
});