import AssociativeArray from "../Core/AssociativeArray.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import Primitive from "../Scene/Primitive.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";

const colorScratch = new Color();
const distanceDisplayConditionScratch = new DistanceDisplayCondition();
const defaultDistanceDisplayCondition = new DistanceDisplayCondition();
const defaultOffset = Cartesian3.ZERO;
const offsetScratch = new Cartesian3();

function Batch(primitives, translucent, width, shadows) {
  this.translucent = translucent;
  this.width = width;
  this.shadows = shadows;
  this.primitives = primitives;
  this.createPrimitive = false;
  this.waitingOnCreate = false;
  this.primitive = undefined;
  this.oldPrimitive = undefined;
  this.geometry = new AssociativeArray();
  this.updaters = new AssociativeArray();
  this.updatersWithAttributes = new AssociativeArray();
  this.attributes = new AssociativeArray();
  this.itemsToRemove = [];
  this.subscriptions = new AssociativeArray();
  this.showsUpdated = new AssociativeArray();
}
Batch.prototype.add = function (updater, instance) {
  const id = updater.id;
  this.createPrimitive = true;
  this.geometry.set(id, instance);
  this.updaters.set(id, updater);
  if (
    !updater.hasConstantOutline ||
    !updater.outlineColorProperty.isConstant ||
    !Property.isConstant(updater.distanceDisplayConditionProperty) ||
    !Property.isConstant(updater.terrainOffsetProperty)
  ) {
    this.updatersWithAttributes.set(id, updater);
  } else {
    const that = this;
    this.subscriptions.set(
      id,
      updater.entity.definitionChanged.addEventListener(function (
        entity,
        propertyName,
        newValue,
        oldValue
      ) {
        if (propertyName === "isShowing") {
          that.showsUpdated.set(updater.id, updater);
        }
      })
    );
  }
};

Batch.prototype.remove = function (updater) {
  const id = updater.id;
  this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
  if (this.updaters.remove(id)) {
    this.updatersWithAttributes.remove(id);
    const unsubscribe = this.subscriptions.get(id);
    if (defined(unsubscribe)) {
      unsubscribe();
      this.subscriptions.remove(id);
      this.showsUpdated.remove(id);
    }
    return true;
  }
  return false;
};

Batch.prototype.update = function (time) {
  let isUpdated = true;
  let removedCount = 0;
  let primitive = this.primitive;
  const primitives = this.primitives;
  let i;

  if (this.createPrimitive) {
    const geometries = this.geometry.values;
    const geometriesLength = geometries.length;
    if (geometriesLength > 0) {
      if (defined(primitive)) {
        if (!defined(this.oldPrimitive)) {
          this.oldPrimitive = primitive;
        } else {
          primitives.remove(primitive);
        }
      }

      primitive = new Primitive({
        show: false,
        asynchronous: true,
        geometryInstances: geometries.slice(),
        appearance: new PerInstanceColorAppearance({
          flat: true,
          translucent: this.translucent,
          renderState: {
            lineWidth: this.width,
          },
        }),
        shadows: this.shadows,
      });

      primitives.add(primitive);
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
    this.waitingOnCreate = true;
  } else if (defined(primitive) && primitive.ready) {
    primitive.show = true;
    if (defined(this.oldPrimitive)) {
      primitives.remove(this.oldPrimitive);
      this.oldPrimitive = undefined;
    }

    const updatersWithAttributes = this.updatersWithAttributes.values;
    const length = updatersWithAttributes.length;
    const waitingOnCreate = this.waitingOnCreate;
    for (i = 0; i < length; i++) {
      const updater = updatersWithAttributes[i];
      const instance = this.geometry.get(updater.id);

      let attributes = this.attributes.get(instance.id.id);
      if (!defined(attributes)) {
        attributes = primitive.getGeometryInstanceAttributes(instance.id);
        this.attributes.set(instance.id.id, attributes);
      }

      if (!updater.outlineColorProperty.isConstant || waitingOnCreate) {
        const outlineColorProperty = updater.outlineColorProperty;
        const outlineColor = Property.getValueOrDefault(
          outlineColorProperty,
          time,
          Color.WHITE,
          colorScratch
        );
        if (!Color.equals(attributes._lastColor, outlineColor)) {
          attributes._lastColor = Color.clone(
            outlineColor,
            attributes._lastColor
          );
          attributes.color = ColorGeometryInstanceAttribute.toValue(
            outlineColor,
            attributes.color
          );
          if (
            (this.translucent && attributes.color[3] === 255) ||
            (!this.translucent && attributes.color[3] !== 255)
          ) {
            this.itemsToRemove[removedCount++] = updater;
          }
        }
      }

      const show =
        updater.entity.isShowing &&
        (updater.hasConstantOutline || updater.isOutlineVisible(time));
      const currentShow = attributes.show[0] === 1;
      if (show !== currentShow) {
        attributes.show = ShowGeometryInstanceAttribute.toValue(
          show,
          attributes.show
        );
      }

      const distanceDisplayConditionProperty =
        updater.distanceDisplayConditionProperty;
      if (!Property.isConstant(distanceDisplayConditionProperty)) {
        const distanceDisplayCondition = Property.getValueOrDefault(
          distanceDisplayConditionProperty,
          time,
          defaultDistanceDisplayCondition,
          distanceDisplayConditionScratch
        );
        if (
          !DistanceDisplayCondition.equals(
            distanceDisplayCondition,
            attributes._lastDistanceDisplayCondition
          )
        ) {
          attributes._lastDistanceDisplayCondition = DistanceDisplayCondition.clone(
            distanceDisplayCondition,
            attributes._lastDistanceDisplayCondition
          );
          attributes.distanceDisplayCondition = DistanceDisplayConditionGeometryInstanceAttribute.toValue(
            distanceDisplayCondition,
            attributes.distanceDisplayCondition
          );
        }
      }

      const offsetProperty = updater.terrainOffsetProperty;
      if (!Property.isConstant(offsetProperty)) {
        const offset = Property.getValueOrDefault(
          offsetProperty,
          time,
          defaultOffset,
          offsetScratch
        );
        if (!Cartesian3.equals(offset, attributes._lastOffset)) {
          attributes._lastOffset = Cartesian3.clone(
            offset,
            attributes._lastOffset
          );
          attributes.offset = OffsetGeometryInstanceAttribute.toValue(
            offset,
            attributes.offset
          );
        }
      }
    }

    this.updateShows(primitive);
    this.waitingOnCreate = false;
  } else if (defined(primitive) && !primitive.ready) {
    isUpdated = false;
  }

  this.itemsToRemove.length = removedCount;
  return isUpdated;
};

Batch.prototype.updateShows = function (primitive) {
  const showsUpdated = this.showsUpdated.values;
  const length = showsUpdated.length;
  for (let i = 0; i < length; i++) {
    const updater = showsUpdated[i];
    const instance = this.geometry.get(updater.id);

    let attributes = this.attributes.get(instance.id.id);
    if (!defined(attributes)) {
      attributes = primitive.getGeometryInstanceAttributes(instance.id);
      this.attributes.set(instance.id.id, attributes);
    }

    const show = updater.entity.isShowing;
    const currentShow = attributes.show[0] === 1;
    if (show !== currentShow) {
      attributes.show = ShowGeometryInstanceAttribute.toValue(
        show,
        attributes.show
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
    !defined(attributes.boundingSphere) || //
    (defined(attributes.show) && attributes.show[0] === 0)
  ) {
    return BoundingSphereState.FAILED;
  }
  attributes.boundingSphere.clone(result);
  return BoundingSphereState.DONE;
};

Batch.prototype.removeAllPrimitives = function () {
  const primitives = this.primitives;

  const primitive = this.primitive;
  if (defined(primitive)) {
    primitives.remove(primitive);
    this.primitive = undefined;
    this.geometry.removeAll();
    this.updaters.removeAll();
  }

  const oldPrimitive = this.oldPrimitive;
  if (defined(oldPrimitive)) {
    primitives.remove(oldPrimitive);
    this.oldPrimitive = undefined;
  }
};

/**
 * @private
 */
function StaticOutlineGeometryBatch(primitives, scene, shadows) {
  this._primitives = primitives;
  this._scene = scene;
  this._shadows = shadows;
  this._solidBatches = new AssociativeArray();
  this._translucentBatches = new AssociativeArray();
}
StaticOutlineGeometryBatch.prototype.add = function (time, updater) {
  const instance = updater.createOutlineGeometryInstance(time);
  const width = this._scene.clampLineWidth(updater.outlineWidth);
  let batches;
  let batch;
  if (instance.attributes.color.value[3] === 255) {
    batches = this._solidBatches;
    batch = batches.get(width);
    if (!defined(batch)) {
      batch = new Batch(this._primitives, false, width, this._shadows);
      batches.set(width, batch);
    }
    batch.add(updater, instance);
  } else {
    batches = this._translucentBatches;
    batch = batches.get(width);
    if (!defined(batch)) {
      batch = new Batch(this._primitives, true, width, this._shadows);
      batches.set(width, batch);
    }
    batch.add(updater, instance);
  }
};

StaticOutlineGeometryBatch.prototype.remove = function (updater) {
  let i;

  const solidBatches = this._solidBatches.values;
  const solidBatchesLength = solidBatches.length;
  for (i = 0; i < solidBatchesLength; i++) {
    if (solidBatches[i].remove(updater)) {
      return;
    }
  }

  const translucentBatches = this._translucentBatches.values;
  const translucentBatchesLength = translucentBatches.length;
  for (i = 0; i < translucentBatchesLength; i++) {
    if (translucentBatches[i].remove(updater)) {
      return;
    }
  }
};

StaticOutlineGeometryBatch.prototype.update = function (time) {
  let i;
  let x;
  let updater;
  let batch;
  const solidBatches = this._solidBatches.values;
  const solidBatchesLength = solidBatches.length;
  const translucentBatches = this._translucentBatches.values;
  const translucentBatchesLength = translucentBatches.length;
  let itemsToRemove;
  let isUpdated = true;
  let needUpdate = false;

  do {
    needUpdate = false;
    for (x = 0; x < solidBatchesLength; x++) {
      batch = solidBatches[x];
      //Perform initial update
      isUpdated = batch.update(time);

      //If any items swapped between solid/translucent, we need to
      //move them between batches
      itemsToRemove = batch.itemsToRemove;
      const solidsToMoveLength = itemsToRemove.length;
      if (solidsToMoveLength > 0) {
        needUpdate = true;
        for (i = 0; i < solidsToMoveLength; i++) {
          updater = itemsToRemove[i];
          batch.remove(updater);
          this.add(time, updater);
        }
      }
    }
    for (x = 0; x < translucentBatchesLength; x++) {
      batch = translucentBatches[x];
      //Perform initial update
      isUpdated = batch.update(time);

      //If any items swapped between solid/translucent, we need to
      //move them between batches
      itemsToRemove = batch.itemsToRemove;
      const translucentToMoveLength = itemsToRemove.length;
      if (translucentToMoveLength > 0) {
        needUpdate = true;
        for (i = 0; i < translucentToMoveLength; i++) {
          updater = itemsToRemove[i];
          batch.remove(updater);
          this.add(time, updater);
        }
      }
    }
  } while (needUpdate);

  return isUpdated;
};

StaticOutlineGeometryBatch.prototype.getBoundingSphere = function (
  updater,
  result
) {
  let i;

  const solidBatches = this._solidBatches.values;
  const solidBatchesLength = solidBatches.length;
  for (i = 0; i < solidBatchesLength; i++) {
    const solidBatch = solidBatches[i];
    if (solidBatch.contains(updater)) {
      return solidBatch.getBoundingSphere(updater, result);
    }
  }

  const translucentBatches = this._translucentBatches.values;
  const translucentBatchesLength = translucentBatches.length;
  for (i = 0; i < translucentBatchesLength; i++) {
    const translucentBatch = translucentBatches[i];
    if (translucentBatch.contains(updater)) {
      return translucentBatch.getBoundingSphere(updater, result);
    }
  }

  return BoundingSphereState.FAILED;
};

StaticOutlineGeometryBatch.prototype.removeAllPrimitives = function () {
  let i;

  const solidBatches = this._solidBatches.values;
  const solidBatchesLength = solidBatches.length;
  for (i = 0; i < solidBatchesLength; i++) {
    solidBatches[i].removeAllPrimitives();
  }

  const translucentBatches = this._translucentBatches.values;
  const translucentBatchesLength = translucentBatches.length;
  for (i = 0; i < translucentBatchesLength; i++) {
    translucentBatches[i].removeAllPrimitives();
  }
};
export default StaticOutlineGeometryBatch;
