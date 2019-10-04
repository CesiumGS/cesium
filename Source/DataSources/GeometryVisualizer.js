import AssociativeArray from '../Core/AssociativeArray.js';
import BoundingSphere from '../Core/BoundingSphere.js';
import Check from '../Core/Check.js';
import defaultValue from '../Core/defaultValue.js';
import defined from '../Core/defined.js';
import destroyObject from '../Core/destroyObject.js';
import Event from '../Core/Event.js';
import EventHelper from '../Core/EventHelper.js';
import ClassificationType from '../Scene/ClassificationType.js';
import MaterialAppearance from '../Scene/MaterialAppearance.js';
import PerInstanceColorAppearance from '../Scene/PerInstanceColorAppearance.js';
import ShadowMode from '../Scene/ShadowMode.js';
import BoundingSphereState from './BoundingSphereState.js';
import BoxGeometryUpdater from './BoxGeometryUpdater.js';
import ColorMaterialProperty from './ColorMaterialProperty.js';
import CorridorGeometryUpdater from './CorridorGeometryUpdater.js';
import CylinderGeometryUpdater from './CylinderGeometryUpdater.js';
import DynamicGeometryBatch from './DynamicGeometryBatch.js';
import EllipseGeometryUpdater from './EllipseGeometryUpdater.js';
import EllipsoidGeometryUpdater from './EllipsoidGeometryUpdater.js';
import Entity from './Entity.js';
import PlaneGeometryUpdater from './PlaneGeometryUpdater.js';
import PolygonGeometryUpdater from './PolygonGeometryUpdater.js';
import PolylineVolumeGeometryUpdater from './PolylineVolumeGeometryUpdater.js';
import RectangleGeometryUpdater from './RectangleGeometryUpdater.js';
import StaticGeometryColorBatch from './StaticGeometryColorBatch.js';
import StaticGeometryPerMaterialBatch from './StaticGeometryPerMaterialBatch.js';
import StaticGroundGeometryColorBatch from './StaticGroundGeometryColorBatch.js';
import StaticGroundGeometryPerMaterialBatch from './StaticGroundGeometryPerMaterialBatch.js';
import StaticOutlineGeometryBatch from './StaticOutlineGeometryBatch.js';
import WallGeometryUpdater from './WallGeometryUpdater.js';

    var emptyArray = [];

    var geometryUpdaters = [BoxGeometryUpdater, CylinderGeometryUpdater, CorridorGeometryUpdater, EllipseGeometryUpdater, EllipsoidGeometryUpdater, PlaneGeometryUpdater,
                            PolygonGeometryUpdater, PolylineVolumeGeometryUpdater, RectangleGeometryUpdater, WallGeometryUpdater];

    function GeometryUpdaterSet(entity, scene) {
        this.entity = entity;
        this.scene = scene;
        var updaters = new Array(geometryUpdaters.length);
        var geometryChanged = new Event();
        function raiseEvent(geometry) {
            geometryChanged.raiseEvent(geometry);
        }
        var eventHelper = new EventHelper();
        for (var i = 0; i < updaters.length; i++) {
            var updater = new geometryUpdaters[i](entity, scene);
            eventHelper.add(updater.geometryChanged, raiseEvent);
            updaters[i] = updater;
        }
        this.updaters = updaters;
        this.geometryChanged = geometryChanged;
        this.eventHelper = eventHelper;

        this._removeEntitySubscription = entity.definitionChanged.addEventListener(GeometryUpdaterSet.prototype._onEntityPropertyChanged, this);
    }

    GeometryUpdaterSet.prototype._onEntityPropertyChanged = function(entity, propertyName, newValue, oldValue) {
        var updaters = this.updaters;
        for (var i = 0; i < updaters.length; i++) {
            updaters[i]._onEntityPropertyChanged(entity, propertyName, newValue, oldValue);
        }
    };

    GeometryUpdaterSet.prototype.forEach = function (callback) {
        var updaters = this.updaters;
        for (var i = 0; i < updaters.length; i++) {
            callback(updaters[i]);
        }
    };

    GeometryUpdaterSet.prototype.destroy = function() {
        this.eventHelper.removeAll();
        var updaters = this.updaters;
        for (var i = 0; i < updaters.length; i++) {
            updaters[i].destroy();
        }
        this._removeEntitySubscription();
        destroyObject(this);
    };

    /**
     * A general purpose visualizer for geometry represented by {@link Primitive} instances.
     * @alias GeometryVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {EntityCollection} entityCollection The entityCollection to visualize.
     * @param {PrimitiveCollection} [primitives=scene.primitives] A collection to add primitives related to the entities
     * @param {PrimitiveCollection} [groundPrimitives=scene.groundPrimitives] A collection to add ground primitives related to the entities
     */
    function GeometryVisualizer(scene, entityCollection, primitives, groundPrimitives) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('scene', scene);
        Check.defined('entityCollection', entityCollection);
        //>>includeEnd('debug');

        primitives = defaultValue(primitives, scene.primitives);
        groundPrimitives = defaultValue(groundPrimitives, scene.groundPrimitives);

        this._scene = scene;
        this._primitives = primitives;
        this._groundPrimitives = groundPrimitives;
        this._entityCollection = undefined;
        this._addedObjects = new AssociativeArray();
        this._removedObjects = new AssociativeArray();
        this._changedObjects = new AssociativeArray();

        var numberOfShadowModes = ShadowMode.NUMBER_OF_SHADOW_MODES;
        this._outlineBatches = new Array(numberOfShadowModes*2);
        this._closedColorBatches = new Array(numberOfShadowModes*2);
        this._closedMaterialBatches = new Array(numberOfShadowModes*2);
        this._openColorBatches = new Array(numberOfShadowModes*2);
        this._openMaterialBatches = new Array(numberOfShadowModes*2);

        var supportsMaterialsforEntitiesOnTerrain = Entity.supportsMaterialsforEntitiesOnTerrain(scene);
        this._supportsMaterialsforEntitiesOnTerrain = supportsMaterialsforEntitiesOnTerrain;

        var i;
        for (i = 0; i < numberOfShadowModes; ++i) {
            this._outlineBatches[i] = new StaticOutlineGeometryBatch(primitives, scene, i, false);
            this._outlineBatches[numberOfShadowModes + i] = new StaticOutlineGeometryBatch(primitives, scene, i, true);

            this._closedColorBatches[i] = new StaticGeometryColorBatch(primitives, PerInstanceColorAppearance, undefined, true, i, true);
            this._closedColorBatches[numberOfShadowModes + i] = new StaticGeometryColorBatch(primitives, PerInstanceColorAppearance, undefined, true, i, false);

            this._closedMaterialBatches[i] = new StaticGeometryPerMaterialBatch(primitives, MaterialAppearance, undefined, true, i, true);
            this._closedMaterialBatches[numberOfShadowModes + i] = new StaticGeometryPerMaterialBatch(primitives, MaterialAppearance, undefined, true, i, false);

            this._openColorBatches[i] = new StaticGeometryColorBatch(primitives, PerInstanceColorAppearance, undefined, false, i, true);
            this._openColorBatches[numberOfShadowModes + i] = new StaticGeometryColorBatch(primitives, PerInstanceColorAppearance, undefined, false, i, false);

            this._openMaterialBatches[i] = new StaticGeometryPerMaterialBatch(primitives, MaterialAppearance, undefined, false, i, true);
            this._openMaterialBatches[numberOfShadowModes + i] = new StaticGeometryPerMaterialBatch(primitives, MaterialAppearance, undefined, false, i, false);
        }

        var numberOfClassificationTypes = ClassificationType.NUMBER_OF_CLASSIFICATION_TYPES;
        var groundColorBatches = new Array(numberOfClassificationTypes);
        var groundMaterialBatches = [];
        if (supportsMaterialsforEntitiesOnTerrain) {
            for (i = 0; i < numberOfClassificationTypes; ++i) {
                groundMaterialBatches.push(new StaticGroundGeometryPerMaterialBatch(groundPrimitives, i, MaterialAppearance));
                groundColorBatches[i] = new StaticGroundGeometryPerMaterialBatch(groundPrimitives, i, PerInstanceColorAppearance);
            }
        } else {
            for (i = 0; i < numberOfClassificationTypes; ++i) {
                groundColorBatches[i] = new StaticGroundGeometryColorBatch(groundPrimitives, i);
            }
        }

        this._groundColorBatches = groundColorBatches;
        this._groundMaterialBatches = groundMaterialBatches;

        this._dynamicBatch = new DynamicGeometryBatch(primitives, groundPrimitives);

        this._batches = this._outlineBatches.concat(this._closedColorBatches, this._closedMaterialBatches, this._openColorBatches, this._openMaterialBatches, this._groundColorBatches, this._groundMaterialBatches, this._dynamicBatch);

        this._subscriptions = new AssociativeArray();
        this._updaterSets = new AssociativeArray();

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
        Check.defined('time', time);
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
        var updaterSet;
        var that = this;

        for (i = changed.length - 1; i > -1; i--) {
            entity = changed[i];
            id = entity.id;
            updaterSet = this._updaterSets.get(id);

            //If in a single update, an entity gets removed and a new instance
            //re-added with the same id, the updater no longer tracks the
            //correct entity, we need to both remove the old one and
            //add the new one, which is done by pushing the entity
            //onto the removed/added lists.
            if (updaterSet.entity === entity) {
                updaterSet.forEach(function(updater) {
                    that._removeUpdater(updater);
                    that._insertUpdaterIntoBatch(time, updater);
                });
            } else {
                removed.push(entity);
                added.push(entity);
            }
        }

        for (i = removed.length - 1; i > -1; i--) {
            entity = removed[i];
            id = entity.id;
            updaterSet = this._updaterSets.get(id);
            updaterSet.forEach(this._removeUpdater.bind(this));
            updaterSet.destroy();
            this._updaterSets.remove(id);
            this._subscriptions.get(id)();
            this._subscriptions.remove(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            entity = added[i];
            id = entity.id;
            updaterSet = new GeometryUpdaterSet(entity, this._scene);
            this._updaterSets.set(id, updaterSet);
            updaterSet.forEach(function(updater) {
                that._insertUpdaterIntoBatch(time, updater);
            });
            this._subscriptions.set(id, updaterSet.geometryChanged.addEventListener(GeometryVisualizer._onGeometryChanged, this));
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
        Check.defined('entity', entity);
        Check.defined('result', result);
        //>>includeEnd('debug');

        var boundingSpheres = getBoundingSphereArrayScratch;
        var tmp = getBoundingSphereBoundingSphereScratch;

        var count = 0;
        var state = BoundingSphereState.DONE;
        var batches = this._batches;
        var batchesLength = batches.length;

        var id = entity.id;
        var updaters = this._updaterSets.get(id).updaters;

        for (var j = 0; j < updaters.length; j++) {
            var updater = updaters[j];
            for (var i = 0; i < batchesLength; i++) {
                state = batches[i].getBoundingSphere(updater, tmp);
                if (state === BoundingSphereState.PENDING) {
                    return BoundingSphereState.PENDING;
                } else if (state === BoundingSphereState.DONE) {
                    boundingSpheres[count] = BoundingSphere.clone(tmp, boundingSpheres[count]);
                    count++;
                }
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

        var updaterSets = this._updaterSets.values;
        length = updaterSets.length;
        for (i = 0; i < length; i++) {
            updaterSets[i].destroy();
        }
        this._updaterSets.removeAll();
        return destroyObject(this);
    };

    /**
     * @private
     */
    GeometryVisualizer.prototype._removeUpdater = function(updater) {
        //We don't keep track of which batch an updater is in, so just remove it from all of them.
        var batches = this._batches;
        var length = batches.length;
        for (var i = 0; i < length; i++) {
            batches[i].remove(updater);
        }
    };

    /**
     * @private
     */
    GeometryVisualizer.prototype._insertUpdaterIntoBatch = function(time, updater) {
        if (updater.isDynamic) {
            this._dynamicBatch.add(time, updater);
            return;
        }

        var shadows;
        if (updater.outlineEnabled || updater.fillEnabled) {
            shadows = updater.shadowsProperty.getValue(time);
        }

        var numberOfShadowModes = ShadowMode.NUMBER_OF_SHADOW_MODES;
        if (updater.outlineEnabled) {
            if (defined(updater.terrainOffsetProperty)) {
                this._outlineBatches[numberOfShadowModes + shadows].add(time, updater);
            } else {
                this._outlineBatches[shadows].add(time, updater);
            }
        }

        if (updater.fillEnabled) {
            if (updater.onTerrain) {
                var classificationType = updater.classificationTypeProperty.getValue(time);
                if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                    this._groundColorBatches[classificationType].add(time, updater);
                } else {
                    // If unsupported, updater will not be on terrain.
                    this._groundMaterialBatches[classificationType].add(time, updater);
                }
            } else if (updater.isClosed) {
                if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                    if (defined(updater.terrainOffsetProperty)) {
                        this._closedColorBatches[numberOfShadowModes + shadows].add(time, updater);
                    } else {
                        this._closedColorBatches[shadows].add(time, updater);
                    }
                } else if (defined(updater.terrainOffsetProperty)) {
                    this._closedMaterialBatches[numberOfShadowModes + shadows].add(time, updater);
                } else {
                    this._closedMaterialBatches[shadows].add(time, updater);
                }
            } else if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
                if (defined(updater.terrainOffsetProperty)) {
                    this._openColorBatches[numberOfShadowModes + shadows].add(time, updater);
                } else {
                    this._openColorBatches[shadows].add(time, updater);
                }
            } else if (defined(updater.terrainOffsetProperty)) {
                this._openMaterialBatches[numberOfShadowModes + shadows].add(time, updater);
            } else {
                this._openMaterialBatches[shadows].add(time, updater);
            }
        }
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
export default GeometryVisualizer;
