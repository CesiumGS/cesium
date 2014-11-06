/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        './ColorMaterialProperty',
        './StaticGeometryColorBatch',
        './StaticGeometryPerMaterialBatch',
        './StaticOutlineGeometryBatch'
    ], function(
        AssociativeArray,
        defined,
        destroyObject,
        DeveloperError,
        ColorMaterialProperty,
        StaticGeometryColorBatch,
        StaticGeometryPerMaterialBatch,
        StaticOutlineGeometryBatch) {
    "use strict";

    var emptyArray = [];

    var DynamicGeometryBatch = function(primitives) {
        this._primitives = primitives;
        this._dynamicUpdaters = new AssociativeArray();
    };

    DynamicGeometryBatch.prototype.add = function(time, updater) {
        this._dynamicUpdaters.set(updater.entity.id, updater.createDynamicUpdater(this._primitives));
    };

    DynamicGeometryBatch.prototype.remove = function(updater) {
        var id = updater.entity.id;
        var dynamicUpdater = this._dynamicUpdaters.get(id);
        if (defined(dynamicUpdater)) {
            this._dynamicUpdaters.remove(id);
            dynamicUpdater.destroy();
        }
    };

    DynamicGeometryBatch.prototype.update = function(time) {
        var geometries = this._dynamicUpdaters.values;
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].update(time);
        }
        return true;
    };

    DynamicGeometryBatch.prototype.removeAllPrimitives = function() {
        var geometries = this._dynamicUpdaters.values;
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].destroy();
        }
        this._dynamicUpdaters.removeAll();
    };

    function removeUpdater(that, updater) {
        //We don't keep track of which batch an updater is in, so just remove it from all of them.
        that._outlineBatch.remove(updater);
        that._closedColorBatch.remove(updater);
        that._closedMaterialBatch.remove(updater);
        that._openColorBatch.remove(updater);
        that._openMaterialBatch.remove(updater);
        that._dynamicBatch.remove(updater);
    }

    function insertUpdaterIntoBatch(that, time, updater) {
        if (updater.isDynamic) {
            that._dynamicBatch.add(time, updater);
            return;
        }

        if (updater.outlineEnabled) {
            that._outlineBatch.add(time, updater);
        }

        if (updater.fillEnabled) {
            if (updater.isClosed) {
                if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                    that._closedColorBatch.add(time, updater);
                } else {
                    that._closedMaterialBatch.add(time, updater);
                }
            } else {
                if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                    that._openColorBatch.add(time, updater);
                } else {
                    that._openMaterialBatch.add(time, updater);
                }
            }
        }
    }

    /**
     * A general purpose visualizer for geometry represented by {@link Primitive} instances.
     * @alias GeometryVisualizer
     * @constructor
     *
     * @param {GeometryUpdater} type The updater to be used for creating the geometry.
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     */
    var GeometryVisualizer = function(type, scene, entityCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(entityCollection)) {
            throw new DeveloperError('entityCollection is required.');
        }
        //>>includeEnd('debug');

        this._type = type;

        var primitives = scene.primitives;
        this._scene = scene;
        this._primitives = primitives;
        this._entityCollection = undefined;
        this._addedObjects = new AssociativeArray();
        this._removedObjects = new AssociativeArray();
        this._changedObjects = new AssociativeArray();

        this._outlineBatch = new StaticOutlineGeometryBatch(primitives, scene);
        this._closedColorBatch = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, true);
        this._closedMaterialBatch = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, true);
        this._openColorBatch = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, false);
        this._openMaterialBatch = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, false);
        this._dynamicBatch = new DynamicGeometryBatch(primitives);

        this._subscriptions = new AssociativeArray();
        this._updaters = new AssociativeArray();

        this._entityCollection = entityCollection;
        entityCollection.collectionChanged.addEventListener(GeometryVisualizer.prototype._onCollectionChanged, this);
        this._onCollectionChanged(entityCollection, entityCollection.entities, emptyArray);
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} True if the visualizer successfully updated to the provided time,
     * false if the visualizer is waiting for asynchronous primitives to be created.
     */
    GeometryVisualizer.prototype.update = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var addedObjects = this._addedObjects;
        var added = addedObjects.values;
        var removedObjects = this._removedObjects;
        var removed = removedObjects.values;
        var changedObjects = this._changedObjects;
        var changed = changedObjects.values;

        var i;
        var entity;
        var id;
        var updater;

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            id = entity.id;
            updater = this._updaters.get(id);
            removeUpdater(this, updater);
            updater.destroy();
            this._updaters.remove(id);
            this._subscriptions.get(id)();
            this._subscriptions.remove(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            id = entity.id;
            updater = new this._type(entity, this._scene);
            this._updaters.set(id, updater);
            insertUpdaterIntoBatch(this, time, updater);
            this._subscriptions.set(id, updater.geometryChanged.addEventListener(GeometryVisualizer._onGeometryChanged, this));
        }

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            id = entity.id;
            updater = this._updaters.get(id);
            removeUpdater(this, updater);
            insertUpdaterIntoBatch(this, time, updater);
        }

        addedObjects.removeAll();
        removedObjects.removeAll();
        changedObjects.removeAll();

        var isUpdated = this._closedColorBatch.update(time);
        isUpdated = this._closedMaterialBatch.update(time) && isUpdated;
        isUpdated = this._openColorBatch.update(time) && isUpdated;
        isUpdated = this._openMaterialBatch.update(time) && isUpdated;
        isUpdated = this._dynamicBatch.update(time) && isUpdated;
        isUpdated = this._outlineBatch.update(time) && isUpdated;
        return isUpdated;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    GeometryVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes and destroys all primitives created by this instance.
     */
    GeometryVisualizer.prototype.destroy = function() {
        this._entityCollection.collectionChanged.removeEventListener(GeometryVisualizer.prototype._onCollectionChanged, this);
        this._addedObjects.removeAll();
        this._removedObjects.removeAll();

        this._outlineBatch.removeAllPrimitives();
        this._closedColorBatch.removeAllPrimitives();
        this._closedMaterialBatch.removeAllPrimitives();
        this._openColorBatch.removeAllPrimitives();
        this._openMaterialBatch.removeAllPrimitives();
        this._dynamicBatch.removeAllPrimitives();

        var subscriptions = this._subscriptions.values;
        var len = subscriptions.length;
        for (var i = 0; i < len; i++) {
            subscriptions[i]();
        }
        this._subscriptions.removeAll();
        return destroyObject(this);
    };

    /**
     * @private
     */
    GeometryVisualizer._onGeometryChanged = function(updater) {
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var entity = updater.entity;
        var id = entity.id;

        if (!defined(removedObjects.get(id)) && !defined(changedObjects.get(id))) {
            changedObjects.set(id, entity);
        }
    };

    /**
     * @private
     */
    GeometryVisualizer.prototype._onCollectionChanged = function(entityCollection, added, removed) {
        var addedObjects = this._addedObjects;
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var i;
        var id;
        var entity;
        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            id = entity.id;
            if (!addedObjects.remove(id)) {
                removedObjects.set(id, entity);
                changedObjects.remove(id);
            }
        }

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            id = entity.id;
            if (removedObjects.remove(id)) {
                changedObjects.set(id, entity);
            } else {
                addedObjects.set(id, entity);
            }
        }
    };

    return GeometryVisualizer;
});
