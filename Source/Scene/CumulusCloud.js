import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";

/**
 * A cumulus cloud billboard that is created and rendered using a {@link CloudCollection}.
 * A cloud is created and its initial properties are set by calling {@link CloudCollection#add}.
 * and {@link CloudCollection#remove}.
 *
 * @alias CumulusCloud
 *
 * @see CloudCollection
 * @see CloudCollection#add
 *
 * @internalConstructor
 * @class
 */
function CumulusCloud(options, cloudCollection) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  this._show = defaultValue(options.show, true);

  this._position = Cartesian3.clone(
    defaultValue(options.position, Cartesian3.ZERO)
  );
  this._scale = Cartesian2.clone(
    defaultValue(options.scale, new Cartesian2(20.0, 12.0))
  );

  var defaultMaxSize = new Cartesian3(
    this._scale.x,
    this._scale.y,
    Math.min(this._scale.x, this._scale.y) / 1.5
  );
  this._maximumSize = Cartesian3.clone(
    defaultValue(options.maximumSize, defaultMaxSize)
  );
  this._slice = defaultValue(options.slice, 0.0);
  this._cloudCollection = cloudCollection;
  this._index = -1; // Used by CloudCollection
}

var SHOW_INDEX = (CumulusCloud.SHOW_INDEX = 0);
var POSITION_INDEX = (CumulusCloud.POSITION_INDEX = 1);
var SCALE_INDEX = (CumulusCloud.SCALE_INDEX = 2);
var MAXIMUM_SIZE_INDEX = (CumulusCloud.SIZE_INDEX = 3);
var SLICE_INDEX = (CumulusCloud.SLICE_INDEX = 4);
CumulusCloud.NUMBER_OF_PROPERTIES = 5;

function makeDirty(cloud, propertyChanged) {
  var cloudCollection = cloud._cloudCollection;
  if (defined(cloudCollection)) {
    cloudCollection._updateCloud(cloud, propertyChanged);
    cloud._dirty = true;
  }
}

Object.defineProperties(CumulusCloud.prototype, {
  /**
   * Determines if this cumulus cloud will be shown.  Use this to hide or show a cloud, instead
   * of removing it and re-adding it to the collection.
   * @memberof CumulusCloud.prototype
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
        makeDirty(this, SHOW_INDEX);
      }
    },
  },

  /**
   * Gets or sets the Cartesian position of this cumulus cloud.
   * @memberof CumulusCloud.prototype
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
        makeDirty(this, POSITION_INDEX);
      }
    },
  },

  /**
   * Gets or sets the scale of the cumulus cloud billboard in meters.
   * Scale affects the size of the billboard, but not the cloud's actual appearance.
   * To modify the cloud's appearance, modify its maximum size and slice properties.
   * @memberof CumulusCloud.prototype
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
        makeDirty(this, SCALE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the maximum size of the cumulus cloud rendered on the billboard.
   * This defines a maximum ellipsoid volume that the cloud can appear in.
   * Rather than guaranteeing a specific size, this specifies a boundary for the
   * cloud to appear in, and changing it can affect the shape of the cloud.
   * @memberof CumulusCloud.prototype
   * @type {Cartesian3}
   */
  maximumSize: {
    get: function () {
      return this._maximumSize;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var maximumSize = this._maximumSize;
      if (!Cartesian3.equals(maximumSize, value)) {
        Cartesian3.clone(value, maximumSize);
        makeDirty(this, MAXIMUM_SIZE_INDEX);
      }
    },
  },

  /**
   * Gets or sets the slice of the cloud that is rendered on the billboard.
   * Must be a value between 0 and 1. Given the maximum size that the cloud
   * can occupy, the slice specifies how deeply into the cloud to intersect.
   * This can be used to produce a specific cross-section of the cloud for the
   * billboard's appearance.
   * @memberof CumulusCloud.prototype
   * @type {Number}
   */
  slice: {
    get: function () {
      return this._slice;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug)
      if (!defined(value)) {
        throw new DeveloperError("value is required.");
      }
      //>>includeEnd('debug');

      var slice = this._slice;
      if (slice !== value) {
        this._slice = value;
        makeDirty(this, SLICE_INDEX);
      }
    },
  },
});

CumulusCloud.prototype._destroy = function () {
  this._cloudCollection = undefined;
};

export default CumulusCloud;
