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

    function DynamicObjectCollection(propertyFunctionsMap) {
        this.parent = undefined;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];

        this.objectsUpdated = new Event();
        this.objectsRemoved = new Event();
    }

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

    DynamicObjectCollection.prototype.processCzml = function(packets, sourceUri) {
        var updatedObjects = [];

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], sourceUri, updatedObjects);
            }
        } else {
            this._processCzmlPacket(packets, sourceUri, updatedObjects);
        }

        if (updatedObjects.length > 0) {
            this.objectsUpdated.raiseEvent(this, updatedObjects);
        }

        return updatedObjects;
    };

    DynamicObjectCollection.prototype._processCzmlPacket = function(packet, sourceUri, updatedObjects) {
        var objectId = packet.id;
        var thisPropertyFunctionsMap = this._propertyFunctionsMap;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = this.getOrCreateObject(objectId);
        for ( var prop in packet) {
            if (typeof prop !== 'undefined') {
                var propertyFunc = thisPropertyFunctionsMap[prop];
                if (typeof propertyFunc !== 'undefined' &&
                    propertyFunc(object, packet, this, sourceUri) &&
                    updatedObjects.indexOf(object) === -1) {
                    updatedObjects.push(object);
                }
            }
        }

        packet.id = objectId;
    };

    return DynamicObjectCollection;
});