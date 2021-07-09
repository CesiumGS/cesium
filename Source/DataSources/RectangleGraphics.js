import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createMaterialPropertyDescriptor from "./createMaterialPropertyDescriptor.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {Object} RectangleGraphics.ConstructorOptions
 *
 * Initialization options for the RectangleGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the rectangle.
 * @property {Property | Rectangle} [coordinates] The Property specifying the {@link Rectangle}.
 * @property {Property | number} [height=0] A numeric Property specifying the altitude of the rectangle relative to the ellipsoid surface.
 * @property {Property | HeightReference} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
 * @property {Property | number} [extrudedHeight] A numeric Property specifying the altitude of the rectangle's extruded face relative to the ellipsoid surface.
 * @property {Property | HeightReference} [extrudedHeightReference=HeightReference.NONE] A Property specifying what the extrudedHeight is relative to.
 * @property {Property | number} [rotation=0.0] A numeric property specifying the rotation of the rectangle clockwise from north.
 * @property {Property | number} [stRotation=0.0] A numeric property specifying the rotation of the rectangle texture counter-clockwise from north.
 * @property {Property | number} [granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between points on the rectangle.
 * @property {Property | boolean} [fill=true] A boolean Property specifying whether the rectangle is filled with the provided material.
 * @property {MaterialProperty | Color} [material=Color.WHITE] A Property specifying the material used to fill the rectangle.
 * @property {Property | boolean} [outline=false] A boolean Property specifying whether the rectangle is outlined.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the width of the outline.
 * @property {Property | ShadowMode} [shadows=ShadowMode.DISABLED] An enum Property specifying whether the rectangle casts or receives shadows from light sources.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this rectangle will be displayed.
 * @property {Property | ClassificationType} [classificationType=ClassificationType.BOTH] An enum Property specifying whether this rectangle will classify terrain, 3D Tiles, or both when on the ground.
 * @property {Property | number} [zIndex=0] A Property specifying the zIndex used for ordering ground geometry.  Only has an effect if the rectangle is constant and neither height or extrudedHeight are specified.
 */

/**
 * Describes graphics for a {@link Rectangle}.
 * The rectangle conforms to the curvature of the globe and can be placed on the surface or
 * at altitude and can optionally be extruded into a volume.
 *
 * @alias RectangleGraphics
 * @constructor
 *
 * @param {RectangleGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @see Entity
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Rectangle.html|Cesium Sandcastle Rectangle Demo}
 */
function RectangleGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._coordinates = undefined;
  this._coordinatesSubscription = undefined;
  this._height = undefined;
  this._heightSubscription = undefined;
  this._heightReference = undefined;
  this._heightReferenceSubscription = undefined;
  this._extrudedHeight = undefined;
  this._extrudedHeightSubscription = undefined;
  this._extrudedHeightReference = undefined;
  this._extrudedHeightReferenceSubscription = undefined;
  this._rotation = undefined;
  this._rotationSubscription = undefined;
  this._stRotation = undefined;
  this._stRotationSubscription = undefined;
  this._granularity = undefined;
  this._granularitySubscription = undefined;
  this._fill = undefined;
  this._fillSubscription = undefined;
  this._material = undefined;
  this._materialSubscription = undefined;
  this._outline = undefined;
  this._outlineSubscription = undefined;
  this._outlineColor = undefined;
  this._outlineColorSubscription = undefined;
  this._outlineWidth = undefined;
  this._outlineWidthSubscription = undefined;
  this._shadows = undefined;
  this._shadowsSubscription = undefined;
  this._distanceDisplayCondition = undefined;
  this._distancedisplayConditionSubscription = undefined;
  this._classificationType = undefined;
  this._classificationTypeSubscription = undefined;
  this._zIndex = undefined;
  this._zIndexSubscription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(RectangleGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof RectangleGraphics.prototype
   *
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },

  /**
   * Gets or sets the boolean Property specifying the visibility of the rectangle.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the Property specifying the {@link Rectangle}.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   */
  coordinates: createPropertyDescriptor("coordinates"),

  /**
   * Gets or sets the numeric Property specifying the altitude of the rectangle.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default 0.0
   */
  height: createPropertyDescriptor("height"),

  /**
   * Gets or sets the Property specifying the {@link HeightReference}.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  heightReference: createPropertyDescriptor("heightReference"),

  /**
   * Gets or sets the numeric Property specifying the altitude of the rectangle extrusion.
   * Setting this property creates volume starting at height and ending at this altitude.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   */
  extrudedHeight: createPropertyDescriptor("extrudedHeight"),

  /**
   * Gets or sets the Property specifying the extruded {@link HeightReference}.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  extrudedHeightReference: createPropertyDescriptor("extrudedHeightReference"),

  /**
   * Gets or sets the numeric property specifying the rotation of the rectangle clockwise from north.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default 0
   */
  rotation: createPropertyDescriptor("rotation"),

  /**
   * Gets or sets the numeric property specifying the rotation of the rectangle texture counter-clockwise from north.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default 0
   */
  stRotation: createPropertyDescriptor("stRotation"),

  /**
   * Gets or sets the numeric Property specifying the angular distance between points on the rectangle.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default {CesiumMath.RADIANS_PER_DEGREE}
   */
  granularity: createPropertyDescriptor("granularity"),

  /**
   * Gets or sets the boolean Property specifying whether the rectangle is filled with the provided material.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  fill: createPropertyDescriptor("fill"),

  /**
   * Gets or sets the Property specifying the material used to fill the rectangle.
   * @memberof RectangleGraphics.prototype
   * @type {MaterialProperty}
   * @default Color.WHITE
   */
  material: createMaterialPropertyDescriptor("material"),

  /**
   * Gets or sets the Property specifying whether the rectangle is outlined.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  outline: createPropertyDescriptor("outline"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof RectangleGraphics.prototype
   * @type {Color|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * <p>
   * Note: This property will be ignored on all major browsers on Windows platforms. For details, see (@link https://github.com/CesiumGS/cesium/issues/40}.
   * </p>
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Get or sets the enum Property specifying whether the rectangle
   * casts or receives shadows from light sources.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.DISABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this rectangle will be displayed.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),

  /**
   * Gets or sets the {@link ClassificationType} Property specifying whether this rectangle will classify terrain, 3D Tiles, or both when on the ground.
   * @memberof RectangleGraphics.prototype
   * @type {Property|undefined}
   * @default ClassificationType.BOTH
   */
  classificationType: createPropertyDescriptor("classificationType"),

  /**
   * Gets or sets the zIndex Property specifying the ordering of the rectangle.  Only has an effect if the rectangle is constant and neither height or extrudedHeight are specified.
   * @memberof RectangleGraphics.prototype
   * @type {ConstantProperty|undefined}
   * @default 0
   */
  zIndex: createPropertyDescriptor("zIndex"),
});

/**
 * Duplicates this instance.
 *
 * @param {RectangleGraphics} [result] The object onto which to store the result.
 * @returns {RectangleGraphics} The modified result parameter or a new instance if one was not provided.
 */
RectangleGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new RectangleGraphics(this);
  }
  result.show = this.show;
  result.coordinates = this.coordinates;
  result.height = this.height;
  result.heightReference = this.heightReference;
  result.extrudedHeight = this.extrudedHeight;
  result.extrudedHeightReference = this.extrudedHeightReference;
  result.rotation = this.rotation;
  result.stRotation = this.stRotation;
  result.granularity = this.granularity;
  result.fill = this.fill;
  result.material = this.material;
  result.outline = this.outline;
  result.outlineColor = this.outlineColor;
  result.outlineWidth = this.outlineWidth;
  result.shadows = this.shadows;
  result.distanceDisplayCondition = this.distanceDisplayCondition;
  result.classificationType = this.classificationType;
  result.zIndex = this.zIndex;
  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {RectangleGraphics} source The object to be merged into this object.
 */
RectangleGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.coordinates = defaultValue(this.coordinates, source.coordinates);
  this.height = defaultValue(this.height, source.height);
  this.heightReference = defaultValue(
    this.heightReference,
    source.heightReference
  );
  this.extrudedHeight = defaultValue(
    this.extrudedHeight,
    source.extrudedHeight
  );
  this.extrudedHeightReference = defaultValue(
    this.extrudedHeightReference,
    source.extrudedHeightReference
  );
  this.rotation = defaultValue(this.rotation, source.rotation);
  this.stRotation = defaultValue(this.stRotation, source.stRotation);
  this.granularity = defaultValue(this.granularity, source.granularity);
  this.fill = defaultValue(this.fill, source.fill);
  this.material = defaultValue(this.material, source.material);
  this.outline = defaultValue(this.outline, source.outline);
  this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
  this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
  this.shadows = defaultValue(this.shadows, source.shadows);
  this.distanceDisplayCondition = defaultValue(
    this.distanceDisplayCondition,
    source.distanceDisplayCondition
  );
  this.classificationType = defaultValue(
    this.classificationType,
    source.classificationType
  );
  this.zIndex = defaultValue(this.zIndex, source.zIndex);
};
export default RectangleGraphics;
