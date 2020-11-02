import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";

/**
 * A feature of a glTF model.
 * <p>
 * Provides access to a feature's properties stored in the feature table, as well
 * as the ability to show/hide a feature and change its highlight color via
 * {@link GltfLegacyFeature#show} and {@link GltfLegacyFeature#color}, respectively.
 * </p>
 * <p>
 * Modifications to a <code>GltfLegacyFeature</code> object have the lifetime of the glTF.
 * </p>
 * <p>
 * Do not construct this directly. Access it through {@link GltfLegacyFeatureTable#getFeature}
 * or picking using {@link Scene#pick}.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {GltfLegacyFeatureTable} options.featureTable The feature table.
 * @param {Number} options.featureId The feature ID.
 *
 * @alias GltfLegacyFeature
 * @constructor
 *
 * @private
 */
function GltfLegacyFeature(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var featureTable = options.featureTable;
  var featureId = options.featureId;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.featureTable", featureTable);
  Check.typeOf.object("options.featureId", featureId);
  //>>includeEnd('debug');

  this._featureTable = featureTable;
  this._featureId = featureId;
}

// TODO
GltfLegacyFeature.prototype.getProperty = function (name, result) {
  return this._featureTable.getPropertyValue(this._featureId, name, result);
};

export default GltfLegacyFeature;
