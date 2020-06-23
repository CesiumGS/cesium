import BoxGeometry from "../Core/BoxGeometry.js";
import BoxOutlineGeometry from "../Core/BoxOutlineGeometry.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import GeometryOffsetAttribute from "../Core/GeometryOffsetAttribute.js";
import Iso8601 from "../Core/Iso8601.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import HeightReference from "../Scene/HeightReference.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryUpdater from "./DynamicGeometryUpdater.js";
import GeometryUpdater from "./GeometryUpdater.js";
import heightReferenceOnEntityPropertyChanged from "./heightReferenceOnEntityPropertyChanged.js";
import Property from "./Property.js";

var defaultOffset = Cartesian3.ZERO;

var offsetScratch = new Cartesian3();
var positionScratch = new Cartesian3();
var scratchColor = new Color();

function BoxGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.dimensions = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for boxes.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias BoxGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function BoxGeometryUpdater(entity, scene) {
  GeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new BoxGeometryOptions(entity),
    geometryPropertyName: "box",
    observedPropertyNames: ["availability", "position", "orientation", "box"],
  });

  this._onEntityPropertyChanged(entity, "box", entity.box, undefined);
}

if (defined(Object.create)) {
  BoxGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
  BoxGeometryUpdater.prototype.constructor = BoxGeometryUpdater;
}

Object.defineProperties(BoxGeometryUpdater.prototype, {
  /**
   * Gets the terrain offset property
   * @type {TerrainOffsetProperty}
   * @memberof BoxGeometryUpdater.prototype
   * @readonly
   * @private
   */
  terrainOffsetProperty: {
    get: function () {
      return this._terrainOffsetProperty;
    },
  },
});

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
BoxGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
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

  var attributes = {
    show: show,
    distanceDisplayCondition: distanceDisplayConditionAttribute,
    color: undefined,
    offset: undefined,
  };
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
    attributes.color = ColorGeometryInstanceAttribute.fromColor(currentColor);
  }
  if (defined(this._options.offsetAttribute)) {
    attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(
      Property.getValueOrDefault(
        this._terrainOffsetProperty,
        time,
        defaultOffset,
        offsetScratch
      )
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: BoxGeometry.fromDimensions(this._options),
    modelMatrix: entity.computeModelMatrixForHeightReference(
      time,
      entity.box.heightReference,
      this._options.dimensions.z * 0.5,
      this._scene.mapProjection.ellipsoid
    ),
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
BoxGeometryUpdater.prototype.createOutlineGeometryInstance = function (time) {
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

  var attributes = {
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
    offset: undefined,
  };
  if (defined(this._options.offsetAttribute)) {
    attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(
      Property.getValueOrDefault(
        this._terrainOffsetProperty,
        time,
        defaultOffset,
        offsetScratch
      )
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: BoxOutlineGeometry.fromDimensions(this._options),
    modelMatrix: entity.computeModelMatrixForHeightReference(
      time,
      entity.box.heightReference,
      this._options.dimensions.z * 0.5,
      this._scene.mapProjection.ellipsoid
    ),
    attributes: attributes,
  });
};

BoxGeometryUpdater.prototype._computeCenter = function (time, result) {
  return Property.getValueOrUndefined(this._entity.position, time, result);
};

BoxGeometryUpdater.prototype._isHidden = function (entity, box) {
  return (
    !defined(box.dimensions) ||
    !defined(entity.position) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, box)
  );
};

BoxGeometryUpdater.prototype._isDynamic = function (entity, box) {
  return (
    !entity.position.isConstant ||
    !Property.isConstant(entity.orientation) ||
    !box.dimensions.isConstant ||
    !Property.isConstant(box.outlineWidth)
  );
};

BoxGeometryUpdater.prototype._setStaticOptions = function (entity, box) {
  var heightReference = Property.getValueOrDefault(
    box.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE
  );

  var options = this._options;
  options.vertexFormat =
    this._materialProperty instanceof ColorMaterialProperty
      ? PerInstanceColorAppearance.VERTEX_FORMAT
      : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.dimensions = box.dimensions.getValue(
    Iso8601.MINIMUM_VALUE,
    options.dimensions
  );
  options.offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;
};

BoxGeometryUpdater.prototype._onEntityPropertyChanged = heightReferenceOnEntityPropertyChanged;

BoxGeometryUpdater.DynamicGeometryUpdater = DynamicBoxGeometryUpdater;

/**
 * @private
 */
function DynamicBoxGeometryUpdater(
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
  DynamicBoxGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype
  );
  DynamicBoxGeometryUpdater.prototype.constructor = DynamicBoxGeometryUpdater;
}

DynamicBoxGeometryUpdater.prototype._isHidden = function (entity, box, time) {
  var position = Property.getValueOrUndefined(
    entity.position,
    time,
    positionScratch
  );
  var dimensions = this._options.dimensions;
  return (
    !defined(position) ||
    !defined(dimensions) ||
    DynamicGeometryUpdater.prototype._isHidden.call(this, entity, box, time)
  );
};

DynamicBoxGeometryUpdater.prototype._setOptions = function (entity, box, time) {
  var heightReference = Property.getValueOrDefault(
    box.heightReference,
    time,
    HeightReference.NONE
  );
  var options = this._options;
  options.dimensions = Property.getValueOrUndefined(
    box.dimensions,
    time,
    options.dimensions
  );
  options.offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;
};
export default BoxGeometryUpdater;
