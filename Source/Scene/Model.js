import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfCache from "./GltfCache.js";

var cache = new GltfCache();

function Model(options) {}

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", options.url);
  //>>includeEnd('debug');

  var model = new Model(options);

  cache.loadGltf({
    uri: options.uri,
    basePath: options.basePath,
  }).then(function(gltf) {
    
  });

  return new Model(options);
};
