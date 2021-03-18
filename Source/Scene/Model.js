import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import GltfLoader from "./GltfLoader.js";
import SceneMode from "./SceneMode.js";
import when from "../ThirdParty/when.js";

var ModelState = {
  UNLOADED: 0,
  LOADING: 1,
  READY: 2, // Renderable, but textures can still be pending when incrementallyLoadTextures is true.
  FAILED: 3,
};

function Model(options) {
  this._loader = options.loader;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

Model.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var context = frameState.context;
  this._defaultTexture = context.defaultTexture;

  var loader = this._loader;

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
  }

  if (this._state === ModelState.LOADING) {
    if (defined(loader)) {
      loader.update(this, frameState);
      if (defined(loader.error)) {
        this._state = ModelState.FAILED;
        this._readyPromise.reject(loader.error);
        return;
      }
      if (loader.ready) {
        this._state = ModelState.READY;
      }
    } else {
      this._state = ModelState.READY;
    }
  }

  if (this._state !== ModelState.READY) {
    return;
  }
};

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  options = defined(options)
    ? clone(options, false)
    : defaultValue.EMPTY_OBJECT;

  var url = options.url;
  var basePath = options.basePath;
  var keepResident = defaultValue(options.keepResident, true); // Undocumented option

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", url);
  //>>includeEnd('debug');

  var loaderOptions = {
    uri: url,
    basePath: basePath,
    keepResident: keepResident,
  };

  // Prepare options for Model
  options.loader = new GltfLoader(loaderOptions);

  delete options.url;
  delete options.basePath;
  delete options.keepResident;

  return new Model(options);
};
