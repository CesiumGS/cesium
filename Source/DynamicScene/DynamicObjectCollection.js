/*global define*/
define([
        '../Core/Event',
        '../Core/createGuid',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        './DynamicObject',
        './CzmlStandard'
       ], function(
        Event,
        createGuid,
        TimeInterval,
        Iso8601,
        DynamicObject,
        CzmlStandard) {
    "use strict";

    function DynamicObjectCollection(updaterFunctions) {
        this._updaterFunctions = updaterFunctions || CzmlStandard.updaters;
        this._hash = {};
        this._array = [];
        this.parent = undefined;

        this.objectPropertiesChanged = new Event();
        this.objectsRemoved = new Event();
    }

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

    DynamicObjectCollection.prototype.getObject = function(id) {
        return this._hash[id];
    };

    DynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    DynamicObjectCollection.prototype.getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id, this);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    DynamicObjectCollection.prototype.clear = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    DynamicObjectCollection.prototype.processCzml = function(packets) {
        var updatedObjects = [];
        var updatedObjectsHash = {};

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], updatedObjects, updatedObjectsHash);
            }
        } else {
            this._processCzmlPacket(packets, updatedObjects, updatedObjectsHash);
        }

        if (updatedObjects.length > 0) {
            this.objectPropertiesChanged.raiseEvent(this, updatedObjects);
        }

        return updatedObjects;
    };

    DynamicObjectCollection.prototype._processCzmlPacket = function(packet, updatedObjects, updatedObjectsHash) {
        var objectId = packet.id;
        var thisUpdaterFunctions = this._updaterFunctions;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = this.getOrCreateObject(objectId);
        for ( var i = thisUpdaterFunctions.length - 1; i > -1; i--) {
            if (thisUpdaterFunctions[i](object, packet, this) && typeof updatedObjectsHash[objectId] === 'undefined') {
                updatedObjectsHash[objectId] = true;
                updatedObjects.push(object);
            }
        }

        packet.id = objectId;
    };

    return DynamicObjectCollection;
});