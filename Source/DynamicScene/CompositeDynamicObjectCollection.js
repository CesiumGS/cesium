/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Event',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        '../Core/DeveloperError',
        './DynamicObject',
        './DynamicObjectCollection',
        './CzmlDefaults'
    ], function(
        defaultValue,
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
     * belongs to is used.  CompositeDynamicObjectCollection can be used almost anywhere that a
     * DynamicObjectCollection is used.
     *
     * @alias CompositeDynamicObjectCollection
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
    var CompositeDynamicObjectCollection = function(collections, mergeFunctions, cleanFunctions) {
        this._hash = {};
        this._array = [];
        this._collections = [];

        /**
         * The array of functions which merge DynamicObject instances together.
         */
        this.mergeFunctions = defaultValue(mergeFunctions, CzmlDefaults.mergers);

        /**
         * The array of functions which remove data from a DynamicObject instance.
         */
        this.cleanFunctions = defaultValue(cleanFunctions, CzmlDefaults.cleaners);

        /**
         * An {@link Event} that is fired whenever DynamicObjects in the collection have properties added.
         */
        this.objectPropertiesChanged = new Event();

        /**
         * An {@link Event} that is fired whenever DynamicObjects are removed from the collection.
         */
        this.objectsRemoved = new Event();

        this.setCollections(collections);
    };

    /**
     * Computes the maximum availability of the DynamicObjects in the collection.
     * If the collection contains a mix of infinitely available data and non-infinite data,
     * It will return the interval pertaining to the non-infinite data only.  If all
     * data is infinite, an infinite interval will be returned.
     * @memberof CompositeDynamicObjectCollection
     *
     * @returns {TimeInterval} The availability of DynamicObjects in the collection.
     */
    CompositeDynamicObjectCollection.prototype.computeAvailability = function() {
        var startTime = Iso8601.MAXIMUM_VALUE;
        var stopTime = Iso8601.MINIMUM_VALUE;
        var collections = this._collections;
        for ( var i = 0, len = collections.length; i < len; ++i) {
            var collection = collections[i];
            var availability = collection.computeAvailability();
            var start = availability.start;
            var stop = availability.stop;
            if (start.lessThan(startTime) && !start.equals(Iso8601.MINIMUM_VALUE)) {
                startTime = availability.start;
            }
            if (stop.greaterThan(stopTime) && !stop.equals(Iso8601.MAXIMUM_VALUE)) {
                stopTime = availability.stop;
            }
        }

        if (Iso8601.MAXIMUM_VALUE.equals(startTime)) {
            startTime = Iso8601.MINIMUM_VALUE;
        }
        if (Iso8601.MINIMUM_VALUE.equals(stopTime)) {
            stopTime = Iso8601.MAXIMUM_VALUE;
        }
        return new TimeInterval(startTime, stopTime, true, true);
    };

    /**
     * Returns a copy of the current array of collections being composited.  Changes to this
     * array will have no affect, to change which collections are being used, call setCollections.
     * @memberof CompositeDynamicObjectCollection
     *
     * @see CompositeDynamicObjectCollection#setCollections
     */
    CompositeDynamicObjectCollection.prototype.getCollections = function() {
        return this._collections.slice(0);
    };

    /**
     * Sets the array of collections to be composited.  Collections are composited
     * last to first, so higher indices into the array take precedence over lower indices.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {Array} collections The collections to be composited.
     */
    CompositeDynamicObjectCollection.prototype.setCollections = function(collections) {
        collections = typeof collections !== 'undefined' ? collections : [];

        var thisCollections = this._collections;
        if (collections !== thisCollections) {
            var collection;
            var iCollection;

            //Unsubscribe from old collections.
            for (iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
                collection = thisCollections[iCollection];
                collection.compositeCollection = undefined;
                collection.objectPropertiesChanged.removeEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);
            }

            //Make a copy of the new collections.
            thisCollections = this._collections = collections;

            //Clear all existing objects and rebuild the collection.
            this._clearObjects();
            var thisMergeFunctions = this.mergeFunctions;
            for (iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
                collection = thisCollections[iCollection];

                //Subscribe to the new collection.
                collection.compositeCollection = this;
                collection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, this);

                //Merge all of the existing objects.
                var objects = collection.getObjects();
                for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                    var object = objects[iObjects];
                    var compositeObject = this._getOrCreateObject(object.id);
                    for ( var iMergeFuncs = thisMergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
                        var mergeFunc = thisMergeFunctions[iMergeFuncs];
                        mergeFunc(compositeObject, object);
                    }
                }
            }
        }
    };

    /**
     * Gets an object with the specified id.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {Object} id The id of the object to retrieve.
     * @returns The DynamicObject with the provided id, or undefined if no such object exists.
     *
     * @exception {DeveloperError} id is required.
     */
    CompositeDynamicObjectCollection.prototype.getObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        return this._hash[id];
    };

    /**
     * Gets the array of DynamicObject instances in this composite collection.
     * @memberof CompositeDynamicObjectCollection
     *
     * @returns {Array} the array of DynamicObject instances in this composite collection.
     */
    CompositeDynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    /**
     * Clears all collections and DynamicObjects from this collection.
     * @memberof CompositeDynamicObjectCollection
     */
    CompositeDynamicObjectCollection.prototype.clear = function() {
        this.setCollections([]);
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
