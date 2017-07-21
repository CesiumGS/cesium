/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        Property) {
    "use strict";

    function resolve(that) {
        var targetEntity = that._targetEntity;

        if (that._resolveEntity) {
            targetEntity = that._targetCollection.getById(that._targetId);

            if (defined(targetEntity)) {
                that._targetEntity = targetEntity;
                that._resolveEntity = false;
            }
        }
        return targetEntity;
    }

    /**
     * References an {@link Entity} in an {@link EntityCollection}.
     *
     * @alias ReferenceEntity
     * @constructor
     *
     * @param {EntityCollection} targetCollection The entity collection which will be used to resolve the reference.
     * @param {String} targetId The id of the entity which is being referenced.
     *
     */
    var ReferenceEntity = function(targetCollection, targetId) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(targetCollection)) {
            throw new DeveloperError('targetCollection is required.');
        }
        if (!defined(targetId) || targetId === '') {
            throw new DeveloperError('targetId is required.');
        }
        //>>includeEnd('debug');

        this._targetCollection = targetCollection;
        this._targetId = targetId;
        this._targetEntity = undefined;
        this._definitionChanged = new Event();
        this._resolveEntity = true;

        targetCollection.collectionChanged.addEventListener(ReferenceEntity.prototype._onCollectionChanged, this);
    };

    defineProperties(ReferenceEntity.prototype, {
        /**
         * Gets the event that is raised whenever the definition of this entity changes.
         * The definition is changed whenever the referenced property's definition is changed.
         * @memberof ReferenceEntity.prototype
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets the id of the entity being referenced.
         * @memberof ReferenceEntity.prototype
         * @type {String}
         * @readonly
         */
        id : {
            get : function() {
                return this._targetId;
            }
        },
        /**
         * Gets the position property of the entity being referenced.
         * @memberof ReferenceProperty.prototype
         * @type {PositionProperty}
         * @readonly
         */
        position : {
            get : function() {
                var entity = resolve(this);
                return defined(entity) ? entity.position : undefined;
            }
        },
        /**
         * Gets the orientation property of the entity being referenced.
         * @memberof ReferenceProperty.prototype
         * @type {Property}
         * @readonly
         */
        orientation : {
            get : function() {
                var entity = resolve(this);
                return defined(entity) ? entity.orientation : undefined;
            }
        },
        /**
         * Gets the id of the entity being referenced.
         * @memberof ReferenceEntity.prototype
         * @type {String}
         * @readonly
         */
        targetId : {
            get : function() {
                return this._targetId;
            }
        },
        /**
         * Gets the collection containing the entity being referenced.
         * @memberof ReferenceEntity.prototype
         * @type {EntityCollection}
         * @readonly
         */
        targetCollection : {
            get : function() {
                return this._targetCollection;
            }
        },
        /**
         * Gets the resolved instance of the underlying referenced entity.
         * @memberof ReferenceEntity.prototype
         * @type {Entity}
         * @readonly
         */
         resolvedEntity : {
            get : function() {
               return resolve(this);
            }
         }
    });

    ReferenceEntity.prototype._onCollectionChanged = function(collection, added, removed) {
        var targetEntity = this._targetEntity;
        if (defined(targetEntity)) {
            if (removed.indexOf(targetEntity) !== -1) {
                this._resolveEntity = true;
            } else if (this._resolveEntity) {
                //If targetEntity is defined but resolveEntity is true, then the entity is detached
                //and any change to the collection needs to incur an attempt to resolve in order to re-attach.
                //without this if block, a reference that becomes re-attached will not signal definitionChanged
                resolve(this);
                if (!this._resolveEntity) {
                    this._definitionChanged.raiseEvent(this);
                }
            }
        }
    };

    return ReferenceEntity;
});
