import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import EllipseGeometry from "../Core/EllipseGeometry.js";
import EllipseOutlineGeometry from "../Core/EllipseOutlineGeometry.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Iso8601 from "../Core/Iso8601.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import Rectangle from "../Core/Rectangle.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import HeightReference from "../Scene/HeightReference.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryUpdater from "./DynamicGeometryUpdater.js";
import GeometryUpdater from "./GeometryUpdater.js";
import GroundGeometryUpdater from "./GroundGeometryUpdater.js";
import Property from "./Property.js";

const scratchColor = new Color();
const defaultOffset = Cartesian3.ZERO;
const offsetScratch = new Cartesian3();
const scratchRectangle = new Rectangle();

function EllipseGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.center = undefined;
  this.semiMajorAxis = undefined;
  this.semiMinorAxis = undefined;
  this.rotation = undefined;
  this.height = undefined;
  this.extrudedHeight = undefined;
  this.granularity = undefined;
  this.stRotation = undefined;
  this.numberOfVerticalLines = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for ellipses.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias EllipseGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function EllipseGeometryUpdater(entity, scene) {
  GroundGeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new EllipseGeometryOptions(entity),
    geometryPropertyName: "ellipse",
    observedPropertyNames: ["availability", "position", "ellipse"],
  });

  this._onEntityPropertyChanged(entity, "ellipse", entity.ellipse, undefined);
}

if (defined(Object.create)) {
  EllipseGeometryUpdater.prototype = Object.create(
    GroundGeometryUpdater.prototype
  );
  EllipseGeometryUpdater.prototype.constructor = EllipseGeometryUpdater;
}

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
EllipseGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._fillEnabled) {
    throw new DeveloperError(
      "This instance does not represent a filled geometry."
    );
  }
  //>>includeEnd('debug');

  const entity = this._entity;
  const isAvailable = entity.isAvailable(time);

  const attributes = {
    show: new ShowGeometryInstanceAttribute(
      isAvailable &&
        entity.isShowing &&
        this._showProperty.getValue(time) &&
        this._fillProperty.getValue(time)
    ),
    distanceDisplayCondition: DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
      this._distanceDisplayConditionProperty.getValue(time)
    ),
    offset: undefined,
    color: undefined,
  };

  if (this._materialProperty instanceof ColorMaterialProperty) {
    let currentColor;
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
    geometry: new EllipseGeometry(this._options),
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
EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function (
  time
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._outlineEnabled) {
    throw new DeveloperError(
      "This instance does not represent an outlined geometry."
    );
  }
  //>>includeEnd('debug');

  const entity = this._entity;
  const isAvailable = entity.isAvailable(time);
  const outlineColor = Property.getValueOrDefault(
    this._outlineColorProperty,
    time,
    Color.BLACK,
    scratchColor
  );
  const distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(
    time
  );

  const attributes = {
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
    geometry: new EllipseOutlineGeometry(this._options),
    attributes: attributes,
  });
};

EllipseGeometryUpdater.prototype._computeCenter = function (time, result) {
  return Property.getValueOrUndefined(this._entity.position, time, result);
};

EllipseGeometryUpdater.prototype._isHidden = function (entity, ellipse) {
  const position = entity.position;

  return (
    !defined(position) ||
    !defined(ellipse.semiMajorAxis) ||
    !defined(ellipse.semiMinorAxis) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, ellipse)
  );
};

EllipseGeometryUpdater.prototype._isDynamic = function (entity, ellipse) {
  return (
    !entity.position.isConstant || //
    !ellipse.semiMajorAxis.isConstant || //
    !ellipse.semiMinorAxis.isConstant || //
    !Property.isConstant(ellipse.rotation) || //
    !Property.isConstant(ellipse.height) || //
    !Property.isConstant(ellipse.extrudedHeight) || //
    !Property.isConstant(ellipse.granularity) || //
    !Property.isConstant(ellipse.stRotation) || //
    !Property.isConstant(ellipse.outlineWidth) || //
    !Property.isConstant(ellipse.numberOfVerticalLines) || //
    !Property.isConstant(ellipse.zIndex) || //
    (this._onTerrain &&
      !Property.isConstant(this._materialProperty) &&
      !(this._materialProperty instanceof ColorMaterialProperty))
  );
};

EllipseGeometryUpdater.prototype._setStaticOptions = function (
  entity,
  ellipse
) {
  let heightValue = Property.getValueOrUndefined(
    ellipse.height,
    Iso8601.MINIMUM_VALUE
  );
  const heightReferenceValue = Property.getValueOrDefault(
    ellipse.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    ellipse.extrudedHeight,
    Iso8601.MINIMUM_VALUE
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    ellipse.extrudedHeightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE
  );
  if (defined(extrudedHeightValue) && !defined(heightValue)) {
    heightValue = 0;
  }

  const options = this._options;
  options.vertexFormat =
    this._materialProperty instanceof ColorMaterialProperty
      ? PerInstanceColorAppearance.VERTEX_FORMAT
      : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.center = entity.position.getValue(
    Iso8601.MINIMUM_VALUE,
    options.center
  );
  options.semiMajorAxis = ellipse.semiMajorAxis.getValue(
    Iso8601.MINIMUM_VALUE,
    options.semiMajorAxis
  );
  options.semiMinorAxis = ellipse.semiMinorAxis.getValue(
    Iso8601.MINIMUM_VALUE,
    options.semiMinorAxis
  );
  options.rotation = Property.getValueOrUndefined(
    ellipse.rotation,
    Iso8601.MINIMUM_VALUE
  );
  options.granularity = Property.getValueOrUndefined(
    ellipse.granularity,
    Iso8601.MINIMUM_VALUE
  );
  options.stRotation = Property.getValueOrUndefined(
    ellipse.stRotation,
    Iso8601.MINIMUM_VALUE
  );
  options.numberOfVerticalLines = Property.getValueOrUndefined(
    ellipse.numberOfVerticalLines,
    Iso8601.MINIMUM_VALUE
  );
  options.offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(
    heightValue,
    heightReferenceValue,
    extrudedHeightValue,
    extrudedHeightReferenceValue
  );
  options.height = GroundGeometryUpdater.getGeometryHeight(
    heightValue,
    heightReferenceValue
  );

  extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(
    extrudedHeightValue,
    extrudedHeightReferenceValue
  );
  if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
    extrudedHeightValue = ApproximateTerrainHeights.getMinimumMaximumHeights(
      EllipseGeometry.computeRectangle(options, scratchRectangle)
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};

EllipseGeometryUpdater.DynamicGeometryUpdater = DynamicEllipseGeometryUpdater;

/**
 * @private
 */
function DynamicEllipseGeometryUpdater(
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
  DynamicEllipseGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype
  );
  DynamicEllipseGeometryUpdater.prototype.constructor = DynamicEllipseGeometryUpdater;
}

DynamicEllipseGeometryUpdater.prototype._isHidden = function (
  entity,
  ellipse,
  time
) {
  const options = this._options;
  return (
    !defined(options.center) ||
    !defined(options.semiMajorAxis) ||
    !defined(options.semiMinorAxis) ||
    DynamicGeometryUpdater.prototype._isHidden.call(this, entity, ellipse, time)
  );
};

DynamicEllipseGeometryUpdater.prototype._setOptions = function (
  entity,
  ellipse,
  time
) {
  const options = this._options;
  let heightValue = Property.getValueOrUndefined(ellipse.height, time);
  const heightReferenceValue = Property.getValueOrDefault(
    ellipse.heightReference,
    time,
    HeightReference.NONE
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    ellipse.extrudedHeight,
    time
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    ellipse.extrudedHeightReference,
    time,
    HeightReference.NONE
  );
  if (defined(extrudedHeightValue) && !defined(heightValue)) {
    heightValue = 0;
  }

  options.center = Property.getValueOrUndefined(
    entity.position,
    time,
    options.center
  );
  options.semiMajorAxis = Property.getValueOrUndefined(
    ellipse.semiMajorAxis,
    time
  );
  options.semiMinorAxis = Property.getValueOrUndefined(
    ellipse.semiMinorAxis,
    time
  );
  options.rotation = Property.getValueOrUndefined(ellipse.rotation, time);
  options.granularity = Property.getValueOrUndefined(ellipse.granularity, time);
  options.stRotation = Property.getValueOrUndefined(ellipse.stRotation, time);
  options.numberOfVerticalLines = Property.getValueOrUndefined(
    ellipse.numberOfVerticalLines,
    time
  );
  options.offsetAttribute = GroundGeometryUpdater.computeGeometryOffsetAttribute(
    heightValue,
    heightReferenceValue,
    extrudedHeightValue,
    extrudedHeightReferenceValue
  );
  options.height = GroundGeometryUpdater.getGeometryHeight(
    heightValue,
    heightReferenceValue
  );

  extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(
    extrudedHeightValue,
    extrudedHeightReferenceValue
  );
  if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
    extrudedHeightValue = ApproximateTerrainHeights.getMinimumMaximumHeights(
      EllipseGeometry.computeRectangle(options, scratchRectangle)
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};
export default EllipseGeometryUpdater;
