import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * A cloud billboard that is created and rendered using a {@link CloudCollection}.
 * A cloud is created and its initial properties are set by calling {@link CloudCollection#add}.
 * and {@link CloudCollection#remove}.
 *
 * @alias CloudCollection
 *
 * @see CloudCollection
 * @see CloudCollection#add
 *
 * @internalConstructor
 * @class
 */
function Cloud(options, cloudCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  this._show = defaultValue(options.show, true);
  this._position = Cartesian3.clone(
    defaultValue(options.position, Cartesian3.ZERO)
  );
  this._scale = Cartesian2.clone(
    defaultValue(options.scale, new Cartesian2(10.0, 5.0))
  );

  this._flat = defaultValue(options.flat, false);

  this._cloudCollection = cloudCollection;
  this._index = -1; // Used by CloudCollection
}

Object.defineProperties(Cloud.prototype, {
  /**
   * Determines if this cloud will be shown.  Use this to hide or show a cloud, instead
   * of removing it and re-adding it to the collection.
   * @memberof Cloud.prototype
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
        //makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this cloud.
   * @memberof Cloud.prototype
   * @type {Cartesian3}
   */
  position: {
    get: function () {
      return this._position;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var position = this._position;
      if (!Cartesian3.equals(position, value)) {
        Cartesian3.clone(value, position);
      }
    },
  },

  /**
   * Gets or sets the scale of the cloud.
   * @memberof Cloud.prototype
   * @type {Cartesian2}
   */
  scale: {
    get: function () {
      return this._scale;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var scale = this._scale;
      if (!Cartesian2.equals(scale, value)) {
        Cartesian2.clone(value, scale);
      }
    },
  },

  /**
   * Gets or sets whether the cloud is flat or cumulus.
   * @memberof Cloud.prototype
   * @type {CloudType}
   */
  flat: {
    get: function () {
      return this._flat;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      this._flat = value;
    },
  },
});

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
 * @see Clouds#isDestroyed
 */
Cloud.prototype._destroy = function () {
  this._cloudCollection = undefined;
};

export default Cloud;
