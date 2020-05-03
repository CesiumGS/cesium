import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";
import createPropertyDescriptor from "./createPropertyDescriptor.js";

/**
 * A 3D Tiles tileset represented by an {@link Entity}.
 * The tileset modelMatrix is determined by the containing Entity position and orientation
 * or is left unset if position is undefined.
 *
 * @alias Cesium3DTilesetGraphics
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Property} [options.show=true] A boolean Property specifying the visibility of the tileset.
 * @param {Property} [options.uri] A string or Resource Property specifying the URI of the tileset.
 * @param {Property} [options.maximumScreenSpaceError] A number or Property specifying the maximum screen space error used to drive level of detail refinement.
 */
function Cesium3DTilesetGraphics(options) {
  this._definitionChanged = new Event();
  this._show = undefined;
  this._showSubscription = undefined;
  this._uri = undefined;
  this._uriSubscription = undefined;
  this._maximumScreenSpaceError = undefined;
  this._maximumScreenSpaceErrorSubscription = undefined;

  this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
}

Object.defineProperties(Cesium3DTilesetGraphics.prototype, {
  /**
   * Gets the event that is raised whenever a property or sub-property is changed or modified.
   * @memberof Cesium3DTilesetGraphics.prototype
   * @type {Event}
   * @readonly
   */
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    },
  },

  /**
   * Gets or sets the boolean Property specifying the visibility of the model.
   * @memberof Cesium3DTilesetGraphics.prototype
   * @type {Property}
   * @default true
   */
  show: createPropertyDescriptor("show"),

  /**
   * Gets or sets the string Property specifying the URI of the glTF asset.
   * @memberof Cesium3DTilesetGraphics.prototype
   * @type {Property}
   */
  uri: createPropertyDescriptor("uri"),

  /**
   * Gets or sets the maximum screen space error used to drive level of detail refinement.
   * @memberof Cesium3DTilesetGraphics.prototype
   * @type {Property}
   */
  maximumScreenSpaceError: createPropertyDescriptor("maximumScreenSpaceError"),
});

/**
 * Duplicates this instance.
 *
 * @param {Cesium3DTilesetGraphics} [result] The object onto which to store the result.
 * @returns {Cesium3DTilesetGraphics} The modified result parameter or a new instance if one was not provided.
 */
Cesium3DTilesetGraphics.prototype.clone = function (result) {
  if (!defined(result)) {
    return new Cesium3DTilesetGraphics(this);
  }
  result.show = this.show;
  result.uri = this.uri;
  result.maximumScreenSpaceError = this.maximumScreenSpaceError;

  return result;
};

/**
 * Assigns each unassigned property on this object to the value
 * of the same property on the provided source object.
 *
 * @param {Cesium3DTilesetGraphics} source The object to be merged into this object.
 */
Cesium3DTilesetGraphics.prototype.merge = function (source) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(source)) {
    throw new DeveloperError("source is required.");
  }
  //>>includeEnd('debug');

  this.show = defaultValue(this.show, source.show);
  this.uri = defaultValue(this.uri, source.uri);
  this.maximumScreenSpaceError = defaultValue(
    this.maximumScreenSpaceError,
    source.maximumScreenSpaceError
  );
};

export default Cesium3DTilesetGraphics;
