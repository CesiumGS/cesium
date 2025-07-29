import AssociativeArray from "../Core/AssociativeArray.js";
import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";
import SplitDirection from "../Scene/SplitDirection.js";

const defaultColor = Color.WHITE;
const defaultEyeOffset = Cartesian3.ZERO;
const defaultHeightReference = HeightReference.NONE;
const defaultPixelOffset = Cartesian2.ZERO;
const defaultScale = 1.0;
const defaultRotation = 0.0;
const defaultAlignedAxis = Cartesian3.ZERO;
const defaultHorizontalOrigin = HorizontalOrigin.CENTER;
const defaultVerticalOrigin = VerticalOrigin.CENTER;
const defaultSizeInMeters = false;
const defaultSplitDirection = SplitDirection.NONE;

const positionScratch = new Cartesian3();
const colorScratch = new Color();
const eyeOffsetScratch = new Cartesian3();
const pixelOffsetScratch = new Cartesian2();
const scaleByDistanceScratch = new NearFarScalar();
const translucencyByDistanceScratch = new NearFarScalar();
const pixelOffsetScaleByDistanceScratch = new NearFarScalar();
const boundingRectangleScratch = new BoundingRectangle();
const distanceDisplayConditionScratch = new DistanceDisplayCondition();

function EntityData(entity) {
  this.entity = entity;
  this.billboard = undefined;
  this.textureValue = undefined;
}

/**
 * A {@link Visualizer} which maps {@link Entity#billboard} to a {@link Billboard}.
 * @alias BillboardVisualizer
 * @constructor
 *
 * @param {EntityCluster} entityCluster The entity cluster to manage the collection of billboards and optionally cluster with other entities.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
function BillboardVisualizer(entityCluster, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entityCluster)) {
    throw new DeveloperError("entityCluster is required.");
  }
  if (!defined(entityCollection)) {
    throw new DeveloperError("entityCollection is required.");
  }
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    BillboardVisualizer.prototype._onCollectionChanged,
    this,
  );

  this._cluster = entityCluster;
  this._entityCollection = entityCollection;
  this._items = new AssociativeArray();
  this._onCollectionChanged(entityCollection, entityCollection.values, [], []);
}

/**
 * Updates the primitives created by this visualizer to match their
 * Entity counterpart at the given time.
 *
 * @param {JulianDate} time The time to update to.
 * @returns {boolean} This function always returns true.
 */
BillboardVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  const items = this._items.values;
  const cluster = this._cluster;

  for (let i = 0, len = items.length; i < len; i++) {
    const item = items[i];
    const entity = item.entity;
    const billboardGraphics = entity._billboard;
    let textureValue;
    let billboard = item.billboard;
    let show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(billboardGraphics._show, time, true);
    let position;
    if (show) {
      position = Property.getValueOrUndefined(
        entity._position,
        time,
        positionScratch,
      );
      textureValue = Property.getValueOrUndefined(
        billboardGraphics._image,
        time,
      );
      show = defined(position) && defined(textureValue);
    }

    if (!show) {
      //don't bother creating or updating anything else
      returnPrimitive(item, entity, cluster);
      continue;
    }

    if (!Property.isConstant(entity._position)) {
      cluster._clusterDirty = true;
    }

    if (!defined(billboard)) {
      billboard = cluster.getBillboard(entity);
      billboard.id = entity;
      item.billboard = billboard;
      item.textureValue = undefined;
    }

    billboard.show = show;
    if (item.textureValue !== textureValue) {
      billboard.image = textureValue;
      item.textureValue = textureValue;
    }
    billboard.position = position;
    billboard.color = Property.getValueOrDefault(
      billboardGraphics._color,
      time,
      defaultColor,
      colorScratch,
    );
    billboard.eyeOffset = Property.getValueOrDefault(
      billboardGraphics._eyeOffset,
      time,
      defaultEyeOffset,
      eyeOffsetScratch,
    );
    billboard.heightReference = Property.getValueOrDefault(
      billboardGraphics._heightReference,
      time,
      defaultHeightReference,
    );
    billboard.pixelOffset = Property.getValueOrDefault(
      billboardGraphics._pixelOffset,
      time,
      defaultPixelOffset,
      pixelOffsetScratch,
    );
    billboard.scale = Property.getValueOrDefault(
      billboardGraphics._scale,
      time,
      defaultScale,
    );
    billboard.rotation = Property.getValueOrDefault(
      billboardGraphics._rotation,
      time,
      defaultRotation,
    );
    billboard.alignedAxis = Property.getValueOrDefault(
      billboardGraphics._alignedAxis,
      time,
      defaultAlignedAxis,
    );
    billboard.horizontalOrigin = Property.getValueOrDefault(
      billboardGraphics._horizontalOrigin,
      time,
      defaultHorizontalOrigin,
    );
    billboard.verticalOrigin = Property.getValueOrDefault(
      billboardGraphics._verticalOrigin,
      time,
      defaultVerticalOrigin,
    );
    billboard.width = Property.getValueOrUndefined(
      billboardGraphics._width,
      time,
    );
    billboard.height = Property.getValueOrUndefined(
      billboardGraphics._height,
      time,
    );
    billboard.scaleByDistance = Property.getValueOrUndefined(
      billboardGraphics._scaleByDistance,
      time,
      scaleByDistanceScratch,
    );
    billboard.translucencyByDistance = Property.getValueOrUndefined(
      billboardGraphics._translucencyByDistance,
      time,
      translucencyByDistanceScratch,
    );
    billboard.pixelOffsetScaleByDistance = Property.getValueOrUndefined(
      billboardGraphics._pixelOffsetScaleByDistance,
      time,
      pixelOffsetScaleByDistanceScratch,
    );
    billboard.sizeInMeters = Property.getValueOrDefault(
      billboardGraphics._sizeInMeters,
      time,
      defaultSizeInMeters,
    );
    billboard.distanceDisplayCondition = Property.getValueOrUndefined(
      billboardGraphics._distanceDisplayCondition,
      time,
      distanceDisplayConditionScratch,
    );
    billboard.disableDepthTestDistance = Property.getValueOrUndefined(
      billboardGraphics._disableDepthTestDistance,
      time,
    );
    billboard.splitDirection = Property.getValueOrDefault(
      billboardGraphics._splitDirection,
      time,
      defaultSplitDirection,
    );

    const subRegion = Property.getValueOrUndefined(
      billboardGraphics._imageSubRegion,
      time,
      boundingRectangleScratch,
    );
    if (defined(subRegion)) {
      billboard.setImageSubRegion(billboard.image, subRegion);
    }
  }
  return true;
};

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
BillboardVisualizer.prototype.getBoundingSphere = function (entity, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entity)) {
    throw new DeveloperError("entity is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  const item = this._items.get(entity.id);
  if (!defined(item) || !defined(item.billboard)) {
    return BoundingSphereState.FAILED;
  }

  const billboard = item.billboard;
  if (billboard.heightReference === HeightReference.NONE) {
    result.center = Cartesian3.clone(billboard.position, result.center);
  } else {
    if (!defined(billboard._clampedPosition)) {
      return BoundingSphereState.PENDING;
    }
    result.center = Cartesian3.clone(billboard._clampedPosition, result.center);
  }
  result.radius = 0;
  return BoundingSphereState.DONE;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 */
BillboardVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
BillboardVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    BillboardVisualizer.prototype._onCollectionChanged,
    this,
  );
  const entities = this._entityCollection.values;
  for (let i = 0; i < entities.length; i++) {
    this._cluster.removeBillboard(entities[i]);
  }
  return destroyObject(this);
};

BillboardVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed,
) {
  let i;
  let entity;
  const items = this._items;
  const cluster = this._cluster;

  for (i = added.length - 1; i > -1; i--) {
    entity = added[i];
    if (defined(entity._billboard) && defined(entity._position)) {
      items.set(entity.id, new EntityData(entity));
    }
  }

  for (i = changed.length - 1; i > -1; i--) {
    entity = changed[i];
    if (defined(entity._billboard) && defined(entity._position)) {
      if (!items.contains(entity.id)) {
        items.set(entity.id, new EntityData(entity));
      }
    } else {
      returnPrimitive(items.get(entity.id), entity, cluster);
      items.remove(entity.id);
    }
  }

  for (i = removed.length - 1; i > -1; i--) {
    entity = removed[i];
    returnPrimitive(items.get(entity.id), entity, cluster);
    items.remove(entity.id);
  }
};

function returnPrimitive(item, entity, cluster) {
  if (defined(item)) {
    item.billboard = undefined;
    cluster.removeBillboard(entity);
  }
}
export default BillboardVisualizer;
