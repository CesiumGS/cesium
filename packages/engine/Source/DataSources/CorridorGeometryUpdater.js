import ApproximateTerrainHeights from "../Core/ApproximateTerrainHeights.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import CorridorGeometry from "../Core/CorridorGeometry.js";
import CorridorOutlineGeometry from "../Core/CorridorOutlineGeometry.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
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

function CorridorGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.positions = undefined;
  this.width = undefined;
  this.cornerType = undefined;
  this.height = undefined;
  this.extrudedHeight = undefined;
  this.granularity = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for corridors.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias CorridorGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function CorridorGeometryUpdater(entity, scene) {
  GroundGeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new CorridorGeometryOptions(entity),
    geometryPropertyName: "corridor",
    observedPropertyNames: ["availability", "corridor"],
  });

  this._onEntityPropertyChanged(entity, "corridor", entity.corridor, undefined);
}

if (defined(Object.create)) {
  CorridorGeometryUpdater.prototype = Object.create(
    GroundGeometryUpdater.prototype
  );
  CorridorGeometryUpdater.prototype.constructor = CorridorGeometryUpdater;
}

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
CorridorGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
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
    geometry: new CorridorGeometry(this._options),
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
CorridorGeometryUpdater.prototype.createOutlineGeometryInstance = function (
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

  const attributes = {
    show: new ShowGeometryInstanceAttribute(
      isAvailable &&
        entity.isShowing &&
        this._showProperty.getValue(time) &&
        this._showOutlineProperty.getValue(time)
    ),
    color: ColorGeometryInstanceAttribute.fromColor(outlineColor),
    distanceDisplayCondition: DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
      this._distanceDisplayConditionProperty.getValue(time)
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
    geometry: new CorridorOutlineGeometry(this._options),
    attributes: attributes,
  });
};

CorridorGeometryUpdater.prototype._computeCenter = function (time, result) {
  const positions = Property.getValueOrUndefined(
    this._entity.corridor.positions,
    time
  );
  if (!defined(positions) || positions.length === 0) {
    return;
  }
  return Cartesian3.clone(
    positions[Math.floor(positions.length / 2.0)],
    result
  );
};

CorridorGeometryUpdater.prototype._isHidden = function (entity, corridor) {
  return (
    !defined(corridor.positions) ||
    !defined(corridor.width) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, corridor)
  );
};

CorridorGeometryUpdater.prototype._isDynamic = function (entity, corridor) {
  return (
    !corridor.positions.isConstant || //
    !Property.isConstant(corridor.height) || //
    !Property.isConstant(corridor.extrudedHeight) || //
    !Property.isConstant(corridor.granularity) || //
    !Property.isConstant(corridor.width) || //
    !Property.isConstant(corridor.outlineWidth) || //
    !Property.isConstant(corridor.cornerType) || //
    !Property.isConstant(corridor.zIndex) || //
    (this._onTerrain &&
      !Property.isConstant(this._materialProperty) &&
      !(this._materialProperty instanceof ColorMaterialProperty))
  );
};

CorridorGeometryUpdater.prototype._setStaticOptions = function (
  entity,
  corridor
) {
  let heightValue = Property.getValueOrUndefined(
    corridor.height,
    Iso8601.MINIMUM_VALUE
  );
  const heightReferenceValue = Property.getValueOrDefault(
    corridor.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    corridor.extrudedHeight,
    Iso8601.MINIMUM_VALUE
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    corridor.extrudedHeightReference,
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
  options.positions = corridor.positions.getValue(
    Iso8601.MINIMUM_VALUE,
    options.positions
  );
  options.width = corridor.width.getValue(Iso8601.MINIMUM_VALUE);
  options.granularity = Property.getValueOrUndefined(
    corridor.granularity,
    Iso8601.MINIMUM_VALUE
  );
  options.cornerType = Property.getValueOrUndefined(
    corridor.cornerType,
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
      CorridorGeometry.computeRectangle(options, scratchRectangle)
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};

CorridorGeometryUpdater.DynamicGeometryUpdater = DynamicCorridorGeometryUpdater;

/**
 * @private
 */
function DynamicCorridorGeometryUpdater(
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
  DynamicCorridorGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype
  );
  DynamicCorridorGeometryUpdater.prototype.constructor = DynamicCorridorGeometryUpdater;
}

DynamicCorridorGeometryUpdater.prototype._isHidden = function (
  entity,
  corridor,
  time
) {
  const options = this._options;
  return (
    !defined(options.positions) ||
    !defined(options.width) ||
    DynamicGeometryUpdater.prototype._isHidden.call(
      this,
      entity,
      corridor,
      time
    )
  );
};

DynamicCorridorGeometryUpdater.prototype._setOptions = function (
  entity,
  corridor,
  time
) {
  const options = this._options;
  let heightValue = Property.getValueOrUndefined(corridor.height, time);
  const heightReferenceValue = Property.getValueOrDefault(
    corridor.heightReference,
    time,
    HeightReference.NONE
  );
  let extrudedHeightValue = Property.getValueOrUndefined(
    corridor.extrudedHeight,
    time
  );
  const extrudedHeightReferenceValue = Property.getValueOrDefault(
    corridor.extrudedHeightReference,
    time,
    HeightReference.NONE
  );
  if (defined(extrudedHeightValue) && !defined(heightValue)) {
    heightValue = 0;
  }

  options.positions = Property.getValueOrUndefined(corridor.positions, time);
  options.width = Property.getValueOrUndefined(corridor.width, time);
  options.granularity = Property.getValueOrUndefined(
    corridor.granularity,
    time
  );
  options.cornerType = Property.getValueOrUndefined(corridor.cornerType, time);
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
      CorridorGeometry.computeRectangle(options, scratchRectangle)
    ).minimumTerrainHeight;
  }

  options.extrudedHeight = extrudedHeightValue;
};
export default CorridorGeometryUpdater;
