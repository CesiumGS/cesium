/*global define*/
define([
        '../Core/defaultValue',
        '../Core/TimeInterval',
        './CzmlBoolean',
        './CzmlNumber',
        './CzmlString',
        './DynamicProperty',
        './DynamicPollingUpdate',
        './DynamicSimulationDrivenUpdate'
    ], function(
        defaultValue,
        TimeInterval,
        CzmlBoolean,
        CzmlNumber,
        CzmlString,
        DynamicProperty,
        DynamicPollingUpdate,
        DynamicSimulationDrivenUpdate
        ) {
    "use strict";

    /**
     * Represents a time-dynamic external document. Typically used to combine multiple documents from various locations.
     *
     * @alias DynamicExternalDocument
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults
     */
    var DynamicExternalDocument = function() {
        this.pollingUpdate = undefined;
        this.simulationDrivenUpdate = undefined;
        this.url = undefined;
        this.eventname = undefined;
        this.sourceType = undefined;
        this.reconnectOnError = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's external property.
     * If the DynamicObject does not have a external property, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     * @memberof DynamicExternalDocument
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
    DynamicExternalDocument.processCzmlPacket = function(dynamicObject, packet) {
        var externalData = packet.external;
        if (typeof externalData === 'undefined') {
            return false;
        }

        var externalUpdated = false;
        var external = dynamicObject.external;
        externalUpdated = typeof external === 'undefined';
        if (externalUpdated) {
            dynamicObject.external = external = new DynamicExternalDocument();
        }

        var interval = externalData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if(typeof externalData.url !== 'undefined'){
            var url = external.url;
            if (typeof url === 'undefined') {
                external.url = url = new DynamicProperty(CzmlString);
                externalUpdated = true;
            }
            url.processCzmlIntervals(externalData.url, interval);
        }

        if(typeof externalData.sourceType !== 'undefined'){
            var sourceType = external.sourceType;
            if (typeof sourceType === 'undefined') {
                external.sourceType = sourceType = new DynamicProperty(CzmlString);
                externalUpdated = true;
            }
            sourceType.processCzmlIntervals(externalData.sourceType, interval);
        }

        if(typeof externalData.scope !== 'undefined'){
            var scope = external.scope;
            if (typeof scope === 'undefined') {
                external.scope = scope = new DynamicProperty(CzmlString);
                externalUpdated = true;
            }
            scope.processCzmlIntervals(externalData.scope, interval);
        }

        if(typeof externalData.eventname !== 'undefined'){
            var eventname = external.eventname;
            if (typeof eventname === 'undefined') {
                external.eventname = eventname = new DynamicProperty(CzmlString);
                externalUpdated = true;
            }
            eventname.processCzmlIntervals(externalData.eventname, interval);
        }

        if (typeof externalData.pollingUpdate !== 'undefined') {
            var pollingUpdate = external.pollingUpdate;
            if (typeof pollingUpdate === 'undefined') {
                external.pollingUpdate = pollingUpdate = new DynamicPollingUpdate();
                externalUpdated = true;
            }
            pollingUpdate.processCzmlPacket(external.pollingUpdate, externalData.pollingUpdate, interval);
        }

        if(typeof externalData.reconnectOnError !== 'undefined'){
            var reconnectOnError = external.reconnectOnError;
            if (typeof reconnectOnError === 'undefined') {
                external.reconnectOnError = reconnectOnError = new DynamicProperty(CzmlBoolean);
                externalUpdated = true;
            }
            reconnectOnError.processCzmlIntervals(externalData.reconnectOnError, interval);
        }

        if(typeof externalData.simulationDrivenUpdate !== 'undefined'){
            var simulationDrivenUpdate = external.simulationDrivenUpdate;
            if (typeof simulationDrivenUpdate === 'undefined') {
                external.simulationDrivenUpdate = simulationDrivenUpdate = new DynamicSimulationDrivenUpdate();
                externalUpdated = true;
            }
            simulationDrivenUpdate.processCzmlIntervals(externalData.simulationDrivenUpdate, interval);
        }

        return externalUpdated;
    };

    /**
     * Given two DynamicObjects, takes the external properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicExternalDocument.mergeProperties = function(targetObject, objectToMerge) {
        var externalToMerge = objectToMerge.external;
        if (typeof externalToMerge !== 'undefined') {

            var targetExternal = targetObject.external;
            if (typeof targetExternal === 'undefined') {
                targetObject.external = targetExternal = new DynamicExternalDocument();
            }

            targetExternal.pollingUpdate = defaultValue(targetExternal.pollingUpdate, externalToMerge.pollingUpdate);
            targetExternal.simulationDrivenUpdate = defaultValue(targetExternal.simulationDrivenUpdate, externalToMerge.simulationDrivenUpdate);
            targetExternal.url = defaultValue(targetExternal.url, externalToMerge.url);
            targetExternal.eventname = defaultValue(targetExternal.eventname, externalToMerge.eventname);
            targetExternal.sourceType = defaultValue(targetExternal.sourceType, externalToMerge.sourceType);
        }
    };

    /**
     * Given a DynamicObject, undefines the external associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the external property from.
     *
     * @see CzmlDefaults
     */
    DynamicExternalDocument.undefineProperties = function(dynamicObject) {
        dynamicObject.external = undefined;
    };

    return DynamicExternalDocument;
});