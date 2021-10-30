import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import Matrix4 from "../Core/Matrix4.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";

/**
 * A graphical point positioned in the 3D scene, that is created
 * and rendered using a {@link PointPrimitiveCollection}.  A point is created and its initial
 * properties are set by calling {@link PointPrimitiveCollection#add}.
 *
 * @alias PointPrimitive
 *
 * @performance Reading a property, e.g., {@link PointPrimitive#show}, is constant time.
 * Assigning to a property is constant time but results in
 * CPU to GPU traffic when {@link PointPrimitiveCollection#update} is called.  The per-pointPrimitive traffic is
 * the same regardless of how many properties were updated.  If most pointPrimitives in a collection need to be
 * updated, it may be more efficient to clear the collection with {@link PointPrimitiveCollection#removeAll}
 * and add new pointPrimitives instead of modifying each one.
 *
 * @exception {DeveloperError} scaleByDistance.far must be greater than scaleByDistance.near
 * @exception {DeveloperError} translucencyByDistance.far must be greater than translucencyByDistance.near
 * @exception {DeveloperError} distanceDisplayCondition.far must be greater than distanceDisplayCondition.near
 *
 * @see PointPrimitiveCollection
 * @see PointPrimitiveCollection#add
 *
 * @internalConstructor
 * @class
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Points.html|Cesium Sandcastle Points Demo}
 */
function PointPrimitive(options, pointPrimitiveCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (
    defined(options.disableDepthTestDistance) &&
    options.disableDepthTestDistance < 0.0
  ) {
    throw new DeveloperError(
      "disableDepthTestDistance must be greater than or equal to 0.0."
    );
  }
  //>>includeEnd('debug');

  var translucencyByDistance = options.translucencyByDistance;
  var scaleByDistance = options.scaleByDistance;
  var distanceDisplayCondition = options.distanceDisplayCondition;
  if (defined(translucencyByDistance)) {
    //>>includeStart('debug', pragmas.debug);
    if (translucencyByDistance.far <= translucencyByDistance.near) {
      throw new DeveloperError(
        "translucencyByDistance.far must be greater than translucencyByDistance.near."
      );
    }
    //>>includeEnd('debug');
    translucencyByDistance = NearFarScalar.clone(translucencyByDistance);
  }
  if (defined(scaleByDistance)) {
    //>>includeStart('debug', pragmas.debug);
    if (scaleByDistance.far <= scaleByDistance.near) {
      throw new DeveloperError(
        "scaleByDistance.far must be greater than scaleByDistance.near."
      );
    }
    //>>includeEnd('debug');
    scaleByDistance = NearFarScalar.clone(scaleByDistance);
  }
  if (defined(distanceDisplayCondition)) {
    //>>includeStart('debug', pragmas.debug);
    if (distanceDisplayCondition.far <= distanceDisplayCondition.near) {
      throw new DeveloperError(
        "distanceDisplayCondition.far must be greater than distanceDisplayCondition.near."
      );
    }
    //>>includeEnd('debug');
    distanceDisplayCondition = DistanceDisplayCondition.clone(
      distanceDisplayCondition
    );
  }

  this._show = defaultValue(options.show, true);
  this._position = Cartesian3.clone(
    defaultValue(options.position, Cartesian3.ZERO)
  );
  this._actualPosition = Cartesian3.clone(this._position); // For columbus view and 2D
  this._color = Color.clone(defaultValue(options.color, Color.WHITE));
  this._outlineColor = Color.clone(
    defaultValue(options.outlineColor, Color.TRANSPARENT)
  );
  this._outlineWidth = defaultValue(options.outlineWidth, 0.0);
  this._pixelSize = defaultValue(options.pixelSize, 10.0);
  this._scaleByDistance = scaleByDistance;
  this._translucencyByDistance = translucencyByDistance;
  this._distanceDisplayCondition = distanceDisplayCondition;
  this._disableDepthTestDistance = defaultValue(
    options.disableDepthTestDistance,
    0.0
  );
  this._id = options.id;
  this._collection = defaultValue(options.collection, pointPrimitiveCollection);

  this._clusterShow = true;

  this._pickId = undefined;
  this._pointPrimitiveCollection = pointPrimitiveCollection;
  this._dirty = false;
  this._index = -1; //Used only by PointPrimitiveCollection
}

var SHOW_INDEX = (PointPrimitive.SHOW_INDEX = 0);
var POSITION_INDEX = (PointPrimitive.POSITION_INDEX = 1);
var COLOR_INDEX = (PointPrimitive.COLOR_INDEX = 2);
var OUTLINE_COLOR_INDEX = (PointPrimitive.OUTLINE_COLOR_INDEX = 3);
var OUTLINE_WIDTH_INDEX = (PointPrimitive.OUTLINE_WIDTH_INDEX = 4);
var PIXEL_SIZE_INDEX = (PointPrimitive.PIXEL_SIZE_INDEX = 5);
var SCALE_BY_DISTANCE_INDEX = (PointPrimitive.SCALE_BY_DISTANCE_INDEX = 6);
var TRANSLUCENCY_BY_DISTANCE_INDEX = (PointPrimitive.TRANSLUCENCY_BY_DISTANCE_INDEX = 7);
var DISTANCE_DISPLAY_CONDITION_INDEX = (PointPrimitive.DISTANCE_DISPLAY_CONDITION_INDEX = 8);
var DISABLE_DEPTH_DISTANCE_INDEX = (PointPrimitive.DISABLE_DEPTH_DISTANCE_INDEX = 9);
PointPrimitive.NUMBER_OF_PROPERTIES = 10;

function makeDirty(pointPrimitive, propertyChanged) {
  var pointPrimitiveCollection = pointPrimitive._pointPrimitiveCollection;
  if (defined(pointPrimitiveCollection)) {
    pointPrimitiveCollection._updatePointPrimitive(
      pointPrimitive,
      propertyChanged
    );
    pointPrimitive._dirty = true;
  }
}

Object.defineProperties(PointPrimitive.prototype, {
  /**
   * Determines if this point will be shown.  Use this to hide or show a point, instead
   * of removing it and re-adding it to the collection.
   * @memberof PointPrimitive.prototype
   * @type {Boolean}
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

      if (this._show !== value) {
        this._show = value;
        makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this point.
   * @memberof PointPrimitive.prototype
   * @type {Cartesian3}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var position = this._position;
      if (!Cartesian3.equals(position, value)) {
        Cartesian3.clone(value, position);
        Cartesian3.clone(value, this._actualPosition);

        makeDirty(this, POSITION_INDEX);
      }
    },
  },

  /**
   * Gets or sets near and far scaling properties of a point based on the point's distance from the camera.
   * A point's scale will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the point's scale remains clamped to the nearest bound.  This scale
   * multiplies the pixelSize and outlineWidth to affect the total size of the point.  If undefined,
   * scaleByDistance will be disabled.
   * @memberof PointPrimitive.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a pointPrimitive's scaleByDistance to scale to 15 when the
   * // camera is 1500 meters from the pointPrimitive and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * p.scaleByDistance = new Cesium.NearFarScalar(1.5e2, 15, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable scaling by distance
   * p.scaleByDistance = undefined;
   */
  scaleByDistance: {
    get: function () {
      return this._scaleByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far <= value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');

      var scaleByDistance = this._scaleByDistance;
      if (!NearFarScalar.equals(scaleByDistance, value)) {
        this._scaleByDistance = NearFarScalar.clone(value, scaleByDistance);
        makeDirty(this, SCALE_BY_DISTANCE_INDEX);
      }
    },
  },

  /**
   * Gets or sets near and far translucency properties of a point based on the point's distance from the camera.
   * A point's translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the point's translucency remains clamped to the nearest bound.  If undefined,
   * translucencyByDistance will be disabled.
   * @memberof PointPrimitive.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a point's translucency to 1.0 when the
   * // camera is 1500 meters from the point and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * p.translucencyByDistance = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable translucency by distance
   * p.translucencyByDistance = undefined;
   */
  translucencyByDistance: {
    get: function () {
      return this._translucencyByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far <= value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');

      var translucencyByDistance = this._translucencyByDistance;
      if (!NearFarScalar.equals(translucencyByDistance, value)) {
        this._translucencyByDistance = NearFarScalar.clone(
          value,
          translucencyByDistance
        );
        makeDirty(this, TRANSLUCENCY_BY_DISTANCE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the inner size of the point in pixels.
   * @memberof PointPrimitive.prototype
   * @type {Number}
   */
  pixelSize: {
    get: function () {
      return this._pixelSize;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._pixelSize !== value) {
        this._pixelSize = value;
        makeDirty(this, PIXEL_SIZE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the inner color of the point.
   * The red, green, blue, and alpha values are indicated by <code>value</code>'s <code>red</code>, <code>green</code>,
   * <code>blue</code>, and <code>alpha</code> properties as shown in Example 1.  These components range from <code>0.0</code>
   * (no intensity) to <code>1.0</code> (full intensity).
   * @memberof PointPrimitive.prototype
   * @type {Color}
   *
   * @example
   * // Example 1. Assign yellow.
   * p.color = Cesium.Color.YELLOW;
   *
   * @example
   * // Example 2. Make a pointPrimitive 50% translucent.
   * p.color = new Cesium.Color(1.0, 1.0, 1.0, 0.5);
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var color = this._color;
      if (!Color.equals(color, value)) {
        Color.clone(value, color);
        makeDirty(this, COLOR_INDEX);
      }
    },
  },

  /**
   * Gets or sets the outline color of the point.
   * @memberof PointPrimitive.prototype
   * @type {Color}
   */
  outlineColor: {
    get: function () {
      return this._outlineColor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var outlineColor = this._outlineColor;
      if (!Color.equals(outlineColor, value)) {
        Color.clone(value, outlineColor);
        makeDirty(this, OUTLINE_COLOR_INDEX);
      }
    },
  },

  /**
   * Gets or sets the outline width in pixels.  This width adds to pixelSize,
   * increasing the total size of the point.
   * @memberof PointPrimitive.prototype
   * @type {Number}
   */
  outlineWidth: {
    get: function () {
      return this._outlineWidth;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._outlineWidth !== value) {
        this._outlineWidth = value;
        makeDirty(this, OUTLINE_WIDTH_INDEX);
      }
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this point will be displayed.
   * @memberof PointPrimitive.prototype
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
        throw new DeveloperError("far must be greater than near");
      }
      //>>includeEnd('debug');
      if (
        !DistanceDisplayCondition.equals(this._distanceDisplayCondition, value)
      ) {
        this._distanceDisplayCondition = DistanceDisplayCondition.clone(
          value,
          this._distanceDisplayCondition
        );
        makeDirty(this, DISTANCE_DISPLAY_CONDITION_INDEX);
      }
    },
  },

  /**
   * Gets or sets the distance from the camera at which to disable the depth test to, for example, prevent clipping against terrain.
   * When set to zero, the depth test is always applied. When set to Number.POSITIVE_INFINITY, the depth test is never applied.
   * @memberof PointPrimitive.prototype
   * @type {Number}
   * @default 0.0
   */
  disableDepthTestDistance: {
    get: function () {
      return this._disableDepthTestDistance;
    },
    set: function (value) {
      if (this._disableDepthTestDistance !== value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value) || value < 0.0) {
          throw new DeveloperError(
            "disableDepthTestDistance must be greater than or equal to 0.0."
          );
        }
        //>>includeEnd('debug');
        this._disableDepthTestDistance = value;
        makeDirty(this, DISABLE_DEPTH_DISTANCE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the user-defined value returned when the point is picked.
   * @memberof PointPrimitive.prototype
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
   * Determines whether or not this point will be shown or hidden because it was clustered.
   * @memberof PointPrimitive.prototype
   * @type {Boolean}
   * @private
   */
  clusterShow: {
    get: function () {
      return this._clusterShow;
    },
    set: function (value) {
      if (this._clusterShow !== value) {
        this._clusterShow = value;
        makeDirty(this, SHOW_INDEX);
      }
    },
  },
});

PointPrimitive.prototype.getPickId = function (context) {
  if (!defined(this._pickId)) {
    this._pickId = context.createPickId({
      primitive: this,
      collection: this._collection,
      id: this._id,
    });
  }

  return this._pickId;
};

PointPrimitive.prototype._getActualPosition = function () {
  return this._actualPosition;
};

PointPrimitive.prototype._setActualPosition = function (value) {
  Cartesian3.clone(value, this._actualPosition);
  makeDirty(this, POSITION_INDEX);
};

var tempCartesian3 = new Cartesian4();
PointPrimitive._computeActualPosition = function (
  position,
  frameState,
  modelMatrix
) {
  if (frameState.mode === SceneMode.SCENE3D) {
    return position;
  }

  Matrix4.multiplyByPoint(modelMatrix, position, tempCartesian3);
  return SceneTransforms.computeActualWgs84Position(frameState, tempCartesian3);
};

var scratchCartesian4 = new Cartesian4();

// This function is basically a stripped-down JavaScript version of PointPrimitiveCollectionVS.glsl
PointPrimitive._computeScreenSpacePosition = function (
  modelMatrix,
  position,
  scene,
  result
) {
  // Model to world coordinates
  var positionWorld = Matrix4.multiplyByVector(
    modelMatrix,
    Cartesian4.fromElements(
      position.x,
      position.y,
      position.z,
      1,
      scratchCartesian4
    ),
    scratchCartesian4
  );
  var positionWC = SceneTransforms.wgs84ToWindowCoordinates(
    scene,
    positionWorld,
    result
  );
  return positionWC;
};

/**
 * Computes the screen-space position of the point's origin.
 * The screen space origin is the top, left corner of the canvas; <code>x</code> increases from
 * left to right, and <code>y</code> increases from top to bottom.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian2} [result] The object onto which to store the result.
 * @returns {Cartesian2} The screen-space position of the point.
 *
 * @exception {DeveloperError} PointPrimitive must be in a collection.
 *
 * @example
 * console.log(p.computeScreenSpacePosition(scene).toString());
 */
PointPrimitive.prototype.computeScreenSpacePosition = function (scene, result) {
  var pointPrimitiveCollection = this._pointPrimitiveCollection;
  if (!defined(result)) {
    result = new Cartesian2();
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(pointPrimitiveCollection)) {
    throw new DeveloperError("PointPrimitive must be in a collection.");
  }
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  var modelMatrix = pointPrimitiveCollection.modelMatrix;
  var windowCoordinates = PointPrimitive._computeScreenSpacePosition(
    modelMatrix,
    this._actualPosition,
    scene,
    result
  );
  if (!defined(windowCoordinates)) {
    return undefined;
  }

  windowCoordinates.y = scene.canvas.clientHeight - windowCoordinates.y;
  return windowCoordinates;
};

/**
 * Gets a point's screen space bounding box centered around screenSpacePosition.
 * @param {PointPrimitive} point The point to get the screen space bounding box for.
 * @param {Cartesian2} screenSpacePosition The screen space center of the label.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The screen space bounding box.
 *
 * @private
 */
PointPrimitive.getScreenSpaceBoundingBox = function (
  point,
  screenSpacePosition,
  result
) {
  var size = point.pixelSize;
  var halfSize = size * 0.5;

  var x = screenSpacePosition.x - halfSize;
  var y = screenSpacePosition.y - halfSize;
  var width = size;
  var height = size;

  if (!defined(result)) {
    result = new BoundingRectangle();
  }

  result.x = x;
  result.y = y;
  result.width = width;
  result.height = height;

  return result;
};

/**
 * Determines if this point equals another point.  Points are equal if all their properties
 * are equal.  Points in different collections can be equal.
 *
 * @param {PointPrimitive} other The point to compare for equality.
 * @returns {Boolean} <code>true</code> if the points are equal; otherwise, <code>false</code>.
 */
PointPrimitive.prototype.equals = function (other) {
  return (
    this === other ||
    (defined(other) &&
      this._id === other._id &&
      Cartesian3.equals(this._position, other._position) &&
      Color.equals(this._color, other._color) &&
      this._pixelSize === other._pixelSize &&
      this._outlineWidth === other._outlineWidth &&
      this._show === other._show &&
      Color.equals(this._outlineColor, other._outlineColor) &&
      NearFarScalar.equals(this._scaleByDistance, other._scaleByDistance) &&
      NearFarScalar.equals(
        this._translucencyByDistance,
        other._translucencyByDistance
      ) &&
      DistanceDisplayCondition.equals(
        this._distanceDisplayCondition,
        other._distanceDisplayCondition
      ) &&
      this._disableDepthTestDistance === other._disableDepthTestDistance)
  );
};

PointPrimitive.prototype._destroy = function () {
  this._pickId = this._pickId && this._pickId.destroy();
  this._pointPrimitiveCollection = undefined;
};
export default PointPrimitive;
