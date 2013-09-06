/*global define*/
define(['../Core/defined',
        '../Core/defineProperties',
        './DynamicObject',
        './DynamicObjectCollection'
    ], function(
        defined,
        defineProperties,
        DynamicObject,
        DynamicObjectCollection) {
    "use strict";

    function subscribe(dynamicObject) {
    }

    function unsubscribe(dynamicObject) {
    }

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
        this._composite = new DynamicObjectCollection();
        this._collections = defined(collections) ? collections.slice() : [];
        this._collectionsCopy = [];
        mergeIfNeeded(this);
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
                return this._composite._collectionChanged;
            }
        }
    });

    /**
     * Prevents {@link DynamicObjectCollection#collectionChanged} events from being raised
     * until a corresponding call is made to {@link DynamicObjectCollection#resumeEvents}, at which
     * point a single event will be raised that covers all suspended operations.
     * This allows for many items to be added and removed efficiently.
     * This function is reference counted and can safely be called multiple times as long as there
     * are corresponding calls to {@link DynamicObjectCollection#resumeEvents}.
     * @memberof DynamicObjectCollection
     */
    CompositeDynamicObjectCollection.prototype.suspendEvents = function() {
        this._composite.suspendEvents();
    };

    /**
     * Resumes raising {@link DynamicObjectCollection#collectionChanged} events immediately
     * when an item is added or removed.  Any modifications made while while events were suspended
     * will be triggered as a single event when this function is called.
     * This function is reference counted and can safely be called multiple times as long as there
     * are corresponding calls to {@link DynamicObjectCollection#resumeEvents}.
     * @memberof DynamicObjectCollection
     *
     * @exception {DeveloperError} resumeEvents can not be called before suspendEvents.
     */
    CompositeDynamicObjectCollection.prototype.resumeEvents = function() {
        this._composite.resumeEvents();
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
        mergeIfNeeded(this);
        return this._composite.computeAvailability();
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
        mergeIfNeeded(this);
        return this._composite.getById(id);
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
        return this._composite.getObjects();
    };

    function mergeIfNeeded(that) {
        var collections = that._collections;
        var collectionsLength = collections.length;

        var collectionsCopy = that._collectionsCopy;
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
                return false;
            }
        }

        var object;
        var objects;
        var iObjects;
        var collection;
        var composite = that._composite;
        var newObjects = new DynamicObjectCollection();

        for (i = 0; i < collectionsCopyLength; i++) {
            collection = collectionsCopy[i];
            collection.collectionChanged.removeEventListener(CompositeDynamicObjectCollection.prototype._onCollectionChanged, that);
            objects = collection.getObjects();
            for ( iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                object = objects[iObjects];
                object.propertyAssigned.removeEventListener(CompositeDynamicObjectCollection.prototype._propertyChanged, that);
                unsubscribe(object);
            }
        }

        for (i = collectionsLength - 1; i >= 0; i--) {
            collection = collections[i];
            collection.collectionChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onCollectionChanged, that);

            //Merge all of the existing objects.
            objects = collection.getObjects();
            for ( iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                object = objects[iObjects];
                object.propertyAssigned.addEventListener(CompositeDynamicObjectCollection.prototype._propertyChanged, that);
                subscribe(object);

                var compositeObject = newObjects.getById(object.id);
                if (!defined(compositeObject)) {
                    compositeObject = composite.getById(object.id);
                    if (!defined(compositeObject)) {
                        compositeObject = new DynamicObject(object.id);
                    } else {
                        compositeObject.clean();
                    }
                    newObjects.add(compositeObject);
                }
                compositeObject.merge(object);
            }
        }
        that._collectionsCopy = collections.slice(0);

        composite.suspendEvents();
        composite.removeAll();
        var newObjectsArray = newObjects.getObjects();
        for (i = 0; i < newObjectsArray.length; i++) {
            composite.add(newObjectsArray[i]);
        }
        composite.resumeEvents();
        return true;
    }

    CompositeDynamicObjectCollection.prototype._propertyChanged = function(dynamicObject, propertyName, newValue, oldValue) {
        //If we have a pending full merge, just do it and return.
        if (mergeIfNeeded(this)) {
            return;
        }

        var id = dynamicObject.id;
        var composite = this._composite;
        var compositeObject = composite.getById(id);
        var compositeProperty = compositeObject[propertyName];

        if (defined(compositeProperty) && defined(compositeProperty.clean)) {
            compositeProperty.clean();
        } else {
            compositeProperty = undefined;
        }

        var collections = this._collectionsCopy;
        var collectionsLength = collections.length;
        for ( var q = collectionsLength - 1; q >= 0; q--) {
            var object = collections[q].getById(dynamicObject.id);
            if (defined(object)) {
                var property = object[propertyName];
                if (defined(property)) {
                    if (!defined(compositeProperty)) {
                        compositeProperty = property;
                        continue;
                    }
                    if (defined(compositeProperty.merge)) {
                        compositeProperty.merge(property);
                    } else {
                        break;
                    }
                }
            }
        }
        compositeObject[propertyName] = compositeProperty;
    };

    CompositeDynamicObjectCollection.prototype._subPropertyChanged = function(dynamicObject, propertyName, property, subPropertyName, newValue, oldValue) {
        //If we have a pending full merge, just do it and return.
        if (mergeIfNeeded(this)) {
            return;
        }

        var id = dynamicObject.id;
        var composite = this._composite;
        var compositeObject = composite.getById(id);
        var compositeProperty = compositeObject[propertyName];
        var collections = this._collectionsCopy;
        var collectionsLength = collections.length;
        for ( var q = collectionsLength - 1; q >= 0; q--) {
            var object = collections[q].getById(dynamicObject.id);
            if (defined(object)) {
                var objectProperty = object[propertyName];
                if (defined(objectProperty)) {
                    var objectSubProperty = objectProperty[subPropertyName];
                    if (defined(objectSubProperty)) {
                        compositeProperty[subPropertyName] = objectSubProperty;
                        return;
                    }
                }
            }
        }
        compositeProperty[subPropertyName] = undefined;
    };

    CompositeDynamicObjectCollection.prototype._onCollectionChanged = function(collection, added, removed) {
        //If we have a pending full merge, just do it and return.
        if (mergeIfNeeded(this)) {
            return;
        }

        var collections = this._collectionsCopy;
        var collectionsLength = collections.length;
        var composite = this._composite;
        composite.suspendEvents();

        var i;
        var q;
        var object;
        var compositeObject;
        var removedLength = removed.length;
        for (i = 0; i < removedLength; i++) {
            var removedObject = removed[i];
            removedObject.propertyAssigned.removeEventListener(CompositeDynamicObjectCollection.prototype._propertyChanged, this);
            unsubscribe(removedObject);

            var removedId = removedObject.id;
            //Check if the removed object exists in any of the remaining collections
            //If so, we clean and remerge it.
            for (q = collectionsLength - 1; q >= 0; q--) {
                object = collections[q].getById(removedId);
                if (defined(object)) {
                    if (!defined(compositeObject)) {
                        compositeObject = composite.getById(removedId);
                        compositeObject.clean();
                    }
                    compositeObject.merge(object);
                }
            }
            //We never retrieved the compositeObject, which means it no longer
            //exists in any of the collections, remove it from the composite.
            if (!defined(compositeObject)) {
                composite.removeById(removedId);
            }
        }

        var addedLength = added.length;
        for (i = 0; i < addedLength; i++) {
            var addedObject = added[i];
            addedObject.propertyAssigned.addEventListener(CompositeDynamicObjectCollection.prototype._propertyChanged, this);
            subscribe(addedObject);

            var addedId = addedObject.id;
            //We know the added object exists in at least one collection,
            //but we need to check all collections and re-merge in order
            //to maintain the priority of properties.
            for (q = collectionsLength - 1; q >= 0; q--) {
                object = collections[q].getById(addedId);
                if (defined(object)) {
                    if (!defined(compositeObject)) {
                        compositeObject = composite.getById(addedId);
                        if (!defined(compositeObject)) {
                            compositeObject = new DynamicObject(addedId);
                            composite.add(compositeObject);
                        } else {
                            compositeObject.clean();
                        }
                    }
                    compositeObject.merge(object);
                }
            }
        }

        composite.resumeEvents();
    };

    return CompositeDynamicObjectCollection;
});
