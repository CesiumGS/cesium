import Check from "../Core/Check.js";
import Frozen from "../Core/Frozen.js";

/**
 * Simple abstraction for a group. This class exists to make the metadata API
 * more consistent, i.e. metadata can be accessed via
 * <code>content.group.metadata</code> much like tile metadata is accessed as
 * <code>tile.metadata</code>.
 *
 * @param {object} options Object with the following properties:
 * @param {GroupMetadata} options.metadata The metadata associated with this group.
 *
 * @alias Cesium3DContentGroup
 * @constructor
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function Cesium3DContentGroup(options) {
  options = options ?? Frozen.EMPTY_OBJECT;
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("options.metadata", options.metadata);
  //>>includeEnd('debug');

  this._metadata = options.metadata;
}

Object.defineProperties(Cesium3DContentGroup.prototype, {
  /**
   * Get the metadata for this group
   *
   * @memberof Cesium3DContentGroup.prototype
   *
   * @type {GroupMetadata}
   *
   * @readonly
   */
  metadata: {
    get: function () {
      return this._metadata;
    },
  },
});

export default Cesium3DContentGroup;
