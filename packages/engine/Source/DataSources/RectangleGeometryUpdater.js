import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Iso8601 from "../Core/Iso8601.js";
import OffsetGeometryInstanceAttribute from "../Core/OffsetGeometryInstanceAttribute.js";
import Rectangle from "../Core/Rectangle.js";
import RectangleGeometry from "../Core/RectangleGeometry.js";
import RectangleOutlineGeometry from "../Core/RectangleOutlineGeometry.js";
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
const scratchCenterRect = new Rectangle();
const scratchCarto = new Cartographic();

function RectangleGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.rectangle = undefined;
  this.height = undefined;
  this.extrudedHeight = undefined;
  this.granularity = undefined;
  this.stRotation = undefined;
  this.rotation = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for rectangles.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias RectangleGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function RectangleGeometryUpdater(entity, scene) {
  GroundGeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new RectangleGeometryOptions(entity),
    geometryPropertyName: "rectangle",
    observedPropertyNames: ["availability", "rectangle"],
  });

  this._onEntityPropertyChanged(
    entity,
    "rectangle",
    entity.rectangle,
    undefined,
  );
}

if (defined(Object.create)) {
  RectangleGeometryUpdater.prototype = Object.create(
    GroundGeometryUpdater.prototype,
  );
  RectangleGeometryUpdater.prototype.constructor = RectangleGeometryUpdater;
}

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
RectangleGeometryUpdater.prototype.createFillGeometryInstance = function (
  time,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._fillEnabled) {
    throw new DeveloperError(
      "This instance does not represent a filled geometry.",
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
        this._fillProperty.getValue(time),
    ),
    distanceDisplayCondition:
      DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
        this._distanceDisplayConditionProperty.getValue(time),
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
        offsetScratch,
      ),
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: new RectangleGeometry(this._options),
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
RectangleGeometryUpdater.prototype.createOutlineGeometryInstance = function (
  time,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("time", time);

  if (!this._outlineEnabled) {
    throw new DeveloperError(
      "This instance does not represent an outlined geometry.",
    );
  }
  //>>includeEnd('debug');

  const entity = this._entity;
  const isAvailable = entity.isAvailable(time);
  const outlineColor = Property.getValueOrDefault(
    this._outlineColorProperty,
    time,
    Color.BLACK,
    scratchColor,
  );
  const distanceDisplayCondition =
    this._distanceDisplayConditionProperty.getValue(time);

  const attributes = {
    show: new ShowGeometryInstanceAttribute(
      isAvailable &&
        entity.isShowing &&
        this._showProperty.getValue(time) &&
        this._showOutlineProperty.getValue(time),
    ),
    color: ColorGeometryInstanceAttribute.fromColor(outlineColor),
    distanceDisplayCondition:
      DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
        distanceDisplayCondition,
      ),
    offset: undefined,
  };

  if (defined(this._options.offsetAttribute)) {
    attributes.offset = OffsetGeometryInstanceAttribute.fromCartesian3(
      Property.getValueOrDefault(
        this._terrainOffsetProperty,
        time,
        defaultOffset,
        offsetScratch,
      ),
    );
  }

  return new GeometryInstance({
    id: entity,
    geometry: new RectangleOutlineGeometry(this._options),
    attributes: attributes,
  });
};

RectangleGeometryUpdater.prototype._computeCenter = function (time, result) {
  const rect = Property.getValueOrUndefined(
    this._entity.rectangle.coordinates,
    time,
    scratchCenterRect,
  );
  if (!defined(rect)) {
    return;
  }
  const center = Rectangle.center(rect, scratchCarto);
  return Cartographic.toCartesian(center, Ellipsoid.default, result);
};

RectangleGeometryUpdater.prototype._isHidden = function (entity, rectangle) {
  return (
    !defined(rectangle.coordinates) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, rectangle)
  );
};

RectangleGeometryUpdater.prototype._isDynamic = function (entity, rectangle) {
  return (
    !rectangle.coordinates.isConstant || //
    !Property.isConstant(rectangle.height) || //
    !Property.isConstant(rectangle.extrudedHeight) || //
    !Property.isConstant(rectangle.granularity) || //
    !Property.isConstant(rectangle.stRotation) || //
    !Property.isConstant(rectangle.rotation) || //
    !Property.isConstant(rectangle.outlineWidth) || //
    !Property.isConstant(rectangle.zIndex) || //
    (this._onTerrain &&
      !Property.isConstant(this._materialProperty) &&
      !(this._materialProperty instanceof ColorMaterialProperty))
  );
};

RectangleGeometryUpdater.prototype._setStaticOptions = function (
  entity,
  rectangle,
) {
  const isColorMaterial =
    this._materialProperty instanceof ColorMaterialProperty;

  let heightValue = Property.getValueOrUndefined(
    rectangle.height,
    Iso8601.MINIMUM_VALUE,
  );
  const heightReferenceValue = Property.getValueOrDefault(
    rectangle.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE,
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    rectangle.extrudedHeight,
    Iso8601.MINIMUM_VALUE,
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    rectangle.extrudedHeightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE,
  );
  if (defined(extrudedHeightValue) && !defined(heightValue)) {
    heightValue = 0;
  }

  const options = this._options;
  options.vertexFormat = isColorMaterial
    ? PerInstanceColorAppearance.VERTEX_FORMAT
    : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.rectangle = rectangle.coordinates.getValue(
    Iso8601.MINIMUM_VALUE,
    options.rectangle,
  );
  options.granularity = Property.getValueOrUndefined(
    rectangle.granularity,
    Iso8601.MINIMUM_VALUE,
  );
  options.stRotation = Property.getValueOrUndefined(
    rectangle.stRotation,
    Iso8601.MINIMUM_VALUE,
  );
  options.rotation = Property.getValueOrUndefined(
    rectangle.rotation,
    Iso8601.MINIMUM_VALUE,
  );
  options.offsetAttribute =
    GroundGeometryUpdater.computeGeometryOffsetAttribute(
      heightValue,
      heightReferenceValue,
      extrudedHeightValue,
      extrudedHeightReferenceValue,
    );
  options.height = GroundGeometryUpdater.getGeometryHeight(
    heightValue,
    heightReferenceValue,
  );

  extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(
    extrudedHeightValue,
    extrudedHeightReferenceValue,
  );
  if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
    extrudedHeightValue = ApproximateTerrainHeights.getMinimumMaximumHeights(
      RectangleGeometry.computeRectangle(options, scratchRectangle),
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};

RectangleGeometryUpdater.DynamicGeometryUpdater =
  DynamicRectangleGeometryUpdater;

/**
 * @private
 */
function DynamicRectangleGeometryUpdater(
  geometryUpdater,
  primitives,
  groundPrimitives,
) {
  DynamicGeometryUpdater.call(
    this,
    geometryUpdater,
    primitives,
    groundPrimitives,
  );
}

if (defined(Object.create)) {
  DynamicRectangleGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype,
  );
  DynamicRectangleGeometryUpdater.prototype.constructor =
    DynamicRectangleGeometryUpdater;
}

DynamicRectangleGeometryUpdater.prototype._isHidden = function (
  entity,
  rectangle,
  time,
) {
  return (
    !defined(this._options.rectangle) ||
    DynamicGeometryUpdater.prototype._isHidden.call(
      this,
      entity,
      rectangle,
      time,
    )
  );
};

DynamicRectangleGeometryUpdater.prototype._setOptions = function (
  entity,
  rectangle,
  time,
) {
  const options = this._options;
  let heightValue = Property.getValueOrUndefined(rectangle.height, time);
  const heightReferenceValue = Property.getValueOrDefault(
    rectangle.heightReference,
    time,
    HeightReference.NONE,
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    rectangle.extrudedHeight,
    time,
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    rectangle.extrudedHeightReference,
    time,
    HeightReference.NONE,
  );
  if (defined(extrudedHeightValue) && !defined(heightValue)) {
    heightValue = 0;
  }

  options.rectangle = Property.getValueOrUndefined(
    rectangle.coordinates,
    time,
    options.rectangle,
  );
  options.granularity = Property.getValueOrUndefined(
    rectangle.granularity,
    time,
  );
  options.stRotation = Property.getValueOrUndefined(rectangle.stRotation, time);
  options.rotation = Property.getValueOrUndefined(rectangle.rotation, time);
  options.offsetAttribute =
    GroundGeometryUpdater.computeGeometryOffsetAttribute(
      heightValue,
      heightReferenceValue,
      extrudedHeightValue,
      extrudedHeightReferenceValue,
    );
  options.height = GroundGeometryUpdater.getGeometryHeight(
    heightValue,
    heightReferenceValue,
  );

  extrudedHeightValue = GroundGeometryUpdater.getGeometryExtrudedHeight(
    extrudedHeightValue,
    extrudedHeightReferenceValue,
  );
  if (extrudedHeightValue === GroundGeometryUpdater.CLAMP_TO_GROUND) {
    extrudedHeightValue = ApproximateTerrainHeights.getMinimumMaximumHeights(
      RectangleGeometry.computeRectangle(options, scratchRectangle),
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};
export default RectangleGeometryUpdater;
