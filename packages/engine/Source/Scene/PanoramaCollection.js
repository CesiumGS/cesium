import createGuid from "../Core/createGuid.js";
import Frozen from "../Core/Frozen.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";

/**
 * A collection of panoramas.  This is most often used with {@link Scene#panoramas},
 * but <code>PanoramaCollection</code> is also a panorama itself so collections can
 * be added to collections forming a hierarchy.
 *
 * @alias PanoramaCollection
 * @constructor
 *
 * @param {object} [options] Object with the following properties:
 * @param {boolean} [options.show=true] Determines if the panoramas in the collection will be shown.
 * @param {boolean} [options.destroyPanoramas=true] Determines if panoramas in the collection are destroyed when they are removed.
 * @privateParam {boolean} [options.countReferences=false] Specifies whether adding and removing panoramas from this collection alters their reference counts. If so, adding a
 * panorama to this collection increments its reference count. Removing the panorama decrements its reference count and - if the count reaches zero **and** destroyPanoramas is true - destroys the panorama.
 * This permits panoramas to be shared between multiple collections.
 *
 * @example
 * const billboards = new Cesium.BillboardCollection();
 * const labels = new Cesium.LabelCollection();
 *
 * const collection = new Cesium.PanoramaCollection();
 * collection.add(billboards);
 *
 * scene.panoramas.add(collection);  // Add collection
 * scene.panoramas.add(labels);      // Add regular panorama
 */
function PanoramaCollection(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  this._panoramas = [];
  this._guid = createGuid();
  this._panoramaAdded = new Event();
  this._panoramaRemoved = new Event();

  // Used by the OrderedGroundPanoramaCollection
  this._zIndex = undefined;

  /**
   * Determines if panoramas in this collection will be shown.
   *
   * @type {boolean}
   * @default true
   */
  this.show = options.show ?? true;

  /**
   * Determines if panoramas in the collection are destroyed when they are removed by
   * {@link PanoramaCollection#destroy} or  {@link PanoramaCollection#remove} or implicitly
   * by {@link PanoramaCollection#removeAll}.
   *
   * @type {boolean}
   * @default true
   *
   * @example
   * // Example 1. Panoramas are destroyed by default.
   * const panoramas = new Cesium.PanoramaCollection();
   * const labels = panoramas.add(new Cesium.LabelCollection());
   * panoramas = panoramas.destroy();
   * const b = labels.isDestroyed(); // true
   *
   * @example
   * // Example 2. Do not destroy panoramas in a collection.
   * const panoramas = new Cesium.PanoramaCollection();
   * panoramas.destroyPanoramas = false;
   * const labels = panoramas.add(new Cesium.LabelCollection());
   * panoramas = panoramas.destroy();
   * const b = labels.isDestroyed(); // false
   * labels = labels.destroy();    // explicitly destroy
   */
  this.destroyPanoramas = options.destroyPanoramas ?? true;

  this._countReferences = options.countReferences ?? false;
}

Object.defineProperties(PanoramaCollection.prototype, {
  /**
   * Gets the number of panoramas in the collection.
   *
   * @memberof PanoramaCollection.prototype
   *
   * @type {number}
   * @readonly
   */
  length: {
    get: function () {
      return this._panoramas.length;
    },
  },

  /**
   * An event that is raised when a panorama is added to the collection.
   * Event handlers are passed the panorama that was added.
   * @memberof PanoramaCollection.prototype
   * @type {Event}
   * @readonly
   */
  panoramaAdded: {
    get: function () {
      return this._panoramaAdded;
    },
  },

  /**
   * An event that is raised when a panorama is removed from the collection.
   * Event handlers are passed the panorama that was removed.
   * <p>
   * Note: Depending on the destroyPanoramas constructor option, the panorama may already be destroyed.
   * </p>
   * @memberof PanoramaCollection.prototype
   * @type {Event}
   * @readonly
   */
  panoramaRemoved: {
    get: function () {
      return this._panoramaRemoved;
    },
  },
});

/**
 * Adds a panorama to the collection.
 *
 * @param {object} panorama The panorama to add.
 * @param {number} [index] The index to add the layer at.  If omitted, the panorama will be added at the bottom of all existing panoramas.
 * @returns {object} The panorama added to the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @example
 * const billboards = scene.panoramas.add(new Cesium.BillboardCollection());
 */
PanoramaCollection.prototype.add = function (panorama, index) {
  const hasIndex = defined(index);

  //>>includeStart('debug', pragmas.debug);
  if (!defined(panorama)) {
    throw new DeveloperError("panorama is required.");
  }
  if (hasIndex) {
    if (index < 0) {
      throw new DeveloperError("index must be greater than or equal to zero.");
    } else if (index > this._panoramas.length) {
      throw new DeveloperError(
        "index must be less than or equal to the number of panoramas.",
      );
    }
  }
  //>>includeEnd('debug');

  const external = (panorama._external = panorama._external || {});
  const composites = (external._composites = external._composites || {});
  composites[this._guid] = {
    collection: this,
  };

  if (!hasIndex) {
    this._panoramas.push(panorama);
  } else {
    this._panoramas.splice(index, 0, panorama);
  }

  if (this._countReferences) {
    if (!defined(external._referenceCount)) {
      external._referenceCount = 1;
    } else {
      ++external._referenceCount;
    }
  }

  this._panoramaAdded.raiseEvent(panorama);

  return panorama;
};

/**
 * Removes a panorama from the collection.
 *
 * @param {object} [panorama] The panorama to remove.
 * @returns {boolean} <code>true</code> if the panorama was removed; <code>false</code> if the panorama is <code>undefined</code> or was not found in the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * const billboards = scene.panoramas.add(new Cesium.BillboardCollection());
 * scene.panoramas.remove(billboards);  // Returns true
 *
 * @see PanoramaCollection#destroyPanoramas
 */
PanoramaCollection.prototype.remove = function (panorama) {
  // PERFORMANCE_IDEA:  We can obviously make this a lot faster.
  if (this.contains(panorama)) {
    const index = this._panoramas.indexOf(panorama);
    if (index !== -1) {
      this._panoramas.splice(index, 1);

      delete panorama._external._composites[this._guid];
      if (this._countReferences) {
        panorama._external._referenceCount--;
      }

      if (
        this.destroyPanoramas &&
        (!this._countReferences || panorama._external._referenceCount <= 0)
      ) {
        panorama.destroy();
      }

      this._panoramaRemoved.raiseEvent(panorama);

      return true;
    }
    // else ... this is not possible, I swear.
  }

  return false;
};

/**
 * Removes and destroys a panorama, regardless of destroyPanoramas or countReferences setting.
 * @private
 */
PanoramaCollection.prototype.removeAndDestroy = function (panorama) {
  const removed = this.remove(panorama);
  if (removed && !this.destroyPanoramas) {
    panorama.destroy();
  }
  return removed;
};

/**
 * Removes all panoramas in the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#destroyPanoramas
 */
PanoramaCollection.prototype.removeAll = function () {
  const panoramas = this._panoramas;
  const length = panoramas.length;
  for (let i = 0; i < length; ++i) {
    const panorama = panoramas[i];
    delete panorama._external._composites[this._guid];
    if (this._countReferences) {
      panorama._external._referenceCount--;
    }

    if (
      this.destroyPanoramas &&
      (!this._countReferences || panorama._external._referenceCount <= 0)
    ) {
      panorama.destroy();
    }

    this._panoramaRemoved.raiseEvent(panorama);
  }
  this._panoramas = [];
};

/**
 * Determines if this collection contains a panorama.
 *
 * @param {object} [panorama] The panorama to check for.
 * @returns {boolean} <code>true</code> if the panorama is in the collection; <code>false</code> if the panorama is <code>undefined</code> or was not found in the collection.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#get
 */
PanoramaCollection.prototype.contains = function (panorama) {
  return !!(
    defined(panorama) &&
    panorama._external &&
    panorama._external._composites &&
    panorama._external._composites[this._guid]
  );
};

function getPanoramaIndex(compositePanorama, panorama) {
  //>>includeStart('debug', pragmas.debug);
  if (!compositePanorama.contains(panorama)) {
    throw new DeveloperError("panorama is not in this collection.");
  }
  //>>includeEnd('debug');

  return compositePanorama._panoramas.indexOf(panorama);
}

/**
 * Raises a panorama "up one" in the collection.  If all panoramas in the collection are drawn
 * on the globe surface, this visually moves the panorama up one.
 *
 * @param {object} [panorama] The panorama to raise.
 *
 * @exception {DeveloperError} panorama is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#raiseToTop
 * @see PanoramaCollection#lower
 * @see PanoramaCollection#lowerToBottom
 */
PanoramaCollection.prototype.raise = function (panorama) {
  if (defined(panorama)) {
    const index = getPanoramaIndex(this, panorama);
    const panoramas = this._panoramas;

    if (index !== panoramas.length - 1) {
      const p = panoramas[index];
      panoramas[index] = panoramas[index + 1];
      panoramas[index + 1] = p;
    }
  }
};

/**
 * Raises a panorama to the "top" of the collection.  If all panoramas in the collection are drawn
 * on the globe surface, this visually moves the panorama to the top.
 *
 * @param {object} [panorama] The panorama to raise the top.
 *
 * @exception {DeveloperError} panorama is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#raise
 * @see PanoramaCollection#lower
 * @see PanoramaCollection#lowerToBottom
 */
PanoramaCollection.prototype.raiseToTop = function (panorama) {
  if (defined(panorama)) {
    const index = getPanoramaIndex(this, panorama);
    const panoramas = this._panoramas;

    if (index !== panoramas.length - 1) {
      // PERFORMANCE_IDEA:  Could be faster
      panoramas.splice(index, 1);
      panoramas.push(panorama);
    }
  }
};

/**
 * Lowers a panorama "down one" in the collection.  If all panoramas in the collection are drawn
 * on the globe surface, this visually moves the panorama down one.
 *
 * @param {object} [panorama] The panorama to lower.
 *
 * @exception {DeveloperError} panorama is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#lowerToBottom
 * @see PanoramaCollection#raise
 * @see PanoramaCollection#raiseToTop
 */
PanoramaCollection.prototype.lower = function (panorama) {
  if (defined(panorama)) {
    const index = getPanoramaIndex(this, panorama);
    const panoramas = this._panoramas;

    if (index !== 0) {
      const p = panoramas[index];
      panoramas[index] = panoramas[index - 1];
      panoramas[index - 1] = p;
    }
  }
};

/**
 * Lowers a panorama to the "bottom" of the collection.  If all panoramas in the collection are drawn
 * on the globe surface, this visually moves the panorama to the bottom.
 *
 * @param {object} [panorama] The panorama to lower to the bottom.
 *
 * @exception {DeveloperError} panorama is not in this collection.
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 * @see PanoramaCollection#lower
 * @see PanoramaCollection#raise
 * @see PanoramaCollection#raiseToTop
 */
PanoramaCollection.prototype.lowerToBottom = function (panorama) {
  if (defined(panorama)) {
    const index = getPanoramaIndex(this, panorama);
    const panoramas = this._panoramas;

    if (index !== 0) {
      // PERFORMANCE_IDEA:  Could be faster
      panoramas.splice(index, 1);
      panoramas.unshift(panorama);
    }
  }
};

/**
 * Returns the panorama in the collection at the specified index.
 *
 * @param {number} index The zero-based index of the panorama to return.
 * @returns {object} The panorama at the <code>index</code>.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * // Toggle the show property of every panorama in the collection.
 * const panoramas = scene.panoramas;
 * const length = panoramas.length;
 * for (let i = 0; i < length; ++i) {
 *   const p = panoramas.get(i);
 *   p.show = !p.show;
 * }
 *
 * @see PanoramaCollection#length
 */
PanoramaCollection.prototype.get = function (index) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(index)) {
    throw new DeveloperError("index is required.");
  }
  //>>includeEnd('debug');

  return this._panoramas[index];
};

/**
 * @private
 */
PanoramaCollection.prototype.update = function (frameState) {
  if (!this.show) {
    return;
  }

  const panoramas = this._panoramas;
  // Using panoramas.length in the loop is a temporary workaround
  // to allow quadtree updates to add and remove panoramas in
  // update().  This will be changed to manage added and removed lists.
  for (let i = 0; i < panoramas.length; ++i) {
    panoramas[i].update(frameState);
  }
};

/**
 * @private
 */
PanoramaCollection.prototype.prePassesUpdate = function (frameState) {
  const panoramas = this._panoramas;
  // Using panoramas.length in the loop is a temporary workaround
  // to allow quadtree updates to add and remove panoramas in
  // update().  This will be changed to manage added and removed lists.
  for (let i = 0; i < panoramas.length; ++i) {
    const panorama = panoramas[i];
    if (defined(panorama.prePassesUpdate)) {
      panorama.prePassesUpdate(frameState);
    }
  }
};

/**
 * @private
 */
PanoramaCollection.prototype.updateForPass = function (frameState, passState) {
  const panoramas = this._panoramas;
  // Using panoramas.length in the loop is a temporary workaround
  // to allow quadtree updates to add and remove panoramas in
  // update().  This will be changed to manage added and removed lists.
  for (let i = 0; i < panoramas.length; ++i) {
    const panorama = panoramas[i];
    if (defined(panorama.updateForPass)) {
      panorama.updateForPass(frameState, passState);
    }
  }
};

/**
 * @private
 */
PanoramaCollection.prototype.postPassesUpdate = function (frameState) {
  const panoramas = this._panoramas;
  // Using panoramas.length in the loop is a temporary workaround
  // to allow quadtree updates to add and remove panoramas in
  // update().  This will be changed to manage added and removed lists.
  for (let i = 0; i < panoramas.length; ++i) {
    const panorama = panoramas[i];
    if (defined(panorama.postPassesUpdate)) {
      panorama.postPassesUpdate(frameState);
    }
  }
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 *
 * @returns {boolean} True if this object was destroyed; otherwise, false.
 *
 * @see PanoramaCollection#destroy
 */
PanoramaCollection.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the WebGL resources held by each panorama in this collection.  Explicitly destroying this
 * collection allows for deterministic release of WebGL resources, instead of relying on the garbage
 * collector to destroy this collection.
 * <br /><br />
 * Since destroying a collection destroys all the contained panoramas, only destroy a collection
 * when you are sure no other code is still using any of the contained panoramas.
 * <br /><br />
 * Once this collection is destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
 * assign the return value (<code>undefined</code>) to the object as done in the example.
 *
 * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
 *
 *
 * @example
 * panoramas = panoramas && panoramas.destroy();
 *
 * @see PanoramaCollection#isDestroyed
 */
PanoramaCollection.prototype.destroy = function () {
  this.removeAll();
  return destroyObject(this);
};
export default PanoramaCollection;
