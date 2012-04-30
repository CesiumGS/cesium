/*global define*/
define(['./DynamicObject'], function(DynamicObject) {
    "use strict";
    //TODO Make sure Layer throws the proper events in all cases.
    function Layer(name, id, propertyBuilders) {
        this.name = name;
        this.id = id;
        this._propertyBuilders = propertyBuilders;
        this._hash = {};
        this._array = [];
        this._newObjectListeners = [];
        this._newPropertyListeners = [];
        this._changedPropertyListeners = [];
    }

    function addDatum(layer, data, sourceUri) {
        var object = layer.getOrCreateObject(data.id);
        for ( var i = 0, len = layer._propertyBuilders.length; i < len; i++) {
            layer._propertyBuilders[i](object, data, layer, sourceUri);
        }
    }

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

    Layer.prototype.getObjects = function() {
        return this._array;
    };

    Layer.prototype.getObject = function(id) {
        return this._hash[id];
    };

    Layer.prototype.addData = function(data, sourceUri) {
        if (Array.isArray(data)) {
            for ( var i = 0, len = data.length; i < len; i++) {
                addDatum(this, data[i], sourceUri);
            }
        } else {
            addDatum(this, data, sourceUri);
        }
    };

    Layer.prototype.deleteData = function() {
        this._hash = {};
        this._array = [];
    };

    Layer.prototype.deleteDataBefore = function(time) {
        for ( var i = 0, len = this._array.length; i < len; i++) {
            var obj = this._array[i];
            if (obj && obj.deleteDataBefore) {
                obj.deleteDataBefore(time);
            }
        }
    };

    return Layer;
});