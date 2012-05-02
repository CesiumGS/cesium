/*global define*/
define(['./DynamicObject', 'Core/createGuid'], function(DynamicObject, createGuid) {
    "use strict";
    //TODO Make sure Layer throws the proper events in all cases.
    function Layer(name, id, propertyFunctionsMap) {
        this.name = name;
        this.id = id;
        this._propertyFunctionsMap = propertyFunctionsMap;
        this._hash = {};
        this._array = [];
        this._newObjectListeners = [];
        this._newPropertyListeners = [];
        this._changedPropertyListeners = [];
    }

    Layer.prototype.addPacket = function(packet, sourceUri) {
        var objectId = packet.id;
        var this_propertyFunctionsMap = this._propertyFunctionsMap;
        if (typeof objectId === 'undefined') {
            objectId = createGuid();
        }

        var object = this.getOrCreateObject(objectId);
        for ( var prop in packet) {
            if (typeof prop !== 'undefined') {
                var propertyFunc = this_propertyFunctionsMap[prop];
                if (propertyFunc !== 'undefined') {
                    propertyFunc(object, packet, this, sourceUri);
                }
            }
        }

        packet.id = objectId;
    };

    Layer.prototype.addPackets = function(packets, sourceUri) {
        if (Array.isArray(packets)) {
            for ( var i = 0, len = packets.length; i < len; i++) {
                this.addPacket(this, packets[i], sourceUri);
            }
        } else {
            this.addPacket(this, packets, sourceUri);
        }
    };

    Layer.prototype.getObject = function(id) {
        return this._hash[id];
    };

    Layer.prototype.getObjects = function() {
        return this._array;
    };

    Layer.prototype.getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id, this);
            this._hash[id] = obj;
            this._array.push(obj);
            this.onNewObject(obj);
        }

        return obj;
    };

    Layer.prototype.clear = function() {
        this._hash = {};
        this._array = [];
    };

    Layer.prototype.addNewObjectListener = function(listener) {
        this._newObjectListeners.push(listener);
    };

    Layer.prototype.onNewObject = function(object) {
        var listeners = this._newObjectListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object);
        }
    };

    Layer.prototype.addNewPropertyListener = function(listener) {
        this._newPropertyListeners.push(listener);
    };

    Layer.prototype.onNewProperty = function(object, name, property) {
        var listeners = this._newPropertyListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object, name, property);
        }
    };

    Layer.prototype.addChangedPropertyListener = function(listener) {
        this._changedPropertyListeners.push(listener);
    };

    Layer.prototype.onChangedProperty = function(object, name, newProperty, oldProperty) {
        var listeners = this._changedPropertyListeners;
        for ( var i = 0, len = listeners.length; i < len; i++) {
            listeners[i](object, name, newProperty, oldProperty);
        }
    };

    return Layer;
});