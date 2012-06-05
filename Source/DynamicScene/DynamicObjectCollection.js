/*global define*/
define([
        '../Core/Event',
        '../Core/createGuid',
        './DynamicObject',
        './CzmlStandard'
       ], function(
        Event,
        createGuid,
        DynamicObject,
        CzmlStandard) {
    "use strict";

    function DynamicObjectCollection(updaterFunctions) {
        this._updaterFunctions = updaterFunctions || CzmlStandard.updaters;
        this._hash = {};
        this._array = [];
        this.parent = undefined;

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
        var updatedObjectsHash = {};

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], sourceUri, updatedObjects, updatedObjectsHash);
            }
        } else {
            this._processCzmlPacket(packets, sourceUri, updatedObjects, updatedObjectsHash);
        }

        if (updatedObjects.length > 0) {
            this.objectsUpdated.raiseEvent(this, updatedObjects);
        }

        return updatedObjects;
    };

    DynamicObjectCollection.prototype._processCzmlPacket = function(packet, sourceUri, updatedObjects, updatedObjectsHash) {
        var objectId = packet.id;
        var thisUpdaterFunctions = this._updaterFunctions;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = this.getOrCreateObject(objectId);
        for ( var i = thisUpdaterFunctions.length - 1; i > -1; i--) {
            if (thisUpdaterFunctions[i](object, packet, this, sourceUri) && typeof updatedObjectsHash[objectId] === 'undefined') {
                updatedObjectsHash[objectId] = true;
                updatedObjects.push(object);
            }
        }

        packet.id = objectId;
    };

    return DynamicObjectCollection;
});