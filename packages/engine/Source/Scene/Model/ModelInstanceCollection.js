import Frozen from "../../Core/Frozen.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";
import ModelInstance from "./ModelInstance.js";

/**
 * A collection of {@link ModelInstance} class objects to support gpu mesh instancing
 * for a {@link Model}.
 * Instances are added and removed from the collection using {@link ModelInstanceCollection#add}
 * and {@link ModelInstanceCollection#remove}.
 *
 * @alias ModelInstanceCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {ModelInstance[]} [options.instances] The 4x4 transformation matrix that transforms each label from model to world coordinates.
 *
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#remove
 * @see ModelInstance
 *
 * @demo {@link https://sandcastle.cesium.com/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
 *
 * @example
 * // Add instance transforms to a model
 * const modelInstance = model.instances.add(transfrom);
 * const boundingSphere = modelInstance.getBoundingSphere(model);
 * viewer.camera.flyToBoundingSphere(boundingSphere);
 */

function ModelInstanceCollection(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  this._instances = options.instances ?? [];
  this._dirty = false;
}

Object.defineProperties(ModelInstanceCollection.prototype, {
  /**
   * Returns the number of model instances in this collection.  This is commonly used with
   * {@link ModelInstanceCollection#get} to iterate over all the labels
   * in the collection.
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

/**
 * Creates and adds an instance with the specified initial properties to the collection.
 * The added label is returned so it can be modified or removed from the collection later.
 *
 * @param {Matrix4} transform A transform that represents an instance of a Model
 * @returns {ModelInstance} The model instance that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten; this operations is <code>O(n)</code> and also incurs
 * CPU to GPU overhead.  For best performance, add as many instances as possible before
 * calling <code>update</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * // Example:  Provide a transform to add a model instance to the collection
 * const collection = new ModelInstanceCollection()
 * const instance = collection.add(transform)
 *
 *
 * @see ModelInstanceCollection#remove
 * @see ModelInstanceCollection#removeAll
 */
ModelInstanceCollection.prototype.add = function (transform) {
  const instance = new ModelInstance(transform, this);
  this._instances.push(instance);
  return instance;
};

/**
 * Removes an instance from the collection.  Once removed, an instance is no longer usable.
 *
 * @param {ModelInstance} instance The instance to remove.
 * @returns {boolean} <code>true</code> if the instance was removed; <code>false</code> if the instance was not found in the collection.
 *
 * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
 * best performance, remove as many instances as possible before calling <code>update</code>.
 * TODO - If you intend to temporarily hide an instance, it is usually more efficient to call
 * {@link Label#show} instead of removing and re-adding the label.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * const i = collection.add(instance);
 * collection.remove(i);  // Returns true
 *
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#removeAll
 * @see Label#show
 */
ModelInstanceCollection.prototype.remove = function (instance) {
  if (defined(instance) && instance._modelInstanceCollection === this) {
    const index = this._instances.indexOf(instance);
    if (index !== -1) {
      this._instances.splice(index, 1);
      return true;
    }
  }
  return false;
};

/**
 * Removes all instances from the collection.
 *
 * @performance <code>O(n)</code>.  It is more efficient to remove all the labels
 * from a collection and then add new ones than to create a new collection entirely.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
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
};

/**
 * Check whether this collection contains a given instance.
 *
 * @param {ModelInstance} instance The instance to check for.
 * @returns {boolean} true if this collection contains the instance, false otherwise.
 *
 * @see ModelInstanceCollection#get
 *
 */
ModelInstanceCollection.prototype.contains = function (instance) {
  return defined(instance) && instance._modelInstanceCollection === this;
};

/**
 * Returns the instance in the collection at the specified index.  Indices are zero-based
 * and increase as instances are added.  Removing an instance shifts all instances after
 * it to the left, changing their indices.  This function is commonly used with
 * {@link ModelInstanceCollection#length} to iterate over all the instances
 * in the collection.
 *
 * @param {number} index The zero-based index of the instance.
 *
 * @returns {ModelInstance} The instance at the specified index.
 *
 * @performance Expected constant time.  If instances were removed from the collection and
 * {@link Scene#render} was not called, an implicit <code>O(n)</code>
 * operation is performed.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
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

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see ModelInstanceCollection#destroy
 */
ModelInstanceCollection.prototype.isDestroyed = function () {
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
 * instances = instances && instances.destroy();
 *
 * @see ModelInstanceCollection#isDestroyed
 */
ModelInstanceCollection.prototype.destroy = function () {
  this.removeAll();
  return destroyObject(this);
};

export default ModelInstanceCollection;
