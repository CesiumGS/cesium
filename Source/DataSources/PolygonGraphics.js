import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import PolygonHierarchy from "../Core/PolygonHierarchy.js";
import ConstantProperty from "./ConstantProperty.js";
import createMaterialPropertyDescriptor from "./createMaterialPropertyDescriptor.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

function createPolygonHierarchyProperty(value) {
  if (Array.isArray(value)) {
    // convert array of positions to PolygonHierarchy object
    value = new PolygonHierarchy(value);
  }
  return new ConstantProperty(value);
}

/**
 * @typedef {Object} PolygonGraphics.ConstructorOptions
 *
 * Initialization options for the PolygonGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the polygon.
 * @property {Property | PolygonHierarchy} [hierarchy] A Property specifying the {@link PolygonHierarchy}.
 * @property {Property | number} [height=0] A numeric Property specifying the altitude of the polygon relative to the ellipsoid surface.
 * @property {Property | HeightReference} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
 * @property {Property | number} [extrudedHeight] A numeric Property specifying the altitude of the polygon's extruded face relative to the ellipsoid surface.
 * @property {Property | HeightReference} [extrudedHeightReference=HeightReference.NONE] A Property specifying what the extrudedHeight is relative to.
 * @property {Property | number} [stRotation=0.0] A numeric property specifying the rotation of the polygon texture counter-clockwise from north.
 * @property {Property | number} [granularity=Cesium.Math.RADIANS_PER_DEGREE] A numeric Property specifying the angular distance between each latitude and longitude point.
 * @property {Property | boolean} [fill=true] A boolean Property specifying whether the polygon is filled with the provided material.
 * @property {MaterialProperty | Color} [material=Color.WHITE] A Property specifying the material used to fill the polygon.
 * @property {Property | boolean} [outline=false] A boolean Property specifying whether the polygon is outlined.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the {@link Color} of the outline.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the width of the outline.
 * @property {Property | boolean} [perPositionHeight=false] A boolean specifying whether or not the height of each position is used.
 * @property {Boolean | boolean} [closeTop=true] When false, leaves off the top of an extruded polygon open.
 * @property {Boolean | boolean} [closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
 * @property {Property | ArcType} [arcType=ArcType.GEODESIC] The type of line the polygon edges must follow.
 * @property {Property | ShadowMode} [shadows=ShadowMode.DISABLED] An enum Property specifying whether the polygon casts or receives shadows from light sources.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this polygon will be displayed.
 * @property {Property | ClassificationType} [classificationType=ClassificationType.BOTH] An enum Property specifying whether this polygon will classify terrain, 3D Tiles, or both when on the ground.
 * @property {ConstantProperty | number} [zIndex=0] A property specifying the zIndex used for ordering ground geometry.  Only has an effect if the polygon is constant and neither height or extrudedHeight are specified.
 */

/**
 * Describes a polygon defined by an hierarchy of linear rings which make up the outer shape and any nested holes.
 * The polygon conforms to the curvature of the globe and can be placed on the surface or
 * at altitude and can optionally be extruded into a volume.
 *
 * @alias PolygonGraphics
 * @constructor
 *
 * @param {PolygonGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @see Entity
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
 */
function PolygonGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._hierarchy = undefined;
  this._hierarchySubscription = undefined;
  this._height = undefined;
  this._heightSubscription = undefined;
  this._heightReference = undefined;
  this._heightReferenceSubscription = undefined;
  this._extrudedHeight = undefined;
  this._extrudedHeightSubscription = undefined;
  this._extrudedHeightReference = undefined;
  this._extrudedHeightReferenceSubscription = undefined;
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
  this._perPositionHeight = undefined;
  this._perPositionHeightSubscription = undefined;
  this._closeTop = undefined;
  this._closeTopSubscription = undefined;
  this._closeBottom = undefined;
  this._closeBottomSubscription = undefined;
  this._arcType = undefined;
  this._arcTypeSubscription = undefined;
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

Object.defineProperties(PolygonGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof PolygonGraphics.prototype
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
   * Gets or sets the boolean Property specifying the visibility of the polygon.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the Property specifying the {@link PolygonHierarchy}.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  hierarchy: createPropertyDescriptor(
    "hierarchy",
    undefined,
    createPolygonHierarchyProperty
  ),

  /**
   * Gets or sets the numeric Property specifying the constant altitude of the polygon.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default 0.0
   */
  height: createPropertyDescriptor("height"),

  /**
   * Gets or sets the Property specifying the {@link HeightReference}.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  heightReference: createPropertyDescriptor("heightReference"),

  /**
   * Gets or sets the numeric Property specifying the altitude of the polygon extrusion.
   * If {@link PolygonGraphics#perPositionHeight} is false, the volume starts at {@link PolygonGraphics#height} and ends at this altitude.
   * If {@link PolygonGraphics#perPositionHeight} is true, the volume starts at the height of each {@link PolygonGraphics#hierarchy} position and ends at this altitude.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  extrudedHeight: createPropertyDescriptor("extrudedHeight"),

  /**
   * Gets or sets the Property specifying the extruded {@link HeightReference}.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  extrudedHeightReference: createPropertyDescriptor("extrudedHeightReference"),

  /**
   * Gets or sets the numeric property specifying the rotation of the polygon texture counter-clockwise from north.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default 0
   */
  stRotation: createPropertyDescriptor("stRotation"),

  /**
   * Gets or sets the numeric Property specifying the angular distance between points on the polygon.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default {CesiumMath.RADIANS_PER_DEGREE}
   */
  granularity: createPropertyDescriptor("granularity"),

  /**
   * Gets or sets the boolean Property specifying whether the polygon is filled with the provided material.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default true
   */
  fill: createPropertyDescriptor("fill"),

  /**
   * Gets or sets the Property specifying the material used to fill the polygon.
   * @memberof PolygonGraphics.prototype
   * @type {MaterialProperty}
   * @default Color.WHITE
   */
  material: createMaterialPropertyDescriptor("material"),

  /**
   * Gets or sets the Property specifying whether the polygon is outlined.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  outline: createPropertyDescriptor("outline"),

  /**
   * Gets or sets the Property specifying the {@link Color} of the outline.
   * @memberof PolygonGraphics.prototype
   * @type {Color|undefined}
   * @default Color.BLACK
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the width of the outline.
   * <p>
   * Note: This property will be ignored on all major browsers on Windows platforms. For details, see (@link https://github.com/CesiumGS/cesium/issues/40}.
   * </p>
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Gets or sets the boolean specifying whether or not the the height of each position is used.
   * If true, the shape will have non-uniform altitude defined by the height of each {@link PolygonGraphics#hierarchy} position.
   * If false, the shape will have a constant altitude as specified by {@link PolygonGraphics#height}.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  perPositionHeight: createPropertyDescriptor("perPositionHeight"),

  /**
   * Gets or sets a boolean specifying whether or not the top of an extruded polygon is included.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  closeTop: createPropertyDescriptor("closeTop"),

  /**
   * Gets or sets a boolean specifying whether or not the bottom of an extruded polygon is included.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  closeBottom: createPropertyDescriptor("closeBottom"),

  /**
   * Gets or sets the {@link ArcType} Property specifying the type of lines the polygon edges use.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default ArcType.GEODESIC
   */
  arcType: createPropertyDescriptor("arcType"),

  /**
   * Get or sets the enum Property specifying whether the polygon
   * casts or receives shadows from light sources.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default ShadowMode.DISABLED
   */
  shadows: createPropertyDescriptor("shadows"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this polygon will be displayed.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),

  /**
   * Gets or sets the {@link ClassificationType} Property specifying whether this polygon will classify terrain, 3D Tiles, or both when on the ground.
   * @memberof PolygonGraphics.prototype
   * @type {Property|undefined}
   * @default ClassificationType.BOTH
   */
  classificationType: createPropertyDescriptor("classificationType"),

  /**
   * Gets or sets the zIndex Prperty specifying the ordering of ground geometry.  Only has an effect if the polygon is constant and neither height or extrudedHeight are specified.
   * @memberof PolygonGraphics.prototype
   * @type {ConstantProperty|undefined}
   * @default 0
   */
  zIndex: createPropertyDescriptor("zIndex"),
});

/**
 * Duplicates this instance.
 *
 * @param {PolygonGraphics} [result] The object onto which to store the result.
 * @returns {PolygonGraphics} The modified result parameter or a new instance if one was not provided.
 */
PolygonGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new PolygonGraphics(this);
  }
  result.show = this.show;
  result.hierarchy = this.hierarchy;
  result.height = this.height;
  result.heightReference = this.heightReference;
  result.extrudedHeight = this.extrudedHeight;
  result.extrudedHeightReference = this.extrudedHeightReference;
  result.stRotation = this.stRotation;
  result.granularity = this.granularity;
  result.fill = this.fill;
  result.material = this.material;
  result.outline = this.outline;
  result.outlineColor = this.outlineColor;
  result.outlineWidth = this.outlineWidth;
  result.perPositionHeight = this.perPositionHeight;
  result.closeTop = this.closeTop;
  result.closeBottom = this.closeBottom;
  result.arcType = this.arcType;
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
 * @param {PolygonGraphics} source The object to be merged into this object.
 */
PolygonGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.hierarchy = defaultValue(this.hierarchy, source.hierarchy);
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
  this.stRotation = defaultValue(this.stRotation, source.stRotation);
  this.granularity = defaultValue(this.granularity, source.granularity);
  this.fill = defaultValue(this.fill, source.fill);
  this.material = defaultValue(this.material, source.material);
  this.outline = defaultValue(this.outline, source.outline);
  this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
  this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
  this.perPositionHeight = defaultValue(
    this.perPositionHeight,
    source.perPositionHeight
  );
  this.closeTop = defaultValue(this.closeTop, source.closeTop);
  this.closeBottom = defaultValue(this.closeBottom, source.closeBottom);
  this.arcType = defaultValue(this.arcType, source.arcType);
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
export default PolygonGraphics;
