import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import CylinderGeometry from "../Core/CylinderGeometry.js";
import CylinderOutlineGeometry from "../Core/CylinderOutlineGeometry.js";
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

const defaultOffset = Cartesian3.ZERO;

const offsetScratch = new Cartesian3();
const positionScratch = new Cartesian3();
const scratchColor = new Color();

function CylinderGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.length = undefined;
  this.topRadius = undefined;
  this.bottomRadius = undefined;
  this.slices = undefined;
  this.numberOfVerticalLines = undefined;
  this.offsetAttribute = undefined;
}

/**
 * A {@link GeometryUpdater} for cylinders.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias CylinderGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function CylinderGeometryUpdater(entity, scene) {
  GeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new CylinderGeometryOptions(entity),
    geometryPropertyName: "cylinder",
    observedPropertyNames: [
      "availability",
      "position",
      "orientation",
      "cylinder",
    ],
  });

  this._onEntityPropertyChanged(entity, "cylinder", entity.cylinder, undefined);
}

if (defined(Object.create)) {
  CylinderGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
  CylinderGeometryUpdater.prototype.constructor = CylinderGeometryUpdater;
}

Object.defineProperties(CylinderGeometryUpdater.prototype, {
  /**
   * Gets the terrain offset property
   * @type {TerrainOffsetProperty}
   * @memberof CylinderGeometryUpdater.prototype
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
CylinderGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
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

  const show = new ShowGeometryInstanceAttribute(
    isAvailable &&
      entity.isShowing &&
      this._showProperty.getValue(time) &&
      this._fillProperty.getValue(time),
  );
  const distanceDisplayCondition =
    this._distanceDisplayConditionProperty.getValue(time);
  const distanceDisplayConditionAttribute =
    DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
      distanceDisplayCondition,
    );

  const attributes = {
    show: show,
    distanceDisplayCondition: distanceDisplayConditionAttribute,
    color: undefined,
    offset: undefined,
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
    geometry: new CylinderGeometry(this._options),
    modelMatrix: entity.computeModelMatrixForHeightReference(
      time,
      entity.cylinder.heightReference,
      this._options.length * 0.5,
      this._scene.ellipsoid,
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
CylinderGeometryUpdater.prototype.createOutlineGeometryInstance = function (
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
    geometry: new CylinderOutlineGeometry(this._options),
    modelMatrix: entity.computeModelMatrixForHeightReference(
      time,
      entity.cylinder.heightReference,
      this._options.length * 0.5,
      this._scene.ellipsoid,
    ),
    attributes: attributes,
  });
};

CylinderGeometryUpdater.prototype._computeCenter = function (time, result) {
  return Property.getValueOrUndefined(this._entity.position, time, result);
};

CylinderGeometryUpdater.prototype._isHidden = function (entity, cylinder) {
  return (
    !defined(entity.position) ||
    !defined(cylinder.length) ||
    !defined(cylinder.topRadius) ||
    !defined(cylinder.bottomRadius) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, cylinder)
  );
};

CylinderGeometryUpdater.prototype._isDynamic = function (entity, cylinder) {
  return (
    !entity.position.isConstant || //
    !Property.isConstant(entity.orientation) || //
    !cylinder.length.isConstant || //
    !cylinder.topRadius.isConstant || //
    !cylinder.bottomRadius.isConstant || //
    !Property.isConstant(cylinder.slices) || //
    !Property.isConstant(cylinder.outlineWidth) || //
    !Property.isConstant(cylinder.numberOfVerticalLines)
  );
};

CylinderGeometryUpdater.prototype._setStaticOptions = function (
  entity,
  cylinder,
) {
  const heightReference = Property.getValueOrDefault(
    cylinder.heightReference,
    Iso8601.MINIMUM_VALUE,
    HeightReference.NONE,
  );
  const options = this._options;
  options.vertexFormat =
    this._materialProperty instanceof ColorMaterialProperty
      ? PerInstanceColorAppearance.VERTEX_FORMAT
      : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.length = cylinder.length.getValue(Iso8601.MINIMUM_VALUE);
  options.topRadius = cylinder.topRadius.getValue(Iso8601.MINIMUM_VALUE);
  options.bottomRadius = cylinder.bottomRadius.getValue(Iso8601.MINIMUM_VALUE);
  options.slices = Property.getValueOrUndefined(
    cylinder.slices,
    Iso8601.MINIMUM_VALUE,
  );
  options.numberOfVerticalLines = Property.getValueOrUndefined(
    cylinder.numberOfVerticalLines,
    Iso8601.MINIMUM_VALUE,
  );
  options.offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;
};

CylinderGeometryUpdater.prototype._onEntityPropertyChanged =
  heightReferenceOnEntityPropertyChanged;

CylinderGeometryUpdater.DynamicGeometryUpdater = DynamicCylinderGeometryUpdater;

/**
 * @private
 */
function DynamicCylinderGeometryUpdater(
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
  DynamicCylinderGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype,
  );
  DynamicCylinderGeometryUpdater.prototype.constructor =
    DynamicCylinderGeometryUpdater;
}

DynamicCylinderGeometryUpdater.prototype._isHidden = function (
  entity,
  cylinder,
  time,
) {
  const options = this._options;
  const position = Property.getValueOrUndefined(
    entity.position,
    time,
    positionScratch,
  );
  return (
    !defined(position) ||
    !defined(options.length) ||
    !defined(options.topRadius) || //
    !defined(options.bottomRadius) ||
    DynamicGeometryUpdater.prototype._isHidden.call(
      this,
      entity,
      cylinder,
      time,
    )
  );
};

DynamicCylinderGeometryUpdater.prototype._setOptions = function (
  entity,
  cylinder,
  time,
) {
  const heightReference = Property.getValueOrDefault(
    cylinder.heightReference,
    time,
    HeightReference.NONE,
  );
  const options = this._options;
  options.length = Property.getValueOrUndefined(cylinder.length, time);
  options.topRadius = Property.getValueOrUndefined(cylinder.topRadius, time);
  options.bottomRadius = Property.getValueOrUndefined(
    cylinder.bottomRadius,
    time,
  );
  options.slices = Property.getValueOrUndefined(cylinder.slices, time);
  options.numberOfVerticalLines = Property.getValueOrUndefined(
    cylinder.numberOfVerticalLines,
    time,
  );
  options.offsetAttribute =
    heightReference !== HeightReference.NONE
      ? GeometryOffsetAttribute.ALL
      : undefined;
};
export default CylinderGeometryUpdater;
