/*global define*/
define([
        '../Core/createGuid',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Math',
        './Entity',
        './EntityCollection'
    ], function(
        createGuid,
        defined,
        defineProperties,
        DeveloperError,
        CesiumMath,
        Entity,
        EntityCollection) {
    "use strict";

    var entityIdScratch = new Array(2);

    function clean(entity) {
        var propertyNames = entity.propertyNames;
        var propertyNamesLength = propertyNames.length;
        for (var i = 0; i < propertyNamesLength; i++) {
            entity[propertyNames[i]] = undefined;
        }
    }

    function subscribeToEntity(that, eventHash, collectionId, entity) {
        entityIdScratch[0] = collectionId;
        entityIdScratch[1] = entity.id;
        eventHash[JSON.stringify(entityIdScratch)] = entity.definitionChanged.addEventListener(CompositeEntityCollection.prototype._onDefinitionChanged, that);
    }

    function unsubscribeFromEntity(that, eventHash, collectionId, entity) {
        entityIdScratch[0] = collectionId;
        entityIdScratch[1] = entity.id;
        var id = JSON.stringify(entityIdScratch);
        eventHash[id]();
        eventHash[id] = undefined;
    }

    function recomposite(that) {
        that._shouldRecomposite = true;
        if (that._suspendCount !== 0) {
            return;
        }

        var collections = that._collections;
        var collectionsLength = collections.length;

        var collectionsCopy = that._collectionsCopy;
        var collectionsCopyLength = collectionsCopy.length;

        var i;
        var entity;
        var entities;
        var iEntities;
        var collection;
        var composite = that._composite;
        var newEntities = new EntityCollection();
        var eventHash = that._eventHash;
        var collectionId;

        for (i = 0; i < collectionsCopyLength; i++) {
            collection = collectionsCopy[i];
            collection.collectionChanged.removeEventListener(CompositeEntityCollection.prototype._onCollectionChanged, that);
            entities = collection.entities;
            collectionId = collection.id;
            for (iEntities = entities.length - 1; iEntities > -1; iEntities--) {
                entity = entities[iEntities];
                unsubscribeFromEntity(that, eventHash, collectionId, entity);
            }
        }

        for (i = collectionsLength - 1; i >= 0; i--) {
            collection = collections[i];
            collection.collectionChanged.addEventListener(CompositeEntityCollection.prototype._onCollectionChanged, that);

            //Merge all of the existing entities.
            entities = collection.entities;
            collectionId = collection.id;
            for (iEntities = entities.length - 1; iEntities > -1; iEntities--) {
                entity = entities[iEntities];
                subscribeToEntity(that, eventHash, collectionId, entity);

                var compositeEntity = newEntities.getById(entity.id);
                if (!defined(compositeEntity)) {
                    compositeEntity = composite.getById(entity.id);
                    if (!defined(compositeEntity)) {
                        compositeEntity = new Entity(entity.id);
                    } else {
                        clean(compositeEntity);
                    }
                    newEntities.add(compositeEntity);
                }
                compositeEntity.merge(entity);
            }
        }
        that._collectionsCopy = collections.slice(0);

        composite.suspendEvents();
        composite.removeAll();
        var newEntitiesArray = newEntities.entities;
        for (i = 0; i < newEntitiesArray.length; i++) {
            composite.add(newEntitiesArray[i]);
        }
        composite.resumeEvents();
    }

    /**
     * Non-destructively composites multiple {@link EntityCollection} instances into a single collection.
     * If a Entity with the same ID exists in multiple collections, it is non-destructively
     * merged into a single new entity instance.  If an entity has the same property in multiple
     * collections, the property of the Entity in the last collection of the list it
     * belongs to is used.  CompositeEntityCollection can be used almost anywhere that a
     * EntityCollection is used.
     *
     * @alias CompositeEntityCollection
     * @constructor
     *
     * @param {EntityCollection[]} [collections] The initial list of EntityCollection instances to merge.
     */
    var CompositeEntityCollection = function(collections) {
        this._composite = new EntityCollection();
        this._suspendCount = 0;
        this._collections = defined(collections) ? collections.slice() : [];
        this._collectionsCopy = [];
        this._id = createGuid();
        this._eventHash = {};
        recomposite(this);
        this._shouldRecomposite = false;
    };

    defineProperties(CompositeEntityCollection.prototype, {
        /**
         * Gets the event that is fired when entities are added or removed from the collection.
         * The generated event is a {@link EntityCollection.collectionChangedEventCallback}.
         * @memberof CompositeEntityCollection.prototype
         * @readonly
         * @type {Event}
         */
        collectionChanged : {
            get : function() {
                return this._composite._collectionChanged;
            }
        },
        /**
         * Gets a globally unique identifier for this collection.
         * @memberof CompositeEntityCollection.prototype
         * @readonly
         * @type {String}
         */
        id : {
            get : function() {
                return this._id;
            }
        },
        /**
         * Gets the array of Entity instances in the collection.
         * This array should not be modified directly.
         * @memberof CompositeEntityCollection.prototype
         * @readonly
         * @type {Entity[]}
         */
        entities : {
            get : function() {
                return this._composite.entities;
            }
        }
    });

    /**
     * Adds a collection to the composite.
     *
     * @param {EntityCollection} collection the collection to add.
     * @param {Number} [index] the index to add the collection at.  If omitted, the collection will
     *                         added on top of all existing collections.
     *
     * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of collections.
     */
    CompositeEntityCollection.prototype.addCollection = function(collection, index) {
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
     *
     * @param {EntityCollection} collection The collection to remove.
     * @returns {Boolean} true if the collection was in the composite and was removed,
     *                    false if the collection was not in the composite.
     */
    CompositeEntityCollection.prototype.removeCollection = function(collection) {
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
     */
    CompositeEntityCollection.prototype.removeAllCollections = function() {
        this._collections.length = 0;
        recomposite(this);
    };

    /**
     * Checks to see if the composite contains a given collection.
     *
     * @param {EntityCollection} collection the collection to check for.
     * @returns {Boolean} true if the composite contains the collection, false otherwise.
     */
    CompositeEntityCollection.prototype.containsCollection = function(collection) {
        return this._collections.indexOf(collection) !== -1;
    };

    /**
     * Determines the index of a given collection in the composite.
     *
     * @param {EntityCollection} collection The collection to find the index of.
     * @returns {Number} The index of the collection in the composite, or -1 if the collection does not exist in the composite.
     */
    CompositeEntityCollection.prototype.indexOfCollection = function(collection) {
        return this._collections.indexOf(collection);
    };

    /**
     * Gets a collection by index from the composite.
     *
     * @param {Number} index the index to retrieve.
     */
    CompositeEntityCollection.prototype.getCollection = function(index) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(index)) {
            throw new DeveloperError('index is required.', 'index');
        }
        //>>includeEnd('debug');

        return this._collections[index];
    };

    /**
     * Gets the number of collections in this composite.
     */
    CompositeEntityCollection.prototype.getCollectionsLength = function() {
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
     *
     * @param {EntityCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeEntityCollection.prototype.raiseCollection = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        swapCollections(this, index, index + 1);
    };

    /**
     * Lowers a collection down one position in the composite.
     *
     * @param {EntityCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeEntityCollection.prototype.lowerCollection = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        swapCollections(this, index, index - 1);
    };

    /**
     * Raises a collection to the top of the composite.
     *
     * @param {EntityCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeEntityCollection.prototype.raiseCollectionToTop = function(collection) {
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
     *
     * @param {EntityCollection} collection the collection to move.
     *
     * @exception {DeveloperError} collection is not in this composite.
     */
    CompositeEntityCollection.prototype.lowerCollectionToBottom = function(collection) {
        var index = getCollectionIndex(this._collections, collection);
        if (index === 0) {
            return;
        }
        this._collections.splice(index, 1);
        this._collections.splice(0, 0, collection);

        recomposite(this);
    };

    /**
     * Prevents {@link EntityCollection#collectionChanged} events from being raised
     * until a corresponding call is made to {@link EntityCollection#resumeEvents}, at which
     * point a single event will be raised that covers all suspended operations.
     * This allows for many items to be added and removed efficiently.
     * While events are suspended, recompositing of the collections will
     * also be suspended, as this can be a costly operation.
     * This function can be safely called multiple times as long as there
     * are corresponding calls to {@link EntityCollection#resumeEvents}.
     */
    CompositeEntityCollection.prototype.suspendEvents = function() {
        this._suspendCount++;
        this._composite.suspendEvents();
    };

    /**
     * Resumes raising {@link EntityCollection#collectionChanged} events immediately
     * when an item is added or removed.  Any modifications made while while events were suspended
     * will be triggered as a single event when this function is called.  This function also ensures
     * the collection is recomposited if events are also resumed.
     * This function is reference counted and can safely be called multiple times as long as there
     * are corresponding calls to {@link EntityCollection#resumeEvents}.
     *
     * @exception {DeveloperError} resumeEvents can not be called before suspendEvents.
     */
    CompositeEntityCollection.prototype.resumeEvents = function() {
        //>>includeStart('debug', pragmas.debug);
        if (this._suspendCount === 0) {
            throw new DeveloperError('resumeEvents can not be called before suspendEvents.');
        }
        //>>includeEnd('debug');

        this._suspendCount--;
        // recomposite before triggering events (but only if required for performance) that might depend on a composited collection
        if (this._shouldRecomposite && this._suspendCount === 0) {
            recomposite(this);
            this._shouldRecomposite = false;
        }

        this._composite.resumeEvents();
    };

    /**
     * Computes the maximum availability of the entities in the collection.
     * If the collection contains a mix of infinitely available data and non-infinite data,
     * It will return the interval pertaining to the non-infinite data only.  If all
     * data is infinite, an infinite interval will be returned.
     *
     * @returns {TimeInterval} The availability of entities in the collection.
     */
    CompositeEntityCollection.prototype.computeAvailability = function() {
        return this._composite.computeAvailability();
    };

    /**
     * Gets an entity with the specified id.
     *
     * @param {Object} id The id of the entity to retrieve.
     * @returns {Entity} The entity with the provided id or undefined if the id did not exist in the collection.
     */
    CompositeEntityCollection.prototype.getById = function(id) {
        return this._composite.getById(id);
    };

    CompositeEntityCollection.prototype._onCollectionChanged = function(collection, added, removed) {
        var collections = this._collectionsCopy;
        var collectionsLength = collections.length;
        var composite = this._composite;
        composite.suspendEvents();

        var i;
        var q;
        var entity;
        var compositeEntity;
        var removedLength = removed.length;
        var eventHash = this._eventHash;
        var collectionId = collection.id;
        for (i = 0; i < removedLength; i++) {
            var removedEntity = removed[i];
            unsubscribeFromEntity(this, eventHash, collectionId, removedEntity);

            var removedId = removedEntity.id;
            //Check if the removed entity exists in any of the remaining collections
            //If so, we clean and remerge it.
            for (q = collectionsLength - 1; q >= 0; q--) {
                entity = collections[q].getById(removedId);
                if (defined(entity)) {
                    if (!defined(compositeEntity)) {
                        compositeEntity = composite.getById(removedId);
                        clean(compositeEntity);
                    }
                    compositeEntity.merge(entity);
                }
            }
            //We never retrieved the compositeEntity, which means it no longer
            //exists in any of the collections, remove it from the composite.
            if (!defined(compositeEntity)) {
                composite.removeById(removedId);
            }
        }

        var addedLength = added.length;
        for (i = 0; i < addedLength; i++) {
            var addedEntity = added[i];
            subscribeToEntity(this, eventHash, collectionId, addedEntity);

            var addedId = addedEntity.id;
            //We know the added entity exists in at least one collection,
            //but we need to check all collections and re-merge in order
            //to maintain the priority of properties.
            for (q = collectionsLength - 1; q >= 0; q--) {
                entity = collections[q].getById(addedId);
                if (defined(entity)) {
                    if (!defined(compositeEntity)) {
                        compositeEntity = composite.getById(addedId);
                        if (!defined(compositeEntity)) {
                            compositeEntity = new Entity(addedId);
                            composite.add(compositeEntity);
                        } else {
                            clean(compositeEntity);
                        }
                    }
                    compositeEntity.merge(entity);
                }
            }
        }

        composite.resumeEvents();
    };

    CompositeEntityCollection.prototype._onDefinitionChanged = function(entity, propertyName, newValue, oldValue) {
        var collections = this._collections;
        var composite = this._composite;

        var collectionsLength = collections.length;
        var id = entity.id;
        var compositeEntity = composite.getById(id);
        var compositeProperty = compositeEntity[propertyName];

        var firstTime = true;
        for (var q = collectionsLength - 1; q >= 0; q--) {
            var innerEntity = collections[q].getById(entity.id);
            if (defined(innerEntity)) {
                var property = innerEntity[propertyName];
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
        compositeEntity[propertyName] = compositeProperty;
    };

    return CompositeEntityCollection;
});
