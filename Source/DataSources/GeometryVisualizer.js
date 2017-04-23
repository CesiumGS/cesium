/*global define*/
define([
        '../Core/AssociativeArray',
        '../Core/BoundingSphere',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Scene/ShadowMode',
        './BoundingSphereState',
        './ColorMaterialProperty',
        './StaticGeometryColorBatch',
        './StaticGeometryPerMaterialBatch',
        './StaticGroundGeometryColorBatch',
        './StaticOutlineGeometryBatch'
    ], function(
        AssociativeArray,
        BoundingSphere,
        defined,
        destroyObject,
        DeveloperError,
        ShadowMode,
        BoundingSphereState,
        ColorMaterialProperty,
        StaticGeometryColorBatch,
        StaticGeometryPerMaterialBatch,
        StaticGroundGeometryColorBatch,
        StaticOutlineGeometryBatch) {
    'use strict';

    var emptyArray = [];

    function DynamicGeometryBatch(primitives, groundPrimitives) {
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._dynamicUpdaters = new AssociativeArray();
    }
    DynamicGeometryBatch.prototype.add = function(time, updater) {
        this._dynamicUpdaters.set(updater.entity.id, updater.createDynamicUpdater(this._primitives, this._groundPrimitives));
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

    DynamicGeometryBatch.prototype.getBoundingSphere = function(entity, result) {
        var updater = this._dynamicUpdaters.get(entity.id);
        if (defined(updater) && defined(updater.getBoundingSphere)) {
            return updater.getBoundingSphere(entity, result);
        }
        return BoundingSphereState.FAILED;
    };

    function removeUpdater(that, updater) {
        //We don't keep track of which batch an updater is in, so just remove it from all of them.
        var batches = that._batches;
        var length = batches.length;
        for (var i = 0; i < length; i++) {
            batches[i].remove(updater);
        }
    }

    function insertUpdaterIntoBatch(that, time, updater) {
        if (updater.isDynamic) {
            that._dynamicBatch.add(time, updater);
            return;
        }

        var shadows;
        if (updater.outlineEnabled || updater.fillEnabled) {
            shadows = updater.shadowsProperty.getValue(time);
        }

        if (updater.outlineEnabled) {
            that._outlineBatches[shadows].add(time, updater);
        }

        var multiplier = 0;
        if (defined(updater.depthFailMaterialProperty)) {
            multiplier = updater.depthFailMaterialProperty instanceof ColorMaterialProperty ? 1 : 2;
        }

        var index;
        if (defined(shadows)) {
            index = shadows + multiplier * ShadowMode.NUMBER_OF_SHADOW_MODES;
        }

        if (updater.fillEnabled) {
            if (updater.onTerrain) {
                that._groundColorBatch.add(time, updater);
            } else {
                if (updater.isClosed) {
                    if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                        that._closedColorBatches[index].add(time, updater);
                    } else {
                        that._closedMaterialBatches[index].add(time, updater);
                    }
                } else {
                    if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                        that._openColorBatches[index].add(time, updater);
                    } else {
                        that._openMaterialBatches[index].add(time, updater);
                    }
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
    function GeometryVisualizer(type, scene, entityCollection) {
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
        var groundPrimitives = scene.groundPrimitives;
        this._scene = scene;
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._entityCollection = undefined;
        this._addedObjects = new AssociativeArray();
        this._removedObjects = new AssociativeArray();
        this._changedObjects = new AssociativeArray();

        var numberOfShadowModes = ShadowMode.NUMBER_OF_SHADOW_MODES;
        this._outlineBatches = new Array(numberOfShadowModes);
        this._closedColorBatches = new Array(numberOfShadowModes * 3);
        this._closedMaterialBatches = new Array(numberOfShadowModes * 3);
        this._openColorBatches = new Array(numberOfShadowModes * 3);
        this._openMaterialBatches = new Array(numberOfShadowModes * 3);

        for (var i = 0; i < numberOfShadowModes; ++i) {
            this._outlineBatches[i] = new StaticOutlineGeometryBatch(primitives, scene, i);

            this._closedColorBatches[i] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, undefined, true, i);
            this._closedMaterialBatches[i] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, undefined, true, i);
            this._openColorBatches[i] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, undefined, false, i);
            this._openMaterialBatches[i] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, undefined, false, i);

            this._closedColorBatches[i + numberOfShadowModes] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, type.perInstanceColorAppearanceType, true, i);
            this._closedMaterialBatches[i + numberOfShadowModes] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, type.perInstanceColorAppearanceType, true, i);
            this._openColorBatches[i + numberOfShadowModes] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, type.perInstanceColorAppearanceType, false, i);
            this._openMaterialBatches[i + numberOfShadowModes] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, type.perInstanceColorAppearanceType, false, i);

            this._closedColorBatches[i + numberOfShadowModes * 2] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, type.materialAppearanceType, true, i);
            this._closedMaterialBatches[i + numberOfShadowModes * 2] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, type.materialAppearanceType, true, i);
            this._openColorBatches[i + numberOfShadowModes * 2] = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, type.materialAppearanceType, false, i);
            this._openMaterialBatches[i + numberOfShadowModes * 2] = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, type.materialAppearanceType, false, i);
        }

        this._groundColorBatch = new StaticGroundGeometryColorBatch(groundPrimitives);
        this._dynamicBatch = new DynamicGeometryBatch(primitives, groundPrimitives);

        this._batches = this._outlineBatches.concat(this._closedColorBatches, this._closedMaterialBatches, this._openColorBatches, this._openMaterialBatches, this._groundColorBatch, this._dynamicBatch);

        this._subscriptions = new AssociativeArray();
        this._updaters = new AssociativeArray();

        this._entityCollection = entityCollection;
        entityCollection.collectionChanged.addEventListener(GeometryVisualizer.prototype._onCollectionChanged, this);
        this._onCollectionChanged(entityCollection, entityCollection.values, emptyArray);
    }

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

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            id = entity.id;
            updater = this._updaters.get(id);

            //If in a single update, an entity gets removed and a new instance
            //re-added with the same id, the updater no longer tracks the
            //correct entity, we need to both remove the old one and
            //add the new one, which is done by pushing the entity
            //onto the removed/added lists.
            if (updater.entity === entity) {
                removeUpdater(this, updater);
                insertUpdaterIntoBatch(this, time, updater);
            } else {
                removed.push(entity);
                added.push(entity);
            }
        }

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

        addedObjects.removeAll();
        removedObjects.removeAll();
        changedObjects.removeAll();

        var isUpdated = true;
        var batches = this._batches;
        var length = batches.length;
        for (i = 0; i < length; i++) {
            isUpdated = batches[i].update(time) && isUpdated;
        }

        return isUpdated;
    };

    var getBoundingSphereArrayScratch = [];
    var getBoundingSphereBoundingSphereScratch = new BoundingSphere();

    /**
     * Computes a bounding sphere which encloses the visualization produced for the specified entity.
     * The bounding sphere is in the fixed frame of the scene's globe.
     *
     * @param {Entity} entity The entity whose bounding sphere to compute.
     * @param {BoundingSphere} result The bounding sphere onto which to store the result.
     * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
     *                       BoundingSphereState.PENDING if the result is still being computed, or
     *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
     * @private
     */
    GeometryVisualizer.prototype.getBoundingSphere = function(entity, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(entity)) {
            throw new DeveloperError('entity is required.');
        }
        if (!defined(result)) {
            throw new DeveloperError('result is required.');
        }
        //>>includeEnd('debug');

        var boundingSpheres = getBoundingSphereArrayScratch;
        var tmp = getBoundingSphereBoundingSphereScratch;

        var count = 0;
        var state = BoundingSphereState.DONE;
        var batches = this._batches;
        var batchesLength = batches.length;

        for (var i = 0; i < batchesLength; i++) {
            state = batches[i].getBoundingSphere(entity, tmp);
            if (state === BoundingSphereState.PENDING) {
                return BoundingSphereState.PENDING;
            } else if (state === BoundingSphereState.DONE) {
                boundingSpheres[count] = BoundingSphere.clone(tmp, boundingSpheres[count]);
                count++;
            }
        }

        if (count === 0) {
            return BoundingSphereState.FAILED;
        }

        boundingSpheres.length = count;
        BoundingSphere.fromBoundingSpheres(boundingSpheres, result);
        return BoundingSphereState.DONE;
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

        var i;
        var batches = this._batches;
        var length = batches.length;
        for (i = 0; i < length; i++) {
            batches[i].removeAllPrimitives();
        }

        var subscriptions = this._subscriptions.values;
        length = subscriptions.length;
        for (i = 0; i < length; i++) {
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
