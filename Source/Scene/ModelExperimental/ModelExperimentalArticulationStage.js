import ArticulationStageType from "../../Core/ArticulationStageType.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";
import Check from "../../Core/Check.js";
import defaultValue from "../../Core/defaultValue.js";
import Matrix3 from "../../Core/Matrix3";
import Matrix4 from "../../Core/Matrix4.js";

const articulationEpsilon = CesiumMath.EPSILON16;

/**
 * An in-memory representation of an articulation stage belonging to a
 * {@link ModelExperimentalArticulation}. that affects nodes
 * in the {@link ModelExperimentalSceneGraph}.
 *
 * @param {Object} options An object containing the following options:
 * @param {ModelComponents.ArticulationStage} options.stage The articulation stage components from the 3D model.
 * @param {ModelExperimentalArticulation} options.runtimeArticulation The runtime articulation that this stage belongs to.
 *
 * @alias ModelExperimentalArticulationStage
 * @constructor
 *
 * @private
 */
export default function ModelExperimentalArticulationStage(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  const stage = options.stage;
  const runtimeArticulation = options.runtimeArticulation;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.stage", stage);
  Check.typeOf.object("options.runtimeArticulation", runtimeArticulation);
  //>>includeEnd('debug');

  this._stage = stage;
  this._runtimeArticulation = runtimeArticulation;

  this._name = stage.name;
  this._type = stage.type;
  this._minimumValue = stage.minimumValue;
  this._maximumValue = stage.maximumValue;
  this._currentValue = stage.initialValue;
}

Object.defineProperties(ModelExperimentalArticulationStage.prototype, {
  /**
   * The internal articulation stage that this runtime stage represents.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {ModelComponents.ArticulationStage}
   * @readonly
   *
   * @private
   */
  stage: {
    get: function () {
      return this._stage;
    },
  },

  /**
   * The runtime articulation that this stage belongs to.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {ModelExperimentalArticulation}
   * @readonly
   *
   * @private
   */
  runtimeArticulation: {
    get: function () {
      return this._runtimeArticulation;
    },
  },

  /**
   * The name of this articulation stage.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {String}
   * @readonly
   *
   * @private
   */
  name: {
    get: function () {
      return this._name;
    },
  },

  /**
   * The type of this articulation stage. This specifies which of the
   * node's properties is modified by the stage's value.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {ArticulationStageType}
   * @readonly
   *
   * @private
   */
  type: {
    get: function () {
      return this._type;
    },
  },

  /**
   * The minimum value of this articulation stage.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {Number}
   * @readonly
   *
   * @private
   */
  minimumValue: {
    get: function () {
      return this._minimumValue;
    },
  },

  /**
   * The maximum value of this articulation stage.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {Number}
   * @readonly
   *
   * @private
   */
  maximumValue: {
    get: function () {
      return this._maximumValue;
    },
  },

  /**
   * The current value of this articulation stage.
   *
   * @memberof ModelExperimentalArticulationStage.prototype
   * @type {Number}
   *
   * @private
   */
  currentValue: {
    get: function () {
      return this._currentValue;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      value = CesiumMath.clamp(value, this.minimumValue, this.maximumValue);
      if (
        !CesiumMath.equalsEpsilon(
          this._currentValue,
          value,
          articulationEpsilon
        )
      ) {
        this._currentValue = value;
        this.runtimeArticulation._dirty = true;
      }
    },
  },
});

const scratchArticulationCartesian = new Cartesian3();
const scratchArticulationRotation = new Matrix3();

/**
 * Modifies a Matrix4 by applying a transformation for a given value of a stage.
 * Note this is different usage from the typical <code>result</code> parameter,
 * in that the incoming value of <code>result</code> is meaningful. Various stages
 * of an articulation can be multiplied together, so their transformations are
 * all merged into a composite Matrix4 representing them all.
 *
 * @param {Matrix4} result The matrix to be modified.
 * @returns {Matrix4} The transformed matrix as requested by the articulation stage.
 *
 * @private
 */
ModelExperimentalArticulationStage.prototype.applyStageToMatrix = function (
  result
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  const type = this.type;
  const value = this.currentValue;
  const cartesian = scratchArticulationCartesian;
  let rotation;
  switch (type) {
    case ArticulationStageType.XROTATE:
      rotation = Matrix3.fromRotationX(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case ArticulationStageType.YROTATE:
      rotation = Matrix3.fromRotationY(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case ArticulationStageType.ZROTATE:
      rotation = Matrix3.fromRotationZ(
        CesiumMath.toRadians(value),
        scratchArticulationRotation
      );
      Matrix4.multiplyByMatrix3(result, rotation, result);
      break;
    case ArticulationStageType.XTRANSLATE:
      cartesian.x = value;
      cartesian.y = 0.0;
      cartesian.z = 0.0;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case ArticulationStageType.YTRANSLATE:
      cartesian.x = 0.0;
      cartesian.y = value;
      cartesian.z = 0.0;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case ArticulationStageType.ZTRANSLATE:
      cartesian.x = 0.0;
      cartesian.y = 0.0;
      cartesian.z = value;
      Matrix4.multiplyByTranslation(result, cartesian, result);
      break;
    case ArticulationStageType.XSCALE:
      cartesian.x = value;
      cartesian.y = 1.0;
      cartesian.z = 1.0;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case ArticulationStageType.YSCALE:
      cartesian.x = 1.0;
      cartesian.y = value;
      cartesian.z = 1.0;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case ArticulationStageType.ZSCALE:
      cartesian.x = 1.0;
      cartesian.y = 1.0;
      cartesian.z = value;
      Matrix4.multiplyByScale(result, cartesian, result);
      break;
    case ArticulationStageType.UNIFORMSCALE:
      Matrix4.multiplyByUniformScale(result, value, result);
      break;
    default:
      break;
  }

  return result;
};
