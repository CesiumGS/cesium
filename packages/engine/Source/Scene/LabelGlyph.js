import AttributeCompression from "../Core/AttributeCompression.js";
import defined from "../Core/defined.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import HorizontalOrigin from "../Core/HorizontalOrigin.js";
import CesiumMath from "../Core/Math.js";
import SdfSettings from "../Renderer/SdfSettings.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import LabelStyle from "./LabelStyle";
import BillboardSdfFS from "../Shaders/BillboardSdfFS.js";
import BillboardSdfVS from "../Shaders/BillboardSdfVs.js";
import VertexAttribute from "../Renderer/VertexAttribute.js";
import AttributeType from "./AttributeType.js";

/**
 * A glyph represents a single character in label. If it has associated SDF info, it is represented by a single billboard.
 * @private
 */
function LabelGlyph(label) {
  this._label = label;
  // TODO: Event for relevant changed properties

  /**
   * @type {number}
   * @private
   */
  this.glyphIndex = -1;
  // TODO: Setter, or needed?

  /**
   * Object containing dimensions of the character as rendered to a canvas.
   * @see {SdfGlyphDimensions#measureGlyph}
   * @type {SdfGlyphDimensions}
   * @private
   */
  this.dimensions = undefined;

  /**
   * Reference to loaded image data for a single character, drawn in a particular style, shared and referenced across all labels.
   * @type {BillboardTexture}
   * @private
   */
  this.billboardTexture = undefined;

  this._billboard = undefined;

  /**
   * Index identifying the corresponding billboard collection property and vertex view in the billboard collection vertex array facade.
   * @private
   * @memberof LabelGlyph.prototype
   * @type {number}
   */
  this._billboardPropertyIndex = -1;

  this._labelDimensions = new Cartesian2();
  this._labelTranslate = new Cartesian2();
  this._glyphPixelOffset = new Cartesian2(); // TODO: Is this the same as label translate?
  this._horizontalOffset = undefined;
  this._baselineOffset = undefined;
}

Object.defineProperties(LabelGlyph.prototype, {
  /**
   * The individual billboard used to render the glyph. This may be <code>undefined</code> if the associated character is whitespace.
   * @private
   * @memberof LabelGlyph.prototype
   * @type {Billboard|undefined}
   * @readonly
   */
  billboard: {
    get: function () {
      return this._billboard;
    },
  },
  /**
   * The outline color of the label.
   * @memberof LabelGlyph.prototype
   * @type {Color}
   * @private
   */
  outlineColor: {
    get: function () {
      return this._outlineColor;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("outlineColor", value);
      //>>includeEnd('debug');

      const outlineColor = this._outlineColor;
      if (!Color.equals(outlineColor, value)) {
        Color.clone(value, outlineColor);
        this._updateBillboard();
      }
    },
  },

  /**
   * The outline width of this label in pixels.
   * @memberof Billboard.prototype
   * @type {number}
   * @private
   */
  outlineWidth: {
    get: function () {
      return this._outlineWidth;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.typeOf.number.greaterThanOrEquals("outlineWidth", value, 0);
      //>>includeEnd('debug');

      if (this._outlineWidth !== value) {
        this._outlineWidth = value;
        this._updateBillboard();
      }
    },
  },

  /**
   * The total dimensions of the label in pixels.
   * @memberof Billboard.prototype
   * @type {Cartesian2}
   * @private
   * @readonly
   */
  labelDimensions: {
    get: function () {
      return this._labelDimensions;
    },
  },

/**
   * The horizontal offset from the glyphs local origin needed to align this glyph withing the label text, in SDF pixels.
   * @memberof LabelGlyph.prototype
   * @type {number}
   * @private
   */
  horizontalOffset: {
    get: function () {
      return this._horizontalOffset
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("horizontalOffset", value);
      //>>includeEnd('debug');

      if (this._horizontalOffset !== value) {
        this._horizontalOffset = value;
        this._updateBillboard();
      }
    },
  },

  /**
   * The vertical offset from the glyphs local origin (baseline) needed to align this glyph withing the label text, in SDF pixels.
   * @memberof LabelGlyph.prototype
   * @type {number}
   * @private
   */
  baselineOffset: {
    get: function () {
      return this._baselineOffset;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      Check.defined("baselineOffset", value);
      //>>includeEnd('debug');

      if (this._baselineOffset !== value) {
        this._baselineOffset = value;
        this._updateBillboard();
      }
    },
  },
});

/**
 * If currently bound to a billboard, mark the SDF attribute in the billboard collection as dirty for this billboard.
 * @private
 */
LabelGlyph.prototype._updateBillboard = function () {
  const billboard = this.billboard;

  if (!defined(billboard)) {
    return;
  }

  const index = this._billboardPropertyIndex;
  this.billboardCollection._updateBillboard(billboard, index);
  billboard._dirty = true;
};

/**
 * Unbind any billboard bound to this glyph.
 * @returns {Billboard|undefined} Returns the freed billboard, if there was one bound to this glyph.
 */
LabelGlyph.prototype.unbindBillboard = function () {
  const billboard = this._billboard;
  if (!defined(billboard)) {
    return;
  }

  billboard.show = false;
  if (defined(billboard._removeCallbackFunc)) {
    billboard._removeCallbackFunc();
    billboard._removeCallbackFunc = undefined;
  }

  this._billboard = undefined;
  return billboard;
};

/**
 * Bind the provided billboard to this glyph. Updates to the glyph or its parent label will be propagated to this billboard until it is unbound.
 * @private
 * @param {Billboard} billboard
 */
LabelGlyph.prototype.bindBillboard = function (billboard) {
  const label = this.label;

  this._billboard = billboard;
  // billboard.onWrite("sdf", this.writeAttribute);
  // 

  billboard._batchIndex = label._batchIndex; // TODO: ?

  // TODO: Should this just be managed in label collection?
  billboard.setImageTexture(this.billboardTexture);

  billboard.show = label.show;
  billboard.position = label.position;
  billboard.eyeOffset = label.eyeOffset;
  billboard.pixelOffset = label.pixelOffset;
  billboard.horizontalOrigin = HorizontalOrigin.LEFT; // TODO: ??
  // labelHorizontalOrigin? definitely need to update
  billboard.verticalOrigin = label.verticalOrigin;
  billboard.heightReference = label.heightReference;
  billboard.scale = label.totalScale; // TODO: definitely need to update this one
  billboard.pickPrimitive = label;
  billboard.id = label.id;
  billboard.translucencyByDistance = label.translucencyByDistance;
  billboard.pixelOffsetScaleByDistance = label.pixelOffsetScaleByDistance;
  billboard.scaleByDistance = label.scaleByDistance;
  billboard.distanceDisplayCondition = label.distanceDisplayCondition;
  billboard.disableDepthTestDistance = label.disableDepthTestDistance;
  billboard.outlineColor = label.outlineColor;
  if (label.style === LabelStyle.FILL_AND_OUTLINE) {
    billboard.color = label.fillColor;
    billboard.outlineWidth = label.outlineWidth;
  } else if (label.style === LabelStyle.FILL) {
    billboard.color = label.fillColor;
    billboard.outlineWidth = 0.0;
  } else if (label.style === LabelStyle.OUTLINE) {
    billboard.color = Color.TRANSPARENT;
    billboard.outlineWidth = label.outlineWidth;
  }
};

const LEFT_SHIFT16 = 65536.0; // 2^16
const LEFT_SHIFT8 = 256.0; // 2^8
const LOWER_LEFT = 0.0;
const LOWER_RIGHT = 2.0;
const UPPER_RIGHT = 3.0;
const UPPER_LEFT = 1.0;

LabelGlyph.createAttribute = function () {
    // TODO: Shader builder?
    let shaderBuilder;
    
    shaderBuilder.addDefine("SDF", undefined, ShaderDestination.BOTH);
    
    const sdfRadius = SdfSettings.RADIUS.toFixed(1);
    shaderBuilder.addDefine("SDF_RADIUS", sdfRadius, ShaderDestination.VERTEX);
    shaderBuilder.addVertexLines(BillboardSdfVS);
    
    const sdfEdge = 1.0 - SdfSettings.CUTOFF;
    shaderBuilder.addDefine("SDF_EDGE", sdfEdge, ShaderDestination.FRAGMENT);
    shaderBuilder.addFragmentLines(BillboardSdfFS);
      
  // Compressed SDF attribute
  shaderBuilder.addAttribute("vec3", "a_sdf");
  return new VertexAttribute({
    type: AttributeType.VEC3,
  });
};

LabelGlyph.prototype.writeAttribute = function (
  writer,
  instanced,
  frameState,
) {
  const outlineColor = this.outlineColor;

  const red = Color.floatToByte(outlineColor.red);
  const green = Color.floatToByte(outlineColor.green);
  const blue = Color.floatToByte(outlineColor.blue);

  const compressed0 = red * LEFT_SHIFT16 + green * LEFT_SHIFT8 + blue;

  const alpha = Color.floatToByte(outlineColor.alpha); // TODO: This should always be 1 anyway. We can use this for another property
  const label = this._label;
  const labelFontScale = AttributeCompression.encodeFloatAsByte(
    label.relativeFontSize
  );

  // Cannot render an outline distance greater than the encoded SDF radius
  const outlineWidth = this.outlineWidth;
  const outlineDistance = Math.floor(
    CesiumMath.clamp(outlineWidth, 0, SdfSettings.RADIUS) * SdfSettings.RADIUS,
  );

  // Value is used in the shader to convert outline width value in CSS pixels to SDF pixel values
  const compressed1 =
    alpha * LEFT_SHIFT16 + outlineDistance * LEFT_SHIFT8 + labelFontScale;

  // These values are clamped to pixels and were used to rendered SDF glyph
  // They account for any offset needed in SDF pixel space, including padding
  const baselineOffset = Math.floor(
    CesiumMath.clamp(this._baselineOffset, -128, 127) + 128,
  );
  const horizontalOffset = Math.floor(
    CesiumMath.clamp(this._horizontalOffset, 0, 255),
  );
  const compressed2 = horizontalOffset * LEFT_SHIFT16 + baselineOffset * LEFT_SHIFT8;

  const billboard = this._billboard;
  if (instanced) {
    const i = billboard.index;
    writer(i, compressed0, compressed1, compressed2);
  } else {
    const i = billboard.index * 4;
    writer(i + 0, compressed0 + LOWER_LEFT, compressed1, compressed2);
    writer(i + 1, compressed0 + LOWER_RIGHT, compressed1, compressed2);
    writer(i + 2, compressed0 + UPPER_RIGHT, compressed1, compressed2);
    writer(i + 3, compressed0 + UPPER_LEFT, compressed1, compressed2);
  }

  // TODO: label translate could go here.
};

export default LabelGlyph;
