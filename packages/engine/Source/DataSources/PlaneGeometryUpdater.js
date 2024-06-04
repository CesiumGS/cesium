import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import ColorGeometryInstanceAttribute from "../Core/ColorGeometryInstanceAttribute.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayConditionGeometryInstanceAttribute from "../Core/DistanceDisplayConditionGeometryInstanceAttribute.js";
import GeometryInstance from "../Core/GeometryInstance.js";
import Iso8601 from "../Core/Iso8601.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import PlaneGeometry from "../Core/PlaneGeometry.js";
import PlaneOutlineGeometry from "../Core/PlaneOutlineGeometry.js";
import ShowGeometryInstanceAttribute from "../Core/ShowGeometryInstanceAttribute.js";
import MaterialAppearance from "../Scene/MaterialAppearance.js";
import PerInstanceColorAppearance from "../Scene/PerInstanceColorAppearance.js";
import ColorMaterialProperty from "./ColorMaterialProperty.js";
import DynamicGeometryUpdater from "./DynamicGeometryUpdater.js";
import GeometryUpdater from "./GeometryUpdater.js";
import Property from "./Property.js";

const positionScratch = new Cartesian3();
const scratchColor = new Color();

function PlaneGeometryOptions(entity) {
  this.id = entity;
  this.vertexFormat = undefined;
  this.plane = undefined;
  this.dimensions = undefined;
}

/**
 * A {@link GeometryUpdater} for planes.
 * Clients do not normally create this class directly, but instead rely on {@link DataSourceDisplay}.
 * @alias PlaneGeometryUpdater
 * @constructor
 *
 * @param {Entity} entity The entity containing the geometry to be visualized.
 * @param {Scene} scene The scene where visualization is taking place.
 */
function PlaneGeometryUpdater(entity, scene) {
  GeometryUpdater.call(this, {
    entity: entity,
    scene: scene,
    geometryOptions: new PlaneGeometryOptions(entity),
    geometryPropertyName: "plane",
    observedPropertyNames: ["availability", "position", "orientation", "plane"],
  });

  this._onEntityPropertyChanged(entity, "plane", entity.plane, undefined);
}

if (defined(Object.create)) {
  PlaneGeometryUpdater.prototype = Object.create(GeometryUpdater.prototype);
  PlaneGeometryUpdater.prototype.constructor = PlaneGeometryUpdater;
}

/**
 * Creates the geometry instance which represents the fill of the geometry.
 *
 * @param {JulianDate} time The time to use when retrieving initial attribute values.
 * @returns {GeometryInstance} The geometry instance representing the filled portion of the geometry.
 *
 * @exception {DeveloperError} This instance does not represent a filled geometry.
 */
PlaneGeometryUpdater.prototype.createFillGeometryInstance = function (time) {
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

  let attributes;

  let color;
  const show = new ShowGeometryInstanceAttribute(
    isAvailable &&
      entity.isShowing &&
      this._showProperty.getValue(time) &&
      this._fillProperty.getValue(time)
  );
  const distanceDisplayCondition = this._distanceDisplayConditionProperty.getValue(
    time
  );
  const distanceDisplayConditionAttribute = DistanceDisplayConditionGeometryInstanceAttribute.fromDistanceDisplayCondition(
    distanceDisplayCondition
  );
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

  const planeGraphics = entity.plane;
  const options = this._options;
  let modelMatrix = entity.computeModelMatrix(time);
  const plane = Property.getValueOrDefault(
    planeGraphics.plane,
    time,
    options.plane
  );
  const dimensions = Property.getValueOrUndefined(
    planeGraphics.dimensions,
    time,
    options.dimensions
  );

  options.plane = plane;
  options.dimensions = dimensions;

  modelMatrix = createPrimitiveMatrix(
    plane,
    dimensions,
    modelMatrix,
    modelMatrix
  );

  return new GeometryInstance({
    id: entity,
    geometry: new PlaneGeometry(this._options),
    modelMatrix: modelMatrix,
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
PlaneGeometryUpdater.prototype.createOutlineGeometryInstance = function (time) {
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

  const planeGraphics = entity.plane;
  const options = this._options;
  let modelMatrix = entity.computeModelMatrix(time);
  const plane = Property.getValueOrDefault(
    planeGraphics.plane,
    time,
    options.plane
  );
  const dimensions = Property.getValueOrUndefined(
    planeGraphics.dimensions,
    time,
    options.dimensions
  );

  options.plane = plane;
  options.dimensions = dimensions;

  modelMatrix = createPrimitiveMatrix(
    plane,
    dimensions,
    modelMatrix,
    modelMatrix
  );

  return new GeometryInstance({
    id: entity,
    geometry: new PlaneOutlineGeometry(),
    modelMatrix: modelMatrix,
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

PlaneGeometryUpdater.prototype._isHidden = function (entity, plane) {
  return (
    !defined(plane.plane) ||
    !defined(plane.dimensions) ||
    !defined(entity.position) ||
    GeometryUpdater.prototype._isHidden.call(this, entity, plane)
  );
};

PlaneGeometryUpdater.prototype._getIsClosed = function (options) {
  return false;
};

PlaneGeometryUpdater.prototype._isDynamic = function (entity, plane) {
  return (
    !entity.position.isConstant || //
    !Property.isConstant(entity.orientation) || //
    !plane.plane.isConstant || //
    !plane.dimensions.isConstant || //
    !Property.isConstant(plane.outlineWidth)
  );
};

PlaneGeometryUpdater.prototype._setStaticOptions = function (entity, plane) {
  const isColorMaterial =
    this._materialProperty instanceof ColorMaterialProperty;

  const options = this._options;
  options.vertexFormat = isColorMaterial
    ? PerInstanceColorAppearance.VERTEX_FORMAT
    : MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat;
  options.plane = plane.plane.getValue(Iso8601.MINIMUM_VALUE, options.plane);
  options.dimensions = plane.dimensions.getValue(
    Iso8601.MINIMUM_VALUE,
    options.dimensions
  );
};

PlaneGeometryUpdater.DynamicGeometryUpdater = DynamicPlaneGeometryUpdater;

/**
 * @private
 */
function DynamicPlaneGeometryUpdater(
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
  DynamicPlaneGeometryUpdater.prototype = Object.create(
    DynamicGeometryUpdater.prototype
  );
  DynamicPlaneGeometryUpdater.prototype.constructor = DynamicPlaneGeometryUpdater;
}

DynamicPlaneGeometryUpdater.prototype._isHidden = function (
  entity,
  plane,
  time
) {
  const options = this._options;
  const position = Property.getValueOrUndefined(
    entity.position,
    time,
    positionScratch
  );
  return (
    !defined(position) ||
    !defined(options.plane) ||
    !defined(options.dimensions) ||
    DynamicGeometryUpdater.prototype._isHidden.call(this, entity, plane, time)
  );
};

DynamicPlaneGeometryUpdater.prototype._setOptions = function (
  entity,
  plane,
  time
) {
  const options = this._options;
  options.plane = Property.getValueOrDefault(plane.plane, time, options.plane);
  options.dimensions = Property.getValueOrUndefined(
    plane.dimensions,
    time,
    options.dimensions
  );
};

const scratchAxis = new Cartesian3();
const scratchUp = new Cartesian3();
const scratchTranslation = new Cartesian3();
const scratchScale = new Cartesian3();
const scratchRotation = new Matrix3();
const scratchRotationScale = new Matrix3();
const scratchLocalTransform = new Matrix4();
function createPrimitiveMatrix(plane, dimensions, transform, result) {
  const normal = plane.normal;
  const distance = plane.distance;

  const translation = Cartesian3.multiplyByScalar(
    normal,
    -distance,
    scratchTranslation
  );

  let up = Cartesian3.clone(Cartesian3.UNIT_Z, scratchUp);
  if (
    CesiumMath.equalsEpsilon(
      Math.abs(Cartesian3.dot(up, normal)),
      1.0,
      CesiumMath.EPSILON8
    )
  ) {
    up = Cartesian3.clone(Cartesian3.UNIT_Y, up);
  }

  const left = Cartesian3.cross(up, normal, scratchAxis);
  up = Cartesian3.cross(normal, left, up);
  Cartesian3.normalize(left, left);
  Cartesian3.normalize(up, up);

  const rotationMatrix = scratchRotation;
  Matrix3.setColumn(rotationMatrix, 0, left, rotationMatrix);
  Matrix3.setColumn(rotationMatrix, 1, up, rotationMatrix);
  Matrix3.setColumn(rotationMatrix, 2, normal, rotationMatrix);

  const scale = Cartesian3.fromElements(
    dimensions.x,
    dimensions.y,
    1.0,
    scratchScale
  );
  const rotationScaleMatrix = Matrix3.multiplyByScale(
    rotationMatrix,
    scale,
    scratchRotationScale
  );

  const localTransform = Matrix4.fromRotationTranslation(
    rotationScaleMatrix,
    translation,
    scratchLocalTransform
  );
  return Matrix4.multiplyTransformation(transform, localTransform, result);
}

/**
 * @private
 */
PlaneGeometryUpdater.createPrimitiveMatrix = createPrimitiveMatrix;
export default PlaneGeometryUpdater;
