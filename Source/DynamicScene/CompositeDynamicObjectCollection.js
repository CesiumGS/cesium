/*global define*/
define(['../Core/createGuid',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Math',
        './DynamicObject',
        './DynamicObjectCollection'
    ], function(
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        CesiumMath,
        DynamicObject,
        DynamicObjectCollection) {
    "use strict";

    var propertyIdScratch = new Array(3);
    var dynamicObjectIdScratch = new Array(2);

    function clean(dynamicObject) {
        var propertyNames = dynamicObject.propertyNames;
        var propertyNamesLength = propertyNames.length;
        for ( var i = 0; i < propertyNamesLength; i++) {
            dynamicObject[propertyNames[i]] = undefined;
        }
    }

    function createSubPropertyChangedCallback(that, dynamicObject, propertyName) {
        return function(property, subPropertyName, newValue, oldValue) {
            var id = dynamicObject.id;
            var composite = that._composite;
            var compositeObject = composite.getById(id);
            var compositeProperty = compositeObject[propertyName];
            var collections = that._collectionsCopy;
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
    }

    function createPropertyChangedCallback(that, collectionId) {
        var composite = that._composite;
        var eventHash = that._eventHash;
        return function(dynamicObject, propertyName, newValue, oldValue) {
            var id = dynamicObject.id;
            var compositeObject = composite.getById(id);
            var compositeProperty = compositeObject[propertyName];

            unsubscribeFromProperty(eventHash, collectionId, dynamicObject, propertyName);
            subscribeToProperty(that, eventHash, collectionId, dynamicObject, propertyName, dynamicObject[propertyName]);

            var collections = that._collectionsCopy;
            var collectionsLength = collections.length;
            var firstTime = true;
            for ( var q = collectionsLength - 1; q >= 0; q--) {
                var object = collections[q].getById(dynamicObject.id);
                if (defined(object)) {
                    var property = object[propertyName];
                    if (defined(property)) {
                        if (firstTime) {
                            firstTime = false;
                            //We only want to clone if the property is also mergeable.
                            //This ensures that leaf properties are referenced and not copied,
                            //which is the entire point of compositing.
                            if (defined(property.merge) && defined(property.clone)) {
                                compositeProperty = property.clone(compositeProperty);
                            } else {
                                compositeProperty = property;
                                break;
                            }
                        }
                        compositeProperty.merge(property);
                    }
                }
            }
            compositeObject[propertyName] = compositeProperty;
        };
    }

    function subscribeToProperty(that, eventHash, collectionId, dynamicObject, propertyName, property) {
        if (defined(property) && defined(property.propertyChanged)) {
            var subpropertyChanged = createSubPropertyChangedCallback(that, dynamicObject, propertyName);
            propertyIdScratch[0] = collectionId;
            propertyIdScratch[1] = dynamicObject.id;
            propertyIdScratch[2] = propertyName;
            eventHash[JSON.stringify(propertyIdScratch)] = property.propertyChanged.addEventListener(subpropertyChanged);
        }
    }

    function unsubscribeFromProperty(eventHash, collectionId, dynamicObject, propertyName) {
        propertyIdScratch[0] = collectionId;
        propertyIdScratch[1] = dynamicObject.id;
        propertyIdScratch[2] = propertyName;
        var propertyId = JSON.stringify(propertyIdScratch);
        var unsubscribeFunc = eventHash[propertyId];
        if (defined(unsubscribeFunc)) {
            unsubscribeFunc();
            eventHash[propertyId] = undefined;
        }
    }

    function subscribeToDynamicObject(that, eventHash, collectionId, dynamicObject) {
        dynamicObjectIdScratch[0] = collectionId;
        dynamicObjectIdScratch[1] = dynamicObject.id;
        eventHash[JSON.stringify(dynamicObjectIdScratch)] = dynamicObject.propertyChanged.addEventListener(createPropertyChangedCallback(that, collectionId));

        var properties = dynamicObject.propertyNames;
        var length = properties.length;
        for ( var i = 0; i < length; i++) {
            var propertyName = properties[i];
            subscribeToProperty(that, eventHash, collectionId, dynamicObject, propertyName, dynamicObject[propertyName]);
        }
    }

    function unsubscribeFromDynamicObject(that, eventHash, collectionId, dynamicObject) {
        dynamicObjectIdScratch[0] = collectionId;
        dynamicObjectIdScratch[1] = dynamicObject.id;
        var id = JSON.stringify(dynamicObjectIdScratch);
        eventHash[id]();
        eventHash[id] = undefined;

        var properties = dynamicObject.propertyNames;
        var length = properties.length;
        for ( var i = 0; i < length; i++) {
            var propertyName = properties[i];
            unsubscribeFromProperty(eventHash, collectionId, dynamicObject, propertyName);
        }
    }

    function recomposite(that) {
        var collections = that._collections;
        var collectionsLength = collections.length;

        var collectionsCopy = that._collectionsCopy;
        var collectionsCopyLength = collectionsCopy.length;

        var i;
        var object;
        var objects;
        var iObjects;
        var collection;
        var composite = that._composite;
        var newObjects = new DynamicObjectCollection();
        var eventHash = that._eventHash;
        var collectionId;

        for (i = 0; i < collectionsCopyLength; i++) {
            collection = collectionsCopy[i];
            collection.collectionChanged.removeEventListener(CompositeDynamicObjectCollection.prototype._onCollectionChanged, that);
            objects = collection.getObjects();
            collectionId = collection.id;
            for (iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                object = objects[iObjects];
                unsubscribeFromDynamicObject(that, eventHash, collectionId, object);
            }
        }

        for (i = collectionsLength - 1; i >= 0; i--) {
            collection = collections[i];
            collection.collectionChanged.addEventListener(CompositeDynamicObjectCollection.prototype._onCollectionChanged, that);

            //Merge all of the existing objects.
            objects = collection.getObjects();
            collectionId = collection.id;
            for (iObjects = objects.length - 1; iObjects > -1; iObjects--) {
                object = objects[iObjects];
                subscribeToDynamicObject(that, eventHash, collectionId, object);

                var compositeObject = newObjects.getById(object.id);
                if (!defined(compositeObject)) {
                    compositeObject = composite.getById(object.id);
                    if (!defined(compositeObject)) {
                        compositeObject = new DynamicObject(object.id);
                    } else {
                        clean(compositeObject);
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

    /**
     * Non-destructively composites multiple {@link DynamicObjectCollection} instances into a single collection.
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
     */
    var CompositeDynamicObjectCollection = function(collections) {
        this._composite = new DynamicObjectCollection();
        this._collections = defined(collections) ? collections.slice() : [];
        this._collectionsCopy = [];
        this._id = createGuid();
        this._eventHash = {};
        recomposite(this);
    };

    defineProperties(CompositeDynamicObjectCollection.prototype, {
        /**
         * Gets the event that is fired when objects are added or removed from the collection.
         * The generated event is a {@link DynamicObjectCollection.collectionChangedEventCallback}.
         * @memberof CompositeDynamicObjectCollection.prototype
         *
         * @type {Event}
         */
        collectionChanged : {
            get : function() {
                return this._composite._collectionChanged;
            }
        },
        /**
         * Gets a globally unique identifier for this collection.
         * @memberof CompositeDynamicObjectCollection.prototype
         *
         * @type {String}
         */
        id : {
            get : function() {
                return this._id;
            }
        }
    });

    /**
     * Adds a collection to the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to add.
     * @param {Number} [index] the index to add the collection at.  If omitted, the collection will
     *                         added on top of all existing collections.
     *
     * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of collections.
     */
    CompositeDynamicObjectCollection.prototype.addCollection = function(collection, index) {
        var hasIndex = defined(index);
        //>>includeStart('debug', pragmas.debug);
        if (!defined(collection)) {
            throw new DeveloperError('collection is required.');
        }
        if (hasIndex) {
            if (index < 0) {
                throw new DeveloperError('index must be greater than or equal to zero.');
            } else if (index > this._collections.length) {
                throw new DeveloperError('index must be less than or equal to the number of collections.');
            }
        }
        //>>includeEnd('debug');

        if (!hasIndex) {
            index = this._collections.length;
            this._collections.push(collection);
        } else {
            this._collections.splice(index, 0, collection);
        }

        recomposite(this);
    };

    /**
     * Removes a collection from this composite, if present.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection The collection to remove.
     *
     * @returns {Boolean} true if the collection was in the composite and was removed,
     *                    false if the collection was not in the composite.
     */
    CompositeDynamicObjectCollection.prototype.removeCollection = function(collection) {
        var index = this._collections.indexOf(collection);
        if (index !== -1) {
            this._collections.splice(index, 1);
            recomposite(this);
            return true;
        }
        return false;
    };

    /**
     * Removes all collections from this composite.
     * @memberof CompositeDynamicObjectCollection
     */
    CompositeDynamicObjectCollection.prototype.removeAllCollections = function() {
        this._collections.length = [];
        recomposite(this);
    };

    /**
     * Checks to see if the composite contains a given collection.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to check for.
     * @returns {Boolean} true if the composite contains the collection, false otherwise.
     */
    CompositeDynamicObjectCollection.prototype.containsCollection = function(collection) {
        return this._collections.indexOf(collection) !== -1;
    };

    /**
     * Determines the index of a given collection in the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection The collection to find the index of.
     * @returns {Number} The index of the collection in the composite, or -1 if the collection does not exist in the composite.
     */
    CompositeDynamicObjectCollection.prototype.indexOfCollection = function(collection) {
        return this._collections.indexOf(collection);
    };

    /**
     * Gets a collection by index from the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {Number} index the index to retrieve.
     */
    CompositeDynamicObjectCollection.prototype.getCollection = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.', 'index');
        }
        //>>includeEnd('debug');

        return this._collections[index];
    };

    /**
     * Gets the number of collections in this composite.
     * @memberof CompositeDynamicObjectCollection
     */
    CompositeDynamicObjectCollection.prototype.getCollectionsLength = function() {
        return this._collections.length;
    };

    function getCollectionIndex(collections, collection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(collection)) {
            throw new DeveloperError('collection is required.');
        }
        //>>includeEnd('debug');

        var index = collections.indexOf(collection);

        //>>includeStart('debug', pragmas.debug);
        if (index === -1) {
            throw new DeveloperError('collection is not in this composite.');
        }
        //>>includeEnd('debug');

        return index;
    }

    function swapCollections(composite, i, j) {
        var arr = composite._collections;
        i = CesiumMath.clamp(i, 0, arr.length - 1);
        j = CesiumMath.clamp(j, 0, arr.length - 1);

        if (i === j) {
            return;
        }

        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;

        recomposite(composite);
    }

    /**
     * Raises a collection up one position in the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeDynamicObjectCollection.prototype.raiseCollection = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        swapCollections(this, index, index + 1);
    };

    /**
     * Lowers a collection down one position in the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeDynamicObjectCollection.prototype.lowerCollection = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        swapCollections(this, index, index - 1);
    };

    /**
     * Raises a collection to the top of the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeDynamicObjectCollection.prototype.raiseCollectionToTop = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        if (index === this._collections.length - 1) {
            return;
        }
        this._collections.splice(index, 1);
        this._collections.push(collection);

        recomposite(this);
    };

    /**
     * Lowers a collection to the bottom of the composite.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {DynamicObjectCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeDynamicObjectCollection.prototype.lowerCollectionToBottom = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        if (index === 0) {
            return;
        }
        this._collections.splice(index, 1);
        this._collections.splice(0, 0, collection);

        recomposite(this);
    };

    /**
     * Prevents {@link DynamicObjectCollection#collectionChanged} events from being raised
     * until a corresponding call is made to {@link DynamicObjectCollection#resumeEvents}, at which
     * point a single event will be raised that covers all suspended operations.
     * This allows for many items to be added and removed efficiently.
     * This function can be safely called multiple times as long as there
     * are corresponding calls to {@link DynamicObjectCollection#resumeEvents}.
     * @memberof CompositeDynamicObjectCollection
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
     * @memberof CompositeDynamicObjectCollection
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
        return this._composite.computeAvailability();
    };

    /**
     * Gets an object with the specified id.
     * @memberof CompositeDynamicObjectCollection
     *
     * @param {Object} id The id of the object to retrieve.
     * @returns {DynamicObject} The object with the provided id or undefined if the id did not exist in the collection.
     */
    CompositeDynamicObjectCollection.prototype.getById = function(id) {
        return this._composite.getById(id);
    };

    /**
     * Gets the array of DynamicObject instances in the collection.
     * The array should not be modified directly.
     * @memberof CompositeDynamicObjectCollection
     *
     * @returns {Array} the array of DynamicObject instances in the collection.
     */
    CompositeDynamicObjectCollection.prototype.getObjects = function() {
        return this._composite.getObjects();
    };

    CompositeDynamicObjectCollection.prototype._onCollectionChanged = function(collection, added, removed) {
        var collections = this._collectionsCopy;
        var collectionsLength = collections.length;
        var composite = this._composite;
        composite.suspendEvents();

        var i;
        var q;
        var object;
        var compositeObject;
        var removedLength = removed.length;
        var eventHash = this._eventHash;
        var collectionId = collection.id;
        for (i = 0; i < removedLength; i++) {
            var removedObject = removed[i];
            unsubscribeFromDynamicObject(this, eventHash, collectionId, removedObject);

            var removedId = removedObject.id;
            //Check if the removed object exists in any of the remaining collections
            //If so, we clean and remerge it.
            for (q = collectionsLength - 1; q >= 0; q--) {
                object = collections[q].getById(removedId);
                if (defined(object)) {
                    if (!defined(compositeObject)) {
                        compositeObject = composite.getById(removedId);
                        clean(compositeObject);
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
            subscribeToDynamicObject(this, eventHash, collectionId, addedObject);

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
                            clean(compositeObject);
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
