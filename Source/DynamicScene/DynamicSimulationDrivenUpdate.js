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
     * Represents a time-dynamic updater that is used to specify how how big of an interval of data to request.
     *
     * @alias DynamicSimulationDrivenUpdate
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     */
    var DynamicSimulationDrivenUpdate = function() {
        this.refreshInterval = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's external property.
     * If the DynamicObject does not have a external property, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     * @memberof DynamicSimulationDrivenUpdate
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
    DynamicSimulationDrivenUpdate.prototype.processCzmlPacket = function(dynamicObject, packet, interval) {
        var simulationDrivenUpdated = false;
        if(typeof packet.duration !== 'undefined'){
            var duration = dynamicObject.duration;
            if (typeof duration === 'undefined') {
                dynamicObject.duration = duration = new DynamicProperty(CzmlNumber);
                simulationDrivenUpdated = true;
            }
            duration.processCzmlIntervals(packet.duration, interval);
        }

        if(typeof packet.stepsize !== 'undefined'){
            var stepsize = dynamicObject.stepsize;
            if (typeof stepSize === 'undefined') {
                dynamicObject.stepsize = stepsize = new DynamicProperty(CzmlNumber);
                simulationDrivenUpdated = true;
            }
            stepsize.processCzmlIntervals(packet.stepsize, interval);
        }

        return simulationDrivenUpdated;
    };

    return DynamicSimulationDrivenUpdate;
});