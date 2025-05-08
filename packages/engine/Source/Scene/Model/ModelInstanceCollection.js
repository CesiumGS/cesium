import defined from "../../Core/defined.js";
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
 * @see ModelInstanceCollection#add
 * @see ModelInstanceCollection#remove
 * @see ModelInstance
 *
 * @example
 * // Add instance transforms to a model
 * const collection = new ModelInstanceCollection();
 * const modelInstance = new ModelInstance(transform);
 * collection.add(modelInstance);
 */

function ModelInstanceCollection() {
  this._instances = [];
  this._dirty = false;
}

Object.defineProperties(ModelInstanceCollection.prototype, {
  /**
   * Returns the number of model instances in this collection.  This is commonly used with
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
 * @exception {DeveloperError} No transform was provided.
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
  //>>includeStart('debug', pragmas.debug);
  if (!defined(transform)) {
    throw new DeveloperError("transform is required.");
  }
  //>>includeEnd('debug');
  const instance = new ModelInstance(transform, this);
  this._instances.push(instance);
  return instance;
};

/**
 * Removes a ModelInstance from the collection and returns it. Indices are zero-based
 * and increase as instances are added.  Removing an instance shifts all instances after
 * it to the left, changing their indices.
 *
 * @param {ModelInstance} instance The instance to remove.
 * @returns {ModelInstance} The model instance that was removed from the collection.
 *
 * @performance Calling <code>remove</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten at the next render cycle; this operations is <code>O(n)</code> and also incurs
 * CPU to GPU overhead.
 *
 * @exception {DeveloperError} No instance was provided.
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
ModelInstanceCollection.prototype.remove = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("instance is required.");
  }
  //>>includeEnd('debug');
  const instance = this._instances[index];
  this._instances.splice(index, 1);
  return instance;
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
