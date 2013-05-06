/*global define*/
define(['../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/DeveloperError',
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/loadJson',
        '../DynamicScene/DynamicClock',
        '../DynamicScene/processCzml',
        '../DynamicScene/DynamicObjectCollection'
        ], function(
                ClockRange,
                ClockStep,
                DeveloperError,
                Event,
                Iso8601,
                loadJson,
                DynamicClock,
                processCzml,
                DynamicObjectCollection) {
    "use strict";

    function loadCzml(czml, dynamicObjectCollection, source) {
        processCzml(czml, dynamicObjectCollection, source);
        var availability = dynamicObjectCollection.computeAvailability();

        var clock;
        if (typeof document !== 'undefined' && typeof document.clock !== 'undefined') {
            clock = new DynamicClock();
            clock.startTime = document.clock.startTime;
            clock.stopTime = document.clock.stopTime;
            clock.clockRange = document.clock.clockRange;
            clock.clockStep = document.clock.clockStep;
            clock.multiplier = document.clock.multiplier;
            clock.currentTime = document.clock.currentTime;
        } else if (!availability.start.equals(Iso8601.MINIMUM_VALUE)) {
            clock = new DynamicClock();
            clock.startTime = availability.start;
            clock.stopTime = availability.stop;
            clock.clockRange = ClockRange.LOOP_STOP;
            var totalSeconds = clock.startTime.getSecondsDifference(clock.stopTime);
            var multiplier = Math.round(totalSeconds / 120.0);
            if (multiplier < 1) {
                multiplier = 1;
            }
            clock.multiplier = multiplier;
            clock.currentTime = clock.startTime;
            clock.clockStep = ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        }
        return clock;
    }

    var CzmlDataSource = function(czml, source) {
        this._changed = new Event();
        this._clock = undefined;
        this._dynamicObjectCollection = new DynamicObjectCollection();
        this._ready = false;
        this._temporal = true;

        if (typeof czml !== 'undefined') {
            this._clock = loadCzml(czml, this._dynamicObjectCollection, source);
            this._ready = true;
            this._changed.raiseEvent(this);
        }
    };

    CzmlDataSource.prototype.getChangedEvent = function() {
        return this._changed;
    };

    CzmlDataSource.fromString = function(string, name) {
        return new CzmlDataSource(JSON.parse(string), name);
    };

    CzmlDataSource.fromUrl = function(url) {
        return loadJson(url).then(function(czml) {
            var dataSource = new CzmlDataSource();
            dataSource._clock = loadCzml(czml, dataSource._dynamicObjectCollection, url);
            dataSource._ready = true;
            dataSource._changed.raiseEvent(dataSource);
            return dataSource;
        });
    };

    CzmlDataSource.prototype.getClock = function() {
        return this._clock;
    };

    CzmlDataSource.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    CzmlDataSource.prototype.getIsTemporal = function() {
        return this._temporal;
    };

    CzmlDataSource.prototype.getIsReady = function() {
        return this._ready;
    };

    return CzmlDataSource;
});