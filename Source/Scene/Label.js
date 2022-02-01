import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import DistanceDisplayCondition from "../Core/DistanceDisplayCondition.js";
import NearFarScalar from "../Core/NearFarScalar.js";
import Billboard from "./Billboard.js";
import HeightReference from "./HeightReference.js";
import HorizontalOrigin from "./HorizontalOrigin.js";
import LabelStyle from "./LabelStyle.js";
import SDFSettings from "./SDFSettings.js";
import VerticalOrigin from "./VerticalOrigin.js";

const fontInfoCache = {};
let fontInfoCacheLength = 0;
const fontInfoCacheMaxSize = 256;
const defaultBackgroundColor = new Color(0.165, 0.165, 0.165, 0.8);
const defaultBackgroundPadding = new Cartesian2(7, 5);

const textTypes = Object.freeze({
  LTR: 0,
  RTL: 1,
  WEAK: 2,
  BRACKETS: 3,
});

function rebindAllGlyphs(label) {
  if (!label._rebindAllGlyphs && !label._repositionAllGlyphs) {
    // only push label if it's not already been marked dirty
    label._labelCollection._labelsToUpdate.push(label);
  }
  label._rebindAllGlyphs = true;
}

function repositionAllGlyphs(label) {
  if (!label._rebindAllGlyphs && !label._repositionAllGlyphs) {
    // only push label if it's not already been marked dirty
    label._labelCollection._labelsToUpdate.push(label);
  }
  label._repositionAllGlyphs = true;
}

function getCSSValue(element, property) {
  return document.defaultView
    .getComputedStyle(element, null)
    .getPropertyValue(property);
}

function parseFont(label) {
  let fontInfo = fontInfoCache[label._font];
  if (!defined(fontInfo)) {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.opacity = 0;
    div.style.font = label._font;
    document.body.appendChild(div);

    let lineHeight = parseFloat(getCSSValue(div, "line-height"));
    if (isNaN(lineHeight)) {
      // line-height isn't a number, i.e. 'normal'; apply default line-spacing
      lineHeight = undefined;
    }

    fontInfo = {
      family: getCSSValue(div, "font-family"),
      size: getCSSValue(div, "font-size").replace("px", ""),
      style: getCSSValue(div, "font-style"),
      weight: getCSSValue(div, "font-weight"),
      lineHeight: lineHeight,
    };

    document.body.removeChild(div);
    if (fontInfoCacheLength < fontInfoCacheMaxSize) {
      fontInfoCache[label._font] = fontInfo;
      fontInfoCacheLength++;
    }
  }
  label._fontFamily = fontInfo.family;
  label._fontSize = fontInfo.size;
  label._fontStyle = fontInfo.style;
  label._fontWeight = fontInfo.weight;
  label._lineHeight = fontInfo.lineHeight;
}

/**
 * A Label draws viewport-aligned text positioned in the 3D scene.  This constructor
 * should not be used directly, instead create labels by calling {@link LabelCollection#add}.
 *
 * @alias Label
 * @internalConstructor
 * @class
 *
 * @exception {DeveloperError} translucencyByDistance.far must be greater than translucencyByDistance.near
 * @exception {DeveloperError} pixelOffsetScaleByDistance.far must be greater than pixelOffsetScaleByDistance.near
 * @exception {DeveloperError} distanceDisplayCondition.far must be greater than distanceDisplayCondition.near
 *
 * @see LabelCollection
 * @see LabelCollection#add
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
 */
function Label(options, labelCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (
    defined(options.disableDepthTestDistance) &&
    options.disableDepthTestDistance < 0.0
  ) {
    throw new DeveloperError(
      "disableDepthTestDistance must be greater than 0.0."
    );
  }
  //>>includeEnd('debug');

  let translucencyByDistance = options.translucencyByDistance;
  let pixelOffsetScaleByDistance = options.pixelOffsetScaleByDistance;
  let scaleByDistance = options.scaleByDistance;
  let distanceDisplayCondition = options.distanceDisplayCondition;
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

  this._renderedText = undefined;
  this._text = undefined;
  this._show = defaultValue(options.show, true);
  this._font = defaultValue(options.font, "30px sans-serif");
  this._fillColor = Color.clone(defaultValue(options.fillColor, Color.WHITE));
  this._outlineColor = Color.clone(
    defaultValue(options.outlineColor, Color.BLACK)
  );
  this._outlineWidth = defaultValue(options.outlineWidth, 1.0);
  this._showBackground = defaultValue(options.showBackground, false);
  this._backgroundColor = Color.clone(
    defaultValue(options.backgroundColor, defaultBackgroundColor)
  );
  this._backgroundPadding = Cartesian2.clone(
    defaultValue(options.backgroundPadding, defaultBackgroundPadding)
  );
  this._style = defaultValue(options.style, LabelStyle.FILL);
  this._verticalOrigin = defaultValue(
    options.verticalOrigin,
    VerticalOrigin.BASELINE
  );
  this._horizontalOrigin = defaultValue(
    options.horizontalOrigin,
    HorizontalOrigin.LEFT
  );
  this._pixelOffset = Cartesian2.clone(
    defaultValue(options.pixelOffset, Cartesian2.ZERO)
  );
  this._eyeOffset = Cartesian3.clone(
    defaultValue(options.eyeOffset, Cartesian3.ZERO)
  );
  this._position = Cartesian3.clone(
    defaultValue(options.position, Cartesian3.ZERO)
  );
  this._scale = defaultValue(options.scale, 1.0);
  this._id = options.id;
  this._translucencyByDistance = translucencyByDistance;
  this._pixelOffsetScaleByDistance = pixelOffsetScaleByDistance;
  this._scaleByDistance = scaleByDistance;
  this._heightReference = defaultValue(
    options.heightReference,
    HeightReference.NONE
  );
  this._distanceDisplayCondition = distanceDisplayCondition;
  this._disableDepthTestDistance = options.disableDepthTestDistance;

  this._labelCollection = labelCollection;
  this._glyphs = [];
  this._backgroundBillboard = undefined;
  this._batchIndex = undefined; // Used only by Vector3DTilePoints and BillboardCollection

  this._rebindAllGlyphs = true;
  this._repositionAllGlyphs = true;

  this._actualClampedPosition = undefined;
  this._removeCallbackFunc = undefined;
  this._mode = undefined;

  this._clusterShow = true;

  this.text = defaultValue(options.text, "");

  this._relativeSize = 1.0;

  parseFont(this);

  this._updateClamping();
}

Object.defineProperties(Label.prototype, {
  /**
   * Determines if this label will be shown.  Use this to hide or show a label, instead
   * of removing it and re-adding it to the collection.
   * @memberof Label.prototype
   * @type {Boolean}
   * @default true
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

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const billboard = glyphs[i].billboard;
          if (defined(billboard)) {
            billboard.show = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.show = value;
        }
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this label.
   * @memberof Label.prototype
   * @type {Cartesian3}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const position = this._position;
      if (!Cartesian3.equals(position, value)) {
        Cartesian3.clone(value, position);

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const billboard = glyphs[i].billboard;
          if (defined(billboard)) {
            billboard.position = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.position = value;
        }

        this._updateClamping();
      }
    },
  },

  /**
   * Gets or sets the height reference of this billboard.
   * @memberof Label.prototype
   * @type {HeightReference}
   * @default HeightReference.NONE
   */
  heightReference: {
    get: function () {
      return this._heightReference;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (value !== this._heightReference) {
        this._heightReference = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const billboard = glyphs[i].billboard;
          if (defined(billboard)) {
            billboard.heightReference = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.heightReference = value;
        }

        repositionAllGlyphs(this);

        this._updateClamping();
      }
    },
  },

  /**
   * Gets or sets the text of this label.
   * @memberof Label.prototype
   * @type {String}
   */
  text: {
    get: function () {
      return this._text;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._text !== value) {
        this._text = value;

        // Strip soft-hyphen (auto-wrap) characters from input string
        const renderedValue = value.replace(/\u00ad/g, "");
        this._renderedText = Label.enableRightToLeftDetection
          ? reverseRtl(renderedValue)
          : renderedValue;
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the font used to draw this label. Fonts are specified using the same syntax as the CSS 'font' property.
   * @memberof Label.prototype
   * @type {String}
   * @default '30px sans-serif'
   * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#text-styles|HTML canvas 2D context text styles}
   */
  font: {
    get: function () {
      return this._font;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._font !== value) {
        this._font = value;
        rebindAllGlyphs(this);
        parseFont(this);
      }
    },
  },

  /**
   * Gets or sets the fill color of this label.
   * @memberof Label.prototype
   * @type {Color}
   * @default Color.WHITE
   * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
   */
  fillColor: {
    get: function () {
      return this._fillColor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const fillColor = this._fillColor;
      if (!Color.equals(fillColor, value)) {
        Color.clone(value, fillColor);
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the outline color of this label.
   * @memberof Label.prototype
   * @type {Color}
   * @default Color.BLACK
   * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
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

      const outlineColor = this._outlineColor;
      if (!Color.equals(outlineColor, value)) {
        Color.clone(value, outlineColor);
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the outline width of this label.
   * @memberof Label.prototype
   * @type {Number}
   * @default 1.0
   * @see {@link http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#fill-and-stroke-styles|HTML canvas 2D context fill and stroke styles}
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
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Determines if a background behind this label will be shown.
   * @memberof Label.prototype
   * @default false
   * @type {Boolean}
   */
  showBackground: {
    get: function () {
      return this._showBackground;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._showBackground !== value) {
        this._showBackground = value;
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the background color of this label.
   * @memberof Label.prototype
   * @type {Color}
   * @default new Color(0.165, 0.165, 0.165, 0.8)
   */
  backgroundColor: {
    get: function () {
      return this._backgroundColor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const backgroundColor = this._backgroundColor;
      if (!Color.equals(backgroundColor, value)) {
        Color.clone(value, backgroundColor);

        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.color = backgroundColor;
        }
      }
    },
  },

  /**
   * Gets or sets the background padding, in pixels, of this label.  The <code>x</code> value
   * controls horizontal padding, and the <code>y</code> value controls vertical padding.
   * @memberof Label.prototype
   * @type {Cartesian2}
   * @default new Cartesian2(7, 5)
   */
  backgroundPadding: {
    get: function () {
      return this._backgroundPadding;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const backgroundPadding = this._backgroundPadding;
      if (!Cartesian2.equals(backgroundPadding, value)) {
        Cartesian2.clone(value, backgroundPadding);
        repositionAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the style of this label.
   * @memberof Label.prototype
   * @type {LabelStyle}
   * @default LabelStyle.FILL
   */
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._style !== value) {
        this._style = value;
        rebindAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the pixel offset in screen space from the origin of this label.  This is commonly used
   * to align multiple labels and billboards at the same position, e.g., an image and text.  The
   * screen space origin is the top, left corner of the canvas; <code>x</code> increases from
   * left to right, and <code>y</code> increases from top to bottom.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><code>default</code><br/><img src='Images/Label.setPixelOffset.default.png' width='250' height='188' /></td>
   * <td align='center'><code>l.pixeloffset = new Cartesian2(25, 75);</code><br/><img src='Images/Label.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
   * </tr></table>
   * The label's origin is indicated by the yellow point.
   * </div>
   * @memberof Label.prototype
   * @type {Cartesian2}
   * @default Cartesian2.ZERO
   */
  pixelOffset: {
    get: function () {
      return this._pixelOffset;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const pixelOffset = this._pixelOffset;
      if (!Cartesian2.equals(pixelOffset, value)) {
        Cartesian2.clone(value, pixelOffset);

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.pixelOffset = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.pixelOffset = value;
        }
      }
    },
  },

  /**
   * Gets or sets near and far translucency properties of a Label based on the Label's distance from the camera.
   * A label's translucency will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's translucency remains clamped to the nearest bound.  If undefined,
   * translucencyByDistance will be disabled.
   * @memberof Label.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a label's translucencyByDistance to 1.0 when the
   * // camera is 1500 meters from the label and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * text.translucencyByDistance = new Cesium.NearFarScalar(1.5e2, 1.0, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable translucency by distance
   * text.translucencyByDistance = undefined;
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

      const translucencyByDistance = this._translucencyByDistance;
      if (!NearFarScalar.equals(translucencyByDistance, value)) {
        this._translucencyByDistance = NearFarScalar.clone(
          value,
          translucencyByDistance
        );

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.translucencyByDistance = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.translucencyByDistance = value;
        }
      }
    },
  },

  /**
   * Gets or sets near and far pixel offset scaling properties of a Label based on the Label's distance from the camera.
   * A label's pixel offset will be scaled between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's pixel offset scaling remains clamped to the nearest bound.  If undefined,
   * pixelOffsetScaleByDistance will be disabled.
   * @memberof Label.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a label's pixel offset scale to 0.0 when the
   * // camera is 1500 meters from the label and scale pixel offset to 10.0 pixels
   * // in the y direction the camera distance approaches 8.0e6 meters.
   * text.pixelOffset = new Cesium.Cartesian2(0.0, 1.0);
   * text.pixelOffsetScaleByDistance = new Cesium.NearFarScalar(1.5e2, 0.0, 8.0e6, 10.0);
   *
   * @example
   * // Example 2.
   * // disable pixel offset by distance
   * text.pixelOffsetScaleByDistance = undefined;
   */
  pixelOffsetScaleByDistance: {
    get: function () {
      return this._pixelOffsetScaleByDistance;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(value) && value.far <= value.near) {
        throw new DeveloperError(
          "far distance must be greater than near distance."
        );
      }
      //>>includeEnd('debug');

      const pixelOffsetScaleByDistance = this._pixelOffsetScaleByDistance;
      if (!NearFarScalar.equals(pixelOffsetScaleByDistance, value)) {
        this._pixelOffsetScaleByDistance = NearFarScalar.clone(
          value,
          pixelOffsetScaleByDistance
        );

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.pixelOffsetScaleByDistance = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.pixelOffsetScaleByDistance = value;
        }
      }
    },
  },

  /**
   * Gets or sets near and far scaling properties of a Label based on the label's distance from the camera.
   * A label's scale will interpolate between the {@link NearFarScalar#nearValue} and
   * {@link NearFarScalar#farValue} while the camera distance falls within the lower and upper bounds
   * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
   * Outside of these ranges the label's scale remains clamped to the nearest bound.  If undefined,
   * scaleByDistance will be disabled.
   * @memberof Label.prototype
   * @type {NearFarScalar}
   *
   * @example
   * // Example 1.
   * // Set a label's scaleByDistance to scale by 1.5 when the
   * // camera is 1500 meters from the label and disappear as
   * // the camera distance approaches 8.0e6 meters.
   * label.scaleByDistance = new Cesium.NearFarScalar(1.5e2, 1.5, 8.0e6, 0.0);
   *
   * @example
   * // Example 2.
   * // disable scaling by distance
   * label.scaleByDistance = undefined;
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

      const scaleByDistance = this._scaleByDistance;
      if (!NearFarScalar.equals(scaleByDistance, value)) {
        this._scaleByDistance = NearFarScalar.clone(value, scaleByDistance);

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.scaleByDistance = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.scaleByDistance = value;
        }
      }
    },
  },

  /**
   * Gets and sets the 3D Cartesian offset applied to this label in eye coordinates.  Eye coordinates is a left-handed
   * coordinate system, where <code>x</code> points towards the viewer's right, <code>y</code> points up, and
   * <code>z</code> points into the screen.  Eye coordinates use the same scale as world and model coordinates,
   * which is typically meters.
   * <br /><br />
   * An eye offset is commonly used to arrange multiple label or objects at the same position, e.g., to
   * arrange a label above its corresponding 3D model.
   * <br /><br />
   * Below, the label is positioned at the center of the Earth but an eye offset makes it always
   * appear on top of the Earth regardless of the viewer's or Earth's orientation.
   * <br /><br />
   * <div align='center'>
   * <table border='0' cellpadding='5'><tr>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
   * <td align='center'><img src='Images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
   * </tr></table>
   * <code>l.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code><br /><br />
   * </div>
   * @memberof Label.prototype
   * @type {Cartesian3}
   * @default Cartesian3.ZERO
   */
  eyeOffset: {
    get: function () {
      return this._eyeOffset;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      const eyeOffset = this._eyeOffset;
      if (!Cartesian3.equals(eyeOffset, value)) {
        Cartesian3.clone(value, eyeOffset);

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.eyeOffset = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.eyeOffset = value;
        }
      }
    },
  },

  /**
   * Gets or sets the horizontal origin of this label, which determines if the label is drawn
   * to the left, center, or right of its anchor position.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Billboard.setHorizontalOrigin.png' width='648' height='196' /><br />
   * </div>
   * @memberof Label.prototype
   * @type {HorizontalOrigin}
   * @default HorizontalOrigin.LEFT
   * @example
   * // Use a top, right origin
   * l.horizontalOrigin = Cesium.HorizontalOrigin.RIGHT;
   * l.verticalOrigin = Cesium.VerticalOrigin.TOP;
   */
  horizontalOrigin: {
    get: function () {
      return this._horizontalOrigin;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._horizontalOrigin !== value) {
        this._horizontalOrigin = value;
        repositionAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the vertical origin of this label, which determines if the label is
   * to the above, below, or at the center of its anchor position.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Billboard.setVerticalOrigin.png' width='695' height='175' /><br />
   * </div>
   * @memberof Label.prototype
   * @type {VerticalOrigin}
   * @default VerticalOrigin.BASELINE
   * @example
   * // Use a top, right origin
   * l.horizontalOrigin = Cesium.HorizontalOrigin.RIGHT;
   * l.verticalOrigin = Cesium.VerticalOrigin.TOP;
   */
  verticalOrigin: {
    get: function () {
      return this._verticalOrigin;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._verticalOrigin !== value) {
        this._verticalOrigin = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.verticalOrigin = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.verticalOrigin = value;
        }

        repositionAllGlyphs(this);
      }
    },
  },

  /**
   * Gets or sets the uniform scale that is multiplied with the label's size in pixels.
   * A scale of <code>1.0</code> does not change the size of the label; a scale greater than
   * <code>1.0</code> enlarges the label; a positive scale less than <code>1.0</code> shrinks
   * the label.
   * <br /><br />
   * Applying a large scale value may pixelate the label.  To make text larger without pixelation,
   * use a larger font size when calling {@link Label#font} instead.
   * <br /><br />
   * <div align='center'>
   * <img src='Images/Label.setScale.png' width='400' height='300' /><br/>
   * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
   * and <code>2.0</code>.
   * </div>
   * @memberof Label.prototype
   * @type {Number}
   * @default 1.0
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._scale !== value) {
        this._scale = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.scale = value * this._relativeSize;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.scale = value * this._relativeSize;
        }

        repositionAllGlyphs(this);
      }
    },
  },

  /**
   * Gets the total scale of the label, which is the label's scale multiplied by the computed relative size
   * of the desired font compared to the generated glyph size.
   * @memberof Label.prototype
   * @type {Number}
   * @default 1.0
   */
  totalScale: {
    get: function () {
      return this._scale * this._relativeSize;
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this label will be displayed.
   * @memberof Label.prototype
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
        !DistanceDisplayCondition.equals(value, this._distanceDisplayCondition)
      ) {
        this._distanceDisplayCondition = DistanceDisplayCondition.clone(
          value,
          this._distanceDisplayCondition
        );

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.distanceDisplayCondition = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.distanceDisplayCondition = value;
        }
      }
    },
  },

  /**
   * Gets or sets the distance from the camera at which to disable the depth test to, for example, prevent clipping against terrain.
   * When set to zero, the depth test is always applied. When set to Number.POSITIVE_INFINITY, the depth test is never applied.
   * @memberof Label.prototype
   * @type {Number}
   */
  disableDepthTestDistance: {
    get: function () {
      return this._disableDepthTestDistance;
    },
    set: function (value) {
      if (this._disableDepthTestDistance !== value) {
        //>>includeStart('debug', pragmas.debug);
        if (defined(value) && value < 0.0) {
          throw new DeveloperError(
            "disableDepthTestDistance must be greater than 0.0."
          );
        }
        //>>includeEnd('debug');
        this._disableDepthTestDistance = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.disableDepthTestDistance = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.disableDepthTestDistance = value;
        }
      }
    },
  },

  /**
   * Gets or sets the user-defined value returned when the label is picked.
   * @memberof Label.prototype
   * @type {*}
   */
  id: {
    get: function () {
      return this._id;
    },
    set: function (value) {
      if (this._id !== value) {
        this._id = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.id = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.id = value;
        }
      }
    },
  },

  /**
   * @private
   */
  pickId: {
    get: function () {
      if (this._glyphs.length === 0 || !defined(this._glyphs[0].billboard)) {
        return undefined;
      }
      return this._glyphs[0].billboard.pickId;
    },
  },

  /**
   * Keeps track of the position of the label based on the height reference.
   * @memberof Label.prototype
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

      const glyphs = this._glyphs;
      for (let i = 0, len = glyphs.length; i < len; i++) {
        const glyph = glyphs[i];
        if (defined(glyph.billboard)) {
          // Set all the private values here, because we already clamped to ground
          //  so we don't want to do it again for every glyph
          glyph.billboard._clampedPosition = value;
        }
      }
      const backgroundBillboard = this._backgroundBillboard;
      if (defined(backgroundBillboard)) {
        backgroundBillboard._clampedPosition = value;
      }
    },
  },

  /**
   * Determines whether or not this label will be shown or hidden because it was clustered.
   * @memberof Label.prototype
   * @type {Boolean}
   * @default true
   * @private
   */
  clusterShow: {
    get: function () {
      return this._clusterShow;
    },
    set: function (value) {
      if (this._clusterShow !== value) {
        this._clusterShow = value;

        const glyphs = this._glyphs;
        for (let i = 0, len = glyphs.length; i < len; i++) {
          const glyph = glyphs[i];
          if (defined(glyph.billboard)) {
            glyph.billboard.clusterShow = value;
          }
        }
        const backgroundBillboard = this._backgroundBillboard;
        if (defined(backgroundBillboard)) {
          backgroundBillboard.clusterShow = value;
        }
      }
    },
  },
});

Label.prototype._updateClamping = function () {
  Billboard._updateClamping(this._labelCollection, this);
};

/**
 * Computes the screen-space position of the label's origin, taking into account eye and pixel offsets.
 * The screen space origin is the top, left corner of the canvas; <code>x</code> increases from
 * left to right, and <code>y</code> increases from top to bottom.
 *
 * @param {Scene} scene The scene the label is in.
 * @param {Cartesian2} [result] The object onto which to store the result.
 * @returns {Cartesian2} The screen-space position of the label.
 *
 *
 * @example
 * console.log(l.computeScreenSpacePosition(scene).toString());
 *
 * @see Label#eyeOffset
 * @see Label#pixelOffset
 */
Label.prototype.computeScreenSpacePosition = function (scene, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(scene)) {
    throw new DeveloperError("scene is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian2();
  }

  const labelCollection = this._labelCollection;
  const modelMatrix = labelCollection.modelMatrix;
  const actualPosition = defined(this._actualClampedPosition)
    ? this._actualClampedPosition
    : this._position;

  const windowCoordinates = Billboard._computeScreenSpacePosition(
    modelMatrix,
    actualPosition,
    this._eyeOffset,
    this._pixelOffset,
    scene,
    result
  );
  return windowCoordinates;
};

/**
 * Gets a label's screen space bounding box centered around screenSpacePosition.
 * @param {Label} label The label to get the screen space bounding box for.
 * @param {Cartesian2} screenSpacePosition The screen space center of the label.
 * @param {BoundingRectangle} [result] The object onto which to store the result.
 * @returns {BoundingRectangle} The screen space bounding box.
 *
 * @private
 */
Label.getScreenSpaceBoundingBox = function (
  label,
  screenSpacePosition,
  result
) {
  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;
  const scale = label.totalScale;

  const backgroundBillboard = label._backgroundBillboard;
  if (defined(backgroundBillboard)) {
    x = screenSpacePosition.x + backgroundBillboard._translate.x;
    y = screenSpacePosition.y - backgroundBillboard._translate.y;
    width = backgroundBillboard.width * scale;
    height = backgroundBillboard.height * scale;

    if (
      label.verticalOrigin === VerticalOrigin.BOTTOM ||
      label.verticalOrigin === VerticalOrigin.BASELINE
    ) {
      y -= height;
    } else if (label.verticalOrigin === VerticalOrigin.CENTER) {
      y -= height * 0.5;
    }
  } else {
    x = Number.POSITIVE_INFINITY;
    y = Number.POSITIVE_INFINITY;
    let maxX = 0;
    let maxY = 0;
    const glyphs = label._glyphs;
    const length = glyphs.length;
    for (let i = 0; i < length; ++i) {
      const glyph = glyphs[i];
      const billboard = glyph.billboard;
      if (!defined(billboard)) {
        continue;
      }

      const glyphX = screenSpacePosition.x + billboard._translate.x;
      let glyphY = screenSpacePosition.y - billboard._translate.y;
      const glyphWidth = glyph.dimensions.width * scale;
      const glyphHeight = glyph.dimensions.height * scale;

      if (
        label.verticalOrigin === VerticalOrigin.BOTTOM ||
        label.verticalOrigin === VerticalOrigin.BASELINE
      ) {
        glyphY -= glyphHeight;
      } else if (label.verticalOrigin === VerticalOrigin.CENTER) {
        glyphY -= glyphHeight * 0.5;
      }

      if (label._verticalOrigin === VerticalOrigin.TOP) {
        glyphY += SDFSettings.PADDING * scale;
      } else if (
        label._verticalOrigin === VerticalOrigin.BOTTOM ||
        label._verticalOrigin === VerticalOrigin.BASELINE
      ) {
        glyphY -= SDFSettings.PADDING * scale;
      }

      x = Math.min(x, glyphX);
      y = Math.min(y, glyphY);
      maxX = Math.max(maxX, glyphX + glyphWidth);
      maxY = Math.max(maxY, glyphY + glyphHeight);
    }

    width = maxX - x;
    height = maxY - y;
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
 * Determines if this label equals another label.  Labels are equal if all their properties
 * are equal.  Labels in different collections can be equal.
 *
 * @param {Label} other The label to compare for equality.
 * @returns {Boolean} <code>true</code> if the labels are equal; otherwise, <code>false</code>.
 */
Label.prototype.equals = function (other) {
  return (
    this === other ||
    (defined(other) &&
      this._show === other._show &&
      this._scale === other._scale &&
      this._outlineWidth === other._outlineWidth &&
      this._showBackground === other._showBackground &&
      this._style === other._style &&
      this._verticalOrigin === other._verticalOrigin &&
      this._horizontalOrigin === other._horizontalOrigin &&
      this._heightReference === other._heightReference &&
      this._renderedText === other._renderedText &&
      this._font === other._font &&
      Cartesian3.equals(this._position, other._position) &&
      Color.equals(this._fillColor, other._fillColor) &&
      Color.equals(this._outlineColor, other._outlineColor) &&
      Color.equals(this._backgroundColor, other._backgroundColor) &&
      Cartesian2.equals(this._backgroundPadding, other._backgroundPadding) &&
      Cartesian2.equals(this._pixelOffset, other._pixelOffset) &&
      Cartesian3.equals(this._eyeOffset, other._eyeOffset) &&
      NearFarScalar.equals(
        this._translucencyByDistance,
        other._translucencyByDistance
      ) &&
      NearFarScalar.equals(
        this._pixelOffsetScaleByDistance,
        other._pixelOffsetScaleByDistance
      ) &&
      NearFarScalar.equals(this._scaleByDistance, other._scaleByDistance) &&
      DistanceDisplayCondition.equals(
        this._distanceDisplayCondition,
        other._distanceDisplayCondition
      ) &&
      this._disableDepthTestDistance === other._disableDepthTestDistance &&
      this._id === other._id)
  );
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} True if this object was destroyed; otherwise, false.
 */
Label.prototype.isDestroyed = function () {
  return false;
};

/**
 * Determines whether or not run the algorithm, that match the text of the label to right-to-left languages
 * @memberof Label
 * @type {Boolean}
 * @default false
 *
 * @example
 * // Example 1.
 * // Set a label's rightToLeft before init
 * Cesium.Label.enableRightToLeftDetection = true;
 * var myLabelEntity = viewer.entities.add({
 *   label: {
 *     id: 'my label',
 *     text: 'זה טקסט בעברית \n ועכשיו יורדים שורה',
 *   }
 * });
 *
 * @example
 * // Example 2.
 * var myLabelEntity = viewer.entities.add({
 *   label: {
 *     id: 'my label',
 *     text: 'English text'
 *   }
 * });
 * // Set a label's rightToLeft after init
 * Cesium.Label.enableRightToLeftDetection = true;
 * myLabelEntity.text = 'טקסט חדש';
 */
Label.enableRightToLeftDetection = false;

function convertTextToTypes(text, rtlChars) {
  const ltrChars = /[a-zA-Z0-9]/;
  const bracketsChars = /[()[\]{}<>]/;
  const parsedText = [];
  let word = "";
  let lastType = textTypes.LTR;
  let currentType = "";
  const textLength = text.length;
  for (let textIndex = 0; textIndex < textLength; ++textIndex) {
    const character = text.charAt(textIndex);
    if (rtlChars.test(character)) {
      currentType = textTypes.RTL;
    } else if (ltrChars.test(character)) {
      currentType = textTypes.LTR;
    } else if (bracketsChars.test(character)) {
      currentType = textTypes.BRACKETS;
    } else {
      currentType = textTypes.WEAK;
    }

    if (textIndex === 0) {
      lastType = currentType;
    }

    if (lastType === currentType && currentType !== textTypes.BRACKETS) {
      word += character;
    } else {
      if (word !== "") {
        parsedText.push({ Type: lastType, Word: word });
      }
      lastType = currentType;
      word = character;
    }
  }
  parsedText.push({ Type: currentType, Word: word });
  return parsedText;
}

function reverseWord(word) {
  return word.split("").reverse().join("");
}

function spliceWord(result, pointer, word) {
  return result.slice(0, pointer) + word + result.slice(pointer);
}

function reverseBrackets(bracket) {
  switch (bracket) {
    case "(":
      return ")";
    case ")":
      return "(";
    case "[":
      return "]";
    case "]":
      return "[";
    case "{":
      return "}";
    case "}":
      return "{";
    case "<":
      return ">";
    case ">":
      return "<";
  }
}

//To add another language, simply add its Unicode block range(s) to the below regex.
const hebrew = "\u05D0-\u05EA";
const arabic = "\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF";
const rtlChars = new RegExp("[" + hebrew + arabic + "]");

/**
 *
 * @param {String} value the text to parse and reorder
 * @returns {String} the text as rightToLeft direction
 * @private
 */
function reverseRtl(value) {
  const texts = value.split("\n");
  let result = "";
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    // first character of the line is a RTL character, so need to manage different cases
    const rtlDir = rtlChars.test(text.charAt(0));
    const parsedText = convertTextToTypes(text, rtlChars);

    let splicePointer = 0;
    let line = "";
    for (let wordIndex = 0; wordIndex < parsedText.length; ++wordIndex) {
      const subText = parsedText[wordIndex];
      const reverse =
        subText.Type === textTypes.BRACKETS
          ? reverseBrackets(subText.Word)
          : reverseWord(subText.Word);
      if (rtlDir) {
        if (subText.Type === textTypes.RTL) {
          line = reverse + line;
          splicePointer = 0;
        } else if (subText.Type === textTypes.LTR) {
          line = spliceWord(line, splicePointer, subText.Word);
          splicePointer += subText.Word.length;
        } else if (
          subText.Type === textTypes.WEAK ||
          subText.Type === textTypes.BRACKETS
        ) {
          // current word is weak, last one was bracket
          if (
            subText.Type === textTypes.WEAK &&
            parsedText[wordIndex - 1].Type === textTypes.BRACKETS
          ) {
            line = reverse + line;
          }
          // current word is weak or bracket, last one was rtl
          else if (parsedText[wordIndex - 1].Type === textTypes.RTL) {
            line = reverse + line;
            splicePointer = 0;
          }
          // current word is weak or bracket, there is at least one more word
          else if (parsedText.length > wordIndex + 1) {
            // next word is rtl
            if (parsedText[wordIndex + 1].Type === textTypes.RTL) {
              line = reverse + line;
              splicePointer = 0;
            } else {
              line = spliceWord(line, splicePointer, subText.Word);
              splicePointer += subText.Word.length;
            }
          }
          // current word is weak or bracket, and it the last in this line
          else {
            line = spliceWord(line, 0, reverse);
          }
        }
      }
      // ltr line, rtl word
      else if (subText.Type === textTypes.RTL) {
        line = spliceWord(line, splicePointer, reverse);
      }
      // ltr line, ltr word
      else if (subText.Type === textTypes.LTR) {
        line += subText.Word;
        splicePointer = line.length;
      }
      // ltr line, weak or bracket word
      else if (
        subText.Type === textTypes.WEAK ||
        subText.Type === textTypes.BRACKETS
      ) {
        // not first word in line
        if (wordIndex > 0) {
          // last word was rtl
          if (parsedText[wordIndex - 1].Type === textTypes.RTL) {
            // there is at least one more word
            if (parsedText.length > wordIndex + 1) {
              // next word is rtl
              if (parsedText[wordIndex + 1].Type === textTypes.RTL) {
                line = spliceWord(line, splicePointer, reverse);
              } else {
                line += subText.Word;
                splicePointer = line.length;
              }
            } else {
              line += subText.Word;
            }
          } else {
            line += subText.Word;
            splicePointer = line.length;
          }
        } else {
          line += subText.Word;
          splicePointer = line.length;
        }
      }
    }

    result += line;
    if (i < texts.length - 1) {
      result += "\n";
    }
  }
  return result;
}
export default Label;
