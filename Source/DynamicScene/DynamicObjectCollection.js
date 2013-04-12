/*global define*/
define([
        '../Core/Event',
        '../Core/TimeInterval',
        '../Core/Iso8601',
        '../Core/DeveloperError',
        './DynamicObject'
    ], function(
        Event,
        TimeInterval,
        Iso8601,
        DeveloperError,
        DynamicObject) {
    "use strict";

    /**
     * A collection of DynamicObject instances.
     * @alias DynamicObjectCollection
     * @constructor
     */
    var DynamicObjectCollection = function() {
        this._hash = {};
        this._array = [];

        /**
         * The CompositeDynamicObjectCollection, if any, that this collection is in.
         */
        this.compositeCollection = undefined;

        /**
         * An {@link Event} that is fired whenever DynamicObjects in the collection have properties added.
         */
        this.objectPropertiesChanged = new Event();

        /**
         * An {@link Event} that is fired whenever DynamicObjects are removed from the collection.
         */
        this.objectsRemoved = new Event();
    };

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
        var dynamicObjects = this._array;
        for ( var i = 0, len = dynamicObjects.length; i < len; i++) {
            var object = dynamicObjects[i];
            var availability = object.availability;
            if (typeof availability !== 'undefined') {
                var start = availability.start;
                var stop = availability.stop;
                if (start.lessThan(startTime) && !start.equals(Iso8601.MINIMUM_VALUE)) {
                    startTime = object.availability.start;
                }
                if (stop.greaterThan(stopTime) && !stop.equals(Iso8601.MAXIMUM_VALUE)) {
                    stopTime = object.availability.stop;
                }
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
     * Gets an object with the specified id.
     * @param {Object} id The id of the object to retrieve.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns The DynamicObject with the provided id, or undefined if no such object exists.
     */
    DynamicObjectCollection.prototype.getObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        return this._hash[id];
    };

    /**
     * Removes an object with the specified id.
     * @param {Object} id The id of the object to remove.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns True if the DynamicObject with the provided id was found and deleted.
     */
    DynamicObjectCollection.prototype.removeObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        var dynamicObject = this._hash[id];
        var result = typeof dynamicObject !== 'undefined';
        if (result) {
            this._hash[id] = undefined;
            this._array.splice(this._array.indexOf(dynamicObject), 1);
            this.objectsRemoved.raiseEvent(this, [dynamicObject]);
        }
        return result;
    };

    /**
     * Gets the array of DynamicObject instances in this composite collection.
     * @returns {Array} the array of DynamicObject instances in this composite collection.
     */
    DynamicObjectCollection.prototype.getObjects = function() {
        return this._array;
    };

    /**
     * Gets an object with the specified id or creates it and adds it to the collection if it does not exist.
     * @param {Object} id The id of the object to retrieve.
     *
     * @exception {DeveloperError} id is required.
     *
     * @returns The DynamicObject with the provided id.
     */
    DynamicObjectCollection.prototype.getOrCreateObject = function(id) {
        if (typeof id === 'undefined') {
            throw new DeveloperError('id is required.');
        }
        var obj = this._hash[id];
        if (!obj) {
            obj = new DynamicObject(id);
            this._hash[id] = obj;
            this._array.push(obj);
        }
        return obj;
    };

    /**
     * Removes all objects from the collection.
     */
    DynamicObjectCollection.prototype.clear = function() {
        var removedObjects = this._array;
        this._hash = {};
        this._array = [];
        if (removedObjects.length > 0) {
            this.objectsRemoved.raiseEvent(this, removedObjects);
        }
    };

    return DynamicObjectCollection;
});
