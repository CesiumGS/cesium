import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Cartographic from "../Core/Cartographic.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import createGuid from "../Core/createGuid.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import Matrix4 from "../Core/Matrix4.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Resource from "../Core/Resource.js";
import HeightReference from "./HeightReference.js";
import HorizontalOrigin from "./HorizontalOrigin.js";
import SceneMode from "./SceneMode.js";
import SceneTransforms from "./SceneTransforms.js";
import VerticalOrigin from "./VerticalOrigin.js";

/**
 * A viewport-aligned image positioned in the 3D scene, that is created
 * and rendered using a {@link BillboardCollection}.  A billboard is created and its initial
 * properties are set by calling {@link BillboardCollection#add}.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/Billboard.png' width='400' height='300' /><br />
 * Example billboards
 * </div>
 *
 * @alias Billboard
 *
 * @performance Reading a property, e.g., {@link Billboard#show}, is constant time.
 * Assigning to a property is constant time but results in
 * CPU to GPU traffic when {@link BillboardCollection#update} is called.  The per-billboard traffic is
 * the same regardless of how many properties were updated.  If most billboards in a collection need to be
 * updated, it may be more efficient to clear the collection with {@link BillboardCollection#removeAll}
 * and add new billboards instead of modifying each one.
 *
 * @exception {DeveloperError} scaleByDistance.far must be greater than scaleByDistance.near
 * @exception {DeveloperError} translucencyByDistance.far must be greater than translucencyByDistance.near
 * @exception {DeveloperError} pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near
 * @exception {DeveloperError} distanceDisplayCondition.far must be greater than distanceDisplayCondition.near
 *
 * @see BillboardCollection
 * @see BillboardCollection#add
 * @see Label
 *
 * @internalConstructor
 * @class
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Billboards.html|Cesium Sandcastle Billboard Demo}
 */
function Billboard(options, billboardCollection) {
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
  var pixelOffsetScaleByDistance = options.pixelOffsetScaleByDistance;
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
  if (defined(pixelOffsetScaleByDistance)) {
    //>>includeStart('debug', pragmas.debug);
    if (pixelOffsetScaleByDistance.far <= pixelOffsetScaleByDistance.near) {
      throw new DeveloperError(
        "pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near."
      );
    }
    //>>includeEnd('debug');
    pixelOffsetScaleByDistance = NearFarScalar.clone(
      pixelOffsetScaleByDistance
    );
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
  this._pixelOffset = Cartesian2.clone(
    defaultValue(options.pixelOffset, Cartesian2.ZERO)
  );
  this._translate = new Cartesian2(0.0, 0.0); // used by labels for glyph vertex translation
  this._eyeOffset = Cartesian3.clone(
    defaultValue(options.eyeOffset, Cartesian3.ZERO)
  );
  this._heightReference = defaultValue(
    options.heightReference,
    HeightReference.NONE
  );
  this._verticalOrigin = defaultValue(
    options.verticalOrigin,
    VerticalOrigin.CENTER
  );
  this._horizontalOrigin = defaultValue(
    options.horizontalOrigin,
    HorizontalOrigin.CENTER
  );
  this._scale = defaultValue(options.scale, 1.0);
  this._color = Color.clone(defaultValue(options.color, Color.WHITE));
  this._rotation = defaultValue(options.rotation, 0.0);
  this._alignedAxis = Cartesian3.clone(
    defaultValue(options.alignedAxis, Cartesian3.ZERO)
  );
  this._width = options.width;
  this._height = options.height;
  this._scaleByDistance = scaleByDistance;
  this._translucencyByDistance = translucencyByDistance;
  this._pixelOffsetScaleByDistance = pixelOffsetScaleByDistance;
  this._sizeInMeters = defaultValue(options.sizeInMeters, false);
  this._distanceDisplayCondition = distanceDisplayCondition;
  this._disableDepthTestDistance = options.disableDepthTestDistance;
  this._id = options.id;
  this._collection = defaultValue(options.collection, billboardCollection);

  this._pickId = undefined;
  this._pickPrimitive = defaultValue(options._pickPrimitive, this);
  this._billboardCollection = billboardCollection;
  this._dirty = false;
  this._index = -1; //Used only by BillboardCollection
  this._batchIndex = undefined; // Used only by Vector3DTilePoints and BillboardCollection

  this._imageIndex = -1;
  this._imageIndexPromise = undefined;
  this._imageId = undefined;
  this._image = undefined;
  this._imageSubRegion = undefined;
  this._imageWidth = undefined;
  this._imageHeight = undefined;

  this._labelDimensions = undefined;
  this._labelHorizontalOrigin = undefined;
  this._labelTranslate = undefined;

  var image = options.image;
  var imageId = options.imageId;
  if (defined(image)) {
    if (!defined(imageId)) {
      if (typeof image === "string") {
        imageId = image;
      } else if (defined(image.src)) {
        imageId = image.src;
      } else {
        imageId = createGuid();
      }
    }

    this._imageId = imageId;
    this._image = image;
  }

  if (defined(options.imageSubRegion)) {
    this._imageId = imageId;
    this._imageSubRegion = options.imageSubRegion;
  }

  if (defined(this._billboardCollection._textureAtlas)) {
    this._loadImage();
  }

  this._actualClampedPosition = undefined;
  this._removeCallbackFunc = undefined;
  this._mode = SceneMode.SCENE3D;

  this._clusterShow = true;
  this._outlineColor = Color.clone(
    defaultValue(options.outlineColor, Color.BLACK)
  );
  this._outlineWidth = defaultValue(options.outlineWidth, 0.0);

  this._updateClamping();
}

var SHOW_INDEX = (Billboard.SHOW_INDEX = 0);
var POSITION_INDEX = (Billboard.POSITION_INDEX = 1);
var PIXEL_OFFSET_INDEX = (Billboard.PIXEL_OFFSET_INDEX = 2);
var EYE_OFFSET_INDEX = (Billboard.EYE_OFFSET_INDEX = 3);
var HORIZONTAL_ORIGIN_INDEX = (Billboard.HORIZONTAL_ORIGIN_INDEX = 4);
var VERTICAL_ORIGIN_INDEX = (Billboard.VERTICAL_ORIGIN_INDEX = 5);
var SCALE_INDEX = (Billboard.SCALE_INDEX = 6);
var IMAGE_INDEX_INDEX = (Billboard.IMAGE_INDEX_INDEX = 7);
var COLOR_INDEX = (Billboard.COLOR_INDEX = 8);
var ROTATION_INDEX = (Billboard.ROTATION_INDEX = 9);
var ALIGNED_AXIS_INDEX = (Billboard.ALIGNED_AXIS_INDEX = 10);
var SCALE_BY_DISTANCE_INDEX = (Billboard.SCALE_BY_DISTANCE_INDEX = 11);
var TRANSLUCENCY_BY_DISTANCE_INDEX = (Billboard.TRANSLUCENCY_BY_DISTANCE_INDEX = 12);
var PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX = (Billboard.PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX = 13);
var DISTANCE_DISPLAY_CONDITION = (Billboard.DISTANCE_DISPLAY_CONDITION = 14);
var DISABLE_DEPTH_DISTANCE = (Billboard.DISABLE_DEPTH_DISTANCE = 15);
Billboard.TEXTURE_COORDINATE_BOUNDS = 16;
var SDF_INDEX = (Billboard.SDF_INDEX = 17);
Billboard.NUMBER_OF_PROPERTIES = 18;

function makeDirty(billboard, propertyChanged) {
  var billboardCollection = billboard._billboardCollection;
  if (defined(billboardCollection)) {
    billboardCollection._updateBillboard(billboard, propertyChanged);
    billboard._dirty = true;
  }
}

Object.defineProperties(Billboard.prototype, {
  /**
   * Determines if this billboard will be shown.  Use this to hide or show a billboard, instead
   * of removing it and re-adding it to the collection.
   * @memberof Billboard.prototype
   * @type {Boolean}
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("value", value);
      //>>includeEnd('debug');

      if (this._show !== value) {
        this._show = value;
        makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this billboard.
   * @memberof Billboard.prototype
   * @type {Cartesian3}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      var position = this._position;
      if (!Cartesian3.equals(position, value)) {
        Cartesian3.clone(value, position);
        Cartesian3.clone(value, this._actualPosition);
        this._updateClamping();
        makeDirty(this, POSITION_INDEX);
      }
    },
  },

  /**
   * Gets or sets the height reference of this billboard.
   * @memberof Billboard.prototype
   * @type {HeightReference}
   * @default HeightReference.NONE
   */
  heightReference: {
    get: function () {
      return this._heightReference;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      var heightReference = this._heightReference;
      if (value !== heightReference) {
        this._heightReference = value;
        this._updateClamping();
        makeDirty(this, POSITION_INDEX);
      }
    },
  },

  /**
   * Gets or sets the pixel offset in screen space from the origin of this billboard.  This is commonly used
   * to align multiple billboards and labels at the same position, e.g., an image and text.  The
   * screen space origin is the top, left corner of the canvas; <code>x</code> increases from
   * left to right, and <code>y</code> increases from top to bottom.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>default</code><br/><img src='Images/Billboard.setPixelOffset.default.png' width='250' height='188' /></td>
   * <td align='center'><code>b.pixeloffset = new Cartesian2(50, 25);</code><br/><img src='Images/Billboard.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
   * </tr></table>
   * The billboard's origin is indicated by the yellow point.
   * </div>
   * @memberof Billboard.prototype
   * @type {Cartesian2}
   */
  pixelOffset: {
    get: function () {
      return this._pixelOffset;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      var pixelOffset = this._pixelOffset;
      if (!Cartesian2.equals(pixelOffset, value)) {
        Cartesian2.clone(value, pixelOffset);
        makeDirty(this, PIXEL_OFFSET_INDEX);
      }
    },
  },

  /**
   * Gets or sets near and far scaling properties of a Billboard based on the billboard's distance from the camera.
   * A billboard's scale will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the billboard's scale remains clamped to the nearest bound.  If undefined,
   * scaleByDistance will be disabled.
   * @memberof Billboard.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a billboard's scaleByDistance to scale by 1.5 when the
   * // camera is 1500 meters from the billboard and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * b.scaleByDistance = new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable scaling by distance
   * b.scaleByDistance = undefined;
   */
  scaleByDistance: {
    get: function () {
      return this._scaleByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.object("value", value);
        if (value.far <= value.near) {
          throw new DeveloperError(
            "far distance must be greater than near distance."
          );
        }
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
   * Gets or sets near and far translucency properties of a Billboard based on the billboard's distance from the camera.
   * A billboard's translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the billboard's translucency remains clamped to the nearest bound.  If undefined,
   * translucencyByDistance will be disabled.
   * @memberof Billboard.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a billboard's translucency to 1.0 when the
   * // camera is 1500 meters from the billboard and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * b.translucencyByDistance = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable translucency by distance
   * b.translucencyByDistance = undefined;
   */
  translucencyByDistance: {
    get: function () {
      return this._translucencyByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.object("value", value);
        if (value.far <= value.near) {
          throw new DeveloperError(
            "far distance must be greater than near distance."
          );
        }
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
   * Gets or sets near and far pixel offset scaling properties of a Billboard based on the billboard's distance from the camera.
   * A billboard's pixel offset will be scaled between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the billboard's pixel offset scale remains clamped to the nearest bound.  If undefined,
   * pixelOffsetScaleByDistance will be disabled.
   * @memberof Billboard.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a billboard's pixel offset scale to 0.0 when the
   * // camera is 1500 meters from the billboard and scale pixel offset to 10.0 pixels
   * // in the y direction the camera distance approaches 8.0e6 meters.
   * b.pixelOffset = new Cesium.Cartesian2(0.0, 1.0);
   * b.pixelOffsetScaleByDistance = new Cesium.NearFarScalar(1.5e2, 0.0, 8.0e6, 10.0);
   *
   * @example
   * // Example 2.
   * // disable pixel offset by distance
   * b.pixelOffsetScaleByDistance = undefined;
   */
  pixelOffsetScaleByDistance: {
    get: function () {
      return this._pixelOffsetScaleByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.object("value", value);
        if (value.far <= value.near) {
          throw new DeveloperError(
            "far distance must be greater than near distance."
          );
        }
      }
      //>>includeEnd('debug');

      var pixelOffsetScaleByDistance = this._pixelOffsetScaleByDistance;
      if (!NearFarScalar.equals(pixelOffsetScaleByDistance, value)) {
        this._pixelOffsetScaleByDistance = NearFarScalar.clone(
          value,
          pixelOffsetScaleByDistance
        );
        makeDirty(this, PIXEL_OFFSET_SCALE_BY_DISTANCE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the 3D Cartesian offset applied to this billboard in eye coordinates.  Eye coordinates is a left-handed
   * coordinate system, where <code>x</code> points towards the viewer's right, <code>y</code> points up, and
   * <code>z</code> points into the screen.  Eye coordinates use the same scale as world and model coordinates,
   * which is typically meters.
   * <br /><br />
   * An eye offset is commonly used to arrange multiple billboards or objects at the same position, e.g., to
   * arrange a billboard above its corresponding 3D model.
   * <br /><br />
   * Below, the billboard is positioned at the center of the Earth but an eye offset makes it always
   * appear on top of the Earth regardless of the viewer's or Earth's orientation.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
   * </tr></table>
   * <code>b.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code><br /><br />
   * </div>
   * @memberof Billboard.prototype
   * @type {Cartesian3}
   */
  eyeOffset: {
    get: function () {
      return this._eyeOffset;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      var eyeOffset = this._eyeOffset;
      if (!Cartesian3.equals(eyeOffset, value)) {
        Cartesian3.clone(value, eyeOffset);
        makeDirty(this, EYE_OFFSET_INDEX);
      }
    },
  },

  /**
   * Gets or sets the horizontal origin of this billboard, which determines if the billboard is
   * to the left, center, or right of its anchor position.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Billboard.setHorizontalOrigin.png' width='648' height='196' /><br />
   * </div>
   * @memberof Billboard.prototype
   * @type {HorizontalOrigin}
   * @example
   * // Use a bottom, left origin
   * b.horizontalOrigin = Cesium.HorizontalOrigin.LEFT;
   * b.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
   */
  horizontalOrigin: {
    get: function () {
      return this._horizontalOrigin;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      if (this._horizontalOrigin !== value) {
        this._horizontalOrigin = value;
        makeDirty(this, HORIZONTAL_ORIGIN_INDEX);
      }
    },
  },

  /**
   * Gets or sets the vertical origin of this billboard, which determines if the billboard is
   * to the above, below, or at the center of its anchor position.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Billboard.setVerticalOrigin.png' width='695' height='175' /><br />
   * </div>
   * @memberof Billboard.prototype
   * @type {VerticalOrigin}
   * @example
   * // Use a bottom, left origin
   * b.horizontalOrigin = Cesium.HorizontalOrigin.LEFT;
   * b.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
   */
  verticalOrigin: {
    get: function () {
      return this._verticalOrigin;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      if (this._verticalOrigin !== value) {
        this._verticalOrigin = value;
        makeDirty(this, VERTICAL_ORIGIN_INDEX);
      }
    },
  },

  /**
   * Gets or sets the uniform scale that is multiplied with the billboard's image size in pixels.
   * A scale of <code>1.0</code> does not change the size of the billboard; a scale greater than
   * <code>1.0</code> enlarges the billboard; a positive scale less than <code>1.0</code> shrinks
   * the billboard.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Billboard.setScale.png' width='400' height='300' /><br/>
   * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
   * and <code>2.0</code>.
   * </div>
   * @memberof Billboard.prototype
   * @type {Number}
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      if (this._scale !== value) {
        this._scale = value;
        makeDirty(this, SCALE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the color that is multiplied with the billboard's texture.  This has two common use cases.  First,
   * the same white texture may be used by many different billboards, each with a different color, to create
   * colored billboards.  Second, the color's alpha component can be used to make the billboard translucent as shown below.
   * An alpha of <code>0.0</code> makes the billboard transparent, and <code>1.0</code> makes the billboard opaque.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>default</code><br/><img src='Images/Billboard.setColor.Alpha255.png' width='250' height='188' /></td>
   * <td align='center'><code>alpha : 0.5</code><br/><img src='Images/Billboard.setColor.Alpha127.png' width='250' height='188' /></td>
   * </tr></table>
   * </div>
   * <br />
   * The red, green, blue, and alpha values are indicated by <code>value</code>'s <code>red</code>, <code>green</code>,
   * <code>blue</code>, and <code>alpha</code> properties as shown in Example 1.  These components range from <code>0.0</code>
   * (no intensity) to <code>1.0</code> (full intensity).
   * @memberof Billboard.prototype
   * @type {Color}
   *
   * @example
   * // Example 1. Assign yellow.
   * b.color = Cesium.Color.YELLOW;
   *
   * @example
   * // Example 2. Make a billboard 50% translucent.
   * b.color = new Cesium.Color(1.0, 1.0, 1.0, 0.5);
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      var color = this._color;
      if (!Color.equals(color, value)) {
        Color.clone(value, color);
        makeDirty(this, COLOR_INDEX);
      }
    },
  },

  /**
   * Gets or sets the rotation angle in radians.
   * @memberof Billboard.prototype
   * @type {Number}
   */
  rotation: {
    get: function () {
      return this._rotation;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number("value", value);
      //>>includeEnd('debug');

      if (this._rotation !== value) {
        this._rotation = value;
        makeDirty(this, ROTATION_INDEX);
      }
    },
  },

  /**
   * Gets or sets the aligned axis in world space. The aligned axis is the unit vector that the billboard up vector points towards.
   * The default is the zero vector, which means the billboard is aligned to the screen up vector.
   * @memberof Billboard.prototype
   * @type {Cartesian3}
   * @example
   * // Example 1.
   * // Have the billboard up vector point north
   * billboard.alignedAxis = Cesium.Cartesian3.UNIT_Z;
   *
   * @example
   * // Example 2.
   * // Have the billboard point east.
   * billboard.alignedAxis = Cesium.Cartesian3.UNIT_Z;
   * billboard.rotation = -Cesium.Math.PI_OVER_TWO;
   *
   * @example
   * // Example 3.
   * // Reset the aligned axis
   * billboard.alignedAxis = Cesium.Cartesian3.ZERO;
   */
  alignedAxis: {
    get: function () {
      return this._alignedAxis;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.object("value", value);
      //>>includeEnd('debug');

      var alignedAxis = this._alignedAxis;
      if (!Cartesian3.equals(alignedAxis, value)) {
        Cartesian3.clone(value, alignedAxis);
        makeDirty(this, ALIGNED_AXIS_INDEX);
      }
    },
  },

  /**
   * Gets or sets a width for the billboard. If undefined, the image width will be used.
   * @memberof Billboard.prototype
   * @type {Number}
   */
  width: {
    get: function () {
      return defaultValue(this._width, this._imageWidth);
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.number("value", value);
      }
      //>>includeEnd('debug');
      if (this._width !== value) {
        this._width = value;
        makeDirty(this, IMAGE_INDEX_INDEX);
      }
    },
  },

  /**
   * Gets or sets a height for the billboard. If undefined, the image height will be used.
   * @memberof Billboard.prototype
   * @type {Number}
   */
  height: {
    get: function () {
      return defaultValue(this._height, this._imageHeight);
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.number("value", value);
      }
      //>>includeEnd('debug');
      if (this._height !== value) {
        this._height = value;
        makeDirty(this, IMAGE_INDEX_INDEX);
      }
    },
  },

  /**
   * Gets or sets if the billboard size is in meters or pixels. <code>true</code> to size the billboard in meters;
   * otherwise, the size is in pixels.
   * @memberof Billboard.prototype
   * @type {Boolean}
   * @default false
   */
  sizeInMeters: {
    get: function () {
      return this._sizeInMeters;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.bool("value", value);
      //>>includeEnd('debug');
      if (this._sizeInMeters !== value) {
        this._sizeInMeters = value;
        makeDirty(this, COLOR_INDEX);
      }
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this billboard will be displayed.
   * @memberof Billboard.prototype
   * @type {DistanceDisplayCondition}
   * @default undefined
   */
  distanceDisplayCondition: {
    get: function () {
      return this._distanceDisplayCondition;
    },
    set: function (value) {
      if (
        !DistanceDisplayCondition.equals(value, this._distanceDisplayCondition)
      ) {
        //>>includeStart('debug', pragmas.debug);
        if (defined(value)) {
          Check.typeOf.object("value", value);
          if (value.far <= value.near) {
            throw new DeveloperError(
              "far distance must be greater than near distance."
            );
          }
        }
        //>>includeEnd('debug');
        this._distanceDisplayCondition = DistanceDisplayCondition.clone(
          value,
          this._distanceDisplayCondition
        );
        makeDirty(this, DISTANCE_DISPLAY_CONDITION);
      }
    },
  },

  /**
   * Gets or sets the distance from the camera at which to disable the depth test to, for example, prevent clipping against terrain.
   * When set to zero, the depth test is always applied. When set to Number.POSITIVE_INFINITY, the depth test is never applied.
   * @memberof Billboard.prototype
   * @type {Number}
   */
  disableDepthTestDistance: {
    get: function () {
      return this._disableDepthTestDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value)) {
        Check.typeOf.number("value", value);
        if (value < 0.0) {
          throw new DeveloperError(
            "disableDepthTestDistance must be greater than or equal to 0.0."
          );
        }
      }
      //>>includeEnd('debug');
      if (this._disableDepthTestDistance !== value) {
        this._disableDepthTestDistance = value;
        makeDirty(this, DISABLE_DEPTH_DISTANCE);
      }
    },
  },

  /**
   * Gets or sets the user-defined object returned when the billboard is picked.
   * @memberof Billboard.prototype
   * @type {Object}
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
   * The primitive to return when picking this billboard.
   * @memberof Billboard.prototype
   * @private
   */
  pickPrimitive: {
    get: function () {
      return this._pickPrimitive;
    },
    set: function (value) {
      this._pickPrimitive = value;
      if (defined(this._pickId)) {
        this._pickId.object.primitive = value;
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
   * <p>
   * Gets or sets the image to be used for this billboard.  If a texture has already been created for the
   * given image, the existing texture is used.
   * </p>
   * <p>
   * This property can be set to a loaded Image, a URL which will be loaded as an Image automatically,
   * a canvas, or another billboard's image property (from the same billboard collection).
   * </p>
   *
   * @memberof Billboard.prototype
   * @type {String}
   * @example
   * // load an image from a URL
   * b.image = 'some/image/url.png';
   *
   * // assuming b1 and b2 are billboards in the same billboard collection,
   * // use the same image for both billboards.
   * b2.image = b1.image;
   */
  image: {
    get: function () {
      return this._imageId;
    },
    set: function (value) {
      if (!defined(value)) {
        this._imageIndex = -1;
        this._imageSubRegion = undefined;
        this._imageId = undefined;
        this._image = undefined;
        this._imageIndexPromise = undefined;
        makeDirty(this, IMAGE_INDEX_INDEX);
      } else if (typeof value === "string") {
        this.setImage(value, value);
      } else if (value instanceof Resource) {
        this.setImage(value.url, value);
      } else if (defined(value.src)) {
        this.setImage(value.src, value);
      } else {
        this.setImage(createGuid(), value);
      }
    },
  },

  /**
   * When <code>true</code>, this billboard is ready to render, i.e., the image
   * has been downloaded and the WebGL resources are created.
   *
   * @memberof Billboard.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._imageIndex !== -1;
    },
  },

  /**
   * Keeps track of the position of the billboard based on the height reference.
   * @memberof Billboard.prototype
   * @type {Cartesian3}
   * @private
   */
  _clampedPosition: {
    get: function () {
      return this._actualClampedPosition;
    },
    set: function (value) {
      this._actualClampedPosition = Cartesian3.clone(
        value,
        this._actualClampedPosition
      );
      makeDirty(this, POSITION_INDEX);
    },
  },

  /**
   * Determines whether or not this billboard will be shown or hidden because it was clustered.
   * @memberof Billboard.prototype
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

  /**
   * The outline color of this Billboard.  Effective only for SDF billboards like Label glyphs.
   * @memberof Billboard.prototype
   * @type {Color}
   * @private
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
        makeDirty(this, SDF_INDEX);
      }
    },
  },

  /**
   * The outline width of this Billboard in pixels.  Effective only for SDF billboards like Label glyphs.
   * @memberof Billboard.prototype
   * @type {Number}
   * @private
   */
  outlineWidth: {
    get: function () {
      return this._outlineWidth;
    },
    set: function (value) {
      if (this._outlineWidth !== value) {
        this._outlineWidth = value;
        makeDirty(this, SDF_INDEX);
      }
    },
  },
});

Billboard.prototype.getPickId = function (context) {
  if (!defined(this._pickId)) {
    this._pickId = context.createPickId({
      primitive: this._pickPrimitive,
      collection: this._collection,
      id: this._id,
    });
  }

  return this._pickId;
};

Billboard.prototype._updateClamping = function () {
  Billboard._updateClamping(this._billboardCollection, this);
};

var scratchCartographic = new Cartographic();
var scratchPosition = new Cartesian3();

Billboard._updateClamping = function (collection, owner) {
  var scene = collection._scene;
  if (!defined(scene) || !defined(scene.globe)) {
    //>>includeStart('debug', pragmas.debug);
    if (owner._heightReference !== HeightReference.NONE) {
      throw new DeveloperError(
        "Height reference is not supported without a scene and globe."
      );
    }
    //>>includeEnd('debug');
    return;
  }

  var globe = scene.globe;
  var ellipsoid = globe.ellipsoid;
  var surface = globe._surface;

  var mode = scene.frameState.mode;

  var modeChanged = mode !== owner._mode;
  owner._mode = mode;

  if (
    (owner._heightReference === HeightReference.NONE || modeChanged) &&
    defined(owner._removeCallbackFunc)
  ) {
    owner._removeCallbackFunc();
    owner._removeCallbackFunc = undefined;
    owner._clampedPosition = undefined;
  }

  if (
    owner._heightReference === HeightReference.NONE ||
    !defined(owner._position)
  ) {
    return;
  }

  var position = ellipsoid.cartesianToCartographic(owner._position);
  if (!defined(position)) {
    owner._actualClampedPosition = undefined;
    return;
  }

  if (defined(owner._removeCallbackFunc)) {
    owner._removeCallbackFunc();
  }

  function updateFunction(clampedPosition) {
    if (owner._heightReference === HeightReference.RELATIVE_TO_GROUND) {
      if (owner._mode === SceneMode.SCENE3D) {
        var clampedCart = ellipsoid.cartesianToCartographic(
          clampedPosition,
          scratchCartographic
        );
        clampedCart.height += position.height;
        ellipsoid.cartographicToCartesian(clampedCart, clampedPosition);
      } else {
        clampedPosition.x += position.height;
      }
    } else if (owner._heightReference === HeightReference.CLIP_TO_GROUND) {
      if (owner._mode === SceneMode.SCENE3D) {
        var clippedCart = ellipsoid.cartesianToCartographic(
          clampedPosition,
          scratchCartographic
        );
        if (position.height >= clippedCart.height) {
          clippedCart.height = position.height;
        }
        ellipsoid.cartographicToCartesian(clippedCart, clampedPosition);
      } else if (position.height >= clampedPosition.x) {
        clampedPosition.x = position.height;
      }
    }
    owner._clampedPosition = Cartesian3.clone(
      clampedPosition,
      owner._clampedPosition
    );
  }
  owner._removeCallbackFunc = surface.updateHeight(position, updateFunction);

  Cartographic.clone(position, scratchCartographic);
  var height = globe.getHeight(position);
  if (defined(height)) {
    scratchCartographic.height = height;
  }

  ellipsoid.cartographicToCartesian(scratchCartographic, scratchPosition);

  updateFunction(scratchPosition);
};

Billboard.prototype._loadImage = function () {
  var atlas = this._billboardCollection._textureAtlas;

  var imageId = this._imageId;
  var image = this._image;
  var imageSubRegion = this._imageSubRegion;
  var imageIndexPromise;

  if (defined(image)) {
    imageIndexPromise = atlas.addImage(imageId, image);
  }
  if (defined(imageSubRegion)) {
    imageIndexPromise = atlas.addSubRegion(imageId, imageSubRegion);
  }

  this._imageIndexPromise = imageIndexPromise;

  if (!defined(imageIndexPromise)) {
    return;
  }

  var that = this;
  imageIndexPromise
    .then(function (index) {
      if (
        that._imageId !== imageId ||
        that._image !== image ||
        !BoundingRectangle.equals(that._imageSubRegion, imageSubRegion)
      ) {
        // another load occurred before this one finished, ignore the index
        return;
      }

      // fill in imageWidth and imageHeight
      var textureCoordinates = atlas.textureCoordinates[index];
      that._imageWidth = atlas.texture.width * textureCoordinates.width;
      that._imageHeight = atlas.texture.height * textureCoordinates.height;

      that._imageIndex = index;
      that._ready = true;
      that._image = undefined;
      that._imageIndexPromise = undefined;
      makeDirty(that, IMAGE_INDEX_INDEX);
    })
    .otherwise(function (error) {
      console.error("Error loading image for billboard: " + error);
      that._imageIndexPromise = undefined;
    });
};

/**
 * <p>
 * Sets the image to be used for this billboard.  If a texture has already been created for the
 * given id, the existing texture is used.
 * </p>
 * <p>
 * This function is useful for dynamically creating textures that are shared across many billboards.
 * Only the first billboard will actually call the function and create the texture, while subsequent
 * billboards created with the same id will simply re-use the existing texture.
 * </p>
 * <p>
 * To load an image from a URL, setting the {@link Billboard#image} property is more convenient.
 * </p>
 *
 * @param {String} id The id of the image.  This can be any string that uniquely identifies the image.
 * @param {HTMLImageElement|HTMLCanvasElement|String|Resource|Billboard.CreateImageCallback} image The image to load.  This parameter
 *        can either be a loaded Image or Canvas, a URL which will be loaded as an Image automatically,
 *        or a function which will be called to create the image if it hasn't been loaded already.
 * @example
 * // create a billboard image dynamically
 * function drawImage(id) {
 *   // create and draw an image using a canvas
 *   var canvas = document.createElement('canvas');
 *   var context2D = canvas.getContext('2d');
 *   // ... draw image
 *   return canvas;
 * }
 * // drawImage will be called to create the texture
 * b.setImage('myImage', drawImage);
 *
 * // subsequent billboards created in the same collection using the same id will use the existing
 * // texture, without the need to create the canvas or draw the image
 * b2.setImage('myImage', drawImage);
 */
Billboard.prototype.setImage = function (id, image) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  if (!defined(image)) {
    throw new DeveloperError("image is required.");
  }
  //>>includeEnd('debug');

  if (this._imageId === id) {
    return;
  }

  this._imageIndex = -1;
  this._imageSubRegion = undefined;
  this._imageId = id;
  this._image = image;

  if (defined(this._billboardCollection._textureAtlas)) {
    this._loadImage();
  }
};

/**
 * Uses a sub-region of the image with the given id as the image for this billboard,
 * measured in pixels from the bottom-left.
 *
 * @param {String} id The id of the image to use.
 * @param {BoundingRectangle} subRegion The sub-region of the image.
 *
 * @exception {RuntimeError} image with id must be in the atlas
 */
Billboard.prototype.setImageSubRegion = function (id, subRegion) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(id)) {
    throw new DeveloperError("id is required.");
  }
  if (!defined(subRegion)) {
    throw new DeveloperError("subRegion is required.");
  }
  //>>includeEnd('debug');

  if (
    this._imageId === id &&
    BoundingRectangle.equals(this._imageSubRegion, subRegion)
  ) {
    return;
  }

  this._imageIndex = -1;
  this._imageId = id;
  this._imageSubRegion = BoundingRectangle.clone(subRegion);

  if (defined(this._billboardCollection._textureAtlas)) {
    this._loadImage();
  }
};

Billboard.prototype._setTranslate = function (value) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(value)) {
    throw new DeveloperError("value is required.");
  }
  //>>includeEnd('debug');

  var translate = this._translate;
  if (!Cartesian2.equals(translate, value)) {
    Cartesian2.clone(value, translate);
    makeDirty(this, PIXEL_OFFSET_INDEX);
  }
};

Billboard.prototype._getActualPosition = function () {
  return defined(this._clampedPosition)
    ? this._clampedPosition
    : this._actualPosition;
};

Billboard.prototype._setActualPosition = function (value) {
  if (!defined(this._clampedPosition)) {
    Cartesian3.clone(value, this._actualPosition);
  }
  makeDirty(this, POSITION_INDEX);
};

var tempCartesian3 = new Cartesian4();
Billboard._computeActualPosition = function (
  billboard,
  position,
  frameState,
  modelMatrix
) {
  if (defined(billboard._clampedPosition)) {
    if (frameState.mode !== billboard._mode) {
      billboard._updateClamping();
    }
    return billboard._clampedPosition;
  } else if (frameState.mode === SceneMode.SCENE3D) {
    return position;
  }

  Matrix4.multiplyByPoint(modelMatrix, position, tempCartesian3);
  return SceneTransforms.computeActualWgs84Position(frameState, tempCartesian3);
};

var scratchCartesian3 = new Cartesian3();

// This function is basically a stripped-down JavaScript version of BillboardCollectionVS.glsl
Billboard._computeScreenSpacePosition = function (
  modelMatrix,
  position,
  eyeOffset,
  pixelOffset,
  scene,
  result
) {
  // Model to world coordinates
  var positionWorld = Matrix4.multiplyByPoint(
    modelMatrix,
    position,
    scratchCartesian3
  );

  // World to window coordinates
  var positionWC = SceneTransforms.wgs84WithEyeOffsetToWindowCoordinates(
    scene,
    positionWorld,
    eyeOffset,
    result
  );
  if (!defined(positionWC)) {
    return undefined;
  }

  // Apply pixel offset
  Cartesian2.add(positionWC, pixelOffset, positionWC);

  return positionWC;
};

var scratchPixelOffset = new Cartesian2(0.0, 0.0);

/**
 * Computes the screen-space position of the billboard's origin, taking into account eye and pixel offsets.
 * The screen space origin is the top, left corner of the canvas; <code>x</code> increases from
 * left to right, and <code>y</code> increases from top to bottom.
 *
 * @param {Scene} scene The scene.
 * @param {Cartesian2} [result] The object onto which to store the result.
 * @returns {Cartesian2} The screen-space position of the billboard.
 *
 * @exception {DeveloperError} Billboard must be in a collection.
 *
 * @example
 * console.log(b.computeScreenSpacePosition(scene).toString());
 *
 * @see Billboard#eyeOffset
 * @see Billboard#pixelOffset
 */
Billboard.prototype.computeScreenSpacePosition = function (scene, result) {
  var billboardCollection = this._billboardCollection;
  if (!defined(result)) {
    result = new Cartesian2();
  }

  //>>includeStart('debug', pragmas.debug);
  if (!defined(billboardCollection)) {
    throw new DeveloperError(
      "Billboard must be in a collection.  Was it removed?"
    );
  }
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  // pixel offset for screen space computation is the pixelOffset + screen space translate
  Cartesian2.clone(this._pixelOffset, scratchPixelOffset);
  Cartesian2.add(scratchPixelOffset, this._translate, scratchPixelOffset);

  var modelMatrix = billboardCollection.modelMatrix;
  var position = this._position;
  if (defined(this._clampedPosition)) {
    position = this._clampedPosition;
    if (scene.mode !== SceneMode.SCENE3D) {
      // position needs to be in world coordinates
      var projection = scene.mapProjection;
      var ellipsoid = projection.ellipsoid;
      var cart = projection.unproject(position, scratchCartographic);
      position = ellipsoid.cartographicToCartesian(cart, scratchCartesian3);
      modelMatrix = Matrix4.IDENTITY;
    }
  }

  var windowCoordinates = Billboard._computeScreenSpacePosition(
    modelMatrix,
    position,
    this._eyeOffset,
    scratchPixelOffset,
    scene,
    result
  );
  return windowCoordinates;
};

/**
 * Gets a billboard's screen space bounding box centered around screenSpacePosition.
 * @param {Billboard} billboard The billboard to get the screen space bounding box for.
 * @param {Cartesian2} screenSpacePosition The screen space center of the label.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The screen space bounding box.
 *
 * @private
 */
Billboard.getScreenSpaceBoundingBox = function (
  billboard,
  screenSpacePosition,
  result
) {
  var width = billboard.width;
  var height = billboard.height;

  var scale = billboard.scale;
  width *= scale;
  height *= scale;

  var x = screenSpacePosition.x;
  if (billboard.horizontalOrigin === HorizontalOrigin.RIGHT) {
    x -= width;
  } else if (billboard.horizontalOrigin === HorizontalOrigin.CENTER) {
    x -= width * 0.5;
  }

  var y = screenSpacePosition.y;
  if (
    billboard.verticalOrigin === VerticalOrigin.BOTTOM ||
    billboard.verticalOrigin === VerticalOrigin.BASELINE
  ) {
    y -= height;
  } else if (billboard.verticalOrigin === VerticalOrigin.CENTER) {
    y -= height * 0.5;
  }

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
 * Determines if this billboard equals another billboard.  Billboards are equal if all their properties
 * are equal.  Billboards in different collections can be equal.
 *
 * @param {Billboard} other The billboard to compare for equality.
 * @returns {Boolean} <code>true</code> if the billboards are equal; otherwise, <code>false</code>.
 */
Billboard.prototype.equals = function (other) {
  return (
    this === other ||
    (defined(other) &&
      this._id === other._id &&
      Cartesian3.equals(this._position, other._position) &&
      this._imageId === other._imageId &&
      this._show === other._show &&
      this._scale === other._scale &&
      this._verticalOrigin === other._verticalOrigin &&
      this._horizontalOrigin === other._horizontalOrigin &&
      this._heightReference === other._heightReference &&
      BoundingRectangle.equals(this._imageSubRegion, other._imageSubRegion) &&
      Color.equals(this._color, other._color) &&
      Cartesian2.equals(this._pixelOffset, other._pixelOffset) &&
      Cartesian2.equals(this._translate, other._translate) &&
      Cartesian3.equals(this._eyeOffset, other._eyeOffset) &&
      NearFarScalar.equals(this._scaleByDistance, other._scaleByDistance) &&
      NearFarScalar.equals(
        this._translucencyByDistance,
        other._translucencyByDistance
      ) &&
      NearFarScalar.equals(
        this._pixelOffsetScaleByDistance,
        other._pixelOffsetScaleByDistance
      ) &&
      DistanceDisplayCondition.equals(
        this._distanceDisplayCondition,
        other._distanceDisplayCondition
      ) &&
      this._disableDepthTestDistance === other._disableDepthTestDistance)
  );
};

Billboard.prototype._destroy = function () {
  if (defined(this._customData)) {
    this._billboardCollection._scene.globe._surface.removeTileCustomData(
      this._customData
    );
    this._customData = undefined;
  }

  if (defined(this._removeCallbackFunc)) {
    this._removeCallbackFunc();
    this._removeCallbackFunc = undefined;
  }

  this.image = undefined;
  this._pickId = this._pickId && this._pickId.destroy();
  this._billboardCollection = undefined;
};

/**
 * A function that creates an image.
 * @callback Billboard.CreateImageCallback
 * @param {String} id The identifier of the image to load.
 * @returns {HTMLImageElement|HTMLCanvasElement|Promise<HTMLImageElement|HTMLCanvasElement>} The image, or a promise that will resolve to an image.
 */
export default Billboard;
