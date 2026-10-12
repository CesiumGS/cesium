import {
  Check,
  Event,
  Frozen,
  Matrix4,
  defined,
  destroyObject,
} from "@cesium/core";
import Credit from "../../Core/Credit.js";
import Resource from "../../Core/Resource.js";
import InstancedModelLoader from "./InstancedModelLoader.js";
import Model from "./Model.js";
import ModelType from "./ModelType.js";
import ModelUtility from "./ModelUtility.js";

/**
 * <div class="notice">
 * To construct a ModelInstanceCollection, call {@link ModelInstanceCollection.fromGltfAsync}. Do not call the constructor directly.
 * </div>
 * Draws many copies of one glTF model with GPU instancing. The model's
 * geometry and textures are loaded once and shared by every instance.
 *
 * @internalConstructor
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @see ModelInstanceCollection.fromGltfAsync
 */
class ModelInstanceCollection {
  /**
   * @privateParam {Model} model The instanced model.
   * @privateParam {number} length The number of instances.
   */
  constructor(model, length) {
    this._model = model;
    this._length = length;
    this._readyEvent = new Event();

    model.readyEvent.addEventListener(() => {
      this._readyEvent.raiseEvent(this);
    });
  }

  /**
   * Determines if the instances will be shown.
   *
   * @type {boolean}
   * @default true
   */
  get show() {
    return this._model.show;
  }

  set show(value) {
    this._model.show = value;
  }

  /**
   * The number of instances in the collection.
   *
   * @type {number}
   * @readonly
   */
  get length() {
    return this._length;
  }

  /**
   * When <code>true</code>, the collection is ready to render, i.e., the
   * external binary, image, and shader files were downloaded and the WebGL
   * resources were created.
   *
   * @type {boolean}
   * @readonly
   * @default false
   */
  get ready() {
    return this._model.ready;
  }

  /**
   * Gets an event that is raised when the collection is loaded and ready for
   * rendering.
   *
   * @type {Event<function(ModelInstanceCollection): void>}
   * @readonly
   */
  get readyEvent() {
    return this._readyEvent;
  }

  /**
   * The bounding sphere of all instances, in world coordinates.
   *
   * @type {BoundingSphere}
   * @readonly
   *
   * @exception {DeveloperError} The collection is not loaded. Use ModelInstanceCollection.readyEvent or wait for ModelInstanceCollection.ready to be true.
   */
  get boundingSphere() {
    return this._model.boundingSphere;
  }

  /**
   * Called when {@link Viewer} or {@link CesiumWidget} render the scene to
   * get the draw commands needed to render this primitive.
   * <p>
   * Do not call this function directly. This is documented just to
   * list the exceptions that may be propagated when the scene is rendered:
   * </p>
   *
   * @exception {RuntimeError} Failed to load external reference.
   */
  update(frameState) {
    this._model.update(frameState);
  }

  /**
   * Returns true if this object was destroyed; otherwise, false.
   * <br /><br />
   * If this object was destroyed, it should not be used; calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
   *
   * @returns {boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
   *
   * @see ModelInstanceCollection#destroy
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys the WebGL resources held by this object. Destroying an object
   * allows for deterministic release of WebGL resources, instead of relying
   * on the garbage collector to destroy this object.
   * <br /><br />
   * Once an object is destroyed, it should not be used; calling any function
   * other than <code>isDestroyed</code> will result in a {@link DeveloperError}
   * exception. Therefore, assign the return value (<code>undefined</code>) to
   * the object as done in the example.
   *
   * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
   *
   * @example
   * collection = collection && collection.destroy();
   *
   * @see ModelInstanceCollection#isDestroyed
   */
  destroy() {
    this._model.destroy();
    return destroyObject(this);
  }

  /**
   * Asynchronously creates a collection that draws a glTF model once per
   * instance. The promise resolves when the glTF JSON is loaded; the
   * collection is ready to render once {@link ModelInstanceCollection#ready}
   * is <code>true</code>.
   *
   * @param {object} options Object with the following properties:
   * @param {string|Resource} options.url The url to the .gltf or .glb file.
   * @param {ModelInstanceCollection.Instance[]} options.instances The instances to draw. Must contain at least one instance.
   * @param {boolean} [options.show=true] Whether or not to render the instances.
   * @param {boolean} [options.incrementallyLoadTextures=true] Determine if textures may continue to stream in after the model is loaded.
   * @param {boolean} [options.asynchronous=true] Determines if WebGL resource creation will be spread out over several frames or block until completion once all glTF files are loaded.
   * @param {Axis} [options.upAxis=Axis.Y] The up-axis of the glTF model.
   * @param {Axis} [options.forwardAxis=Axis.Z] The forward-axis of the glTF model.
   *
   * @returns {Promise<ModelInstanceCollection>} A promise that resolves to the created collection.
   *
   * @exception {RuntimeError} The model failed to load.
   *
   * @example
   * const instances = positions.map((position) => ({
   *   modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position),
   * }));
   * const collection = await Cesium.ModelInstanceCollection.fromGltfAsync({
   *   url: "../../SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb",
   *   instances,
   * });
   * viewer.scene.primitives.add(collection);
   */
  static async fromGltfAsync(options) {
    options = options ?? Frozen.EMPTY_OBJECT;
    const instances = options.instances;

    //>>includeStart('debug', pragmas.debug);
    Check.defined("options.url", options.url);
    Check.defined("options.instances", instances);
    Check.typeOf.number.greaterThan(
      "options.instances.length",
      instances.length,
      0,
    );
    //>>includeEnd('debug');

    const instanceTransforms = new Array(instances.length);
    for (let i = 0; i < instances.length; i++) {
      instanceTransforms[i] = Matrix4.clone(instances[i].modelMatrix);
    }

    const gltfResource = Resource.createIfNeeded(options.url);
    const loader = new InstancedModelLoader({
      instanceTransforms,
      gltfLoaderOptions: {
        gltfResource,
        asynchronous: options.asynchronous,
        incrementallyLoadTextures: options.incrementallyLoadTextures,
        upAxis: options.upAxis,
        forwardAxis: options.forwardAxis,
      },
    });

    try {
      await loader.load();
    } catch (error) {
      loader.destroy();
      throw ModelUtility.getError("model", gltfResource, error);
    }

    const model = new Model({
      loader,
      resource: gltfResource,
      type: ModelType.GLTF,
      show: options.show,
      allowPicking: false,
    });

    const resourceCredits = gltfResource.credits;
    if (defined(resourceCredits)) {
      for (let i = 0; i < resourceCredits.length; i++) {
        model._resourceCredits.push(Credit.clone(resourceCredits[i]));
      }
    }

    return new ModelInstanceCollection(model, instances.length);
  }
}

/**
 * @typedef {object} ModelInstanceCollection.Instance
 * @property {Matrix4} modelMatrix The 4x4 transformation matrix that transforms the instance from model to world coordinates.
 */

export default ModelInstanceCollection;
