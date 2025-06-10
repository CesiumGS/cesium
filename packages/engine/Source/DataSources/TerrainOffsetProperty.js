import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Event from "../Core/Event.js";
import Iso8601 from "../Core/Iso8601.js";
import JulianDate from "../Core/JulianDate.js";
import CesiumMath from "../Core/Math.js";
import HeightReference, {
  isHeightReferenceRelative,
} from "../Scene/HeightReference.js";
import Property from "./Property.js";

const scratchPosition = new Cartesian3();

/**
 * @private
 */
function TerrainOffsetProperty(
  scene,
  positionProperty,
  heightReferenceProperty,
  extrudedHeightReferenceProperty,
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("scene", scene);
  Check.defined("positionProperty", positionProperty);
  //>>includeEnd('debug');

  this._scene = scene;
  this._heightReference = heightReferenceProperty;
  this._extrudedHeightReference = extrudedHeightReferenceProperty;
  this._positionProperty = positionProperty;

  this._position = new Cartesian3();
  this._cartographicPosition = new Cartographic();
  this._normal = new Cartesian3();

  this._definitionChanged = new Event();
  this._terrainHeight = 0;
  this._removeCallbackFunc = undefined;
  this._removeEventListener = undefined;
  this._removeModeListener = undefined;

  const that = this;
  if (defined(scene.globe)) {
    this._removeEventListener = scene.terrainProviderChanged.addEventListener(
      function () {
        that._updateClamping();
      },
    );
    this._removeModeListener = scene.morphComplete.addEventListener(
      function () {
        that._updateClamping();
      },
    );
  }

  if (positionProperty.isConstant) {
    const position = positionProperty.getValue(
      Iso8601.MINIMUM_VALUE,
      scratchPosition,
    );
    if (
      !defined(position) ||
      Cartesian3.equals(position, Cartesian3.ZERO) ||
      !defined(scene.globe)
    ) {
      return;
    }
    this._position = Cartesian3.clone(position, this._position);

    this._updateClamping();

    this._normal = scene.ellipsoid.geodeticSurfaceNormal(
      position,
      this._normal,
    );
  }
}

Object.defineProperties(TerrainOffsetProperty.prototype, {
  /**
   * Gets a value indicating if this property is constant.
   * @memberof TerrainOffsetProperty.prototype
   *
   * @type {boolean}
   * @readonly
   */
  isConstant: {
    get: function () {
      return false;
    },
  },
  /**
   * Gets the event that is raised whenever the definition of this property changes.
   * @memberof TerrainOffsetProperty.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },
});

/**
 * @private
 */
TerrainOffsetProperty.prototype._updateClamping = function () {
  if (defined(this._removeCallbackFunc)) {
    this._removeCallbackFunc();
  }

  const scene = this._scene;
  const position = this._position;

  if (Cartesian3.equals(position, Cartesian3.ZERO)) {
    this._terrainHeight = 0;
    return;
  }
  const ellipsoid = scene.ellipsoid;
  const cartographicPosition = ellipsoid.cartesianToCartographic(
    position,
    this._cartographicPosition,
  );

  const height = scene.getHeight(cartographicPosition, this._heightReference);
  if (defined(height)) {
    this._terrainHeight = height;
  } else {
    this._terrainHeight = 0;
  }

  const updateFunction = (clampedPosition) => {
    this._terrainHeight = clampedPosition.height;
    this.definitionChanged.raiseEvent();
  };

  this._removeCallbackFunc = scene.updateHeight(
    cartographicPosition,
    updateFunction,
    this._heightReference,
  );
};

const timeScratch = new JulianDate();

/**
 * Gets the height relative to the terrain based on the positions.
 *
 * @param {JulianDate} [time=JulianDate.now()] The time for which to retrieve the value. If omitted, the current system time is used.
 * @param {object} [result] The object to store the value into, if omitted, a new instance is created and returned.
 * @returns {Cartesian3} The offset
 */
TerrainOffsetProperty.prototype.getValue = function (time, result) {
  if (!defined(time)) {
    time = JulianDate.now(timeScratch);
  }

  const heightReference = Property.getValueOrDefault(
    this._heightReference,
    time,
    HeightReference.NONE,
  );
  const extrudedHeightReference = Property.getValueOrDefault(
    this._extrudedHeightReference,
    time,
    HeightReference.NONE,
  );

  if (
    heightReference === HeightReference.NONE &&
    !isHeightReferenceRelative(extrudedHeightReference)
  ) {
    this._position = Cartesian3.clone(Cartesian3.ZERO, this._position);
    return Cartesian3.clone(Cartesian3.ZERO, result);
  }

  if (this._positionProperty.isConstant) {
    return Cartesian3.multiplyByScalar(
      this._normal,
      this._terrainHeight,
      result,
    );
  }

  const scene = this._scene;
  const position = this._positionProperty.getValue(time, scratchPosition);
  if (
    !defined(position) ||
    Cartesian3.equals(position, Cartesian3.ZERO) ||
    !defined(scene.globe)
  ) {
    return Cartesian3.clone(Cartesian3.ZERO, result);
  }

  if (
    Cartesian3.equalsEpsilon(this._position, position, CesiumMath.EPSILON10)
  ) {
    return Cartesian3.multiplyByScalar(
      this._normal,
      this._terrainHeight,
      result,
    );
  }

  this._position = Cartesian3.clone(position, this._position);

  this._updateClamping();

  const normal = scene.ellipsoid.geodeticSurfaceNormal(position, this._normal);
  return Cartesian3.multiplyByScalar(normal, this._terrainHeight, result);
};

TerrainOffsetProperty.prototype.isDestroyed = function () {
  return false;
};

TerrainOffsetProperty.prototype.destroy = function () {
  if (defined(this._removeEventListener)) {
    this._removeEventListener();
  }
  if (defined(this._removeModeListener)) {
    this._removeModeListener();
  }
  if (defined(this._removeCallbackFunc)) {
    this._removeCallbackFunc();
  }
  return destroyObject(this);
};

/**
 * A function which creates one or more providers.
 * @callback TerrainOffsetProperty.PositionFunction
 * @param {JulianDate} time The clock time at which to retrieve the position
 * @param {Cartesian3} result The result position
 * @returns {Cartesian3} The position at which to do the terrain height check
 */
export default TerrainOffsetProperty;
