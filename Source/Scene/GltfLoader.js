import GltfCache from "./GltfCache";

function GltfLoader(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  var basePath = defaultValue(options.basePath, "");

  this._resource = Resource.createIfNeeded(basePath);
  this._cache = {};
  this._promiseCache = {};
}

var cache = new GltfCache();

GltfLoader.loadGlb = function (glb) {};

GltfLoader.loadGltf = function (uri) {};

GltfLoader.parseGltf = function (gltf, resource) {};
