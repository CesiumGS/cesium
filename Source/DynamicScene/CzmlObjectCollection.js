/*global define*/
define([
        './DynamicObject',
        '../Core/createGuid'
    ], function(
        DynamicObject,
        createGuid) {
    "use strict";

    function CzmlObjectCollection(name, id, propertyFunctionsMap) {
        this.name = name;
        this.id = id;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];
        this._updateListeners = [];
    }

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
                    if (propertyFunc(object, packet, this, sourceUri) && updatedObjects.indexOf(object) === -1) {
                        updatedObjects.push(object);
                    }
                }
            }
        }

        packet.id = objectId;
    };

    CzmlObjectCollection.prototype.processCzml = function(packets, sourceUri) {
        var updatedObjects = [];

        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], sourceUri, updatedObjects);
            }
        } else {
            this._processCzmlPacket(packets, sourceUri, updatedObjects);
        }

        this.raiseOnUpdate(updatedObjects);

        return updatedObjects;
    };

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
        this._hash = {};
        this._array = [];
    };

    CzmlObjectCollection.prototype.addUpdateListener = function(listener) {
        this._updateListeners.push(listener);
    };

    CzmlObjectCollection.prototype.removeUpdateListener = function(listener) {
        var this_updateListeners = this._updateListeners;
        this_updateListeners.splice(this_updateListeners.indexOf(listener), 1);
    };

    CzmlObjectCollection.prototype.raiseOnUpdate = function(updatedObjects) {
        var listeners = this._updateListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](this, updatedObjects);
        }
    };

    return CzmlObjectCollection;
});