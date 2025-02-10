import AssociativeArray from "../Core/AssociativeArray.js";
import defined from "../Core/defined.js";
import BoundingSphereState from "./BoundingSphereState.js";

/**
 * @private
 */
function DynamicGeometryBatch(primitives, orderedGroundPrimitives) {
  this._primitives = primitives;
  this._orderedGroundPrimitives = orderedGroundPrimitives;
  this._dynamicUpdaters = new AssociativeArray();
}

DynamicGeometryBatch.prototype.add = function (time, updater) {
  this._dynamicUpdaters.set(
    updater.id,
    updater.createDynamicUpdater(
      this._primitives,
      this._orderedGroundPrimitives,
    ),
  );
};

DynamicGeometryBatch.prototype.remove = function (updater) {
  const id = updater.id;
  const dynamicUpdater = this._dynamicUpdaters.get(id);
  if (defined(dynamicUpdater)) {
    this._dynamicUpdaters.remove(id);
    dynamicUpdater.destroy();
  }
};

DynamicGeometryBatch.prototype.update = function (time) {
  const geometries = this._dynamicUpdaters.values;
  for (let i = 0, len = geometries.length; i < len; i++) {
    geometries[i].update(time);
  }
  return true;
};

DynamicGeometryBatch.prototype.removeAllPrimitives = function () {
  const geometries = this._dynamicUpdaters.values;
  for (let i = 0, len = geometries.length; i < len; i++) {
    geometries[i].destroy();
  }
  this._dynamicUpdaters.removeAll();
};

DynamicGeometryBatch.prototype.getBoundingSphere = function (updater, result) {
  updater = this._dynamicUpdaters.get(updater.id);
  if (defined(updater) && defined(updater.getBoundingSphere)) {
    return updater.getBoundingSphere(result);
  }
  return BoundingSphereState.FAILED;
};
export default DynamicGeometryBatch;
