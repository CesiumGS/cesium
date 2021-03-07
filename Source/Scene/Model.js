import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import GltfCache from "./GltfCache.js";

var cache = new GltfCache();

function Model(options) {}

Model.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var uri = options.url;

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", uri);
  //>>includeEnd('debug');

  // Create resource for the model file
  var resource = Resource.createIfNeeded(uri);

  // Setup basePath to get dependent files
  var basePath = defined(options.basePath)
    ? options.basePath
    : resource.clone();
  var baseResource = Resource.createIfNeeded(basePath);

  cache.loadGltf({
    resource: resource,
    baseResource: baseResource,
  });
};
