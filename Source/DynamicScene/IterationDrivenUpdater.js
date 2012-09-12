/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/defaultValue',
        './fillIncrementally'
    ], function(
         DeveloperError,
         defaultValue,
         fillIncrementally) {
    "use strict";

    /**
     * A updater that retrieves data from the url at the specified number of iterations.
     *
     * @alias IterationDrivenUpdater
     * @constructor
     *
     * @param {DocumentManager} documentManager The document manager.
     * @param {String} url The url of the document.
     * @param {Number} [numOfIterations=0] The number of iterations.
     * @param {function} [fillFunction={@link fillIncrementally}] The function used to fill the {@link DynamicObjectCollection}.
     *
     * @exception {DeveloperError} documentManager is required.
     * @exception {DeveloperError} url is required.
     *
     */
    var IterationDrivenUpdater = function IterationDrivenUpdater(documentManager, url, numOfIterations, fillFunction) {
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
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to update.
     */
    IterationDrivenUpdater.prototype.update = function(time, dynamicObjectCollection) {
        if(this._currentIteration < this._numOfIterations){
            if (typeof this._handle === 'undefined') {
                var self = this;
                var storeHandle = true;
                var handle = this._fillFunction(dynamicObjectCollection, this._url.getValue(time),
                        function(item, doc, url){
                            self._documentManager.process(item, doc, url);
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
            this._handle.abort();
            this._handle = undefined;
        }
    };

    return IterationDrivenUpdater;
});