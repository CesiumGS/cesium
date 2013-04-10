/*global define*/
define(['../Core/incrementalGet',
        '../Core/TimeInterval',
        '../Core/TimeIntervalCollection',
        '../Core/DeveloperError',
        '../Core/uriQuery',
        '../Core/defaultValue'
       ], function(
         incrementalGet,
         TimeInterval,
         TimeIntervalCollection,
         DeveloperError,
         uriQuery,
         defaultValue) {
    "use strict";

    /**
     * A updater that requests data from a URL for a specified duration and stepsize. If the current time of the clock
     * goes out of the current duration, it requests data for the next specified duration.
     *
     * @alias TimeIntervalUpdater
     * @constructor
     *
     * @param {CzmlProcessor} czmlProcessor The CZML processor.
     * @param {DynamicObjectCollection} dynamicObjectCollection The dynamic object collection to update.
     * @param {DynamicExternalDocument} dynamicExternalDocument The external properties used by the TimeIntervalUpdater.
     * @param {function} [fillFunction={@link incrementalGet}] The function used to fill the {@link DynamicObjectCollection}.
     *
     * @exception {DeveloperError} czmlProcessor is required.
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} dynamicExternalDocument is required.
     */
    function TimeIntervalUpdater(czmlProcessor, dynamicObjectCollection, dynamicExternalDocument, fillFunction) {
        if(typeof czmlProcessor === 'undefined'){
            throw new DeveloperError('czmlProcessor is required.');
        }
        if(typeof dynamicObjectCollection === 'undefined'){
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if(typeof dynamicExternalDocument === 'undefined'){
            throw new DeveloperError('dynamicExternalDocument is required.');
        }

        if (typeof fillFunction === 'undefined') {
            fillFunction = incrementalGet;
        }

        this._czmlProcessor = czmlProcessor;
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._url = dynamicExternalDocument.url;
        this._eventName = defaultValue(dynamicExternalDocument.eventname, {getValue:function(){return undefined;}});
        var duration = {getValue:function(){return 900;}};
        var stepsize = {getValue:function(){return 60;}};
        if(typeof dynamicExternalDocument.simulationDrivenUpdate === 'undefined'){
            this._duration = duration;
            this._stepSize = stepsize;
        } else {
            this._duration = defaultValue(dynamicExternalDocument.simulationDrivenUpdate.duration, duration);//every 15 minutes
            this._stepSize = defaultValue(dynamicExternalDocument.simulationDrivenUpdate.stepsize, stepsize);//60 second step
        }
        this._fillFunction = fillFunction;
        this._intervalCollection = new TimeIntervalCollection();
    }

    /**
     * Called during the Cesium update loop.
     * @memberof TimeIntervalUpdater
     *
     * @param {JulianDate} currentTime The current time of the animation.
     *
     * @exception {DeveloperError} currentTime is required.
     */
    TimeIntervalUpdater.prototype.update = function(currentTime){
        if (typeof currentTime === 'undefined') {
            throw new DeveloperError('currentTime is required.');
        }

        if(!this._intervalCollection.contains(currentTime)){
            if(typeof this._handle !== 'undefined'){
               this._handle();
               this._handle = undefined;
            }
            var currentInterval = new TimeInterval(currentTime, currentTime.addSeconds(this._duration.getValue(currentTime)));
            var url = this._createUrl(currentTime, this._url, currentInterval, this._stepSize);

            var that = this;
            var storeHandle = true;
            var handle = this._fillFunction(url,
                    function(item){
                        that._czmlProcessor.process(item, that._dynamicObjectCollection, url);
                    },
                    function(czmlData) {
                        that._intervalCollection.addInterval(currentInterval);
                        storeHandle = false;
                        that._handle = undefined;
                    },
                    this._eventName.getValue(currentTime)
            );
            if (storeHandle) {
                this._handle = handle;
            }
        }
    };

    /**
     * Closes the connection to the event stream.
     *
     * @memberof TimeIntervalUpdater
     */
    TimeIntervalUpdater.prototype.abort = function() {
        if (typeof this._handle !== 'undefined') {
            this._handle();
            this._handle = undefined;
        }
    };

    TimeIntervalUpdater.prototype._createUrl = function(currentTime, url, interval, stepSize) {
        var startTime = interval.start;
        var stopTime = interval.stop;
        var step = stepSize.getValue(currentTime);
        var baseUrl = url.getValue(currentTime);

        var start = TimeIntervalUpdater._serializeDate(startTime);
        var stop = TimeIntervalUpdater._serializeDate(stopTime);

        var query = {
                'start': start,
                'stop': stop,
                'step': step
        };
        baseUrl = baseUrl + '?' + uriQuery.objectToQuery(query);

        return baseUrl;
    };

    TimeIntervalUpdater._serializeDate = function(date){
        return JSON.stringify({
            day : date.getJulianDayNumber(),
            secondsOfDay : date.getSecondsOfDay()
        });
    };

    return TimeIntervalUpdater;
});