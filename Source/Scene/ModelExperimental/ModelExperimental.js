import clone from "../../Core/clone.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import DeveloperError from "../../Core/DeveloperError.js";
import GltfLoader from "../GltfLoader.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelExperimentalSceneGraph from "./ModelExperimentalSceneGraph.js";
import Resource from "../../Core/Resource.js";
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
 * @param {String|Resource|ArrayBuffer|Uint8Array} [options.gltf] A Resource/URL to a glTF/glb file or a binary glTF buffer.
 * @param {Resource|String} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]  The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelExperimental(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * The glTF Loader used to load resources for this model.
   *
   * @type {GltfLoader}
   * @readonly
   *
   * @private
   */
  this._gltfLoader = undefined;

  this._resourcesLoaded = false;
  this._drawCommandsBuilt = false;

  this._ready = false;
  this._readyPromise = when.defer();

  this._defaultTexture = undefined;
  this._texturesLoaded = false;

  // Keeps track of resources that need to be destroyed when the Model is destroyed.
  this._resources = [];

  initialize(this, options);
}

Object.defineProperties(ModelExperimental.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external binary, image,
   * and shader files were downloaded and the WebGL resources were created.  This is set to
   * <code>true</code> right before {@link ModelExperimental#readyPromise} is resolved.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   * @readonly
   *
   * @default false
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

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

/**
 * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
 * get the draw commands needed to render this primitive.
 * <p>
 * Do not call this function directly.  This is documented just to
 * list the exceptions that may be propagated when the scene is rendered:
 * </p>
 *
 * @exception {RuntimeError} Failed to load external reference.
 */
ModelExperimental.prototype.update = function (frameState) {
  if (!defined(this._defaultTexture)) {
    this._defaultTexture = frameState.context.defaultTexture;
  }

  // Keep processing the glTF every frame until the main resources
  // (buffer views) and textures (which may be loaded asynchronously)
  // are processed.
  if (!this._resourcesLoaded || !this._texturesLoaded) {
    this._gltfLoader.process(frameState);
  }

  // short-circuit if the glTF resources aren't ready.
  if (!this._resourcesLoaded) {
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

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
 *
 * @see ModelExperimental#destroy
 */
ModelExperimental.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
 * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
 * <br /><br />
 * Once an object is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * model = model && model.destroy();
 *
 * @see ModelExperimental#isDestroyed
 */
ModelExperimental.prototype.destroy = function () {
  var gltfLoader = this._gltfLoader;
  if (defined(gltfLoader)) {
    gltfLoader.destroy();
  }

  for (var i = 0; i < this._resources.length; i++) {
    this._resources[i].destroy();
  }

  destroyObject(this);
};

function initialize(model, options) {
  var gltf = options.gltf;

  var loaderOptions = {
    baseResource: options.basePath,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
  };

  if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.gltfResource = Resource.createIfNeeded(
      defaultValue(options.basePath, "")
    );
  } else {
    loaderOptions.gltfResource = gltf;
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
        modelMatrix: options.modelMatrix,
      });
      model._resourcesLoaded = true;
      model._ready = true;
      model._readyPromise.resolve(model);
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(
        this,
        "model",
        options.basePath
      );
    });

  loader.texturesLoadedPromise
    .then(function () {
      model._texturesLoaded = true;
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(
        this,
        "model",
        options.basePath
      );
    });
}

/**
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource|String} options.url The url to the .gltf or .glb file.
 * @param {Object} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 */
ModelExperimental.fromGltf = function (options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.url)) {
    throw new DeveloperError("options.url is required");
  }
  //>>includeEnd('debug');

  options = clone(options);
  options.gltf = Resource.createIfNeeded(options.url);
  var model = new ModelExperimental(options);
  return model;
};
