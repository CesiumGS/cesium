/*global define*/
define([
        '../Core/Event',
        '../Core/createGuid',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        '../Core/DeveloperError',
        './DynamicObject',
        './CzmlStandard'
       ], function(
        Event,
        createGuid,
        TimeInterval,
        Iso8601,
        DeveloperError,
        DynamicObject,
        CzmlStandard) {
    "use strict";

    /**
     * A collection of DynamicObject instances.
     */
    function DynamicObjectCollection() {
        this._hash = {};
        this._array = [];
        this.compositeCollection = undefined;
        this.objectPropertiesChanged = new Event();
        this.objectsRemoved = new Event();
    }

    /**
     * Computes the maximum availability of the DynamicObjects in the collection.
     * If the collection contains a mix of infinitely available data and non-infinite data,
     * It will return the interval pertaining to the non-infinite data only.  If all
     * data is infinite, an infinite interval will be returned.
     *
     * @returns {TimeInterval} The availability of DynamicObjects in the collection.
     */
    DynamicObjectCollection.prototype.computeAvailability = function() {
        var startTime = Iso8601.MAXIMUM_VALUE;
        var stopTime = Iso8601.MINIMUM_VALUE;
        var i;
        var len;
        var object;
        var dynamicObjects = this._array;
        for (i = 0, len = dynamicObjects.length; i < len; i++) {
            object = dynamicObjects[i];
            if (typeof object.availability !== 'undefined') {
                if (object.availability.start.lessThan(startTime)) {
                    startTime = object.availability.start;
                }
                if (object.availability.stop.greaterThan(stopTime)) {
                    stopTime = object.availability.stop;
                }
            }
        }
        if (startTime !== Iso8601.MAXIMUM_VALUE && stopTime !== Iso8601.MINIMUM_VALUE) {
            return new TimeInterval(startTime, stopTime, true, true);
        }
        return new TimeInterval(Iso8601.MINIMUM_VALUE, Iso8601.MAXIMUM_VALUE, true, true);
    };

    /**
     * Gets an object with the specified id.
     * @param {Object} id The id of the object to retrieve.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns The DynamicObject with the provided id, or undefined if no such object exists.
     */
    DynamicObjectCollection.prototype.getObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        return this._hash[id];
    };

    /**
     * Gets the array of DynamicObject instances in this composite collection.
     * @returns {Array} the array of DynamicObject instances in this composite collection.
     */
    DynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    /**
     * Gets an object with the specified id or creates it and adds it to the collection if it does not exist.
     * @param {Object} id The id of the object to retrieve.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns The DynamicObject with the provided id.
     */
    DynamicObjectCollection.prototype.getOrCreateObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    /**
     * Removes all objects from the collection.
     */
    DynamicObjectCollection.prototype.clear = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    DynamicObjectCollection.prototype.processCzml = function(packets, sourceUri, updaterFunctions) {
        var updatedObjects = [];
        var updatedObjectsHash = {};
        updaterFunctions = typeof updaterFunctions !== 'undefined' ? updaterFunctions : CzmlStandard.updaters;

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                processCzmlPacket(this, packets[i], updatedObjects, updatedObjectsHash, updaterFunctions);
            }
        } else {
            processCzmlPacket(this, packets, updatedObjects, updatedObjectsHash, updaterFunctions);
        }

        if (updatedObjects.length > 0) {
            this.objectPropertiesChanged.raiseEvent(this, updatedObjects);
        }

        return updatedObjects;
    };

    function processCzmlPacket(dynamicObjectCollection, packet, updatedObjects, updatedObjectsHash, updaterFunctions) {
        var objectId = packet.id;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = dynamicObjectCollection.getOrCreateObject(objectId);
        for ( var i = updaterFunctions.length - 1; i > -1; i--) {
            if (updaterFunctions[i](object, packet, dynamicObjectCollection) &&
                typeof updatedObjectsHash[objectId] === 'undefined') {
                updatedObjectsHash[objectId] = true;
                updatedObjects.push(object);
            }
        }
    }

    return DynamicObjectCollection;
});