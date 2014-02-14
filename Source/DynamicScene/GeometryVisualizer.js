/*global define*/
define(['../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/AssociativeArray',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/PolylineColorAppearance',
        '../Scene/MaterialAppearance',
        '../Scene/PolylineMaterialAppearance',
        './DynamicObjectCollection',
        './GeometryBatchType',
        './StaticGeometryColorBatch',
        './StaticGeometryPerMaterialBatch',
        './StaticOutlineGeometryBatch'
    ], function(
        defined,
        DeveloperError,
        destroyObject,
        AssociativeArray,
        PerInstanceColorAppearance,
        PolylineColorAppearance,
        MaterialAppearance,
        PolylineMaterialAppearance,
        DynamicObjectCollection,
        GeometryBatchType,
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
        this._dynamicUpdaters.set(updater.dynamicObject.id, updater.createDynamicUpdater(this._primitives));
    };

    DynamicGeometryBatch.prototype.remove = function(updater) {
        var id = updater.dynamicObject.id;
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
    };

    DynamicGeometryBatch.prototype.removeAllPrimitives = function() {
        var geometries = this._dynamicUpdaters.values;
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].destroy();
        }
        this._dynamicUpdaters.removeAll();
    };

    /**
     * A DynamicObject visualizer which maps the DynamicPolygon instance
     * in DynamicObject.polygon to a Polygon primitive.
     * @alias GeometryVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @see DynamicPolygon
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPyramidVisualizer
     */
    var GeometryVisualizer = function(type, scene, dynamicObjectCollection) {
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        this._type = type;

        var primitives = scene.getPrimitives();
        this._scene = scene;
        this._primitives = primitives;
        this._dynamicObjectCollection = undefined;
        this._addedObjects = new DynamicObjectCollection();
        this._removedObjects = new DynamicObjectCollection();
        this._changedObjects = new DynamicObjectCollection();

        this._outlineBatch = new StaticOutlineGeometryBatch(primitives);

        this._batches = [];
        this._batches[GeometryBatchType.COLOR_CLOSED.value] = new StaticGeometryColorBatch(primitives, type.PerInstanceColorAppearanceType, true);
        this._batches[GeometryBatchType.MATERIAL_CLOSED.value] = new StaticGeometryPerMaterialBatch(primitives, type.MaterialAppearanceType, true);
        this._batches[GeometryBatchType.COLOR_OPEN.value] = new StaticGeometryColorBatch(primitives, type.PerInstanceColorAppearanceType, false);
        this._batches[GeometryBatchType.MATERIAL_OPEN.value] = new StaticGeometryPerMaterialBatch(primitives, type.MaterialAppearanceType, false);
        this._batches[GeometryBatchType.DYNAMIC.value] = new DynamicGeometryBatch(primitives);

        this._subscriptions = new AssociativeArray();
        this._updaters = new AssociativeArray();
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    GeometryVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    GeometryVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    GeometryVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(GeometryVisualizer.prototype._onCollectionChanged, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(GeometryVisualizer.prototype._onCollectionChanged, this);
                //Add all existing items to the collection.
                this._onCollectionChanged(dynamicObjectCollection, dynamicObjectCollection.getObjects(), emptyArray);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     */
    GeometryVisualizer.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }

        var addedObjects = this._addedObjects;
        var added = addedObjects.getObjects();
        var removedObjects = this._removedObjects;
        var removed = removedObjects.getObjects();
        var changedObjects = this._changedObjects;
        var changed = changedObjects.getObjects();

        var i;
        var g;
        var dynamicObject;
        var id;
        var updater;
        var batch;
        var batches = this._batches;
        var batchesLength = batches.length;

        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            id = dynamicObject.id;
            updater = this._updaters.get(id);
            batch = batches[updater.geometryType.value];
            if (defined(batch)) {
                batch.remove(updater);
            }

            this._outlineBatch.remove(updater);

            updater.destroy();
            this._updaters.remove(id);
            this._subscriptions.get(id)();
            this._subscriptions.remove(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            id = dynamicObject.id;
            updater = new this._type(dynamicObject);
            this._updaters.set(id, updater);

            batch = batches[updater.geometryType.value];
            if (defined(batch)) {
                batch.add(time, updater);
            }

            if (updater.outlineEnabled) {
                this._outlineBatch.add(time, updater);
            }
            this._subscriptions.set(id, updater.geometryChanged.addEventListener(GeometryVisualizer._onGeometyChanged, this));
        }

        for (i = changed.length - 1; i > -1; i--) {
            dynamicObject = changed[i];
            id = dynamicObject.id;
            updater = this._updaters.get(id);
            for (g = 0; g < batchesLength; g++) {
                if (batches[g].remove(updater)) {
                    break;
                }
            }
            this._outlineBatch.remove(updater);

            batch = batches[updater.geometryType.value];
            if (defined(batch)) {
                batch.add(time, updater);
            }

            if (updater.outlineEnabled) {
                this._outlineBatch.add(time, updater);
            }
        }

        addedObjects.removeAll();
        removedObjects.removeAll();
        changedObjects.removeAll();

        for (g = 0; g < batches.length; g++) {
            batches[g].update(time);
        }
        this._outlineBatch.update(time);
    };

    /**
     * Removes all primitives from the scene.
     */
    GeometryVisualizer.prototype.removeAllPrimitives = function() {
        this._addedObjects.removeAll();
        this._removedObjects.removeAll();

        var batches = this._batches;
        var batchesLength = batches.length;
        for (var g = 0; g < batchesLength; g++) {
            batches[g].removeAllPrimitives();
        }
        this._outlineBatch.removeAllPrimitives();

        var subscriptions = this._subscriptions.values;
        var len = subscriptions.length;
        for (var i = 0; i < len; i++) {
            subscriptions[i]();
        }
        this._subscriptions.removeAll();
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof GeometryVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see GeometryVisualizer#destroy
     */
    GeometryVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof GeometryVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see GeometryVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    GeometryVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    GeometryVisualizer._onGeometyChanged = function(updater) {
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var dynamicObject = updater.dynamicObject;
        var id = dynamicObject.id;

        if (!defined(removedObjects.getById(id)) && !defined(this._changedObjects.getById(id))) {
            this._changedObjects.add(dynamicObject);
        }
    };

    GeometryVisualizer.prototype._onCollectionChanged = function(dynamicObjectCollection, added, removed) {
        var addedObjects = this._addedObjects;
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var i;
        var dynamicObject;
        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            if (!addedObjects.remove(dynamicObject)) {
                removedObjects.add(dynamicObject);
                changedObjects.remove(dynamicObject);
            }
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            if (removedObjects.remove(dynamicObject)) {
                changedObjects.add(dynamicObject);
            } else {
                addedObjects.add(dynamicObject);
            }
        }
    };

    return GeometryVisualizer;
});
