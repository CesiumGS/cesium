/*global define*/
define([
        '../Core/createGuid',
        '../Core/defaultValue',
        '../Core/Clock',
        '../Core/ClockRange',
        '../Core/ClockStep',
        '../Core/Iso8601',
        '../Core/JulianDate',
        '../Core/TimeInterval',
        '../Core/DeveloperError',
        './CzmlDefaults'
       ], function(
        createGuid,
        defaultValue,
        Clock,
        ClockRange,
        ClockStep,
        Iso8601,
        JulianDate,
        TimeInterval,
        DeveloperError,
        CzmlDefaults) {
    "use strict";

    var processClock = function(clock, clockPacket) {
        if (typeof clockPacket.interval !== 'undefined') {
            var interval = TimeInterval.fromIso8601(clockPacket.interval);
            if (typeof interval !== 'undefined') {
                clock.startTime = interval.start;
                clock.stopTime = interval.stop;
            }
        }
        if (typeof clockPacket.currentTime !== 'undefined') {
            clock.currentTime = JulianDate.fromIso8601(clockPacket.currentTime);
        }
        if (typeof typeof clockPacket.range !== 'undefined') {
            clock.clockRange = ClockRange[clockPacket.range];
        }
        if (typeof clockPacket.step !== 'undefined') {
            clock.clockStep = ClockStep[clockPacket.step];
        }
        if (typeof clockPacket.multiplier !== 'undefined') {
            clock.multiplier = clockPacket.multiplier;
        }
    };

    function processCzmlPacket(packet, dynamicObjectCollection, updatedObjects, updatedObjectsHash, updaterFunctions, sourceUri) {
        var objectId = packet.id;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        if (objectId === 'document') {
            var document = dynamicObjectCollection.getOrCreateObject(objectId);
            var clockPacket = packet.clock;
            if (typeof clockPacket !== 'undefined') {
                var clock = document.clock;
                if (typeof clock === 'undefined') {
                    clock = new Clock({
                        startTime : Iso8601.MAXIMUM_INTERVAL.start,
                        stopTime : Iso8601.MAXIMUM_INTERVAL.stop,
                        currentTime : new JulianDate(),
                        clockRange : ClockRange.LOOP_STOP,
                        clockStep : ClockStep.SYSTEM_CLOCK_MULTIPLIER,
                        multiplier : 1.0,
                        shoutAnimage : false
                    });
                    document.clock = clock;
                }
                processClock(clock, clockPacket);
            }
        } else if (packet['delete'] === true) {
            dynamicObjectCollection.removeObject(objectId);
        } else {
            var object = dynamicObjectCollection.getOrCreateObject(objectId);
            for ( var i = updaterFunctions.length - 1; i > -1; i--) {
                if (updaterFunctions[i](object, packet, dynamicObjectCollection, sourceUri) && typeof updatedObjectsHash[objectId] === 'undefined') {
                    updatedObjectsHash[objectId] = true;
                    updatedObjects.push(object);
                }
            }
        }
    }

    /**
     * Processes the provided CZML, creating or updating DynamicObject instances for each
     * corresponding CZML identifier.
     * @exports processCzml
     *
     * @param {Object} czml The parsed CZML object to be processed.
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to create or updated objects within.
     * @param {String} [sourceUri] The uri of the file where the CZML originated from.  If provided, relative uri look-ups will use this as their base.
     * @param {Array} [updaterFunctions=CzmlDefaults.updaters] The array of updated functions to use for processing.  If left undefined, all standard CZML data is processed.
     *
     * @exception {DeveloperError} czml is required.
     * @exception {DeveloperError} dynamicObjectCollection is required.
     *
     * @returns An array containing all DynamicObject instances that were created or updated.
     *
     * @example
     * var url = 'http://someUrl.com/myCzmlFile.czml';
     * var dynamicObjectCollection = new DynamicObjectCollection();
     * loadJson(url).then(function(czml) {
     *     processCzml(czml, dynamicObjectCollection, url);
     * });
     */
    var processCzml = function(czml, dynamicObjectCollection, sourceUri, updaterFunctions) {
        if (typeof czml === 'undefined') {
            throw new DeveloperError('czml is required.');
        }
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }

        var updatedObjects = [];
        var updatedObjectsHash = {};
        updaterFunctions = typeof updaterFunctions !== 'undefined' ? updaterFunctions : CzmlDefaults.updaters;

        if (Array.isArray(czml)) {
            for ( var i = 0, len = czml.length; i < len; i++) {
                processCzmlPacket(czml[i], dynamicObjectCollection, updatedObjects, updatedObjectsHash, updaterFunctions, sourceUri);
            }
        } else {
            processCzmlPacket(czml, dynamicObjectCollection, updatedObjects, updatedObjectsHash, updaterFunctions, sourceUri);
        }

        if (updatedObjects.length > 0) {
            dynamicObjectCollection.objectPropertiesChanged.raiseEvent(dynamicObjectCollection, updatedObjects);
        }

        return updatedObjects;
    };

    return processCzml;
});
