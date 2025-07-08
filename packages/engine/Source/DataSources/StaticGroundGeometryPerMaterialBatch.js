import AssociativeArray from "../Core/AssociativeArray.js";
import defined from "../Core/defined.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import RectangleCollisionChecker from "../Core/RectangleCollisionChecker.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import GroundPrimitive from "../Scene/GroundPrimitive.js";
import ShadowVolumeAppearance from "../Scene/ShadowVolumeAppearance.js";
import BoundingSphereState from "./BoundingSphereState.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import MaterialProperty from "./MaterialProperty.js";
import Property from "./Property.js";

const distanceDisplayConditionScratch = new DistanceDisplayCondition();
const defaultDistanceDisplayCondition = new DistanceDisplayCondition();

// Encapsulates a Primitive and all the entities that it represents.
function Batch(
  primitives,
  classificationType,
  appearanceType,
  materialProperty,
  usingSphericalTextureCoordinates,
  zIndex,
) {
  this.primitives = primitives; // scene level primitive collection (each Batch manages its own Primitive from this collection)
  this.classificationType = classificationType;
  this.appearanceType = appearanceType;
  this.materialProperty = materialProperty;
  this.updaters = new AssociativeArray(); // GeometryUpdaters that manage the visual representation of the primitive.
  this.createPrimitive = true;
  this.primitive = undefined; // a GroundPrimitive encapsulating all the entities
  this.oldPrimitive = undefined; // a GroundPrimitive that is being replaced by the current primitive, but will still be shown until the current primitive is ready.
  this.geometry = new AssociativeArray();
  this.material = undefined;
  this.updatersWithAttributes = new AssociativeArray();
  this.attributes = new AssociativeArray();
  this.subscriptions = new AssociativeArray();
  this.showsUpdated = new AssociativeArray();
  this.usingSphericalTextureCoordinates = usingSphericalTextureCoordinates;
  this.zIndex = zIndex;
  this.rectangleCollisionCheck = new RectangleCollisionChecker();
}

Batch.prototype.overlapping = function (rectangle) {
  return this.rectangleCollisionCheck.collides(rectangle);
};

// Check if the given updater's material is compatible with this batch
Batch.prototype.isMaterial = function (updater) {
  const material = this.materialProperty;
  const updaterMaterial = updater.fillMaterialProperty;

  if (
    updaterMaterial === material ||
    (updaterMaterial instanceof ColorMaterialProperty &&
      material instanceof ColorMaterialProperty)
  ) {
    return true;
  }
  return defined(material) && material.equals(updaterMaterial);
};

/**
 * Adds an updater to the Batch, and signals for a new Primitive to be created on the next update.
 * @param {JulianDate} time
 * @param {GeometryUpdater} updater
 * @param {GeometryInstance} geometryInstance
 * @private
 */
Batch.prototype.add = function (time, updater, geometryInstance) {
  const id = updater.id;
  this.updaters.set(id, updater);
  this.geometry.set(id, geometryInstance);
  this.rectangleCollisionCheck.insert(id, geometryInstance.geometry.rectangle);
  // Updaters with dynamic attributes must be tracked separately, may exit the batch
  if (
    !updater.hasConstantFill ||
    !updater.fillMaterialProperty.isConstant ||
    !Property.isConstant(updater.distanceDisplayConditionProperty)
  ) {
    this.updatersWithAttributes.set(id, updater);
  } else {
    const that = this;
    // Listen for show changes. These will be synchronized in updateShows.
    this.subscriptions.set(
      id,
      updater.entity.definitionChanged.addEventListener(
        function (entity, propertyName, newValue, oldValue) {
          if (propertyName === "isShowing") {
            that.showsUpdated.set(updater.id, updater);
          }
        },
      ),
    );
  }
  this.createPrimitive = true;
};

/**
 * Remove an updater from the Batch, and potentially signals for a new Primitive to be created
 * on the next update.
 * @param {GeometryUpdater} updater
 * @returns true if the updater was removed, false if it was not found.
 * @private
 */
Batch.prototype.remove = function (updater) {
  const id = updater.id;
  const geometryInstance = this.geometry.get(id);
  this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
  if (this.updaters.remove(id)) {
    this.rectangleCollisionCheck.remove(
      id,
      geometryInstance.geometry.rectangle,
    );
    this.updatersWithAttributes.remove(id);
    const unsubscribe = this.subscriptions.get(id);
    if (defined(unsubscribe)) {
      unsubscribe();
      this.subscriptions.remove(id);
    }
    return true;
  }
  return false;
};

/**
 * Update a Batch, creating a new primitive, if necessary, or swapping out an old primitive for a new one that's ready.
 * A new primitive is created whenever an updater is added to or removed from a Batch.
 * @param {JulianDate} time
 * @returns a boolean indicating whether the Batch was updated.
 * @private
 */
Batch.prototype.update = function (time) {
  let isUpdated = true;
  let primitive = this.primitive;
  const primitives = this.primitives;
  const geometries = this.geometry.values;
  let i;

  if (this.createPrimitive) {
    const geometriesLength = geometries.length;
    if (geometriesLength > 0) {
      if (defined(primitive)) {
        // Keep a handle to the old primitive so it can be removed when the updated version is ready.
        if (!defined(this.oldPrimitive)) {
          this.oldPrimitive = primitive;
        } else {
          // For if the new primitive changes again before it is ready.
          primitives.remove(primitive);
        }
      }

      this.material = MaterialProperty.getValue(
        time,
        this.materialProperty,
        this.material,
      );

      primitive = new GroundPrimitive({
        show: false,
        asynchronous: true,
        geometryInstances: geometries.slice(),
        appearance: new this.appearanceType({
          material: this.material,
          // translucent and closed properties overridden
        }),
        classificationType: this.classificationType,
      });

      primitives.add(primitive, this.zIndex);
      isUpdated = false;
    } else {
      if (defined(primitive)) {
        primitives.remove(primitive);
        primitive = undefined;
      }
      const oldPrimitive = this.oldPrimitive;
      if (defined(oldPrimitive)) {
        primitives.remove(oldPrimitive);
        this.oldPrimitive = undefined;
      }
    }

    this.attributes.removeAll();
    this.primitive = primitive;
    this.createPrimitive = false;
  } else if (defined(primitive) && primitive.ready) {
    primitive.show = true;
    if (defined(this.oldPrimitive)) {
      primitives.remove(this.oldPrimitive);
      this.oldPrimitive = undefined;
    }

    this.material = MaterialProperty.getValue(
      time,
      this.materialProperty,
      this.material,
    );
    this.primitive.appearance.material = this.material;

    const updatersWithAttributes = this.updatersWithAttributes.values;
    const length = updatersWithAttributes.length;
    for (i = 0; i < length; i++) {
      const updater = updatersWithAttributes[i];
      const entity = updater.entity;
      const instance = this.geometry.get(updater.id);

      let attributes = this.attributes.get(instance.id.id);
      if (!defined(attributes)) {
        attributes = primitive.getGeometryInstanceAttributes(instance.id);
        this.attributes.set(instance.id.id, attributes);
      }

      const show =
        entity.isShowing && (updater.hasConstantFill || updater.isFilled(time));
      const currentShow = attributes.show[0] === 1;
      if (show !== currentShow) {
        attributes.show = ShowGeometryInstanceAttribute.toValue(
          show,
          attributes.show,
        );
      }

      const distanceDisplayConditionProperty =
        updater.distanceDisplayConditionProperty;
      if (!Property.isConstant(distanceDisplayConditionProperty)) {
        const distanceDisplayCondition = Property.getValueOrDefault(
          distanceDisplayConditionProperty,
          time,
          defaultDistanceDisplayCondition,
          distanceDisplayConditionScratch,
        );
        if (
          !DistanceDisplayCondition.equals(
            distanceDisplayCondition,
            attributes._lastDistanceDisplayCondition,
          )
        ) {
          attributes._lastDistanceDisplayCondition =
            DistanceDisplayCondition.clone(
              distanceDisplayCondition,
              attributes._lastDistanceDisplayCondition,
            );
          attributes.distanceDisplayCondition =
            DistanceDisplayConditionGeometryInstanceAttribute.toValue(
              distanceDisplayCondition,
              attributes.distanceDisplayCondition,
            );
        }
      }
    }

    this.updateShows(primitive);
  } else if (defined(primitive) && !primitive.ready) {
    isUpdated = false;
  }
  return isUpdated;
};

Batch.prototype.updateShows = function (primitive) {
  const showsUpdated = this.showsUpdated.values;
  const length = showsUpdated.length;
  for (let i = 0; i < length; i++) {
    const updater = showsUpdated[i];
    const entity = updater.entity;
    const instance = this.geometry.get(updater.id);

    let attributes = this.attributes.get(instance.id.id);
    if (!defined(attributes)) {
      attributes = primitive.getGeometryInstanceAttributes(instance.id);
      this.attributes.set(instance.id.id, attributes);
    }

    const show = entity.isShowing;
    const currentShow = attributes.show[0] === 1;
    if (show !== currentShow) {
      attributes.show = ShowGeometryInstanceAttribute.toValue(
        show,
        attributes.show,
      );
      instance.attributes.show.value[0] = attributes.show[0];
    }
  }
  this.showsUpdated.removeAll();
};

Batch.prototype.contains = function (updater) {
  return this.updaters.contains(updater.id);
};

Batch.prototype.getBoundingSphere = function (updater, result) {
  const primitive = this.primitive;
  if (!primitive.ready) {
    return BoundingSphereState.PENDING;
  }
  const attributes = primitive.getGeometryInstanceAttributes(updater.entity);
  if (
    !defined(attributes) ||
    !defined(attributes.boundingSphere) ||
    (defined(attributes.show) && attributes.show[0] === 0)
  ) {
    return BoundingSphereState.FAILED;
  }
  attributes.boundingSphere.clone(result);
  return BoundingSphereState.DONE;
};

/**
 * Removes a Batch's primitive (and oldPrimitive, if it exists).
 * @private
 */
Batch.prototype.destroy = function () {
  const primitive = this.primitive;
  const primitives = this.primitives;
  if (defined(primitive)) {
    primitives.remove(primitive);
  }
  const oldPrimitive = this.oldPrimitive;
  if (defined(oldPrimitive)) {
    primitives.remove(oldPrimitive);
  }
};

/**
 * A container of Batch objects of ground geometry primitives, where a Batch is grouped by material,
 * texture coordinate type, and spatial overlap.
 * @private
 */
function StaticGroundGeometryPerMaterialBatch(
  primitives,
  classificationType,
  appearanceType,
) {
  this._items = []; // array of Batch objects, each containing representing a primitive and a set of updaters that manage the visual representation of the primitive.
  this._primitives = primitives; // scene level primitive collection
  this._classificationType = classificationType;
  this._appearanceType = appearanceType;
}

/**
 * Adds an geometry updater to a Batch. Tries to find a preexisting compatible Batch, or else creates a new Batch.
 * Used by Visualizer classes to add and update (remove->add) a primitive's Updater set.
 *
 * @param {JulianDate} time
 * @param {GeometryUpdater} updater A GeometryUpdater that manages the visual representation of a primitive.
 * @private
 */
StaticGroundGeometryPerMaterialBatch.prototype.add = function (time, updater) {
  const items = this._items;
  const length = items.length;
  const geometryInstance = updater.createFillGeometryInstance(time);
  const usingSphericalTextureCoordinates =
    ShadowVolumeAppearance.shouldUseSphericalCoordinates(
      geometryInstance.geometry.rectangle,
    );
  const zIndex = Property.getValueOrDefault(updater.zIndex, 0);
  // Check if the Entity represented by the updater can be placed in an existing batch. Requirements:
  // * compatible material (same material or same color)
  // * same type of texture coordinates (spherical vs. planar)
  // * conservatively non-overlapping with any entities in the existing batch
  for (let i = 0; i < length; ++i) {
    const item = items[i];
    if (
      item.isMaterial(updater) &&
      item.usingSphericalTextureCoordinates ===
        usingSphericalTextureCoordinates &&
      item.zIndex === zIndex &&
      !item.overlapping(geometryInstance.geometry.rectangle)
    ) {
      item.add(time, updater, geometryInstance);
      return;
    }
  }
  // If a compatible batch wasn't found, create a new batch.
  const batch = new Batch(
    this._primitives,
    this._classificationType,
    this._appearanceType,
    updater.fillMaterialProperty,
    usingSphericalTextureCoordinates,
    zIndex,
  );
  batch.add(time, updater, geometryInstance);
  items.push(batch);
};

/**
 * Removes an updater from a Batch. Defers potential deletion until the next update.
 * @param {GeometryUpdater} updater A GeometryUpdater that manages the visual representation of a primitive.
 * @private
 */
StaticGroundGeometryPerMaterialBatch.prototype.remove = function (updater) {
  const items = this._items;
  const length = items.length;
  for (let i = length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.remove(updater)) {
      // If the item is now empty, delete it (deferred until the next update,
      // in case a new updater is added to the same item first).
      break;
    }
  }
};

/**
 * Updates all the items (Batches) in the collection, and deletes any that are empty.
 * @param {JulianDate} time
 * @returns a boolean indicating whether any of the items (Batches) were updated.
 * @private
 */
StaticGroundGeometryPerMaterialBatch.prototype.update = function (time) {
  let i;
  const items = this._items;
  const length = items.length;

  for (i = length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.updaters.length === 0) {
      items.splice(i, 1);
      item.destroy();
    }
  }

  let isUpdated = true;
  for (i = 0; i < items.length; i++) {
    isUpdated = items[i].update(time) && isUpdated;
  }
  return isUpdated;
};

StaticGroundGeometryPerMaterialBatch.prototype.getBoundingSphere = function (
  updater,
  result,
) {
  const items = this._items;
  const length = items.length;
  for (let i = 0; i < length; i++) {
    const item = items[i];
    if (item.contains(updater)) {
      return item.getBoundingSphere(updater, result);
    }
  }
  return BoundingSphereState.FAILED;
};

StaticGroundGeometryPerMaterialBatch.prototype.removeAllPrimitives =
  function () {
    const items = this._items;
    const length = items.length;
    for (let i = 0; i < length; i++) {
      items[i].destroy();
    }
    this._items.length = 0;
  };
export default StaticGroundGeometryPerMaterialBatch;
