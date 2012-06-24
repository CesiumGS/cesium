/*global define*/
define([
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        '../Core/DeveloperError',
        './DynamicObject',
        './DynamicObjectCollection',
        './CzmlDefaults'
    ], function(
        Event,
        Iso8601,
        TimeInterval,
        DeveloperError,
        DynamicObject,
        DynamicObjectCollection,
        CzmlDefaults) {
    "use strict";

    /**
     * Non-destructively composites multiple DynamicObjectCollection instances into a single collection.
     * If a DynamicObject with the same ID exists in multiple collections, it is non-destructively
     * merged into a single new object instance.  If an object has the same property in multiple
     * collections, the property of the DynamicObject in the last collection of the list it
     * belongs to is used.  Whenever a new collection is added or removed from the list, applyChanges
     * must be called for it to take affect; however any changes to the DynamicObjectCollection instances
     * contained in this list will automatically be reflected.  CompositeDynamicObjectCollection can
     * be used almost anywhere that a DynamicObjectCollection is used.
     *
     * @name CompositeDynamicObjectCollection
     * @constructor
     *
     * @param {Array} [collections] The initial list of DynamicObjectCollection instances to merge.
     * @param {Array} [mergeFunctions] The list of CZML merge functions.
     * @param {Array} [cleanFunctions] The list of CZML clean functions.
     *
     * @see DynamicObjectCollection
     * @see DynamicObject
     * @see CzmlDefaults
     */
    function CompositeDynamicObjectCollection(collections, mergeFunctions, cleanFunctions) {
        this._hash = {};
        this._array = [];
        this._collections = [];
        this.mergeFunctions = mergeFunctions || CzmlDefaults.mergers;
        this.cleanFunctions = cleanFunctions || CzmlDefaults.cleaners;

        /**
         * An {@link Event} that is fired whenever DynamicObjects in the collection have properties added.
         */
        this.objectPropertiesChanged = new Event();

        /**
         * An {@link Event} that is fired whenever DynamicObjects are removed from the collection.
         */
        this.objectsRemoved = new Event();

        if (typeof collections !== 'undefined') {
            for ( var i = 0; i < collections.length; i++) {
                this.addCollection(collections[i]);
            }
            this.applyChanges();
        }
    }

    /**
     * Computes the maximum availability of the DynamicObjects in the collection.
     * If the collection contains a mix of infinitely available data and non-infinite data,
     * It will return the interval pertaining to the non-infinite data only.  If all
     * data is infinite, an infinite interval will be returned.
     *
     * @returns {TimeInterval} The availability of DynamicObjects in the collection.
     */
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

    /**
     * Adds a collection.  applyChanges must be called in order for this call to take affect.
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} dynamicObjectCollection is already in this collection.
     * @exception {DeveloperError} dynamicObjectCollection is already in another CompositeDynamicObjectCollection.
     *
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to add.
     */
    CompositeDynamicObjectCollection.prototype.addCollection = function(dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (this._collections.indexOf(dynamicObjectCollection) !== -1) {
            throw new DeveloperError('dynamicObjectCollection is already in this collection.');
        }
        //CZML_TODO The parent property only exists for resolving links, we may be able to
        //remove it completely, and in turn remove this limitation.
        if (typeof dynamicObjectCollection.compositeCollection !== 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is already in another CompositeDynamicObjectCollection.');
        }

        dynamicObjectCollection.compositeCollection = this;
        dynamicObjectCollection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);
        this._collections.push(dynamicObjectCollection);
    };

    /**
     * Inserts a collection at the provided index.  applyChanges must be called in order
     * for this call to take affect.
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} dynamicObjectCollection is already in this collection.
     *
     * @param {Number} index Inserts a collection at the provided index.
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to add.
     */
    CompositeDynamicObjectCollection.prototype.insertCollection = function(index, dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (this._collections.indexOf(dynamicObjectCollection) !== -1) {
            throw new DeveloperError('dynamicObjectCollection is already in this collection.');
        }
        var thisCollections = this._collections;
        thisCollections.splice(index, 0, dynamicObjectCollection);

        dynamicObjectCollection.compositeCollection = this;
        dynamicObjectCollection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);
    };

    /**
     * Inserts a collection before the provided collection.  applyChanges must be called in order
     * for this call to take affect.
     *
     * @exception {DeveloperError} beforeDynamicObjectCollection is required.
     * @exception {DeveloperError} beforeDynamicObjectCollection is already in this collection.
     *
     * @param {DynamicObjectCollection} beforeDynamicObjectCollection The existing collection to come after the inserted collection.
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to insert.
     */
    CompositeDynamicObjectCollection.prototype.insertCollectionBefore = function(beforeDynamicObjectCollection, dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('beforeDynamicObjectCollection is required');
        }

        var indexBefore = this._collections.indexOf(beforeDynamicObjectCollection);
        if (indexBefore === -1) {
            throw new DeveloperError('beforeDynamicObjectCollection is already in this collection.');
        }
        this.insertCollection(indexBefore, dynamicObjectCollection);
    };

    /**
     * Inserts a collection after the provided collection.  applyChanges must be called in order
     * for this call to take affect.
     *
     * @exception {DeveloperError} afterDynamicObjectCollection is required.
     * @exception {DeveloperError} afterDynamicObjectCollection is already in this collection.
     *
     * @param {DynamicObjectCollection} afterDynamicObjectCollection The existing collection to come before the inserted collection.
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to insert.
     */
    CompositeDynamicObjectCollection.prototype.insertCollectionAfter = function(afterDynamicObjectCollection, dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('afterDynamicObjectCollection is required');
        }

        var indexAfter = this._collections.indexOf(afterDynamicObjectCollection);
        if (indexAfter === -1) {
            throw new DeveloperError('afterDynamicObjectCollection is already in this collection.');
        }
        this.insertCollection(indexAfter + 1, dynamicObjectCollection);
    };

    /**
     * Removes a collection.  applyChanges must be called in order for this call to take affect.
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} dynamicObjectCollection is already in this collection.
     *
     * @param {DynamicObjectCollection} dynamicObjectCollection The collection to insert.
     */
    CompositeDynamicObjectCollection.prototype.removeCollection = function(dynamicObjectCollection) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (this._collections.indexOf(dynamicObjectCollection) === -1) {
            throw new DeveloperError('dynamicObjectCollection is already in this collection.');
        }
        var thisCollections = this._collections;
        thisCollections.splice(thisCollections.indexOf(dynamicObjectCollection), 1);
        dynamicObjectCollection.compositeCollection = undefined;
        dynamicObjectCollection.objectPropertiesChanged.removeEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged);
    };

    /**
     * Returns the number of collections.
     */
    CompositeDynamicObjectCollection.prototype.getLength = function() {
        return this._collections.length;
    };

    /**
     * Applies all necessary changes after adding or removing collections.
     */
    CompositeDynamicObjectCollection.prototype.applyChanges = function() {
        this._clearObjects();
        var thisMergeFunctions = this.mergeFunctions;
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

    /**
     * Gets an object with the specified id.
     * @param {Object} id The id of the object to retrieve.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns The DynamicObject with the provided id, or undefined if no such object exists.
     */
    CompositeDynamicObjectCollection.prototype.getObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        return this._hash[id];
    };

    /**
     * Gets the array of DynamicObject instances in this composite collection.
     * @returns {Array} the array of DynamicObject instances in this composite collection.
     */
    CompositeDynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    /**
     * Clears all collections and DynamicObjects from this collection.
     */
    CompositeDynamicObjectCollection.prototype.clear = function() {
        this._collections = [];
        this._clearObjects();
    };

    CompositeDynamicObjectCollection.prototype._getOrCreateObject = function(id) {
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id);
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
        var thisMergeFunctions = this.mergeFunctions;
        var thisCleanFunctions = this.cleanFunctions;
        var thisCollections = this._collections;

        var updatedObject, compositeObject, compositeObjects = [];
        for ( var i = updatedObjects.length - 1; i > -1; i--) {
            updatedObject = updatedObjects[i];
            compositeObject = this.getObject(updatedObject.id);
            if (typeof compositeObject !== 'undefined') {
                for ( var iDeleteFuncs = thisCleanFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
                    var deleteFunc = thisCleanFunctions[iDeleteFuncs];
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