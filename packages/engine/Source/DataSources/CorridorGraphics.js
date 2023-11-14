import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createMaterialPropertyDescriptor from "./createMaterialPropertyDescriptor.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {object} CorridorGraphics.ConstructorOptions
 *
 * Initialization options for the CorridorGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the corridor.
 * @property {Property | Cartesian3[]} [positions] A Property specifying the array of {@link Cartesian3} positions that define the centerline of the corridor.
 * @property {Property | number} [width] A numeric Property specifying the distance between the edges of the corridor.
 * @property {Property | number} [height=0] A numeric Property specifying the altitude of the corridor relative to the ellipsoid surface.
 * @property {Property | HeightReference} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
 * @property {Property | number} [extrudedHeight] A numeric Property specifying the altitude of the corridor's extruded face relative to the ellipsoid surface.
 * @property {Property | HeightReference} [extrudedHeightReference=HeightReference.NONE] A Property specifying what the extrudedHeight is relative to.
 * @property {Property | CornerType} [cornerType=CornerType.ROUNDED] A {@link CornerType} Property specifying the style of the corners.
 * @property {Property | number} [granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the distance between each latitude and longitude.
 * @property {Property | boolean} [fill=true] A boolean Property specifying whether the corridor is filled with the provided material.
 * @property {MaterialProperty | Color} [material=Color.WHITE] A Property specifying the material used to fill the corridor.
 * @property {Property | boolean} [outline=false] A boolean Property specifying whether the corridor is outlined.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the width of the outline.
 * @property {Property | ShadowMode} [shadows=ShadowMode.DISABLED] An enum Property specifying whether the corridor casts or receives shadows from light sources.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this corridor will be displayed.
 * @property {Property | ClassificationType} [classificationType=ClassificationType.BOTH] An enum Property specifying whether this corridor will classify terrain, 3D Tiles, or both when on the ground.
 * @property {ConstantProperty | number} [zIndex] A Property specifying the zIndex of the corridor, used for ordering.  Only has an effect if height and extrudedHeight are undefined, and if the corridor is static.
 */

/**
 * Describes a corridor, which is a shape defined by a centerline and width that
 * conforms to the curvature of the globe. It can be placed on the surface or at altitude
 * and can optionally be extruded into a volume.
 *
 * @alias CorridorGraphics
 * @constructor
 *
 * @param {CorridorGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @see Entity
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Corridor.html|Cesium Sandcastle Corridor Demo}
 */
function CorridorGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._positions = undefined;
  this._positionsSubscription = undefined;
  this._width = undefined;
  this._widthSubscription = undefined;
  this._height = undefined;
  this._heightSubscription = undefined;
  this._heightReference = undefined;
  this._heightReferenceSubscription = undefined;
  this._extrudedHeight = undefined;
  this._extrudedHeightSubscription = undefined;
  this._extrudedHeightReference = undefined;
  this._extrudedHeightReferenceSubscription = undefined;
  this._cornerType = undefined;
  this._cornerTypeSubscription = undefined;
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
  this._distanceDisplayConditionSubscription = undefined;
  this._classificationType = undefined;
  this._classificationTypeSubscription = undefined;
  this._zIndex = undefined;
  this._zIndexSubscription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(CorridorGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof CorridorGraphics.prototype
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },

  /**
   * Gets or sets the boolean Property specifying the visibility of the corridor.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets a Property specifying the array of {@link Cartesian3} positions that define the centerline of the corridor.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   */
  positions: createPropertyDescriptor("positions"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   */
  width: createPropertyDescriptor("width"),

  /**
   * Gets or sets the numeric Property specifying the altitude of the corridor.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default 0.0
   */
  height: createPropertyDescriptor("height"),

  /**
   * Gets or sets the Property specifying the {@link HeightReference}.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  heightReference: createPropertyDescriptor("heightReference"),

  /**
   * Gets or sets the numeric Property specifying the altitude of the corridor extrusion.
   * Setting this property creates a corridor shaped volume starting at height and ending
   * at this altitude.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   */
  extrudedHeight: createPropertyDescriptor("extrudedHeight"),

  /**
   * Gets or sets the Property specifying the extruded {@link HeightReference}.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  extrudedHeightReference: createPropertyDescriptor("extrudedHeightReference"),

  /**
   * Gets or sets the {@link CornerType} Property specifying how corners are styled.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default CornerType.ROUNDED
   */
  cornerType: createPropertyDescriptor("cornerType"),

  /**
   * Gets or sets the numeric Property specifying the sampling distance between each latitude and longitude point.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default {CesiumMath.RADIANS_PER_DEGREE}
   */
  granularity: createPropertyDescriptor("granularity"),

  /**
   * Gets or sets the boolean Property specifying whether the corridor is filled with the provided material.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  fill: createPropertyDescriptor("fill"),

  /**
   * Gets or sets the Property specifying the material used to fill the corridor.
   * @memberof CorridorGraphics.prototype
   * @type {MaterialProperty|undefined}
   * @default Color.WHITE
   */
  material: createMaterialPropertyDescriptor("material"),

  /**
   * Gets or sets the Property specifying whether the corridor is outlined.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  outline: createPropertyDescriptor("outline"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * <p>
   * Note: This property will be ignored on all major browsers on Windows platforms. For details, see (@link https://github.com/CesiumGS/cesium/issues/40}.
   * </p>
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Get or sets the enum Property specifying whether the corridor
   * casts or receives shadows from light sources.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.DISABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this corridor will be displayed.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),

  /**
   * Gets or sets the {@link ClassificationType} Property specifying whether this corridor will classify terrain, 3D Tiles, or both when on the ground.
   * @memberof CorridorGraphics.prototype
   * @type {Property|undefined}
   * @default ClassificationType.BOTH
   */
  classificationType: createPropertyDescriptor("classificationType"),

  /**
   * Gets or sets the zIndex Property specifying the ordering of the corridor.  Only has an effect if the coridor is static and neither height or exturdedHeight are specified.
   * @memberof CorridorGraphics.prototype
   * @type {ConstantProperty|undefined}
   * @default 0
   */
  zIndex: createPropertyDescriptor("zIndex"),
});

/**
 * Duplicates this instance.
 *
 * @param {CorridorGraphics} [result] The object onto which to store the result.
 * @returns {CorridorGraphics} The modified result parameter or a new instance if one was not provided.
 */
CorridorGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new CorridorGraphics(this);
  }
  result.show = this.show;
  result.positions = this.positions;
  result.width = this.width;
  result.height = this.height;
  result.heightReference = this.heightReference;
  result.extrudedHeight = this.extrudedHeight;
  result.extrudedHeightReference = this.extrudedHeightReference;
  result.cornerType = this.cornerType;
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
 * @param {CorridorGraphics} source The object to be merged into this object.
 */
CorridorGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.positions = defaultValue(this.positions, source.positions);
  this.width = defaultValue(this.width, source.width);
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
  this.cornerType = defaultValue(this.cornerType, source.cornerType);
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
export default CorridorGraphics;
