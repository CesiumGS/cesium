/*global define*/
define([
        '../Core/Event',
        '../Core/createGuid',
        './DynamicObject'
    ], function(
        Event,
        createGuid,
        DynamicObject) {
    "use strict";

    function CzmlObjectCollection(propertyFunctionsMap) {
        this.parent = undefined;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];

        this.objectsUpdated = new Event();
        this.objectsRemoved = new Event();
    }

    CzmlObjectCollection.prototype.getObject = function(id) {
        return this._hash[id];
    };

    CzmlObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    CzmlObjectCollection.prototype.getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id, this);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    CzmlObjectCollection.prototype.clear = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    CzmlObjectCollection.prototype.processCzml = function(packets, sourceUri) {
        var updatedObjects = {};

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], sourceUri, updatedObjects);
            }
        } else {
            this._processCzmlPacket(packets, sourceUri, updatedObjects);
        }

        var objectId, updatedObjectsArray = [];
        for (objectId in updatedObjects) {
            if (updatedObjects.hasOwnProperty(objectId)) {
                updatedObjectsArray.push(updatedObjects[objectId]);
            }
        }

        if (updatedObjectsArray.length > 0) {
            this.objectsUpdated.raiseEvent(this, updatedObjectsArray);
        }

        return updatedObjects;
    };

    CzmlObjectCollection.prototype._processCzmlPacket = function(packet, sourceUri, updatedObjects) {
        var objectId = packet.id;
        var this_propertyFunctionsMap = this._propertyFunctionsMap;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = this.getOrCreateObject(objectId);
        for ( var prop in packet) {
            if (typeof prop !== 'undefined') {
                var propertyFunc = this_propertyFunctionsMap[prop];
                if (typeof propertyFunc !== 'undefined') {
                    if (propertyFunc(object, packet, this, sourceUri)) {
                        updatedObjects[objectId] = object;
                    }
                }
            }
        }

        packet.id = objectId;
    };

    return CzmlObjectCollection;
});