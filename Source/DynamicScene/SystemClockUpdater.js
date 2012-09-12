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
     * @param {DocumentManager} documentManager The document manager.
     * @param {String} url The url of the document.
     * @param {Number} refreshRate The time in seconds to poll the server.
     * @param {function} [fillFunction={@link fillIncrementally}] The function used to fill the {@link DynamicObjectCollection}.
     *
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} url is required.
     *
     * @see fillIncrementally
     */
    var SystemClockUpdater = function SystemClockUpdater(documentManager, url, refreshRate, fillFunction) {
        if (typeof documentManager === 'undefined') {
            throw new DeveloperError('documentManager is required.');
        }
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required.');
        }

        if (typeof fillFunction === 'undefined') {
            fillFunction = fillIncrementally;
        }

        this._documentManager = documentManager;
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
     * @param {DynamicObjectCollection} dynamicObjectCollection The buffer to update.
     */
    SystemClockUpdater.prototype.update = function(currentTime, dynamicObjectCollection) {
        var now = new Date();
        if(typeof this._lastUpdateTime === 'undefined' || now.valueOf() >= this._lastUpdateTime.valueOf() + this._refreshRate.getValue(currentTime) * 1000){
            this._lastUpdateTime = now;
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._fillFunction(dynamicObjectCollection, this._url.getValue(currentTime),
                        function(item, buffer, url){
                            self._documentManager.process(item, buffer, url);
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
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return SystemClockUpdater;
});