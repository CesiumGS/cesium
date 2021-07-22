import Cloud from "./Cloud.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * A collection of clouds in the sky.
 *
 * @alias CloudCollection
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 transformation matrix that transforms each cloud from model to world coordinates.
 * @param {Boolean} [options.show=true] Whether to display the clouds.
 *
 */
function CloudCollection(options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._clouds = [];
  this._cloudsRemoved = false;

  this._show = defaultValue(options.show, true);

  this._sp = undefined;
}

Object.defineProperties(CloudCollection.prototype, {
  /**
   * Returns the number of clouds in this collection.
   * @memberof CloudCollection.prototype
   * @type {Number}
   */
  length: {
    get: function () {
      removeClouds(this);
      return this._clouds.length;
    },
  },

  /**
   * Determines if this collection of clouds will be shown.
   * @memberof CloudCollection.prototype
   * @type {Boolean}
   * @default true
   */
  show: {
    get: function () {
      return this._show;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      if (this._show !== value) {
        this._show = value;
      }
    },
  },
});

function destroyClouds(clouds) {
  var length = clouds.length;
  for (var i = 0; i < length; ++i) {
    if (clouds[i]) {
      clouds[i]._destroy();
    }
  }
}

/**
 * Creates and adds a cloud with the specified initial properties to the collection.
 * The added cloud is returned so it can be modified or removed from the collection later.
 *
 * @param {Object}[options] A template describing the cloud's properties as shown in Example 1.
 * @returns {Cloud} The cloud that was added to the collection.
 *
 * @performance Calling <code>add</code> is expected constant time.  However, the collection's vertex buffer
 * is rewritten - an <code>O(n)</code> operation that also incurs CPU to GPU overhead.  For
 * best performance, add as many clouds as possible before calling <code>update</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Example 1:  Add a cloud, specifying all the default values.
 * var c = clouds.add({
 *   show : true,
 *   position : Cesium.Cartesian3.ZERO,
 *   scale : new Cesium.Cartesian2(1.0, 1.0),
 *   type : CloudType.CUMULUS
 * });
 *
 * @example
 * // Example 2:  Specify only the cloud's cartographic position.
 * var c = clouds.add({
 *   position : Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
 * });
 *
 * @see CloudCollection#remove
 * @see CloudCollection#removeAll
 */
CloudCollection.prototype.add = function (options) {
  var c = new Cloud(options, this);
  c._index = this._clouds.length;

  this._clouds.push(c);

  return c;
};

/**
 * Removes a cloud from the collection.
 *
 * @param {Cloud} cloud The cloud to remove.
 * @returns {Boolean} <code>true</code> if the cloud was removed; <code>false</code> if the cloud was not found in the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * var c = clouds.add(...);
 * clouds.remove(c);  // Returns true
 *
 * @see CloudCollection#add
 * @see CloudCollection#removeAll
 * @see Cloud#show
 */
CloudCollection.prototype.remove = function (cloud) {
  if (this.contains(cloud)) {
    this._clouds[cloud._index] = null; // Removed later
    this._cloudsRemoved = true;
    cloud._destroy();
    return true;
  }

  return false;
};

/**
 * Removes all clouds from the collection.
 *
 * @performance <code>O(n)</code>.  It is more efficient to remove all the clouds
 * from a collection and then add new ones than to create a new collection entirely.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * clouds.add(...);
 * clouds.add(...);
 * clouds.removeAll();
 *
 * @see CloudCollection#add
 * @see CloudCollection#remove
 */
CloudCollection.prototype.removeAll = function () {
  destroyClouds(this._clouds);
  this._clouds = [];
  this._cloudsRemoved = false;
};

function removeClouds(cloudCollection) {
  if (cloudCollection._cloudsRemoved) {
    cloudCollection._cloudsRemoved = false;

    var newClouds = [];
    var clouds = cloudCollection._clouds;
    var length = clouds.length;
    for (var i = 0, j = 0; i < length; ++i) {
      var cloud = clouds[i];
      if (cloud) {
        clouds._index = j++;
        newClouds.push(cloud);
      }
    }

    cloudCollection._clouds = newClouds;
  }
}

/**
 * Check whether this collection contains a given cloud.
 *
 * @param {Billboard} [cloud] The cloud to check for.
 * @returns {Boolean} true if this collection contains the cloud, false otherwise.
 *
 * @see BillboardCollection#get
 */
CloudCollection.prototype.contains = function (cloud) {
  return defined(cloud) && cloud._cloudCollection === this;
};

/**
 * Returns the cloud in the collection at the specified index. Indices are zero-based
 * and increase as clouds are added. Removing a billboard shifts all clouds after
 * it to the left, changing their indices. This function is commonly used with
 * {@link CloudCollection#length} to iterate over all the clouds in the collection.
 *
 * @param {Number} index The zero-based index of the cloud.
 * @returns {Cloud} The cloud at the specified index.
 *
 * @performance Expected constant time. If clouds were removed from the collection and
 * {@link CloudCollection#update} was not called, an implicit <code>O(n)</code>
 * operation is performed.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Toggle the show property of every cloud in the collection
 * var len = clouds.length;
 * for (var i = 0; i < len; ++i) {
 *   var c = clouds.get(i);
 *   c.show = !c.show;
 * }
 *
 * @see CloudCollection#length
 */
CloudCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  removeClouds(this);
  return this._clouds[index];
};

/**
 * @private
 */
CloudCollection.prototype.update = function (frameState) {
  removeClouds(this);
  if (!this.show) {
    return;
  }

  if (this.autogenerate) {
    // TODO:
    // 1. Add code to add billboards to the sky
    // 2. Add code to add texture to the billboards
    // 3. Add code to add flat cloud gltfs to the sky
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
 * @see CloudCollection#destroy
 */
CloudCollection.prototype.isDestroyed = function () {
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
 * clouds = clouds && clouds.destroy();
 *
 * @see CloudCollection#isDestroyed
 */
CloudCollection.prototype.destroy = function () {
  destroyClouds(this._clouds);

  return destroyObject(this);
};

export default CloudCollection;
