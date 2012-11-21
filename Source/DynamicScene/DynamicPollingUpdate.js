/*global define*/
define([
        './CzmlNumber',
        './DynamicProperty'
    ], function(
        CzmlNumber,
        DynamicProperty
        ) {
    "use strict";

    /**
     * Represents a time-dynamic updater that is used to specify how often to request data.
     * @alias DynamicPollingUpdate
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     */
    var DynamicPollingUpdate = function() {
        this.refreshInterval = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's external property.
     * If the DynamicObject does not have a external property, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     * @memberof DynamicPollingUpdate
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the external data.
     * @param {Object} packet The CZML packet to process.
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicPollingUpdate.prototype.processCzmlPacket = function(dynamicObject, packet, interval) {
        var pollingUpdated = false;
        if(typeof packet.refreshInterval !== 'undefined'){
            var refreshInterval = dynamicObject.refreshInterval;
            if (typeof refreshInterval === 'undefined') {
                dynamicObject.refreshInterval = refreshInterval = new DynamicProperty(CzmlNumber);
                pollingUpdated = true;
            }
            refreshInterval.processCzmlIntervals(packet.refreshInterval, interval);
        }

        return pollingUpdated;
    };

    return DynamicPollingUpdate;
});