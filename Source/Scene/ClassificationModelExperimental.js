import B3dmLoader from "./ModelExperimental/B3dmLoader.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Check from "../Core/Check.js";
import destroyObject from "../Core/destroyObject.js";
import defined from "../Core/defined.js";
import defaultValue from "../Core/defaultValue.js";
import DeveloperError from "../Core/DeveloperError.js";
import GltfLoader from "./GltfLoader.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelStatistics from "./ModelExperimental/ModelStatistics.js";
import ModelType from "./ModelExperimental/Type.js";
import ModelExperimentalUtility from "./ModelExperimental/ModelExperimentalUtility.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import SceneMode from "../Scene/SceneMode.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * A 3D model for classifying other 3D assets. This is a special case when a model
 * of a 3D tileset becomes a classifier when setting {@link Cesium3DTileset#classificationType}.
 * </p>
 * <p>
 * Do not call this function directly, instead use the `from` functions to create
 * the ClassificationModelExperimental from your source data type.
 * </p>
 *
 * @alias ClassificationModelExperimental
 * @constructor
 *
 * @private
 *
 * @param {Object} options Object with the following properties:
 * @param {Resource} options.resource The Resource to the 3D model.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.enableDebugWireframe=false] For debugging only. This must be set to true for debugWireframe to work in WebGL1. This cannot be set after the model has loaded.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {ClassificationType} [options.classificationType] What this model will classify.
 *
 * @exception {RuntimeError} The model must have a single node when used for classification.
 * @exception {RuntimeError} The model must have a single primitive when used for classification.
 * @exception {RuntimeError} The primitive must be a triangle mesh.
 * @exception {RuntimeError} The primitive must have un-interleaved attributes.
 * @exception {RuntimeError} The primitive must have a position attribute when used for classification.
 * @exception {RuntimeError} The primitive must have a feature ID attribute when used for classification.
 */
function ClassificationModelExperimental(options) {
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
   * @private
   */
  this._loader = options.loader;
  this._resource = options.resource;

  /**
   * Type of this model, to distinguish individual glTF files from 3D Tiles
   * internally. The corresponding constructor parameter is undocumented, since
   * ModelType is part of the private API.
   *
   * @type {ModelType}
   * @readonly
   *
   * @private
   */
  this.type = defaultValue(options.type, ModelType.GLTF);

  this._vectorPrimitive = undefined;

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
   * const origin = Cesium.Cartesian3.fromDegrees(-95.0, 40.0, 200000.0);
   * m.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(origin);
   */
  this.modelMatrix = Matrix4.clone(
    defaultValue(options.modelMatrix, Matrix4.IDENTITY)
  );
  this._modelMatrix = Matrix4.clone(this.modelMatrix);

  this._statistics = new ModelStatistics();

  this._resourcesLoaded = false;
  this._ready = false;

  this._content = options.content;
  this._cull = defaultValue(options.cull, true);

  /**
   * Whether or not to render the model.
   *
   * @type {Boolean}
   *
   * @default true
   */
  this.show = defaultValue(options.show, true);

  this._classificationType = options.classificationType;
  this._primitive = undefined;

  this._boundingSphere = new BoundingSphere();
  this._computedBoundingSphere = new BoundingSphere();

  this._axisCorrectionMatrix = Matrix4.clone(Matrix4.IDENTITY);
  this._loaderTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._computedModelMatrix = Matrix4.clone(Matrix4.IDENTITY);

  this._completeLoad = function (model, frameState) {};

  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the bounding sphere for each draw command in the model.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugShowBoundingVolume = defaultValue(
    options.debugShowBoundingVolume,
    false
  );

  this._enableDebugWireframe = defaultValue(
    options.enableDebugWireframe,
    false
  );
  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the model in wireframe.
   * </p>
   *
   * @type {Boolean}
   *
   * @default false
   */
  this.debugWireframe = defaultValue(options.debugWireframe, false);

  this._readyPromise = initialize(this);
}

Object.defineProperties(ClassificationModelExperimental.prototype, {
  /**
   * When <code>true</code>, this model is ready to render, i.e., the external resources
   * were downloaded and the WebGL resources were created.  This is set to
   * <code>true</code> right before {@link ClassificationModelExperimental#readyPromise} is resolved.
   *
   * @memberof ClassificationModelExperimental.prototype
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
   * @memberof ClassificationModelExperimental.prototype
   *
   * @type {Promise.<ClassificationModelExperimental>}
   * @readonly
   */
  readyPromise: {
    get: function () {
      return this._readyPromise;
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
   * The tile content this model belongs to, if it is loaded as part of a {@link Cesium3DTileset}.
   *
   * @memberof ClassificationModelExperimental.prototype
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
   * Gets the model's bounding sphere in world space.
   *
   * @memberof ClassificationModelExperimental.prototype
   *
   * @type {BoundingSphere}
   * @readonly
   */
  boundingSphere: {
    get: function () {
      //>>includeStart('debug', pragmas.debug);
      if (!this._ready) {
        throw new DeveloperError(
          "The model is not loaded. Use ClassificationModelExperimental.readyPromise or wait for ClassificationModelExperimental.ready to be true."
        );
      }
      //>>includeEnd('debug');

      return this._computedBoundingSphere;
    },
  },
});

function initialize(model) {
  const loader = model._loader;
  const resource = model._resource;

  loader.load();

  const loaderPromise = loader.promise.then(function () {
    model._resourcesLoaded = true;
  });

  const promise = new Promise(function (resolve) {
    model._completeLoad = function (model, frameState) {
      // Set the model as ready after the first frame render since the user might set up events subscribed to
      // the post render event, and the model may not be ready for those past the first frame.
      frameState.afterRender.push(function () {
        model._ready = true;
        resolve(model);
      });
    };
  });

  return loaderPromise
    .then(function () {
      if (model.isDestroyed()) {
        return;
      }
      return promise;
    })
    .catch(function (error) {
      if (model.isDestroyed()) {
        return;
      }

      return ModelExperimentalUtility.getFailedLoadFunction(
        model,
        "model",
        resource
      )(error);
    });
}

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
ClassificationModelExperimental.prototype.update = function (frameState) {
  processLoader(this, frameState);

  if (this._resourcesLoaded) {
    finishLoading(this);
    return;
  }

  if (!this._ready || frameState.mode !== SceneMode.SCENE3D) {
    return;
  }

  updateModelMatrixAndBoundingSphere(this);
  // TODO: other stuff

  if (!this._show) {
    return;
  }

  // draw here
};

function processLoader(model, frameState) {
  if (!this._resourcesLoaded) {
    model._loader.process(frameState);
    return;
  }
}

function validate(components) {
  const nodes = components.nodes;

  if (nodes.length !== 1) {
    throw new RuntimeError(
      "The model must have a single node when used for classification."
    );
  }

  const node = nodes[0];

  if (node.primitives.length !== 1) {
    throw new RuntimeError(
      "The model must have a single primitive when used for classification."
    );
  }

  const primitive = node.primitives[0];
  const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );

  if (!defined(positionAttribute)) {
    throw new RuntimeError(
      "The primitive must have a position attribute when used for classification."
    );
  }

  const featureIdAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.FEATURE_ID,
    0
  );

  if (!defined(featureIdAttribute)) {
    // TODO: update comment once glTF is supported
    throw new RuntimeError(
      "The primitive must have a batch ID attribute when used for classification."
    );
  }

  if (primitive.primitiveType !== PrimitiveType.TRIANGLES) {
    throw new RuntimeError("The primitive must be a triangle mesh.");
  }

  if (positionAttribute.byteStride !== 0) {
    throw new RuntimeError(
      "The primitive must have un-interleaved attributes."
    );
  }
}

function finishLoading(model, frameState) {
  const loader = model._loader;
  const components = loader.components;

  validate(components);

  const primitive = components.nodes[0].primitives[0];
  const positionMinMax = ModelExperimentalUtility.getPositionMinMax(primitive);
  const positionMin = positionMinMax.min;
  const positionMax = positionMinMax.max;

  model._boundingSphere = BoundingSphere.fromCornerPoints(
    positionMin,
    positionMax,
    model._boundingSphere
  );

  model._axisCorrectionMatrix = ModelExperimentalUtility.getAxisCorrectionMatrix(
    components.upAxis,
    components.forwardAxis,
    model._axisCorrectionMatrix
  );

  model._loaderTransform = Matrix4.clone(
    components.transform,
    model._loaderTransform
  );

  computeModelMatrixAndBoundingSphere(model);

  const positionAttribute = ModelExperimentalUtility.getAttributeBySemantic(
    primitive,
    VertexAttributeSemantic.POSITION
  );

  const indicesLength = defined(primitive.indices)
    ? primitive.indices.count
    : positionAttribute.count;

  const trianglesLength = indicesLength / 3;

  model._statistics.trianglesLength = trianglesLength;
  //model._statistics.geometryByteLength =

  // this is where you'd create the primitive
}

function computeModelMatrixAndBoundingSphere(model) {
  model._computedModelMatrix = Matrix4.multiplyTransformation(
    model._modelMatrix,
    model._loaderTransform,
    model._computedModelMatrix
  );

  model._computedModelMatrix = Matrix4.multiplyTransformation(
    model._computedModelMatrix,
    model._axisCorrectionMatrix,
    model._computedModelMatrix
  );

  model._computedBoundingSphere = BoundingSphere.transform(
    model._boundingSphere,
    model._computedModelMatrix,
    model._computedBoundingSphere
  );
}

function updateModelMatrixAndBoundingSphere(model) {
  // This is done without a dirty flag so that the model matrix can be updated in-place
  // without needing to use a setter.
  if (!Matrix4.equals(model.modelMatrix, model._modelMatrix)) {
    model._modelMatrix = Matrix4.clone(model.modelMatrix, model._modelMatrix);
    computeModelMatrixAndBoundingSphere(model);
  }
}

/**
 * <p>
 * Creates a classification model from a glTF asset.  When the model is ready to render, i.e., when the external binary and image
 * files are downloaded and the WebGL resources are created, the {@link ClassificationModelExperimental#readyPromise} is resolved.
 * </p>
 * <p>
 * The model can be a traditional glTF asset with a .gltf extension or a Binary glTF using the .glb extension.
 * </p>
 *
 * @param {Object} options Object with the following properties:
 * @param {String|Resource} options.url The url to the .gltf or .glb file.
 * @param {String|Resource} [options.basePath=''] The base path that paths in the glTF JSON are relative to.
 * @param {Boolean} [options.show=true] Whether or not to render the model.
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms the model from model to world coordinates.
 * @param {Boolean} [options.asynchronous=true] Determines if model WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
 * @param {Boolean} [options.releaseGltfJson=false] When true, the glTF JSON is released once the glTF is loaded. This is is especially useful for cases like 3D Tiles, where each .gltf model is unique and caching the glTF JSON is not effective.
 * @param {Boolean} [options.debugShowBoundingVolume=false] For debugging only. Draws the bounding sphere for each draw command in the model.
 * @param {Boolean} [options.debugWireframe=false] For debugging only. Draws the model in wireframe.
 * @param {Boolean} [options.cull=true]  Whether or not to cull the model using frustum/horizon culling. If the model is part of a 3D Tiles tileset, this property will always be false, since the 3D Tiles culling system is used.
 * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
 * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
 * @param {Cesium3DTileContent} [options.content] The tile content this model belongs to. This property will be undefined if model is not loaded as part of a tileset.
 * @param {ClassificationType} [options.classificationType] What this model will classify.
 * @returns {ClassificationModelExperimental} The newly created classification model.
 */
ClassificationModelExperimental.fromGltf = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(options.url) && !defined(options.gltf)) {
    throw new DeveloperError("options.url is required.");
  }
  //>>includeEnd('debug');

  // options.gltf is used internally for 3D Tiles. It can be a Resource, a URL
  // to a glTF/glb file, a binary glTF buffer, or a JSON object containing the
  // glTF contents.
  const gltf = defaultValue(options.url, options.gltf);

  const loaderOptions = {
    releaseGltfJson: options.releaseGltfJson,
    asynchronous: options.asynchronous,
    incrementallyLoadTextures: false,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesAsTypedArray: true,
  };

  const basePath = defaultValue(options.basePath, "");
  const baseResource = Resource.createIfNeeded(basePath);

  if (defined(gltf.asset)) {
    loaderOptions.gltfJson = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else if (gltf instanceof Uint8Array) {
    loaderOptions.typedArray = gltf;
    loaderOptions.baseResource = baseResource;
    loaderOptions.gltfResource = baseResource;
  } else {
    loaderOptions.gltfResource = Resource.createIfNeeded(gltf);
  }

  const loader = new GltfLoader(loaderOptions);

  const is3DTiles = defined(options.content);
  const type = is3DTiles ? ModelType.TILE_GLTF : ModelType.GLTF;

  const modelOptions = makeModelOptions(loader, type, options);
  modelOptions.resource = loaderOptions.gltfResource;

  const model = new ClassificationModelExperimental(modelOptions);

  return model;
};

/*
 * @private
 */
ClassificationModelExperimental.fromB3dm = function (options) {
  const loaderOptions = {
    b3dmResource: options.resource,
    arrayBuffer: options.arrayBuffer,
    byteOffset: options.byteOffset,
    releaseGltfJson: options.releaseGltfJson,
    asynchronous: options.asynchronous,
    incrementallyLoadTextures: false,
    upAxis: options.upAxis,
    forwardAxis: options.forwardAxis,
    loadAttributesAsTypedArray: true,
  };

  const loader = new B3dmLoader(loaderOptions);

  const modelOptions = makeModelOptions(loader, ModelType.TILE_B3DM, options);

  const model = new ClassificationModelExperimental(modelOptions);
  return model;
};

ClassificationModelExperimental.prototype.isDestroyed = function () {
  return false;
};

ClassificationModelExperimental.prototype.destroy = function () {
  this._primitive = this._primitive && this._primitive.destroy();
  return destroyObject(this);
};

function makeModelOptions(loader, type, options) {
  return {
    loader: loader,
    type: type,
    resource: options.resource,
    show: options.show,
    modelMatrix: options.modelMatrix,
    debugShowBoundingVolume: options.debugShowBoundingVolume,
    enableDebugWireframe: options.enableDebugWireframe,
    debugWireframe: options.debugWireframe,
    cull: options.cull,
    content: options.content,
    classificationType: options.classificationType,
  };
}

export default ClassificationModelExperimental;
