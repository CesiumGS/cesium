import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createMaterialPropertyDescriptor from "./createMaterialPropertyDescriptor.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {Object} PlaneGraphics.ConstructorOptions
 *
 * Initialization options for the PlaneGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the plane.
 * @property {Property | Plane} [plane] A {@link Plane} Property specifying the normal and distance for the plane.
 * @property {Property | Cartesian2} [dimensions] A {@link Cartesian2} Property specifying the width and height of the plane.
 * @property {Property | boolean} [fill=true] A boolean Property specifying whether the plane is filled with the provided material.
 * @property {MaterialProperty | Color} [material=Color.WHITE] A Property specifying the material used to fill the plane.
 * @property {Property | boolean} [outline=false] A boolean Property specifying whether the plane is outlined.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the width of the outline.
 * @property {Property | ShadowMode} [shadows=ShadowMode.DISABLED] An enum Property specifying whether the plane casts or receives shadows from light sources.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this plane will be displayed.
 */

/**
 * Describes a plane. The center position and orientation are determined by the containing {@link Entity}.
 *
 * @alias PlaneGraphics
 * @constructor
 *
 * @param {PlaneGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Plane.html|Cesium Sandcastle Plane Demo}
 */
function PlaneGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._plane = undefined;
  this._planeSubscription = undefined;
  this._dimensions = undefined;
  this._dimensionsSubscription = undefined;
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

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(PlaneGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof PlaneGraphics.prototype
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },

  /**
   * Gets or sets the boolean Property specifying the visibility of the plane.
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the {@link Plane} Property specifying the normal and distance of the plane.
   *
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   */
  plane: createPropertyDescriptor("plane"),

  /**
   * Gets or sets the {@link Cartesian2} Property specifying the width and height of the plane.
   *
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   */
  dimensions: createPropertyDescriptor("dimensions"),

  /**
   * Gets or sets the boolean Property specifying whether the plane is filled with the provided material.
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  fill: createPropertyDescriptor("fill"),

  /**
   * Gets or sets the material used to fill the plane.
   * @memberof PlaneGraphics.prototype
   * @type {MaterialProperty}
   * @default Color.WHITE
   */
  material: createMaterialPropertyDescriptor("material"),

  /**
   * Gets or sets the Property specifying whether the plane is outlined.
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  outline: createPropertyDescriptor("outline"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof PlaneGraphics.prototype
   * @type {Color|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * <p>
   * Note: This property will be ignored on all major browsers on Windows platforms. For details, see (@link https://github.com/CesiumGS/cesium/issues/40}.
   * </p>
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Get or sets the enum Property specifying whether the plane
   * casts or receives shadows from light sources.
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.DISABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this plane will be displayed.
   * @memberof PlaneGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),
});

/**
 * Duplicates this instance.
 *
 * @param {PlaneGraphics} [result] The object onto which to store the result.
 * @returns {PlaneGraphics} The modified result parameter or a new instance if one was not provided.
 */
PlaneGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new PlaneGraphics(this);
  }
  result.show = this.show;
  result.plane = this.plane;
  result.dimensions = this.dimensions;
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
 * @param {PlaneGraphics} source The object to be merged into this object.
 */
PlaneGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.plane = defaultValue(this.plane, source.plane);
  this.dimensions = defaultValue(this.dimensions, source.dimensions);
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
export default PlaneGraphics;
