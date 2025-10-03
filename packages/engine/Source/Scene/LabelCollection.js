import BoundingRectangle from "../Core/BoundingRectangle.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Color from "../Core/Color.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Matrix4 from "../Core/Matrix4.js";
import writeTextToCanvas from "../Core/writeTextToCanvas.js";
import bitmapSDF from "bitmap-sdf";
import BillboardCollection from "./BillboardCollection.js";
import BillboardTexture from "./BillboardTexture.js";
import BlendOption from "./BlendOption.js";
import { isHeightReferenceClamp } from "./HeightReference.js";
import HorizontalOrigin from "./HorizontalOrigin.js";
import Label from "./Label.js";
import LabelStyle from "./LabelStyle.js";
import SDFSettings from "./SDFSettings.js";
import TextureAtlas from "../Renderer/TextureAtlas.js";
import VerticalOrigin from "./VerticalOrigin.js";
import GraphemeSplitter from "grapheme-splitter";

/**
 * A glyph represents a single character in label.
 * @private
 */
function Glyph() {
  /**
   * Object containing dimensions of the character as rendered to a canvas.
   * @see {writeTextToCanvas}
   * @type {object}
   * @private
   */
  this.dimensions = undefined;

  /**
   * Reference to loaded image data for a single character, drawn in a particular style, shared and referenced across all labels.
   * @type {BillboardTexture}
   * @private
   */
  this.billboardTexture = undefined;

  /**
   * The individual billboard used to render the glyph. This may be <code>undefined</code> if the associated character is whitespace.
   * @type {Billboard|undefined}
   * @private
   */
  this.billboard = undefined;
}

// Traditionally, leading is %20 of the font size.
const defaultLineSpacingPercent = 1.2;
const whitePixelCanvasId = "ID_WHITE_PIXEL";
const whitePixelSize = new Cartesian2(4, 4);
const whitePixelBoundingRegion = new BoundingRectangle(1, 1, 1, 1);

/**
 * Create the background image and start loading it into a texture
 * @private
 * @param {BillboardCollection} billboardCollection
 * @param {LabelCollection} labelCollection
 * @returns {Billboard}
 */
function getWhitePixelBillboard(billboardCollection, labelCollection) {
  const billboardTexture = labelCollection._backgroundBillboardTexture;
  if (!billboardTexture.hasImage) {
    const canvas = document.createElement("canvas");
    canvas.width = whitePixelSize.x;
    canvas.height = whitePixelSize.y;

    const context2D = canvas.getContext("2d");
    context2D.fillStyle = "#fff";
    context2D.fillRect(0, 0, canvas.width, canvas.height);

    billboardTexture.loadImage(whitePixelCanvasId, canvas);
    billboardTexture.addImageSubRegion(
      whitePixelCanvasId,
      whitePixelBoundingRegion,
    );
  }

  const billboard = billboardCollection.add({
    collection: labelCollection,
  });

  billboard.setImageTexture(billboardTexture);

  return billboard;
}

// reusable object for calling writeTextToCanvas
const writeTextToCanvasParameters = {};
function createGlyphCanvas(
  character,
  font,
  fillColor,
  outlineColor,
  outlineWidth,
  style,
) {
  writeTextToCanvasParameters.font = font;
  writeTextToCanvasParameters.fillColor = fillColor;
  writeTextToCanvasParameters.strokeColor = outlineColor;
  writeTextToCanvasParameters.strokeWidth = outlineWidth;
  // Setting the padding to something bigger is necessary to get enough space for the outlining.
  writeTextToCanvasParameters.padding = SDFSettings.PADDING;

  writeTextToCanvasParameters.fill =
    style === LabelStyle.FILL || style === LabelStyle.FILL_AND_OUTLINE;
  writeTextToCanvasParameters.stroke =
    style === LabelStyle.OUTLINE || style === LabelStyle.FILL_AND_OUTLINE;
  writeTextToCanvasParameters.backgroundColor = Color.BLACK;

  return writeTextToCanvas(character, writeTextToCanvasParameters);
}

function unbindGlyphBillboard(labelCollection, glyph) {
  const billboard = glyph.billboard;
  if (defined(billboard)) {
    billboard.show = false;
    if (defined(billboard._removeCallbackFunc)) {
      billboard._removeCallbackFunc();
      billboard._removeCallbackFunc = undefined;
    }
    labelCollection._spareBillboards.push(billboard);
    glyph.billboard = undefined;
  }
}

const splitter = new GraphemeSplitter();
const whitespaceRegex = /\s/;

function rebindAllGlyphs(labelCollection, label) {
  const text = label._renderedText;
  const graphemes = splitter.splitGraphemes(text);
  const textLength = graphemes.length;
  const glyphs = label._glyphs;
  const glyphsLength = glyphs.length;

  // Compute a font size scale relative to the sdf font generated size.
  label._relativeSize = label._fontSize / SDFSettings.FONT_SIZE;

  // if we have more glyphs than needed, unbind the extras.
  if (textLength < glyphsLength) {
    for (let glyphIndex = textLength; glyphIndex < glyphsLength; ++glyphIndex) {
      unbindGlyphBillboard(labelCollection, glyphs[glyphIndex]);
    }
  }

  // presize glyphs to match the new text length
  glyphs.length = textLength;

  const showBackground =
    label.show && label._showBackground && text.split("\n").join("").length > 0;
  let backgroundBillboard = label._backgroundBillboard;
  const backgroundBillboardCollection =
    labelCollection._backgroundBillboardCollection;
  if (!showBackground) {
    if (defined(backgroundBillboard)) {
      backgroundBillboardCollection.remove(backgroundBillboard);
      label._backgroundBillboard = backgroundBillboard = undefined;
    }
  } else {
    if (!defined(backgroundBillboard)) {
      backgroundBillboard = getWhitePixelBillboard(
        backgroundBillboardCollection,
        labelCollection,
      );
      label._backgroundBillboard = backgroundBillboard;
    }

    backgroundBillboard.color = label._backgroundColor;
    backgroundBillboard.show = label._show;
    backgroundBillboard.position = label._position;
    backgroundBillboard.eyeOffset = label._eyeOffset;
    backgroundBillboard.pixelOffset = label._pixelOffset;
    backgroundBillboard.horizontalOrigin = HorizontalOrigin.LEFT;
    backgroundBillboard.verticalOrigin = label._verticalOrigin;
    backgroundBillboard.heightReference = label._heightReference;
    backgroundBillboard.scale = label.totalScale;
    backgroundBillboard.pickPrimitive = label;
    backgroundBillboard.id = label._id;
    backgroundBillboard.translucencyByDistance = label._translucencyByDistance;
    backgroundBillboard.pixelOffsetScaleByDistance =
      label._pixelOffsetScaleByDistance;
    backgroundBillboard.scaleByDistance = label._scaleByDistance;
    backgroundBillboard.distanceDisplayCondition =
      label._distanceDisplayCondition;
    backgroundBillboard.disableDepthTestDistance =
      label._disableDepthTestDistance;
    backgroundBillboard.clusterShow = label.clusterShow;
  }

  const glyphBillboardCollection = labelCollection._glyphBillboardCollection;
  const glyphTextureCache = glyphBillboardCollection.billboardTextureCache;
  const textDimensionsCache = labelCollection._textDimensionsCache;

  // walk the text looking for new characters (creating new glyphs for each)
  // or changed characters (rebinding existing glyphs)
  for (let textIndex = 0; textIndex < textLength; ++textIndex) {
    const character = graphemes[textIndex];
    const verticalOrigin = label._verticalOrigin;

    const id = JSON.stringify([
      character,
      label._fontFamily,
      label._fontStyle,
      label._fontWeight,
      +verticalOrigin,
    ]);

    let dimensions = textDimensionsCache[id];
    let glyphBillboardTexture = glyphTextureCache.get(id);
    if (!defined(glyphBillboardTexture) || !defined(dimensions)) {
      glyphBillboardTexture = new BillboardTexture(glyphBillboardCollection);
      glyphTextureCache.set(id, glyphBillboardTexture);

      const glyphFont = `${label._fontStyle} ${label._fontWeight} ${SDFSettings.FONT_SIZE}px ${label._fontFamily}`;

      const canvas = createGlyphCanvas(
        character,
        glyphFont,
        Color.WHITE,
        Color.WHITE,
        0.0,
        LabelStyle.FILL,
      );

      dimensions = canvas.dimensions;
      textDimensionsCache[id] = dimensions;

      if (
        canvas.width > 0 &&
        canvas.height > 0 &&
        !whitespaceRegex.test(character)
      ) {
        const sdfValues = bitmapSDF(canvas, {
          cutoff: SDFSettings.CUTOFF,
          radius: SDFSettings.RADIUS,
        });

        // Context is originally created in writeTextToCanvas()
        const ctx = canvas.getContext("2d");
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        for (let i = 0; i < canvasWidth; i++) {
          for (let j = 0; j < canvasHeight; j++) {
            const baseIndex = j * canvasWidth + i;
            const alpha = sdfValues[baseIndex] * 255;
            const imageIndex = baseIndex * 4;
            imgData.data[imageIndex + 0] = alpha;
            imgData.data[imageIndex + 1] = alpha;
            imgData.data[imageIndex + 2] = alpha;
            imgData.data[imageIndex + 3] = alpha;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        glyphBillboardTexture.loadImage(id, canvas);
      }
    }

    let glyph = glyphs[textIndex];
    if (!defined(glyph)) {
      glyph = new Glyph();
      glyph.dimensions = dimensions;
      glyph.billboardTexture = glyphBillboardTexture;
      glyphs[textIndex] = glyph;
    }

    if (glyph.billboardTexture.id !== id) {
      // This glyph has been mapped to a new texture. If we had one before, release
      // our reference to that texture and dimensions, but reuse the billboard.
      glyph.billboardTexture = glyphBillboardTexture;
      glyph.dimensions = dimensions;
    }

    if (!glyphBillboardTexture.hasImage) {
      // No texture, and therefore no billboard, for this glyph.
      // so, completely unbind glyph to free up the billboard for others
      unbindGlyphBillboard(labelCollection, glyph);
      continue;
    }

    // If we have a texture, configure the existing billboard, or obtain one
    let billboard = glyph.billboard;
    const spareBillboards = labelCollection._spareBillboards;
    if (!defined(billboard)) {
      if (spareBillboards.length > 0) {
        billboard = spareBillboards.pop();
      } else {
        billboard = glyphBillboardCollection.add({
          collection: labelCollection,
        });
        billboard._labelDimensions = new Cartesian2();
        billboard._labelTranslate = new Cartesian2();
        billboard._positionFromParent = true;
      }
      glyph.billboard = billboard;
    }

    billboard.setImageTexture(glyphBillboardTexture);

    billboard.show = label._show;
    billboard.position = label._position;
    billboard.eyeOffset = label._eyeOffset;
    billboard.pixelOffset = label._pixelOffset;
    billboard.horizontalOrigin = HorizontalOrigin.LEFT;
    billboard.verticalOrigin = label._verticalOrigin;
    billboard.heightReference = label._heightReference;
    billboard.scale = label.totalScale;
    billboard.pickPrimitive = label;
    billboard.id = label._id;
    billboard.translucencyByDistance = label._translucencyByDistance;
    billboard.pixelOffsetScaleByDistance = label._pixelOffsetScaleByDistance;
    billboard.scaleByDistance = label._scaleByDistance;
    billboard.distanceDisplayCondition = label._distanceDisplayCondition;
    billboard.disableDepthTestDistance = label._disableDepthTestDistance;
    billboard._batchIndex = label._batchIndex;
    billboard.outlineColor = label.outlineColor;
    if (label.style === LabelStyle.FILL_AND_OUTLINE) {
      billboard.color = label._fillColor;
      billboard.outlineWidth = label.outlineWidth;
    } else if (label.style === LabelStyle.FILL) {
      billboard.color = label._fillColor;
      billboard.outlineWidth = 0.0;
    } else if (label.style === LabelStyle.OUTLINE) {
      billboard.color = Color.TRANSPARENT;
      billboard.outlineWidth = label.outlineWidth;
    }
  }

  // changing glyphs will cause the position of the
  // glyphs to change, since different characters have different widths
  label._repositionAllGlyphs = true;
}

function calculateWidthOffset(lineWidth, horizontalOrigin, backgroundPadding) {
  if (horizontalOrigin === HorizontalOrigin.CENTER) {
    return -lineWidth / 2;
  } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
    return -(lineWidth + backgroundPadding.x);
  }
  return backgroundPadding.x;
}

// reusable Cartesian2 instances
const glyphPixelOffset = new Cartesian2();
const scratchBackgroundPadding = new Cartesian2();

function repositionAllGlyphs(label) {
  const glyphs = label._glyphs;
  const text = label._renderedText;
  let lastLineWidth = 0;
  let maxLineWidth = 0;
  const lineWidths = [];
  let maxGlyphDescent = Number.NEGATIVE_INFINITY;
  let maxGlyphY = 0;
  let numberOfLines = 1;
  const glyphLength = glyphs.length;

  const backgroundBillboard = label._backgroundBillboard;
  const backgroundPadding = Cartesian2.clone(
    defined(backgroundBillboard) ? label._backgroundPadding : Cartesian2.ZERO,
    scratchBackgroundPadding,
  );

  // We need to scale the background padding, which is specified in pixels by the inverse of the relative size so it is scaled properly.
  backgroundPadding.x /= label._relativeSize;
  backgroundPadding.y /= label._relativeSize;

  for (let glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
    if (text.charAt(glyphIndex) === "\n") {
      lineWidths.push(lastLineWidth);
      ++numberOfLines;
      lastLineWidth = 0;
      continue;
    }

    const glyph = glyphs[glyphIndex];
    const dimensions = glyph.dimensions;
    if (defined(dimensions)) {
      maxGlyphY = Math.max(maxGlyphY, dimensions.height - dimensions.descent);
      maxGlyphDescent = Math.max(maxGlyphDescent, dimensions.descent);

      // Computing the line width must also account for the kerning that occurs between letters.
      lastLineWidth += dimensions.width - dimensions.minx;
      if (glyphIndex < glyphLength - 1) {
        lastLineWidth += glyphs[glyphIndex + 1].dimensions.minx;
      }
      maxLineWidth = Math.max(maxLineWidth, lastLineWidth);
    }
  }
  lineWidths.push(lastLineWidth);
  const maxLineHeight = maxGlyphY + maxGlyphDescent;

  const scale = label.totalScale;
  const horizontalOrigin = label._horizontalOrigin;
  const verticalOrigin = label._verticalOrigin;
  let lineIndex = 0;
  let lineWidth = lineWidths[lineIndex];
  let widthOffset = calculateWidthOffset(
    lineWidth,
    horizontalOrigin,
    backgroundPadding,
  );
  const lineSpacing =
    (defined(label._lineHeight)
      ? label._lineHeight
      : defaultLineSpacingPercent * label._fontSize) / label._relativeSize;
  const otherLinesHeight = lineSpacing * (numberOfLines - 1);
  let totalLineWidth = maxLineWidth;
  let totalLineHeight = maxLineHeight + otherLinesHeight;

  if (defined(backgroundBillboard)) {
    totalLineWidth += backgroundPadding.x * 2;
    totalLineHeight += backgroundPadding.y * 2;
    backgroundBillboard._labelHorizontalOrigin = horizontalOrigin;
  }

  glyphPixelOffset.x = widthOffset * scale;
  glyphPixelOffset.y = 0;

  let firstCharOfLine = true;

  let lineOffsetY = 0;
  for (let glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
    if (text.charAt(glyphIndex) === "\n") {
      ++lineIndex;
      lineOffsetY += lineSpacing;
      lineWidth = lineWidths[lineIndex];
      widthOffset = calculateWidthOffset(
        lineWidth,
        horizontalOrigin,
        backgroundPadding,
      );
      glyphPixelOffset.x = widthOffset * scale;
      firstCharOfLine = true;
      continue;
    }

    const glyph = glyphs[glyphIndex];
    const dimensions = glyph.dimensions;
    if (defined(dimensions)) {
      if (verticalOrigin === VerticalOrigin.TOP) {
        glyphPixelOffset.y =
          dimensions.height - maxGlyphY - backgroundPadding.y;
        glyphPixelOffset.y += SDFSettings.PADDING;
      } else if (verticalOrigin === VerticalOrigin.CENTER) {
        glyphPixelOffset.y =
          (otherLinesHeight + dimensions.height - maxGlyphY) / 2;
      } else if (verticalOrigin === VerticalOrigin.BASELINE) {
        glyphPixelOffset.y = otherLinesHeight;
        glyphPixelOffset.y -= SDFSettings.PADDING;
      } else {
        // VerticalOrigin.BOTTOM
        glyphPixelOffset.y =
          otherLinesHeight + maxGlyphDescent + backgroundPadding.y;
        glyphPixelOffset.y -= SDFSettings.PADDING;
      }
      glyphPixelOffset.y =
        (glyphPixelOffset.y - dimensions.descent - lineOffsetY) * scale;

      // Handle any offsets for the first character of the line since the bounds might not be right on the bottom left pixel.
      if (firstCharOfLine) {
        glyphPixelOffset.x -= SDFSettings.PADDING * scale;
        firstCharOfLine = false;
      }

      if (defined(glyph.billboard)) {
        glyph.billboard._setTranslate(glyphPixelOffset);
        glyph.billboard._labelDimensions.x = totalLineWidth;
        glyph.billboard._labelDimensions.y = totalLineHeight;
        glyph.billboard._labelHorizontalOrigin = horizontalOrigin;
      }

      //Compute the next x offset taking into account the kerning performed
      //on both the current letter as well as the next letter to be drawn
      //as well as any applied scale.
      if (glyphIndex < glyphLength - 1) {
        const nextGlyph = glyphs[glyphIndex + 1];
        glyphPixelOffset.x +=
          (dimensions.width - dimensions.minx + nextGlyph.dimensions.minx) *
          scale;
      }
    }
  }

  if (defined(backgroundBillboard) && text.split("\n").join("").length > 0) {
    if (horizontalOrigin === HorizontalOrigin.CENTER) {
      widthOffset = -maxLineWidth / 2 - backgroundPadding.x;
    } else if (horizontalOrigin === HorizontalOrigin.RIGHT) {
      widthOffset = -(maxLineWidth + backgroundPadding.x * 2);
    } else {
      widthOffset = 0;
    }
    glyphPixelOffset.x = widthOffset * scale;

    if (verticalOrigin === VerticalOrigin.TOP) {
      glyphPixelOffset.y = maxLineHeight - maxGlyphY - maxGlyphDescent;
    } else if (verticalOrigin === VerticalOrigin.CENTER) {
      glyphPixelOffset.y = (maxLineHeight - maxGlyphY) / 2 - maxGlyphDescent;
    } else if (verticalOrigin === VerticalOrigin.BASELINE) {
      glyphPixelOffset.y = -backgroundPadding.y - maxGlyphDescent;
    } else {
      // VerticalOrigin.BOTTOM
      glyphPixelOffset.y = 0;
    }
    glyphPixelOffset.y = glyphPixelOffset.y * scale;

    backgroundBillboard.width = totalLineWidth;
    backgroundBillboard.height = totalLineHeight;
    backgroundBillboard._setTranslate(glyphPixelOffset);
    backgroundBillboard._labelTranslate = Cartesian2.clone(
      glyphPixelOffset,
      backgroundBillboard._labelTranslate,
    );
  }

  if (isHeightReferenceClamp(label.heightReference)) {
    for (let glyphIndex = 0; glyphIndex < glyphLength; ++glyphIndex) {
      const glyph = glyphs[glyphIndex];
      const billboard = glyph.billboard;
      if (defined(billboard)) {
        billboard._labelTranslate = Cartesian2.clone(
          glyphPixelOffset,
          billboard._labelTranslate,
        );
      }
    }
  }
}

function destroyLabel(labelCollection, label) {
  const glyphs = label._glyphs;
  for (let i = 0, len = glyphs.length; i < len; ++i) {
    unbindGlyphBillboard(labelCollection, glyphs[i]);
  }
  if (defined(label._backgroundBillboard)) {
    labelCollection._backgroundBillboardCollection.remove(
      label._backgroundBillboard,
    );
    label._backgroundBillboard = undefined;
  }
  label._labelCollection = undefined;

  if (defined(label._removeCallbackFunc)) {
    label._removeCallbackFunc();
  }

  destroyObject(label);
}

/**
 * A renderable collection of labels.  Labels are viewport-aligned text positioned in the 3D scene.
 * Each label can have a different font, color, scale, etc.
 * <br /><br />
 * <div align='center'>
 * <img src='Images/Label.png' width='400' height='300' /><br />
 * Example labels
 * </div>
 * <br /><br />
 * Labels are added and removed from the collection using {@link LabelCollection#add}
 * and {@link LabelCollection#remove}.
 *
 * @alias LabelCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms each label from model to world coordinates.
 * @param {boolean} [options.debugShowBoundingVolume=false] For debugging only. Determines if this primitive's commands' bounding spheres are shown.
 * @param {Scene} [options.scene] Must be passed in for labels that use the height reference property or will be depth tested against the globe.
 * @param {BlendOption} [options.blendOption=BlendOption.OPAQUE_AND_TRANSLUCENT] The label blending option. The default
 * is used for rendering both opaque and translucent labels. However, if either all of the labels are completely opaque or all are completely translucent,
 * setting the technique to BlendOption.OPAQUE or BlendOption.TRANSLUCENT can improve performance by up to 2x.
 * @param {boolean} [options.show=true] Determines if the labels in the collection will be shown.
 *
 * @performance For best performance, prefer a few collections, each with many labels, to
 * many collections with only a few labels each.  Avoid having collections where some
 * labels change every frame and others do not; instead, create one or more collections
 * for static labels, and one or more collections for dynamic labels.
 *
 * @see LabelCollection#add
 * @see LabelCollection#remove
 * @see Label
 * @see BillboardCollection
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
 *
 * @example
 * // Create a label collection with two labels
 * const labels = scene.primitives.add(new Cesium.LabelCollection());
 * labels.add({
 *   position : new Cesium.Cartesian3(1.0, 2.0, 3.0),
 *   text : 'A label'
 * });
 * labels.add({
 *   position : new Cesium.Cartesian3(4.0, 5.0, 6.0),
 *   text : 'Another label'
 * });
 */
function LabelCollection(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._scene = options.scene;
  this._batchTable = options.batchTable;

  const backgroundBillboardCollection = new BillboardCollection({
    scene: this._scene,
    textureAtlas: new TextureAtlas({
      initialSize: whitePixelSize,
    }),
  });
  this._backgroundBillboardCollection = backgroundBillboardCollection;
  this._backgroundBillboardTexture = new BillboardTexture(
    backgroundBillboardCollection,
  );

  this._glyphBillboardCollection = new BillboardCollection({
    scene: this._scene,
    batchTable: this._batchTable,
  });
  this._glyphBillboardCollection._sdf = true;

  this._spareBillboards = [];
  this._textDimensionsCache = {};
  this._labels = [];
  this._labelsToUpdate = [];
  this._totalGlyphCount = 0;

  this._highlightColor = Color.clone(Color.WHITE); // Only used by Vector3DTilePoints

  /**
   * Determines if labels in this collection will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = options.show ?? true;

  /**
   * The 4x4 transformation matrix that transforms each label in this collection from model to world coordinates.
   * When this is the identity matrix, the labels are drawn in world coordinates, i.e., Earth's WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type Matrix4
   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * const center = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
   * labels.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);
   * labels.add({
   *   position : new Cesium.Cartesian3(0.0, 0.0, 0.0),
   *   text     : 'Center'
   * });
   * labels.add({
   *   position : new Cesium.Cartesian3(1000000.0, 0.0, 0.0),
   *   text     : 'East'
   * });
   * labels.add({
   *   position : new Cesium.Cartesian3(0.0, 1000000.0, 0.0),
   *   text     : 'North'
   * });
   * labels.add({
   *   position : new Cesium.Cartesian3(0.0, 0.0, 1000000.0),
   *   text     : 'Up'
   * });
   */
  this.modelMatrix = Matrix4.clone(options.modelMatrix ?? Matrix4.IDENTITY);

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the primitive.
   * </p>
   *
   * @type {boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

  /**
   * The label blending option. The default is used for rendering both opaque and translucent labels.
   * However, if either all of the labels are completely opaque or all are completely translucent,
   * setting the technique to BlendOption.OPAQUE or BlendOption.TRANSLUCENT can improve
   * performance by up to 2x.
   * @type {BlendOption}
   * @default BlendOption.OPAQUE_AND_TRANSLUCENT
   */
  this.blendOption = options.blendOption ?? BlendOption.OPAQUE_AND_TRANSLUCENT;
}

Object.defineProperties(LabelCollection.prototype, {
  /**
   * Returns the number of labels in this collection.  This is commonly used with
   * {@link LabelCollection#get} to iterate over all the labels
   * in the collection.
   * @memberof LabelCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._labels.length;
    },
  },

  /**
   * Returns the size in bytes of the WebGL texture resources.
   * @private
   * @memberof LabelCollection.prototype
   * @type {number}
   * @readonly
   */
  sizeInBytes: {
    get: function () {
      return (
        this._glyphBillboardCollection.sizeInBytes +
        this._backgroundBillboardCollection.sizeInBytes
      );
    },
  },

  /**
   * True when all labels currently in the collection are ready for rendering.
   * @private
   * @memberof LabelCollection.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      const backgroundBillboard = this._backgroundBillboardCollection.get(0);
      if (defined(backgroundBillboard) && !backgroundBillboard.ready) {
        return false;
      }

      return this._glyphBillboardCollection.ready;
    },
  },
});

/**
 * Creates and adds a label with the specified initial properties to the collection.
 * The added label is returned so it can be modified or removed from the collection later.
 *
 * @param {Label.ConstructorOptions} [options] A template describing the label's properties as shown in Example 1.
 * @returns {Label} The label that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten; this operations is <code>O(n)</code> and also incurs
 * CPU to GPU overhead.  For best performance, add as many billboards as possible before
 * calling <code>update</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * // Example 1:  Add a label, specifying all the default values.
 * const l = labels.add({
 *   show : true,
 *   position : Cesium.Cartesian3.ZERO,
 *   text : '',
 *   font : '30px sans-serif',
 *   fillColor : Cesium.Color.WHITE,
 *   outlineColor : Cesium.Color.BLACK,
 *   outlineWidth : 1.0,
 *   showBackground : false,
 *   backgroundColor : new Cesium.Color(0.165, 0.165, 0.165, 0.8),
 *   backgroundPadding : new Cesium.Cartesian2(7, 5),
 *   style : Cesium.LabelStyle.FILL,
 *   pixelOffset : Cesium.Cartesian2.ZERO,
 *   eyeOffset : Cesium.Cartesian3.ZERO,
 *   horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
 *   verticalOrigin : Cesium.VerticalOrigin.BASELINE,
 *   scale : 1.0,
 *   translucencyByDistance : undefined,
 *   pixelOffsetScaleByDistance : undefined,
 *   heightReference : HeightReference.NONE,
 *   distanceDisplayCondition : undefined
 * });
 *
 * @example
 * // Example 2:  Specify only the label's cartographic position,
 * // text, and font.
 * const l = labels.add({
 *   position : Cesium.Cartesian3.fromRadians(longitude, latitude, height),
 *   text : 'Hello World',
 *   font : '24px Helvetica',
 * });
 *
 *
 * @see LabelCollection#remove
 * @see LabelCollection#removeAll
 */
LabelCollection.prototype.add = function (options) {
  const label = new Label(options, this);

  this._labels.push(label);
  this._labelsToUpdate.push(label);

  return label;
};

/**
 * Removes a label from the collection.  Once removed, a label is no longer usable.
 *
 * @param {Label} label The label to remove.
 * @returns {boolean} <code>true</code> if the label was removed; <code>false</code> if the label was not found in the collection.
 *
 * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
 * best performance, remove as many labels as possible before calling <code>update</code>.
 * If you intend to temporarily hide a label, it is usually more efficient to call
 * {@link Label#show} instead of removing and re-adding the label.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * const l = labels.add(...);
 * labels.remove(l);  // Returns true
 *
 * @see LabelCollection#add
 * @see LabelCollection#removeAll
 * @see Label#show
 */
LabelCollection.prototype.remove = function (label) {
  if (defined(label) && label._labelCollection === this) {
    const index = this._labels.indexOf(label);
    if (index !== -1) {
      this._labels.splice(index, 1);
      destroyLabel(this, label);
      return true;
    }
  }
  return false;
};

/**
 * Removes all labels from the collection.
 *
 * @performance <code>O(n)</code>.  It is more efficient to remove all the labels
 * from a collection and then add new ones than to create a new collection entirely.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * labels.add(...);
 * labels.add(...);
 * labels.removeAll();
 *
 * @see LabelCollection#add
 * @see LabelCollection#remove
 */
LabelCollection.prototype.removeAll = function () {
  const labels = this._labels;

  for (let i = 0, len = labels.length; i < len; ++i) {
    destroyLabel(this, labels[i]);
  }

  labels.length = 0;
};

/**
 * Check whether this collection contains a given label.
 *
 * @param {Label} label The label to check for.
 * @returns {boolean} true if this collection contains the label, false otherwise.
 *
 * @see LabelCollection#get
 *
 */
LabelCollection.prototype.contains = function (label) {
  return defined(label) && label._labelCollection === this;
};

/**
 * Returns the label in the collection at the specified index.  Indices are zero-based
 * and increase as labels are added.  Removing a label shifts all labels after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link LabelCollection#length} to iterate over all the labels
 * in the collection.
 *
 * @param {number} index The zero-based index of the billboard.
 *
 * @returns {Label} The label at the specified index.
 *
 * @performance Expected constant time.  If labels were removed from the collection and
 * {@link Scene#render} was not called, an implicit <code>O(n)</code>
 * operation is performed.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Toggle the show property of every label in the collection
 * const len = labels.length;
 * for (let i = 0; i < len; ++i) {
 *   const l = billboards.get(i);
 *   l.show = !l.show;
 * }
 *
 * @see LabelCollection#length
 */
LabelCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  return this._labels[index];
};

/**
 * @private
 */
LabelCollection.prototype.update = function (frameState) {
  if (!this.show) {
    return;
  }

  const glyphBillboardCollection = this._glyphBillboardCollection;
  const backgroundBillboardCollection = this._backgroundBillboardCollection;

  glyphBillboardCollection.modelMatrix = this.modelMatrix;
  glyphBillboardCollection.debugShowBoundingVolume =
    this.debugShowBoundingVolume;
  backgroundBillboardCollection.modelMatrix = this.modelMatrix;
  backgroundBillboardCollection.debugShowBoundingVolume =
    this.debugShowBoundingVolume;

  const len = this._labelsToUpdate.length;
  for (let i = 0; i < len; ++i) {
    const label = this._labelsToUpdate[i];
    if (label.isDestroyed()) {
      continue;
    }

    const preUpdateGlyphCount = label._glyphs.length;

    if (label._rebindAllGlyphs) {
      rebindAllGlyphs(this, label);
      label._rebindAllGlyphs = false;
    }

    if (label._repositionAllGlyphs) {
      repositionAllGlyphs(label);
      label._repositionAllGlyphs = false;
    }

    const glyphCountDifference = label._glyphs.length - preUpdateGlyphCount;
    this._totalGlyphCount += glyphCountDifference;
  }

  const blendOption =
    backgroundBillboardCollection.length > 0
      ? BlendOption.TRANSLUCENT
      : this.blendOption;
  glyphBillboardCollection.blendOption = blendOption;
  backgroundBillboardCollection.blendOption = blendOption;

  glyphBillboardCollection._highlightColor = this._highlightColor;
  backgroundBillboardCollection._highlightColor = this._highlightColor;

  this._labelsToUpdate.length = 0;
  backgroundBillboardCollection.update(frameState);
  glyphBillboardCollection.update(frameState);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see LabelCollection#destroy
 */
LabelCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * labels = labels && labels.destroy();
 *
 * @see LabelCollection#isDestroyed
 */
LabelCollection.prototype.destroy = function () {
  this.removeAll();
  this._glyphBillboardCollection = this._glyphBillboardCollection.destroy();
  this._backgroundBillboardCollection =
    this._backgroundBillboardCollection.destroy();

  return destroyObject(this);
};
export default LabelCollection;
