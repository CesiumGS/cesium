import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";

/**
 * A cell from a {@link VoxelPrimitive}.
 * <p>
 * Provides access to properties associated with one cell of a voxel primitive.
 * </p>
 * <p>
 * Do not construct this directly.  Access it through picking using {@link Scene#pickVoxel}.
 * </p>
 *
 * @alias VoxelCell
 * @constructor
 *
 * @example
 * // On mouse over, display all the properties for a voxel cell in the console log.
 * handler.setInputAction(function(movement) {
 *   const voxelCell = scene.pickVoxel(movement.endPosition);
 *   if (voxelCell instanceof Cesium.VoxelCell) {
 *     const propertyIds = voxelCell.getPropertyIds();
 *     const length = propertyIds.length;
 *     for (let i = 0; i < length; ++i) {
 *       const propertyId = propertyIds[i];
 *       console.log(`{propertyId}: ${voxelCell.getProperty(propertyId)}`);
 *     }
 *   }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 */
function VoxelCell(primitive, tileIndex, sampleIndex, metadatas) {
  this._primitive = primitive;
  this._tileIndex = tileIndex;
  this._sampleIndex = sampleIndex;
  this._metadatas = getMetadatasForSample(primitive, metadatas, sampleIndex);
}

function getMetadatasForSample(primitive, metadatas, sampleIndex) {
  if (!defined(metadatas)) {
    return undefined;
  }
  const { names, types } = primitive.provider;
  const metadatasMap = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const componentCount = MetadataType.getComponentCount(types[i]);
    const samples = metadatas[i].slice(
      sampleIndex * componentCount,
      (sampleIndex + 1) * componentCount
    );
    metadatasMap[name] = samples;
  }
  return metadatasMap;
}

Object.defineProperties(VoxelCell.prototype, {
  /**
   * Gets an object of the metadata values for this cell. The object's keys are the metadata names.
   *
   * @memberof VoxelCell.prototype
   *
   * @type {object}
   *
   * @readonly
   * @private
   */
  metadatas: {
    get: function () {
      return this._metadatas;
    },
  },

  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the VoxelPrimitive containing the cell.
   *
   * @memberof VoxelCell.prototype
   *
   * @type {VoxelPrimitive}
   *
   * @readonly
   */
  primitive: {
    get: function () {
      return this._primitive;
    },
  },

  /**
   * Get the sample index of the cell.
   *
   * @memberof VoxelCell.prototype
   *
   * @type {number}
   *
   * @readonly
   */
  sampleIndex: {
    get: function () {
      return this._sampleIndex;
    },
  },

  /**
   * Get the index of the tile containing the cell.
   * This is an arbitrary index based on the order of loading the tiles, for debugging purposes only
   *
   * @memberof VoxelCell.prototype
   *
   * @type {number}
   *
   * @readonly
   * @private
   */
  tileIndex: {
    get: function () {
      return this._tileIndex;
    },
  },
});

/**
 * Returns whether the feature contains this property.
 *
 * @param {string} name The case-sensitive name of the property.
 * @returns {boolean} Whether the feature contains this property.
 */
VoxelCell.prototype.hasProperty = function (name) {
  return defined(this._metadatas[name]);
};

/**
 * Returns an array of metadata property names for the feature.
 *
 * @returns {string[]} The IDs of the feature's properties.
 */
VoxelCell.prototype.getNames = function () {
  return Object.keys(this._metadatas);
};

/**
 * Returns a copy of the value of the metadata in the cell with the given name.
 *
 * @param {string} name The case-sensitive name of the property.
 * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
 *
 * @example
 * // Display all the properties for a voxel cell in the console log.
 * const names = voxelCell.getNames();
 * for (let i = 0; i < names.length; ++i) {
 *   const name = names[i];
 *   console.log(`{name}: ${voxelCell.getProperty(name)}`);
 * }
 */
VoxelCell.prototype.getProperty = function (name) {
  return this._metadatas[name];
};

export default VoxelCell;
