import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import MetadataType from "./MetadataType.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";

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
 * @param {VoxelPrimitive} primitive The voxel primitive containing the cell
 * @param {number} tileIndex The index of the tile
 * @param {number} sampleIndex The index of the sample within the tile, containing metadata for this cell
 *
 * @example
 * // On left click, display all the properties for a voxel cell in the console log.
 * handler.setInputAction(function(movement) {
 *   const voxelCell = scene.pickVoxel(movement.position);
 *   if (voxelCell instanceof Cesium.VoxelCell) {
 *     const propertyIds = voxelCell.getPropertyIds();
 *     const length = propertyIds.length;
 *     for (let i = 0; i < length; ++i) {
 *       const propertyId = propertyIds[i];
 *       console.log(`{propertyId}: ${voxelCell.getProperty(propertyId)}`);
 *     }
 *   }
 * }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function VoxelCell(primitive, tileIndex, sampleIndex) {
  this._primitive = primitive;
  this._tileIndex = tileIndex;
  this._sampleIndex = sampleIndex;
  this._metadata = {};
  this._orientedBoundingBox = new OrientedBoundingBox();
}

/**
 * Construct a VoxelCell, and update the metadata and bounding box using the properties
 * of a supplied keyframe node.
 *
 * @private
 * @param {VoxelPrimitive} primitive The voxel primitive containing the cell.
 * @param {number} tileIndex The index of the tile.
 * @param {number} sampleIndex The index of the sample within the tile, containing metadata for this cell.
 * @param {KeyframeNode} keyframeNode The keyframe node containing information about the tile.
 * @returns {VoxelCell}
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
VoxelCell.fromKeyframeNode = function (
  primitive,
  tileIndex,
  sampleIndex,
  keyframeNode
) {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("primitive", primitive);
  Check.typeOf.number("tileIndex", tileIndex);
  Check.typeOf.number("sampleIndex", sampleIndex);
  Check.typeOf.object("keyframeNode", keyframeNode);
  //>>includeEnd('debug');

  const voxelCell = new VoxelCell(primitive, tileIndex, sampleIndex);
  const { spatialNode, metadata } = keyframeNode;
  voxelCell._metadata = getMetadataForSample(primitive, metadata, sampleIndex);
  voxelCell._orientedBoundingBox = getOrientedBoundingBox(
    primitive,
    spatialNode,
    sampleIndex,
    voxelCell._orientedBoundingBox
  );
  return voxelCell;
};

/**
 * @private
 * @param {VoxelPrimitive} primitive
 * @param {object} metadata
 * @param {number} sampleIndex
 * @returns {object}
 */
function getMetadataForSample(primitive, metadata, sampleIndex) {
  if (!defined(metadata)) {
    return undefined;
  }
  const { names, types } = primitive.provider;
  const metadataMap = {};
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const componentCount = MetadataType.getComponentCount(types[i]);
    const samples = metadata[i].slice(
      sampleIndex * componentCount,
      (sampleIndex + 1) * componentCount
    );
    metadataMap[name] = samples;
  }
  return metadataMap;
}

const tileCoordinateScratch = new Cartesian3();
const tileUvScratch = new Cartesian3();

/**
 * @private
 * @param {VoxelPrimitive} primitive
 * @param {SpatialNode} spatialNode
 * @param {OrientedBoundingBox} result
 * @returns {OrientedBoundingBox}
 */
function getOrientedBoundingBox(primitive, spatialNode, sampleIndex, result) {
  // Convert the sample index into a 3D tile coordinate
  // Note: dimensions from the spatialNode include padding
  const paddedDimensions = spatialNode.dimensions;
  const sliceSize = paddedDimensions.x * paddedDimensions.y;
  const zIndex = Math.floor(sampleIndex / sliceSize);
  const indexInSlice = sampleIndex - zIndex * sliceSize;
  const yIndex = Math.floor(indexInSlice / paddedDimensions.x);
  const xIndex = indexInSlice - yIndex * paddedDimensions.x;
  const tileCoordinate = Cartesian3.fromElements(
    xIndex,
    yIndex,
    zIndex,
    tileCoordinateScratch
  );

  // Remove padding, and convert to a fraction in [0, 1], where the limits are
  // the unpadded bounds of the tile
  const tileUv = Cartesian3.divideComponents(
    Cartesian3.subtract(
      tileCoordinate,
      primitive._paddingBefore,
      tileCoordinateScratch
    ),
    primitive.dimensions,
    tileUvScratch
  );

  const shape = primitive._shape;
  return shape.computeOrientedBoundingBoxForSample(
    spatialNode,
    primitive.dimensions,
    tileUv,
    result
  );
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
  metadata: {
    get: function () {
      return this._metadata;
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
   *
   * @memberof VoxelCell.prototype
   *
   * @type {number}
   *
   * @readonly
   */
  tileIndex: {
    get: function () {
      return this._tileIndex;
    },
  },

  /**
   * Get a copy of the oriented bounding box containing the cell.
   *
   * @memberof VoxelCell.prototype
   *
   * @type {OrientedBoundingBox}
   *
   * @readonly
   */
  orientedBoundingBox: {
    get: function () {
      return this._orientedBoundingBox.clone();
    },
  },
});

/**
 * Returns <code>true</code> if the feature contains this property.
 *
 * @param {string} name The case-sensitive name of the property.
 * @returns {boolean} Whether the feature contains this property.
 */
VoxelCell.prototype.hasProperty = function (name) {
  return defined(this._metadata[name]);
};

/**
 * Returns an array of metadata property names for the feature.
 *
 * @returns {string[]} The IDs of the feature's properties.
 */
VoxelCell.prototype.getNames = function () {
  return Object.keys(this._metadata);
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
  return this._metadata[name];
};

export default VoxelCell;
