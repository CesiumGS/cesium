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

    function CompositeCzmlObjectCollection(mergeFunctions, deleteFunctions) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this._mergeFunctions = mergeFunctions;
        this._deleteFunctions = deleteFunctions;
    }

    CompositeCzmlObjectCollection.prototype.addCollection = function(czmlObjectCollection) {
        if (!(czmlObjectCollection instanceof CzmlObjectCollection)) {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(czmlObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        this._collections.push(czmlObjectCollection);

        var that = this;
        czmlObjectCollection.addUpdateListener(function(czmlObjectCollection, updatedObjects) {
            that._updateObjects(czmlObjectCollection, updatedObjects);
        });
    };

    CompositeCzmlObjectCollection.prototype._updateObjects = function(czmlObjectCollection, updatedObjects) {
        var this_mergeFunctions = this._mergeFunctions;
        var this_deleteFunctions = this._deleteFunctions;
        var this_collections = this._collections;

        var updatedObject, compositeObject;
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = this_deleteFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = this_deleteFunctions[iDeleteFuncs];
                    deleteFunc(compositeObject);
                }
            }
        }

        for ( var iCollection = this_collections.length - 1; iCollection > -1; iCollection--) {
            var currentCollection = this_collections[iCollection];
            var objects = currentCollection.getObjects();
            for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                updatedObject = objects[iObjects];
                compositeObject = this.getOrCreateObject(updatedObject.id);
                for ( var iMergeFuncs = this_mergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                    var mergeFunc = this_mergeFunctions[iMergeFuncs];
                    mergeFunc(compositeObject, updatedObject);
                }
            }
        }
    };

    CompositeCzmlObjectCollection.prototype.removeCollection = function(czmlObjectCollection) {
        if (this._collections.indexOf(czmlObjectCollection) === -1) {
            throw new DeveloperError();
        }
        var this_collections = this._collections;
        this_collections.splice(this_collections.indexOf(czmlObjectCollection), 1);
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
    };

    CompositeCzmlObjectCollection.prototype.getLength = function() {
        return this._collections.length;
    };

    CompositeCzmlObjectCollection.prototype.clear = function() {
        this._hash = {};
        this._array = [];
        this._collections = [];
    };

    CompositeCzmlObjectCollection.prototype.applyChanges = function() {
        this._hash = {};
        this._array = [];
        var this_mergeFunctions = this._mergeFunctions;
        var this_collections = this._collections;
        for ( var iCollection = this_collections.length - 1; iCollection > -1; iCollection--) {
            var currentCollection = this_collections[iCollection];
            var objects = currentCollection.getObjects();
            for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                var object = objects[iObjects];
                var compositeObject = this.getOrCreateObject(object.id);
                for ( var iMergeFuncs = this_mergeFunctions.length-1; iMergeFuncs > -1; iMergeFuncs--) {
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

    return CompositeCzmlObjectCollection;
});