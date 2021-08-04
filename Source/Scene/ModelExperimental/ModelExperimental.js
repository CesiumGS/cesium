import defaultValue from "../../Core/defaultValue.js";
import GltfLoader from "../GltfLoader.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelExperimentalSceneGraph from "./ModelExperimentalSceneGraph.js";
import Resource from "../../Core/Resource.js";
import RuntimeError from "../../Core/RuntimeError.js";
import when from "../../ThirdParty/when.js";
import destroyObject from "../../Core/destroyObject.js";

/**
 * A 3D model based on glTF, the runtime asset format for WebGL. This is
 * a new architecture that is more decoupled than the older {@link Model}.
 *
 * This class is still experimental. glTF features that are core to 3D Tiles
 * are supported, but other features such as animation are not yet supported.
 *
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Uint8Array} [options.gltf] A binary glTF buffer.
 * @param {Resource|String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelExperimental(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

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
   *
   * @type {Promise.<ModelExperimental>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
    },
  },

  /**
   * Gets the model's up axis.
   * By default, models are Y-up according to the glTF 2.0 spec, however, geo-referenced models will typically be Z-up.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   * @default Axis.Y
   * @readonly
   *
   * @private
   */
  upAxis: {
    get: function () {
      return this._sceneGraph._upAxis;
    },
  },

  /**
   * Gets the model's forward axis.
   * By default, glTF 2.0 models are Z-forward according to the spec, however older
   * glTF (1.0, 0.8) models used X-forward. Note that only Axis.X and Axis.Z are supported.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   * @default Axis.Z
   * @readonly
   *
   * @private
   */
  forwardAxis: {
    get: function () {
      return this._sceneGraph._forwardAxis;
    },
  },
});

ModelExperimental.prototype.update = function (frameState) {
  if (!this._resourcesLoaded) {
    this._gltfLoader.process(frameState);
    return;
  }

  if (!this._drawCommandsBuilt) {
    this._sceneGraph.buildDrawCommands(frameState);
    this._drawCommandsBuilt = true;
  }

  frameState.commandList.push.apply(
    frameState.commandList,
    this._sceneGraph._drawCommands
  );
};

ModelExperimental.prototype.destroy = function () {
  destroyObject(this);
};

function initialize(model, options) {
  var gltf = options.gltf;
  var gltfResource = Resource.createIfNeeded(
    defaultValue(options.basePath, "")
  );

  var loaderOptions = {
    gltfResource: gltfResource,
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
      model._sceneGraph = new ModelExperimentalSceneGraph({
        model: model,
        modelComponents: loader._components,
        upAxis: options.upAxis,
        forwardAxis: options.forwardAxis,
      });
      model._resourcesLoaded = true;
      model._readyPromise.resolve(model);
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(
        this,
        "model",
        options.basePath
      );
    });
}
