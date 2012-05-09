/*global define*/
define(['./DynamicObject',
        'Core/createGuid'],
function(DynamicObject, createGuid) {
    "use strict";
    //TODO Make sure we throw the proper events in all cases.
    function CzmlObjectCollection(name, id, propertyFunctionsMap) {
        this.name = name;
        this.id = id;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];
        this._newObjectListeners = [];
        this._newPropertyListeners = [];
        this._changedPropertyListeners = [];
    }

    CzmlObjectCollection.prototype._processCzmlPacket = function(packet, sourceUri) {
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
                    propertyFunc(object, packet, this, sourceUri);
                }
            }
        }

        packet.id = objectId;
    };

    CzmlObjectCollection.prototype.processCzml = function(packets, sourceUri) {
        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this._processCzmlPacket(packets[i], sourceUri);
            }
        } else {
            this._processCzmlPacket(packets, sourceUri);
        }
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
            this.onNewObject(obj);
        }

        return obj;
    };

    CzmlObjectCollection.prototype.clear = function() {
        this._hash = {};
        this._array = [];
    };

    CzmlObjectCollection.prototype.addNewObjectListener = function(listener) {
        this._newObjectListeners.push(listener);
    };

    CzmlObjectCollection.prototype.onNewObject = function(object) {
        var listeners = this._newObjectListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object);
        }
    };

    CzmlObjectCollection.prototype.addNewPropertyListener = function(listener) {
        this._newPropertyListeners.push(listener);
    };

    CzmlObjectCollection.prototype.onNewProperty = function(object, name, property) {
        var listeners = this._newPropertyListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object, name, property);
        }
    };

    CzmlObjectCollection.prototype.addChangedPropertyListener = function(listener) {
        this._changedPropertyListeners.push(listener);
    };

    CzmlObjectCollection.prototype.onChangedProperty = function(object, name, newProperty, oldProperty) {
        var listeners = this._changedPropertyListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object, name, newProperty, oldProperty);
        }
    };

    return CzmlObjectCollection;
});