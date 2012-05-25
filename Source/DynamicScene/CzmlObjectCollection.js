/*global define*/
define([
        './DynamicObject',
        '../Core/createGuid'
    ], function(
        DynamicObject,
        createGuid) {
    "use strict";

    function CzmlObjectCollection(propertyFunctionsMap) {
        this.parent = undefined;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];
        this._propertyAddedListeners = [];
        this._objectRemovedListeners = [];
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

        this.raiseOnPropertyAdded(updatedObjects);

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
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        this.raiseOnObjectRemoved(removedObjects);
    };

    CzmlObjectCollection.prototype.addPropertyAddedListener = function(listener) {
        this._propertyAddedListeners.push(listener);
    };

    CzmlObjectCollection.prototype.removePropertyAddedListener = function(listener) {
        var this_propertyAddedListeners = this._propertyAddedListeners;
        this_propertyAddedListeners.splice(this_propertyAddedListeners.indexOf(listener), 1);
    };

    CzmlObjectCollection.prototype.raiseOnPropertyAdded = function(updatedObjects) {
        if (updatedObjects.length > 0) {
            var listeners = this._propertyAddedListeners;
            for ( var i = listeners.length - 1; i > -1; i--) {
                listeners[i](this, updatedObjects);
            }
        }
    };

    CzmlObjectCollection.prototype.addObjectRemovedListener = function(listener) {
        this._objectRemovedListeners.push(listener);
    };

    CzmlObjectCollection.prototype.removeObjectRemovedListener = function(listener) {
        var this_objectRemovedListeners = this._objectRemovedListeners;
        this_objectRemovedListeners.splice(this_objectRemovedListeners.indexOf(listener), 1);
    };

    CzmlObjectCollection.prototype.raiseOnObjectRemoved = function(removedObjects) {
        if (removedObjects.length > 0) {
            var listeners = this._objectRemovedListeners;
            for ( var i = listeners.length - 1; i > -1; i--) {
                listeners[i](this, removedObjects);
            }
        }
    };

    return CzmlObjectCollection;
});