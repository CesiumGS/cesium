import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
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
  this._texturesLoaded = false;
  this._commandsCreated = false;
  this._components = undefined;
  this._state = ModelState.UNLOADED;
  this._readyPromise = when.defer();
}

Object.defineProperties(Model.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external
   * resources were downloaded and the WebGL resources were created. This is set
   * to <code>true</code> right before {@link Model#readyPromise} is resolved.
   *
   * @memberof Model.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._state === ModelState.READY;
    },
  },

  /**
   * Gets the promise that will be resolved when this model is ready to render,
   * i.e., when the resources were downloaded and the WebGL resources were created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof Model.prototype
   * @type {Promise.<Model>}
   * @readonly
   *
   * @example
   * // Play all animations at half-speed when the model is ready to render
   * model.readyPromise.then(function(model) {
   *   model.activeAnimations.addAll({
   *     multiplier : 0.5
   *   });
   * }).otherwise(function(error){
   *   window.alert(error);
   * });
   *
   * @see Model#ready
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

/**
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf file.
 * @param {Resource|String} [options.basePath] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until all WebGL resources are created.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the glTF is loaded.
 *
 * @returns {Model} The newly created model.
 */
Model.fromGltf = function (options) {
  options = defined(options) ? options : defaultValue.EMPTY_OBJECT;

  var url = options.url;
  var basePath = options.basePath;
  var releaseGltfJson = defaultValue(options.releaseGltfJson, false);
  var asynchronous = defaultValue(options.asynchronous, true);
  var incrementallyLoadTextures = defaultValue(
    options.incrementallyLoadTextures,
    true
  );

  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.url", url);
  //>>includeEnd('debug');

  var gltfResource = Resource.createIfNeeded(url);
  var baseResource = Resource.createIfNeeded(basePath);

  var loaderOptions = {
    gltfResource: gltfResource,
    baseResource: baseResource,
    releaseGltfJson: releaseGltfJson,
    asynchronous: asynchronous,
    incrementallyLoadTextures: incrementallyLoadTextures,
  };

  var modelOptions = {
    loader: new GltfLoader(loaderOptions),
    incrementallyLoadTextures: incrementallyLoadTextures,
  };

  return new Model(modelOptions);
};

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.
 * </p>
 */
Model.prototype.update = function (frameState) {
  if (frameState.mode === SceneMode.MORPHING) {
    return;
  }

  var that = this;

  if (this._state === ModelState.UNLOADED) {
    this._state = ModelState.LOADING;
    this._loader.load();

    this._loader.promise
      .then(function () {
        that._state = ModelState.READY;
      })
      .otherwise(function (error) {
        that._state = ModelState.FAILED;
        that._readyPromise.reject(error);
      });
    this._loader.texturesLoadedPromise.then(function () {
      that._texturesLoaded = true;
    });
  }

  if (
    this._state === ModelState.LOADING ||
    (this._state === ModelState.READY && !this._texturesLoaded)
  ) {
    this._loader.process(frameState);
  }

  if (this._state === ModelState.READY && !this._commandsCreated) {
    this._commandsCreated = true;
    createCommands(this);

    frameState.afterRender.push(function () {
      that._readyPromise.resolve(that);
    });

    return;
  }

  if (this._state === ModelState.READY) {
    update(this, frameState);
  }
};

function createCommands(model) {}

function load(model, frameState) {
  var loader = model._loader;
  if (!defined(loader)) {
    model._state = ModelState.READY;
    return;
  }

  loader.load(frameState);
  model._state = ModelState.LOADING;
}
