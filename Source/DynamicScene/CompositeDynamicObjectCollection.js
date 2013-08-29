/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        '../Core/EventHelper',
        '../Core/Iso8601',
        '../Core/TimeInterval',
        '../Core/DeveloperError',
        './DynamicObject',
        './DynamicBillboard',
        './DynamicClock',
        './DynamicEllipse',
        './DynamicEllipsoid',
        './DynamicCone',
        './DynamicLabel',
        './DynamicPath',
        './DynamicPoint',
        './DynamicPolygon',
        './DynamicPolyline',
        './DynamicPyramid',
        './DynamicVector'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        Event,
        EventHelper,
        Iso8601,
        TimeInterval,
        DeveloperError,
        DynamicObject,
        DynamicBillboard,
        DynamicClock,
        DynamicEllipse,
        DynamicEllipsoid,
        DynamicCone,
        DynamicLabel,
        DynamicPath,
        DynamicPoint,
        DynamicPolygon,
        DynamicPolyline,
        DynamicPyramid,
        DynamicVector) {
    "use strict";

    function getOrCreateObject(compositeDynamicObjectCollection, id) {
        var obj = compositeDynamicObjectCollection._hash[id];
        if (!obj) {
            obj = new DynamicObject(id);
            compositeDynamicObjectCollection._hash[id] = obj;
            compositeDynamicObjectCollection._array.push(obj);
        }
        return obj;
    }

//function clearObjects(compositeDynamicObjectCollection) {
//  var removedObjects = compositeDynamicObjectCollection._array;
//  compositeDynamicObjectCollection._hash = {};
//  compositeDynamicObjectCollection._array = [];
//  if (removedObjects.length > 0) {
//      compositeDynamicObjectCollection.objectsRemoved.raiseEvent(compositeDynamicObjectCollection, removedObjects);
//  }
//}
//
//CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged = function(dynamicObjectCollection, updatedObjects) {
//  var thisMergeFunctions = this.mergeFunctions;
//  var thisCleanFunctions = this.cleanFunctions;
//  var thisCollections = this._collections;
//
//  var updatedObject, compositeObject, compositeObjects = [];
//  for ( var i = updatedObjects.length - 1; i > -1; i--) {
//      updatedObject = updatedObjects[i];
//      compositeObject = this.getObject(updatedObject.id);
//      if (defined(compositeObject)) {
//          for ( var iDeleteFuncs = thisCleanFunctions.length - 1; iDeleteFuncs > -1; iDeleteFuncs--) {
//              var deleteFunc = thisCleanFunctions[iDeleteFuncs];
//              deleteFunc(compositeObject);
//          }
//      } else {
//          compositeObject = getOrCreateObject(this, updatedObject.id);
//      }
//
//      compositeObjects.push(compositeObject);
//      for ( var iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
//          var currentCollection = thisCollections[iCollection];
//          var objectToUpdate = currentCollection.getObject(updatedObject.id);
//          if (defined(objectToUpdate)) {
//              for ( var iMergeFuncs = thisMergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
//                  var mergeFunc = thisMergeFunctions[iMergeFuncs];
//                  mergeFunc(compositeObject, objectToUpdate);
//              }
//          }
//      }
//  }
//  if (compositeObjects.length > 0) {
//      this.objectPropertiesChanged.raiseEvent(this, compositeObjects);
//  }
//};

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
     *
     * @see DynamicObjectCollection
     */
    var CompositeDynamicObjectCollection = function(collections) {
        this._added = [];
        this._array = [];
        this._collectionChanged = new Event();
        this._eventHelper = new EventHelper();
        this._removed = [];
        this._hash = {};
        this._suspectRefCount = 0;
        this._collections = defined(collections) ? collections.slice() : [];
        this._collectionsCopy = [];
    };

    defineProperties(CompositeDynamicObjectCollection.prototype, {
        /**
         * Gets the array of collections.
         * @memberof CompositeDynamicObjectCollection.prototype
         *
         * @type {Array}
         */
        collections : {
            get : function() {
                return this._collections;
            }
        },
        /**
         * Gets the event that is fired when objects are added or removed from the collection.
         * The generated event is a {@link DynamicObjectCollection.collectionChangedEventCallback}.
         * @memberof DynamicObjectCollection.prototype
         *
         * @type {Event}
         */
        collectionChanged : {
            get : function() {
                return this._collectionChanged;
            }
        }
    });

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
        mergeIfNeeded(this);

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
     * Gets an object with the specified id.
     * @memberof DynamicObjectCollection
     *
     * @param {Object} id The id of the object to retrieve.
     * @returns {DynamicObject} The object with the provided id or undefined if the id did not exist in the collection.
     *
     * @exception {DeveloperError} id is required.
     */
    CompositeDynamicObjectCollection.prototype.getById = function(id) {
        if (!defined(id)) {
            throw new DeveloperError('id is required.');
        }
        mergeIfNeeded(this);
        return this._hash[id];
    };

    /**
     * Gets the array of DynamicObject instances in the collection.
     * The array should not be modified directly.
     * @memberof DynamicObjectCollection
     *
     * @returns {Array} the array of DynamicObject instances in the collection.
     */
    CompositeDynamicObjectCollection.prototype.getObjects = function() {
        mergeIfNeeded(this);
        return this._array;
    };

    function mergeIfNeeded(collection) {
        var collections = collection._collections;
        var collectionsLength = collections.length;

        var collectionsCopy = collection._collectionsCopy;
        var collectionsCopyLength = collectionsCopy.length;

        var i;
        if (collectionsLength === collectionsCopyLength) {
            var identical = true;
            for (i = 0; i < collectionsLength; i++) {
                if (collections[i] !== collectionsCopy[i]) {
                    identical = false;
                    break;
                }
            }
            if (identical) {
                return;
            }
        }

//        var eventHelper = collection._eventHelper;
//        eventHelper.removeAll();

//        for (i = collectionsLength - 1; i >= 0; i++) {
//            var collection = collections[i];
//        }
//
//        //Make a copy of the new collections.
//        thisCollections = collection._collections = collections;
//
//        //Clear all existing objects and rebuild the collection.
//        clearObjects(collection);
//        var thisMergeFunctions = collection.mergeFunctions;
//        for (iCollection = thisCollections.length - 1; iCollection > -1; iCollection--) {
//            collection = thisCollections[iCollection];
//
//            //Subscribe to the new collection.
//            collection.objectPropertiesChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onObjectPropertiesChanged, collection);
//
//            //Merge all of the existing objects.
//            var objects = collection.getObjects();
//            for ( var iObjects = objects.length - 1; iObjects > -1; iObjects--) {
//                var object = objects[iObjects];
//                var compositeObject = getOrCreateObject(collection, object.id);
//                for ( var iMergeFuncs = thisMergeFunctions.length - 1; iMergeFuncs > -1; iMergeFuncs--) {
//                    var mergeFunc = thisMergeFunctions[iMergeFuncs];
//                    mergeFunc(compositeObject, object);
//                }
//            }
//        }
//
//        collection._collectionsCopy = collectionsCopy.slice(0);
    }

    CompositeDynamicObjectCollection.prototype._collectionChanged = function(){

    };

    return CompositeDynamicObjectCollection;
});
