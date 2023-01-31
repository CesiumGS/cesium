import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * @typedef {Object} LabelGraphics.ConstructorOptions
 *
 * Initialization options for the LabelGraphics constructor
 *
 * @property {Property | boolean} [show=true] A boolean Property specifying the visibility of the label.
 * @property {Property | string} [text] A Property specifying the text. Explicit newlines '\n' are supported.
 * @property {Property | string} [font='30px sans-serif'] A Property specifying the CSS font.
 * @property {Property | LabelStyle} [style=LabelStyle.FILL] A Property specifying the {@link LabelStyle}.
 * @property {Property | number} [scale=1.0] A numeric Property specifying the scale to apply to the text.
 * @property {Property | boolean} [showBackground=false] A boolean Property specifying the visibility of the background behind the label.
 * @property {Property | Color} [backgroundColor=new Color(0.165, 0.165, 0.165, 0.8)] A Property specifying the background {@link Color}.
 * @property {Property | Cartesian2} [backgroundPadding=new Cartesian2(7, 5)] A {@link Cartesian2} Property specifying the horizontal and vertical background padding in pixels.
 * @property {Property | Cartesian2} [pixelOffset=Cartesian2.ZERO] A {@link Cartesian2} Property specifying the pixel offset.
 * @property {Property | Cartesian3} [eyeOffset=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the eye offset.
 * @property {Property | HorizontalOrigin} [horizontalOrigin=HorizontalOrigin.CENTER] A Property specifying the {@link HorizontalOrigin}.
 * @property {Property | VerticalOrigin} [verticalOrigin=VerticalOrigin.CENTER] A Property specifying the {@link VerticalOrigin}.
 * @property {Property | HeightReference} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
 * @property {Property | Color} [fillColor=Color.WHITE] A Property specifying the fill {@link Color}.
 * @property {Property | Color} [outlineColor=Color.BLACK] A Property specifying the outline {@link Color}.
 * @property {Property | number} [outlineWidth=1.0] A numeric Property specifying the outline width.
 * @property {Property | NearFarScalar} [translucencyByDistance] A {@link NearFarScalar} Property used to set translucency based on distance from the camera.
 * @property {Property | NearFarScalar} [pixelOffsetScaleByDistance] A {@link NearFarScalar} Property used to set pixelOffset based on distance from the camera.
 * @property {Property | NearFarScalar} [scaleByDistance] A {@link NearFarScalar} Property used to set scale based on distance from the camera.
 * @property {Property | DistanceDisplayCondition} [distanceDisplayCondition] A Property specifying at what distance from the camera that this label will be displayed.
 * @property {Property | number} [disableDepthTestDistance] A Property specifying the distance from the camera at which to disable the depth test to.
 */

/**
 * Describes a two dimensional label located at the position of the containing {@link Entity}.
 * <p>
 * <div align='center'>
 * <img src='Images/Label.png' width='400' height='300' /><br />
 * Example labels
 * </div>
 * </p>
 *
 * @alias LabelGraphics
 * @constructor
 *
 * @param {LabelGraphics.ConstructorOptions} [options] Object describing initialization options
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
 */
function LabelGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._text = undefined;
  this._textSubscription = undefined;
  this._font = undefined;
  this._fontSubscription = undefined;
  this._style = undefined;
  this._styleSubscription = undefined;
  this._scale = undefined;
  this._scaleSubscription = undefined;
  this._showBackground = undefined;
  this._showBackgroundSubscription = undefined;
  this._backgroundColor = undefined;
  this._backgroundColorSubscription = undefined;
  this._backgroundPadding = undefined;
  this._backgroundPaddingSubscription = undefined;
  this._pixelOffset = undefined;
  this._pixelOffsetSubscription = undefined;
  this._eyeOffset = undefined;
  this._eyeOffsetSubscription = undefined;
  this._horizontalOrigin = undefined;
  this._horizontalOriginSubscription = undefined;
  this._verticalOrigin = undefined;
  this._verticalOriginSubscription = undefined;
  this._heightReference = undefined;
  this._heightReferenceSubscription = undefined;
  this._fillColor = undefined;
  this._fillColorSubscription = undefined;
  this._outlineColor = undefined;
  this._outlineColorSubscription = undefined;
  this._outlineWidth = undefined;
  this._outlineWidthSubscription = undefined;
  this._translucencyByDistance = undefined;
  this._translucencyByDistanceSubscription = undefined;
  this._pixelOffsetScaleByDistance = undefined;
  this._pixelOffsetScaleByDistanceSubscription = undefined;
  this._scaleByDistance = undefined;
  this._scaleByDistanceSubscription = undefined;
  this._distanceDisplayCondition = undefined;
  this._distanceDisplayConditionSubscription = undefined;
  this._disableDepthTestDistance = undefined;
  this._disableDepthTestDistanceSubscription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(LabelGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof LabelGraphics.prototype
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
   * Gets or sets the boolean Property specifying the visibility of the label.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the string Property specifying the text of the label.
   * Explicit newlines '\n' are supported.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  text: createPropertyDescriptor("text"),

  /**
   * Gets or sets the string Property specifying the font in CSS syntax.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/font|CSS font on MDN}
   */
  font: createPropertyDescriptor("font"),

  /**
   * Gets or sets the Property specifying the {@link LabelStyle}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  style: createPropertyDescriptor("style"),

  /**
   * Gets or sets the numeric Property specifying the uniform scale to apply to the image.
   * A scale greater than <code>1.0</code> enlarges the label while a scale less than <code>1.0</code> shrinks it.
   * <p>
   * <div align='center'>
   * <img src='Images/Label.setScale.png' width='400' height='300' /><br/>
   * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
   * and <code>2.0</code>.
   * </div>
   * </p>
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default 1.0
   */
  scale: createPropertyDescriptor("scale"),

  /**
   * Gets or sets the boolean Property specifying the visibility of the background behind the label.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default false
   */
  showBackground: createPropertyDescriptor("showBackground"),

  /**
   * Gets or sets the Property specifying the background {@link Color}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default new Color(0.165, 0.165, 0.165, 0.8)
   */
  backgroundColor: createPropertyDescriptor("backgroundColor"),

  /**
   * Gets or sets the {@link Cartesian2} Property specifying the label's horizontal and vertical
   * background padding in pixels.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default new Cartesian2(7, 5)
   */
  backgroundPadding: createPropertyDescriptor("backgroundPadding"),

  /**
   * Gets or sets the {@link Cartesian2} Property specifying the label's pixel offset in screen space
   * from the origin of this label.  This is commonly used to align multiple labels and labels at
   * the same position, e.g., an image and text.  The screen space origin is the top, left corner of the
   * canvas; <code>x</code> increases from left to right, and <code>y</code> increases from top to bottom.
   * <p>
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>default</code><br/><img src='Images/Label.setPixelOffset.default.png' width='250' height='188' /></td>
   * <td align='center'><code>l.pixeloffset = new Cartesian2(25, 75);</code><br/><img src='Images/Label.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
   * </tr></table>
   * The label's origin is indicated by the yellow point.
   * </div>
   * </p>
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default Cartesian2.ZERO
   */
  pixelOffset: createPropertyDescriptor("pixelOffset"),

  /**
   * Gets or sets the {@link Cartesian3} Property specifying the label's offset in eye coordinates.
   * Eye coordinates is a left-handed coordinate system, where <code>x</code> points towards the viewer's
   * right, <code>y</code> points up, and <code>z</code> points into the screen.
   * <p>
   * An eye offset is commonly used to arrange multiple labels or objects at the same position, e.g., to
   * arrange a label above its corresponding 3D model.
   * </p>
   * Below, the label is positioned at the center of the Earth but an eye offset makes it always
   * appear on top of the Earth regardless of the viewer's or Earth's orientation.
   * <p>
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
   * </tr></table>
   * <code>l.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code><br /><br />
   * </div>
   * </p>
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default Cartesian3.ZERO
   */
  eyeOffset: createPropertyDescriptor("eyeOffset"),

  /**
   * Gets or sets the Property specifying the {@link HorizontalOrigin}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  horizontalOrigin: createPropertyDescriptor("horizontalOrigin"),

  /**
   * Gets or sets the Property specifying the {@link VerticalOrigin}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  verticalOrigin: createPropertyDescriptor("verticalOrigin"),

  /**
   * Gets or sets the Property specifying the {@link HeightReference}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   * @default HeightReference.NONE
   */
  heightReference: createPropertyDescriptor("heightReference"),

  /**
   * Gets or sets the Property specifying the fill {@link Color}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  fillColor: createPropertyDescriptor("fillColor"),

  /**
   * Gets or sets the Property specifying the outline {@link Color}.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  outlineColor: createPropertyDescriptor("outlineColor"),

  /**
   * Gets or sets the numeric Property specifying the outline width.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  outlineWidth: createPropertyDescriptor("outlineWidth"),

  /**
   * Gets or sets {@link NearFarScalar} Property specifying the translucency of the label based on the distance from the camera.
   * A label's translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's translucency remains clamped to the nearest bound.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  translucencyByDistance: createPropertyDescriptor("translucencyByDistance"),

  /**
   * Gets or sets {@link NearFarScalar} Property specifying the pixel offset of the label based on the distance from the camera.
   * A label's pixel offset will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's pixel offset remains clamped to the nearest bound.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  pixelOffsetScaleByDistance: createPropertyDescriptor(
    "pixelOffsetScaleByDistance"
  ),

  /**
   * Gets or sets near and far scaling properties of a Label based on the label's distance from the camera.
   * A label's scale will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's scale remains clamped to the nearest bound.  If undefined,
   * scaleByDistance will be disabled.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  scaleByDistance: createPropertyDescriptor("scaleByDistance"),

  /**
   * Gets or sets the {@link DistanceDisplayCondition} Property specifying at what distance from the camera that this label will be displayed.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  distanceDisplayCondition: createPropertyDescriptor(
    "distanceDisplayCondition"
  ),

  /**
   * Gets or sets the distance from the camera at which to disable the depth test to, for example, prevent clipping against terrain.
   * When set to zero, the depth test is always applied. When set to Number.POSITIVE_INFINITY, the depth test is never applied.
   * @memberof LabelGraphics.prototype
   * @type {Property|undefined}
   */
  disableDepthTestDistance: createPropertyDescriptor(
    "disableDepthTestDistance"
  ),
});

/**
 * Duplicates this instance.
 *
 * @param {LabelGraphics} [result] The object onto which to store the result.
 * @returns {LabelGraphics} The modified result parameter or a new instance if one was not provided.
 */
LabelGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new LabelGraphics(this);
  }
  result.show = this.show;
  result.text = this.text;
  result.font = this.font;
  result.style = this.style;
  result.scale = this.scale;
  result.showBackground = this.showBackground;
  result.backgroundColor = this.backgroundColor;
  result.backgroundPadding = this.backgroundPadding;
  result.pixelOffset = this.pixelOffset;
  result.eyeOffset = this.eyeOffset;
  result.horizontalOrigin = this.horizontalOrigin;
  result.verticalOrigin = this.verticalOrigin;
  result.heightReference = this.heightReference;
  result.fillColor = this.fillColor;
  result.outlineColor = this.outlineColor;
  result.outlineWidth = this.outlineWidth;
  result.translucencyByDistance = this.translucencyByDistance;
  result.pixelOffsetScaleByDistance = this.pixelOffsetScaleByDistance;
  result.scaleByDistance = this.scaleByDistance;
  result.distanceDisplayCondition = this.distanceDisplayCondition;
  result.disableDepthTestDistance = this.disableDepthTestDistance;
  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {LabelGraphics} source The object to be merged into this object.
 */
LabelGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.text = defaultValue(this.text, source.text);
  this.font = defaultValue(this.font, source.font);
  this.style = defaultValue(this.style, source.style);
  this.scale = defaultValue(this.scale, source.scale);
  this.showBackground = defaultValue(
    this.showBackground,
    source.showBackground
  );
  this.backgroundColor = defaultValue(
    this.backgroundColor,
    source.backgroundColor
  );
  this.backgroundPadding = defaultValue(
    this.backgroundPadding,
    source.backgroundPadding
  );
  this.pixelOffset = defaultValue(this.pixelOffset, source.pixelOffset);
  this.eyeOffset = defaultValue(this.eyeOffset, source.eyeOffset);
  this.horizontalOrigin = defaultValue(
    this.horizontalOrigin,
    source.horizontalOrigin
  );
  this.verticalOrigin = defaultValue(
    this.verticalOrigin,
    source.verticalOrigin
  );
  this.heightReference = defaultValue(
    this.heightReference,
    source.heightReference
  );
  this.fillColor = defaultValue(this.fillColor, source.fillColor);
  this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
  this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
  this.translucencyByDistance = defaultValue(
    this.translucencyByDistance,
    source.translucencyByDistance
  );
  this.pixelOffsetScaleByDistance = defaultValue(
    this.pixelOffsetScaleByDistance,
    source.pixelOffsetScaleByDistance
  );
  this.scaleByDistance = defaultValue(
    this.scaleByDistance,
    source.scaleByDistance
  );
  this.distanceDisplayCondition = defaultValue(
    this.distanceDisplayCondition,
    source.distanceDisplayCondition
  );
  this.disableDepthTestDistance = defaultValue(
    this.disableDepthTestDistance,
    source.disableDepthTestDistance
  );
};
export default LabelGraphics;
