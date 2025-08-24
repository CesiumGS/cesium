import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import ModelInstance from "./ModelInstance.js";
import RuntimeError from "../../Core/RuntimeError.js";

/**
 * A collection of {@link ModelInstance} used for rendering multiple copies of a {@link Model} mesh with GPU instancing. Instancing is useful for efficiently rendering a large number of the same model, such as trees in a forest or vehicles in a parking lot.
 * Instances are added and removed from the collection using {@link ModelInstanceCollection#add}
 * and {@link ModelInstanceCollection#remove}.
 *
 * @param {object} options An object containing the following options
 * @param {ModelInstance[]} [options.instances] The API-level model instances
 *
 * @alias ModelInstanceCollection
 * @constructor
 *
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#remove
 * @see {@link Model#instances} for a collection of instances on a model.
 * @see {@link ModelInstance} for individual instances.
 * @demo {@link https://sandcastle.cesium.com/index.html?src=3DModelInstancing.html|Cesium Sandcastle 3D Model Instancing Demo}
 * @example
 * const position = Cesium.Cartesian3.fromDegrees(-75.1652, 39.9526);
 * const headingPositionRoll = new Cesium.HeadingPitchRoll();
 * const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
 *   "north",
 *   "west",
 * );
 * const instanceModelMatrix = new Cesium.Transforms.headingPitchRollToFixedFrame(
 *   position,
 *   headingPositionRoll,
 *   Cesium.Ellipsoid.WGS84,
 *   fixedFrameTransform,
 * );
 *
 * // Add an instance at the specified transform to a collection
 * const collection = new Cesium.ModelInstanceCollection();
 * collection.add(instanceModelMatrix);
 *
 * // Add an instance to a model
 * const model = await Cesium.Model.fromGltfAsync({
 *   url: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
 *   minimumPixelSize: 64,
 * });
 * viewer.scene.primitives.add(model);
 * model.instances.add(instanceModelMatrix);
 */
function ModelInstanceCollection(options) {
  this._instances = [];
  this._dirty = false;
  this._model = options?.model ?? undefined;

  this.initialize(options?.instances);
}

Object.defineProperties(ModelInstanceCollection.prototype, {
  /**
   * Returns the number of model instances in this collection. This is commonly used with
   * {@link ModelInstanceCollection#get} to iterate over all the instances in the collection.
   * @memberof ModelInstanceCollection.prototype
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._instances.length;
    },
  },
});

ModelInstanceCollection.prototype.initialize = function (transforms) {
  if (!defined(transforms)) {
    return;
  }

  for (let i = 0; i < transforms.length; i++) {
    const transform = transforms[i];
    const instance = new ModelInstance(transform);
    this._instances.push(instance);
  }
};

/**
 * Creates and adds an instance with the specified transform to the collection.
 * The added instance is returned so it can be modified or removed from the collection later.
 *
 * @param {Matrix4} transform A transform that represents an instance of a Model
 * @returns {ModelInstance} The model instance that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time. However, the collection's vertex buffer
 * is rewritten at the next render cycle; this operations is <code>O(n)</code> and also incurs
 * CPU to GPU overhead.
 *
 * @example
 * // Example:  Provide a transform to add a model instance to the collection
 * const collection = new ModelInstanceCollection()
 * const instance = collection.add(transform)
 *
 * @see ModelInstanceCollection#remove
 * @see ModelInstanceCollection#removeAll
 */
ModelInstanceCollection.prototype.add = function (transform) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("transform", transform);
  //>>includeEnd('debug');

  if (this._model?._loader._hasMeshGpuInstancing) {
    throw new RuntimeError(
      "Models with the EXT_mesh_gpu_instancing extension cannot use the ModelInstanceCollection class.",
    );
  }

  const instance = new ModelInstance(transform, this);
  this._instances.push(instance);

  this._model._runtimeInstancesDirty = true;

  return instance;
};

/**
 * Removes a ModelInstance from the collection and returns it. Indices are zero-based
 * and increase as instances are added.  Removing an instance shifts all instances after
 * it to the left, changing their indices.
 *
 * @param {ModelInstance} instance The instance to remove.
 * @returns {boolean} if removed from the collection.
 *
 * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten at the next render cycle; this operations is <code>O(n)</code> and also incurs
 * CPU to GPU overhead.
 *
 * @exception {DeveloperError} No instance was provided.
 *
 *
 * @example
 * const instance = collection.add(transform);
 * collection.remove(instance);  // Returns true
 *
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#removeAll
 */
ModelInstanceCollection.prototype.remove = function (instance) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(instance)) {
    throw new DeveloperError("instance is required.");
  }
  //>>includeEnd('debug');
  const index = this._instances.indexOf(instance);

  if (index === -1) {
    return false;
  }

  this._instances.splice(index, 1);
  this._model._runtimeInstancesDirty = true;

  return true;
};

/**
 * Removes all instances from the collection.
 *
 * @performance <code>O(n)</code>.  It is more efficient to remove all the instances
 * from a collection and then add new ones than to create a new collection entirely.
 *
 * @example
 * instances.add(...);
 * instances.add(...);
 * instances.removeAll();
 *
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#remove
 */
ModelInstanceCollection.prototype.removeAll = function () {
  const instances = this._instances;
  instances.length = 0;
  
  this._model._runtimeInstancesDirty = true;
};

/**
 * Returns the instance in the collection at the specified index.  The instance remains
 * in the collection. This function is commonly used with
 * {@link ModelInstanceCollection#length} to iterate over all the instances
 * in the collection.
 *
 * @param {number} index The zero-based index of the instance.
 *
 * @returns {ModelInstance} The instance at the specified index.
 *
 * @performance Expected constant time.
 *
 * @exception {DeveloperError} No index provided.
 *
 *
 * @example
 * // Get an instance at index i
 * const instance = instances.get(i);
 *
 * @see ModelInstanceCollection#length
 */
ModelInstanceCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  return this._instances[index];
};

export default ModelInstanceCollection;
