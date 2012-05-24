/*global define*/
define([
        '../Core/DeveloperError',
        './DynamicObject',
        './CzmlObjectCollection'
    ], function(
        DeveloperError,
        DynamicObject,
        CzmlObjectCollection) {
    "use strict";

    function _updateObjects(czmlObjectCollection, updatedObjects) {
        var _this = czmlObjectCollection.parent;
        var this_mergeFunctions = _this._mergeFunctions;
        var this_deleteFunctions = _this._deleteFunctions;
        var this_collections = _this._collections;

        var updatedObject, compositeObject, compositeObjects = [];
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = _this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = this_deleteFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = this_deleteFunctions[iDeleteFuncs];
                    deleteFunc(compositeObject);
                }
            } else {
                compositeObject = _this.getOrCreateObject(updatedObject.id);
            }

            compositeObjects.push(compositeObject);
            for ( var iCollection = this_collections.length - 1; iCollection > -1; iCollection--) {
                var currentCollection = this_collections[iCollection];
                var objectToUpdate = currentCollection.getObject(updatedObject.id);
                if (typeof objectToUpdate !== 'undefined') {
                    for ( var iMergeFuncs = this_mergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                        var mergeFunc = this_mergeFunctions[iMergeFuncs];
                        mergeFunc(compositeObject, objectToUpdate);
                    }
                }
            }
        }
        _this.raiseOnPropertyAdded(compositeObjects);
    }

    function CompositeCzmlObjectCollection(mergeFunctions, deleteFunctions, collections) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this._mergeFunctions = mergeFunctions;
        this._deleteFunctions = deleteFunctions;
        this._propertyAddedListeners = [];
        this._objectRemovedListeners = [];

        if (typeof collections !== 'undefined') {
            for ( var i = 0; i < collections.length; i++) {
                this.addCollection(collections[i]);
            }
            this.applyChanges();
        }
    }

    CompositeCzmlObjectCollection.prototype.addCollection = function(czmlObjectCollection) {
        if (!(czmlObjectCollection instanceof CzmlObjectCollection)) {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(czmlObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        if (typeof czmlObjectCollection.parent !== 'undefined') {
            throw new DeveloperError();
        }

        czmlObjectCollection.parent = this;
        czmlObjectCollection.addPropertyAddedListener(_updateObjects);
        this._collections.push(czmlObjectCollection);
    };

    CompositeCzmlObjectCollection.prototype.insertCollection = function(index, czmlObjectCollection) {
        if (!(czmlObjectCollection instanceof CzmlObjectCollection)) {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(czmlObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        var this_collections = this._collections;
        this_collections.splice(index, 0, czmlObjectCollection);

        czmlObjectCollection.parent = this;
        czmlObjectCollection.addPropertyAddedListener(_updateObjects);
    };

    CompositeCzmlObjectCollection.prototype.insertCollectionBefore = function(beforeCzmlObjectCollection, czmlObjectCollection) {
        var indexBefore = this._collections.indexOf(beforeCzmlObjectCollection);
        if (indexBefore === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexBefore, czmlObjectCollection);
    };

    CompositeCzmlObjectCollection.prototype.insertCollectionAfter = function(afterCzmlObjectCollection, czmlObjectCollection) {
        var indexAfter = this._collections.indexOf(afterCzmlObjectCollection);
        if (indexAfter === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexAfter + 1, czmlObjectCollection);
    };

    CompositeCzmlObjectCollection.prototype.removeCollection = function(czmlObjectCollection) {
        if (this._collections.indexOf(czmlObjectCollection) === -1) {
            throw new DeveloperError();
        }
        var this_collections = this._collections;
        this_collections.splice(this_collections.indexOf(czmlObjectCollection), 1);
        czmlObjectCollection.parent = undefined;
        czmlObjectCollection.removePropertyAddedListener(_updateObjects);
    };

    CompositeCzmlObjectCollection.prototype.getLength = function() {
        return this._collections.length;
    };

    CompositeCzmlObjectCollection.prototype.applyChanges = function() {
        this._clearObjects();
        var this_mergeFunctions = this._mergeFunctions;
        var this_collections = this._collections;
        for ( var iCollection = this_collections.length - 1; iCollection > -1; iCollection--) {
            var currentCollection = this_collections[iCollection];
            var objects = currentCollection.getObjects();
            for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                var object = objects[iObjects];
                var compositeObject = this.getOrCreateObject(object.id);
                for ( var iMergeFuncs = this_mergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                    var mergeFunc = this_mergeFunctions[iMergeFuncs];
                    mergeFunc(compositeObject, object);
                }
            }
        }
    };

    CompositeCzmlObjectCollection.prototype.getObject = function(id) {
        return this._hash[id];
    };

    CompositeCzmlObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    CompositeCzmlObjectCollection.prototype.getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id, this);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    CompositeCzmlObjectCollection.prototype.clear = function() {
        this._collections = [];
        this._clearObjects();
    };

    CompositeCzmlObjectCollection.prototype._clearObjects = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        this.raiseOnObjectRemoved(removedObjects);
    };

    CompositeCzmlObjectCollection.prototype.addPropertyAddedListener = function(listener) {
        this._propertyAddedListeners.push(listener);
    };

    CompositeCzmlObjectCollection.prototype.removePropertyAddedListener = function(listener) {
        var this_propertyAddedListeners = this._propertyAddedListeners;
        this_propertyAddedListeners.splice(this_propertyAddedListeners.indexOf(listener), 1);
    };

    CompositeCzmlObjectCollection.prototype.raiseOnPropertyAdded = function(updatedObjects) {
        if (updatedObjects.length > 0) {
            var listeners = this._propertyAddedListeners;
            for ( var i = listeners.length - 1; i > -1; i--) {
                listeners[i](this, updatedObjects);
            }
        }
    };

    CompositeCzmlObjectCollection.prototype.addObjectRemovedListener = function(listener) {
        this._objectRemovedListeners.push(listener);
    };

    CompositeCzmlObjectCollection.prototype.removeObjectRemovedListener = function(listener) {
        var this_objectRemovedListeners = this._objectRemovedListeners;
        this_objectRemovedListeners.splice(this_objectRemovedListeners.indexOf(listener), 1);
    };

    CompositeCzmlObjectCollection.prototype.raiseOnObjectRemoved = function(removedObjects) {
        if (removedObjects.length > 0) {
            var listeners = this._objectRemovedListeners;
            for ( var i = listeners.length - 1; i > -1; i--) {
                listeners[i](this, removedObjects);
            }
        }
    };

    return CompositeCzmlObjectCollection;
});