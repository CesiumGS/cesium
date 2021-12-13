import Check from "../../Core/Check.js";
import ColorBlendMode from "../ColorBlendMode.js";
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
import B3dmLoader from "./B3dmLoader.js";
import Color from "../../Core/Color.js";

/**
 * A 3D model. This is a new architecture that is more decoupled than the older {@link Model}. This class is still experimental.
 * <p>
 * Do not call this function directly, instead use the `from` functions to create
 * the Model from your source data type.
 * </p>
 *
 * @alias ModelExperimental
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The Resource to the 3D model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY]  The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @param {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Color} [options.color] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {Number} [options.featureIdAttributeIndex=0] The index of the feature ID attribute to use for picking features per-instance or per-primitive.
 * @param {Number} [options.featureIdTextureIndex=0] The index of the feature ID texture to use for picking features per-primitive.
 *
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
   * The corresponding constructor parameter is undocumented, since
   * ResourceLoader is part of the private API.
   *
   * @type {ResourceLoader}
   *
   * @private
   */
  this._loader = options.loader;
  this._resource = options.resource;

  this._modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );

  this._resourcesLoaded = false;
  this._drawCommandsBuilt = false;

  this._ready = false;
  this._readyPromise = when.defer();
  this._customShader = options.customShader;
  this._content = options.content;

  this._texturesLoaded = false;

  var color = options.color;
  this._color = defaultValue(color) ? Color.clone(color) : undefined;
  this._colorBlendMode = defaultValue(
    options.colorBlendMode,
    ColorBlendMode.HIGHLIGHT
  );
  this._colorBlendAmount = defaultValue(options.colorBlendAmount, 0.5);

  this._cull = defaultValue(options.cull, true);
  this._opaquePass = defaultValue(options.opaquePass, Pass.OPAQUE);
  this._allowPicking = defaultValue(options.allowPicking, true);
  this._show = defaultValue(options.show, true);

  this._featureIdAttributeIndex = defaultValue(
    options.featureIdAttributeIndex,
    0
  );
  this._featureIdTextureIndex = defaultValue(options.featureIdTextureIndex, 0);
  this._featureTables = undefined;
  this._featureTableId = undefined;

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

function createModelFeatureTables(model, featureMetadata) {
  var modelFeatureTables = [];

  var propertyTables = featureMetadata.propertyTables;
  for (var i = 0; i < propertyTables.length; i++) {
    var propertyTable = propertyTables[i];
    var modelFeatureTable = new ModelFeatureTable({
      model: model,
      propertyTable: propertyTable,
    });

    if (modelFeatureTable.featuresLength > 0) {
      modelFeatureTables.push(modelFeatureTable);
    }
  }

  return modelFeatureTables;
}

function selectFeatureTableId(components, model) {
  var featureIdAttributeIndex = model._featureIdAttributeIndex;
  var featureIdTextureIndex = model._featureIdTextureIndex;

  var i, j;
  var featureIdAttribute;
  var featureIdTexture;

  var node;
  // Scan the nodes till we find one with instances, get the feature table ID
  // if the feature ID attribute of the user-selected index is present.
  for (i = 0; i < components.nodes.length; i++) {
    node = components.nodes[i];
    if (defined(node.instances)) {
      featureIdAttribute =
        node.instances.featureIdAttributes[featureIdAttributeIndex];
      if (defined(featureIdAttribute)) {
        return featureIdAttribute.propertyTableId;
      }
    }
  }

  // Scan the primitives till we find one with textures or attributes, get the feature table ID
  // if the feature ID attribute/texture of the user-selected index is present.
  for (i = 0; i < components.nodes.length; i++) {
    node = components.nodes[i];
    for (j = 0; j < node.primitives.length; j++) {
      var primitive = node.primitives[j];
      featureIdTexture = primitive.featureIdTextures[featureIdTextureIndex];
      featureIdAttribute =
        primitive.featureIdAttributes[featureIdAttributeIndex];

      if (defined(featureIdTexture)) {
        return featureIdTexture.propertyTableId;
      } else if (defined(featureIdAttribute)) {
        return featureIdAttribute.propertyTableId;
      }
    }
  }
}

function initialize(model) {
  var loader = model._loader;
  var resource = model._resource;

  loader.load();

  loader.promise
    .then(function (loader) {
      Matrix4.multiply(
        model._modelMatrix,
        loader.transform,
        model._modelMatrix
      );

      var components = loader.components;
      var featureMetadata = components.featureMetadata;

      if (defined(featureMetadata) && featureMetadata.propertyTableCount > 0) {
        var featureTableId = selectFeatureTableId(components, model);
        var featureTables = createModelFeatureTables(model, featureMetadata);
        model.featureTables = featureTables;
        model.featureTableId = featureTableId;
      }

      model._sceneGraph = new ModelExperimentalSceneGraph({
        model: model,
        modelComponents: components,
      });
      model._resourcesLoaded = true;
    })
    .otherwise(
      ModelExperimentalUtility.getFailedLoadFunction(model, "model", resource)
    );

  loader.texturesLoadedPromise
    .then(function () {
      model._texturesLoaded = true;
    })
    .otherwise(
      ModelExperimentalUtility.getFailedLoadFunction(model, "model", resource)
    );
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
   * The model's custom shader, if it exists. Using custom shaders with a {@link Cesium3DTileStyle}
   * may lead to undefined behavior.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {CustomShader}
   */
  customShader: {
    get: function () {
      return this._customShader;
    },
    set: function (value) {
      if (value !== this._customShader) {
        this.resetDrawCommands();
      }
      this._customShader = value;
    },
  },

  /**
   * The tile content this model belongs to, if it is loaded as part of a {@link Cesium3DTileset}.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Cesium3DTileContent}
   * @readonly
   *
   * @private
   */
  content: {
    get: function () {
      return this._content;
    },
  },

  /**
   * The ID for the feature table to use for picking and styling in this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @private
   */
  featureTableId: {
    get: function () {
      return this._featureTableId;
    },
    set: function (value) {
      this._featureTableId = value;
    },
  },

  /**
   * The feature tables for this model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Array}
   * @readonly
   *
   * @private
   */
  featureTables: {
    get: function () {
      return this._featureTables;
    },
    set: function (value) {
      this._featureTables = value;
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
   * The style to apply the to the features in the model. Cannot be applied if a {@link CustomShader} is also applied.
   *
   * @type {Cesium3DTileStyle}
   */
  style: {
    get: function () {
      return this._style;
    },
    set: function (value) {
      if (value !== this._style) {
        this.applyStyle(value);
      }
      this._style = value;
    },
  },

  /**
   * The color to blend with the model's rendered color.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Color}
   */
  color: {
    get: function () {
      return this._color;
    },
    set: function (value) {
      if (!Color.equals(this._color, value)) {
        this.resetDrawCommands();
      }
      this._color = value;
    },
  },

  /**
   * Defines how the color blends with the model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Cesium3DTileColorBlendMode|ColorBlendMode}
   * @default ColorBlendMode.HIGHLIGHT
   */
  colorBlendMode: {
    get: function () {
      return this._colorBlendMode;
    },
    set: function (value) {
      this._colorBlendMode = value;
    },
  },

  /**
   * Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   * @default 0.5
   */
  colorBlendAmount: {
    get: function () {
      return this._colorBlendAmount;
    },
    set: function (value) {
      this._colorBlendAmount = value;
    },
  },

  /**
   * Gets the model's bounding sphere.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {BoundingSphere}
   * @readonly
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

  /**
   * Whether or not to render the model.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Boolean}
   *
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      this._show = value;
    },
  },

  /**
   * The index of the feature ID attribute to use for picking features per-instance or per-primitive.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @default 0
   */
  featureIdAttributeIndex: {
    get: function () {
      return this._featureIdAttributeIndex;
    },
  },

  /**
   * The index of the feature ID texture to use for picking features per-primitive.
   *
   * @memberof ModelExperimental.prototype
   *
   * @type {Number}
   *
   * @default 0
   */
  featureIdTextureIndex: {
    get: function () {
      return this._featureIdTextureIndex;
    },
  },
});

/**
 * Resets the draw commands for this model.
 *
 * @private
 */
ModelExperimental.prototype.resetDrawCommands = function () {
  if (!this._drawCommandsBuilt) {
    return;
  }
  this.destroyResources();
  this._drawCommandsBuilt = false;
  this._sceneGraph._drawCommands = [];
};

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

  // A custom shader may have to load texture uniforms.
  if (defined(this._customShader)) {
    this._customShader.update(frameState);
  }

  // short-circuit if the model resources aren't ready.
  if (!this._resourcesLoaded) {
    return;
  }

  var featureTables = this._featureTables;
  if (defined(featureTables)) {
    for (var i = 0; i < featureTables.length; i++) {
      featureTables[i].update(frameState);
      // Check if the types of style commands needed have changed and trigger a reset of the draw commands
      // to ensure that translucent and opaque features are handled in the correct passes.
      if (featureTables[i].styleCommandsNeededDirty) {
        this.resetDrawCommands();
      }
    }
  }

  if (!this._drawCommandsBuilt) {
    this._sceneGraph.buildDrawCommands(frameState);
    this._drawCommandsBuilt = true;

    var model = this;

    if (!model._ready) {
      // Set the model as ready after the first frame render since the user might set up events subscribed to
      // the post render event, and the model may not be ready for those past the first frame.
      frameState.afterRender.push(function () {
        model._ready = true;
        model._readyPromise.resolve(model);
      });

      // Don't render until the next frame after the ready promise is resolved
      return;
    }
  }

  if (this._debugShowBoundingVolumeDirty) {
    updateShowBoundingVolume(this._sceneGraph, this._debugShowBoundingVolume);
    this._debugShowBoundingVolumeDirty = false;
  }

  // Check for show here because we still want the draw commands to be built so user can instantly see the model
  // when show is set to true.
  if (this._show) {
    frameState.commandList.push.apply(
      frameState.commandList,
      this._sceneGraph._drawCommands
    );
  }
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

  var featureTables = this._featureTables;
  if (defined(featureTables)) {
    for (var i = 0; i < featureTables.length; i++) {
      featureTables[i].destroy();
    }
  }

  this.destroyResources();

  destroyObject(this);
};

/**
 * Destroys resources generated in the pipeline stages.
 * @private
 */
ModelExperimental.prototype.destroyResources = function () {
  var resources = this._resources;
  for (var i = 0; i < resources.length; i++) {
    resources[i].destroy();
  }
  this._resources = [];
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
 * @param {String|Resource|Uint8Array|Object} options.gltf A Resource/URL to a glTF/glb file, a binary glTF buffer, or a JSON object containing the glTF contents
 * @param {String|Resource} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Boolean} [options.opaquePass=Pass.OPAQUE] The pass to use in the {@link DrawCommand} for the opaque portions of the model.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {Boolean} [options.allowPicking=true] When <code>true</code>, each primitive is pickable with {@link Scene#pick}.
 * @param {CustomShader} [options.customShader] A custom shader. This will add user-defined GLSL code to the vertex and fragment shaders. Using custom shaders with a {@link Cesium3DTileStyle} may lead to undefined behavior.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Color} [options.color] A color that blends with the model's rendered color.
 * @param {ColorBlendMode} [options.colorBlendMode=ColorBlendMode.HIGHLIGHT] Defines how the color blends with the model.
 * @param {Number} [options.colorBlendAmount=0.5] Value used to determine the color strength when the <code>colorBlendMode</code> is <code>MIX</code>. A value of 0.0 results in the model's rendered color while a value of 1.0 results in a solid color, with any value in-between resulting in a mix of the two.
 * @param {Number} [options.featureIdAttributeIndex=0] The index of the feature ID attribute to use for picking features per-instance or per-primitive.
 * @param {Number} [options.featureIdTextureIndex=0] The index of the feature ID texture to use for picking features per-primitive.
 *
 * @returns {ModelExperimental} The newly created model.
 */
ModelExperimental.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("options.gltf", options.gltf);
  //>>includeEnd('debug');

  var loaderOptions = {
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
  };

  var gltf = options.gltf;

  var basePath = defaultValue(options.basePath, "");
  var baseResource = Resource.createIfNeeded(basePath);

  if (defined(gltf.asset)) {
    loaderOptions.gltfJson = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
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
    customShader: options.customShader,
    content: options.content,
    show: options.show,
    color: options.color,
    colorBlendAmount: options.colorBlendAmount,
    colorBlendMode: options.colorBlendMode,
    featureIdAttributeIndex: options.featureIdAttributeIndex,
    featureIdTextureIndex: options.featureIdTextureIndex,
  };
  var model = new ModelExperimental(modelOptions);

  return model;
};

/*
 * @private
 */
ModelExperimental.fromB3dm = function (options) {
  var loaderOptions = {
    b3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    incrementallyLoadTextures: options.incrementallyLoadTextures,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
  };

  var loader = new B3dmLoader(loaderOptions);

  var modelOptions = {
    loader: loader,
    resource: loaderOptions.b3dmResource,
    modelMatrix: options.modelMatrix,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
    cull: options.cull,
    opaquePass: options.opaquePass,
    allowPicking: options.allowPicking,
    customShader: options.customShader,
    content: options.content,
    show: options.show,
    featureIdAttributeIndex: options.featureIdAttributeIndex,
    featureIdTextureIndex: options.featureIdTextureIndex,
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

/**
 * @private
 */
ModelExperimental.prototype.applyColorAndShow = function (style) {
  var hasColorStyle = defined(style) && defined(style.color);
  var hasShowStyle = defined(style) && defined(style.show);

  this._color = hasColorStyle
    ? style.color.evaluateColor(undefined, this._color)
    : Color.clone(Color.WHITE, this._color);
  this._show = hasShowStyle ? style.show.evaluate(undefined) : true;
};

/**
 * @private
 */
ModelExperimental.prototype.applyStyle = function (style) {
  // The style is only set by the ModelFeatureTable. If there are no features,
  // the color and show from the style are directly applied.
  if (
    defined(this.featureTableId) &&
    this.featureTables[this.featureTableId].featuresLength > 0
  ) {
    var featureTable = this.featureTables[this.featureTableId];
    featureTable.applyStyle(style);
  } else {
    this.applyColorAndShow(style);
  }

  this.resetDrawCommands();
};
