import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createMaterialPropertyDescriptor from "./createMaterialPropertyDescriptor.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {Object} PolylineVolumeGraphics.ConstructorOptions
 *
 * Initialization options for the PolylineVolumeGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the volume.
 * @property {Property | Array<Cartesian3>} [positions] A Property specifying the array of {@link Cartesian3} positions which define the line strip.
 * @property {Property | Array<Cartesian2>} [shape] A Property specifying the array of {@link Cartesian2} positions which define the shape to be extruded.
 * @property {Property | CornerType} [cornerType=CornerType.ROUNDED] A {@link CornerType} Property specifying the style of the corners.
 * @property {Property | number} [granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude point.
 * @property {Property | boolean} [fill=true] A boolean Property specifying whether the volume is filled with the provided material.
 * @property {MaterialProperty | Color} [material=Color.WHITE] A Property specifying the material used to fill the volume.
 * @property {Property | boolean} [outline=false] A boolean Property specifying whether the volume is outlined.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the width of the outline.
 * @property {Property | ShadowMode} [shadows=ShadowMode.DISABLED] An enum Property specifying whether the volume casts or receives shadows from light sources.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this volume will be displayed.
 */

/**
 * Describes a polyline volume defined as a line strip and corresponding two dimensional shape which is extruded along it.
 * The resulting volume conforms to the curvature of the globe.
 *
 * @alias PolylineVolumeGraphics
 * @constructor
 *
 * @param {PolylineVolumeGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @see Entity
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Polyline%20Volume.html|Cesium Sandcastle Polyline Volume Demo}
 */
function PolylineVolumeGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._positions = undefined;
  this._positionsSubscription = undefined;
  this._shape = undefined;
  this._shapeSubscription = undefined;
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
  this._distanceDisplayConditionSubsription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(PolylineVolumeGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof PolylineVolumeGraphics.prototype
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
   * Gets or sets the boolean Property specifying the visibility of the volume.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the Property specifying the array of {@link Cartesian3} positions which define the line strip.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   */
  positions: createPropertyDescriptor("positions"),

  /**
   * Gets or sets the Property specifying the array of {@link Cartesian2} positions which define the shape to be extruded.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   */
  shape: createPropertyDescriptor("shape"),

  /**
   * Gets or sets the {@link CornerType} Property specifying the style of the corners.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default CornerType.ROUNDED
   */
  cornerType: createPropertyDescriptor("cornerType"),

  /**
   * Gets or sets the numeric Property specifying the angular distance between points on the volume.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default {CesiumMath.RADIANS_PER_DEGREE}
   */
  granularity: createPropertyDescriptor("granularity"),

  /**
   * Gets or sets the boolean Property specifying whether the volume is filled with the provided material.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  fill: createPropertyDescriptor("fill"),

  /**
   * Gets or sets the Property specifying the material used to fill the volume.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {MaterialProperty}
   * @default Color.WHITE
   */
  material: createMaterialPropertyDescriptor("material"),

  /**
   * Gets or sets the Property specifying whether the volume is outlined.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  outline: createPropertyDescriptor("outline"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Get or sets the enum Property specifying whether the volume
   * casts or receives shadows from light sources.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.DISABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this volume will be displayed.
   * @memberof PolylineVolumeGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),
});

/**
 * Duplicates this instance.
 *
 * @param {PolylineVolumeGraphics} [result] The object onto which to store the result.
 * @returns {PolylineVolumeGraphics} The modified result parameter or a new instance if one was not provided.
 */
PolylineVolumeGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new PolylineVolumeGraphics(this);
  }
  result.show = this.show;
  result.positions = this.positions;
  result.shape = this.shape;
  result.cornerType = this.cornerType;
  result.granularity = this.granularity;
  result.fill = this.fill;
  result.material = this.material;
  result.outline = this.outline;
  result.outlineColor = this.outlineColor;
  result.outlineWidth = this.outlineWidth;
  result.shadows = this.shadows;
  result.distanceDisplayCondition = this.distanceDisplayCondition;
  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {PolylineVolumeGraphics} source The object to be merged into this object.
 */
PolylineVolumeGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.positions = defaultValue(this.positions, source.positions);
  this.shape = defaultValue(this.shape, source.shape);
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
};
export default PolylineVolumeGraphics;
