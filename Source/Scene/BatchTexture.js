import arrayFill from "../Core/arrayFill.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian4 from "../Core/Cartesian4.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import PixelFormat from "../Core/PixelFormat.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";

// TODO: Update this to use Model
/**
 * An object that manages color, show/hide and picking textures for a batch
 * table or feature table.
 *
 * @param {Object} options Object with the following properties:
 * @param {Number} featuresLength The number of features in the batch table or feature table
 * @param {Cesium3DTileContent} content The content this batch texture belongs to. Used for creating the picking texture.
 * @param {Function} [colorChangedCallback] A callback function that is called whenever the color of a feature changes.
 *
 * @alias BatchTexture
 * @constructor
 *
 * @private
 */
export default function BatchTexture(options) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("options.featuresLength", options.featuresLength);
  Check.typeOf.object("options.content", options.content);
  //>>includeEnd('debug');

  var featuresLength = options.featuresLength;

  // PERFORMANCE_IDEA: These parallel arrays probably generate cache misses in get/set color/show
  // and use A LOT of memory.  How can we use less memory?
  this._showAlphaProperties = undefined; // [Show (0 or 255), Alpha (0 to 255)] property for each feature
  this._batchValues = undefined; // Per-feature RGBA (A is based on the color's alpha and feature's show property)

  this._batchValuesDirty = false;
  this._batchTexture = undefined;
  this._defaultTexture = undefined;

  this._pickTexture = undefined;
  this._pickIds = [];

  // Dimensions for batch and pick textures
  var textureDimensions;
  var textureStep;

  if (featuresLength > 0) {
    // PERFORMANCE_IDEA: this can waste memory in the last row in the uncommon case
    // when more than one row is needed (e.g., > 16K features in one tile)
    var width = Math.min(featuresLength, ContextLimits.maximumTextureSize);
    var height = Math.ceil(featuresLength / ContextLimits.maximumTextureSize);
    var stepX = 1.0 / width;
    var centerX = stepX * 0.5;
    var stepY = 1.0 / height;
    var centerY = stepY * 0.5;

    textureDimensions = new Cartesian2(width, height);
    textureStep = new Cartesian4(stepX, centerX, stepY, centerY);
  }

  this._translucentFeaturesLength = 0;
  this._featuresLength = featuresLength;
  this._textureDimensions = textureDimensions;
  this._textureStep = textureStep;
  this._content = options.content;
  this._colorChangedCallback = options.colorChangedCallback;
}

Object.defineProperties(BatchTexture.prototype, {
  /**
   * Number of features that are translucent
   *
   * @memberof BatchTexture.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  translucentFeaturesLength: {
    get: function () {
      return this._translucentFeaturesLength;
    },
  },

  /**
   * Total size of all GPU resources used by this batch texture.
   *
   * @memberof BatchTexture.prototype
   * @type {Number}
   * @readonly
   * @private
   */
  memorySizeInBytes: {
    get: function () {
      var memory = 0;
      if (defined(this._pickTexture)) {
        memory += this._pickTexture.sizeInBytes;
      }
      if (defined(this._batchTexture)) {
        memory += this._batchTexture.sizeInBytes;
      }
      return memory;
    },
  },

  /**
   * Dimensions of the underlying batch texture.
   *
   * @memberof BatchTexture.prototype
   * @type {Cartesian2}
   * @readonly
   * @private
   */
  textureDimensions: {
    get: function () {
      return this._textureDimensions;
    },
  },

  /**
   * Size of each texture and distance from side to center of a texel in
   * each direction. Stored as (stepX, centerX, stepY, centerY)
   *
   * @memberof BatchTexture.prototype
   * @type {Cartesian4}
   * @readonly
   * @private
   */
  textureStep: {
    get: function () {
      return this._textureStep;
    },
  },

  /**
   * The underlying texture used for styling. The texels are accessed
   * by batch ID, and the value is the color of this feature after accounting
   * for show/hide settings.
   *
   * @memberof BatchTexture.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  batchTexture: {
    get: function () {
      return this._batchTexture;
    },
  },

  /**
   * The default texture to use when there are no batch values
   *
   * @memberof BatchTexture.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  defaultTexture: {
    get: function () {
      return this._defaultTexture;
    },
  },

  /**
   * The underlying texture used for picking. The texels are accessed by
   * batch ID, and the value is the pick color.
   *
   * @memberof BatchTexture.prototype
   * @type {Texture}
   * @readonly
   * @private
   */
  pickTexture: {
    get: function () {
      return this._pickTexture;
    },
  },
});

BatchTexture.DEFAULT_COLOR_VALUE = Color.WHITE;
BatchTexture.DEFAULT_SHOW_VALUE = true;

function getByteLength(batchTexture) {
  var dimensions = batchTexture._textureDimensions;
  return dimensions.x * dimensions.y * 4;
}

function getBatchValues(batchTexture) {
  if (!defined(batchTexture._batchValues)) {
    // Default batch texture to RGBA = 255: white highlight (RGB) and show/alpha = true/255 (A).
    var byteLength = getByteLength(batchTexture);
    var bytes = new Uint8Array(byteLength);
    arrayFill(bytes, 255);
    batchTexture._batchValues = bytes;
  }

  return batchTexture._batchValues;
}

function getShowAlphaProperties(batchTexture) {
  if (!defined(batchTexture._showAlphaProperties)) {
    var byteLength = 2 * batchTexture._featuresLength;
    var bytes = new Uint8Array(byteLength);
    // [Show = true, Alpha = 255]
    arrayFill(bytes, 255);
    batchTexture._showAlphaProperties = bytes;
  }
  return batchTexture._showAlphaProperties;
}

function checkBatchId(batchId, featuresLength) {
  if (!defined(batchId) || batchId < 0 || batchId >= featuresLength) {
    throw new DeveloperError(
      "batchId is required and between zero and featuresLength - 1 (" +
        featuresLength -
        +")."
    );
  }
}

/**
 * Set whether a feature is visible.
 *
 * @param {Number} batchId the ID of the feature
 * @param {Boolean} show <code>true</code> if the feature should be shown, <code>false</code> otherwise
 * @private
 */
BatchTexture.prototype.setShow = function (batchId, show) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this._featuresLength);
  Check.typeOf.bool("show", show);
  //>>includeEnd('debug');

  if (show && !defined(this._showAlphaProperties)) {
    // Avoid allocating since the default is show = true
    return;
  }

  var showAlphaProperties = getShowAlphaProperties(this);
  var propertyOffset = batchId * 2;

  var newShow = show ? 255 : 0;
  if (showAlphaProperties[propertyOffset] !== newShow) {
    showAlphaProperties[propertyOffset] = newShow;

    var batchValues = getBatchValues(this);

    // Compute alpha used in the shader based on show and color.alpha properties
    var offset = batchId * 4 + 3;
    batchValues[offset] = show ? showAlphaProperties[propertyOffset + 1] : 0;

    this._batchValuesDirty = true;
  }
};

/**
 * Set the show for all features at once.
 *
 * @param {Boolean} show <code>true</code> if the feature should be shown, <code>false</code> otherwise
 * @private
 */
BatchTexture.prototype.setAllShow = function (show) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.bool("show", show);
  //>>includeEnd('debug');

  var featuresLength = this._featuresLength;
  for (var i = 0; i < featuresLength; ++i) {
    this.setShow(i, show);
  }
};

/**
 * Check the current show value for a feature
 *
 * @param {Number} batchId the ID of the feature
 * @return {Boolean} <code>true</code> if the feature is shown, or <code>false</code> otherwise
 * @private
 */
BatchTexture.prototype.getShow = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this._featuresLength);
  //>>includeEnd('debug');

  if (!defined(this._showAlphaProperties)) {
    // Avoid allocating since the default is show = true
    return true;
  }

  var offset = batchId * 2;
  return this._showAlphaProperties[offset] === 255;
};

var scratchColorBytes = new Array(4);

/**
 * Set the styling color of a feature
 *
 * @param {Number} batchId the ID of the feature
 * @param {Color} color the color to assign to this feature.
 *
 * @private
 */
BatchTexture.prototype.setColor = function (batchId, color) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this._featuresLength);
  Check.typeOf.object("color", color);
  //>>includeEnd('debug');

  if (
    Color.equals(color, BatchTexture.DEFAULT_COLOR_VALUE) &&
    !defined(this._batchValues)
  ) {
    // Avoid allocating since the default is white
    return;
  }

  var newColor = color.toBytes(scratchColorBytes);
  var newAlpha = newColor[3];

  var batchValues = getBatchValues(this);
  var offset = batchId * 4;

  var showAlphaProperties = getShowAlphaProperties(this);
  var propertyOffset = batchId * 2;

  if (
    batchValues[offset] !== newColor[0] ||
    batchValues[offset + 1] !== newColor[1] ||
    batchValues[offset + 2] !== newColor[2] ||
    showAlphaProperties[propertyOffset + 1] !== newAlpha
  ) {
    batchValues[offset] = newColor[0];
    batchValues[offset + 1] = newColor[1];
    batchValues[offset + 2] = newColor[2];

    var wasTranslucent = showAlphaProperties[propertyOffset + 1] !== 255;

    // Compute alpha used in the shader based on show and color.alpha properties
    var show = showAlphaProperties[propertyOffset] !== 0;
    batchValues[offset + 3] = show ? newAlpha : 0;
    showAlphaProperties[propertyOffset + 1] = newAlpha;

    // Track number of translucent features so we know if this tile needs
    // opaque commands, translucent commands, or both for rendering.
    var isTranslucent = newAlpha !== 255;
    if (isTranslucent && !wasTranslucent) {
      ++this._translucentFeaturesLength;
    } else if (!isTranslucent && wasTranslucent) {
      --this._translucentFeaturesLength;
    }

    this._batchValuesDirty = true;

    if (defined(this._colorChangedCallback)) {
      this._colorChangedCallback(batchId, color);
    }
  }
};

/**
 * Set the styling color for all features at once
 *
 * @param {Color} color the color to assign to all features.
 *
 * @private
 */
BatchTexture.prototype.setAllColor = function (color) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("color", color);
  //>>includeEnd('debug');

  var featuresLength = this._featuresLength;
  for (var i = 0; i < featuresLength; ++i) {
    this.setColor(i, color);
  }
};

/**
 * Get the current color of a feature
 *
 * @param {Number} batchId The ID of the feature
 * @param {Color} result A color object where the result will be stored.
 * @return {Color} The color assigned to the selected feature
 *
 * @private
 */
BatchTexture.prototype.getColor = function (batchId, result) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this._featuresLength);
  Check.typeOf.object("result", result);
  //>>includeEnd('debug');

  if (!defined(this._batchValues)) {
    return Color.clone(BatchTexture.DEFAULT_COLOR_VALUE, result);
  }

  var batchValues = this._batchValues;
  var offset = batchId * 4;

  var showAlphaProperties = this._showAlphaProperties;
  var propertyOffset = batchId * 2;

  return Color.fromBytes(
    batchValues[offset],
    batchValues[offset + 1],
    batchValues[offset + 2],
    showAlphaProperties[propertyOffset + 1],
    result
  );
};

/**
 * Get the pick color of a feature. This feature is an RGBA encoding of the
 * pick ID.
 *
 * @param {Number} batchId The ID of the feature
 * @return {PickId} The picking color assigned to this feature
 *
 * @private
 */
BatchTexture.prototype.getPickColor = function (batchId) {
  //>>includeStart('debug', pragmas.debug);
  checkBatchId(batchId, this._featuresLength);
  //>>includeEnd('debug');
  return this._pickIds[batchId];
};

function createTexture(batchTexture, context, bytes) {
  var dimensions = batchTexture._textureDimensions;
  return new Texture({
    context: context,
    pixelFormat: PixelFormat.RGBA,
    pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
    source: {
      width: dimensions.x,
      height: dimensions.y,
      arrayBufferView: bytes,
    },
    flipY: false,
    sampler: Sampler.NEAREST,
  });
}

function createPickTexture(batchTexture, context) {
  var featuresLength = batchTexture._featuresLength;
  if (!defined(batchTexture._pickTexture) && featuresLength > 0) {
    var pickIds = batchTexture._pickIds;
    var byteLength = getByteLength(batchTexture);
    var bytes = new Uint8Array(byteLength);
    var content = batchTexture._content;

    // PERFORMANCE_IDEA: we could skip the pick texture completely by allocating
    // a continuous range of pickIds and then converting the base pickId + batchId
    // to RGBA in the shader.  The only consider is precision issues, which might
    // not be an issue in WebGL 2.
    for (var i = 0; i < featuresLength; ++i) {
      var pickId = context.createPickId(content.getFeature(i));
      pickIds.push(pickId);

      var pickColor = pickId.color;
      var offset = i * 4;
      bytes[offset] = Color.floatToByte(pickColor.red);
      bytes[offset + 1] = Color.floatToByte(pickColor.green);
      bytes[offset + 2] = Color.floatToByte(pickColor.blue);
      bytes[offset + 3] = Color.floatToByte(pickColor.alpha);
    }

    batchTexture._pickTexture = createTexture(batchTexture, context, bytes);
    //content.tileset._statistics.batchTableByteLength +=
    //  batchTexture._pickTexture.sizeInBytes;
  }
}

function updateBatchTexture(batchTexture) {
  var dimensions = batchTexture._textureDimensions;
  // PERFORMANCE_IDEA: Instead of rewriting the entire texture, use fine-grained
  // texture updates when less than, for example, 10%, of the values changed.  Or
  // even just optimize the common case when one feature show/color changed.
  batchTexture._batchTexture.copyFrom({
    source: {
      width: dimensions.x,
      height: dimensions.y,
      arrayBufferView: batchTexture._batchValues,
    },
  });
}

BatchTexture.prototype.update = function (tileset, frameState) {
  var context = frameState.context;
  this._defaultTexture = context.defaultTexture;

  var passes = frameState.passes;
  if (passes.pick || passes.postProcess) {
    createPickTexture(this, context);
  }

  if (this._batchValuesDirty) {
    this._batchValuesDirty = false;

    // Create batch texture on-demand
    if (!defined(this._batchTexture)) {
      this._batchTexture = createTexture(this, context, this._batchValues);
      //tileset._statistics.batchTableByteLength += this._batchTexture.sizeInBytes;
    }

    updateBatchTexture(this); // Apply per-feature show/color updates
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <p>
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * </p>
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see BatchTexture#destroy
 * @private
 */
BatchTexture.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <p>
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 * </p>
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * e = e && e.destroy();
 *
 * @see BatchTexture#isDestroyed
 * @private
 */
BatchTexture.prototype.destroy = function () {
  this._batchTexture = this._batchTexture && this._batchTexture.destroy();
  this._pickTexture = this._pickTexture && this._pickTexture.destroy();

  var pickIds = this._pickIds;
  var length = pickIds.length;
  for (var i = 0; i < length; ++i) {
    pickIds[i].destroy();
  }

  return destroyObject(this);
};
