import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import defaultValue from "../../Core/defaultValue.js";
import DeveloperError from "../../Core/DeveloperError.js";
import GltfLoader from "../GltfLoader.js";
import ModelExperimentalUtility from "./ModelExperimentalUtility.js";
import ModelExperimentalSceneGraph from "./ModelExperimentalSceneGraph.js";
import Pass from "../../Renderer/Pass.js";
import Resource from "../../Core/Resource.js";
import when from "../../ThirdParty/when.js";
import destroyObject from "../../Core/destroyObject.js";
import Matrix4 from "../../Core/Matrix4.js";
import ModelFeatureTable from "./ModelFeatureTable.js";

/**
 * A 3D model. This is a new architecture that is more decoupled than the older {@link Model}. This class is still experimental.
 *
 * Do not call this function directly, instead use the `from` functions to create
 * the Model from your source data type.
 *
 * @alias ModelExperimental
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {ResourceLoader} options.loader The loader responsible for loading the 3D model.
 * @param {Resource} options.resource The Resource to the 3D model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]  The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 *
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ModelExperimental(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.loader", options.loader);
  Check.typeOf.object("options.resource", options.resource);
  //>>includeEnd('debug');

  /**
   * The loader used to load resources for this model.
   *
   * @type {ResourceLoader}
   *
   * @private
   */
  this._loader = options.loader;
  this._resource = options.resource;

  this._modelMatrix = defaultValue(options.modelMatrix, Matrix4.IDENTITY);

  this._resourcesLoaded = false;
  this._drawCommandsBuilt = false;

  this._ready = false;
  this._readyPromise = when.defer();

  this._texturesLoaded = false;

  this._cull = defaultValue(options.cull, true);
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);
  this._allowPicking = defaultValue(options.allowPicking, true);

  // Keeps track of resources that need to be destroyed when the Model is destroyed.
  this._resources = [];

  this._boundingSphere = undefined;

  this._debugShowBoundingVolumeDirty = false;
  this._debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  initialize(this);
}

function initialize(model) {
  var loader = model._loader;
  var resource = model._resource;
  var modelMatrix = model._modelMatrix;

  loader.load();

  loader.promise
    .then(function (loader) {
      var featureMetadata = loader.components.featureMetadata;
      var featureTableKeys = Object.keys(featureMetadata._featureTables);
      if (defined(featureMetadata) && featureTableKeys.length > 0) {
        // Currently, only the first feature table is used.
        model._featureTable = new ModelFeatureTable({
          model: model,
          featureTable: featureMetadata._featureTables[featureTableKeys[0]],
        });
      }

      model._sceneGraph = new ModelExperimentalSceneGraph({
        model: model,
        modelComponents: loader.components,
        modelMatrix: modelMatrix,
      });
      model._resourcesLoaded = true;
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(this, "model", resource);
    });

  loader.texturesLoadedPromise
    .then(function () {
      model._texturesLoaded = true;
    })
    .otherwise(function () {
      ModelExperimentalUtility.getFailedLoadFunction(this, "model", resource);
    });
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
   * Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property
   * will always be false, since the 3D Tiles culling system is used.
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  cull: {
    get: function () {
      return this._cull;
    },
  },

  /**
   * The pass to use in the {@link DrawCommand} for the opaque portions of the model.
   *
   * @type {Pass}
   * @readonly
   *
   * @private
   */
  opaquePass: {
    get: function () {
      return this._opaquePass;
    },
  },

  /**
   * When <code>true</code>, each primitive is pickable with {@link Scene#pick}.  When <code>false</code>, GPU memory is saved.
   *
   * @type {Boolean}
   * @readonly
   *
   * @private
   */
  allowPicking: {
    get: function () {
      return this._allowPicking;
    },
  },

  /**
   * Gets the model's bounding sphere.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @private
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The model is not loaded. Use ModelExperimental.readyPromise or wait for ModelExperimental.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._sceneGraph._boundingSphere;
    },
  },

  /**
   * The 4x4 transformation matrix that transforms the model from model to world coordinates.
   * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's Cartesian WGS84 coordinates.
   * Local reference frames can be used by providing a different transformation matrix, like that returned
   * by {@link Transforms.eastNorthUpToFixedFrame}.
   *
   * @type {Matrix4}

   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * var origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  modelMatrix: {
    get: function () {
      return this._modelMatrix;
    },
    set: function (value) {
      this._modelMatrix = value;
    },
  },

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.
   * </p>
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default false
   */
  debugShowBoundingVolume: {
    get: function () {
      return this._debugShowBoundingVolume;
    },
    set: function (value) {
      if (this._debugShowBoundingVolume !== value) {
        this._debugShowBoundingVolumeDirty = true;
      }
      this._debugShowBoundingVolume = value;
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
  // Keep processing the model every frame until the main resources
  // (buffer views) and textures (which may be loaded asynchronously)
  // are processed.
  if (!this._resourcesLoaded || !this._texturesLoaded) {
    this._loader.process(frameState);
  }

  // short-circuit if the model resources aren't ready.
  if (!this._resourcesLoaded) {
    return;
  }

  if (!this._drawCommandsBuilt) {
    this._sceneGraph.buildDrawCommands(frameState);
    this._drawCommandsBuilt = true;

    var model = this;
    // Set the model as ready after the first frame render since the user might set up events subscribed to
    // the post render event, and the model may not be ready for those past the first frame.
    frameState.afterRender.push(function () {
      model._ready = true;
      model._readyPromise.resolve(model);
    });
  }

  if (defined(this._featureTable)) {
    this._featureTable.update(frameState);
  }

  if (this._debugShowBoundingVolumeDirty) {
    updateShowBoundingVolume(this._sceneGraph, this._debugShowBoundingVolume);
    this._debugShowBoundingVolumeDirty = false;
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
  var loader = this._loader;
  if (defined(loader)) {
    loader.destroy();
  }

  var resources = this._resources;
  for (var i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }

  destroyObject(this);
};

/**
 * <p>
 * Creates a model from a glTF asset.  When the model is ready to render, i.e., when the external binary, image,
 * and shader files are downloaded and the WebGL resources are created, the {@link Model#readyPromise} is resolved.
 * </p>
 * <p>
 * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the .glb extension.
 *
 * @param {Object} options Object with the following properties:
 * @param {String|Resource|Uint8Array} [options.gltf] A Resource/URL to a glTF/glb file or a binary glTF buffer
 * @param {Object} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 *
 * @returns {ModelExperimental} The newly created model.
 *
 * @private
 */
ModelExperimental.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.gltf", options.gltf);
  //>>includeEnd('debug');

  var loaderOptions = {
    baseResource: options.basePath,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
  };

  var gltf = options.gltf;
  if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.gltfResource = Resource.createIfNeeded(
      defaultValue(options.basePath, "")
    );
  } else {
    loaderOptions.gltfResource = Resource.createIfNeeded(options.gltf);
  }

  var loader = new GltfLoader(loaderOptions);

  var modelOptions = {
    loader: loader,
    resource: loaderOptions.gltfResource,
    modelMatrix: options.modelMatrix,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
    cull: options.cull,
    opaquePass: options.opaquePass,
    allowPicking: options.allowPicking,
  };
  var model = new ModelExperimental(modelOptions);

  return model;
};

function updateShowBoundingVolume(sceneGraph, debugShowBoundingVolume) {
  var drawCommands = sceneGraph._drawCommands;
  for (var i = 0; i < drawCommands.length; i++) {
    drawCommands[i].debugShowBoundingVolume = debugShowBoundingVolume;
  }
}
