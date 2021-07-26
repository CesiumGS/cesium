import GltfLoader from "./GltfLoader.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import RuntimeError from "../Core/RuntimeError.js";
import when from "../ThirdParty/when.js";

export default function ModelExperimental(options) {
  this._gltfLoader = undefined;
  this._readyPromise = when.defer();

  this._resourcesLoaded = false;
  this._drawCommandsBuilt = false;
  this._readyPromise = when.defer();

  initialize(this, options);
}

Object.defineProperties(ModelExperimental.prototype, {
  /**
   * Gets the promise that will be resolved when this model is ready to render, i.e. when the external resources
   * have been downloaded and the WebGL resources are created.
   * <p>
   * This promise is resolved at the end of the frame before the first frame the model is rendered in.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   * @type {Promise.<ModelExperimental>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },
});

ModelExperimental.prototype.update = function (frameState) {
  if (!this._resourcesLoaded) {
    this._gltfLoader.process(frameState);
    return;
  }

  if (!this._drawCommandsGenerated) {
    this._sceneGraph.buildDrawCommands(frameState);
    this._drawCommandsBuilt = true;
  }

  this._sceneGraph.pushDrawCommands(frameState);
};

function initialize(model, options) {
  var gltf = options.gltf;

  var loaderOptions = {
    gltfResource: options.basePath,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
  };

  if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
  } else {
    throw new RuntimeError("Only glbs are supported.");
  }

  var loader = new GltfLoader(loaderOptions);
  model._gltfLoader = loader;
  loader.load();

  loader.promise
    .then(function (loader) {
      model._readyPromise.resolve();
      model._resourcesLoaded = true;
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(
        this,
        "model",
        options.basePath
      );
    });
}
