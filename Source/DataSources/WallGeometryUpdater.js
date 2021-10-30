import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Iso8601 from "../Core/Iso8601.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import WallGeometry from "../Core/WallGeometry.js";
import WallOutlineGeometry from "../Core/WallOutlineGeometry.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryUpdater from "./DynamicGeometryUpdater.js";
import GeometryUpdater from "./GeometryUpdater.js";
import Property from "./Property.js";

var scratchColor = new Color();

function WallGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.positions = undefined;
  this.minimumHeights = undefined;
  this.maximumHeights = undefined;
  this.granularity = undefined;
}

/**
 * A {@link GeometryUpdater} for walls.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias WallGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function WallGeometryUpdater(entity, scene) {
  GeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new WallGeometryOptions(entity),
    geometryPropertyName: "wall",
    observedPropertyNames: ["availability", "wall"],
  });

  this._onEntityPropertyChanged(entity, "wall", entity.wall, undefined);
}

if (defined(Object.create)) {
  WallGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
  WallGeometryUpdater.prototype.constructor = WallGeometryUpdater;
}

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
WallGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._fillEnabled) {
    throw new DeveloperError(
      "This instance does not represent a filled geometry."
    );
  }
  //>>includeEnd('debug');

  var entity = this._entity;
  var isAvailable = entity.isAvailable(time);

  var attributes;

  var color;
  var show = new ShowGeometryInstanceAttribute(
    isAvailable &&
      entity.isShowing &&
      this._showProperty.getValue(time) &&
      this._fillProperty.getValue(time)
  );
  var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(
    time
  );
  var distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
    distanceDisplayCondition
  );
  if (this._materialProperty instanceof ColorMaterialProperty) {
    var currentColor;
    if (
      defined(this._materialProperty.color) &&
      (this._materialProperty.color.isConstant || isAvailable)
    ) {
      currentColor = this._materialProperty.color.getValue(time, scratchColor);
    }
    if (!defined(currentColor)) {
      currentColor = Color.WHITE;
    }
    color = ColorGeometryInstanceAttribute.fromColor(currentColor);
    attributes = {
      show: show,
      distanceDisplayCondition: distanceDisplayConditionAttribute,
      color: color,
    };
  } else {
    attributes = {
      show: show,
      distanceDisplayCondition: distanceDisplayConditionAttribute,
    };
  }

  return new GeometryInstance({
    id: entity,
    geometry: new WallGeometry(this._options),
    attributes: attributes,
  });
};

/**
 * Creates the geometry instance which represents the outline of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the outline portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent an outlined geometry.
 */
WallGeometryUpdater.prototype.createOutlineGeometryInstance = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._outlineEnabled) {
    throw new DeveloperError(
      "This instance does not represent an outlined geometry."
    );
  }
  //>>includeEnd('debug');

  var entity = this._entity;
  var isAvailable = entity.isAvailable(time);
  var outlineColor = Property.getValueOrDefault(
    this._outlineColorProperty,
    time,
    Color.BLACK,
    scratchColor
  );
  var distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(
    time
  );

  return new GeometryInstance({
    id: entity,
    geometry: new WallOutlineGeometry(this._options),
    attributes: {
      show: new ShowGeometryInstanceAttribute(
        isAvailable &&
          entity.isShowing &&
          this._showProperty.getValue(time) &&
          this._showOutlineProperty.getValue(time)
      ),
      color: ColorGeometryInstanceAttribute.fromColor(outlineColor),
      distanceDisplayCondition: DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
        distanceDisplayCondition
      ),
    },
  });
};

WallGeometryUpdater.prototype._isHidden = function (entity, wall) {
  return (
    !defined(wall.positions) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, wall)
  );
};

WallGeometryUpdater.prototype._getIsClosed = function (options) {
  return false;
};

WallGeometryUpdater.prototype._isDynamic = function (entity, wall) {
  return (
    !wall.positions.isConstant || //
    !Property.isConstant(wall.minimumHeights) || //
    !Property.isConstant(wall.maximumHeights) || //
    !Property.isConstant(wall.outlineWidth) || //
    !Property.isConstant(wall.granularity)
  );
};

WallGeometryUpdater.prototype._setStaticOptions = function (entity, wall) {
  var minimumHeights = wall.minimumHeights;
  var maximumHeights = wall.maximumHeights;
  var granularity = wall.granularity;
  var isColorMaterial = this._materialProperty instanceof ColorMaterialProperty;

  var options = this._options;
  options.vertexFormat = isColorMaterial
    ? PerInstanceColorAppearance.VERTEX_FORMAT
    : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.positions = wall.positions.getValue(
    Iso8601.MINIMUM_VALUE,
    options.positions
  );
  options.minimumHeights = defined(minimumHeights)
    ? minimumHeights.getValue(Iso8601.MINIMUM_VALUE, options.minimumHeights)
    : undefined;
  options.maximumHeights = defined(maximumHeights)
    ? maximumHeights.getValue(Iso8601.MINIMUM_VALUE, options.maximumHeights)
    : undefined;
  options.granularity = defined(granularity)
    ? granularity.getValue(Iso8601.MINIMUM_VALUE)
    : undefined;
};

WallGeometryUpdater.DynamicGeometryUpdater = DynamicWallGeometryUpdater;

/**
 * @private
 */
function DynamicWallGeometryUpdater(
  geometryUpdater,
  primitives,
  groundPrimitives
) {
  DynamicGeometryUpdater.call(
    this,
    geometryUpdater,
    primitives,
    groundPrimitives
  );
}

if (defined(Object.create)) {
  DynamicWallGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype
  );
  DynamicWallGeometryUpdater.prototype.constructor = DynamicWallGeometryUpdater;
}

DynamicWallGeometryUpdater.prototype._isHidden = function (entity, wall, time) {
  return (
    !defined(this._options.positions) ||
    DynamicGeometryUpdater.prototype._isHidden.call(this, entity, wall, time)
  );
};

DynamicWallGeometryUpdater.prototype._setOptions = function (
  entity,
  wall,
  time
) {
  var options = this._options;
  options.positions = Property.getValueOrUndefined(
    wall.positions,
    time,
    options.positions
  );
  options.minimumHeights = Property.getValueOrUndefined(
    wall.minimumHeights,
    time,
    options.minimumHeights
  );
  options.maximumHeights = Property.getValueOrUndefined(
    wall.maximumHeights,
    time,
    options.maximumHeights
  );
  options.granularity = Property.getValueOrUndefined(wall.granularity, time);
};
export default WallGeometryUpdater;
