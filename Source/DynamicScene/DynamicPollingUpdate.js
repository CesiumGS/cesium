/*global define*/
define([
        '../Core/defaultValue',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        './CzmlNumber',
        './CzmlString',
        './DynamicProperty'
    ], function(
        defaultValue,
        TimeInterval,
        Iso8601,
        CzmlNumber,
        CzmlString,
        DynamicProperty
        ) {
    "use strict";

    /**
     *
     *
     * @alias DynamicPollingUpdate
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults
     */
    var DynamicPollingUpdate = function() {
        this.refreshInterval = undefined;
    };

    /**
     * Processes the provided CZML interval or intervals into this property.
     * @memberof DynamicPollingUpdate
     *
     * @param {Object} czmlIntervals The CZML data to process.
     * @param {TimeInterval} [constrainedInterval] Constrains the processing so that any times outside of this interval are ignored.
     * @param {String} [sourceUri] The originating URL of the CZML being processed.
     */
    DynamicPollingUpdate.prototype.processCzmlIntervals = function(pollingUpdatePacket) {
        var pollingUpdated = false;

        var refreshInterval = pollingUpdatePacket.refreshInterval;
        if (typeof refreshInterval === 'undefined') {
            this.refreshInterval = refreshInterval = new DynamicProperty(CzmlNumber);
            pollingUpdated = true;
        }
        refreshInterval.processCzmlIntervals(pollingUpdatePacket.refreshInterval);

        return pollingUpdated;
    };



    return DynamicPollingUpdate;
});