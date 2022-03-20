import Cartographic from "../Core/Cartographic.js";
import Color from "../Core/Color.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import createBillboardPointCallback from "./createBillboardPointCallback.js";

/**
 * A point feature of a {@link Cesium3DTileset}.
 * <p>
 * Provides access to a feature's properties stored in the tile's batch table, as well
 * as the ability to show/hide a feature and change its point properties
 * </p>
 * <p>
 * Modifications to a <code>Cesium3DTilePointFeature</code> object have the lifetime of the tile's
 * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
 * to free space in the cache for visible tiles, listen to the {@link Cesium3DTileset#tileUnload} event to save any
 * modifications. Also listen to the {@link Cesium3DTileset#tileVisible} event to reapply any modifications.
 * </p>
 * <p>
 * Do not construct this directly.  Access it through {@link Cesium3DTileContent#getFeature}
 * or picking using {@link Scene#pick} and {@link Scene#pickPosition}.
 * </p>
 *
 * @alias Cesium3DTilePointFeature
 * @constructor
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * // On mouse over, display all the properties for a feature in the console log.
 * handler.setInputAction(function(movement) {
 *     const feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.Cesium3DTilePointFeature) {
 *         const propertyNames = feature.getPropertyNames();
 *         const length = propertyNames.length;
 *         for (let i = 0; i < length; ++i) {
 *             const propertyName = propertyNames[i];
 *             console.log(propertyName + ': ' + feature.getProperty(propertyName));
 *         }
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
function Cesium3DTilePointFeature(
  content,
  batchId,
  billboard,
  label,
  polyline
) {
  this._content = content;
  this._billboard = billboard;
  this._label = label;
  this._polyline = polyline;

  this._batchId = batchId;
  this._billboardImage = undefined;
  this._billboardColor = undefined;
  this._billboardOutlineColor = undefined;
  this._billboardOutlineWidth = undefined;
  this._billboardSize = undefined;
  this._pointSize = undefined;
  this._color = undefined;
  this._pointSize = undefined;
  this._pointOutlineColor = undefined;
  this._pointOutlineWidth = undefined;
  this._heightOffset = undefined;

  this._pickIds = new Array(3);

  setBillboardImage(this);
}

const scratchCartographic = new Cartographic();

Object.defineProperties(Cesium3DTilePointFeature.prototype, {
  /**
   * Gets or sets if the feature will be shown. This is set for all features
   * when a style's show is evaluated.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._label.show;
    },
    set: function (value) {
      this._label.show = value;
      this._billboard.show = value;
      this._polyline.show = value;
    },
  },

  /**
   * Gets or sets the color of the point of this feature.
   * <p>
   * Only applied when <code>image</code> is <code>undefined</code>.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      this._color = Color.clone(value, this._color);
      setBillboardImage(this);
    },
  },

  /**
   * Gets or sets the point size of this feature.
   * <p>
   * Only applied when <code>image</code> is <code>undefined</code>.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Number}
   */
  pointSize: {
    get: function () {
      return this._pointSize;
    },
    set: function (value) {
      this._pointSize = value;
      setBillboardImage(this);
    },
  },

  /**
   * Gets or sets the point outline color of this feature.
   * <p>
   * Only applied when <code>image</code> is <code>undefined</code>.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  pointOutlineColor: {
    get: function () {
      return this._pointOutlineColor;
    },
    set: function (value) {
      this._pointOutlineColor = Color.clone(value, this._pointOutlineColor);
      setBillboardImage(this);
    },
  },

  /**
   * Gets or sets the point outline width in pixels of this feature.
   * <p>
   * Only applied when <code>image</code> is <code>undefined</code>.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Number}
   */
  pointOutlineWidth: {
    get: function () {
      return this._pointOutlineWidth;
    },
    set: function (value) {
      this._pointOutlineWidth = value;
      setBillboardImage(this);
    },
  },

  /**
   * Gets or sets the label color of this feature.
   * <p>
   * The color will be applied to the label if <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  labelColor: {
    get: function () {
      return this._label.fillColor;
    },
    set: function (value) {
      this._label.fillColor = value;
      this._polyline.show = this._label.show && value.alpha > 0.0;
    },
  },

  /**
   * Gets or sets the label outline color of this feature.
   * <p>
   * The outline color will be applied to the label if <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  labelOutlineColor: {
    get: function () {
      return this._label.outlineColor;
    },
    set: function (value) {
      this._label.outlineColor = value;
    },
  },

  /**
   * Gets or sets the outline width in pixels of this feature.
   * <p>
   * The outline width will be applied to the point if <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Number}
   */
  labelOutlineWidth: {
    get: function () {
      return this._label.outlineWidth;
    },
    set: function (value) {
      this._label.outlineWidth = value;
    },
  },

  /**
   * Gets or sets the font of this feature.
   * <p>
   * Only applied when the <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {String}
   */
  font: {
    get: function () {
      return this._label.font;
    },
    set: function (value) {
      this._label.font = value;
    },
  },

  /**
   * Gets or sets the fill and outline style of this feature.
   * <p>
   * Only applied when <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {LabelStyle}
   */
  labelStyle: {
    get: function () {
      return this._label.style;
    },
    set: function (value) {
      this._label.style = value;
    },
  },

  /**
   * Gets or sets the text for this feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {String}
   */
  labelText: {
    get: function () {
      return this._label.text;
    },
    set: function (value) {
      if (!defined(value)) {
        value = "";
      }
      this._label.text = value;
    },
  },

  /**
   * Gets or sets the background color of the text for this feature.
   * <p>
   * Only applied when <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  backgroundColor: {
    get: function () {
      return this._label.backgroundColor;
    },
    set: function (value) {
      this._label.backgroundColor = value;
    },
  },

  /**
   * Gets or sets the background padding of the text for this feature.
   * <p>
   * Only applied when <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Cartesian2}
   */
  backgroundPadding: {
    get: function () {
      return this._label.backgroundPadding;
    },
    set: function (value) {
      this._label.backgroundPadding = value;
    },
  },

  /**
   * Gets or sets whether to display the background of the text for this feature.
   * <p>
   * Only applied when <code>labelText</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Boolean}
   */
  backgroundEnabled: {
    get: function () {
      return this._label.showBackground;
    },
    set: function (value) {
      this._label.showBackground = value;
    },
  },

  /**
   * Gets or sets the near and far scaling properties for this feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {NearFarScalar}
   */
  scaleByDistance: {
    get: function () {
      return this._label.scaleByDistance;
    },
    set: function (value) {
      this._label.scaleByDistance = value;
      this._billboard.scaleByDistance = value;
    },
  },

  /**
   * Gets or sets the near and far translucency properties for this feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {NearFarScalar}
   */
  translucencyByDistance: {
    get: function () {
      return this._label.translucencyByDistance;
    },
    set: function (value) {
      this._label.translucencyByDistance = value;
      this._billboard.translucencyByDistance = value;
    },
  },

  /**
   * Gets or sets the condition specifying at what distance from the camera that this feature will be displayed.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {DistanceDisplayCondition}
   */
  distanceDisplayCondition: {
    get: function () {
      return this._label.distanceDisplayCondition;
    },
    set: function (value) {
      this._label.distanceDisplayCondition = value;
      this._polyline.distanceDisplayCondition = value;
      this._billboard.distanceDisplayCondition = value;
    },
  },

  /**
   * Gets or sets the height offset in meters of this feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Number}
   */
  heightOffset: {
    get: function () {
      return this._heightOffset;
    },
    set: function (value) {
      const offset = defaultValue(this._heightOffset, 0.0);

      const ellipsoid = this._content.tileset.ellipsoid;
      const cart = ellipsoid.cartesianToCartographic(
        this._billboard.position,
        scratchCartographic
      );
      cart.height = cart.height - offset + value;
      const newPosition = ellipsoid.cartographicToCartesian(cart);

      this._billboard.position = newPosition;
      this._label.position = this._billboard.position;
      this._polyline.positions = [this._polyline.positions[0], newPosition];

      this._heightOffset = value;
    },
  },

  /**
   * Gets or sets whether the anchor line is displayed.
   * <p>
   * Only applied when <code>heightOffset</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Boolean}
   */
  anchorLineEnabled: {
    get: function () {
      return this._polyline.show;
    },
    set: function (value) {
      this._polyline.show = value;
    },
  },

  /**
   * Gets or sets the color for the anchor line.
   * <p>
   * Only applied when <code>heightOffset</code> is defined.
   * </p>
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Color}
   */
  anchorLineColor: {
    get: function () {
      return this._polyline.material.uniforms.color;
    },
    set: function (value) {
      this._polyline.material.uniforms.color = Color.clone(
        value,
        this._polyline.material.uniforms.color
      );
    },
  },

  /**
   * Gets or sets the image of this feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {String}
   */
  image: {
    get: function () {
      return this._billboardImage;
    },
    set: function (value) {
      const imageChanged = this._billboardImage !== value;
      this._billboardImage = value;
      if (imageChanged) {
        setBillboardImage(this);
      }
    },
  },

  /**
   * Gets or sets the distance where depth testing will be disabled.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Number}
   */
  disableDepthTestDistance: {
    get: function () {
      return this._label.disableDepthTestDistance;
    },
    set: function (value) {
      this._label.disableDepthTestDistance = value;
      this._billboard.disableDepthTestDistance = value;
    },
  },

  /**
   * Gets or sets the horizontal origin of this point, which determines if the point is
   * to the left, center, or right of its anchor position.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {HorizontalOrigin}
   */
  horizontalOrigin: {
    get: function () {
      return this._billboard.horizontalOrigin;
    },
    set: function (value) {
      this._billboard.horizontalOrigin = value;
    },
  },

  /**
   * Gets or sets the vertical origin of this point, which determines if the point is
   * to the bottom, center, or top of its anchor position.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {VerticalOrigin}
   */
  verticalOrigin: {
    get: function () {
      return this._billboard.verticalOrigin;
    },
    set: function (value) {
      this._billboard.verticalOrigin = value;
    },
  },

  /**
   * Gets or sets the horizontal origin of this point's text, which determines if the point's text is
   * to the left, center, or right of its anchor position.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {HorizontalOrigin}
   */
  labelHorizontalOrigin: {
    get: function () {
      return this._label.horizontalOrigin;
    },
    set: function (value) {
      this._label.horizontalOrigin = value;
    },
  },

  /**
   * Get or sets the vertical origin of this point's text, which determines if the point's text is
   * to the bottom, center, top, or baseline of it's anchor point.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {VerticalOrigin}
   */
  labelVerticalOrigin: {
    get: function () {
      return this._label.verticalOrigin;
    },
    set: function (value) {
      this._label.verticalOrigin = value;
    },
  },

  /**
   * Gets the content of the tile containing the feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Cesium3DTileContent}
   *
   * @readonly
   * @private
   */
  content: {
    get: function () {
      return this._content;
    },
  },

  /**
   * Gets the tileset containing the feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Cesium3DTileset}
   *
   * @readonly
   */
  tileset: {
    get: function () {
      return this._content.tileset;
    },
  },

  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the tileset containing the feature.
   *
   * @memberof Cesium3DTilePointFeature.prototype
   *
   * @type {Cesium3DTileset}
   *
   * @readonly
   */
  primitive: {
    get: function () {
      return this._content.tileset;
    },
  },

  /**
   * @private
   */
  pickIds: {
    get: function () {
      const ids = this._pickIds;
      ids[0] = this._billboard.pickId;
      ids[1] = this._label.pickId;
      ids[2] = this._polyline.pickId;
      return ids;
    },
  },
});

Cesium3DTilePointFeature.defaultColor = Color.WHITE;
Cesium3DTilePointFeature.defaultPointOutlineColor = Color.BLACK;
Cesium3DTilePointFeature.defaultPointOutlineWidth = 0.0;
Cesium3DTilePointFeature.defaultPointSize = 8.0;

function setBillboardImage(feature) {
  const b = feature._billboard;
  if (defined(feature._billboardImage) && feature._billboardImage !== b.image) {
    b.image = feature._billboardImage;
    return;
  }

  if (defined(feature._billboardImage)) {
    return;
  }

  const newColor = defaultValue(
    feature._color,
    Cesium3DTilePointFeature.defaultColor
  );
  const newOutlineColor = defaultValue(
    feature._pointOutlineColor,
    Cesium3DTilePointFeature.defaultPointOutlineColor
  );
  const newOutlineWidth = defaultValue(
    feature._pointOutlineWidth,
    Cesium3DTilePointFeature.defaultPointOutlineWidth
  );
  const newPointSize = defaultValue(
    feature._pointSize,
    Cesium3DTilePointFeature.defaultPointSize
  );

  const currentColor = feature._billboardColor;
  const currentOutlineColor = feature._billboardOutlineColor;
  const currentOutlineWidth = feature._billboardOutlineWidth;
  const currentPointSize = feature._billboardSize;

  if (
    Color.equals(newColor, currentColor) &&
    Color.equals(newOutlineColor, currentOutlineColor) &&
    newOutlineWidth === currentOutlineWidth &&
    newPointSize === currentPointSize
  ) {
    return;
  }

  feature._billboardColor = Color.clone(newColor, feature._billboardColor);
  feature._billboardOutlineColor = Color.clone(
    newOutlineColor,
    feature._billboardOutlineColor
  );
  feature._billboardOutlineWidth = newOutlineWidth;
  feature._billboardSize = newPointSize;

  const centerAlpha = newColor.alpha;
  const cssColor = newColor.toCssColorString();
  const cssOutlineColor = newOutlineColor.toCssColorString();
  const textureId = JSON.stringify([
    cssColor,
    newPointSize,
    cssOutlineColor,
    newOutlineWidth,
  ]);

  b.setImage(
    textureId,
    createBillboardPointCallback(
      centerAlpha,
      cssColor,
      cssOutlineColor,
      newOutlineWidth,
      newPointSize
    )
  );
}

/**
 * Returns whether the feature contains this property. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {Boolean} Whether the feature contains this property.
 */
Cesium3DTilePointFeature.prototype.hasProperty = function (name) {
  return this._content.batchTable.hasProperty(this._batchId, name);
};

/**
 * Returns an array of property names for the feature. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String[]} [results] An array into which to store the results.
 * @returns {String[]} The names of the feature's properties.
 */
Cesium3DTilePointFeature.prototype.getPropertyNames = function (results) {
  return this._content.batchTable.getPropertyNames(this._batchId, results);
};

/**
 * Returns a copy of the value of the feature's property with the given name. This includes properties from this feature's
 * class and inherited classes when using a batch table hierarchy.
 *
 * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
 *
 * @param {String} name The case-sensitive name of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 *
 * @example
 * // Display all the properties for a feature in the console log.
 * const propertyNames = feature.getPropertyNames();
 * const length = propertyNames.length;
 * for (let i = 0; i < length; ++i) {
 *     const propertyName = propertyNames[i];
 *     console.log(propertyName + ': ' + feature.getProperty(propertyName));
 * }
 */
Cesium3DTilePointFeature.prototype.getProperty = function (name) {
  return this._content.batchTable.getProperty(this._batchId, name);
};

/**
 * Returns a copy of the value of the feature's property with the given name.
 * If the feature is contained within a tileset that has metadata (3D Tiles 1.1)
 * or uses the <code>3DTILES_metadata</code> extension, tileset, group and tile metadata is
 * inherited.
 * <p>
 * To resolve name conflicts, this method resolves names from most specific to
 * least specific by metadata granularity in the order: feature, tile, group,
 * tileset. Within each granularity, semantics are resolved first, then other
 * properties.
 * </p>
 * @param {String} name The case-sensitive name of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
Cesium3DTilePointFeature.prototype.getPropertyInherited = function (name) {
  return Cesium3DTileFeature.getPropertyInherited(
    this._content,
    this._batchId,
    name
  );
};

/**
 * Sets the value of the feature's property with the given name.
 * <p>
 * If a property with the given name doesn't exist, it is created.
 * </p>
 *
 * @param {String} name The case-sensitive name of the property.
 * @param {*} value The value of the property that will be copied.
 *
 * @exception {DeveloperError} Inherited batch table hierarchy property is read only.
 *
 * @example
 * const height = feature.getProperty('Height'); // e.g., the height of a building
 *
 * @example
 * const name = 'clicked';
 * if (feature.getProperty(name)) {
 *     console.log('already clicked');
 * } else {
 *     feature.setProperty(name, true);
 *     console.log('first click');
 * }
 */
Cesium3DTilePointFeature.prototype.setProperty = function (name, value) {
  this._content.batchTable.setProperty(this._batchId, name, value);

  // PERFORMANCE_IDEA: Probably overkill, but maybe only mark the tile dirty if the
  // property is in one of the style's expressions or - if it can be done quickly -
  // if the new property value changed the result of an expression.
  this._content.featurePropertiesDirty = true;
};

/**
 * Returns whether the feature's class name equals <code>className</code>. Unlike {@link Cesium3DTilePointFeature#isClass}
 * this function only checks the feature's exact class and not inherited classes.
 * <p>
 * This function returns <code>false</code> if no batch table hierarchy is present.
 * </p>
 *
 * @param {String} className The name to check against.
 * @returns {Boolean} Whether the feature's class name equals <code>className</code>
 *
 * @private
 */
Cesium3DTilePointFeature.prototype.isExactClass = function (className) {
  return this._content.batchTable.isExactClass(this._batchId, className);
};

/**
 * Returns whether the feature's class or any inherited classes are named <code>className</code>.
 * <p>
 * This function returns <code>false</code> if no batch table hierarchy is present.
 * </p>
 *
 * @param {String} className The name to check against.
 * @returns {Boolean} Whether the feature's class or inherited classes are named <code>className</code>
 *
 * @private
 */
Cesium3DTilePointFeature.prototype.isClass = function (className) {
  return this._content.batchTable.isClass(this._batchId, className);
};

/**
 * Returns the feature's class name.
 * <p>
 * This function returns <code>undefined</code> if no batch table hierarchy is present.
 * </p>
 *
 * @returns {String} The feature's class name.
 *
 * @private
 */
Cesium3DTilePointFeature.prototype.getExactClassName = function () {
  return this._content.batchTable.getExactClassName(this._batchId);
};
export default Cesium3DTilePointFeature;
