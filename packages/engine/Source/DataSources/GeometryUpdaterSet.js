import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import EventHelper from "../Core/EventHelper.js";
import BoxGeometryUpdater from "./BoxGeometryUpdater.js";
import CorridorGeometryUpdater from "./CorridorGeometryUpdater.js";
import CylinderGeometryUpdater from "./CylinderGeometryUpdater.js";
import EllipseGeometryUpdater from "./EllipseGeometryUpdater.js";
import EllipsoidGeometryUpdater from "./EllipsoidGeometryUpdater.js";
import PlaneGeometryUpdater from "./PlaneGeometryUpdater.js";
import PolygonGeometryUpdater from "./PolygonGeometryUpdater.js";
import PolylineVolumeGeometryUpdater from "./PolylineVolumeGeometryUpdater.js";
import RectangleGeometryUpdater from "./RectangleGeometryUpdater.js";
import WallGeometryUpdater from "./WallGeometryUpdater.js";

/** @type {GeometryUpdater[]} */
const geometryUpdaters = [
  BoxGeometryUpdater,
  CylinderGeometryUpdater,
  CorridorGeometryUpdater,
  EllipseGeometryUpdater,
  EllipsoidGeometryUpdater,
  PlaneGeometryUpdater,
  PolygonGeometryUpdater,
  PolylineVolumeGeometryUpdater,
  RectangleGeometryUpdater,
  WallGeometryUpdater,
];

/**
 * Manages a set of "updater" classes for the {@link GeometryVisualizer} for each entity
 *
 * @private
 * @param {Entity} entity
 * @param {Scene} scene
 */
function GeometryUpdaterSet(entity, scene) {
  this.entity = entity;
  this.scene = scene;
  const updaters = new Array(geometryUpdaters.length);
  const geometryChanged = new Event();
  const eventHelper = new EventHelper();
  for (let i = 0; i < updaters.length; i++) {
    const updater = new geometryUpdaters[i](entity, scene);
    eventHelper.add(updater.geometryChanged, (geometry) => {
      geometryChanged.raiseEvent(geometry);
    });
    updaters[i] = updater;
  }
  this.updaters = updaters;
  this.geometryChanged = geometryChanged;
  this.eventHelper = eventHelper;

  this._removeEntitySubscription = entity.definitionChanged.addEventListener(
    GeometryUpdaterSet.prototype._onEntityPropertyChanged,
    this
  );
}

GeometryUpdaterSet.prototype._onEntityPropertyChanged = function (
  entity,
  propertyName,
  newValue,
  oldValue
) {
  const updaters = this.updaters;
  for (let i = 0; i < updaters.length; i++) {
    updaters[i]._onEntityPropertyChanged(
      entity,
      propertyName,
      newValue,
      oldValue
    );
  }
};

GeometryUpdaterSet.prototype.forEach = function (callback) {
  const updaters = this.updaters;
  for (let i = 0; i < updaters.length; i++) {
    callback(updaters[i]);
  }
};

GeometryUpdaterSet.prototype.destroy = function () {
  this.eventHelper.removeAll();
  const updaters = this.updaters;
  for (let i = 0; i < updaters.length; i++) {
    updaters[i].destroy();
  }
  this._removeEntitySubscription();
  destroyObject(this);
};

/**
 * Add the provided updater to the default list of updaters if not already included
 * @param {GeometryUpdater} updater
 */
GeometryUpdaterSet.registerUpdater = function (updater) {
  if (!geometryUpdaters.includes(updater)) {
    geometryUpdaters.push(updater);
  }
};

/**
 * Remove the provided updater from the default list of updaters if included
 * @param {GeometryUpdater} updater
 */
GeometryUpdaterSet.unregisterUpdater = function (updater) {
  if (geometryUpdaters.includes(updater)) {
    const index = geometryUpdaters.indexOf(updater);
    geometryUpdaters.splice(index, 1);
  }
};

export default GeometryUpdaterSet;
