/*global define*/
define([
        '../Core/Event',
        '../Core/DeveloperError',
        './DynamicObject',
        './CzmlObjectCollection'
    ], function(
        Event,
        DeveloperError,
        DynamicObject,
        CzmlObjectCollection) {
    "use strict";

    function CompositeCzmlObjectCollection(mergeFunctions, deleteFunctions, collections) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this._mergeFunctions = mergeFunctions;
        this._deleteFunctions = deleteFunctions;
        this.objectsUpdated = new Event();
        this.objectsRemoved = new Event();

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
        czmlObjectCollection.objectsUpdated.addEventListener(CompositeCzmlObjectCollection.prototype._onObjectsUpdated, this);
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
        czmlObjectCollection.objectsUpdated.addEventListener(CompositeCzmlObjectCollection.prototype._onObjectsUpdated, this);
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
        czmlObjectCollection.objectsUpdated.removeEventListener(CompositeCzmlObjectCollection.prototype._onObjectsUpdated);
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
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    CompositeCzmlObjectCollection.prototype._onObjectsUpdated = function(czmlObjectCollection, updatedObjects) {
        var this_mergeFunctions = this._mergeFunctions;
        var this_deleteFunctions = this._deleteFunctions;
        var this_collections = this._collections;

        var updatedObject, compositeObject, compositeObjects = [];
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = this_deleteFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = this_deleteFunctions[iDeleteFuncs];
                    deleteFunc(compositeObject);
                }
            } else {
                compositeObject = this.getOrCreateObject(updatedObject.id);
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
        if (compositeObjects.length > 0) {
            this.objectsUpdated.raiseEvent(this, compositeObjects);
        }
    };

    return CompositeCzmlObjectCollection;
});