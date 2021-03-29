import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import FeatureDetection from "../Core/FeatureDetection.js";
import when from "../ThirdParty/when.js";
import GltfLoader from "./GltfLoader.js";
import SceneMode from "./SceneMode.js";

var ModelState = {
  UNLOADED: 0,
  LOADING: 1,
  PROCESSING: 2,
  READY: 3,
  FAILED: 4,
};

export default function Model(options) {
  this._loader = options.loader;
  this._nodes = [];
  this._featureMetadata = undefined;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

function load(model, frameState) {
  var loader = model._loader;
  if (!defined(loader)) {
    model._state = ModelState.READY;
    return;
  }

  model._state = ModelState.PROCESSING;

  loader
    .load(frameState)
    .then(function () {})
    .otherwise(function (error) {
      model._state = ModelState.FAILED;
      model._readyPromise.reject(error);
    });
}

function update(model, frameState) {
  var loader = model._loader;
  if (!defined(loader)) {
    return;
  }

  var ready = loader.update(frameState);
  if (ready) {
  }
}

Model.prototype.update = function (frameState) {
  if (!FeatureDetection.supportsWebP.initialized) {
    FeatureDetection.supportsWebP.initialize();
    return;
  }

  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var context = frameState.context;
  this._defaultTexture = context.defaultTexture;

  var loader = this._loader;

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
    load(this, frameState);
  }

  if (this._state === ModelState.PROCESSING) {
    var ready = update(model, frameState);

    if (defined(loader)) {
      loader.update(this, frameState);
      if (defined(loader.error)) {
        this._state = ModelState.FAILED;
        this._readyPromise.reject(loader.error);
        return;
      }
    }

    if (!defined(loader) || loader.ready) {
      createCommands(model);
      this._state = ModelState.READY;
    }
  }

  if (this._state === ModelState.READY) {
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
  var keepResident = defaultValue(options.keepResident, false); // Undocumented option

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

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see Model#destroy
 */
Model.prototype.isDestroyed = function () {
  return false;
};

Model.prototype.destroy = function () {
  this._loader.destroy();
};
