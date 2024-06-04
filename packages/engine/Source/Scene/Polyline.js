import arrayRemoveDuplicates from "../Core/arrayRemoveDuplicates.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import Matrix4 from "../Core/Matrix4.js";
import PolylinePipeline from "../Core/PolylinePipeline.js";
import Material from "./Material.js";

/**
 * <div class="notice">
 * Create this by calling {@link PolylineCollection#add}. Do not call the constructor directly.
 * </div>
 *
 * A renderable polyline.
 *
 * @alias Polyline
 * @internalConstructor
 * @class
 *
 * @privateParam {object} options Object with the following properties:
 * @privateParam {boolean} [options.show=true] <code>true</code> if this polyline will be shown; otherwise, <code>false</code>.
 * @privateParam {number} [options.width=1.0] The width of the polyline in pixels.
 * @privateParam {boolean} [options.loop=false] Whether a line segment will be added between the last and first line positions to make this line a loop.
 * @privateParam {Material} [options.material=Material.ColorType] The material.
 * @privateParam {Cartesian3[]} [options.positions] The positions.
 * @privateParam {object} [options.id] The user-defined object to be returned when this polyline is picked.
 * @privateParam {DistanceDisplayCondition} [options.distanceDisplayCondition] The condition specifying at what distance from the camera that this polyline will be displayed.
 * @privateParam {PolylineCollection} polylineCollection The renderable polyline collection.
 *
 * @see PolylineCollection
 *
 */
function Polyline(options, polylineCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._show = defaultValue(options.show, true);
  this._width = defaultValue(options.width, 1.0);
  this._loop = defaultValue(options.loop, false);
  this._distanceDisplayCondition = options.distanceDisplayCondition;

  this._material = options.material;
  if (!defined(this._material)) {
    this._material = Material.fromType(Material.ColorType, {
      color: new Color(1.0, 1.0, 1.0, 1.0),
    });
  }

  let positions = options.positions;
  if (!defined(positions)) {
    positions = [];
  }

  this._positions = positions;
  this._actualPositions = arrayRemoveDuplicates(
    positions,
    Cartesian3.equalsEpsilon
  );

  if (this._loop && this._actualPositions.length > 2) {
    if (this._actualPositions === this._positions) {
      this._actualPositions = positions.slice();
    }
    this._actualPositions.push(Cartesian3.clone(this._actualPositions[0]));
  }

  this._length = this._actualPositions.length;
  this._id = options.id;

  let modelMatrix;
  if (defined(polylineCollection)) {
    modelMatrix = Matrix4.clone(polylineCollection.modelMatrix);
  }

  this._modelMatrix = modelMatrix;
  this._segments = PolylinePipeline.wrapLongitude(
    this._actualPositions,
    modelMatrix
  );

  this._actualLength = undefined;

  // eslint-disable-next-line no-use-before-define
  this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
  this._polylineCollection = polylineCollection;
  this._dirty = false;
  this._pickId = undefined;
  this._boundingVolume = BoundingSphere.fromPoints(this._actualPositions);
  this._boundingVolumeWC = BoundingSphere.transform(
    this._boundingVolume,
    this._modelMatrix
  );
  this._boundingVolume2D = new BoundingSphere(); // modified in PolylineCollection
}

const POSITION_INDEX = (Polyline.POSITION_INDEX = 0);
const SHOW_INDEX = (Polyline.SHOW_INDEX = 1);
const WIDTH_INDEX = (Polyline.WIDTH_INDEX = 2);
const MATERIAL_INDEX = (Polyline.MATERIAL_INDEX = 3);
const POSITION_SIZE_INDEX = (Polyline.POSITION_SIZE_INDEX = 4);
const DISTANCE_DISPLAY_CONDITION = (Polyline.DISTANCE_DISPLAY_CONDITION = 5);
const NUMBER_OF_PROPERTIES = (Polyline.NUMBER_OF_PROPERTIES = 6);

function makeDirty(polyline, propertyChanged) {
  ++polyline._propertiesChanged[propertyChanged];
  const polylineCollection = polyline._polylineCollection;
  if (defined(polylineCollection)) {
    polylineCollection._updatePolyline(polyline, propertyChanged);
    polyline._dirty = true;
  }
}

Object.defineProperties(Polyline.prototype, {
  /**
   * Determines if this polyline will be shown.  Use this to hide or show a polyline, instead
   * of removing it and re-adding it to the collection.
   * @memberof Polyline.prototype
   * @type {boolean}
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (value !== this._show) {
        this._show = value;
        makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the positions of the polyline.
   * @memberof Polyline.prototype
   * @type {Cartesian3[]}
   * @example
   * polyline.positions = Cesium.Cartesian3.fromDegreesArray([
   *     0.0, 0.0,
   *     10.0, 0.0,
   *     0.0, 20.0
   * ]);
   */
  positions: {
    get: function () {
      return this._positions;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      let positions = arrayRemoveDuplicates(value, Cartesian3.equalsEpsilon);

      if (this._loop && positions.length > 2) {
        if (positions === value) {
          positions = value.slice();
        }
        positions.push(Cartesian3.clone(positions[0]));
      }

      if (
        this._actualPositions.length !== positions.length ||
        this._actualPositions.length !== this._length
      ) {
        makeDirty(this, POSITION_SIZE_INDEX);
      }

      this._positions = value;
      this._actualPositions = positions;
      this._length = positions.length;
      this._boundingVolume = BoundingSphere.fromPoints(
        this._actualPositions,
        this._boundingVolume
      );
      this._boundingVolumeWC = BoundingSphere.transform(
        this._boundingVolume,
        this._modelMatrix,
        this._boundingVolumeWC
      );
      makeDirty(this, POSITION_INDEX);

      this.update();
    },
  },

  /**
   * Gets or sets the surface appearance of the polyline.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
   * {@link https://github.com/CesiumGS/cesium/wiki/Fabric|Fabric}.
   * @memberof Polyline.prototype
   * @type {Material}
   */
  material: {
    get: function () {
      return this._material;
    },
    set: function (material) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(material)) {
        throw new DeveloperError("material is required.");
      }
      //>>includeEnd('debug');

      if (this._material !== material) {
        this._material = material;
        makeDirty(this, MATERIAL_INDEX);
      }
    },
  },

  /**
   * Gets or sets the width of the polyline.
   * @memberof Polyline.prototype
   * @type {number}
   */
  width: {
    get: function () {
      return this._width;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const width = this._width;
      if (value !== width) {
        this._width = value;
        makeDirty(this, WIDTH_INDEX);
      }
    },
  },

  /**
   * Gets or sets whether a line segment will be added between the first and last polyline positions.
   * @memberof Polyline.prototype
   * @type {boolean}
   */
  loop: {
    get: function () {
      return this._loop;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (value !== this._loop) {
        let positions = this._actualPositions;
        if (value) {
          if (
            positions.length > 2 &&
            !Cartesian3.equals(positions[0], positions[positions.length - 1])
          ) {
            if (positions.length === this._positions.length) {
              this._actualPositions = positions = this._positions.slice();
            }
            positions.push(Cartesian3.clone(positions[0]));
          }
        } else if (
          positions.length > 2 &&
          Cartesian3.equals(positions[0], positions[positions.length - 1])
        ) {
          if (positions.length - 1 === this._positions.length) {
            this._actualPositions = this._positions;
          } else {
            positions.pop();
          }
        }

        this._loop = value;
        makeDirty(this, POSITION_SIZE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the user-defined value returned when the polyline is picked.
   * @memberof Polyline.prototype
   * @type {*}
   */
  id: {
    get: function () {
      return this._id;
    },
    set: function (value) {
      this._id = value;
      if (defined(this._pickId)) {
        this._pickId.object.id = value;
      }
    },
  },

  /**
   * @private
   */
  pickId: {
    get: function () {
      return this._pickId;
    },
  },

  /**
   * Gets the destruction status of this polyline
   * @memberof Polyline.prototype
   * @type {boolean}
   * @default false
   * @private
   */
  isDestroyed: {
    get: function () {
      return !defined(this._polylineCollection);
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this polyline will be displayed.
   * @memberof Polyline.prototype
   * @type {DistanceDisplayCondition}
   * @default undefined
   */
  distanceDisplayCondition: {
    get: function () {
      return this._distanceDisplayCondition;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far <= value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');
      if (
        !DistanceDisplayCondition.equals(value, this._distanceDisplayCondition)
      ) {
        this._distanceDisplayCondition = DistanceDisplayCondition.clone(
          value,
          this._distanceDisplayCondition
        );
        makeDirty(this, DISTANCE_DISPLAY_CONDITION);
      }
    },
  },
});

/**
 * @private
 */
Polyline.prototype.update = function () {
  let modelMatrix = Matrix4.IDENTITY;
  if (defined(this._polylineCollection)) {
    modelMatrix = this._polylineCollection.modelMatrix;
  }

  const segmentPositionsLength = this._segments.positions.length;
  const segmentLengths = this._segments.lengths;

  const positionsChanged =
    this._propertiesChanged[POSITION_INDEX] > 0 ||
    this._propertiesChanged[POSITION_SIZE_INDEX] > 0;
  if (!Matrix4.equals(modelMatrix, this._modelMatrix) || positionsChanged) {
    this._segments = PolylinePipeline.wrapLongitude(
      this._actualPositions,
      modelMatrix
    );
    this._boundingVolumeWC = BoundingSphere.transform(
      this._boundingVolume,
      modelMatrix,
      this._boundingVolumeWC
    );
  }

  this._modelMatrix = Matrix4.clone(modelMatrix, this._modelMatrix);

  if (this._segments.positions.length !== segmentPositionsLength) {
    // number of positions changed
    makeDirty(this, POSITION_SIZE_INDEX);
  } else {
    const length = segmentLengths.length;
    for (let i = 0; i < length; ++i) {
      if (segmentLengths[i] !== this._segments.lengths[i]) {
        // indices changed
        makeDirty(this, POSITION_SIZE_INDEX);
        break;
      }
    }
  }
};

/**
 * @private
 */
Polyline.prototype.getPickId = function (context) {
  if (!defined(this._pickId)) {
    this._pickId = context.createPickId({
      primitive: this,
      collection: this._polylineCollection,
      id: this._id,
    });
  }
  return this._pickId;
};

Polyline.prototype._clean = function () {
  this._dirty = false;
  const properties = this._propertiesChanged;
  for (let k = 0; k < NUMBER_OF_PROPERTIES - 1; ++k) {
    properties[k] = 0;
  }
};

Polyline.prototype._destroy = function () {
  this._pickId = this._pickId && this._pickId.destroy();
  this._material = this._material && this._material.destroy();
  this._polylineCollection = undefined;
};
export default Polyline;
