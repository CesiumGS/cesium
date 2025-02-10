import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import GroundPrimitive from "../Scene/GroundPrimitive.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import Primitive from "../Scene/Primitive.js";
import BoundingSphereState from "./BoundingSphereState.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import MaterialProperty from "./MaterialProperty.js";
import Property from "./Property.js";

/**
 * Defines the interface for a dynamic geometry updater.  A DynamicGeometryUpdater
 * is responsible for handling visualization of a specific type of geometry
 * that needs to be recomputed based on simulation time.
 * This object is never used directly by client code, but is instead created by
 * {@link GeometryUpdater} implementations which contain dynamic geometry.
 *
 * This type defines an interface and cannot be instantiated directly.
 *
 * @alias DynamicGeometryUpdater
 * @constructor
 * @private
 * @abstract
 */
function DynamicGeometryUpdater(
  geometryUpdater,
  primitives,
  orderedGroundPrimitives,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("geometryUpdater", geometryUpdater);
  Check.defined("primitives", primitives);
  Check.defined("orderedGroundPrimitives", orderedGroundPrimitives);
  //>>includeEnd('debug');

  this._primitives = primitives;
  this._orderedGroundPrimitives = orderedGroundPrimitives;
  this._primitive = undefined;
  this._outlinePrimitive = undefined;
  this._geometryUpdater = geometryUpdater;
  this._options = geometryUpdater._options;
  this._entity = geometryUpdater._entity;
  this._material = undefined;
}

DynamicGeometryUpdater.prototype._isHidden = function (entity, geometry, time) {
  return (
    !entity.isShowing ||
    !entity.isAvailable(time) ||
    !Property.getValueOrDefault(geometry.show, time, true)
  );
};

DynamicGeometryUpdater.prototype._setOptions =
  DeveloperError.throwInstantiationError;

/**
 * Updates the geometry to the specified time.
 * @memberof DynamicGeometryUpdater
 * @function
 *
 * @param {JulianDate} time The current time.
 */
DynamicGeometryUpdater.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);
  //>>includeEnd('debug');

  const geometryUpdater = this._geometryUpdater;
  const onTerrain = geometryUpdater._onTerrain;

  const primitives = this._primitives;
  const orderedGroundPrimitives = this._orderedGroundPrimitives;
  if (onTerrain) {
    orderedGroundPrimitives.remove(this._primitive);
  } else {
    primitives.removeAndDestroy(this._primitive);
    primitives.removeAndDestroy(this._outlinePrimitive);
    this._outlinePrimitive = undefined;
  }
  this._primitive = undefined;

  const entity = this._entity;
  const geometry = entity[this._geometryUpdater._geometryPropertyName];
  this._setOptions(entity, geometry, time);
  if (this._isHidden(entity, geometry, time)) {
    return;
  }

  const shadows = this._geometryUpdater.shadowsProperty.getValue(time);
  const options = this._options;
  if (!defined(geometry.fill) || geometry.fill.getValue(time)) {
    const fillMaterialProperty = geometryUpdater.fillMaterialProperty;
    const isColorAppearance =
      fillMaterialProperty instanceof ColorMaterialProperty;
    let appearance;
    const closed = geometryUpdater._getIsClosed(options);
    if (isColorAppearance) {
      appearance = new PerInstanceColorAppearance({
        closed: closed,
        flat:
          onTerrain && !geometryUpdater._supportsMaterialsforEntitiesOnTerrain,
      });
    } else {
      const material = MaterialProperty.getValue(
        time,
        fillMaterialProperty,
        this._material,
      );
      this._material = material;
      appearance = new MaterialAppearance({
        material: material,
        translucent: material.isTranslucent(),
        closed: closed,
      });
    }

    if (onTerrain) {
      options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
      this._primitive = orderedGroundPrimitives.add(
        new GroundPrimitive({
          geometryInstances:
            this._geometryUpdater.createFillGeometryInstance(time),
          appearance: appearance,
          asynchronous: false,
          shadows: shadows,
          classificationType:
            this._geometryUpdater.classificationTypeProperty.getValue(time),
        }),
        Property.getValueOrUndefined(this._geometryUpdater.zIndex, time),
      );
    } else {
      options.vertexFormat = appearance.vertexFormat;

      const fillInstance =
        this._geometryUpdater.createFillGeometryInstance(time);

      if (isColorAppearance) {
        appearance.translucent = fillInstance.attributes.color.value[3] !== 255;
      }

      this._primitive = primitives.add(
        new Primitive({
          geometryInstances: fillInstance,
          appearance: appearance,
          asynchronous: false,
          shadows: shadows,
        }),
      );
    }
  }

  if (
    !onTerrain &&
    defined(geometry.outline) &&
    geometry.outline.getValue(time)
  ) {
    const outlineInstance =
      this._geometryUpdater.createOutlineGeometryInstance(time);
    const outlineWidth = Property.getValueOrDefault(
      geometry.outlineWidth,
      time,
      1.0,
    );

    this._outlinePrimitive = primitives.add(
      new Primitive({
        geometryInstances: outlineInstance,
        appearance: new PerInstanceColorAppearance({
          flat: true,
          translucent: outlineInstance.attributes.color.value[3] !== 255,
          renderState: {
            lineWidth: geometryUpdater._scene.clampLineWidth(outlineWidth),
          },
        }),
        asynchronous: false,
        shadows: shadows,
      }),
    );
  }
};

/**
 * Computes a bounding sphere which encloses the visualization produced for the specified entity.
 * The bounding sphere is in the fixed frame of the scene's globe.
 * @function
 *
 * @param {BoundingSphere} result The bounding sphere onto which to store the result.
 * @returns {BoundingSphereState} BoundingSphereState.DONE if the result contains the bounding sphere,
 *                       BoundingSphereState.PENDING if the result is still being computed, or
 *                       BoundingSphereState.FAILED if the entity has no visualization in the current scene.
 * @private
 */
DynamicGeometryUpdater.prototype.getBoundingSphere = function (result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');
  const entity = this._entity;
  const primitive = this._primitive;
  const outlinePrimitive = this._outlinePrimitive;

  let attributes;

  //Outline and Fill geometries have the same bounding sphere, so just use whichever one is defined and ready
  if (defined(primitive) && primitive.show && primitive.ready) {
    attributes = primitive.getGeometryInstanceAttributes(entity);
    if (defined(attributes) && defined(attributes.boundingSphere)) {
      BoundingSphere.clone(attributes.boundingSphere, result);
      return BoundingSphereState.DONE;
    }
  }

  if (
    defined(outlinePrimitive) &&
    outlinePrimitive.show &&
    outlinePrimitive.ready
  ) {
    attributes = outlinePrimitive.getGeometryInstanceAttributes(entity);
    if (defined(attributes) && defined(attributes.boundingSphere)) {
      BoundingSphere.clone(attributes.boundingSphere, result);
      return BoundingSphereState.DONE;
    }
  }

  if (
    (defined(primitive) && !primitive.ready) ||
    (defined(outlinePrimitive) && !outlinePrimitive.ready)
  ) {
    return BoundingSphereState.PENDING;
  }

  return BoundingSphereState.FAILED;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * @memberof DynamicGeometryUpdater
 * @function
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 */
DynamicGeometryUpdater.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys and resources used by the object.  Once an object is destroyed, it should not be used.
 * @memberof DynamicGeometryUpdater
 * @function
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 */
DynamicGeometryUpdater.prototype.destroy = function () {
  const primitives = this._primitives;
  const orderedGroundPrimitives = this._orderedGroundPrimitives;
  if (this._geometryUpdater._onTerrain) {
    orderedGroundPrimitives.remove(this._primitive);
  } else {
    primitives.removeAndDestroy(this._primitive);
  }
  primitives.removeAndDestroy(this._outlinePrimitive);
  destroyObject(this);
};
export default DynamicGeometryUpdater;
