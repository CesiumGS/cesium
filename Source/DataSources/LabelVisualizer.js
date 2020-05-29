import AssociativeArray from "../Core/AssociativeArray.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import HeightReference from "../Scene/HeightReference.js";
import HorizontalOrigin from "../Scene/HorizontalOrigin.js";
import LabelStyle from "../Scene/LabelStyle.js";
import VerticalOrigin from "../Scene/VerticalOrigin.js";
import BoundingSphereState from "./BoundingSphereState.js";
import Property from "./Property.js";

var defaultScale = 1.0;
var defaultFont = "30px sans-serif";
var defaultStyle = LabelStyle.FILL;
var defaultFillColor = Color.WHITE;
var defaultOutlineColor = Color.BLACK;
var defaultOutlineWidth = 1.0;
var defaultShowBackground = false;
var defaultBackgroundColor = new Color(0.165, 0.165, 0.165, 0.8);
var defaultBackgroundPadding = new Cartesian2(7, 5);
var defaultPixelOffset = Cartesian2.ZERO;
var defaultEyeOffset = Cartesian3.ZERO;
var defaultHeightReference = HeightReference.NONE;
var defaultHorizontalOrigin = HorizontalOrigin.CENTER;
var defaultVerticalOrigin = VerticalOrigin.CENTER;

var positionScratch = new Cartesian3();
var fillColorScratch = new Color();
var outlineColorScratch = new Color();
var backgroundColorScratch = new Color();
var backgroundPaddingScratch = new Cartesian2();
var eyeOffsetScratch = new Cartesian3();
var pixelOffsetScratch = new Cartesian2();
var translucencyByDistanceScratch = new NearFarScalar();
var pixelOffsetScaleByDistanceScratch = new NearFarScalar();
var scaleByDistanceScratch = new NearFarScalar();
var distanceDisplayConditionScratch = new DistanceDisplayCondition();

function EntityData(entity) {
  this.entity = entity;
  this.label = undefined;
  this.index = undefined;
}

/**
 * A {@link Visualizer} which maps the {@link LabelGraphics} instance
 * in {@link Entity#label} to a {@link Label}.
 * @alias LabelVisualizer
 * @constructor
 *
 * @param {EntityCluster} entityCluster The entity cluster to manage the collection of billboards and optionally cluster with other entities.
 * @param {EntityCollection} entityCollection The entityCollection to visualize.
 */
function LabelVisualizer(entityCluster, entityCollection) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entityCluster)) {
    throw new DeveloperError("entityCluster is required.");
  }
  if (!defined(entityCollection)) {
    throw new DeveloperError("entityCollection is required.");
  }
  //>>includeEnd('debug');

  entityCollection.collectionChanged.addEventListener(
    LabelVisualizer.prototype._onCollectionChanged,
    this
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
 * @returns {Boolean} This function always returns true.
 */
LabelVisualizer.prototype.update = function (time) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(time)) {
    throw new DeveloperError("time is required.");
  }
  //>>includeEnd('debug');

  var items = this._items.values;
  var cluster = this._cluster;

  for (var i = 0, len = items.length; i < len; i++) {
    var item = items[i];
    var entity = item.entity;
    var labelGraphics = entity._label;
    var text;
    var label = item.label;
    var show =
      entity.isShowing &&
      entity.isAvailable(time) &&
      Property.getValueOrDefault(labelGraphics._show, time, true);
    var position;
    if (show) {
      position = Property.getValueOrUndefined(
        entity._position,
        time,
        positionScratch
      );
      text = Property.getValueOrUndefined(labelGraphics._text, time);
      show = defined(position) && defined(text);
    }

    if (!show) {
      //don't bother creating or updating anything else
      returnPrimitive(item, entity, cluster);
      continue;
    }

    if (!Property.isConstant(entity._position)) {
      cluster._clusterDirty = true;
    }

    var updateClamping = false;
    var heightReference = Property.getValueOrDefault(
      labelGraphics._heightReference,
      time,
      defaultHeightReference
    );

    if (!defined(label)) {
      label = cluster.getLabel(entity);
      label.id = entity;
      item.label = label;

      // If this new label happens to have a position and height reference that match our new values,
      // label._updateClamping will not be called automatically. That's a problem because the clamped
      // height may be based on different terrain than is now loaded. So we'll manually call
      // _updateClamping below.
      updateClamping =
        Cartesian3.equals(label.position, position) &&
        label.heightReference === heightReference;
    }

    label.show = true;
    label.position = position;
    label.text = text;
    label.scale = Property.getValueOrDefault(
      labelGraphics._scale,
      time,
      defaultScale
    );
    label.font = Property.getValueOrDefault(
      labelGraphics._font,
      time,
      defaultFont
    );
    label.style = Property.getValueOrDefault(
      labelGraphics._style,
      time,
      defaultStyle
    );
    label.fillColor = Property.getValueOrDefault(
      labelGraphics._fillColor,
      time,
      defaultFillColor,
      fillColorScratch
    );
    label.outlineColor = Property.getValueOrDefault(
      labelGraphics._outlineColor,
      time,
      defaultOutlineColor,
      outlineColorScratch
    );
    label.outlineWidth = Property.getValueOrDefault(
      labelGraphics._outlineWidth,
      time,
      defaultOutlineWidth
    );
    label.showBackground = Property.getValueOrDefault(
      labelGraphics._showBackground,
      time,
      defaultShowBackground
    );
    label.backgroundColor = Property.getValueOrDefault(
      labelGraphics._backgroundColor,
      time,
      defaultBackgroundColor,
      backgroundColorScratch
    );
    label.backgroundPadding = Property.getValueOrDefault(
      labelGraphics._backgroundPadding,
      time,
      defaultBackgroundPadding,
      backgroundPaddingScratch
    );
    label.pixelOffset = Property.getValueOrDefault(
      labelGraphics._pixelOffset,
      time,
      defaultPixelOffset,
      pixelOffsetScratch
    );
    label.eyeOffset = Property.getValueOrDefault(
      labelGraphics._eyeOffset,
      time,
      defaultEyeOffset,
      eyeOffsetScratch
    );
    label.heightReference = heightReference;
    label.horizontalOrigin = Property.getValueOrDefault(
      labelGraphics._horizontalOrigin,
      time,
      defaultHorizontalOrigin
    );
    label.verticalOrigin = Property.getValueOrDefault(
      labelGraphics._verticalOrigin,
      time,
      defaultVerticalOrigin
    );
    label.translucencyByDistance = Property.getValueOrUndefined(
      labelGraphics._translucencyByDistance,
      time,
      translucencyByDistanceScratch
    );
    label.pixelOffsetScaleByDistance = Property.getValueOrUndefined(
      labelGraphics._pixelOffsetScaleByDistance,
      time,
      pixelOffsetScaleByDistanceScratch
    );
    label.scaleByDistance = Property.getValueOrUndefined(
      labelGraphics._scaleByDistance,
      time,
      scaleByDistanceScratch
    );
    label.distanceDisplayCondition = Property.getValueOrUndefined(
      labelGraphics._distanceDisplayCondition,
      time,
      distanceDisplayConditionScratch
    );
    label.disableDepthTestDistance = Property.getValueOrUndefined(
      labelGraphics._disableDepthTestDistance,
      time
    );

    if (updateClamping) {
      label._updateClamping();
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
LabelVisualizer.prototype.getBoundingSphere = function (entity, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(entity)) {
    throw new DeveloperError("entity is required.");
  }
  if (!defined(result)) {
    throw new DeveloperError("result is required.");
  }
  //>>includeEnd('debug');

  var item = this._items.get(entity.id);
  if (!defined(item) || !defined(item.label)) {
    return BoundingSphereState.FAILED;
  }

  var label = item.label;
  result.center = Cartesian3.clone(
    defaultValue(label._clampedPosition, label.position),
    result.center
  );
  result.radius = 0;
  return BoundingSphereState.DONE;
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
LabelVisualizer.prototype.isDestroyed = function () {
  return false;
};

/**
 * Removes and destroys all primitives created by this instance.
 */
LabelVisualizer.prototype.destroy = function () {
  this._entityCollection.collectionChanged.removeEventListener(
    LabelVisualizer.prototype._onCollectionChanged,
    this
  );
  var entities = this._entityCollection.values;
  for (var i = 0; i < entities.length; i++) {
    this._cluster.removeLabel(entities[i]);
  }
  return destroyObject(this);
};

LabelVisualizer.prototype._onCollectionChanged = function (
  entityCollection,
  added,
  removed,
  changed
) {
  var i;
  var entity;
  var items = this._items;
  var cluster = this._cluster;

  for (i = added.length - 1; i > -1; i--) {
    entity = added[i];
    if (defined(entity._label) && defined(entity._position)) {
      items.set(entity.id, new EntityData(entity));
    }
  }

  for (i = changed.length - 1; i > -1; i--) {
    entity = changed[i];
    if (defined(entity._label) && defined(entity._position)) {
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
    item.label = undefined;
    cluster.removeLabel(entity);
  }
}
export default LabelVisualizer;
