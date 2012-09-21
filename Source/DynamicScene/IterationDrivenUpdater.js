/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        '../Core/incrementalGet'
    ], function(
         DeveloperError,
         defaultValue,
         incrementalGet) {
    "use strict";

    /**
     * A updater that retrieves data from the url at the specified number of iterations.
     *
     * @alias IterationDrivenUpdater
     * @constructor
     *
     * @param {CzmlProcessor} czmlProcessor The CZML processor.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     * @param {DynamicObject} url The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [fillFunction={@link incrementalGet}] The function used to fill the {@link DynamicObjectCollection}.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} url is required.
     *
     */
    var IterationDrivenUpdater = function IterationDrivenUpdater(czmlProcessor, dynamicObjectCollection, url, numOfIterations, fillFunction) {
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
            fillFunction = incrementalGet;
        }
        this._czmlProcessor = czmlProcessor;
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._numOfIterations = defaultValue(numOfIterations, 1);
        this._currentIteration = 0;
        this._fillFunction = fillFunction;
        this._url = url;
    };

    /**
     * Called during the Cesium update loop.
     * @memberof IterationDrivenUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     */
    IterationDrivenUpdater.prototype.update = function(time) {
        if(this._currentIteration < this._numOfIterations){
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var url = this._url.getValue(time);
                var handle = this._fillFunction(url,
                        function(item){
                            self._czmlProcessor.process(item, self._dynamicObjectCollection, url);
                        },
                        function() {
                            storeHandle = false;
                            self._handle = undefined;
                            ++self._currentIteration;
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
     * @memberof IterationDrivenUpdater
     */
    IterationDrivenUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle();
            this._handle = undefined;
        }
    };

    return IterationDrivenUpdater;
});