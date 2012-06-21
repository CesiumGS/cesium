/*global define*/
define([
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        '../Core/DeveloperError',
        './DynamicObject',
        './DynamicObjectCollection',
        './CzmlStandard'
    ], function(
        Event,
        Iso8601,
        TimeInterval,
        DeveloperError,
        DynamicObject,
        DynamicObjectCollection,
        CzmlStandard) {
    "use strict";

    function CompositeDynamicObjectCollection(collections, mergeFunctions, cleaners) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this._mergeFunctions = mergeFunctions || CzmlStandard.mergers;
        this._cleaners = cleaners || CzmlStandard.cleaners;
        this.objectPropertiesChanged = new Event();
        this.objectsRemoved = new Event();

        if (typeof collections !== 'undefined') {
            for ( var i = 0; i < collections.length; i++) {
                this.addCollection(collections[i]);
            }
            this.applyChanges();
        }
    }

    DynamicObjectCollection.prototype.computeAvailability = function() {
        var startTime = Iso8601.MAXIMUM_VALUE;
        var stopTime = Iso8601.MINIMUM_VALUE;
        var i;
        var len;
        var collection;
        var collections = this._collections;
        for (i = 0, len = collections.length; i < len; i++) {
            collection = collections[i];
            var availability = collection.computeAvailability();
            if (availability.start.lessThan(startTime)) {
                startTime = collection.availability.start;
            }
            if (availability.stop.greaterThan(stopTime)) {
                stopTime = collection.availability.stop;
            }
        }
        if (startTime !== Iso8601.MAXIMUM_VALUE && stopTime !== Iso8601.MINIMUM_VALUE) {
            return new TimeInterval(startTime, stopTime, true, true);
        }
        return new TimeInterval(Iso8601.MINIMUM_VALUE, Iso8601.MAXIMUM_VALUE, true, true);
    };

    CompositeDynamicObjectCollection.prototype.addCollection = function(dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(dynamicObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        if (typeof dynamicObjectCollection.parent !== 'undefined') {
            throw new DeveloperError();
        }

        dynamicObjectCollection.parent = this;
        dynamicObjectCollection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);
        this._collections.push(dynamicObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.insertCollection = function(index, dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError();
        }
        if (this._collections.indexOf(dynamicObjectCollection) !== -1) {
            throw new DeveloperError();
        }
        var thisCollections = this._collections;
        thisCollections.splice(index, 0, dynamicObjectCollection);

        dynamicObjectCollection.parent = this;
        dynamicObjectCollection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);
    };

    CompositeDynamicObjectCollection.prototype.insertCollectionBefore = function(beforeDynamicObjectCollection, dynamicObjectCollection) {
        var indexBefore = this._collections.indexOf(beforeDynamicObjectCollection);
        if (indexBefore === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexBefore, dynamicObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.insertCollectionAfter = function(afterDynamicObjectCollection, dynamicObjectCollection) {
        var indexAfter = this._collections.indexOf(afterDynamicObjectCollection);
        if (indexAfter === -1) {
            throw new DeveloperError();
        }
        this.insertCollection(indexAfter + 1, dynamicObjectCollection);
    };

    CompositeDynamicObjectCollection.prototype.removeCollection = function(dynamicObjectCollection) {
        if (this._collections.indexOf(dynamicObjectCollection) === -1) {
            throw new DeveloperError();
        }
        var thisCollections = this._collections;
        thisCollections.splice(thisCollections.indexOf(dynamicObjectCollection), 1);
        dynamicObjectCollection.parent = undefined;
        dynamicObjectCollection.objectPropertiesChanged.removeEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged);
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

    CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged = function(dynamicObjectCollection, updatedObjects) {
        var thisMergeFunctions = this._mergeFunctions;
        var thisCleaners = this._cleaners;
        var thisCollections = this._collections;

        var updatedObject, compositeObject, compositeObjects = [];
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = thisCleaners.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = thisCleaners[iDeleteFuncs];
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
            this.objectPropertiesChanged.raiseEvent(this, compositeObjects);
        }
    };

    return CompositeDynamicObjectCollection;
});