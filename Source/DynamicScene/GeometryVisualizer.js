/*global define*/
define(['../Core/AssociativeArray',
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
     * A general purpose visualizer for all graphics that can be represented by {@link Primitive} instances.
     * @alias GeometryVisualizer
     * @constructor
     *
     * @param {GeometryUpdater} type The updater to be used for creating the geometry.
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     */
    var GeometryVisualizer = function(type, scene, dynamicObjectCollection) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(type)) {
            throw new DeveloperError('type is required.');
        }
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._type = type;

        var primitives = scene.primitives;
        this._scene = scene;
        this._primitives = primitives;
        this._dynamicObjectCollection = undefined;
        this._addedObjects = new AssociativeArray();
        this._removedObjects = new AssociativeArray();
        this._changedObjects = new AssociativeArray();

        this._outlineBatch = new StaticOutlineGeometryBatch(primitives);
        this._closedColorBatch = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, true);
        this._closedMaterialBatch = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, true);
        this._openColorBatch = new StaticGeometryColorBatch(primitives, type.perInstanceColorAppearanceType, false);
        this._openMaterialBatch = new StaticGeometryPerMaterialBatch(primitives, type.materialAppearanceType, false);
        this._dynamicBatch = new DynamicGeometryBatch(primitives);

        this._subscriptions = new AssociativeArray();
        this._updaters = new AssociativeArray();
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     * @memberof GeometryVisualizer
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    GeometryVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     * @memberof GeometryVisualizer
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    GeometryVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     * @memberof GeometryVisualizer
     *
     * @param {DynamicObjectCollection} dynamicObjectCollection The DynamicObjectCollection to visualizer.
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
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     * @memberof GeometryVisualizer
     *
     * @param {JulianDate} time The time to update to.
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
        var dynamicObject;
        var id;
        var updater;

        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            id = dynamicObject.id;
            updater = this._updaters.get(id);
            removeUpdater(this, updater);
            updater.destroy();
            this._updaters.remove(id);
            this._subscriptions.get(id)();
            this._subscriptions.remove(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            id = dynamicObject.id;
            updater = new this._type(dynamicObject, this._scene);
            this._updaters.set(id, updater);
            insertUpdaterIntoBatch(this, time, updater);
            this._subscriptions.set(id, updater.geometryChanged.addEventListener(GeometryVisualizer._onGeometryChanged, this));
        }

        for (i = changed.length - 1; i > -1; i--) {
            dynamicObject = changed[i];
            id = dynamicObject.id;
            updater = this._updaters.get(id);
            removeUpdater(this, updater);
            insertUpdaterIntoBatch(this, time, updater);
        }

        addedObjects.removeAll();
        removedObjects.removeAll();
        changedObjects.removeAll();

        this._outlineBatch.update(time);
        this._closedColorBatch.update(time);
        this._closedMaterialBatch.update(time);
        this._openColorBatch.update(time);
        this._openMaterialBatch.update(time);
        this._dynamicBatch.update(time);
    };

    /**
     * Removes all primitives from the scene.
     * @memberof GeometryVisualizer
     */
    GeometryVisualizer.prototype.removeAllPrimitives = function() {
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
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * @memberof GeometryVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
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
     * @memberof GeometryVisualizer
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     */
    GeometryVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    /**
     * @private
     */
    GeometryVisualizer._onGeometryChanged = function(updater) {
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var dynamicObject = updater.dynamicObject;
        var id = dynamicObject.id;

        if (!defined(removedObjects.get(id)) && !defined(changedObjects.get(id))) {
            changedObjects.set(id, dynamicObject);
        }
    };

    /**
     * @private
     */
    GeometryVisualizer.prototype._onCollectionChanged = function(dynamicObjectCollection, added, removed) {
        var addedObjects = this._addedObjects;
        var removedObjects = this._removedObjects;
        var changedObjects = this._changedObjects;

        var i;
        var id;
        var dynamicObject;
        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            id = dynamicObject.id;
            if (!addedObjects.remove(id)) {
                removedObjects.set(id, dynamicObject);
                changedObjects.remove(id);
            }
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            id = dynamicObject.id;
            if (removedObjects.remove(id)) {
                changedObjects.set(id, dynamicObject);
            } else {
                addedObjects.set(id, dynamicObject);
            }
        }
    };

    return GeometryVisualizer;
});
