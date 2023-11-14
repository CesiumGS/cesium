import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import ClassificationType from "../Scene/ClassificationType.js";
import PolylineColorAppearance from "../Scene/PolylineColorAppearance.js";
import PolylineMaterialAppearance from "../Scene/PolylineMaterialAppearance.js";
import ShadowMode from "../Scene/ShadowMode.js";
import BoundingSphereState from "./BoundingSphereState.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryBatch from "./DynamicGeometryBatch.js";
import PolylineGeometryUpdater from "./PolylineGeometryUpdater.js";
import StaticGeometryColorBatch from "./StaticGeometryColorBatch.js";
import StaticGeometryPerMaterialBatch from "./StaticGeometryPerMaterialBatch.js";
import StaticGroundPolylinePerMaterialBatch from "./StaticGroundPolylinePerMaterialBatch.js";

const emptyArray = [];

function removeUpdater(that, updater) {
  //We don't keep track of which batch an updater is in, so just remove it from all of them.
  const batches = that._batches;
  const length = batches.length;
  for (let i = 0; i < length; i++) {
    batches[i].remove(updater);
  }
}

function insertUpdaterIntoBatch(that, time, updater) {
  if (updater.isDynamic) {
    that._dynamicBatch.add(time, updater);
    return;
  }

  if (updater.clampToGround && updater.fillEnabled) {
    // Also checks for support
    const classificationType = updater.classificationTypeProperty.getValue(
      time
    );
    that._groundBatches[classificationType].add(time, updater);
    return;
  }

  let shadows;
  if (updater.fillEnabled) {
    shadows = updater.shadowsProperty.getValue(time);
  }

  let multiplier = 0;
  if (defined(updater.depthFailMaterialProperty)) {
    multiplier =
      updater.depthFailMaterialProperty instanceof ColorMaterialProperty
        ? 1
        : 2;
  }

  let index;
  if (defined(shadows)) {
    index = shadows + multiplier * ShadowMode.NUMBER_OF_SHADOW_MODES;
  }

  if (updater.fillEnabled) {
    if (updater.fillMaterialProperty instanceof ColorMaterialProperty) {
      that._colorBatches[index].add(time, updater);
    } else {
      that._materialBatches[index].add(time, updater);
    }
  }
}

/**
 * A visualizer for polylines represented by {@link Primitive} instances.
 * @alias PolylineVisualizer
 * @constructor
 *
 * @param {Scene} scene The scene the primitives will be rendered in.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 * @param {PrimitiveCollection} [primitives=scene.primitives] A collection to add primitives related to the entities
 * @param {PrimitiveCollection} [groundPrimitives=scene.groundPrimitives] A collection to add ground primitives related to the entities
 */
function PolylineVisualizer(
  scene,
  entityCollection,
  primitives,
  groundPrimitives
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("scene", scene);
  Check.defined("entityCollection", entityCollection);
  //>>includeEnd('debug');

  groundPrimitives = defaultValue(groundPrimitives, scene.groundPrimitives);
  primitives = defaultValue(primitives, scene.primitives);

  this._scene = scene;
  this._primitives = primitives;
  this._entityCollection = undefined;
  this._addedObjects = new AssociativeArray();
  this._removedObjects = new AssociativeArray();
  this._changedObjects = new AssociativeArray();

  let i;
  const numberOfShadowModes = ShadowMode.NUMBER_OF_SHADOW_MODES;
  this._colorBatches = new Array(numberOfShadowModes * 3);
  this._materialBatches = new Array(numberOfShadowModes * 3);

  for (i = 0; i < numberOfShadowModes; ++i) {
    this._colorBatches[i] = new StaticGeometryColorBatch(
      primitives,
      PolylineColorAppearance,
      undefined,
      false,
      i
    ); // no depth fail appearance
    this._materialBatches[i] = new StaticGeometryPerMaterialBatch(
      primitives,
      PolylineMaterialAppearance,
      undefined,
      false,
      i
    );

    this._colorBatches[i + numberOfShadowModes] = new StaticGeometryColorBatch(
      primitives,
      PolylineColorAppearance,
      PolylineColorAppearance,
      false,
      i
    ); //depth fail appearance variations
    this._materialBatches[
      i + numberOfShadowModes
    ] = new StaticGeometryPerMaterialBatch(
      primitives,
      PolylineMaterialAppearance,
      PolylineColorAppearance,
      false,
      i
    );

    this._colorBatches[
      i + numberOfShadowModes * 2
    ] = new StaticGeometryColorBatch(
      primitives,
      PolylineColorAppearance,
      PolylineMaterialAppearance,
      false,
      i
    );
    this._materialBatches[
      i + numberOfShadowModes * 2
    ] = new StaticGeometryPerMaterialBatch(
      primitives,
      PolylineMaterialAppearance,
      PolylineMaterialAppearance,
      false,
      i
    );
  }

  this._dynamicBatch = new DynamicGeometryBatch(primitives, groundPrimitives);

  const numberOfClassificationTypes =
    ClassificationType.NUMBER_OF_CLASSIFICATION_TYPES;
  this._groundBatches = new Array(numberOfClassificationTypes);

  for (i = 0; i < numberOfClassificationTypes; ++i) {
    this._groundBatches[i] = new StaticGroundPolylinePerMaterialBatch(
      groundPrimitives,
      i
    );
  }

  this._batches = this._colorBatches.concat(
    this._materialBatches,
    this._dynamicBatch,
    this._groundBatches
  );

  this._subscriptions = new AssociativeArray();
  this._updaters = new AssociativeArray();

  this._entityCollection = entityCollection;
  entityCollection.collectionChanged.addEventListener(
    PolylineVisualizer.prototype._onCollectionChanged,
    this
  );
  this._onCollectionChanged(
    entityCollection,
    entityCollection.values,
    emptyArray
  );
}

/**
 * Updates all of the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {Boolean} True if the visualizer successfully updated to the provided time,
 * false if the visualizer is waiting for asynchronous primitives to be created.
 */
PolylineVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const addedObjects = this._addedObjects;
  const added = addedObjects.values;
  const removedObjects = this._removedObjects;
  const removed = removedObjects.values;
  const changedObjects = this._changedObjects;
  const changed = changedObjects.values;

  let i;
  let entity;
  let id;
  let updater;

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
    updater = new PolylineGeometryUpdater(entity, this._scene);
    this._updaters.set(id, updater);
    insertUpdaterIntoBatch(this, time, updater);
    this._subscriptions.set(
      id,
      updater.geometryChanged.addEventListener(
        PolylineVisualizer._onGeometryChanged,
        this
      )
    );
  }

  addedObjects.removeAll();
  removedObjects.removeAll();
  changedObjects.removeAll();

  let isUpdated = true;
  const batches = this._batches;
  const length = batches.length;
  for (i = 0; i < length; i++) {
    isUpdated = batches[i].update(time) && isUpdated;
  }

  return isUpdated;
};

const getBoundingSphereArrayScratch = [];
const getBoundingSphereBoundingSphereScratch = new BoundingSphere();

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
PolylineVisualizer.prototype.getBoundingSphere = function (entity, result) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("entity", entity);
  Check.defined("result", result);
  //>>includeEnd('debug');

  const boundingSpheres = getBoundingSphereArrayScratch;
  const tmp = getBoundingSphereBoundingSphereScratch;

  let count = 0;
  let state = BoundingSphereState.DONE;
  const batches = this._batches;
  const batchesLength = batches.length;
  const updater = this._updaters.get(entity.id);
  for (let i = 0; i < batchesLength; i++) {
    state = batches[i].getBoundingSphere(updater, tmp);
    if (state === BoundingSphereState.PENDING) {
      return BoundingSphereState.PENDING;
    } else if (state === BoundingSphereState.DONE) {
      boundingSpheres[count] = BoundingSphere.clone(
        tmp,
        boundingSpheres[count]
      );
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
PolylineVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
PolylineVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    PolylineVisualizer.prototype._onCollectionChanged,
    this
  );
  this._addedObjects.removeAll();
  this._removedObjects.removeAll();

  let i;
  const batches = this._batches;
  let length = batches.length;
  for (i = 0; i < length; i++) {
    batches[i].removeAllPrimitives();
  }

  const subscriptions = this._subscriptions.values;
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
PolylineVisualizer._onGeometryChanged = function (updater) {
  const removedObjects = this._removedObjects;
  const changedObjects = this._changedObjects;

  const entity = updater.entity;
  const id = entity.id;

  if (!defined(removedObjects.get(id)) && !defined(changedObjects.get(id))) {
    changedObjects.set(id, entity);
  }
};

/**
 * @private
 */
PolylineVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed
) {
  const addedObjects = this._addedObjects;
  const removedObjects = this._removedObjects;
  const changedObjects = this._changedObjects;

  let i;
  let id;
  let entity;
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
export default PolylineVisualizer;
