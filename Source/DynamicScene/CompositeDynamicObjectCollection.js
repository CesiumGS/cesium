/*global define*/
define([
        '../Core/Event',
        '../Core/DeveloperError',
        './DynamicObject',
        './DynamicObjectCollection'
    ], function(
        Event,
        DeveloperError,
        DynamicObject,
        DynamicObjectCollection) {
    "use strict";

    function CompositeDynamicObjectCollection(mergeFunctions, undefinedFunctions, collections) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this._mergeFunctions = mergeFunctions;
        this._undefinedFunctions = undefinedFunctions;
        this.objectsUpdated = new Event();
        this.objectsRemoved = new Event();

        if (typeof collections !== 'undefined') {
            for ( var i = 0; i < collections.length; i++) {
                this.addCollection(collections[i]);
            }
            this.applyChanges();
        }
    }

    CompositeDynamicObjectCollection.prototype.addCollection = function(czmlObjectCollection) {
        if (!(czmlObjectCollection instanceof DynamicObjectCollection)) {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(czmlObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        if (typeof czmlObjectCollection.parent !== 'undefined') {
            throw new DeveloperError();
        }

        czmlObjectCollection.parent = this;
        czmlObjectCollection.objectsUpdated.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectsUpdated, this);
        this._collections.push(czmlObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.insertCollection = function(index, czmlObjectCollection) {
        if (!(czmlObjectCollection instanceof DynamicObjectCollection)) {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(czmlObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        var thisCollections = this._collections;
        thisCollections.splice(index, 0, czmlObjectCollection);

        czmlObjectCollection.parent = this;
        czmlObjectCollection.objectsUpdated.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectsUpdated, this);
    };

    CompositeDynamicObjectCollection.prototype.insertCollectionBefore = function(beforeDynamicObjectCollection, czmlObjectCollection) {
        var indexBefore = this._collections.indexOf(beforeDynamicObjectCollection);
        if (indexBefore === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexBefore, czmlObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.insertCollectionAfter = function(afterDynamicObjectCollection, czmlObjectCollection) {
        var indexAfter = this._collections.indexOf(afterDynamicObjectCollection);
        if (indexAfter === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexAfter + 1, czmlObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.removeCollection = function(czmlObjectCollection) {
        if (this._collections.indexOf(czmlObjectCollection) === -1) {
            throw new DeveloperError();
        }
        var thisCollections = this._collections;
        thisCollections.splice(thisCollections.indexOf(czmlObjectCollection), 1);
        czmlObjectCollection.parent = undefined;
        czmlObjectCollection.objectsUpdated.removeEventListener(CompositeDynamicObjectCollection.prototype._onObjectsUpdated);
    };

    CompositeDynamicObjectCollection.prototype.getLength = function() {
        return this._collections.length;
    };

    CompositeDynamicObjectCollection.prototype.applyChanges = function() {
        this._clearObjects();
        var thisMergeFunctions = this._mergeFunctions;
        var thisCollections = this._collections;
        for ( var iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
            var currentCollection = thisCollections[iCollection];
            var objects = currentCollection.getObjects();
            for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                var object = objects[iObjects];
                var compositeObject = this._getOrCreateObject(object.id);
                for ( var iMergeFuncs = thisMergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                    var mergeFunc = thisMergeFunctions[iMergeFuncs];
                    mergeFunc(compositeObject, object);
                }
            }
        }
    };

    CompositeDynamicObjectCollection.prototype.getObject = function(id) {
        return this._hash[id];
    };

    CompositeDynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    CompositeDynamicObjectCollection.prototype.clear = function() {
        this._collections = [];
        this._clearObjects();
    };

    CompositeDynamicObjectCollection.prototype._getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id, this);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    CompositeDynamicObjectCollection.prototype._clearObjects = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    CompositeDynamicObjectCollection.prototype._onObjectsUpdated = function(czmlObjectCollection, updatedObjects) {
        var thisMergeFunctions = this._mergeFunctions;
        var thisUndefinedFunctions = this._undefinedFunctions;
        var thisCollections = this._collections;

        var updatedObject, compositeObject, compositeObjects = [];
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = thisUndefinedFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = thisUndefinedFunctions[iDeleteFuncs];
                    deleteFunc(compositeObject);
                }
            } else {
                compositeObject = this._getOrCreateObject(updatedObject.id);
            }

            compositeObjects.push(compositeObject);
            for ( var iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
                var currentCollection = thisCollections[iCollection];
                var objectToUpdate = currentCollection.getObject(updatedObject.id);
                if (typeof objectToUpdate !== 'undefined') {
                    for ( var iMergeFuncs = thisMergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                        var mergeFunc = thisMergeFunctions[iMergeFuncs];
                        mergeFunc(compositeObject, objectToUpdate);
                    }
                }
            }
        }
        if (compositeObjects.length > 0) {
            this.objectsUpdated.raiseEvent(this, compositeObjects);
        }
    };

    return CompositeDynamicObjectCollection;
});